import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scorecardAPI } from '../services/api';
import BattingTable from '../components/BattingTable';
import BowlingTable from '../components/BowlingTable';
import CommentaryPanel from '../components/CommentaryPanel';
import Spinner from '../components/Spinner';

function InningsPanel({ innings, index }) {
  const teamName    = innings?.battingTeam?.name || `Team ${index + 1}`;
  const totalRuns   = innings?.totalRuns ?? 0;
  const totalWickets= innings?.totalWickets ?? 0;
  const overs       = innings?.oversDisplay || `${innings?.overs ?? 0}.${innings?.balls ?? 0}`;
  const extras      = innings?.extras;

  // Fall of wickets derived from battingStats
  const fow = (innings?.battingStats || []).filter(b => b.isOut).map(b => b.player?.name || '?');

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-neutral-900">
          {teamName}
          <span className="ml-3 text-2xl font-extrabold text-primary-700">
            {totalRuns}/{totalWickets}
          </span>
          <span className="ml-2 text-sm font-normal text-neutral-500">({overs} Ov)</span>
        </h2>
        <span className="text-xs text-neutral-400 uppercase font-semibold">Innings {index + 1}</span>
      </div>

      {/* Batting */}
      <div className="card p-0 mb-3 overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Batting</p>
        </div>
        <BattingTable
          stats={innings?.battingStats || []}
          extras={extras}
          total={`${totalRuns}/${totalWickets} (${overs} Ov)`}
        />
      </div>

      {/* Bowling */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Bowling</p>
        </div>
        <BowlingTable stats={innings?.bowlingStats || []} />
      </div>

      {/* Fall of Wickets */}
      {fow.length > 0 && (
        <div className="mt-3 px-1">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Fall of Wickets</p>
          <div className="flex flex-wrap gap-2">
            {fow.map((name, i) => (
              <span key={i} className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-2 py-1">
                {i + 1}. {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Scorecard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('scorecard'); // 'scorecard' | 'commentary'
  const [balls1,  setBalls1]  = useState([]);
  const [balls2,  setBalls2]  = useState([]);
  const [ballsLoading, setBallsLoading] = useState(false);

  useEffect(() => {
    scorecardAPI.getScorecard(id).then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  const loadBalls = async () => {
    if (balls1.length > 0 || ballsLoading) return; // already loaded
    setBallsLoading(true);
    try {
      const [r1, r2] = await Promise.allSettled([
        scorecardAPI.getBalls(id, 1),
        scorecardAPI.getBalls(id, 2),
      ]);
      if (r1.status === 'fulfilled') setBalls1(r1.value.data.data || []);
      if (r2.status === 'fulfilled') setBalls2(r2.value.data.data || []);
    } catch (_) {}
    setBallsLoading(false);
  };

  const handleTab = (t) => {
    setTab(t);
    if (t === 'commentary') loadBalls();
  };

  if (loading) return <Spinner size="lg" className="mt-20" />;
  if (!data)   return <div className="text-center mt-20 text-neutral-500">Scorecard not found.</div>;

  const { match, innings = [] } = data;

  // Toss info
  const tossWinName = match?.tossWinner?.name;
  const tossInfo    = tossWinName
    ? `${tossWinName} won toss & elected to ${match.tossDecision === 'bat' ? 'bat' : 'field'} first`
    : null;

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

      {/* Match Header */}
      <div className="card mb-5 text-center">
        <p className="text-xs text-neutral-400 uppercase mb-1">{match?.matchType} · {match?.overs} Overs</p>
        <h1 className="text-xl font-bold text-neutral-900 mb-1">
          {match?.teamA?.name} vs {match?.teamB?.name}
        </h1>
        {match?.venue && <p className="text-sm text-neutral-500">📍 {match.venue}</p>}
        {tossInfo && <p className="text-xs text-primary-600 font-medium mt-1">🪙 {tossInfo}</p>}
        {match?.resultDescription && (
          <p className="mt-2 text-sm font-semibold text-green-700 bg-green-50 rounded-lg px-4 py-1.5 inline-block">
            🏆 {match.resultDescription}
          </p>
        )}
        {match?.playerOfMatch?.name && (
          <p className="mt-1 text-sm font-semibold text-amber-700 bg-amber-50 rounded-lg px-4 py-1.5 inline-block">
            🏅 Player of the Match: {match.playerOfMatch.name}
          </p>
        )}
        {match?.date && (
          <p className="text-xs text-neutral-400 mt-1">
            {new Date(match.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-neutral-200">
        {[
          { key: 'scorecard',   label: '📋 Scorecard' },
          { key: 'commentary',  label: '💬 Commentary' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => handleTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-primary-500 text-primary-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'scorecard' && (
        innings.length === 0 ? (
          <div className="text-center text-neutral-400 py-12">No innings data yet.</div>
        ) : (
          innings.map((inn, i) => <InningsPanel key={inn._id || i} innings={inn} index={i} />)
        )
      )}

      {tab === 'commentary' && (
        <div className="space-y-4">
          {ballsLoading && <Spinner size="md" className="py-8" />}
          {!ballsLoading && balls1.length === 0 && balls2.length === 0 && (
            <div className="text-center text-neutral-400 py-12">No commentary available.</div>
          )}
          {balls1.length > 0 && (
            <div>
              <p className="text-sm font-bold text-neutral-700 mb-2">
                1st Innings — {innings[0]?.battingTeam?.name}
              </p>
              <CommentaryPanel balls={balls1} />
            </div>
          )}
          {balls2.length > 0 && (
            <div>
              <p className="text-sm font-bold text-neutral-700 mb-2 mt-6">
                2nd Innings — {innings[1]?.battingTeam?.name}
              </p>
              <CommentaryPanel balls={balls2} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
