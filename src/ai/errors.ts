/**
 * AI Error System — typed errors with user-friendly Hebrew messages.
 */

export type AIErrorCode =
  | 'NO_API_KEY'
  | 'NETWORK_OFFLINE'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'INVALID_RESPONSE'
  | 'SAFETY_BLOCKED'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly userMessage: string;
  readonly retryable: boolean;

  constructor(code: AIErrorCode, originalError?: Error | string) {
    const info = ERROR_INFO[code];
    super(typeof originalError === 'string' ? originalError : originalError?.message ?? info.internal);
    this.name = 'AIError';
    this.code = code;
    this.userMessage = info.userMessage;
    this.retryable = info.retryable;
  }
}

interface ErrorInfo {
  userMessage: string;
  internal: string;
  retryable: boolean;
}

const ERROR_INFO: Record<AIErrorCode, ErrorInfo> = {
  NO_API_KEY: {
    userMessage: 'ה-AI לא מוגדר. צריך להגדיר מפתח API.',
    internal: 'Gemini API key is missing',
    retryable: false,
  },
  NETWORK_OFFLINE: {
    userMessage: 'אין חיבור לאינטרנט. בדוק/י את החיבור ונסה/י שוב.',
    internal: 'Device is offline',
    retryable: true,
  },
  TIMEOUT: {
    userMessage: 'הבקשה לקחה יותר מדי זמן. נסה/י שוב.',
    internal: 'Request timed out',
    retryable: true,
  },
  RATE_LIMIT: {
    userMessage: 'יותר מדי בקשות. נסה/י שוב בעוד כמה שניות.',
    internal: 'Rate limited by Gemini API',
    retryable: true,
  },
  INVALID_RESPONSE: {
    userMessage: 'הייתה בעיה לנתח את התשובה. ננסה שוב.',
    internal: 'Failed to parse AI response as valid JSON',
    retryable: true,
  },
  SAFETY_BLOCKED: {
    userMessage: 'התוכן נחסם על ידי מערכת הבטיחות. נסה/י לנסח אחרת.',
    internal: 'Response blocked by Gemini safety filters',
    retryable: false,
  },
  SERVER_ERROR: {
    userMessage: 'שגיאת שרת. ננסה שוב בעוד רגע.',
    internal: 'Gemini server error (5xx)',
    retryable: true,
  },
  UNKNOWN: {
    userMessage: 'משהו השתבש. נסה/י שוב.',
    internal: 'Unknown error',
    retryable: true,
  },
};

/**
 * Classify a raw error into a typed AIError.
 */
export function classifyError(err: unknown): AIError {
  if (err instanceof AIError) return err;

  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('API key') || msg.includes('api key')) {
    return new AIError('NO_API_KEY', msg);
  }
  if (msg.includes('network') || msg.includes('Network') || msg.includes('fetch failed') || msg.includes('Failed to fetch')) {
    return new AIError('NETWORK_OFFLINE', msg);
  }
  if (msg.includes('abort') || msg.includes('timeout') || msg.includes('Timeout')) {
    return new AIError('TIMEOUT', msg);
  }
  if (msg.includes('429') || msg.includes('rate') || msg.includes('quota')) {
    return new AIError('RATE_LIMIT', msg);
  }
  if (msg.includes('safety') || msg.includes('blocked') || msg.includes('SAFETY')) {
    return new AIError('SAFETY_BLOCKED', msg);
  }
  if (msg.includes('5') && (msg.includes('500') || msg.includes('502') || msg.includes('503'))) {
    return new AIError('SERVER_ERROR', msg);
  }
  if (msg.includes('JSON') || msg.includes('parse') || msg.includes('Unexpected token')) {
    return new AIError('INVALID_RESPONSE', msg);
  }

  return new AIError('UNKNOWN', msg);
}
