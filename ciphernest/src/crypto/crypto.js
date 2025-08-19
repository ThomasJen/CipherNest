// Minimal Web Crypto verktøy: PBKDF2 + AES-GCM
const enc = new TextEncoder();
const dec = new TextDecoder();

async function importKeyFromPassword(password) {
  return crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
}

export async function deriveAesKey(password, saltB64, iterations = 200_000) {
  const baseKey = await importKeyFromPassword(password);
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), c => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
  const saltStr = saltB64 || btoa(String.fromCharCode(...salt));
  return { key, saltB64: saltStr };
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
