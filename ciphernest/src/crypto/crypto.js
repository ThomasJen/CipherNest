// Minimal Web Crypto verktøy: PBKDF2 + AES-GCM
const enc = new TextEncoder();
const dec = new TextDecoder();

export async function deriveKeyFromPassword(password, saltBytes, iterations=200000) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
}

export async function encryptJson(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data))
  );
  return {
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
    ct: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  };
}

export async function decryptJson(key, { iv, ct }) {
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const ctBytes = Uint8Array.from(atob(ct), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, ctBytes);
  return JSON.parse(dec.decode(plain));
}
