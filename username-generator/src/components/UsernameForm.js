import { useState } from 'react';
import { generateUsername } from '../generator/generator';

export default function UsernameForm() {
  const [traits, setTraits] = useState('');
  const [animal, setAnimal] = useState('');
  const [number, setNumber] = useState('');
  const [style, setStyle] = useState('camelCase');
  const [username, setUsername] = useState('');

  const handleGenerate = () => {
    const input = {
      traits: traits.split(',').map(t => t.trim()).filter(Boolean),
      favoriteAnimal: animal.trim(),
      luckyNumber: parseInt(number),
      style
    };
    const result = generateUsername(input);
    setUsername(result);
  };

  return (
    <div>
      <h2>Lag et personlig brukernavn</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="Egenskaper (f.eks. modig, kreativ)"
          value={traits}
          onChange={e => setTraits(e.target.value)}
        />

        <input
          type="text"
          placeholder="Favorittdyr (f.eks. rev, ulv)"
          value={animal}
          onChange={e => setAnimal(e.target.value)}
        />

        <input
          type="number"
          placeholder="Lykketall (f.eks. 42)"
          value={number}
          onChange={e => setNumber(e.target.value)}
        />

        <select value={style} onChange={e => setStyle(e.target.value)}>
          <option value="camelCase">camelCase</option>
          <option value="snake_case">snake_case</option>
          <option value="kebab-case">kebab-case</option>
          <option value="UPPERCASE">UPPERCASE</option>
        </select>

        <button onClick={handleGenerate}>🎲 Generer brukernavn</button>

        {username && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Resultat:</strong> <span style={{ fontSize: '1.2rem' }}>{username}</span>
          </div>
        )}
      </div>
    </div>
  );
}
