// src/store/vaultSchema.js
export const VAULT_VERSION = 1;
export const DEFAULT_KDF = { alg: 'PBKDF2-SHA256', iterations: 200000 };

// Sikrer at rå-objektet har forventede header-felt uten å ødelegge noe.
// Kan også brukes som "migrering" når du senere øker VERSION.
export function normalizeRaw(raw) {
  if (!raw) return null;
  const out = { ...raw };
  if (!out.version) out.version = VAULT_VERSION;
  if (!out.kdf) out.kdf = { ...DEFAULT_KDF };
  if (!('mfa' in out)) out.mfa = null; // bare metadata (type/issuer)
  // email & saltB64 lar vi være som de er (hvis de finnes)
  return out;
}
