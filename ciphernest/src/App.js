// src/App.js
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import UsernameForm from './components/UsernameForm';
import PasswordGenerator from './components/PasswordGenerator';
import Vault from './components/Vault';
import LoginPage from './components/LoginPage';
import ThemeToggle from './components/ThemeToggle';
import './index.css';


export default function App() {
  const [cryptoKey, setCryptoKey] = useState(null);
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (cryptoKey) {
      timerRef.current = setTimeout(() => setCryptoKey(null), 5 * 60 * 1000);
    }
  }, [cryptoKey]);
  
  useEffect(() => { resetTimer(); }, [resetTimer]);
  useEffect(() => {
    const events = ['click','keydown','mousemove','scroll','visibilitychange'];
    const handler = () => resetTimer();
    events.forEach(e => window.addEventListener(e, handler));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [resetTimer]);

  return (
    <div className="container">
      <nav className="nav">
        <Link to="/generator">Brukernavn</Link>
        <Link to="/passgen">Passord</Link>
        <Link to="/vault">Hvelv</Link>
        <div className="spacer" />
        <ThemeToggle />
        <Link to="/login" className="badge">{cryptoKey ? 'Låst opp' : 'Logg inn'}</Link>
      </nav>

      <div className="card stack">
        <Routes>
          <Route path="/" element={<Navigate to="/generator" />} />
          <Route path="/generator" element={<UsernameForm />} />
          <Route path="/passgen" element={<PasswordGenerator />} />
          <Route path="/login" element={<LoginPage onUnlocked={({key})=>setCryptoKey(key)} />} />
          <Route path="/vault" element={cryptoKey ? <Vault cryptoKey={cryptoKey} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  );
}


