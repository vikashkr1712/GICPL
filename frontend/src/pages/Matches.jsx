import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/MatchCard';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const TABS = ['all', 'live', 'upcoming', 'completed'];

export default function Matches() {
  const { isAdmin } = useAuth();
  const [matches, setMatches] = useState([]);
  const [tab, setTab]         = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = tab !== 'all' ? { status: tab } : {};
    matchesAPI.getAll(params)
      .then(r => setMatches(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const handleDelete = async (matchId, e) => {
    e.preventDefault();  // prevent Link navigation
    e.stopPropagation();
    if (!window.confirm('Delete this match? All related data (balls, innings) will be permanently removed.')) return;
    try {
      await matchesAPI.delete(matchId);
      toast.success('Match deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        back={false}
        title="Matches"
        subtitle="All club matches and fixtures"
        action={isAdmin() && (
          <Link to="/matches/create" className="btn-primary text-sm px-4 py-2">
            + Schedule Match
          </Link>
        )}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-neutral-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
              tab === t
                ? 'bg-white shadow text-primary-700'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner size="lg" className="mt-12" />
      ) : matches.length === 0 ? (
        <div className="card text-center py-14 text-neutral-400">
          <p className="text-4xl mb-3">🏏</p>
          <p className="font-medium">No {tab === 'all' ? '' : tab} matches found.</p>
          {isAdmin() && tab !== 'completed' && (
            <Link to="/matches/create" className="btn-primary mt-4 inline-block text-sm px-6">
              Schedule a Match
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map(m => (
            <div key={m._id} className="relative group">
              <MatchCard match={m} />
              {isAdmin() && (
                <button
                  onClick={(e) => handleDelete(m._id, e)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 hover:bg-red-50 text-neutral-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-neutral-200"
                  title="Delete match"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
