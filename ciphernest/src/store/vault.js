// Lagrer en liste med kontoer kryptert i localStorage
// Struktur: { saltB64, data: { iv, ct } }

import { openDB } from 'idb';

const DB = 'ciphernest';
const STORE= 'kv';
const KEY = 'vault_v1';

async function db() {
  return openDB(DB, 1, {
    upgrade(d) {
      d.createObjectStore(STORE);
    },
  });
}

export async function readRawVault() {
  const d = await db();
  return await d.get(STORE, KEY);
}
export async function writeRawVault(obj) {
  const d = await db();
  await d.put(STORE, obj, KEY);
}
export async function clearVault() {
  const d = await db();
  await d.delete(STORE, KEY);
}

if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}
