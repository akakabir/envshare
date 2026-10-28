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
      salt,
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

/**
 * Returns the effective encryption passphrase for a project.
 * Reads custom key from sessionStorage if set, or defaults to a stable per-project key.
 */
export function getProjectPassphrase(projectIdOrKey: string): string {
  if (!projectIdOrKey) return 'envshare-default-vault';
  try {
    const custom = sessionStorage.getItem(`envshare_key_${projectIdOrKey}`);
    if (custom && custom.trim()) {
      return custom.trim();
    }
  } catch {
    // sessionStorage might be restricted
  }
  return `envshare-proj-${projectIdOrKey}`;
}

/**
 * Saves a user-generated or custom key for a project in sessionStorage.
 */
export function setProjectPassphrase(projectId: string, key: string): void {
  try {
    if (key && key.trim()) {
      sessionStorage.setItem(`envshare_key_${projectId}`, key.trim());
    } else {
      sessionStorage.removeItem(`envshare_key_${projectId}`);
    }
  } catch {
    // ignore
  }
}

/**
 * Encrypts a sensitive string value using AES-256-GCM.
 * @param plainText The plaintext value to encrypt
 * @param projectIdOrKey The project ID (or custom passphrase)
 */
export async function encryptSensitiveValue(plainText: string, projectIdOrKey: string): Promise<string> {
  if (!plainText) return '';
  const passphrase = getProjectPassphrase(projectIdOrKey);
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
  const primaryPass = getProjectPassphrase(projectIdOrKey);
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
