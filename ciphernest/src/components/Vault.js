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

  // Data
  const [entries, setEntries] = useState([]);

  // Legg-til/Rediger felter (deles mellom add og edit)
  const [svc, setSvc] = useState('');
  const [domain, setDomain] = useState('');
  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [note, setNote] = useState('');

  // Redigeringsmodus
  const [editingId, setEditingId] = useState(null);

  // UI/state
  const [error, setError] = useState('');
  const [q, setQ] = useState(''); // søkespørring

  // Prefill fra generator (navigert med state)
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

  // Last vault-entries
  useEffect(() => {
    (async () => {
      const raw = readRawVault();
      if (raw?.data && cryptoKey) {
        try {
          const payload = await decryptJson(cryptoKey, raw.data);
          const list = Array.isArray(payload?.entries) ? payload.entries : [];
          setEntries(list);
        } catch (e) {
          setError('Feil ved dekryptering (feil master-passord?)');
        }
      }
    })();
  }, [cryptoKey]);

  // Hjelper for å lagre tilbake til vault
  const persist = async (newEntries) => {
    const raw = readRawVault() || {};
    const payload = { ...(await safeDecryptPayload(raw)), entries: newEntries };
    const data = await encryptJson(cryptoKey, payload);
    await writeRawVault({ ...raw, data });
  };

  const safeDecryptPayload = async (raw) => {
    try {
      if (raw?.data && cryptoKey) {
        const payload = await decryptJson(cryptoKey, raw.data);
        return typeof payload === 'object' && payload ? payload : {};
      }
    } catch {
      // ignorér – lager nytt payload under
    }
    return {};
  };

  // Legg til ny entry
  const add = async (ev) => {
    ev?.preventDefault?.();
    setError('');
    if (!svc.trim() || !user.trim() || !pwd) {
      setError('Fyll ut minst Tjeneste, Brukernavn og Passord.');
      return;
    }

    const now = Date.now();
    const next = [
      ...entries,
      {
        id: crypto.randomUUID(),
        service: svc.trim(),
        domain: domain.trim(),
        username: user.trim(),
        password: pwd,
        note: note.trim(),
        createdAt: now,
        updatedAt: now,
        tags: [],
      },
    ];
    setEntries(next);
    await persist(next);
    // nullstill felter
    setSvc(''); setDomain(''); setUser(''); setPwd(''); setNote('');
  };

  // Slett entry
  const remove = async (id) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    await persist(next);
  };

  // Begynn redigering
  const beginEdit = (e) => {
    setEditingId(e.id);
    setSvc(e.service || '');
    setDomain(e.domain || '');
    setUser(e.username || '');
    setPwd(e.password || '');
    setNote(e.note || '');
  };

  // Lagre redigering
  const saveEdit = async () => {
    if (!editingId) return;
    const idx = entries.findIndex((x) => x.id === editingId);
    if (idx === -1) return;

    const updated = {
      ...entries[idx],
      service: svc.trim(),
      domain: domain.trim(),
      username: user.trim(),
      password: pwd,
      note: note.trim(),
      updatedAt: Date.now(),
    };

    const next = [...entries];
    next[idx] = updated;
    setEntries(next);
    await persist(next);

    // avslutt redigering og nullstill felter
    setEditingId(null);
    setSvc(''); setDomain(''); setUser(''); setPwd(''); setNote('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSvc(''); setDomain(''); setUser(''); setPwd(''); setNote('');
  };

  // Kopier-helpers
  const copy = async (text) => {
    if (text) await navigator.clipboard.writeText(text);
  };
  const copySequence = async (username, password) => {
    if (!username && !password) return;
    const txt = [username, password].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(txt);
  };

  // Åpne nettside
  const openSite = (dom) => {
    if (!dom) return;
    const url = dom.startsWith('http') ? dom : `https://${dom}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Filtrering (søk)
  const normalizedQ = q.trim().toLowerCase();
  const filtered = normalizedQ
    ? entries.filter((e) => {
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
        return hay.includes(normalizedQ);
      })
    : entries;

  return (
    <div className="container stack">
      <div className="card stack" style={{ maxWidth: 900 }}>
        <h2 className="card-title">🔐 Mitt Hvelv</h2>

        {/* Søk */}
        <div className="grid-2">
          <label>
            
            <input
              type="text"
              placeholder="Søk i tjeneste, domene, brukernavn, notat…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <div />
        </div>

        {/* Legg til / Rediger */}
        <form
          className="card stack"
          style={{ background: 'var(--bg-elev-2)' }}
          onSubmit={(e) => {
            e.preventDefault();
            editingId ? saveEdit() : add();
          }}
        >
          <div className="card-title">
            <span className="kicker">{editingId ? 'Rediger konto' : 'Legg til konto'}</span>
          </div>

          <div className="grid-2">
            <label>
              Tjeneste
              <input
                type="text"
                placeholder="Eks: GitHub"
                value={svc}
                onChange={(e) => {
                  setSvc(e.target.value);
                  if (!domain && e.target.value) {
                    const auto = guessDomainFromService(e.target.value);
                    if (auto) setDomain(auto);
                  }
                }}
              />
            </label>
            <label>
              Domene
              <input
                type="text"
                placeholder="Eks: github.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </label>
          </div>

          <div className="grid-2">
            <label>
              Brukernavn
              <input
                type="text"
                placeholder="Din innloggings-ID"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
            </label>
            <label>
              Passord
              <input
                type="text"
                placeholder="••••••••"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
              />
            </label>
          </div>

          <label>
            Notat (valgfritt)
            <textarea
              rows={3}
              placeholder="Ekstra info, backup-koder, e.l."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {error && <div style={{ color: 'salmon' }}>{error}</div>}

          <div className="row" style={{ gap: 8 }}>
            <button className="btn-primary" type="submit">
              {editingId ? '💾 Lagre endringer' : '➕ Legg til'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit}>
                Avbryt
              </button>
            )}
          </div>
        </form>

        {/* Liste over kontoer */}
        <h3>📂 Lagrede kontoer</h3>
        {filtered.length === 0 ? (
          <p className="muted">Ingen kontoer {q ? 'matcher søket.' : 'lagret enda.'}</p>
        ) : (
          <ul className="list">
            {filtered.map((e) => (
              <li key={e.id} className="item">
                {editingId === e.id ? (
                  // Sikkerhet: vi viser ikke inline-redigering for den som allerede er i toppskjema.
                  // Bruk toppskjemaet (over) i stedet. Her viser vi bare en info.
                  <div className="muted">
                    Redigerer denne i skjemaet over. Fullfør eller avbryt der.
                  </div>
                ) : (
                  <>
                    <div className="row-between">
                      <div className="row" style={{ gap: 10 }}>
                        <b className="truncate">{e.service || 'Uten navn'}</b>
                        {e.domain && <span className="badge">{e.domain}</span>}
                        {Array.isArray(e.tags) && e.tags.length > 0 && (
                          <span className="badge">{e.tags.join(' · ')}</span>
                        )}
                      </div>
                      <div className="meta">
                        {e.createdAt && (
                          <span className="tag">
                            Opprettet {new Date(e.createdAt).toLocaleDateString()}
                          </span>
                        )}
                        {e.updatedAt && e.updatedAt !== e.createdAt && (
                          <span className="tag">
                            Endret {new Date(e.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="row" style={{ gap: 10 }}>
                      <span>👤</span>
                      <span className="mono truncate" title={e.username}>
                        {e.username || '—'}
                      </span>
                    </div>

                    {e.note && <div className="muted">📝 {e.note}</div>}

                    <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => copy(e.username)}
                          title="Kopier brukernavn"
                        >
                          📋 Bruker
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => copy(e.password)}
                          title="Kopier passord"
                        >
                          📋 Pass
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => copySequence(e.username, e.password)}
                          title="Kopier brukernavn + passord"
                        >
                          📋 Begge
                        </button>
                        {e.domain && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => openSite(e.domain)}
                            title="Åpne nettsted"
                          >
                            🌐 Åpne
                          </button>
                        )}
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <button type="button" className="btn-ghost" onClick={() => beginEdit(e)}>
                          ✏️ Rediger
                        </button>
                        <button type="button" className="btn-danger" onClick={() => remove(e.id)}>
                          🗑 Slett
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}