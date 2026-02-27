// ─── Case Graph Builder ──────────────────────────────────────────────────────
// Constructs a CaseGraph from existing Claim data (backward compat migration)
// and provides mutation helpers for adding / updating nodes + edges.

import type { Claim, Evidence, TimelineEvent, Plaintiff, Defendant } from '../types/claim';
import type {
  CaseGraph, GraphNode, GraphEdge,
  EventNode, DemandNode, EvidenceNode, CommunicationNode, PartyNode,
  EdgeKind, EventCategory,
  GraphSummary,
} from './types';
import { GRAPH_VERSION } from './types';

// ─── ID generation ───────────────────────────────────────────────────────────

let _counter = 0;
function uid(prefix: string): string {
  _counter += 1;
  return `${prefix}_${Date.now()}_${_counter}`;
}

// ─── Create empty graph ──────────────────────────────────────────────────────

export function createEmptyGraph(claimId: string): CaseGraph {
  const now = Date.now();
  return {
    claimId,
    version: GRAPH_VERSION,
    nodes: [],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Build graph from legacy Claim ───────────────────────────────────────────
// Migrates flat claim data into the Case Graph structure.
// This is called once when the graph doesn't exist yet for a claim.

export function buildGraphFromClaim(claim: Claim): CaseGraph {
  const graph = createEmptyGraph(claim.id);

  // 1. Parties
  const plaintiffNode = addPlaintiffNode(graph, claim);
  const defendantNodes = addDefendantNodes(graph, claim);

  // 2. Timeline → Events
  const eventNodes = addTimelineEvents(graph, claim.timeline ?? []);

  // 3. Demands
  const demandNodes = addDemandsFromClaim(graph, claim);

  // 4. Evidence → EvidenceNodes + links
  addEvidenceNodes(graph, claim.evidence ?? []);

  // 5. Communication — infer from flags
  if (claim.hasPriorNotice) {
    addNode(graph, {
      id: uid('comm'),
      kind: 'communication',
      label: 'התראה מוקדמת',
      direction: 'outgoing',
      medium: 'letter',
      summary: 'נשלחה התראה מוקדמת לנתבע לפני הגשת התביעה',
      isPriorNotice: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as CommunicationNode);
  }

  // 6. Risks — infer from existing riskFlags
  if (claim.riskFlags) {
    for (const flag of claim.riskFlags) {
      addNode(graph, {
        id: uid('risk'),
        kind: 'risk',
        label: flag.title,
        severity: flag.severity,
        description: flag.description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  // 7. Link demands to parties
  if (plaintiffNode && demandNodes.length > 0) {
    for (const demand of demandNodes) {
      addEdge(graph, {
        id: uid('edge'),
        kind: 'filed_by',
        source: demand.id,
        target: plaintiffNode.id,
      });
    }
  }
  if (defendantNodes.length > 0 && demandNodes.length > 0) {
    for (const demand of demandNodes) {
      addEdge(graph, {
        id: uid('edge'),
        kind: 'filed_against',
        source: demand.id,
        target: defendantNodes[0].id,
      });
    }
  }

  // 8. Link events sequentially (followed_by)
  for (let i = 0; i < eventNodes.length - 1; i++) {
    addEdge(graph, {
      id: uid('edge'),
      kind: 'followed_by',
      source: eventNodes[i].id,
      target: eventNodes[i + 1].id,
    });
  }

  graph.updatedAt = Date.now();
  return graph;
}

// ─── Node addition helpers ───────────────────────────────────────────────────

function addPlaintiffNode(graph: CaseGraph, claim: Claim): PartyNode | null {
  const name = claim.plaintiffName || claim.plaintiff?.fullName;
  if (!name) return null;

  const node: PartyNode = {
    id: uid('party'),
    kind: 'party',
    label: name,
    role: 'plaintiff',
    fullName: name,
    idNumber: claim.plaintiffId || claim.plaintiff?.idNumber,
    phone: claim.plaintiffPhone || claim.plaintiff?.phone,
    address: claim.plaintiffAddress || claim.plaintiff?.address,
    partyType: (claim.plaintiff?.type as PartyNode['partyType']) ?? 'individual',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  addNode(graph, node);
  return node;
}

function addDefendantNodes(graph: CaseGraph, claim: Claim): PartyNode[] {
  const nodes: PartyNode[] = [];

  // From structured defendants
  if (claim.defendants && claim.defendants.length > 0) {
    for (const d of claim.defendants) {
      const node: PartyNode = {
        id: uid('party'),
        kind: 'party',
        label: d.name,
        role: 'defendant',
        fullName: d.name,
        phone: d.phone,
        address: d.address,
        partyType: (d.type as PartyNode['partyType']) ?? 'individual',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addNode(graph, node);
      nodes.push(node);
    }
  }
  // Fallback to legacy flat field
  else if (claim.defendant) {
    const node: PartyNode = {
      id: uid('party'),
      kind: 'party',
      label: claim.defendant,
      role: 'defendant',
      fullName: claim.defendant,
      address: claim.defendantAddress,
      partyType: 'individual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addNode(graph, node);
    nodes.push(node);
  }

  return nodes;
}

function addTimelineEvents(graph: CaseGraph, timeline: TimelineEvent[]): EventNode[] {
  const nodes: EventNode[] = [];
  for (const evt of timeline) {
    const node: EventNode = {
      id: uid('event'),
      kind: 'event',
      label: (evt.description || evt.event || '').slice(0, 60),
      date: evt.date,
      description: evt.description || evt.event || '',
      category: 'other',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addNode(graph, node);
    nodes.push(node);
  }
  return nodes;
}

function addDemandsFromClaim(graph: CaseGraph, claim: Claim): DemandNode[] {
  const nodes: DemandNode[] = [];
  const amount = claim.amount || claim.amountClaimedNis;

  if (claim.demands && claim.demands.length > 0) {
    for (const d of claim.demands) {
      const node: DemandNode = {
        id: uid('demand'),
        kind: 'demand',
        label: d.slice(0, 60),
        description: d,
        legalBasis: claim.legalBasis,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      // Assign total amount to first demand (best guess)
      if (nodes.length === 0 && amount) {
        node.amountNis = amount;
      }
      addNode(graph, node);
      nodes.push(node);
    }
  } else if (amount && amount > 0) {
    // No explicit demands but has an amount → single demand
    const node: DemandNode = {
      id: uid('demand'),
      kind: 'demand',
      label: `פיצוי כספי: ₪${amount.toLocaleString('he-IL')}`,
      description: claim.factsSummary || claim.summary || 'פיצוי כספי',
      amountNis: amount,
      legalBasis: claim.legalBasis,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addNode(graph, node);
    nodes.push(node);
  }

  return nodes;
}

function addEvidenceNodes(graph: CaseGraph, evidence: Evidence[]): EvidenceNode[] {
  const nodes: EvidenceNode[] = [];
  for (const e of evidence) {
    const node: EvidenceNode = {
      id: uid('evid'),
      kind: 'evidence',
      label: e.name || 'ראיה',
      evidenceId: e.id,
      uri: e.uri,
      evidenceType: e.type === 'document' ? 'document' : 'image',
      tag: e.tag,
      createdAt: e.uploadedAt || Date.now(),
      updatedAt: Date.now(),
    };
    addNode(graph, node);
    nodes.push(node);
  }
  return nodes;
}

// ─── Mutation helpers ────────────────────────────────────────────────────────

export function addNode(graph: CaseGraph, node: GraphNode): void {
  graph.nodes.push(node);
  graph.updatedAt = Date.now();
}

export function removeNode(graph: CaseGraph, nodeId: string): void {
  graph.nodes = graph.nodes.filter(n => n.id !== nodeId);
  // Remove orphan edges
  graph.edges = graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  graph.updatedAt = Date.now();
}

export function updateNode(graph: CaseGraph, nodeId: string, updates: Partial<GraphNode>): void {
  const idx = graph.nodes.findIndex(n => n.id === nodeId);
  if (idx === -1) return;
  graph.nodes[idx] = { ...graph.nodes[idx], ...updates, updatedAt: Date.now() } as GraphNode;
  graph.updatedAt = Date.now();
}

export function addEdge(graph: CaseGraph, edge: GraphEdge): void {
  // Prevent duplicate edges
  const exists = graph.edges.some(
    e => e.source === edge.source && e.target === edge.target && e.kind === edge.kind
  );
  if (!exists) {
    graph.edges.push(edge);
    graph.updatedAt = Date.now();
  }
}

export function removeEdge(graph: CaseGraph, edgeId: string): void {
  graph.edges = graph.edges.filter(e => e.id !== edgeId);
  graph.updatedAt = Date.now();
}

// ─── Quick add helpers (for UI screens) ──────────────────────────────────────

export function addEvent(
  graph: CaseGraph,
  date: string,
  description: string,
  category: EventCategory = 'other',
): EventNode {
  const node: EventNode = {
    id: uid('event'),
    kind: 'event',
    label: description.slice(0, 60),
    date,
    description,
    category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  addNode(graph, node);
  return node;
}

export function addDemand(
  graph: CaseGraph,
  description: string,
  amountNis?: number,
  legalBasis?: string,
): DemandNode {
  const node: DemandNode = {
    id: uid('demand'),
    kind: 'demand',
    label: description.slice(0, 60),
    description,
    amountNis,
    legalBasis,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  addNode(graph, node);
  return node;
}

export function linkEvidenceToEvent(
  graph: CaseGraph,
  evidenceNodeId: string,
  eventNodeId: string,
): void {
  addEdge(graph, {
    id: uid('edge'),
    kind: 'supports',
    source: evidenceNodeId,
    target: eventNodeId,
    weight: 1,
  });
}

export function linkEvidenceToDemand(
  graph: CaseGraph,
  evidenceNodeId: string,
  demandNodeId: string,
): void {
  addEdge(graph, {
    id: uid('edge'),
    kind: 'supports',
    source: evidenceNodeId,
    target: demandNodeId,
    weight: 1,
  });
}

// ─── Graph summary ───────────────────────────────────────────────────────────

export function summarizeGraph(graph: CaseGraph): GraphSummary {
  const events    = graph.nodes.filter(n => n.kind === 'event');
  const demands   = graph.nodes.filter(n => n.kind === 'demand') as DemandNode[];
  const evidence  = graph.nodes.filter(n => n.kind === 'evidence');
  const comms     = graph.nodes.filter(n => n.kind === 'communication') as import('./types').CommunicationNode[];
  const parties   = graph.nodes.filter(n => n.kind === 'party');
  const risks     = graph.nodes.filter(n => n.kind === 'risk');

  // Evidence linked to at least one event or demand via 'supports'
  const supportEdges = new Set(
    graph.edges.filter(e => e.kind === 'supports').map(e => e.source)
  );
  const linkedEvidenceCount = evidence.filter(e => supportEdges.has(e.id)).length;

  // Demands with legal basis
  const substantiatedDemandCount = demands.filter(d => d.legalBasis?.trim()).length;

  // Prior notice
  const hasPriorNotice = comms.some(c => c.isPriorNotice);

  // Total amount
  const totalAmountNis = demands.reduce((sum, d) => sum + (d.amountNis ?? 0), 0);

  return {
    totalNodes: graph.nodes.length,
    eventCount: events.length,
    demandCount: demands.length,
    evidenceCount: evidence.length,
    communicationCount: comms.length,
    partyCount: parties.length,
    riskCount: risks.length,
    totalEdges: graph.edges.length,
    linkedEvidenceCount,
    substantiatedDemandCount,
    hasPriorNotice,
    totalAmountNis,
  };
}
