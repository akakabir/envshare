const ITERATIONS = 310000;
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
 * Eliminates bundle-injected master secrets in favor of per-project zero-knowledge keys.
 */
async function deriveKey(salt: Uint8Array, passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secretKeyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase) as unknown as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
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
 * Encrypts a sensitive string value using AES-256-GCM with a random salt & IV.
 * @param plainText The plaintext value to encrypt
 * @param passphrase The project-specific encryption passphrase
 */
export async function encryptSensitiveValue(plainText: string, passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(salt, passphrase);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    enc.encode(plainText) as unknown as BufferSource
  );

  const ciphertext = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.length);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(ciphertext, SALT_LENGTH + IV_LENGTH);

  return uint8ArrayToBase64(combined);
}

/**
 * Decrypts an AES-256-GCM payload using the given passphrase.
 * @param base64Payload Salt + IV + Ciphertext in Base64
 * @param passphrase The project-specific encryption passphrase
 */
export async function decryptSensitiveValue(base64Payload: string, passphrase: string): Promise<string> {
  try {
    const combined = base64ToUint8Array(base64Payload);
    if (combined.length < SALT_LENGTH + IV_LENGTH) {
      throw new Error('Encrypted payload is too short');
    }

    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(salt, passphrase);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      key,
      ciphertext as unknown as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption error:', err);
    throw new Error('Decryption failed. Invalid payload or incorrect passphrase.');
  }
}
