// ─── Legal Configuration for Israeli Small Claims Court ─────────────────────
// Based on Israeli Small Claims Court Act, 5736-1976
// Updated for 2025-2026 limits

export const SMALL_CLAIMS_MAX_AMOUNT_NIS = 39900;
export const FILING_ATTACHMENTS_MAX_TOTAL_MB = 30;
export const COURT_FEE_PERCENT = 0.01;
export const COURT_FEE_MIN_NIS = 50;

// Valid plaintiff types
export type PlaintiffType = 'individual' | 'sole_proprietor';

export const VALID_PLAINTIFF_TYPES: { id: PlaintiffType; label: string; description: string }[] = [
  { id: 'individual',      label: 'יחיד',          description: 'אדם פרטי' },
  { id: 'sole_proprietor', label: 'עוסק מורשה',    description: 'עצמאי / עוסק מורשה' },
];

// Blocked plaintiff types (cannot file small claims)
export const BLOCKED_PLAINTIFF_TYPES = [
  { id: 'company',     label: 'חברה בע"מ',    reason: 'חברה אינה רשאית לתבוע בתביעות קטנות' },
  { id: 'ngo',         label: 'עמותה',          reason: 'עמותה אינה רשאית לתבוע בתביעות קטנות' },
  { id: 'partnership', label: 'שותפות',         reason: 'שותפות אינה רשאית לתבוע בתביעות קטנות' },
];

// Claim categories
export const CLAIM_CATEGORIES = [
  { id: 'consumer',  emoji: '🛒', label: 'צרכנות',   sub: 'מוצר פגום, שירות גרוע, אי-אספקה' },
  { id: 'landlord',  emoji: '🏠', label: 'שכירות',   sub: 'פיקדון, נזקים בדירה, תיקונים' },
  { id: 'employer',  emoji: '💼', label: 'עבודה',     sub: 'שכר, פיצויים, זכויות' },
  { id: 'neighbor',  emoji: '🏘️', label: 'שכנים',    sub: 'נזקים, מטרד רעש' },
  { id: 'contract',  emoji: '📝', label: 'חוזה',      sub: 'הפרת הסכם, נזק כספי' },
  { id: 'other',     emoji: '⚖️', label: 'אחר',      sub: 'סיבה אחרת' },
] as const;

export type ClaimCategory = typeof CLAIM_CATEGORIES[number]['id'];

// Calculate court filing fee
export function calculateCourtFee(amountNis: number): number {
  const fee = Math.round(amountNis * COURT_FEE_PERCENT);
  return Math.max(fee, COURT_FEE_MIN_NIS);
}

// Validate claim amount
export function validateClaimAmount(amountNis: number): {
  valid: boolean;
  message?: string;
} {
  if (amountNis <= 0) {
    return { valid: false, message: 'סכום התביעה חייב להיות חיובי' };
  }
  if (amountNis > SMALL_CLAIMS_MAX_AMOUNT_NIS) {
    return {
      valid: false,
      message: `סכום התביעה חורג מגבול תביעות קטנות (${SMALL_CLAIMS_MAX_AMOUNT_NIS.toLocaleString('he-IL')} ₪). יש לפנות לבית משפט שלום.`,
    };
  }
  return { valid: true };
}

// Check if plaintiff type is valid
export function isValidPlaintiffType(type: string): boolean {
  return VALID_PLAINTIFF_TYPES.some(t => t.id === type);
}

// Format currency
export function formatNIS(amount: number): string {
  return `₪ ${amount.toLocaleString('he-IL')}`;
}
