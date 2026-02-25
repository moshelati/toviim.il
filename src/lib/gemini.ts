const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL   = 'gemini-1.5-flash';
const BASE_URL       = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export async function sendMessageToGemini(
  messages: GeminiMessage[],
  systemInstruction?: string,
): Promise<string> {
  const body: Record<string, unknown> = { contents: messages };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── System Prompts ────────────────────────────────────────────────────────────

export const AI_INTERVIEWER_SYSTEM_PROMPT = `
אני העוזר המשפטי האישי שלך לתביעות קטנות. אני כאן כדי לעזור לך לבנות את התביעה שלך.
אני מדבר בגוף ראשון ובשפה עברית ידידותית, פשוטה וברורה.
אני שואל שאלה אחת בכל פעם, ומחכה לתשובה לפני שממשיכים.
מגבלת תביעות קטנות היא עד 38,800 ₪.
אני עוזר לך למצוא את הבסיס המשפטי הטוב ביותר למקרה שלך.
אני לא מייעץ עצה משפטית מקצועית - אני עוזר לך לארגן את העובדות.
`.trim();

export const MOCK_TRIAL_SYSTEM_PROMPT = `
אני שופט/נתבע בסימולציה של בית משפט לתביעות קטנות.
אני שואל את התובע שאלות קשות כדי לעזור לו להתכונן למשפט האמיתי.
אני מדבר בעברית פורמלית אך ברורה.
אני מתייחס לפרטי התיק הספציפי שלך.
`.trim();
