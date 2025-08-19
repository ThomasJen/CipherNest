import { useState } from 'react';
import { deriveAesKey } from '../crypto/crypto';
import { readRawVault, writeRawVault } from '../store/vault';
import { useNavigate } from 'react-router-dom';

export default function LoginPage({ onUnlocked }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();

  const login = async () => {
    try {
      const raw = readRawVault();
      // Finn/lag salt
      const salt = raw?.saltB64 || null;
      const { key, saltB64 } = await deriveAesKey(pw, salt);
      // Førstegang: lag tomt hvelv
      if (!raw) writeRawVault({ saltB64, data: null });
      onUnlocked({ key }); // gi nøkkelen oppover (App-state)
      nav('/vault');
    } catch (e) {
      setError('Kunne ikke låse opp');
    }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Lås opp hvelv</h2>
      <input type="password" placeholder="Master-passord" value={pw} onChange={e=>setPw(e.target.value)} />
      <button onClick={login} disabled={!pw}>Lås opp</button>
      {error && <p style={{color:'red'}}>{error}</p>}
      <p style={{fontSize:12,opacity:.8}}>Data lagres kun lokalt i din nettleser og krypteres med AES‑GCM.</p>
    </div>
  );
}
