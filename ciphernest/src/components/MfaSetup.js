import { useEffect, useState } from 'react';
import { readRawVault, writeRawVault } from '../store/vault';
import { decryptJson, encryptJson } from '../crypto/crypto';

/** Liten util: SHA-256 → hex */
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Lesbart kodeformat: 4-4-4 (12 tegn) fra a-z2-7 uten like-lett-å-forveksle bokstaver */
function generateReadableCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // uten I, L, O, 0, 1
  const pick = (n) => {
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    return [...bytes].map(b => alphabet[b % alphabet.length]).join('');
  };
  const a = pick(4), b = pick(4), c = pick(4);
  return `${a}-${b}-${c}`;
}

/** Generer N koder og returner {plain[], hashes[] } */
async function generateCodes(n = 10) {
  const plain = Array.from({ length: n }, () => generateReadableCode());
  const hashes = await Promise.all(plain.map(sha256Hex));
  return { plain, hashes };
}

export default function MfaSetup({ cryptoKey }) {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail]   = useState('');
  const [codesPlain, setCodesPlain] = useState([]); // vises KUN ved generering/rotasjon
  const [msg, setMsg] = useState('');
  const [remainingCount, setRemainingCount] = useState(null);


  useEffect(() => {
    (async () => {
      const raw = await readRawVault();
      if (!raw?.data || !cryptoKey) return;
      setEmail(raw.email || '');
      try {
        const payload = await decryptJson(cryptoKey, raw.data);
        if (raw.mfa?.type === 'recovery' && Array.isArray(payload?.mfa?.recoveryHashes)) {
          setEnabled(true);
          setRemainingCount(payload.mfa.recoveryHashes.length);
        }
      } catch {/* ignorér hvis ikke låst opp */}
    })();
  }, [cryptoKey]);

  /** Lagre recovery-oppsett (kun hasher i kryptert payload; header = metadata) */
  const persistSetup = async (hashes) => {
    const raw = await readRawVault();
    const payload = await decryptJson(cryptoKey, raw.data);
    const nextPayload = {
      ...payload,
      mfa: {
        type: 'recovery',
        // lagre bare hasher i payload for verifisering
        recoveryHashes: hashes,
      },
    };
    const data = await encryptJson(cryptoKey, nextPayload);
    await writeRawVault({
      ...raw,
      // i header holder vi kun type for at login vet at MFA kreves
      mfa: { type: 'recovery' },
      data,
    });
  };

  /** Start aktivering: generer koder (vis plain i UI), lagre hasher */
  const enable = async () => {
    setMsg('');
    const { plain, hashes } = await generateCodes(10);
    await persistSetup(hashes);
    setCodesPlain(plain); // viktig: vises nå – må lagres av bruker
    setEnabled(true);
    setRemainingCount(plain.length);
    setMsg('Recovery-koder generert. Lagre dem et trygt sted.');
  };

  /** Roter koder (invalider gamle og lag nye) */
  const rotate = async () => {
    setMsg('');
    const { plain, hashes } = await generateCodes(10);
    await persistSetup(hashes);
    setCodesPlain(plain);
    setMsg('Nye recovery-koder generert. De gamle er deaktivert.');
  };

  /** Deaktiver recovery-MFA */
  const disable = async () => {
    setMsg('');
    const raw = await readRawVault();
    const payload = await decryptJson(cryptoKey, raw.data);
    const nextPayload = { ...payload, mfa: null };
    const data = await encryptJson(cryptoKey, nextPayload);
    await writeRawVault({ ...raw, mfa: null, data });
    setEnabled(false);
    setCodesPlain([]);
    setRemainingCount(null);
    setMsg('2FA via recovery-koder er deaktivert.');
  };

  /** Last ned kodene som .txt */
  const downloadTxt = () => {
    if (!codesPlain.length) return;
    const blob = new Blob([
      `CipherNest Recovery Codes for ${email}\n\n` +
      codesPlain.map(c => `• ${c}`).join('\n') +
      '\n\nOppbevar sikkert. Hver kode kan brukes én gang.'
    ], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ciphernest-recovery-codes.txt';
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="card stack" style={{ maxWidth: 640 }}>
      <h3>🛡️ To-faktor (Recovery-koder)</h3>

      {enabled ? (
        <>
          <p>
            Recovery-koder er <b>aktivert</b> for <b>{email || 'konto'}</b>. Hver kode kan brukes <b>én</b> gang ved innlogging.
          </p>

      {remainingCount !== null && (
          <p className="muted">
              Du har <b>{remainingCount}</b> recovery-koder igjen.
          </p>
      )}

          <div className="row">
            <button className="btn-primary" type="button" onClick={rotate}>🔁 Generer nye koder</button>
            
            <button className="btn-danger"  type="button" onClick={disable}>🗑 Deaktiver 2FA</button>
          </div>

          {!!codesPlain.length && (
            <div className="card stack" style={{ background: 'var(--bg-elev-2)' }}>
              <h4>🧾 Dine nye koder (lagres ikke i klartekst – kopier nå):</h4>
              <ul className="clean" style={{ columns: 2, columnGap: 24, margin: 0 }}>
                {codesPlain.map(c => (
                  <li key={c} className="mono" style={{ breakInside: 'avoid' }}>{c}</li>
                ))}
              </ul>
              <div className="row">
                <button type="button" onClick={() => navigator.clipboard.writeText(codesPlain.join('\n'))}>📋 Kopier alle</button>
                <button type="button" onClick={downloadTxt}>⬇️ Last ned .txt</button>
              </div>
              <p className="muted" style={{ marginTop: 8 }}>
                Tips: Skriv dem ut eller legg dem i et sikkert notat. Du kan rotere for å oppheve disse.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <p>Aktiver recovery-koder som ekstra steg ved innlogging. Du får 10 unike koder du kan bruke én gang hver.</p>
          <button className="btn-primary" type="button" onClick={enable}>➕ Aktiver og generer koder</button>
        </>
      )}

      {msg && <div className="muted">{msg}</div>}
    </div>
  );
}
