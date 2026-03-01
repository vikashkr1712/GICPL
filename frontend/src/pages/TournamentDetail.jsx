import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tournamentsAPI, teamsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/MatchCard';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const STATUS_FLOW = { upcoming: 'ongoing', ongoing: 'completed' };
const STATUS_LABEL = { upcoming: 'Start Tournament', ongoing: 'Complete Tournament', completed: null };
const STATUS_COLOR = { upcoming: 'bg-blue-100 text-blue-700', ongoing: 'badge-success', completed: 'bg-neutral-100 text-neutral-600' };

export default function TournamentDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { isAdmin } = useAuth();

  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('table');
  const [allTeams, setAllTeams]         = useState([]);
  const [showAddTeam, setShowAddTeam]   = useState(false);
  const [addingTeam, setAddingTeam]     = useState('');
  const [saving, setSaving]             = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadTournament = useCallback(() => {
    return tournamentsAPI.getById(id).then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadTournament(); }, [loadTournament]);

  useEffect(() => {
    if (isAdmin()) teamsAPI.getAll().then(r => setAllTeams(r.data.data || []));
  }, [isAdmin]);

  if (loading) return <Spinner size="lg" className="mt-20" />;
  if (!data)   return <div className="text-center mt-20 text-neutral-500">Tournament not found.</div>;

  const {
    name, format, status, teams = [], matches = [],
    pointsTable = [], startDate, endDate
  } = data;

  const addableTeams = allTeams.filter(t => !teams.some(te => te._id === t._id));

  const handleAddTeam = async () => {
    if (!addingTeam) return;
    setSaving(true);
    try {
      await tournamentsAPI.addTeam(id, addingTeam);
      toast.success('Team added!');
      setShowAddTeam(false);
      setAddingTeam('');
      await loadTournament();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add team.');
    } finally { setSaving(false); }
  };

  const handleRemoveTeam = async (teamId, teamName) => {
    if (!window.confirm(`Remove "${teamName}" from this tournament?`)) return;
    try {
      await tournamentsAPI.removeTeam(id, teamId);
      toast.success('Team removed.');
      await loadTournament();
    } catch (e) {
      toast.error('Failed to remove team.');
    }
  };

  const handleStatusChange = async () => {
    const nextStatus = STATUS_FLOW[status];
    if (!nextStatus) return;
    if (!window.confirm(`Change tournament status to "${nextStatus}"?`)) return;
    setUpdatingStatus(true);
    try {
      await tournamentsAPI.updateStatus(id, nextStatus);
      toast.success(`Tournament is now ${nextStatus}!`);
      await loadTournament();
    } catch (e) {
      toast.error('Failed to update status.');
    } finally { setUpdatingStatus(false); }
  };

  const handleRefreshPoints = async () => {
    try {
      await tournamentsAPI.updatePoints(id);
      toast.success('Points table refreshed!');
      await loadTournament();
    } catch (e) {
      toast.error('Failed to refresh points.');
    }
  };

  const TABS = [
    { key: 'table',   label: 'Points Table' },
    { key: 'matches', label: 'Matches' },
    { key: 'teams',   label: 'Teams' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 mb-4 transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{name}</h1>
            <p className="text-sm text-neutral-500 mt-0.5 capitalize">
              {format} format &middot; {teams.length} teams &middot; {matches.length} matches
            </p>
            {startDate && (
              <p className="text-xs text-neutral-400 mt-1">
                {new Date(startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                {endDate && ` - ${new Date(endDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`badge capitalize ${STATUS_COLOR[status] || 'bg-neutral-100 text-neutral-600'}`}>
              {status}
            </span>

            {isAdmin() && (
              <div className="flex flex-wrap justify-end gap-2">
                {STATUS_LABEL[status] && (
                  <button
                    onClick={handleStatusChange}
                    disabled={updatingStatus}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition ${
                      status === 'upcoming'
                        ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                        : 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
                    }`}
                  >
                    {updatingStatus ? '...' : STATUS_LABEL[status]}
                  </button>
                )}

                {status !== 'completed' && (
                  <button
                    onClick={() => setShowAddTeam(true)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium border border-primary-400 text-primary-600 hover:bg-primary-50 transition"
                  >
                    + Add Team
                  </button>
                )}

                {teams.length >= 2 && status !== 'completed' && (
                  <Link
                    to={`/create-match?tournament=${id}`}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 transition"
                  >
                    + Schedule Match
                  </Link>
                )}

                {matches.length > 0 && (
                  <button
                    onClick={handleRefreshPoints}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition"
                  >
                    Refresh Points
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-neutral-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              tab === t.key ? 'bg-white shadow text-primary-700' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* POINTS TABLE TAB */}
      {tab === 'table' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary-600 text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold w-8">#</th>
                <th className="text-left px-4 py-3 font-semibold">Team</th>
                <th className="text-center px-3 py-3 font-semibold">P</th>
                <th className="text-center px-3 py-3 font-semibold">W</th>
                <th className="text-center px-3 py-3 font-semibold">L</th>
                <th className="text-center px-3 py-3 font-semibold">NR</th>
                <th className="text-center px-3 py-3 font-semibold">Pts</th>
                <th className="text-center px-3 py-3 font-semibold">NRR</th>
              </tr>
            </thead>
            <tbody>
              {pointsTable.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-neutral-400">
                    No data yet. Complete matches to populate the table.
                  </td>
                </tr>
              )}
              {pointsTable.map((row, i) => {
                const teamName = row.team?.name || `Team ${i + 1}`;
                const nrr = row.nrr !== undefined
                  ? (row.nrr >= 0 ? '+' : '') + Number(row.nrr).toFixed(3)
                  : '--';
                return (
                  <tr
                    key={row.team?._id || i}
                    className={`${i < 4 ? 'border-l-4 border-primary-400' : ''} ${
                      i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-neutral-400 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{teamName}</td>
                    <td className="text-center px-3 py-3 text-neutral-600">{row.played || 0}</td>
                    <td className="text-center px-3 py-3 text-neutral-600">{row.won || 0}</td>
                    <td className="text-center px-3 py-3 text-neutral-600">{row.lost || 0}</td>
                    <td className="text-center px-3 py-3 text-neutral-600">{row.noResult || 0}</td>
                    <td className="text-center px-3 py-3 font-bold text-neutral-900">{row.points || 0}</td>
                    <td className={`text-center px-3 py-3 font-semibold ${
                      row.nrr > 0 ? 'text-green-600' : row.nrr < 0 ? 'text-red-500' : 'text-neutral-500'
                    }`}>{nrr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MATCHES TAB */}
      {tab === 'matches' && (
        <div>
          {isAdmin() && teams.length >= 2 && status !== 'completed' && (
            <div className="flex justify-end mb-4">
              <Link
                to={`/create-match?tournament=${id}`}
                className="btn-primary text-sm px-4 py-2"
              >
                + Schedule New Match
              </Link>
            </div>
          )}

          {matches.length === 0 ? (
            <div className="card text-center py-12 text-neutral-400">
              <p className="text-4xl mb-3">&#127959;</p>
              <p className="mb-4">No matches scheduled yet.</p>
              {isAdmin() && teams.length >= 2 && (
                <Link
                  to={`/create-match?tournament=${id}`}
                  className="btn-primary text-sm px-4 py-2 inline-block"
                >
                  + Schedule First Match
                </Link>
              )}
              {teams.length < 2 && (
                <p className="text-sm text-orange-500 mt-2">Add at least 2 teams to schedule matches.</p>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {matches.map(m => (
                <div key={m._id} className="flex flex-col">
                  <MatchCard match={m} />
                  <div className="flex gap-2 mt-1.5 px-1">
                    {m.status === 'live' && (
                      <Link
                        to={`/live/${m._id}`}
                        className="flex-1 text-center text-xs py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                      >
                        Live Scoring
                      </Link>
                    )}
                    {(m.status === 'scheduled' || m.status === 'upcoming') && isAdmin() && (
                      <Link
                        to={`/matches/${m._id}`}
                        className="flex-1 text-center text-xs py-1.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                      >
                        Start Match
                      </Link>
                    )}
                    {m.status === 'completed' && (
                      <Link
                        to={`/matches/${m._id}/scorecard`}
                        className="flex-1 text-center text-xs py-1.5 bg-neutral-700 text-white rounded-lg font-semibold hover:bg-neutral-800 transition"
                      >
                        Scorecard
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TEAMS TAB */}
      {tab === 'teams' && (
        <div>
          {isAdmin() && status !== 'completed' && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAddTeam(true)}
                className="btn-primary text-sm px-4 py-2"
              >
                + Add Team
              </button>
            </div>
          )}

          {teams.length === 0 ? (
            <div className="card text-center py-12 text-neutral-400">
              <p className="text-4xl mb-3">&#128101;</p>
              <p>No teams added yet.</p>
              {isAdmin() && (
                <button
                  onClick={() => setShowAddTeam(true)}
                  className="btn-primary text-sm px-4 py-2 mt-4"
                >
                  + Add First Team
                </button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map(team => (
                <div key={team._id} className="card flex items-center gap-3">
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600 text-sm">
                      {team.shortName || team.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 truncate">{team.name}</p>
                    {team.city && <p className="text-xs text-neutral-400">{team.city}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/teams/${team._id}`}
                      className="text-xs text-primary-600 hover:underline whitespace-nowrap"
                    >
                      View
                    </Link>
                    {isAdmin() && status !== 'completed' && (
                      <button
                        onClick={() => handleRemoveTeam(team._id, team.name)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold"
                        title="Remove from tournament"
                      >
                        x
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Team Modal */}
      <Modal isOpen={showAddTeam} onClose={() => { setShowAddTeam(false); setAddingTeam(''); }} title="Add Team to Tournament">
        {addableTeams.length === 0 ? (
          <div className="text-center py-6 text-neutral-400">
            <p>All available teams are already in this tournament.</p>
            <p className="text-sm mt-1">
              <Link to="/teams" className="text-primary-600 hover:underline">Create a new team</Link> first.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Select Team</label>
              <select
                className="input"
                value={addingTeam}
                onChange={e => setAddingTeam(e.target.value)}
                autoFocus
              >
                <option value="">-- choose a team --</option>
                {addableTeams.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => { setShowAddTeam(false); setAddingTeam(''); }}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!addingTeam || saving}
                onClick={handleAddTeam}
              >
                {saving ? 'Adding...' : 'Add Team'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
