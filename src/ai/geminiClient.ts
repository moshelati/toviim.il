/**
 * Gemini AI Client — resilient, typed, with retry & structured logging.
 *
 * Features:
 * - 20s timeout
 * - 1 retry on network/server failure with exponential backoff (300ms, 900ms)
 * - Typed error classification
 * - Structured dev-only logging (redacted keys)
 * - JSON extraction from fenced code blocks
 */

import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_BASE_URL,
  DEFAULT_TIMEOUT,
  MAX_RETRIES,
  BACKOFF_BASE_MS,
  isAIReady,
} from '../config/ai';
import { AIError, classifyError } from './errors';
import type { GeminiMessage, AIRequestOptions, AIRequestLog, StructuredClaimData } from './types';
import { SMALL_CLAIMS_MAX_AMOUNT_NIS } from '../config/legal';

// ─── Utilities ──────────────────────────────────────────────────────────────

let _requestCounter = 0;

function generateRequestId(): string {
  _requestCounter += 1;
  return `ai_${Date.now()}_${_requestCounter}`;
}

function devLog(entry: AIRequestLog) {
  if (__DEV__) {
    console.log('[AI]', {
      ...entry,
      model: entry.model,
      status: entry.status,
      latencyMs: entry.latencyMs,
      ...(entry.errorCode ? { errorCode: entry.errorCode } : {}),
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Core API Call (with retry) ─────────────────────────────────────────────

export async function sendMessage(
  messages: GeminiMessage[],
  systemInstruction?: string,
  options?: AIRequestOptions,
): Promise<string> {
  if (!isAIReady()) {
    throw new AIError('NO_API_KEY');
  }

  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 2048;

  const endpoint = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent`;
  const requestId = generateRequestId();
  const startTime = Date.now();

  let lastError: AIError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 300ms, 900ms
      const delay = BACKOFF_BASE_MS * Math.pow(3, attempt - 1);
      await sleep(delay);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const body: Record<string, unknown> = {
        contents: messages,
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      };

      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const response = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Rate limit
      if (response.status === 429) {
        lastError = new AIError('RATE_LIMIT');
        if (attempt < maxRetries) continue;
        throw lastError;
      }

      // Server error (retryable)
      if (response.status >= 500) {
        lastError = new AIError('SERVER_ERROR', `HTTP ${response.status}`);
        if (attempt < maxRetries) continue;
        throw lastError;
      }

      // Other HTTP errors
      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        if (errBody.includes('SAFETY') || errBody.includes('blocked')) {
          throw new AIError('SAFETY_BLOCKED', errBody);
        }
        throw new AIError('UNKNOWN', `HTTP ${response.status}: ${errBody.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        // Check for safety block in response
        const blockReason = data.candidates?.[0]?.finishReason;
        if (blockReason === 'SAFETY') {
          throw new AIError('SAFETY_BLOCKED');
        }
        throw new AIError('INVALID_RESPONSE', 'Empty response from Gemini');
      }

      devLog({
        requestId,
        model: GEMINI_MODEL,
        endpoint: `.../${GEMINI_MODEL}`,
        status: 'success',
        latencyMs: Date.now() - startTime,
      });

      return text;
    } catch (err) {
      clearTimeout(timer);

      if (err instanceof AIError) {
        lastError = err;
        // Don't retry non-retryable errors
        if (!err.retryable || attempt >= maxRetries) {
          devLog({
            requestId,
            model: GEMINI_MODEL,
            endpoint: `.../${GEMINI_MODEL}`,
            status: 'error',
            latencyMs: Date.now() - startTime,
            errorCode: err.code,
            userMessage: err.userMessage,
          });
          throw err;
        }
        continue;
      }

      // Classify raw errors
      lastError = classifyError(err);
      if (!lastError.retryable || attempt >= maxRetries) {
        devLog({
          requestId,
          model: GEMINI_MODEL,
          endpoint: `.../${GEMINI_MODEL}`,
          status: 'error',
          latencyMs: Date.now() - startTime,
          errorCode: lastError.code,
          userMessage: lastError.userMessage,
        });
        throw lastError;
      }
    }
  }

  throw lastError ?? new AIError('UNKNOWN');
}

// ─── JSON Extraction ────────────────────────────────────────────────────────

/**
 * Extract the last JSON block from AI output.
 * Handles:
 * - ```json ... ```
 * - ``` ... ```
 * - Raw JSON
 */
export function extractJSON<T = unknown>(raw: string): T {
  // Try to find fenced JSON blocks (last one wins)
  const fencedRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let lastMatch: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = fencedRegex.exec(raw)) !== null) {
    lastMatch = m[1].trim();
  }

  const toParse = lastMatch ?? raw.trim();

  try {
    return JSON.parse(toParse) as T;
  } catch {
    // Try to find a JSON object in the raw text
    const objMatch = toParse.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]) as T;
      } catch {
        throw new AIError('INVALID_RESPONSE', `Cannot parse JSON: ${toParse.slice(0, 100)}`);
      }
    }
    throw new AIError('INVALID_RESPONSE', `No JSON found in response: ${toParse.slice(0, 100)}`);
  }
}

// ─── Structured Data Extraction ─────────────────────────────────────────────

export async function extractStructuredData(
  conversationHistory: GeminiMessage[],
  claimType: string,
): Promise<StructuredClaimData> {
  const extractionPrompt = `
בהתבסס על כל הראיון שהתנהל, חלץ את הנתונים הבאים בפורמט JSON בלבד.
החזר JSON בתוך בלוק \`\`\`json ... \`\`\`.

\`\`\`json
{
  "factsSummary": "סיכום עובדתי מפורט של המקרה (2-4 פסקאות)",
  "timeline": [{"date": "תאריך או תקופה", "description": "מה קרה"}],
  "demands": ["דרישה 1", "דרישה 2"],
  "missingFields": ["שדה חסר 1"],
  "evidenceNeeded": ["ראיה נדרשת 1"],
  "defendant": "שם הנתבע",
  "amount": 0,
  "hasWrittenAgreement": false,
  "hasPriorNotice": false,
  "hasProofOfPayment": false
}
\`\`\`

חשוב:
- factsSummary: כתוב סיכום ברור ועובדתי שיתאים לכתב תביעה
- timeline: סדר כרונולוגי, description בעברית
- demands: דרישות ספציפיות (כספיות ואחרות)
- amount: מספר בלבד (סכום בשקלים), 0 אם לא הוזכר
- hasWrittenAgreement/hasPriorNotice/hasProofOfPayment: true/false

החזר אך ורק JSON תקין בתוך \`\`\`json.
  `.trim();

  const messages: GeminiMessage[] = [
    ...conversationHistory,
    { role: 'user', parts: [{ text: extractionPrompt }] },
  ];

  const rawResponse = await sendMessage(messages, undefined, {
    temperature: 0.3,
    maxTokens: 3000,
  });

  const parsed = extractJSON<Record<string, any>>(rawResponse);

  // Normalize and validate
  return {
    factsSummary: typeof parsed.factsSummary === 'string' ? parsed.factsSummary : '',
    timeline: Array.isArray(parsed.timeline)
      ? parsed.timeline.map((t: any) => ({
          date: t.date || '',
          description: t.event || t.description || '',
        }))
      : [],
    demands: Array.isArray(parsed.demands) ? parsed.demands : [],
    missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
    evidenceNeeded: Array.isArray(parsed.evidenceNeeded) ? parsed.evidenceNeeded : [],
    defendant: typeof parsed.defendant === 'string' ? parsed.defendant : undefined,
    amount: typeof parsed.amount === 'number' ? parsed.amount : undefined,
    hasWrittenAgreement: !!parsed.hasWrittenAgreement,
    hasPriorNotice: !!parsed.hasPriorNotice,
    hasProofOfPayment: !!parsed.hasProofOfPayment,
  };
}

// ─── System Prompts ─────────────────────────────────────────────────────────

export function buildInterviewSystemPrompt(claimType: string, plaintiffName: string): string {
  const CLAIM_TYPE_CONTEXT: Record<string, string> = {
    consumer: 'התביעה נוגעת לצרכנות: מוצר פגום, שירות גרוע, אי-אספקה.',
    landlord: 'התביעה נוגעת לשכירות: פיקדון שלא הוחזר, נזקים בדירה, תיקונים.',
    employer: 'התביעה נוגעת לדיני עבודה: שכר לא שולם, פיצויי פיטורין, זכויות.',
    neighbor: 'התביעה נוגעת לנזקי שכנים: נזקים, מטרד רעש, חדירה לרכוש.',
    contract: 'התביעה נוגעת להפרת חוזה: הסכם שלא קוים, נזק כספי שנגרם.',
    other:    'התביעה נוגעת לסיבה אחרת שתתואר על ידי המשתמש.',
  };

  const ctx = CLAIM_TYPE_CONTEXT[claimType] ?? '';

  return `
אני העוזר המשפטי האישי שלך לתביעות קטנות. אני כאן כדי לעזור לך לבנות את התביעה שלך.
חשוב: אני לא עורך דין ולא מספק ייעוץ משפטי. אני עוזר לארגן מידע בלבד.

שמי של המשתמש: ${plaintiffName}.
${ctx}

הכללים שלי:
1. אני שואל שאלה אחת בלבד בכל פעם — ממוקדת, ברורה, וידידותית.
2. אני מדבר בגוף ראשון, בעברית פשוטה וחמה.
3. אני מאשש ומסכם כל תשובה לפני שאלה הבאה.
4. אני מנסה להבין: מי הנתבע, מה קרה, מתי, כמה כסף, ומה הראיות.
5. אם הסכום עולה על ${SMALL_CLAIMS_MAX_AMOUNT_NIS.toLocaleString('he-IL')} ₪ — אני מציין שאין מדובר בתביעה קטנה.
6. כשיש לי מספיק מידע (6-10 שאלות), אני אומר: "תודה! יש לי מספיק מידע לבנות את כתב התביעה."
7. אני מסיים כל תשובה בשאלה הבאה.

אני אשאל שאלה אחת בכל פעם כדי שלא תתבלבל/י.
התחל בברכה קצרה ובשאלה הראשונה: מה בדיוק קרה?
  `.trim();
}

export function buildMockTrialPrompt(
  factsSummary: string,
  plaintiff: string,
  defendant: string,
  amount?: number,
  demands?: string[],
): string {
  return `
אני שופט בבית משפט לתביעות קטנות בסימולציה.
חשוב: זו סימולציה בלבד — אני לא שופט אמיתי ולא נותן ייעוץ משפטי.

פרטי התיק:
- תובע: ${plaintiff}
- נתבע: ${defendant || 'לא ידוע'}
- סכום: ${amount ? `${amount.toLocaleString('he-IL')} ₪` : 'לא ידוע'}
- דרישות: ${demands?.join(', ') || 'לא פורטו'}
- סיכום: ${factsSummary || 'לא סופק'}

הכללים שלי:
1. אני שואל שאלות קשות כדי לעזור לתובע להתכונן.
2. אני מדבר בעברית פורמלית אך ברורה.
3. אני בודק: ראיות, עדים, תיעוד, חוקיות, סבירות.
4. אחרי 5-6 שאלות אני נותן הערכה.

התחל בהצגת עצמך כשופט ושאל את השאלה הראשונה.
  `.trim();
}
