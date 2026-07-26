import React, { useEffect, useState } from 'react';
import './PlayerPerformanceMatrix.css';
import { api } from './utils/api';
import SeasonSelector from './SeasonSelector';

// Accept reloadRef or onReloaded prop to allow parent to force a refetch
function PlayerPerformanceMatrix({ reloadRef, onReloaded, onPlayerClick }) {
  const [players, setPlayers] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState(2);

  // Refetch logic
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPublicSnapshots(selectedSeasonId);
      // Collect all unique dates from snapshots
      const allDates = Array.from(new Set(
        data.flatMap(p => p.snapshots.map(s => s.date))
      )).sort((a, b) => new Date(b) - new Date(a));
      setDates(allDates);
      setPlayers(data);
      if (typeof onReloaded === 'function') onReloaded();
    } catch (err) {
      setError('Failed to load player performance');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedSeasonId]);

  // Expose reload method via ref
  React.useImperativeHandle(reloadRef, () => ({ reload: fetchData }), [selectedSeasonId]);

  // Helper: get rating for player at a given date
  function getRatingOnDate(player, date) {
    const snap = player.snapshots.find(s => s.date === date);
    return snap ? snap.rating : null;
  }

  const sortedPlayers = [...players].sort((a, b) => {
    const crA = a.currentRating ?? 0;
    const crB = b.currentRating ?? 0;
    if (crB !== crA) return crB - crA;
    const irA = a.initialRating ?? 0;
    const irB = b.initialRating ?? 0;
    return irB - irA;
  });

  return (
    <div className="matrix-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <SeasonSelector selectedSeasonId={selectedSeasonId} onSeasonChange={setSelectedSeasonId} />
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Showing {players.length} players</span>
      </div>

      {loading ? (
        <div className="matrix-loading">Loading leaderboard...</div>
      ) : error ? (
        <div className="matrix-error">{error}</div>
      ) : (
        <div className="matrix-scroll">
          <table className="matrix-table leaderboard-view">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player Name</th>
                <th>Current Rating</th>
                {dates.map(date => (
                  <th key={date}>{date}</th>
                ))}
                <th>Initial Rating</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, idx) => (
                <tr key={player.id}>
                  <td>{idx + 1}</td>
                  <td className="player-name-cell">
                    {onPlayerClick ? (
                      <a href="#performance" className="player-link" onClick={(e) => { e.preventDefault(); onPlayerClick(player.id); }}>
                        {player.name}
                      </a>
                    ) : (
                      player.name
                    )}
                  </td>
                  <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{player.currentRating}</td>
                  {dates.map((date, dIdx) => {
                    const ratingNow = getRatingOnDate(player, date);
                    const nextRating = (dIdx + 1 < dates.length)
                      ? getRatingOnDate(player, dates[dIdx + 1])
                      : player.initialRating;
                    let cls = '';
                    if (ratingNow == null) {
                      cls = 'rating-absent';
                    } else if (nextRating == null) {
                      cls = 'rating-same';
                    } else if (ratingNow > nextRating) {
                      cls = 'rating-up';
                    } else if (ratingNow < nextRating) {
                      cls = 'rating-down';
                    } else {
                      cls = 'rating-same';
                    }
                    return <td key={date} className={cls}>{ratingNow ?? '-'}</td>;
                  })}
                  <td>{player.initialRating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PlayerPerformanceMatrix;
