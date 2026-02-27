// ─── Case Graph Storage ──────────────────────────────────────────────────────
// Firestore persistence for the Case Graph.
// Each claim has one graph document stored as a sub-collection.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CaseGraph } from './types';
import type { Claim } from '../types/claim';
import { buildGraphFromClaim, createEmptyGraph } from './builder';

const GRAPHS_COL = 'caseGraphs';

/** Save a graph to Firestore (full overwrite) */
export async function saveGraph(graph: CaseGraph): Promise<void> {
  const ref = doc(db, GRAPHS_COL, graph.claimId);
  await setDoc(ref, {
    ...graph,
    updatedAt: Date.now(),
  });
}

/** Load graph for a claim. Returns null if not found. */
export async function loadGraph(claimId: string): Promise<CaseGraph | null> {
  const ref = doc(db, GRAPHS_COL, claimId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as CaseGraph;
}

/**
 * Get or create graph for a claim.
 * If the graph doesn't exist yet, builds it from the legacy Claim data.
 */
export async function getOrCreateGraph(claim: Claim): Promise<CaseGraph> {
  const existing = await loadGraph(claim.id);
  if (existing) return existing;

  // Build from legacy data
  const graph = buildGraphFromClaim(claim);
  await saveGraph(graph);
  return graph;
}

/**
 * Create a fresh empty graph for a new claim.
 */
export async function createGraph(claimId: string): Promise<CaseGraph> {
  const graph = createEmptyGraph(claimId);
  await saveGraph(graph);
  return graph;
}

/**
 * Delete graph for a claim (cleanup).
 */
export async function deleteGraph(claimId: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  const ref = doc(db, GRAPHS_COL, claimId);
  await deleteDoc(ref);
}
