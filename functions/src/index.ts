import * as crypto from 'crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

initializeApp();
const db = getFirestore();

// ENCRYPTION_SECRET lives in Google Cloud Secret Manager.
// Set it once with: firebase functions:secrets:set ENCRYPTION_SECRET
// It is NEVER exposed to the browser or baked into any JS bundle.
const ENCRYPTION_SECRET = defineSecret('ENCRYPTION_SECRET');

// In local dev without Secret Manager, reuse a single generated key per instance
let devFallbackKey: string | null = null;

/**
 * Retrieves the master encryption secret. In production it comes from Secret Manager.
 * If missing (e.g., during local development), generates a temporary random key.
 * Cached in-process so encrypt and decrypt use the exact same key.
 */
function getMasterSecret(): string {
  try {
    const secret = ENCRYPTION_SECRET.value();
    if (secret && secret.length >= 32) {
      return secret;
    }
  } catch {
    // ENCRYPTION_SECRET might throw when accessed outside Cloud Functions runtime
  }

  if (!devFallbackKey) {
    console.warn('ENCRYPTION_SECRET is not set or too short; using a temporary in-memory key for development only.');
    devFallbackKey = crypto.randomBytes(32).toString('base64');
  }
  return devFallbackKey;
}

export { privacy, tos } from './privacy';


const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 310_000;
const KEY_LENGTH = 32; // 256 bits

/** Derives a per-project AES-256-GCM key from the master secret + projectId salt. */
function deriveKey(masterSecret: string, projectId: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterSecret,
    Buffer.concat([Buffer.from(projectId, 'utf8'), salt]),
    ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Callable: encryptValue
 * Input:  { projectId: string, plaintext: string }
 * Output: { ciphertext: string }  (base64-encoded salt+iv+tag+ciphertext)
 *
 * Only callable by authenticated Firebase users who are members of the project.
 */
export const encryptValue = onCall(
  { secrets: [ENCRYPTION_SECRET] },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in to encrypt values.');
    }

    const { projectId, plaintext } = request.data as { projectId: string; plaintext: string };

    if (!projectId || typeof projectId !== 'string') {
      throw new HttpsError('invalid-argument', 'projectId is required.');
    }
    if (typeof plaintext !== 'string') {
      throw new HttpsError('invalid-argument', 'plaintext must be a string.');
    }
    if (plaintext.length > 32_768) {
      throw new HttpsError('invalid-argument', 'plaintext too large (max 32KB).');
    }

    // 2. Authorization — verify caller is a member of the project
    const projectRef = db.doc(`projects/${projectId}`);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new HttpsError('not-found', 'Project not found.');
    }
    const projectData = projectSnap.data()!;
    const memberUids: string[] = projectData.memberUids ?? [];
    if (!memberUids.includes(request.auth.uid)) {
      throw new HttpsError('permission-denied', 'Not a member of this project.');
    }

    // 3. Encrypt
    const masterSecret = getMasterSecret();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(masterSecret, projectId, salt);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16 bytes GCM auth tag

    // Layout: [16B salt][12B iv][16B authTag][ciphertext]
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return { ciphertext: combined.toString('base64') };
  }
);

/**
 * Callable: decryptValue
 * Input:  { projectId: string, ciphertext: string }
 * Output: { plaintext: string }
 *
 * Only callable by authenticated Firebase users who are members of the project.
 */
export const decryptValue = onCall(
  { secrets: [ENCRYPTION_SECRET] },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in to decrypt values.');
    }

    const { projectId, ciphertext } = request.data as { projectId: string; ciphertext: string };

    if (!projectId || typeof projectId !== 'string') {
      throw new HttpsError('invalid-argument', 'projectId is required.');
    }
    if (typeof ciphertext !== 'string') {
      throw new HttpsError('invalid-argument', 'ciphertext must be a string.');
    }

    // 2. Authorization — verify caller is a member of the project
    const projectRef = db.doc(`projects/${projectId}`);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new HttpsError('not-found', 'Project not found.');
    }
    const projectData = projectSnap.data()!;
    const memberUids: string[] = projectData.memberUids ?? [];
    if (!memberUids.includes(request.auth.uid)) {
      throw new HttpsError('permission-denied', 'Not a member of this project.');
    }

    // 3. Decrypt
    const masterSecret = getMasterSecret();
    const combined = Buffer.from(ciphertext, 'base64');

    const MIN_LENGTH = SALT_LENGTH + IV_LENGTH + 16; // +16 for GCM auth tag
    if (combined.length < MIN_LENGTH) {
      throw new HttpsError('invalid-argument', 'Ciphertext payload is too short.');
    }

    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16);
    const encryptedData = combined.subarray(SALT_LENGTH + IV_LENGTH + 16);

    const key = deriveKey(masterSecret, projectId, salt);

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
      return { plaintext: decrypted.toString('utf8') };
    } catch {
      throw new HttpsError('invalid-argument', 'Decryption failed. Invalid payload or wrong project key.');
    }
  }
);
