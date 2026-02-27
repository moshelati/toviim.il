// ─── Case Graph Queries ──────────────────────────────────────────────────────
// Read-only traversal utilities for the Case Graph.
// These are used by the Rules Engine, Scoring Engine, Preflight, PDF, and UI.

import type {
  CaseGraph, GraphNode, GraphEdge,
  EventNode, DemandNode, EvidenceNode, CommunicationNode, PartyNode, RiskNode,
  NodeKind, EdgeKind,
} from './types';

// ─── Node queries ────────────────────────────────────────────────────────────

/** Get a single node by ID */
export function getNode(graph: CaseGraph, nodeId: string): GraphNode | undefined {
  return graph.nodes.find(n => n.id === nodeId);
}

/** Get all nodes of a specific kind */
export function getNodesByKind<K extends NodeKind>(
  graph: CaseGraph,
  kind: K,
): Extract<GraphNode, { kind: K }>[] {
  return graph.nodes.filter(n => n.kind === kind) as Extract<GraphNode, { kind: K }>[];
}

/** Shorthand getters */
export const getEvents         = (g: CaseGraph) => getNodesByKind(g, 'event') as EventNode[];
export const getDemands        = (g: CaseGraph) => getNodesByKind(g, 'demand') as DemandNode[];
export const getEvidence       = (g: CaseGraph) => getNodesByKind(g, 'evidence') as EvidenceNode[];
export const getCommunications = (g: CaseGraph) => getNodesByKind(g, 'communication') as CommunicationNode[];
export const getParties        = (g: CaseGraph) => getNodesByKind(g, 'party') as PartyNode[];
export const getRisks          = (g: CaseGraph) => getNodesByKind(g, 'risk') as RiskNode[];

/** Get the plaintiff party node */
export function getPlaintiff(graph: CaseGraph): PartyNode | undefined {
  return getParties(graph).find(p => p.role === 'plaintiff');
}

/** Get all defendant party nodes */
export function getDefendants(graph: CaseGraph): PartyNode[] {
  return getParties(graph).filter(p => p.role === 'defendant');
}

/** Get events sorted chronologically (best effort — dates may be free-text) */
export function getEventsSorted(graph: CaseGraph): EventNode[] {
  return getEvents(graph).sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

// ─── Edge queries ────────────────────────────────────────────────────────────

/** Get all edges of a specific kind */
export function getEdgesByKind(graph: CaseGraph, kind: EdgeKind): GraphEdge[] {
  return graph.edges.filter(e => e.kind === kind);
}

/** Get all edges going OUT from a node */
export function getOutEdges(graph: CaseGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter(e => e.source === nodeId);
}

/** Get all edges coming IN to a node */
export function getInEdges(graph: CaseGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter(e => e.target === nodeId);
}

/** Get all neighbor node IDs (both directions) */
export function getNeighbors(graph: CaseGraph, nodeId: string): string[] {
  const ids = new Set<string>();
  for (const e of graph.edges) {
    if (e.source === nodeId) ids.add(e.target);
    if (e.target === nodeId) ids.add(e.source);
  }
  return [...ids];
}

/** Get neighbor nodes of a specific kind */
export function getNeighborsByKind<K extends NodeKind>(
  graph: CaseGraph,
  nodeId: string,
  kind: K,
): Extract<GraphNode, { kind: K }>[] {
  const neighborIds = getNeighbors(graph, nodeId);
  return graph.nodes.filter(
    n => neighborIds.includes(n.id) && n.kind === kind,
  ) as Extract<GraphNode, { kind: K }>[];
}

// ─── Evidence coverage ───────────────────────────────────────────────────────

/** Which events have at least one supporting evidence? */
export function getCoveredEvents(graph: CaseGraph): EventNode[] {
  const supportedIds = new Set(
    getEdgesByKind(graph, 'supports')
      .filter(e => {
        const target = getNode(graph, e.target);
        return target?.kind === 'event';
      })
      .map(e => e.target),
  );
  return getEvents(graph).filter(ev => supportedIds.has(ev.id));
}

/** Which events have NO supporting evidence? */
export function getUncoveredEvents(graph: CaseGraph): EventNode[] {
  const coveredIds = new Set(getCoveredEvents(graph).map(e => e.id));
  return getEvents(graph).filter(ev => !coveredIds.has(ev.id));
}

/** Which demands have at least one supporting evidence? */
export function getCoveredDemands(graph: CaseGraph): DemandNode[] {
  const supportedIds = new Set(
    getEdgesByKind(graph, 'supports')
      .filter(e => {
        const target = getNode(graph, e.target);
        return target?.kind === 'demand';
      })
      .map(e => e.target),
  );
  return getDemands(graph).filter(d => supportedIds.has(d.id));
}

/** Get all evidence nodes that support a given node */
export function getEvidenceFor(graph: CaseGraph, nodeId: string): EvidenceNode[] {
  const evidenceIds = getEdgesByKind(graph, 'supports')
    .filter(e => e.target === nodeId)
    .map(e => e.source);
  return graph.nodes.filter(
    n => evidenceIds.includes(n.id) && n.kind === 'evidence',
  ) as EvidenceNode[];
}

/** Get all unlinked evidence (not supporting any node) */
export function getUnlinkedEvidence(graph: CaseGraph): EvidenceNode[] {
  const linkedIds = new Set(
    getEdgesByKind(graph, 'supports').map(e => e.source),
  );
  return getEvidence(graph).filter(e => !linkedIds.has(e.id));
}

// ─── Prior notice ────────────────────────────────────────────────────────────

/** Check if prior notice was sent */
export function hasPriorNotice(graph: CaseGraph): boolean {
  return getCommunications(graph).some(c => c.isPriorNotice);
}

/** Get prior notice communications */
export function getPriorNotices(graph: CaseGraph): CommunicationNode[] {
  return getCommunications(graph).filter(c => c.isPriorNotice);
}

// ─── Amount calculations ─────────────────────────────────────────────────────

/** Total amount across all demands */
export function getTotalAmount(graph: CaseGraph): number {
  return getDemands(graph).reduce((sum, d) => sum + (d.amountNis ?? 0), 0);
}

// ─── Causal chain ────────────────────────────────────────────────────────────

/** Follow caused_by / followed_by edges from a starting event to build timeline */
export function getEventChain(graph: CaseGraph, startEventId: string): EventNode[] {
  const visited = new Set<string>();
  const chain: EventNode[] = [];

  function traverse(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = getNode(graph, id);
    if (!node || node.kind !== 'event') return;
    chain.push(node as EventNode);

    // Follow forward edges
    const forwardEdges = graph.edges.filter(
      e => e.source === id && (e.kind === 'followed_by' || e.kind === 'caused_by'),
    );
    for (const edge of forwardEdges) {
      traverse(edge.target);
    }
  }

  traverse(startEventId);
  return chain;
}

// ─── Graph health checks ─────────────────────────────────────────────────────

export interface GraphHealthReport {
  /** Events without any evidence */
  uncoveredEvents: EventNode[];
  /** Evidence not linked to anything */
  unlinkedEvidence: EvidenceNode[];
  /** Demands without legal basis */
  unsubstantiatedDemands: DemandNode[];
  /** Whether there's at least one plaintiff */
  hasPlaintiff: boolean;
  /** Whether there's at least one defendant */
  hasDefendant: boolean;
  /** Whether prior notice was sent */
  hasPriorNotice: boolean;
  /** Overall health score 0–100 */
  healthScore: number;
}

export function getGraphHealth(graph: CaseGraph): GraphHealthReport {
  const uncoveredEvents = getUncoveredEvents(graph);
  const unlinkedEv = getUnlinkedEvidence(graph);
  const demands = getDemands(graph);
  const unsubstantiatedDemands = demands.filter(d => !d.legalBasis?.trim());

  const plaintiff = getPlaintiff(graph);
  const defendants = getDefendants(graph);
  const priorNotice = hasPriorNotice(graph);

  // Health score (0–100)
  let score = 0;
  const events = getEvents(graph);

  // Has parties (20 pts)
  if (plaintiff) score += 10;
  if (defendants.length > 0) score += 10;

  // Has events (15 pts)
  if (events.length >= 3) score += 15;
  else if (events.length >= 1) score += 8;

  // Has demands (15 pts)
  if (demands.length > 0) score += 10;
  if (demands.some(d => d.amountNis && d.amountNis > 0)) score += 5;

  // Evidence coverage (25 pts)
  const evidenceNodes = getEvidence(graph);
  if (evidenceNodes.length >= 3) score += 15;
  else if (evidenceNodes.length >= 1) score += 8;
  const coverageRatio = events.length > 0
    ? (events.length - uncoveredEvents.length) / events.length
    : 0;
  score += Math.round(coverageRatio * 10);

  // Prior notice (10 pts)
  if (priorNotice) score += 10;

  // Legal basis (15 pts)
  if (demands.length > 0) {
    const substRatio = (demands.length - unsubstantiatedDemands.length) / demands.length;
    score += Math.round(substRatio * 15);
  }

  return {
    uncoveredEvents,
    unlinkedEvidence: unlinkedEv,
    unsubstantiatedDemands,
    hasPlaintiff: !!plaintiff,
    hasDefendant: defendants.length > 0,
    hasPriorNotice: priorNotice,
    healthScore: Math.min(100, score),
  };
}
