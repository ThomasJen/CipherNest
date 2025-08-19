import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generatePassword, poolSizeFromOptions, entropyBits } from '../generator/passwordGen';

export default function PasswordGenerator() {
  const nav = useNavigate();

  const [opts, setOpts] = useState({
    pwdLength: 16,
    useLower: true,
    useUpper: true,
    useDigits: true,
    useSymbols: true,
    avoidAmbiguous: true,
    requireEachSet: true,
  });

  const [pwd, setPwd] = useState('');

  // Les + rens historikk én gang i initializer (unngår useEffect-løkker)
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('passwordHistory');
      const arr = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(arr)) return [];
      return arr.filter((p) => typeof p === 'string' && p.trim().length > 0).slice(0, 50);
    } catch {
      return [];
    }
  });

  // Persist til localStorage når history endres
  useEffect(() => {
    localStorage.setItem('passwordHistory', JSON.stringify(history));
  }, [history]);

  const make = () => {
    const newPwd = generatePassword(opts);
    if (!newPwd || !newPwd.trim()) return;
    setPwd(newPwd);
    setHistory((prev) => [newPwd, ...prev].slice(0, 50));
  };

  const copy = async () => {
    if (pwd) await navigator.clipboard.writeText(pwd);
  };

  const sendToVault = () => {
    if (!pwd) return;
    nav('/vault', { state: { prefillPassword: pwd, prefillService: 'GitHub' } });
  };

  // Kun avledede verdier – ingen setState her
  const pool = poolSizeFromOptions(opts);
  const entropy = entropyBits({ length: opts.pwdLength, poolSize: pool });

  return (
    <div className="stack">
      <h2>🔑 Passordgenerator</h2>

      <div className="card stack">
        <div className="grid-2">
          <label>
            Lengde
            <input
              type="number"
              min="8"
              max="128"
              value={opts.pwdLength}
              onChange={(e) => setOpts({ ...opts, pwdLength: Number(e.target.value) })}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={opts.useSymbols}
              onChange={(e) => setOpts({ ...opts, useSymbols: e.target.checked })}
            />
            Spesialtegn
          </label>

          <label>
            <input
              type="checkbox"
              checked={opts.useDigits}
              onChange={(e) => setOpts({ ...opts, useDigits: e.target.checked })}
            />
            Tall
          </label>

          <label>
            <input
              type="checkbox"
              checked={opts.useUpper}
              onChange={(e) => setOpts({ ...opts, useUpper: e.target.checked })}
            />
            Store bokstaver
          </label>

          <label>
            <input
              type="checkbox"
              checked={opts.useLower}
              onChange={(e) => setOpts({ ...opts, useLower: e.target.checked })}
            />
            Små bokstaver
          </label>

          <label>
            <input
              type="checkbox"
              checked={opts.avoidAmbiguous}
              onChange={(e) => setOpts({ ...opts, avoidAmbiguous: e.target.checked })}
            />
            Unngå Il1O0
          </label>

          <label>
            <input
              type="checkbox"
              checked={opts.requireEachSet}
              onChange={(e) => setOpts({ ...opts, requireEachSet: e.target.checked })}
            />
            Minst ett per sett
          </label>
        </div>

        <div>Entropi (ca): <b>{Number.isFinite(entropy) ? `${entropy} bits` : '–'}</b></div>

        <div className="row">
          <button className="btn-primary" onClick={make}>🎲 Generer</button>
          <button onClick={copy} disabled={!pwd}>📋 Kopier</button>
          <button onClick={sendToVault} disabled={!pwd}>➡️ Bruk i Hvelv</button>
        </div>

        <div className="mono" style={{ fontSize: 22, letterSpacing: 1 }}>
          {pwd || '—'}
        </div>
      </div>

      <div className="card stack">
        <h3>🕘 Historikk</h3>
        {history.length === 0 ? (
          <p className="muted">Ingen passord generert enda.</p>
        ) : (
          <ul className="clean">
            {history.map((h, idx) => (
              <li key={idx} className="row">
                <span className="mono">{h}</span>
                <button onClick={() => navigator.clipboard.writeText(h)}>📋</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
