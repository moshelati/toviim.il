// ─── Confidence Engine ──────────────────────────────────────────────────────
// Rule-based + AI-assisted scoring system for claim readiness
// Generates: Filing Readiness Score, Evidence Strength, Missing Fields,
//            Risk Flags, and Improvement Suggestions

import { SMALL_CLAIMS_MAX_AMOUNT_NIS } from '../config/legal';

// ─── Types ──────────────────────────────────────────────────────────────────

export type StrengthScore = 'weak' | 'medium' | 'strong';

export interface RiskFlag {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  icon: string;
}

export interface MissingField {
  field: string;
  label: string;
  importance: 'required' | 'recommended';
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

export interface ConfidenceResult {
  readinessScore: number;        // 0-100
  strengthScore: StrengthScore;
  missingFields: MissingField[];
  riskFlags: RiskFlag[];
  suggestions: Suggestion[];
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  requiredFields: number;     // max 40
  validAmount: number;        // max 10
  demands: number;            // max 10
  timeline: number;           // max 10
  evidence: number;           // max 15
  signature: number;          // max 15
}

// ─── Claim data interface (for scoring) ─────────────────────────────────────

export interface ClaimForScoring {
  plaintiffName?: string;
  plaintiffId?: string;
  plaintiffPhone?: string;
  plaintiffAddress?: string;
  defendant?: string;
  defendantAddress?: string;
  amount?: number;
  summary?: string;
  claimType?: string;
  timeline?: { date: string; description?: string; event?: string }[];
  demands?: string[];
  evidenceCount?: number;
  hasSignature?: boolean;
  hasWrittenAgreement?: boolean;
  hasPriorNotice?: boolean;
  hasProofOfPayment?: boolean;
  incidentDate?: string;
  factsSummary?: string;
}

// ─── Calculate Readiness Score ──────────────────────────────────────────────

export function calculateConfidence(claim: ClaimForScoring): ConfidenceResult {
  const breakdown = calculateBreakdown(claim);
  const readinessScore = Math.min(100,
    breakdown.requiredFields +
    breakdown.validAmount +
    breakdown.demands +
    breakdown.timeline +
    breakdown.evidence +
    breakdown.signature
  );

  const strengthScore = calculateStrength(claim);
  const missingFields = findMissingFields(claim);
  const riskFlags = findRiskFlags(claim);
  const suggestions = generateSuggestions(claim, missingFields, riskFlags);

  return {
    readinessScore,
    strengthScore,
    missingFields,
    riskFlags,
    suggestions,
    breakdown,
  };
}

// ─── Score Breakdown (40 + 10 + 10 + 10 + 15 + 15 = 100) ───────────────────

function calculateBreakdown(claim: ClaimForScoring): ScoreBreakdown {
  // Required fields (40 points)
  let requiredFields = 0;
  const fieldChecks = [
    { field: claim.plaintiffName, weight: 8 },
    { field: claim.plaintiffId, weight: 4 },
    { field: claim.plaintiffPhone, weight: 4 },
    { field: claim.plaintiffAddress, weight: 4 },
    { field: claim.defendant, weight: 8 },
    { field: claim.defendantAddress, weight: 4 },
    { field: claim.summary || claim.factsSummary, weight: 8 },
  ];
  for (const check of fieldChecks) {
    if (check.field && String(check.field).trim().length > 0) {
      requiredFields += check.weight;
    }
  }

  // Valid amount (10 points)
  let validAmount = 0;
  if (claim.amount && claim.amount > 0) {
    validAmount = 5;
    if (claim.amount <= SMALL_CLAIMS_MAX_AMOUNT_NIS) {
      validAmount = 10;
    }
  }

  // At least 1 demand item (10 points)
  let demands = 0;
  if (claim.demands && claim.demands.length > 0) {
    demands = Math.min(10, claim.demands.length * 5);
  } else if (claim.amount && claim.amount > 0) {
    // If they have an amount but no explicit demands, give partial credit
    demands = 5;
  }

  // Timeline exists (10 points)
  let timeline = 0;
  if (claim.timeline && claim.timeline.length > 0) {
    timeline = Math.min(10, claim.timeline.length * 3);
  } else if (claim.incidentDate) {
    timeline = 4;
  }

  // Evidence attached (15 points)
  let evidence = 0;
  if (claim.evidenceCount && claim.evidenceCount > 0) {
    evidence = Math.min(15, claim.evidenceCount * 5);
  }

  // Signature exists (15 points)
  const signature = claim.hasSignature ? 15 : 0;

  return { requiredFields, validAmount, demands, timeline, evidence, signature };
}

// ─── Strength Score ─────────────────────────────────────────────────────────

function calculateStrength(claim: ClaimForScoring): StrengthScore {
  let score = 0;

  // Evidence factor
  if (!claim.evidenceCount || claim.evidenceCount === 0) {
    score -= 2;
  } else if (claim.evidenceCount >= 3) {
    score += 3;
  } else {
    score += 1;
  }

  // Timeline factor
  if (!claim.timeline || claim.timeline.length === 0) {
    if (!claim.incidentDate) score -= 1;
  } else if (claim.timeline.length >= 3) {
    score += 2;
  } else {
    score += 1;
  }

  // Written agreement factor
  if (claim.hasWrittenAgreement) score += 2;

  // Prior notice factor
  if (claim.hasPriorNotice) score += 1;

  // Proof of payment factor
  if (claim.hasProofOfPayment) score += 1;

  // Summary completeness
  const summaryText = claim.summary || claim.factsSummary || '';
  if (summaryText.length > 200) score += 2;
  else if (summaryText.length > 50) score += 1;

  // Demands clarity
  if (claim.demands && claim.demands.length >= 2) score += 1;

  if (score >= 6) return 'strong';
  if (score >= 2) return 'medium';
  return 'weak';
}

// ─── Missing Fields ─────────────────────────────────────────────────────────

function findMissingFields(claim: ClaimForScoring): MissingField[] {
  const missing: MissingField[] = [];

  if (!claim.plaintiffName?.trim())
    missing.push({ field: 'plaintiffName', label: 'שם מלא של התובע', importance: 'required' });
  if (!claim.plaintiffId?.trim())
    missing.push({ field: 'plaintiffId', label: 'מספר תעודת זהות', importance: 'required' });
  if (!claim.plaintiffPhone?.trim())
    missing.push({ field: 'plaintiffPhone', label: 'מספר טלפון', importance: 'required' });
  if (!claim.plaintiffAddress?.trim())
    missing.push({ field: 'plaintiffAddress', label: 'כתובת מגורים', importance: 'required' });
  if (!claim.defendant?.trim())
    missing.push({ field: 'defendant', label: 'שם הנתבע / העסק', importance: 'required' });
  if (!claim.defendantAddress?.trim())
    missing.push({ field: 'defendantAddress', label: 'כתובת הנתבע', importance: 'recommended' });
  if (!claim.amount || claim.amount <= 0)
    missing.push({ field: 'amount', label: 'סכום התביעה', importance: 'required' });
  if (!(claim.summary || claim.factsSummary)?.trim())
    missing.push({ field: 'summary', label: 'תיאור האירוע', importance: 'required' });
  if (!claim.demands || claim.demands.length === 0)
    missing.push({ field: 'demands', label: 'דרישות / סעדים מבוקשים', importance: 'recommended' });
  if (!claim.timeline || claim.timeline.length === 0)
    missing.push({ field: 'timeline', label: 'ציר זמן של האירועים', importance: 'recommended' });
  if (!claim.hasSignature)
    missing.push({ field: 'signature', label: 'חתימה דיגיטלית', importance: 'recommended' });
  if (!claim.evidenceCount || claim.evidenceCount === 0)
    missing.push({ field: 'evidence', label: 'ראיות (תמונות / מסמכים)', importance: 'recommended' });

  return missing;
}

// ─── Risk Flags ─────────────────────────────────────────────────────────────

function findRiskFlags(claim: ClaimForScoring): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (!claim.hasWrittenAgreement && claim.claimType === 'contract') {
    flags.push({
      id: 'no_written_agreement',
      severity: 'high',
      title: 'אין הסכם כתוב',
      description: 'תביעה על הפרת חוזה ללא מסמך כתוב עלולה להיות קשה להוכחה. שקול/י למצוא כל תיעוד של ההסכם (הודעות, מיילים וכד\').',
      icon: '📝',
    });
  }

  if (!claim.hasPriorNotice) {
    flags.push({
      id: 'no_prior_notice',
      severity: 'medium',
      title: 'לא נשלחה התראה מוקדמת',
      description: 'בית המשפט מצפה שניסית לפתור את הבעיה לפני הגשת התביעה. שלח/י מכתב התראה לנתבע.',
      icon: '✉️',
    });
  }

  if (!claim.hasProofOfPayment && claim.amount && claim.amount > 0) {
    flags.push({
      id: 'no_proof_of_payment',
      severity: 'medium',
      title: 'אין הוכחת תשלום',
      description: 'אם שילמת עבור שירות או מוצר, חשוב להציג קבלה, העברה בנקאית, או דף חשבון.',
      icon: '💳',
    });
  }

  if (claim.amount && claim.amount > SMALL_CLAIMS_MAX_AMOUNT_NIS) {
    flags.push({
      id: 'amount_exceeds_limit',
      severity: 'high',
      title: 'סכום חורג מהמגבלה',
      description: `סכום התביעה (₪${claim.amount.toLocaleString('he-IL')}) חורג ממגבלת תביעות קטנות (₪${SMALL_CLAIMS_MAX_AMOUNT_NIS.toLocaleString('he-IL')}). התביעה תידחה או שתצטרך/י לוותר על ההפרש.`,
      icon: '⚠️',
    });
  }

  if (!claim.evidenceCount || claim.evidenceCount === 0) {
    flags.push({
      id: 'no_evidence',
      severity: 'high',
      title: 'אין ראיות מצורפות',
      description: 'תביעה ללא ראיות תומכות עלולה להידחות. הוסף/י תמונות, קבלות, חוזים, או תכתובות.',
      icon: '📎',
    });
  }

  if (!(claim.summary || claim.factsSummary) || (claim.summary || claim.factsSummary || '').length < 50) {
    flags.push({
      id: 'vague_description',
      severity: 'medium',
      title: 'תיאור לא מפורט מספיק',
      description: 'תיאור קצר מדי עלול לא להבהיר את טענותיך. השלם/י את הראיון עם ה-AI כדי לפרט יותר.',
      icon: '📋',
    });
  }

  return flags;
}

// ─── Improvement Suggestions ────────────────────────────────────────────────

function generateSuggestions(
  claim: ClaimForScoring,
  missing: MissingField[],
  risks: RiskFlag[],
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Based on missing fields
  const requiredMissing = missing.filter(m => m.importance === 'required');
  if (requiredMissing.length > 0) {
    suggestions.push({
      id: 'complete_required_fields',
      title: 'השלם שדות חובה',
      description: `חסרים ${requiredMissing.length} שדות חובה: ${requiredMissing.map(m => m.label).join(', ')}`,
      priority: 'high',
      icon: '✏️',
    });
  }

  // Evidence suggestions
  if (!claim.evidenceCount || claim.evidenceCount === 0) {
    suggestions.push({
      id: 'add_evidence',
      title: 'הוסף ראיות',
      description: 'צלם קבלות, חוזים, תכתובות, או כל מסמך שתומך בטענותיך. ככל שיש יותר ראיות, הסיכוי לזכות גדל.',
      priority: 'high',
      icon: '📷',
    });
  } else if (claim.evidenceCount < 3) {
    suggestions.push({
      id: 'more_evidence',
      title: 'הוסף עוד ראיות',
      description: 'ככל שיהיו יותר ראיות תומכות, התיק שלך יהיה חזק יותר.',
      priority: 'medium',
      icon: '📎',
    });
  }

  // Prior notice suggestion
  if (!claim.hasPriorNotice) {
    suggestions.push({
      id: 'send_notice',
      title: 'שלח מכתב התראה',
      description: 'לפני הגשת תביעה, מומלץ לשלוח מכתב התראה לנתבע. זה מראה לבית המשפט שניסית לפתור את הבעיה.',
      priority: 'high',
      icon: '✉️',
    });
  }

  // Signature
  if (!claim.hasSignature) {
    suggestions.push({
      id: 'add_signature',
      title: 'הוסף חתימה',
      description: 'כתב תביעה חייב להיחתם. הוסף חתימה דיגיטלית בלשונית "חתימה".',
      priority: 'medium',
      icon: '✍️',
    });
  }

  // Timeline
  if (!claim.timeline || claim.timeline.length === 0) {
    suggestions.push({
      id: 'add_timeline',
      title: 'הוסף ציר זמן',
      description: 'ציר זמן ברור של האירועים יעזור לשופט להבין את המקרה שלך.',
      priority: 'medium',
      icon: '📅',
    });
  }

  // Mock trial
  if (claim.evidenceCount && claim.evidenceCount > 0 && (claim.summary || claim.factsSummary)) {
    suggestions.push({
      id: 'mock_trial',
      title: 'תרגל מוק-טריאל',
      description: 'תרגול עם שופט AI יעזור לך להתכונן לשאלות קשות בדיון האמיתי.',
      priority: 'low',
      icon: '⚖️',
    });
  }

  return suggestions.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });
}

// ─── Score Label Helpers ────────────────────────────────────────────────────

export function getReadinessLabel(score: number): string {
  if (score >= 80) return 'מוכן להגשה';
  if (score >= 60) return 'כמעט מוכן';
  if (score >= 40) return 'בתהליך';
  if (score >= 20) return 'התחלתי';
  return 'ראשוני';
}

export function getReadinessColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

export function getStrengthLabel(strength: StrengthScore): string {
  switch (strength) {
    case 'strong': return 'חזקה';
    case 'medium': return 'בינונית';
    case 'weak':   return 'חלשה';
  }
}

export function getStrengthColor(strength: StrengthScore): string {
  switch (strength) {
    case 'strong': return '#22c55e';
    case 'medium': return '#f59e0b';
    case 'weak':   return '#ef4444';
  }
}
