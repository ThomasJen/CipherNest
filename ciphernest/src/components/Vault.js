import { useEffect, useMemo, useState } from 'react';
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

// Enkel passordstyrke (0-4)
function passwordStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 16) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

export default function Vault({ cryptoKey }) {
  const location = useLocation();

  const [entries, setEntries] = useState([]);
  const [svc, setSvc] = useState('');
  const [domain, setDomain] = useState('');
  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

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
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        createdAt: Date.now(),
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
    setTags('');
  };

  const remove = async (id) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    await save(next);
  };

  const copy = async (text) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  const copySequence = async (u, p) => {
    // Kopier brukernavn -> liten pause -> passord
    if (!u || !p) return;
    await navigator.clipboard.writeText(u);
    await new Promise((r) => setTimeout(r, 300));
    await navigator.clipboard.writeText(p);
  };

  const openSite = (d) => {
    if (!d) return;
    const url = d.startsWith('http') ? d : `https://${d}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Søk/filtrering
  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const hay = [
        e.service,
        e.domain,
        e.username,
        e.note,
        ...(Array.isArray(e.tags) ? e.tags : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query]);

  // Redigering
  const beginEdit = (e) => {
    setEditingId(e.id);
    setEditDraft({
      service: e.service,
      domain: e.domain || '',
      username: e.username,
      password: e.password,
      note: e.note || '',
      tags: (e.tags || []).join(', '),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (id) => {
    const updated = entries.map((e) =>
      e.id === id
        ? {
            ...e,
            ...editDraft,
            service: editDraft.service.trim(),
            domain: editDraft.domain.trim(),
            username: editDraft.username.trim(),
            password: editDraft.password,
            note: editDraft.note.trim(),
            tags: editDraft.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          }
        : e
    );
    setEntries(updated);
    await save(updated);
    cancelEdit();
  };

  const strength = passwordStrength(pwd);

  return (
    <div className="stack">
      <h2>🔐 Mitt Hvelv</h2>

      {/* Søk og hurtigoversikt */}
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <input
            type="text"
            placeholder="Søk (tjeneste, domene, brukernavn, tag …)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="badge">{filtered.length} treff</span>
        </div>
      </div>

      {/* Legg til konto */}
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
          placeholder="Tags (kommaseparert: jobb, privat …)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <input
          type="text"
          placeholder="Notat (valgfritt)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {/* Styrkeindikator */}
        <div className="row" style={{ alignItems: 'center' }}>
          <div style={{ width: 120, height: 8, background: '#0c0f13', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div
              style={{
                width: `${(strength / 4) * 100}%`,
                height: '100%',
                background:
                  strength >= 3 ? 'linear-gradient(90deg,#16a34a,#22c55e)' :
                  strength === 2 ? 'linear-gradient(90deg,#eab308,#f59e0b)' :
                  'linear-gradient(90deg,#ef4444,#f87171)',
              }}
            />
          </div>
          <span style={{ marginLeft: 8, color: 'var(--muted)' }}>
            {['svakt','ok','middels','sterkt','meget sterkt'][strength]}
          </span>
        </div>

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

      {/* Liste over kontoer */}
      <h3>📂 Lagrede kontoer</h3>
      {filtered.length === 0 ? (
        <p className="muted">Ingen kontoer funnet.</p>
      ) : (
        <ul className="clean">
          {filtered.map((e) => (
            <li key={e.id} className="card stack">
              {editingId === e.id ? (
                <>
                  <div className="grid-2">
                    <input
                      value={editDraft.service}
                      onChange={(ev) =>
                        setEditDraft((d) => ({ ...d, service: ev.target.value }))
                      }
                      placeholder="Tjeneste"
                    />
                    <input
                      value={editDraft.domain}
                      onChange={(ev) =>
                        setEditDraft((d) => ({ ...d, domain: ev.target.value }))
                      }
                      placeholder="Domene"
                    />
                  </div>
                  <div className="grid-2">
                    <input
                      value={editDraft.username}
                      onChange={(ev) =>
                        setEditDraft((d) => ({ ...d, username: ev.target.value }))
                      }
                      placeholder="Brukernavn"
                    />
                    <input
                      value={editDraft.password}
                      onChange={(ev) =>
                        setEditDraft((d) => ({ ...d, password: ev.target.value }))
                      }
                      placeholder="Passord"
                      type="text"
                    />
                  </div>
                  <input
                    value={editDraft.tags}
                    onChange={(ev) =>
                      setEditDraft((d) => ({ ...d, tags: ev.target.value }))
                    }
                    placeholder="Tags (kommaseparert)"
                  />
                  <input
                    value={editDraft.note}
                    onChange={(ev) =>
                      setEditDraft((d) => ({ ...d, note: ev.target.value }))
                    }
                    placeholder="Notat"
                  />
                  <div className="row">
                    <button type="button" className="btn-primary" onClick={() => saveEdit(e.id)}>
                      ✅ Lagre
                    </button>
                    <button type="button" onClick={cancelEdit}>
                      ✖ Avbryt
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="row">
                    <b>{e.service}</b>
                    {e.domain && <span className="badge">{e.domain}</span>}
                    {Array.isArray(e.tags) && e.tags.length > 0 && (
                      <span className="badge">{e.tags.join(' · ')}</span>
                    )}
                  </div>
                  <div>👤 <span className="mono">{e.username}</span></div>
                  {e.note && <div className="muted">📝 {e.note}</div>}
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <button type="button" onClick={() => copy(e.username)}>📋 Kopier bruker</button>
                    <button type="button" onClick={() => copy(e.password)}>📋 Kopier pass</button>
                    <button type="button" onClick={() => copySequence(e.username, e.password)}>📋 Kopier begge</button>
                    {e.domain && <button type="button" onClick={() => openSite(e.domain)}>🌐 Åpne side</button>}
                    <button type="button" onClick={() => beginEdit(e)}>✏️ Rediger</button>
                    <button type="button" className="btn-danger" onClick={() => remove(e.id)}>🗑 Slett</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

