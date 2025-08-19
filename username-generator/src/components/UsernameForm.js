import { useState, useEffect } from 'react';
import { generateMultipleUsernames } from '../generator/generator';

export default function UsernameForm() {
  const [trait, setTrait] = useState('');
  const [animal, setAnimal] = useState('');
  const [hobby, setHobby] = useState('');
  const [color, setColor] = useState('');
  const [number, setNumber] = useState('');
  const [usernames, setUsernames] = useState([]);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('usernameHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Lagre historikken i localStorage når den oppdateres
  useEffect(() => {
    localStorage.setItem('usernameHistory', JSON.stringify(history));
  }, [history]);

  const handleGenerate = () => {
    const input = {
      trait: trait.trim(),
      animal: animal.trim(),
      hobby: hobby.trim(),
      color: color.trim(),
      number: parseInt(number)
    };

    const results = generateMultipleUsernames(input, 5);
    setUsernames(results);
    setHistory(prev => [...prev, ...results]); // Legger til nye forslag i historikken
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('usernameHistory');
  };

  return (
    <div>
      <h2>Lag et kult brukernavn</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <input
          placeholder="Egenskap (f.eks. kreativ)"
          value={trait}
          onChange={e => setTrait(e.target.value)}
        />
        <input
          placeholder="Favorittdyr"
          value={animal}
          onChange={e => setAnimal(e.target.value)}
        />
        <input
          placeholder="Hobby (f.eks. gaming)"
          value={hobby}
          onChange={e => setHobby(e.target.value)}
        />
        <input
          placeholder="Favorittfarge"
          value={color}
          onChange={e => setColor(e.target.value)}
        />
        <input
          placeholder="Lykketall"
          type="number"
          value={number}
          onChange={e => setNumber(e.target.value)}
        />

        <button onClick={handleGenerate}>🎲 Generer 5 brukernavn</button>
      </div>

      {/* Forslag */}
      {usernames.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Dine nye forslag:</h3>
          <ul>
            {usernames.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Historikk */}
      <div style={{ marginTop: '2rem' }}>
        <h3>Historikk (alle genererte):</h3>
        {history.length === 0 ? (
          <p>Ingen brukernavn generert ennå.</p>
        ) : (
          <>
            <ul>
              {history.map((name, index) => (
                <li key={index}>{name}</li>
              ))}
            </ul>
            <button onClick={clearHistory} style={{ marginTop: '1rem' }}>
              🗑 Slett historikk
            </button>
          </>
        )}
      </div>
    </div>
  );
}
