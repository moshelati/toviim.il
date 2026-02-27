// ─── Case Graph Types ─────────────────────────────────────────────────────────
// The Case Graph is the core data model for a legal claim.
// It represents all facts, events, demands, evidence, and communications
// as typed nodes connected by directed edges.
//
// Every engine (Rules, Scoring, Eligibility, Preflight, PDF) reads from this
// graph — it is the single source of truth for a claim's legal state.

// ─── Node Types ──────────────────────────────────────────────────────────────

export type NodeKind =
  | 'event'
  | 'demand'
  | 'evidence'
  | 'communication'
  | 'party'
  | 'risk';

/** Base fields every node shares */
interface NodeBase {
  id: string;
  kind: NodeKind;
  label: string;           // Short Hebrew display label
  createdAt: number;       // Epoch ms
  updatedAt: number;
  /** Free-form metadata the AI or user can attach */
  meta?: Record<string, unknown>;
}

/** A point in time — purchase, incident, complaint, filing, etc. */
export interface EventNode extends NodeBase {
  kind: 'event';
  date?: string;           // ISO date or Hebrew free text
  description: string;
  category?: EventCategory;
}

export type EventCategory =
  | 'purchase'
  | 'incident'
  | 'complaint'
  | 'demand_sent'
  | 'response_received'
  | 'escalation'
  | 'filing'
  | 'hearing'
  | 'other';

/** A specific relief / demand the plaintiff requests */
export interface DemandNode extends NodeBase {
  kind: 'demand';
  amountNis?: number;
  description: string;
  legalBasis?: string;     // e.g. "חוק הגנת הצרכן, סעיף 31"
}

/** A document / photo / recording linked to the case */
export interface EvidenceNode extends NodeBase {
  kind: 'evidence';
  evidenceId: string;      // FK → Evidence.id in Firestore
  uri?: string;
  evidenceType: 'image' | 'document' | 'video' | 'audio' | 'text';
  tag?: string;            // "receipt", "contract", "correspondence"
  description?: string;
}

/** An interaction between parties (email, letter, phone call, SMS) */
export interface CommunicationNode extends NodeBase {
  kind: 'communication';
  date?: string;
  direction: 'outgoing' | 'incoming';
  medium: 'email' | 'letter' | 'phone' | 'sms' | 'whatsapp' | 'in_person' | 'other';
  summary: string;
  /** Whether this constitutes a prior notice (התראה מוקדמת) */
  isPriorNotice?: boolean;
}

/** A party involved in the case */
export interface PartyNode extends NodeBase {
  kind: 'party';
  role: 'plaintiff' | 'defendant' | 'witness';
  fullName: string;
  idNumber?: string;
  phone?: string;
  address?: string;
  partyType?: 'individual' | 'business' | 'sole_proprietor';
}

/** A risk or weakness identified in the case */
export interface RiskNode extends NodeBase {
  kind: 'risk';
  severity: 'high' | 'medium' | 'low';
  description: string;
  /** Suggested mitigation */
  mitigation?: string;
}

export type GraphNode =
  | EventNode
  | DemandNode
  | EvidenceNode
  | CommunicationNode
  | PartyNode
  | RiskNode;

// ─── Edge Types ──────────────────────────────────────────────────────────────

export type EdgeKind =
  | 'caused_by'       // Event → Event  (causal chain)
  | 'followed_by'     // Event → Event  (temporal sequence)
  | 'supports'        // Evidence → Event | Demand
  | 'undermines'      // Evidence / Risk → Event | Demand
  | 'addresses'       // Communication → Event
  | 'filed_by'        // Demand → Party
  | 'filed_against'   // Demand → Party (defendant)
  | 'relates_to';     // Generic

export interface GraphEdge {
  id: string;
  kind: EdgeKind;
  source: string;  // Node ID
  target: string;  // Node ID
  label?: string;
  weight?: number; // 0–1, strength of connection
  meta?: Record<string, unknown>;
}

// ─── The Graph ───────────────────────────────────────────────────────────────

export interface CaseGraph {
  /** Claim ID this graph belongs to */
  claimId: string;
  /** Schema version — bump when structure changes */
  version: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  createdAt: number;
  updatedAt: number;
}

// ─── Graph summary (for quick UI display) ─────────────────────────────────

export interface GraphSummary {
  totalNodes: number;
  eventCount: number;
  demandCount: number;
  evidenceCount: number;
  communicationCount: number;
  partyCount: number;
  riskCount: number;
  totalEdges: number;
  /** Number of evidence nodes linked to at least one event */
  linkedEvidenceCount: number;
  /** Number of demands with legal basis */
  substantiatedDemandCount: number;
  /** Whether prior notice was sent */
  hasPriorNotice: boolean;
  /** Total amount claimed across all demands */
  totalAmountNis: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const GRAPH_VERSION = 1;
