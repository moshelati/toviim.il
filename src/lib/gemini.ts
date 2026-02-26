import { SMALL_CLAIMS_MAX_AMOUNT_NIS } from '../config/legal';

// ─── Configuration ──────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL   = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash-lite';
const BASE_URL       = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─── Types ──────────────────────────────────────────────────────────────────
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface StructuredClaimData {
  factsSummary: string;
  timeline: { date: string; event?: string; description?: string }[];
  demands: string[];
  missingFields: string[];
  evidenceNeeded: string[];
  defendant?: string;
  amount?: number;
  hasWrittenAgreement?: boolean;
  hasPriorNotice?: boolean;
  hasProofOfPayment?: boolean;
}

// ─── Core API Call ──────────────────────────────────────────────────────────
export async function sendMessageToGemini(
  messages: GeminiMessage[],
  systemInstruction?: string,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  const body: Record<string, unknown> = { contents: messages };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  body.generationConfig = {
    temperature: 0.7,
    maxOutputTokens: 2048,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API error:', response.status, err);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Structured JSON Extraction ─────────────────────────────────────────────
// After the interview is complete, extract structured data from the conversation
export async function extractStructuredData(
  conversationHistory: GeminiMessage[],
  claimType: string,
): Promise<StructuredClaimData> {
  const extractionPrompt = `
בהתבסס על כל הראיון שהתנהל, חלץ את הנתונים הבאים בפורמט JSON בלבד (ללא טקסט נוסף):

{
  "factsSummary": "סיכום עובדתי מפורט של המקרה (2-4 פסקאות)",
  "timeline": [{"date": "תאריך או תקופה", "event": "מה קרה"}],
  "demands": ["דרישה 1", "דרישה 2"],
  "missingFields": ["שדה חסר 1"],
  "evidenceNeeded": ["ראיה נדרשת 1"],
  "defendant": "שם הנתבע אם הוזכר",
  "amount": 0,
  "hasWrittenAgreement": false,
  "hasPriorNotice": false,
  "hasProofOfPayment": false
}

חשוב:
- factsSummary: כתוב סיכום ברור ועובדתי שיתאים לכתב תביעה
- timeline: סדר כרונולוגי
- demands: דרישות ספציפיות (כספיות ואחרות)
- missingFields: מידע שלא נאסף במהלך הראיון
- evidenceNeeded: ראיות שמומלץ לצרף
- amount: מספר בלבד (סכום בשקלים), 0 אם לא הוזכר
- hasWrittenAgreement/hasPriorNotice/hasProofOfPayment: true/false

החזר JSON בלבד, ללא markdown, ללא backticks.
  `.trim();

  const messages: GeminiMessage[] = [
    ...conversationHistory,
    { role: 'user', parts: [{ text: extractionPrompt }] },
  ];

  const rawResponse = await sendMessageToGemini(messages);

  // Clean response - remove markdown fencing if present
  let cleaned = rawResponse.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned) as StructuredClaimData;

    // Validate required fields
    return {
      factsSummary: parsed.factsSummary || '',
      timeline: Array.isArray(parsed.timeline)
        ? parsed.timeline.map((t: any) => ({ date: t.date || '', description: t.event || t.description || '' }))
        : [],
      demands: Array.isArray(parsed.demands) ? parsed.demands : [],
      missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
      evidenceNeeded: Array.isArray(parsed.evidenceNeeded) ? parsed.evidenceNeeded : [],
      defendant: parsed.defendant || undefined,
      amount: typeof parsed.amount === 'number' ? parsed.amount : undefined,
      hasWrittenAgreement: !!parsed.hasWrittenAgreement,
      hasPriorNotice: !!parsed.hasPriorNotice,
      hasProofOfPayment: !!parsed.hasProofOfPayment,
    };
  } catch (e) {
    console.error('Failed to parse structured data:', e, cleaned);
    // Return minimal structured data from the summary
    return {
      factsSummary: rawResponse,
      timeline: [],
      demands: [],
      missingFields: ['לא ניתן היה לחלץ נתונים מובנים'],
      evidenceNeeded: [],
    };
  }
}

// ─── System Prompts ─────────────────────────────────────────────────────────

export const AI_INTERVIEWER_SYSTEM_PROMPT = `
אני העוזר המשפטי האישי שלך לתביעות קטנות. אני כאן כדי לעזור לך לבנות את התביעה שלך.
אני מדבר בגוף ראשון ובשפה עברית ידידותית, פשוטה וברורה.
אני שואל שאלה אחת בכל פעם, ומחכה לתשובה לפני שממשיכים.
מגבלת תביעות קטנות היא עד ${SMALL_CLAIMS_MAX_AMOUNT_NIS.toLocaleString('he-IL')} ₪.
אני עוזר לך למצוא את הבסיס המשפטי הטוב ביותר למקרה שלך.
אני לא עורך דין ולא נותן ייעוץ משפטי - אני עוזר לך לארגן את העובדות.
אני אינני מציג את עצמי כעורך דין בשום שלב.
`.trim();

export const MOCK_TRIAL_SYSTEM_PROMPT = `
אני שופט/נתבע בסימולציה של בית משפט לתביעות קטנות.
אני שואל את התובע שאלות קשות כדי לעזור לו להתכונן למשפט האמיתי.
אני מדבר בעברית פורמלית אך ברורה.
אני מתייחס לפרטי התיק הספציפי שלך.
`.trim();
