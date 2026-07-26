import React, { useEffect, useState } from 'react';
import { api } from './utils/api';
import SeasonSelector from './SeasonSelector';

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)', marginBottom: '20px', overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', background: '#f8fafc', borderBottom: open ? '1px solid #e2e8f0' : 'none' }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{title}</h3>
        <span style={{ fontSize: '20px', color: '#64748b', fontWeight: 'bold', lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </div>
      {open && <div style={{ padding: '16px 20px' }}>{children}</div>}
    </div>
  );
}

function PlayerChangeCard({ player, idx, positive }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 14px', borderRadius: '8px', marginBottom: '8px',
      background: positive ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${positive ? '#bbf7d0' : '#fecaca'}`
    }}>
      <div>
        <span style={{ fontWeight: '600', marginRight: '8px', color: '#64748b' }}>#{idx + 1}</span>
        <span style={{ fontWeight: '600', color: positive ? '#166534' : '#991b1b' }}>{player.name}</span>
      </div>
      <span style={{ fontWeight: 'bold', fontSize: '16px', color: positive ? '#16a34a' : '#dc2626' }}>
        {positive ? '+' : ''}{player.rating_change}
      </span>
    </div>
  );
}

function MatchCard({ match }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: '8px', marginBottom: '8px',
      background: '#f8fafc', border: '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontWeight: '700', color: '#6366f1', fontSize: '13px' }}>{match.matchCode}</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Score: {match.score}</span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Court {match.court}</span>
      </div>
      {match.team1Names && match.team2Names && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
          <span>{match.team1Names.join(' & ')}</span>
          <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>vs</span>
          <span>{match.team2Names.join(' & ')}</span>
        </div>
      )}
    </div>
  );
}

function PublicHighlights() {
  const [matchDays, setMatchDays] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(2);
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Fetch match days whenever season changes
  useEffect(() => {
    const fetchDays = async () => {
      setLoading(true);
      setData(null);
      setSelectedDay('');
      try {
        const days = await api.getPublicMatchDays(selectedSeasonId);
        const onlyDates = days
          .map(d => d.match_day || d.date || d)
          .filter(Boolean)
          .map(formatDate);
        setMatchDays(onlyDates);
        if (onlyDates.length > 0) {
          setSelectedDay(onlyDates[0]);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load match days');
        setLoading(false);
      }
    };
    fetchDays();
  }, [selectedSeasonId]);

  // Fetch highlights whenever selectedDay changes
  useEffect(() => {
    if (!selectedDay) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getPublicHighlights(selectedDay, 10);
        setData(res);
      } catch (e) {
        console.error(e);
        setError('Failed to load highlights');
      }
      setLoading(false);
    };
    load();
  }, [selectedDay]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <SeasonSelector selectedSeasonId={selectedSeasonId} onSeasonChange={setSelectedSeasonId} />

        {matchDays.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ fontWeight: '600', color: '#334155' }}>📅 Match Day:</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: '2px solid #6366f1',
                fontWeight: '600', fontSize: '14px', color: '#1e293b', cursor: 'pointer'
              }}
            >
              {matchDays.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* No match days yet */}
      {matchDays.length === 0 && !loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏸</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No Match Days Yet for Season {selectedSeasonId === 2 ? '2.0' : '1.0'}</h3>
          <p style={{ margin: 0 }}>Highlights will appear here once match days are scheduled and finalized!</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading highlights...</div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: '20px', color: '#ef4444', textAlign: 'center', background: '#fef2f2', borderRadius: '8px' }}>{error}</div>
      )}

      {/* Main content */}
      {!loading && !error && data && (
        <div>
          {/* Top Gainers */}
          <Section title="🚀 Top Gainers" defaultOpen={true}>
            {data.topGainers && data.topGainers.length > 0 ? (
              data.topGainers.map((p, idx) => (
                <PlayerChangeCard key={p.player_id || idx} player={p} idx={idx} positive={true} />
              ))
            ) : (
              <p style={{ color: '#64748b', margin: 0 }}>No gainers recorded for this match day.</p>
            )}
          </Section>

          {/* Top Losers */}
          <Section title="📉 Top Losers" defaultOpen={true}>
            {data.topLosers && data.topLosers.length > 0 ? (
              data.topLosers.map((p, idx) => (
                <PlayerChangeCard key={p.player_id || idx} player={p} idx={idx} positive={false} />
              ))
            ) : (
              <p style={{ color: '#64748b', margin: 0 }}>No losers recorded for this match day.</p>
            )}
          </Section>

          {/* Closest Matches */}
          <Section title="⚡ Closest Matches (Thrillers)" defaultOpen={false}>
            {data.closestMatches && data.closestMatches.length > 0 ? (
              data.closestMatches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))
            ) : (
              <p style={{ color: '#64748b', margin: 0 }}>No scored matches found.</p>
            )}
          </Section>

          {/* One-sided Matches */}
          <Section title="💥 One-Sided Matches" defaultOpen={false}>
            {data.oneSidedMatches && data.oneSidedMatches.length > 0 ? (
              data.oneSidedMatches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))
            ) : (
              <p style={{ color: '#64748b', margin: 0 }}>No scored matches found.</p>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

export default PublicHighlights;
