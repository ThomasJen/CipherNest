import { useEffect, useState } from 'react';
import { readRawVault, writeRawVault } from '../store/vault';
import { deriveKeyFromPassword, encryptJson, decryptJson } from '../crypto/crypto';

const DEFAULT_ITER = 200000;

/** Små utiler */
function normalizeRaw(raw) {
  if (!raw) return null;
  const out = { ...raw };
  if (!out.version) out.version = 1;
  if (!out.kdf) out.kdf = { alg: 'PBKDF2-SHA256', iterations: DEFAULT_ITER };
  if (!('mfa' in out)) out.mfa = null;
  return out;
}

/** SHA-256 → hex (for å lagre/compare recovery-koder som hasher) */
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function LoginPage({ onUnlocked }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Recovery-kode (engangskode) + flagg for om feltet skal vises
  const [recovery, setRecovery] = useState('');
  const [needsRecovery, setNeedsRecovery] = useState(false);

  const [firstTime, setFirstTime] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const raw0 = await readRawVault();
      const raw = normalizeRaw(raw0);
      if (raw && JSON.stringify(raw) !== JSON.stringify(raw0)) {
        await writeRawVault(raw);
      }
      setFirstTime(!raw);
      if (raw?.email) setEmail(raw.email);
      if (raw?.mfa?.type === 'recovery') setNeedsRecovery(true);
    })();
  }, []);

  const unlock = async () => {
    setError('');

    // Valider input
    if (!email.trim() || !pass) {
      setError('Fyll ut e-post og master-passord.');
      return;
    }

    let raw = normalizeRaw(await readRawVault());

    // Første gang: opprett tomt hvelv
    if (!raw) {
      try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const aesKey = await deriveKeyFromPassword(pass, salt, DEFAULT_ITER);
        const payload = { entries: [], mfa: null };
        const data = await encryptJson(aesKey, payload);
        raw = {
          version: 1,
          email: email.trim(),
          saltB64: btoa(String.fromCharCode(...salt)),
          kdf: { alg: 'PBKDF2-SHA256', iterations: DEFAULT_ITER },
          mfa: null,
          data,
        };
        await writeRawVault(raw);
        onUnlocked?.({ key: aesKey });
        return;
      } catch {
        setError('Klarte ikke å opprette hvelv. Prøv igjen.');
        return;
      }
    }

    // Eksisterende hvelv: avled nøkkel, dekrypter, ev. krev recovery-kode
    try {
      const salt = Uint8Array.from(atob(raw.saltB64), c => c.charCodeAt(0));
      const iters = raw.kdf?.iterations || DEFAULT_ITER;
      const aesKey = await deriveKeyFromPassword(pass, salt, iters);

      const payload = await decryptJson(aesKey, raw.data); // { entries, mfa? }

      // Hvis recovery-MFA er aktivert: krev gyldig kode og "bruk den opp"
      if (raw.mfa?.type === 'recovery' && Array.isArray(payload?.mfa?.recoveryHashes)) {
        if (!recovery.trim()) {
          setNeedsRecovery(true);
          setError('Skriv inn en recovery-kode.');
          return;
        }
        const hash = await sha256Hex(recovery.trim().toUpperCase());
        const idx = payload.mfa.recoveryHashes.indexOf(hash);
        if (idx === -1) {
          setNeedsRecovery(true);
          setError('Ugyldig eller allerede brukt recovery-kode.');
          return;
        }
        // Fjern brukt kode og lagre tilbake
        const nextHashes = [...payload.mfa.recoveryHashes];
        nextHashes.splice(idx, 1);
        const nextPayload = { ...payload, mfa: { ...payload.mfa, recoveryHashes: nextHashes } };
        const data = await encryptJson(aesKey, nextPayload);
        await writeRawVault({ ...raw, data });
      }

      // Oppdater e-post i header hvis endret
      if (raw.email !== email.trim()) {
        await writeRawVault({ ...raw, email: email.trim() });
      }

      onUnlocked?.({ key: aesKey });
    } catch {
      setError('Feil passord (eller korrupt hvelv).');
    }
  };

  return (
    <div className="center-page">
      <div className="card stack" style={{ maxWidth: 460, width: '100%' }}>
        <h2>{firstTime ? '🔐 Opprett hvelv' : '🔐 Logg inn'}</h2>

        <label>
          E-post
          <input
            type="email"
            placeholder="din@epost.no"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label>
          Master-passord
          <div className="row" style={{ gap: 8 }}>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder={firstTime ? 'Velg et sterkt passord' : 'Skriv inn passord'}
              value={pass}
              onChange={e=>setPass(e.target.value)}
              autoComplete={firstTime ? 'new-password' : 'current-password'}
            />
            <button type="button" onClick={() => setShowPwd(s => !s)}>
              {showPwd ? 'Skjul' : 'Vis'}
            </button>
          </div>
        </label>

        {needsRecovery && (
          <label>
            Recovery-kode
            <input
              type="text"
              placeholder="f.eks. ABCD-EFGH-JKLM"
              value={recovery}
              onChange={(e)=>setRecovery(e.target.value)}
              autoComplete="one-time-code"
              style={{ textTransform: 'uppercase' }}
            />
          </label>
        )}

        {error && <div style={{ color:'salmon' }}>{error}</div>}

        <div className="row">
          <button className="btn-primary" type="button" onClick={unlock}>
            {firstTime ? 'Opprett og lås opp' : 'Lås opp'}
          </button>
        </div>

        <div className="muted" style={{ fontSize: 13 }}>
          {firstTime
            ? 'Husk passordet – ingen recovery uten backend.'
            : (needsRecovery
                ? 'Recovery-koder: hver kan brukes én gang.'
                : 'PBKDF2 + AES-GCM – alt lokalt.')}
        </div>
      </div>
    </div>
  );
}


