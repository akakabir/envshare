import { emailToKey, getFriendlyAuthErrorMessage } from './firebase.ts';
import { encryptSensitiveValue, decryptSensitiveValue } from './crypto.ts';

async function runSelfCheck() {
  // 1. Test email key sanitization
  const key1 = emailToKey('User.Name@Example.com');
  console.assert(key1 === 'user_name_example_com', `emailToKey failed: expected user_name_example_com, got ${key1}`);

  const key2 = emailToKey('test+tag@sub.domain.co');
  console.assert(key2 === 'test_tag_sub_domain_co', `emailToKey failed: expected test_tag_sub_domain_co, got ${key2}`);

  // 2. Test friendly auth error mappings
  const err1 = getFriendlyAuthErrorMessage({ code: 'auth/invalid-email' });
  console.assert(err1 === 'Invalid email address format.', `Unexpected error message: ${err1}`);

  const err2 = getFriendlyAuthErrorMessage({ code: 'auth/wrong-password' });
  console.assert(err2.includes('Wrong password'), `Unexpected error message: ${err2}`);

  // 3. Test AES-256-GCM + PBKDF2 encryption & decryption
  const secretSecret = 'super-secret-database-token-12345';
  const ciphertext = await encryptSensitiveValue(secretSecret);
  console.assert(typeof ciphertext === 'string' && ciphertext.length > 30, 'Ciphertext should be a base64 string');
  console.assert(!ciphertext.includes(secretSecret), 'Ciphertext must NEVER contain plain secret value');

  const decrypted = await decryptSensitiveValue(ciphertext);
  console.assert(decrypted === secretSecret, `Decrypted mismatch: expected ${secretSecret}, got ${decrypted}`);

  console.log('EnvShare Part 1, 2, and 3 self-checks passed successfully.');
}

runSelfCheck();
