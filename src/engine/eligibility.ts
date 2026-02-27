// ─── Eligibility Engine ──────────────────────────────────────────────────────
// Pre-interview gate: determines if the user can file a small claims case.
// Returns a verdict + any blockers BEFORE they waste time on the interview.
//
// Based on Israeli Small Claims Court Act (חוק בתי המשפט [נוסח משולב], סעיף 60)

import {
  SMALL_CLAIMS_MAX_AMOUNT_NIS,
  VALID_PLAINTIFF_TYPES,
  BLOCKED_PLAINTIFF_TYPES,
} from '../config/legal';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EligibilityVerdict = 'eligible' | 'ineligible' | 'needs_review';

export interface EligibilityBlocker {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Whether the user can potentially fix this */
  fixable: boolean;
  /** Suggestion for fixing */
  suggestion?: string;
}

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  blockers: EligibilityBlocker[];
  /** Short Hebrew verdict text for UI */
  verdictText: string;
  /** Suggested court if not eligible for small claims */
  alternativeCourt?: string;
}

export interface EligibilityInput {
  plaintiffType: string;
  /** Estimated claim amount (0 = unknown yet) */
  estimatedAmountNis: number;
  /** Claim category from legal.ts */
  claimCategory: string;
  /** Is the defendant a government entity? */
  isGovernmentDefendant?: boolean;
  /** Is this a class action? */
  isClassAction?: boolean;
  /** Has more than 3 years passed since the incident? */
  isStatuteExpired?: boolean;
  /** Does the claim involve real estate ownership? */
  isRealEstateOwnership?: boolean;
  /** Is the claim about defamation? */
  isDefamation?: boolean;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const blockers: EligibilityBlocker[] = [];

  // 1. Plaintiff type check
  const blocked = BLOCKED_PLAINTIFF_TYPES.find(t => t.id === input.plaintiffType);
  if (blocked) {
    blockers.push({
      id: 'blocked_plaintiff_type',
      title: `${blocked.label} אינם רשאים לתבוע`,
      description: blocked.reason,
      icon: '🚫',
      fixable: false,
    });
  }

  // 2. Amount check (only if amount is known)
  if (input.estimatedAmountNis > SMALL_CLAIMS_MAX_AMOUNT_NIS) {
    blockers.push({
      id: 'amount_too_high',
      title: 'סכום חורג מהמגבלה',
      description: `תקרת תביעות קטנות: ₪${SMALL_CLAIMS_MAX_AMOUNT_NIS.toLocaleString('he-IL')}. הסכום שציינת (₪${input.estimatedAmountNis.toLocaleString('he-IL')}) חורג.`,
      icon: '💰',
      fixable: true,
      suggestion: 'ניתן להפחית את הסכום הנתבע לתקרה ולוותר על ההפרש, או לפנות לבית משפט שלום.',
    });
  }

  // 3. Government defendant
  if (input.isGovernmentDefendant) {
    blockers.push({
      id: 'government_defendant',
      title: 'תביעה נגד גוף ממשלתי',
      description: 'תביעות נגד המדינה או רשויות ציבוריות כפופות לכללים מיוחדים ולעיתים אינן ניתנות להגשה כתביעה קטנה.',
      icon: '🏛️',
      fixable: false,
      suggestion: 'מומלץ להתייעץ עם עורך דין. ייתכן שתצטרך/י לפנות לבית המשפט המנהלי.',
    });
  }

  // 4. Class action
  if (input.isClassAction) {
    blockers.push({
      id: 'class_action',
      title: 'תביעה ייצוגית',
      description: 'תביעה ייצוגית אינה מתנהלת בבית משפט לתביעות קטנות.',
      icon: '👥',
      fixable: false,
      suggestion: 'תביעות ייצוגיות מוגשות לבית משפט מחוזי. מומלץ לפנות לעורך דין.',
    });
  }

  // 5. Statute of limitations (התיישנות)
  if (input.isStatuteExpired) {
    blockers.push({
      id: 'statute_expired',
      title: 'חשש להתיישנות',
      description: 'אם עברו יותר מ-3 שנים מהאירוע (או 7 שנים לחוזה), התביעה עלולה להידחות בשל התיישנות.',
      icon: '⏰',
      fixable: false,
      suggestion: 'בדוק/י את המועד המדויק. התיישנות יכולה להשתנות לפי סוג התביעה.',
    });
  }

  // 6. Real estate ownership disputes
  if (input.isRealEstateOwnership) {
    blockers.push({
      id: 'real_estate',
      title: 'סכסוך בעלות על מקרקעין',
      description: 'סכסוכי בעלות על נדל"ן לא מתנהלים בתביעות קטנות.',
      icon: '🏗️',
      fixable: false,
      suggestion: 'יש לפנות לבית משפט שלום או מחוזי, בהתאם לשווי הנכס.',
    });
  }

  // 7. Defamation
  if (input.isDefamation) {
    blockers.push({
      id: 'defamation',
      title: 'תביעת לשון הרע',
      description: 'תביעות לשון הרע ניתן להגיש כתביעה קטנה רק אם הסכום עד התקרה. שים לב שנדרש להוכיח פרסום.',
      icon: '🗣️',
      fixable: true,
      suggestion: 'ודא/י שהסכום לא חורג ושיש לך הוכחות לפרסום.',
    });
  }

  // Determine verdict
  const unfixableBlockers = blockers.filter(b => !b.fixable);
  let verdict: EligibilityVerdict;
  let verdictText: string;
  let alternativeCourt: string | undefined;

  if (unfixableBlockers.length > 0) {
    verdict = 'ineligible';
    verdictText = 'לא ניתן להגיש כתביעה קטנה';
    alternativeCourt = determineAlternativeCourt(input, blockers);
  } else if (blockers.length > 0) {
    verdict = 'needs_review';
    verdictText = 'ייתכן שניתן — נדרשת בדיקה נוספת';
  } else {
    verdict = 'eligible';
    verdictText = 'ניתן להגיש כתביעה קטנה ✅';
  }

  return { verdict, blockers, verdictText, alternativeCourt };
}

// ─── Alternative court suggestion ────────────────────────────────────────────

function determineAlternativeCourt(
  input: EligibilityInput,
  blockers: EligibilityBlocker[],
): string {
  if (blockers.some(b => b.id === 'class_action')) {
    return 'בית משפט מחוזי';
  }
  if (blockers.some(b => b.id === 'government_defendant')) {
    return 'בית המשפט לעניינים מנהליים';
  }
  if (blockers.some(b => b.id === 'real_estate')) {
    return 'בית משפט שלום (מקרקעין)';
  }
  if (input.estimatedAmountNis > SMALL_CLAIMS_MAX_AMOUNT_NIS) {
    return 'בית משפט שלום';
  }
  return 'בית משפט שלום';
}

// ─── Quick check (for UI badges) ─────────────────────────────────────────────

export function isQuickEligible(plaintiffType: string, amount: number): boolean {
  const isValidType = VALID_PLAINTIFF_TYPES.some(t => t.id === plaintiffType);
  const isValidAmount = amount <= 0 || amount <= SMALL_CLAIMS_MAX_AMOUNT_NIS;
  return isValidType && isValidAmount;
}
