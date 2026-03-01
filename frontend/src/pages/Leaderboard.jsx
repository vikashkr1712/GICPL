import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardAPI } from '../services/api';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';

const MEDAL = ['🥇','🥈','🥉'];

function BattingLeaderboard({ data }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-100">
        <h2 className="font-semibold text-neutral-800">🏏 Top Run Scorers</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="text-left px-4 py-2 text-neutral-500 font-medium w-10">#</th>
            <th className="text-left px-4 py-2 text-neutral-500 font-medium">Player</th>
            <th className="text-center px-4 py-2 text-neutral-500 font-medium">Mat</th>
            <th className="text-center px-4 py-2 text-neutral-500 font-medium">Runs</th>
            <th className="text-center px-4 py-2 text-neutral-500 font-medium">HS</th>
            <th className="text-center px-4 py-2 text-neutral-500 font-medium">Avg</th>
            <th className="text-center px-4 py-2 text-neutral-500 font-medium">SR</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, i) => (
            <tr key={p._id} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
              <td className="px-4 py-2.5 font-bold text-neutral-400 text-center">
                {MEDAL[i] || i + 1}
              </td>
              <td className="px-4 py-2.5">
                <Link to={`/players/${p._id}`} className="font-medium text-neutral-800 hover:text-primary-600">
                  {p.name}
                </Link>
              </td>
              <td className="text-center px-4 py-2.5 text-neutral-600">{p.matches}</td>
              <td className="text-center px-4 py-2.5 font-bold text-neutral-900">{p.runs}</td>
              <td className="text-center px-4 py-2.5 text-neutral-600">{p.highestScore}</td>
              <td className="text-center px-4 py-2.5 text-neutral-600">{p.average}</td>
              <td className="text-center px-4 py-2.5 text-neutral-600">{p.strikeRate}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <p className="text-center py-8 text-neutral-400 text-sm">No data yet.</p>
      )}
    </div>
  );
}

function BowlingLeaderboard({ data }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-100">
        <h2 className="font-semibold text-neutral-800">🎯 Top Wicket-Takers</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="text-left px-4 py-2 text-neutral-500 font-medium w-10">#</th>
            <th className="text-left px-4 py-2 text-neutral-500 font-medium">Player</th>
            <th className="text-center px-4 py-2 text-neutral-500 font-medium">Mat</th>
            <th className="text-center px-4 py-2 text-neutral-500 font-medium">Wkts</th>
            <th className="text-center px-4 py-2 text-neutral-500 font-medium">Overs</th>
            <th className="text-center px-4 py-2 text-neutral-500 font-medium">Runs</th>
            <th className="text-center px-4 py-2 text-neutral-500 font-medium">Eco</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, i) => (
            <tr key={p._id} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
              <td className="px-4 py-2.5 font-bold text-neutral-400 text-center">
                {MEDAL[i] || i + 1}
              </td>
              <td className="px-4 py-2.5">
                <Link to={`/players/${p._id}`} className="font-medium text-neutral-800 hover:text-primary-600">
                  {p.name}
                </Link>
              </td>
              <td className="text-center px-4 py-2.5 text-neutral-600">{p.matches}</td>
              <td className="text-center px-4 py-2.5 font-bold text-neutral-900">{p.wickets}</td>
              <td className="text-center px-4 py-2.5 text-neutral-600">{p.oversBowled}</td>
              <td className="text-center px-4 py-2.5 text-neutral-600">{p.runsConceded}</td>
              <td className="text-center px-4 py-2.5 text-neutral-600">{p.economy}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <p className="text-center py-8 text-neutral-400 text-sm">No data yet.</p>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const [batting, setBatting] = useState([]);
  const [bowling, setBowling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('batting');

  useEffect(() => {
    Promise.allSettled([leaderboardAPI.batting(), leaderboardAPI.bowling()])
      .then(([b, w]) => {
        if (b.status === 'fulfilled') setBatting(b.value.data.data || []);
        if (w.status === 'fulfilled') setBowling(w.value.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHeader back={false} title="Leaderboard" subtitle="Player rankings across all club matches" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-neutral-100 rounded-xl p-1 w-fit">
        {['batting', 'bowling'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
              tab === t ? 'bg-white shadow text-primary-700' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner size="lg" className="mt-12" />
      ) : tab === 'batting' ? (
        <BattingLeaderboard data={batting} />
      ) : (
        <BowlingLeaderboard data={bowling} />
      )}
    </div>
  );
}
