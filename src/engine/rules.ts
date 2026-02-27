// ─── Rules Engine ────────────────────────────────────────────────────────────
// Deterministic, code-only rules for Israeli Small Claims Court.
// Each rule inspects the Case Graph and outputs:
//   - blockers[]   → things that MUST be fixed before filing
//   - warnings[]   → things that SHOULD be fixed
//   - nextActions[] → the recommended next steps
//
// Rules are evaluated in priority order. The engine never calls AI.

import type { CaseGraph } from '../graph/types';
import {
  getPlaintiff, getDefendants, getEvents, getDemands,
  getEvidence, getCommunications, getRisks,
  getUncoveredEvents, getUnlinkedEvidence,
  getCoveredDemands, hasPriorNotice, getTotalAmount,
} from '../graph/queries';
import { SMALL_CLAIMS_MAX_AMOUNT_NIS } from '../config/legal';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RuleSeverity = 'blocker' | 'warning' | 'info';

export interface RuleResult {
  ruleId: string;
  severity: RuleSeverity;
  title: string;        // Hebrew
  description: string;  // Hebrew
  icon: string;
  /** Which node IDs this rule relates to (for linking in UI) */
  relatedNodeIds?: string[];
}

export interface NextAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Screen to navigate to */
  screen?: string;
  /** Priority (lower = more urgent) */
  priority: number;
}

export interface RulesOutput {
  blockers: RuleResult[];
  warnings: RuleResult[];
  infos: RuleResult[];
  nextActions: NextAction[];
  /** Can the user file the claim right now? */
  canFile: boolean;
}

// ─── Rule definitions ────────────────────────────────────────────────────────

type RuleFn = (graph: CaseGraph) => RuleResult | null;

const RULES: RuleFn[] = [
  // ─── Blockers ─────────────────────────────────────────
  ruleNoPlaintiff,
  ruleNoDefendant,
  ruleNoAmount,
  ruleAmountExceedsLimit,
  ruleNoFactsSummary,
  rulePlaintiffMissingId,
  rulePlaintiffMissingAddress,

  // ─── Warnings ─────────────────────────────────────────
  ruleNoPriorNotice,
  ruleNoEvidence,
  ruleUncoveredEvents,
  ruleUnlinkedEvidence,
  ruleNoTimeline,
  ruleVagueSummary,
  ruleNoWrittenAgreement,
  ruleNoDemandLegalBasis,

  // ─── Info ─────────────────────────────────────────────
  ruleStrongCase,
];

// ─── Main entry point ────────────────────────────────────────────────────────

export function evaluateRules(graph: CaseGraph): RulesOutput {
  const blockers: RuleResult[] = [];
  const warnings: RuleResult[] = [];
  const infos: RuleResult[] = [];

  for (const rule of RULES) {
    const result = rule(graph);
    if (!result) continue;
    switch (result.severity) {
      case 'blocker': blockers.push(result); break;
      case 'warning': warnings.push(result); break;
      case 'info':    infos.push(result);    break;
    }
  }

  const nextActions = generateNextActions(graph, blockers, warnings);
  const canFile = blockers.length === 0;

  return { blockers, warnings, infos, nextActions, canFile };
}

// ─── Blocker rules ───────────────────────────────────────────────────────────

function ruleNoPlaintiff(graph: CaseGraph): RuleResult | null {
  const p = getPlaintiff(graph);
  if (p?.fullName?.trim()) return null;
  return {
    ruleId: 'no_plaintiff',
    severity: 'blocker',
    title: 'חסרים פרטי תובע',
    description: 'יש למלא שם מלא, ת.ז., טלפון וכתובת של התובע.',
    icon: '🚫',
  };
}

function ruleNoDefendant(graph: CaseGraph): RuleResult | null {
  if (getDefendants(graph).length > 0) return null;
  return {
    ruleId: 'no_defendant',
    severity: 'blocker',
    title: 'חסר נתבע',
    description: 'כל תביעה חייבת לכלול לפחות נתבע אחד עם שם וכתובת.',
    icon: '🚫',
  };
}

function ruleNoAmount(graph: CaseGraph): RuleResult | null {
  const amount = getTotalAmount(graph);
  if (amount > 0) return null;
  return {
    ruleId: 'no_amount',
    severity: 'blocker',
    title: 'חסר סכום תביעה',
    description: 'יש לציין את הסכום הנתבע בשקלים.',
    icon: '💰',
  };
}

function ruleAmountExceedsLimit(graph: CaseGraph): RuleResult | null {
  const amount = getTotalAmount(graph);
  if (amount <= 0 || amount <= SMALL_CLAIMS_MAX_AMOUNT_NIS) return null;
  return {
    ruleId: 'amount_exceeds_limit',
    severity: 'blocker',
    title: 'סכום חורג ממגבלת תביעות קטנות',
    description: `הסכום (₪${amount.toLocaleString('he-IL')}) חורג מהתקרה (₪${SMALL_CLAIMS_MAX_AMOUNT_NIS.toLocaleString('he-IL')}). יש להפחית את הסכום או לפנות לבית משפט שלום.`,
    icon: '⚠️',
  };
}

function ruleNoFactsSummary(graph: CaseGraph): RuleResult | null {
  const events = getEvents(graph);
  // If there are meaningful events, we have enough narrative
  if (events.length >= 2) return null;
  const demands = getDemands(graph);
  // If there's at least one event and one demand, OK
  if (events.length >= 1 && demands.length >= 1) return null;
  return {
    ruleId: 'no_facts_summary',
    severity: 'blocker',
    title: 'חסר תיאור אירועים',
    description: 'יש לתאר את מהלך האירועים שהובילו לתביעה. השלם/י את הראיון עם ה-AI.',
    icon: '📝',
  };
}

function rulePlaintiffMissingId(graph: CaseGraph): RuleResult | null {
  const p = getPlaintiff(graph);
  if (!p || p.idNumber?.trim()) return null;
  return {
    ruleId: 'plaintiff_missing_id',
    severity: 'blocker',
    title: 'חסר מספר ת.ז. של התובע',
    description: 'מספר תעודת זהות הוא שדה חובה בטופס תביעה.',
    icon: '🪪',
  };
}

function rulePlaintiffMissingAddress(graph: CaseGraph): RuleResult | null {
  const p = getPlaintiff(graph);
  if (!p || p.address?.trim()) return null;
  return {
    ruleId: 'plaintiff_missing_address',
    severity: 'blocker',
    title: 'חסרה כתובת התובע',
    description: 'כתובת מגורים נדרשת בכתב התביעה.',
    icon: '📍',
  };
}

// ─── Warning rules ───────────────────────────────────────────────────────────

function ruleNoPriorNotice(graph: CaseGraph): RuleResult | null {
  if (hasPriorNotice(graph)) return null;
  return {
    ruleId: 'no_prior_notice',
    severity: 'warning',
    title: 'לא נשלחה התראה מוקדמת',
    description: 'בית המשפט מצפה שניסית לפתור את הסכסוך לפני הגשת תביעה. מומלץ לשלוח מכתב התראה.',
    icon: '✉️',
  };
}

function ruleNoEvidence(graph: CaseGraph): RuleResult | null {
  if (getEvidence(graph).length > 0) return null;
  return {
    ruleId: 'no_evidence',
    severity: 'warning',
    title: 'אין ראיות מצורפות',
    description: 'תביעה ללא ראיות עלולה להידחות. צרף/י קבלות, חוזים, תכתובות או תמונות.',
    icon: '📎',
  };
}

function ruleUncoveredEvents(graph: CaseGraph): RuleResult | null {
  const uncovered = getUncoveredEvents(graph);
  if (uncovered.length === 0) return null;
  return {
    ruleId: 'uncovered_events',
    severity: 'warning',
    title: `${uncovered.length} אירועים ללא ראיה תומכת`,
    description: 'יש אירועים בציר הזמן שלא קושרו לראיה. קשר/י ראיות לאירועים כדי לחזק את התביעה.',
    icon: '🔗',
    relatedNodeIds: uncovered.map(e => e.id),
  };
}

function ruleUnlinkedEvidence(graph: CaseGraph): RuleResult | null {
  const unlinked = getUnlinkedEvidence(graph);
  if (unlinked.length === 0) return null;
  return {
    ruleId: 'unlinked_evidence',
    severity: 'warning',
    title: `${unlinked.length} ראיות לא מקושרות`,
    description: 'יש ראיות שלא קושרו לאירוע או דרישה. קשר/י אותן כדי שיהיו רלוונטיות.',
    icon: '📌',
    relatedNodeIds: unlinked.map(e => e.id),
  };
}

function ruleNoTimeline(graph: CaseGraph): RuleResult | null {
  if (getEvents(graph).length > 0) return null;
  return {
    ruleId: 'no_timeline',
    severity: 'warning',
    title: 'אין ציר זמן',
    description: 'ציר זמן ברור של האירועים עוזר לשופט להבין את המקרה.',
    icon: '📅',
  };
}

function ruleVagueSummary(graph: CaseGraph): RuleResult | null {
  const events = getEvents(graph);
  const totalDescLen = events.reduce((sum, e) => sum + (e.description?.length ?? 0), 0);
  if (totalDescLen >= 100) return null;
  if (events.length === 0) return null; // Already covered by ruleNoFactsSummary
  return {
    ruleId: 'vague_summary',
    severity: 'warning',
    title: 'תיאור קצר מדי',
    description: 'תיאור מפורט יותר של האירועים ישפר את סיכויי התביעה.',
    icon: '📋',
  };
}

function ruleNoWrittenAgreement(graph: CaseGraph): RuleResult | null {
  // Only relevant for contract claims — check if any event mentions contract
  const events = getEvents(graph);
  const evidence = getEvidence(graph);
  const hasContractEvidence = evidence.some(
    e => e.tag === 'contract' || e.tag === 'agreement'
  );
  if (hasContractEvidence) return null;

  // Only warn if events mention contract-related terms
  const contractTerms = ['חוזה', 'הסכם', 'התחייבות', 'contract'];
  const mentionsContract = events.some(
    e => contractTerms.some(t => e.description.includes(t))
  );
  if (!mentionsContract) return null;

  return {
    ruleId: 'no_written_agreement',
    severity: 'warning',
    title: 'אין הסכם כתוב מצורף',
    description: 'תביעה הקשורה לחוזה תתחזק עם צירוף ההסכם הכתוב.',
    icon: '📝',
  };
}

function ruleNoDemandLegalBasis(graph: CaseGraph): RuleResult | null {
  const demands = getDemands(graph);
  const unsub = demands.filter(d => !d.legalBasis?.trim());
  if (unsub.length === 0 || demands.length === 0) return null;
  return {
    ruleId: 'no_legal_basis',
    severity: 'warning',
    title: 'דרישות ללא בסיס משפטי',
    description: 'הוספת סעיף חוק רלוונטי לכל דרישה משפרת את סיכויי הזכייה.',
    icon: '⚖️',
    relatedNodeIds: unsub.map(d => d.id),
  };
}

// ─── Info rules ──────────────────────────────────────────────────────────────

function ruleStrongCase(graph: CaseGraph): RuleResult | null {
  const evidence = getEvidence(graph);
  const events = getEvents(graph);
  const demands = getDemands(graph);
  const covered = getCoveredDemands(graph);
  const notice = hasPriorNotice(graph);

  if (
    evidence.length >= 3 &&
    events.length >= 3 &&
    demands.length >= 1 &&
    covered.length === demands.length &&
    notice
  ) {
    return {
      ruleId: 'strong_case',
      severity: 'info',
      title: 'התיק חזק ומגובה היטב',
      description: 'יש ראיות, ציר זמן, התראה מוקדמת, וכל הדרישות מגובות. מומלץ להתקדם להגשה.',
      icon: '💪',
    };
  }
  return null;
}

// ─── Next Actions Generator ──────────────────────────────────────────────────

function generateNextActions(
  graph: CaseGraph,
  blockers: RuleResult[],
  warnings: RuleResult[],
): NextAction[] {
  const actions: NextAction[] = [];

  // Priority 1: Fix blockers
  if (blockers.some(b => b.ruleId === 'no_plaintiff' || b.ruleId === 'plaintiff_missing_id' || b.ruleId === 'plaintiff_missing_address')) {
    actions.push({
      id: 'complete_plaintiff',
      title: 'השלם פרטי תובע',
      description: 'מלא שם מלא, ת.ז., טלפון וכתובת.',
      icon: '👤',
      screen: 'PlaintiffForm',
      priority: 1,
    });
  }

  if (blockers.some(b => b.ruleId === 'no_defendant')) {
    actions.push({
      id: 'add_defendant',
      title: 'הוסף נתבע',
      description: 'מלא שם וכתובת הנתבע.',
      icon: '🏢',
      screen: 'DefendantForm',
      priority: 2,
    });
  }

  if (blockers.some(b => b.ruleId === 'no_amount')) {
    actions.push({
      id: 'set_amount',
      title: 'הגדר סכום תביעה',
      description: 'ציין את הסכום שאתה תובע.',
      icon: '💰',
      screen: 'DemandForm',
      priority: 3,
    });
  }

  if (blockers.some(b => b.ruleId === 'no_facts_summary')) {
    actions.push({
      id: 'complete_interview',
      title: 'השלם ראיון AI',
      description: 'ה-AI ישאל אותך שאלות וייצר את תיאור האירועים.',
      icon: '🤖',
      screen: 'ClaimChat',
      priority: 4,
    });
  }

  // Priority 2: Fix warnings
  if (warnings.some(w => w.ruleId === 'no_evidence')) {
    actions.push({
      id: 'add_evidence',
      title: 'הוסף ראיות',
      description: 'צלם או העלה מסמכים תומכים.',
      icon: '📷',
      screen: 'EvidenceLinking',
      priority: 5,
    });
  }

  if (warnings.some(w => w.ruleId === 'no_prior_notice')) {
    actions.push({
      id: 'send_notice',
      title: 'שלח מכתב התראה',
      description: 'צור ושלח מכתב התראה לנתבע.',
      icon: '✉️',
      screen: 'WarningLetter',
      priority: 6,
    });
  }

  if (warnings.some(w => w.ruleId === 'uncovered_events' || w.ruleId === 'unlinked_evidence')) {
    actions.push({
      id: 'link_evidence',
      title: 'קשר ראיות לאירועים',
      description: 'חזק את התיק על ידי קישור ראיות לאירועים.',
      icon: '🔗',
      screen: 'EvidenceLinking',
      priority: 7,
    });
  }

  // Priority 3: When ready
  if (blockers.length === 0) {
    actions.push({
      id: 'generate_pdf',
      title: 'צור כתב תביעה',
      description: 'הפק PDF מוכן להגשה.',
      icon: '📄',
      screen: 'ClaimDetail',
      priority: 10,
    });

    actions.push({
      id: 'mock_trial',
      title: 'תרגל מוק-טריאל',
      description: 'תרגול עם שופט AI לפני הדיון.',
      icon: '⚖️',
      screen: 'MockTrial',
      priority: 11,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}
