import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from './firebase';
import { Evidence } from '../types/claim';

/**
 * Upload an image/document URI to Firebase Storage and return Evidence object.
 * Works on both web (blob: / data: URIs) and native (file: / content: URIs).
 */
export async function uploadEvidence(
  userId:   string,
  claimId:  string,
  localUri: string,
  fileName: string,
  type: 'image' | 'document' = 'image',
): Promise<Evidence> {
  const path     = `evidence/${userId}/${claimId}/${Date.now()}_${fileName}`;
  const fileRef  = storageRef(storage, path);

  // Fetch the URI as a blob (works on web + native)
  const response = await fetch(localUri);
  const blob     = await response.blob();

  await uploadBytes(fileRef, blob);
  const downloadUrl = await getDownloadURL(fileRef);

  return {
    id:         `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    uri:        downloadUrl,
    localUri,
    type,
    name:       fileName,
    uploadedAt: Date.now(),
  };
}

/**
 * Upload a base64 signature data-URL to Firebase Storage.
 * Returns the public download URL.
 */
export async function uploadSignature(
  userId:  string,
  claimId: string,
  dataUrl: string,
): Promise<string> {
  const path    = `signatures/${userId}/${claimId}/signature.png`;
  const fileRef = storageRef(storage, path);

  const response = await fetch(dataUrl);
  const blob     = await response.blob();

  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
}

/**
 * Delete an evidence file from Firebase Storage by its download URL path.
 */
export async function deleteEvidenceFile(
  userId:  string,
  claimId: string,
  name:    string,
): Promise<void> {
  try {
    const path    = `evidence/${userId}/${claimId}/${name}`;
    const fileRef = storageRef(storage, path);
    await deleteObject(fileRef);
  } catch (_) {
    // Ignore – file may already be deleted or path mismatch
  }
}
