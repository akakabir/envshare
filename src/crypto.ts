/**
 * crypto.ts — Client-side Web Crypto AES-256-GCM + PBKDF2 encryption.
 *
 * Runs 100% in the client browser using the standard Web Crypto API.
 * Eliminates cloud function invocation failures (internal errors) and ensures
 * zero-knowledge client protection.
 *
 * Key features:
 *  - PBKDF2 with SHA-256 & 310,000 iterations
 *  - AES-256-GCM with random 16-byte salt and 12-byte IV per value
 *  - Supports generating high-entropy custom keys per project
 *  - Graceful fallback and compatibility with both WebCrypto and Node GCM layouts
 *  - Custom keys stored only as ciphertext in IndexedDB (never plaintext browser storage)
 */

const ITERATIONS = 310_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a PBKDF2 AES-GCM 256-bit CryptoKey from a given passphrase and salt.
 */
async function deriveKey(salt: Uint8Array, passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secretKeyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    secretKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a high-entropy, cryptographically secure 256-bit encryption key.
 */
export function generateEncryptionKey(): string {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------------------------------------------
 * Encrypted-at-rest key store (IndexedDB)
 *
 * Custom per-project keys are NEVER written to localStorage or
 * sessionStorage in plaintext. Each key is AES-GCM encrypted with a
 * non-extractable wrapping key that lives in IndexedDB. JavaScript can
 * use the wrapping key but cannot export its raw bytes.
 * ------------------------------------------------------------------ */

const KEY_DB_NAME = 'envshare-keystore';
const KEY_STORE_NAME = 'keys';
const WRAP_KEY_ID = '__wrap_key__';

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KEY_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(KEY_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbRun<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openKeyDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(KEY_STORE_NAME, mode);
      const req = op(tx.objectStore(KEY_STORE_NAME));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function getWrapKey(): Promise<CryptoKey> {
  const existing = await idbRun<CryptoKey | undefined>('readonly', (st) => st.get(WRAP_KEY_ID));
  if (existing) return existing;
  // extractable = false: the raw key material can never be read back by JS
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  await idbRun('readwrite', (st) => st.put(key, WRAP_KEY_ID));
  return key;
}

interface StoredKeyRecord {
  iv: Uint8Array;
  ct: ArrayBuffer;
}

/**
 * Moves any legacy plaintext key from localStorage / sessionStorage into the
 * encrypted store, then removes the plaintext copy.
 */
async function migrateLegacyKey(projectId: string): Promise<void> {
  const name = `envshare_key_${projectId}`;
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const legacy = store.getItem(name);
      if (legacy === null) continue;
      if (legacy.trim()) {
        await setProjectPassphrase(projectId, legacy);
      }
      store.removeItem(name);
    } catch {
      // storage unavailable or blocked; nothing to migrate
    }
  }
}

/**
 * Returns the effective encryption passphrase for a project.
 * Uses the user's custom key if one is saved (decrypted from the encrypted
 * store), otherwise the per-project default.
 */
export async function getProjectPassphrase(projectIdOrKey: string): Promise<string> {
  if (!projectIdOrKey) return 'envshare-default-vault';
  await migrateLegacyKey(projectIdOrKey);
  try {
    const stored = await idbRun<StoredKeyRecord | undefined>('readonly', (st) =>
      st.get(`key:${projectIdOrKey}`)
    );
    if (stored) {
      const wrapKey = await getWrapKey();
      const pt = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: stored.iv as BufferSource },
        wrapKey,
        stored.ct
      );
      const custom = new TextDecoder().decode(pt).trim();
      if (custom) return custom;
    }
  } catch {
    // Unreadable record: fall back to the default passphrase
  }
  return `envshare-proj-${projectIdOrKey}`;
}

/**
 * Saves a user-generated or custom key for a project, encrypted at rest.
 * Passing an empty key removes the custom key.
 */
export async function setProjectPassphrase(projectId: string, key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) {
    await idbRun('readwrite', (st) => st.delete(`key:${projectId}`));
    return;
  }
  const wrapKey = await getWrapKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ct = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrapKey,
    new TextEncoder().encode(trimmed)
  );
  const record: StoredKeyRecord = { iv, ct };
  await idbRun('readwrite', (st) => st.put(record, `key:${projectId}`));
}

/**
 * Encrypts a sensitive string value using AES-256-GCM.
 * @param plainText The plaintext value to encrypt
 * @param projectIdOrKey The project ID (or custom passphrase)
 */
export async function encryptSensitiveValue(plainText: string, projectIdOrKey: string): Promise<string> {
  if (!plainText) return '';
  const passphrase = await getProjectPassphrase(projectIdOrKey);
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(salt, passphrase);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    enc.encode(plainText)
  );

  const ciphertext = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.length);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(ciphertext, SALT_LENGTH + IV_LENGTH);

  return uint8ArrayToBase64(combined);
}

/**
 * Decrypts an AES-256-GCM payload.
 * @param base64Payload Base64 encoded payload
 * @param projectIdOrKey The project ID (or custom passphrase)
 */
export async function decryptSensitiveValue(base64Payload: string, projectIdOrKey: string): Promise<string> {
  if (!base64Payload) return '';

  let combined: Uint8Array;
  try {
    combined = base64ToUint8Array(base64Payload);
  } catch {
    // Not valid base64 (already plaintext)
    return base64Payload;
  }

  if (combined.length < SALT_LENGTH + IV_LENGTH) {
    return base64Payload;
  }

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const data = combined.slice(SALT_LENGTH + IV_LENGTH);

  // Try configured passphrase, then default per-project key as fallback
  const primaryPass = await getProjectPassphrase(projectIdOrKey);
  const candidates = [primaryPass];
  const fallback = `envshare-proj-${projectIdOrKey}`;
  if (!candidates.includes(fallback)) {
    candidates.push(fallback);
  }

  for (const pass of candidates) {
    try {
      const key = await deriveKey(salt, pass);
      // Try WebCrypto format [salt][iv][ciphertext+tag]
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      // Try Node layout [salt][iv][tag(16)][ciphertext]
      if (data.length > 16) {
        try {
          const tag = data.slice(0, 16);
          const ct = data.slice(16);
          const reordered = new Uint8Array(ct.length + tag.length);
          reordered.set(ct, 0);
          reordered.set(tag, ct.length);

          const key = await deriveKey(salt, pass);
          const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            reordered
          );
          return new TextDecoder().decode(decrypted);
        } catch {
          // continue candidates
        }
      }
    }
  }

  throw new Error('Decryption failed. Invalid payload or incorrect encryption key.');
}
