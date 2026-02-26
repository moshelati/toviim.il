import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Claim, ChatMessage, Evidence } from '../types/claim';
import { calculateConfidence, ClaimForScoring } from '../engine/confidence';

const COL = 'claims';

export async function createClaim(
  userId: string,
  plaintiffName: string,
  claimType?: string,
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, COL), {
    userId,
    status:        'chat',
    claimType:     claimType || '',
    messages:      [],
    evidence:      [],
    plaintiffName,
    plaintiff:     { fullName: plaintiffName, type: 'individual' },
    defendants:    [],
    timeline:      [],
    demands:       [],
    readinessScore: 0,
    strengthScore:  'weak',
    riskFlags:      [],
    missingFields:  [],
    suggestions:    [],
    createdAt:     now,
    updatedAt:     now,
  });
  return ref.id;
}

export async function getClaim(claimId: string): Promise<Claim | null> {
  const snap = await getDoc(doc(db, COL, claimId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Claim;
}

export async function getUserClaims(userId: string): Promise<Claim[]> {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Claim));
}

export async function appendMessage(claimId: string, messages: ChatMessage[]): Promise<void> {
  await updateDoc(doc(db, COL, claimId), {
    messages,
    updatedAt: Date.now(),
  });
}

export async function addEvidence(claimId: string, items: Evidence[]): Promise<void> {
  await updateDoc(doc(db, COL, claimId), {
    evidence:  items,
    updatedAt: Date.now(),
  });
}

export async function updateClaimMeta(
  claimId: string,
  meta: Partial<Omit<Claim, 'id' | 'userId' | 'messages' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, COL, claimId), { ...meta, updatedAt: Date.now() });
}

// ─── Recalculate and update confidence scores ──────────────────────────────
export async function recalculateConfidence(claimId: string): Promise<void> {
  const claim = await getClaim(claimId);
  if (!claim) return;

  const scoring: ClaimForScoring = {
    plaintiffName: claim.plaintiffName || claim.plaintiff?.fullName,
    plaintiffId: claim.plaintiffId || claim.plaintiff?.idNumber,
    plaintiffPhone: claim.plaintiffPhone || claim.plaintiff?.phone,
    plaintiffAddress: claim.plaintiffAddress || claim.plaintiff?.address,
    defendant: claim.defendant || claim.defendants?.[0]?.name,
    defendantAddress: claim.defendantAddress || claim.defendants?.[0]?.address,
    amount: claim.amount || claim.amountClaimedNis,
    summary: claim.summary,
    factsSummary: claim.factsSummary,
    claimType: claim.claimType,
    timeline: claim.timeline,
    demands: claim.demands,
    evidenceCount: claim.evidence?.length ?? 0,
    hasSignature: !!(claim.signatureUrl || claim.signatureUri),
    hasWrittenAgreement: claim.hasWrittenAgreement,
    hasPriorNotice: claim.hasPriorNotice,
    hasProofOfPayment: claim.hasProofOfPayment,
    incidentDate: claim.incidentDate,
  };

  const result = calculateConfidence(scoring);

  await updateClaimMeta(claimId, {
    readinessScore: result.readinessScore,
    strengthScore: result.strengthScore,
    riskFlags: result.riskFlags,
    missingFields: result.missingFields,
    suggestions: result.suggestions,
  });
}
