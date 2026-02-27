// ─── Graph-Based Scoring Engine ──────────────────────────────────────────────
// Enhanced scoring that reads from the Case Graph rather than flat claim data.
// This replaces the flat ClaimForScoring approach with graph-aware metrics.
//
// Scores:
//   readinessScore (0–100): Can this claim be filed?
//   evidenceCoverage (0–100): How well are events/demands supported by evidence?
//   timelineConsistency (0–100): Is the timeline coherent?
//   legalCompleteness (0–100): Are legal requirements met?
//
// The old confidence.ts is kept for backward compat but this module is canonical.

import type { CaseGraph } from '../graph/types';
import {
  getPlaintiff, getDefendants, getEvents, getDemands,
  getEvidence, getCommunications,
  getUncoveredEvents, getUnlinkedEvidence, getCoveredDemands,
  hasPriorNotice, getTotalAmount, getEventsSorted,
} from '../graph/queries';
import { evaluateRules } from './rules';
import { SMALL_CLAIMS_MAX_AMOUNT_NIS } from '../config/legal';
import type { StrengthScore } from './confidence';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GraphScoreResult {
  /** Overall readiness for filing (0–100) */
  readinessScore: number;
  /** Evidence coverage ratio (0–100) */
  evidenceCoverage: number;
  /** Timeline coherence (0–100) */
  timelineConsistency: number;
  /** Legal completeness (0–100) */
  legalCompleteness: number;
  /** Overall strength assessment */
  strengthScore: StrengthScore;
  /** Detailed breakdown */
  breakdown: GraphScoreBreakdown;
}

export interface GraphScoreBreakdown {
  /** Plaintiff details complete (max 20) */
  plaintiffData: number;
  /** Defendant details complete (max 10) */
  defendantData: number;
  /** Amount & demands (max 15) */
  claimSubstance: number;
  /** Timeline & events (max 15) */
  narrative: number;
  /** Evidence coverage (max 20) */
  evidenceScore: number;
  /** Prior notice & communication (max 10) */
  procedural: number;
  /** Legal basis (max 10) */
  legalBasis: number;
}

// ─── Main scoring ────────────────────────────────────────────────────────────

export function scoreGraph(graph: CaseGraph): GraphScoreResult {
  const breakdown = calculateGraphBreakdown(graph);

  const readinessScore = Math.min(100,
    breakdown.plaintiffData +
    breakdown.defendantData +
    breakdown.claimSubstance +
    breakdown.narrative +
    breakdown.evidenceScore +
    breakdown.procedural +
    breakdown.legalBasis
  );

  const evidenceCoverage = calculateEvidenceCoverage(graph);
  const timelineConsistency = calculateTimelineConsistency(graph);
  const legalCompleteness = calculateLegalCompleteness(graph);
  const strengthScore = determineStrength(readinessScore, evidenceCoverage, timelineConsistency);

  return {
    readinessScore,
    evidenceCoverage,
    timelineConsistency,
    legalCompleteness,
    strengthScore,
    breakdown,
  };
}

// ─── Breakdown (sums to 100) ─────────────────────────────────────────────────

function calculateGraphBreakdown(graph: CaseGraph): GraphScoreBreakdown {
  // Plaintiff data (max 20)
  let plaintiffData = 0;
  const plaintiff = getPlaintiff(graph);
  if (plaintiff) {
    if (plaintiff.fullName?.trim()) plaintiffData += 6;
    if (plaintiff.idNumber?.trim()) plaintiffData += 5;
    if (plaintiff.phone?.trim()) plaintiffData += 4;
    if (plaintiff.address?.trim()) plaintiffData += 5;
  }

  // Defendant data (max 10)
  let defendantData = 0;
  const defendants = getDefendants(graph);
  if (defendants.length > 0) {
    const d = defendants[0];
    if (d.fullName?.trim()) defendantData += 6;
    if (d.address?.trim()) defendantData += 4;
  }

  // Amount & demands (max 15)
  let claimSubstance = 0;
  const amount = getTotalAmount(graph);
  const demands = getDemands(graph);
  if (amount > 0) claimSubstance += 5;
  if (amount > 0 && amount <= SMALL_CLAIMS_MAX_AMOUNT_NIS) claimSubstance += 3;
  if (demands.length >= 1) claimSubstance += 4;
  if (demands.length >= 2) claimSubstance += 3;

  // Narrative / timeline (max 15)
  let narrative = 0;
  const events = getEvents(graph);
  if (events.length >= 1) narrative += 4;
  if (events.length >= 3) narrative += 4;
  if (events.length >= 5) narrative += 3;
  // Check if events have descriptions
  const descriptive = events.filter(e => (e.description?.length ?? 0) > 20);
  if (descriptive.length >= 2) narrative += 4;

  // Evidence (max 20)
  let evidenceScore = 0;
  const evidence = getEvidence(graph);
  if (evidence.length >= 1) evidenceScore += 5;
  if (evidence.length >= 3) evidenceScore += 5;
  if (evidence.length >= 5) evidenceScore += 3;
  // Linked evidence bonus
  const unlinked = getUnlinkedEvidence(graph);
  const linkedCount = evidence.length - unlinked.length;
  if (linkedCount >= 1) evidenceScore += 3;
  if (linkedCount >= 3) evidenceScore += 4;

  // Procedural (max 10)
  let procedural = 0;
  const comms = getCommunications(graph);
  if (hasPriorNotice(graph)) procedural += 7;
  if (comms.length >= 2) procedural += 3;

  // Legal basis (max 10)
  let legalBasis = 0;
  const substantiated = demands.filter(d => d.legalBasis?.trim());
  if (substantiated.length >= 1) legalBasis += 5;
  if (demands.length > 0 && substantiated.length === demands.length) legalBasis += 5;

  return {
    plaintiffData,
    defendantData,
    claimSubstance,
    narrative,
    evidenceScore,
    procedural,
    legalBasis,
  };
}

// ─── Sub-scores ──────────────────────────────────────────────────────────────

function calculateEvidenceCoverage(graph: CaseGraph): number {
  const events = getEvents(graph);
  const demands = getDemands(graph);
  const evidence = getEvidence(graph);

  if (evidence.length === 0) return 0;
  if (events.length === 0 && demands.length === 0) return 50; // Have evidence but nothing to link

  let total = events.length + demands.length;
  if (total === 0) return 0;

  const coveredEvents = events.length - getUncoveredEvents(graph).length;
  const coveredDemands = getCoveredDemands(graph).length;
  const covered = coveredEvents + coveredDemands;

  return Math.round((covered / total) * 100);
}

function calculateTimelineConsistency(graph: CaseGraph): number {
  const events = getEventsSorted(graph);
  if (events.length === 0) return 0;
  if (events.length === 1) return 40;

  let score = 0;
  // Has multiple events
  score += 30;

  // Events have dates
  const withDates = events.filter(e => e.date?.trim());
  score += Math.min(30, Math.round((withDates.length / events.length) * 30));

  // Events have descriptions
  const withDesc = events.filter(e => (e.description?.length ?? 0) > 10);
  score += Math.min(20, Math.round((withDesc.length / events.length) * 20));

  // Chronological ordering (dates in ascending order)
  let isChronological = true;
  for (let i = 1; i < withDates.length; i++) {
    if (withDates[i].date! < withDates[i - 1].date!) {
      isChronological = false;
      break;
    }
  }
  if (isChronological && withDates.length >= 2) score += 20;

  return Math.min(100, score);
}

function calculateLegalCompleteness(graph: CaseGraph): number {
  const rules = evaluateRules(graph);
  const totalRules = rules.blockers.length + rules.warnings.length;
  if (totalRules === 0) return 100;

  // Each blocker costs 15 pts, each warning costs 5 pts
  const penalty = (rules.blockers.length * 15) + (rules.warnings.length * 5);
  return Math.max(0, 100 - penalty);
}

// ─── Strength determination ──────────────────────────────────────────────────

function determineStrength(
  readiness: number,
  coverage: number,
  timeline: number,
): StrengthScore {
  const avg = (readiness + coverage + timeline) / 3;
  if (avg >= 70) return 'strong';
  if (avg >= 40) return 'medium';
  return 'weak';
}
