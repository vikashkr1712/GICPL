import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tournamentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function Tournaments() {
  const { isAdmin } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', format: 'league' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    tournamentsAPI.getAll()
      .then(r => setTournaments(r.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (tournamentId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this tournament? All matches, innings, and ball data will be permanently removed.')) return;
    try {
      await tournamentsAPI.delete(tournamentId);
      toast.success('Tournament deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    }
  };

  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await tournamentsAPI.create(form);
      toast.success('Tournament created!');
      setShowCreate(false);
      setForm({ name: '', startDate: '', endDate: '', format: 'league' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        back={false}
        title="Tournaments"
        subtitle="Club tournaments and competitions"
        action={isAdmin() && (
          <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowCreate(true)}>
            + New Tournament
          </button>
        )}
      />

      {loading ? (
        <Spinner size="lg" className="mt-12" />
      ) : error ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-neutral-600 font-medium">Could not load tournaments.</p>
          <p className="text-sm text-neutral-400 mb-4">Check that the server is running.</p>
          <button className="btn-primary text-sm px-4 py-2" onClick={load}>Retry</button>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card text-center py-12 text-neutral-400">
          <p className="text-4xl mb-3">🏆</p>
          <p>No tournaments yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map(t => (
            <div key={t._id} className="relative group">
              <Link to={`/tournaments/${t._id}`} className="card block hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <span className={`badge capitalize ${
                    t.status === 'ongoing' ? 'badge-success'
                    : t.status === 'upcoming' ? 'bg-blue-100 text-blue-700'
                    : 'bg-neutral-100 text-neutral-600'
                  }`}>{t.status}</span>
                  <span className="text-xs text-neutral-400 capitalize">{t.format}</span>
                </div>
                <h3 className="font-semibold text-neutral-900 text-base">{t.name}</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {t.teams?.length ?? 0} teams · {t.matches?.length ?? 0} matches
                </p>
                {t.startDate && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(t.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    {t.endDate && ` – ${new Date(t.endDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`}
                  </p>
                )}
              </Link>
              {isAdmin() && (
                <button
                  onClick={(e) => handleDelete(t._id, e)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 hover:bg-red-50 text-neutral-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-neutral-200 z-10"
                  title="Delete tournament"
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Tournament">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Tournament Name</label>
            <input className="input" placeholder="e.g. Premier League 2025" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Format</label>
            <select className="input" value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
              {['league', 'knockout', 'league+knockout'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
