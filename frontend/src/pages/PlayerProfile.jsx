import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { playersAPI } from '../services/api';
import Spinner from '../components/Spinner';

function Stat({ label, value }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold text-neutral-900">{value ?? '—'}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    playersAPI.getById(id).then(r => setPlayer(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner size="lg" className="mt-20" />;
  if (!player)  return <div className="text-center mt-20 text-neutral-500">Player not found.</div>;

  const cs = player.careerStats || {};
  const avg = cs.innings > 0
    ? (cs.runs / Math.max(1, cs.innings - (cs.notOuts || 0))).toFixed(2)
    : '—';
  const sr  = cs.ballsFaced > 0 ? ((cs.runs / cs.ballsFaced) * 100).toFixed(1) : '—';
  const eco = cs.ballsBowled > 0 ? ((cs.runsConceded / cs.ballsBowled) * 6).toFixed(2) : '—';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 mb-4 transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Profile Header */}
      <div className="card flex items-center gap-5 mb-6">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700 shrink-0">
          {player.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{player.name}</h1>
          <p className="text-neutral-500 capitalize text-sm mt-0.5">{player.role || 'Player'}</p>
          {player.teams?.length > 0 && (
            <p className="text-xs text-neutral-400 mt-1">
              Teams: {player.teams.map(t => t.name || t).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Batting Stats */}
      <h2 className="text-base font-semibold text-neutral-700 mb-3">Batting Stats</h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        <Stat label="Matches"    value={cs.matches || 0} />
        <Stat label="Innings"    value={cs.innings || 0} />
        <Stat label="Runs"       value={cs.runs || 0} />
        <Stat label="H. Score"   value={cs.highestScore || 0} />
        <Stat label="Average"    value={avg} />
        <Stat label="Strike Rate" value={sr} />
        <Stat label="Fours"      value={cs.fours || 0} />
        <Stat label="Sixes"      value={cs.sixes || 0} />
        <Stat label="Not Outs"   value={cs.notOuts || 0} />
      </div>

      {/* Bowling Stats */}
      {(cs.wickets > 0 || cs.ballsBowled > 0) && (
        <>
          <h2 className="text-base font-semibold text-neutral-700 mb-3">Bowling Stats</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <Stat label="Wickets"    value={cs.wickets || 0} />
            <Stat label="Overs"      value={cs.ballsBowled ? Math.floor(cs.ballsBowled / 6) + '.' + (cs.ballsBowled % 6) : 0} />
            <Stat label="Runs Given" value={cs.runsConceded || 0} />
            <Stat label="Economy"    value={eco} />
            <Stat label="5-Wickets"  value={cs.fifers || 0} />
          </div>
        </>
      )}
    </div>
  );
}
