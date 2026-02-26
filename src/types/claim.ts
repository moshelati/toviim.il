import type { StrengthScore, RiskFlag, MissingField, Suggestion } from '../engine/confidence';

export type ClaimStatus = 'draft' | 'chat' | 'evidence' | 'ready' | 'exported' | 'review' | 'complete';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Evidence {
  id:              string;
  uri:             string;   // Firebase Storage download URL
  localUri?:       string;   // Original local URI
  type:            'image' | 'document';
  name:            string;
  tag?:            string;   // Evidence tag/label
  includeInExport?: boolean;
  uploadedAt:      number;
}

export interface TimelineEvent {
  date: string;
  description: string;
  event?: string;       // Legacy alias
}

export interface Plaintiff {
  fullName:  string;
  type:      'individual' | 'sole_proprietor';
  idNumber?: string;       // ת.ז.
  phone?:    string;
  address?:  string;
}

export interface Defendant {
  name:     string;
  address?: string;
  phone?:   string;
  type?:    string;        // person, business, etc.
}

export interface ExportInfo {
  pdfUri?:     string;
  exportedAt?: number;
  version?:    number;
}

export interface Claim {
  id:          string;
  userId:      string;
  status:      ClaimStatus;
  claimType?:  string;
  messages:    ChatMessage[];
  evidence?:   Evidence[];

  // ─── Amount ────────────────────────────────────────────────────────────
  amountClaimedNis?: number;
  amount?:           number;     // Backward compat alias

  // ─── Plaintiff ─────────────────────────────────────────────────────────
  plaintiff?: Plaintiff;
  // Legacy flat fields (backward compat)
  plaintiffName?:    string;
  plaintiffId?:      string;
  plaintiffPhone?:   string;
  plaintiffAddress?: string;

  // ─── Defendant(s) ──────────────────────────────────────────────────────
  defendants?: Defendant[];
  // Legacy flat fields
  defendant?:        string;
  defendantAddress?: string;

  // ─── Extracted by AI ───────────────────────────────────────────────────
  factsSummary?:     string;
  summary?:          string;     // Legacy alias
  timeline?:         TimelineEvent[];
  demands?:          string[];
  incidentDate?:     string;
  legalBasis?:       string;
  evidenceIndex?:    string[];

  // ─── Confidence Engine ─────────────────────────────────────────────────
  readinessScore?:   number;
  strengthScore?:    StrengthScore;
  riskFlags?:        RiskFlag[];
  missingFields?:    MissingField[];
  suggestions?:      Suggestion[];

  // ─── Flags (from AI extraction) ────────────────────────────────────────
  hasWrittenAgreement?: boolean;
  hasPriorNotice?:      boolean;
  hasProofOfPayment?:   boolean;

  // ─── Signature & PDF ───────────────────────────────────────────────────
  signatureUri?: string;
  signatureUrl?: string;     // Legacy alias
  exportInfo?:   ExportInfo;
  pdfUrl?:       string;

  // ─── Timestamps ────────────────────────────────────────────────────────
  createdAt:  number;
  updatedAt:  number;
}
