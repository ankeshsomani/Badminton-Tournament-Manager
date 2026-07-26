import React, { useEffect, useState } from 'react';
import { api } from './utils/api';

function SeasonSelector({ selectedSeasonId, onSeasonChange }) {
  const [seasons, setSeasons] = useState([]);

  useEffect(() => {
    async function loadSeasons() {
      try {
        const data = await api.getPublicSeasons();
        if (data && data.length > 0) {
          setSeasons(data);
        } else {
          setSeasons([
            { id: 2, name: 'MBPL Season 2.0' },
            { id: 1, name: 'MBPL Season 1.0' }
          ]);
        }
      } catch (err) {
        setSeasons([
          { id: 2, name: 'MBPL Season 2.0' },
          { id: 1, name: 'MBPL Season 1.0' }
        ]);
      }
    }
    loadSeasons();
  }, []);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', margin: '10px 0', gap: '8px' }}>
      <label style={{ fontWeight: 'bold', color: '#333', fontSize: '15px' }}>🏆 Season:</label>
      <select
        value={selectedSeasonId || 2}
        onChange={(e) => onSeasonChange(parseInt(e.target.value, 10))}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: '2px solid #6366f1',
          background: '#fff',
          fontWeight: '600',
          fontSize: '14px',
          color: '#1e293b',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}
      >
        {seasons.map(s => (
          <option key={s.id} value={s.id}>
            {s.name || `MBPL Season ${s.id}.0`} {s.id === 2 ? ' (Current)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SeasonSelector;
