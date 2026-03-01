import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { matchesAPI, teamsAPI, playersAPI } from '../services/api';
import MatchCard from '../components/MatchCard';
import Spinner from '../components/Spinner';
import PageHeader from '../components/PageHeader';

function StatCard({ label, value, icon, to }) {
  const inner = (
    <div className="card flex items-center gap-4 hover:shadow-md transition-shadow">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-neutral-900">{value ?? '—'}</p>
        <p className="text-sm text-neutral-500">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [liveMatches,  setLiveMatches]  = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [stats, setStats] = useState({ teams: null, players: null, upcoming: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [liveRes, recentRes, teamsRes, playersRes, upcomingRes] = await Promise.allSettled([
          matchesAPI.getAll({ status: 'live', limit: 3 }),
          matchesAPI.getAll({ status: 'completed', limit: 4 }),
          teamsAPI.getAll(),
          playersAPI.getAll(),
          matchesAPI.getAll({ status: 'upcoming', limit: 3 }),
        ]);
        if (liveRes.status === 'fulfilled')   setLiveMatches(liveRes.value.data.data || []);
        if (recentRes.status === 'fulfilled') setRecentMatches(recentRes.value.data.data || []);
        setStats({
          teams:    teamsRes.status === 'fulfilled'    ? teamsRes.value.data.data?.length    : null,
          players:  playersRes.status === 'fulfilled'  ? playersRes.value.data.data?.length  : null,
          upcoming: upcomingRes.status === 'fulfilled' ? upcomingRes.value.data.data?.length : null,
        });
      } catch (_) {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Spinner size="lg" className="mt-20" />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        back={false}
        title={`Welcome back, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Here's what's happening with your club today."
        action={isAdmin() && (
          <Link to="/matches/create" className="btn-primary text-sm px-4 py-2">
            + New Match
          </Link>
        )}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Teams"          value={stats.teams}    icon="👥" to="/teams" />
        <StatCard label="Players"        value={stats.players}  icon="🏏" to="/players" />
        <StatCard label="Upcoming"       value={stats.upcoming} icon="📅" to="/matches" />
        <StatCard label="Live Now"       value={liveMatches.length} icon="🔴" to="/matches" />
      </div>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-base font-semibold text-neutral-800">Live Matches</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveMatches.map(m => <MatchCard key={m._id} match={m} />)}
          </div>
        </section>
      )}

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-neutral-800">Recent Matches</h2>
            <Link to="/matches" className="text-sm text-primary-600 hover:underline">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {recentMatches.map(m => <MatchCard key={m._id} match={m} />)}
          </div>
        </section>
      )}

      {liveMatches.length === 0 && recentMatches.length === 0 && (
        <div className="card text-center py-12 text-neutral-400">
          <p className="text-4xl mb-3">🏏</p>
          <p className="font-medium">No matches yet.</p>
          {isAdmin() && (
            <Link to="/matches/create" className="btn-primary mt-4 inline-block text-sm px-6">
              Create First Match
            </Link>
          )}
        </div>
      )}

      {/* Quick Links */}
      <section>
        <h2 className="text-base font-semibold text-neutral-800 mb-3">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { to: '/matches',     label: 'All Matches' },
            { to: '/leaderboard', label: 'Leaderboard' },
            { to: '/tournaments', label: 'Tournaments' },
            { to: '/players',     label: 'Players' },
          ].map(l => (
            <Link key={l.to} to={l.to} className="btn-secondary text-sm px-4 py-1.5">{l.label}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
