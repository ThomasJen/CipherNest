// src/App.js
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import UsernameForm from './components/UsernameForm';
import PasswordGenerator from './components/PasswordGenerator';
import Vault from './components/Vault';
import LoginPage from './components/LoginPage';
import ThemeToggle from './components/ThemeToggle';
import InstallPrompt from './components/InstallPrompt';
import Settings from './components/Settings';
import './index.css';

  const TIMEOUT_MIN = 5;

export default function App() {
  const [cryptoKey, setCryptoKey] = useState(null);
  const timerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const lastActiveRef = useRef(Date.now());
  const navigate = useNavigate();

  const handleUnlocked = ({ key, }) => {
    setCryptoKey(key);
    resetTimer();
  }

  const logout = useCallback(() => {
    setCryptoKey(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (cryptoKey) {
      timerRef.current = setTimeout(() => {
        setCryptoKey(null)
      }, 5 * 60 * 1000);
    }
  }, [cryptoKey]);

  const hardLogout = useCallback(() => {
    // Tøm nøkkel og alt sensitivt
    setCryptoKey(null);
    // eventuelt: tøm evt. unlocked state/varsler her
    navigate('/login', { replace: true });
  }, [navigate]);

  const resetIdleTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      // Sjekk at vi fremdeles er innlogget før vi låser
      if (cryptoKey) hardLogout();
    }, TIMEOUT_MIN * 20 * 1000);
  }, [cryptoKey, hardLogout]);
  
  useEffect(() => { resetTimer(); }, [resetTimer]);
 
  useEffect(() => {
    const events = ['click','keydown','mousemove','scroll','visibilitychange'];
    const handler = () => resetTimer();
    events.forEach(e => window.addEventListener(e, handler));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [resetTimer]);

  useEffect(() => {
  // Start/refresh timer når vi blir innlogget
  if (cryptoKey) resetIdleTimer();
  return () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  };
}, [cryptoKey, resetIdleTimer]);

useEffect(() => {
  if (!cryptoKey) return;

  const onUserAction = () => resetIdleTimer();
  const onVisibility = () => {
    // Hvis fanen har vært skjult lenge nok til å passere fristen, lås
    if (document.visibilityState === 'visible') {
      const elapsed = Date.now() - lastActiveRef.current;
      if (elapsed >= TIMEOUT_MIN * 60 * 1000) hardLogout();
      else resetIdleTimer();
    }
  };

  window.addEventListener('mousemove', onUserAction);
  window.addEventListener('mousedown', onUserAction);
  window.addEventListener('keydown', onUserAction);
  window.addEventListener('scroll', onUserAction, { passive: true });
  window.addEventListener('touchstart', onUserAction, { passive: true });
  window.addEventListener('focus', onUserAction);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('mousemove', onUserAction);
    window.removeEventListener('mousedown', onUserAction);
    window.removeEventListener('keydown', onUserAction);
    window.removeEventListener('scroll', onUserAction);
    window.removeEventListener('touchstart', onUserAction);
    window.removeEventListener('focus', onUserAction);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}, [cryptoKey, resetIdleTimer, hardLogout]);


    return (
    <>
      <nav className="nav">
        <Link to="/generator">Brukernavn</Link>
        <Link to="/passgen">Passord</Link>
        <Link to="/vault">Hvelv</Link>
        {cryptoKey && <Link to="/settings">Innstillinger</Link>}
        <div className="spacer" />
        <InstallPrompt />
        <ThemeToggle />
        {cryptoKey ? (
          <button onClick={logout} className="badge" title="Lås">
            🔒 Lås
          </button>
        ) : (
          <Link to="/login" className="badge">Logg inn</Link>
        )}
      </nav>

      <div className="container">
        <Routes>
          {/* Login er alltid tilgjengelig */}
          <Route path="/login" element={<LoginPage onUnlocked={handleUnlocked} />} />

          {/* Guard: krever unlock */}
          <Route
            path="/vault"
            element={
              cryptoKey ? (
                <Vault cryptoKey={cryptoKey} /* payload={unlockedPayload} (valgfritt) */ />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/generator"
            element={
              cryptoKey ? <UsernameForm /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/passgen"
            element={
              cryptoKey ? <PasswordGenerator /> : <Navigate to="/login" replace />
            }
          />

          <Route 
          path="/settings" 
          element={cryptoKey ? <Settings cryptoKey={cryptoKey} /> : <Navigate to="/login" replace />
          } />

          {/* Default */}
          <Route path="*" element={<Navigate to={cryptoKey ? "/vault" : "/login"} replace />} />
        </Routes>
      </div>
    </>
  );
}




