// Lagrer en liste med kontoer kryptert i localStorage
// Struktur: { saltB64, data: { iv, ct } }

const KEY = 'vault_v1';

export function readRawVault() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}
export function writeRawVault(obj) {
  localStorage.setItem(KEY, JSON.stringify(obj));
}
export function clearVault() {
  localStorage.removeItem(KEY);
}
