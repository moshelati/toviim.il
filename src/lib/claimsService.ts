import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Claim, ChatMessage, Evidence } from '../types/claim';

const COL = 'claims';

export async function createClaim(userId: string, plaintiffName: string): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, COL), {
    userId,
    status:       'chat',
    messages:     [],
    evidence:     [],
    plaintiffName,
    createdAt:    now,
    updatedAt:    now,
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
