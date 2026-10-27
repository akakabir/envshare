/**
 * crypto.ts — Client-side wrappers for server-side encryption/decryption.
 *
 * ALL cryptographic operations are performed in Firebase Cloud Functions.
 * The ENCRYPTION_SECRET never leaves Google's servers — it lives in
 * Google Cloud Secret Manager and is only accessible to the functions.
 *
 * Architecture:
 *   Browser → Firebase Callable Function → Secret Manager → AES-256-GCM
 *                                        ↓
 *                               Returns ciphertext/plaintext
 *
 * Per-project key derivation:
 *   key = PBKDF2(ENCRYPTION_SECRET, projectId || salt, 310_000 iter, SHA-256, 256-bit)
 *   So each project effectively has a unique key even with the same master secret.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

function getFunctionsInstance() {
  return getFunctions(getApp());
}

/**
 * Encrypts a sensitive string value via Cloud Function.
 * @param plainText  The plaintext value to encrypt
 * @param projectId  The Firestore project document ID (used as key context)
 */
export async function encryptSensitiveValue(plainText: string, projectId: string): Promise<string> {
  const functions = getFunctionsInstance();
  const encryptFn = httpsCallable<{ projectId: string; plaintext: string }, { ciphertext: string }>(
    functions,
    'encryptValue'
  );
  const result = await encryptFn({ projectId, plaintext: plainText });
  return result.data.ciphertext;
}

/**
 * Decrypts an AES-256-GCM payload via Cloud Function.
 * @param ciphertext  Base64-encoded salt+iv+authTag+ciphertext
 * @param projectId   The Firestore project document ID (used as key context)
 */
export async function decryptSensitiveValue(ciphertext: string, projectId: string): Promise<string> {
  const functions = getFunctionsInstance();
  const decryptFn = httpsCallable<{ projectId: string; ciphertext: string }, { plaintext: string }>(
    functions,
    'decryptValue'
  );
  const result = await decryptFn({ projectId, ciphertext });
  return result.data.plaintext;
}
