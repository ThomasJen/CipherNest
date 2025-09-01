// src/components/Settings.js
import MfaSetup from './MfaSetup';

export default function Settings({ cryptoKey }) {
  return (
    <div className="stack">
      <h2>⚙️ Innstillinger</h2>
      <p className="muted" style={{ marginTop: -6 }}>
        Aktiver innloggingskoder for hvelvet ditt.
      </p>

      <MfaSetup cryptoKey={cryptoKey} />
    </div>
  );
}
