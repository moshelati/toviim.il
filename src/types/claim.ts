export type ClaimStatus = 'chat' | 'evidence' | 'review' | 'complete';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Evidence {
  id:          string;
  uri:         string;   // Firebase Storage download URL
  localUri?:   string;   // Original local URI
  type:        'image' | 'document';
  name:        string;
  uploadedAt:  number;
}

export interface Claim {
  id:          string;
  userId:      string;
  status:      ClaimStatus;
  claimType?:  string;
  messages:    ChatMessage[];
  evidence?:   Evidence[];
  // Extracted by AI during interview
  summary?:         string;
  amount?:          number;
  defendant?:       string;
  defendantAddress?: string;
  incidentDate?:    string;
  legalBasis?:      string;
  // Plaintiff (filled on creation)
  plaintiffName?:    string;
  plaintiffId?:      string;   // ת.ז.
  plaintiffPhone?:   string;
  plaintiffAddress?: string;
  // Signature & PDF
  signatureUrl?: string;
  pdfUrl?:       string;
  createdAt:  number;
  updatedAt:  number;
}
