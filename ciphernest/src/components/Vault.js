import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { readRawVault, writeRawVault } from '../store/vault';
import { encryptJson, decryptJson } from '../crypto/crypto';

function guessDomainFromService(service) {
  if (!service) return '';
  const s = service.trim().toLowerCase();
  if (s.includes('github')) return 'github.com';
  if (s.includes('google')) return 'accounts.google.com';
  if (s.includes('microsoft')) return 'login.live.com';
  if (s.includes('reddit')) return 'reddit.com';
  return '';
}

export default function Vault({ cryptoKey }) {
  const location = useLocation();

  const [entries, setEntries] = useState([]);
  const [svc, setSvc] = useState('');
  const [domain, setDomain] = useState('');
  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Prefill fra generatoren
  useEffect(() => {
    const prePwd = location.state?.prefillPassword;
    const preSvc = location.state?.prefillService;
    if (prePwd) setPwd(prePwd);
    if (preSvc) {
      setSvc(preSvc);
      const auto = guessDomainFromService(preSvc);
      if (auto) setDomain(auto);
    }
  }, [location.state]);

  // Last entries fra kryptert vault
  useEffect(() => {
    (async () => {
      const raw = readRawVault();
      if (raw?.data && cryptoKey) {
        try {
          const list = await decryptJson(cryptoKey, raw.data);
          setEntries(Array.isArray(list) ? list : []);
          setError('');
        } catch (e) {
          setError('Feil ved dekryptering (feil master-passord?)');
        }
      } else if (!raw?.data) {
        // Tomt hvelv – nullstill liste
        setEntries([]);
      }
    })();
  }, [cryptoKey]);

  const save = async (list) => {
    const raw = readRawVault() || {};
    const data = await encryptJson(cryptoKey, list);
    writeRawVault({ ...raw, data });
  };

  const add = async () => {
    if (!svc.trim() || !user.trim() || !pwd.trim()) return;
    const next = [
      {
        id: crypto.randomUUID(),
        service: svc.trim(),
        domain: domain.trim(),
        username: user.trim(),
        password: pwd,
        note: note.trim(),
      },
      ...entries,
    ];
    setEntries(next);
    await save(next);
    setSvc('');
    setDomain('');
    setUser('');
    setPwd('');
    setNote('');
  };

  const remove = async (id) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    await save(next);
  };

  const copy = async (text) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    // her kan du bytte til en toast senere
  };

  return (
    <div className="stack">
      <h2>🔐 Mitt Hvelv</h2>

      {/* Skjema for å legge til konto */}
      <div className="card stack">
        <h3>➕ Legg til konto</h3>
        <div className="grid-2">
          <input
            type="text"
            placeholder="Tjeneste (eks: GitHub)"
            value={svc}
            onChange={(e) => setSvc(e.target.value)}
          />
          <input
            type="text"
            placeholder="Domene (eks: github.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
        <div className="grid-2">
          <input
            type="text"
            placeholder="Brukernavn"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <div className="row" style={{ gap: 8 }}>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="Passord"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
            <button type="button" onClick={() => setShowPwd((s) => !s)}>
              {showPwd ? 'Skjul' : 'Vis'}
            </button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Notat (valgfritt)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="row">
          <button
            type="button"
            className="btn-primary"
            onClick={add}
            disabled={!svc.trim() || !user.trim() || !pwd.trim()}
          >
            💾 Lagre i Hvelv
          </button>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      {/* Liste over lagrede kontoer */}
      <h3>📂 Lagrede kontoer</h3>
      {entries.length === 0 ? (
        <p className="muted">Ingen kontoer lagret enda.</p>
      ) : (
        <ul className="clean">
          {entries.map((e) => (
            <li key={e.id} className="card stack">
              <div className="row">
                <b>{e.service}</b>
                {e.domain && <span className="badge">{e.domain}</span>}
              </div>
              <div>
                👤 <span className="mono">{e.username}</span>
              </div>
              <div className="row">
                <span className="mono">••••••••</span>
                <button type="button" onClick={() => copy(e.password)}>
                  📋 Kopier
                </button>
                <button type="button" className="btn-danger" onClick={() => remove(e.id)}>
                  🗑 Slett
                </button>
              </div>
              {e.note && <div className="muted">📝 {e.note}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
