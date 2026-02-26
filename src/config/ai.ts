/**
 * AI configuration — single source of truth for AI settings.
 */

/** Is AI enabled? If false, all AI features show a disabled state. */
export const AI_ENABLED =
  (process.env.EXPO_PUBLIC_AI_ENABLED ?? 'true') === 'true';

/** Gemini API key */
export const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

/** Gemini model name */
export const GEMINI_MODEL =
  process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash-lite';

/** Base URL for Gemini API */
export const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

/** Default request timeout (ms) */
export const DEFAULT_TIMEOUT = 20_000;

/** Max retries on network failures */
export const MAX_RETRIES = 1;

/** Backoff base delay (ms) — used with exponential backoff */
export const BACKOFF_BASE_MS = 300;

/** Is the AI properly configured? */
export function isAIReady(): boolean {
  return AI_ENABLED && GEMINI_API_KEY.length > 0;
}
