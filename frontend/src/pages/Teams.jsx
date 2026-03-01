import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teamsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

function TeamCard({ team, isAdmin, onDelete }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <Link to={`/teams/${team._id}`}>
          <h3 className="font-semibold text-neutral-900 hover:text-primary-600 transition">{team.name}</h3>
          <p className="text-sm text-neutral-500 mt-0.5">{team.players?.length ?? 0} players</p>
        </Link>
        {isAdmin && (
          <button onClick={() => onDelete(team)} className="text-neutral-300 hover:text-red-500 transition text-sm ml-2">✕</button>
        )}
      </div>
      {team.captain?.name && (
        <p className="text-xs text-neutral-400 mt-2">Captain: {team.captain.name}</p>
      )}
      <Link
        to={`/teams/${team._id}`}
        className="text-xs text-primary-600 mt-3 inline-block hover:underline"
      >
        View squad →
      </Link>
    </div>
  );
}

export default function Teams() {
  const { isAdmin } = useAuth();
  const [teams, setTeams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(null);

  useEffect(() => {
    teamsAPI.getAll().then(r => setTeams(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await teamsAPI.create({ name: newName });
      setTeams(t => [res.data.data, ...t]);
      setShowCreate(false);
      setNewName('');
      toast.success('Team created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create team.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (team) => {
    if (!window.confirm(`Delete "${team.name}"?`)) return;
    setDeleting(team._id);
    try {
      await teamsAPI.delete(team._id);
      setTeams(t => t.filter(x => x._id !== team._id));
      toast.success('Team deleted.');
    } catch { toast.error('Failed to delete.'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        back={false}
        title="Teams"
        subtitle={`${teams.length} team${teams.length !== 1 ? 's' : ''} registered`}
        action={isAdmin() && (
          <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowCreate(true)}>
            + New Team
          </button>
        )}
      />

      {loading ? (
        <Spinner size="lg" className="mt-16" />
      ) : teams.length === 0 ? (
        <div className="card text-center py-14 text-neutral-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">No teams yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(t => (
            <TeamCard key={t._id} team={t} isAdmin={isAdmin()} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Team">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Team Name</label>
            <input
              className="input"
              placeholder="e.g. Mumbai Warriors"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
