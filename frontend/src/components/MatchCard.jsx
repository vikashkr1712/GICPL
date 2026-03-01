import React from 'react';
import { Link } from 'react-router-dom';

const STATUS_STYLE = {
  live:      'bg-red-100 text-red-700',
  upcoming:  'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  scheduled: 'bg-neutral-100 text-neutral-600',
};

export default function MatchCard({ match }) {
  const {
    _id, status, teamA, teamB, date, venue,
    result, matchType, overs,
  } = match;

  const teamAName = teamA?.name || 'TBA';
  const teamBName = teamB?.name || 'TBA';
  const dateStr   = date ? new Date(date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '';

  return (
    <Link to={`/matches/${_id}`} className="card block hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-2 flex-wrap">
          <span className={`badge ${STATUS_STYLE[status] || 'bg-neutral-100 text-neutral-600'} capitalize`}>
            {status === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />}
            {status}
          </span>
          {matchType && (
            <span className="badge bg-neutral-100 text-neutral-600">{matchType}</span>
          )}
          {overs && (
            <span className="badge bg-neutral-100 text-neutral-500">{overs} Overs</span>
          )}
        </div>
        <span className="text-xs text-neutral-400 shrink-0">{dateStr}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-neutral-800 truncate">{teamAName}</p>
        <span className="text-neutral-300 text-xs font-medium shrink-0">vs</span>
        <p className="font-semibold text-neutral-800 truncate text-right">{teamBName}</p>
      </div>

      {venue && (
        <p className="text-xs text-neutral-400 mt-2 truncate">📍 {venue}</p>
      )}
      {result && (
        <p className="text-xs text-primary-700 font-medium mt-1 truncate">{result}</p>
      )}
    </Link>
  );
}
