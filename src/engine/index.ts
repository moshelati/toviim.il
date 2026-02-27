// ─── Engine Layer — public API ────────────────────────────────────────────────
export { calculateConfidence, getReadinessLabel, getReadinessColor, getStrengthLabel, getStrengthColor } from './confidence';
export type { ConfidenceResult, ClaimForScoring, ScoreBreakdown, StrengthScore, RiskFlag, MissingField, Suggestion } from './confidence';

export { evaluateRules } from './rules';
export type { RulesOutput, RuleResult, RuleSeverity, NextAction } from './rules';

export { checkEligibility, isQuickEligible } from './eligibility';
export type { EligibilityResult, EligibilityInput, EligibilityVerdict, EligibilityBlocker } from './eligibility';

export { scoreGraph } from './graphScoring';
export type { GraphScoreResult, GraphScoreBreakdown } from './graphScoring';
