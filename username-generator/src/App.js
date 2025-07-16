import './App.css';

import { Routes, Route, Link } from 'react-router-dom';
import UsernameForm from './components/UsernameForm';
import AboutPage from './components/AboutPage';

function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Personlig brukernavngenerator</h1>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/">🧪 Generator</Link>
          <Link to="/about">ℹ️ Om prosjektet</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<UsernameForm />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;

