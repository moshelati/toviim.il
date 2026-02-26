/**
 * AI types — shared across AI modules.
 */

/** Gemini message format */
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/** Structured data extracted by AI from the interview */
export interface StructuredClaimData {
  factsSummary: string;
  timeline: { date: string; description: string }[];
  demands: string[];
  missingFields: string[];
  evidenceNeeded: string[];
  defendant?: string;
  amount?: number;
  hasWrittenAgreement?: boolean;
  hasPriorNotice?: boolean;
  hasProofOfPayment?: boolean;
}

/** AI request options */
export interface AIRequestOptions {
  /** Timeout in ms (default 20000) */
  timeout?: number;
  /** Max retries on failure (default 1) */
  maxRetries?: number;
  /** Temperature 0–2 (default 0.7) */
  temperature?: number;
  /** Max output tokens (default 2048) */
  maxTokens?: number;
}

/** Internal request log entry */
export interface AIRequestLog {
  requestId: string;
  model: string;
  endpoint: string;
  status: 'success' | 'error';
  latencyMs: number;
  errorCode?: string;
  userMessage?: string;
}
