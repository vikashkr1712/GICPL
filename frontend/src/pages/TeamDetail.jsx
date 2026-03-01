import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamsAPI, playersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const ROLES = ['batsman', 'bowler', 'allrounder', 'wicketkeeper'];

export default function TeamDetail() {
  const { id }  = useParams();
  const { isAdmin } = useAuth();
  const [team, setTeam]     = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'batsman', phone: '' });
  const [saving, setSaving] = useState(false);
  const [selectedPid, setSelectedPid] = useState('');

  const load = async () => {
    const [teamRes, playersRes] = await Promise.allSettled([
      teamsAPI.getById(id),
      playersAPI.getAll(),
    ]);
    if (teamRes.status === 'fulfilled')    setTeam(teamRes.value.data.data);
    if (playersRes.status === 'fulfilled') setAllPlayers(playersRes.value.data.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleCreatePlayer = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const pRes = await playersAPI.create({ ...form, teamId: id });
      const pid  = pRes.data.data._id;
      await teamsAPI.addPlayer(id, pid);
      toast.success('Player created and added!');
      setShowCreate(false);
      setForm({ name: '', role: 'batsman', phone: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally { setSaving(false); }
  };

  const handleAddExisting = async e => {
    e.preventDefault();
    if (!selectedPid) return;
    setSaving(true);
    try {
      await teamsAPI.addPlayer(id, selectedPid);
      toast.success('Player added!');
      setShowAdd(false);
      setSelectedPid('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally { setSaving(false); }
  };

  const handleRemove = async (playerId) => {
    if (!window.confirm('Remove this player from the team?')) return;
    try {
      await teamsAPI.removePlayer(id, playerId);
      toast.success('Player removed.');
      load();
    } catch { toast.error('Failed.'); }
  };

  if (loading) return <Spinner size="lg" className="mt-20" />;
  if (!team) return <div className="text-center mt-20 text-neutral-500">Team not found.</div>;

  const squadIds = new Set((team.players || []).map(p => (p._id || p).toString()));
  const nonSquad = allPlayers.filter(p => !squadIds.has(p._id.toString()));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHeader
        title={team.name}
        subtitle={`${team.players?.length ?? 0} players in squad`}
        action={isAdmin() && (
          <div className="flex gap-2">
            <button className="btn-secondary text-sm px-3 py-1.5" onClick={() => setShowAdd(true)}>
              + Add Existing
            </button>
            <button className="btn-primary text-sm px-3 py-1.5" onClick={() => setShowCreate(true)}>
              + New Player
            </button>
          </div>
        )}
      />

      {team.captain && (
        <p className="text-sm text-neutral-500 mb-5">
          Captain: <span className="font-medium text-neutral-800">{team.captain.name}</span>
        </p>
      )}

      {/* Players Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-neutral-600">#</th>
              <th className="text-left px-4 py-3 font-semibold text-neutral-600">Player</th>
              <th className="text-left px-4 py-3 font-semibold text-neutral-600">Role</th>
              <th className="text-center px-4 py-3 font-semibold text-neutral-600">Runs</th>
              <th className="text-center px-4 py-3 font-semibold text-neutral-600">Wkts</th>
              {isAdmin() && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {(team.players || []).map((p, i) => {
              const player = typeof p === 'object' ? p : { _id: p, name: '—' };
              return (
                <tr key={player._id} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                  <td className="px-4 py-3 text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link to={`/players/${player._id}`} className="font-medium text-neutral-800 hover:text-primary-600">
                      {player.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-neutral-500">{player.role || '—'}</td>
                  <td className="px-4 py-3 text-center text-neutral-700">{player.careerStats?.runs ?? 0}</td>
                  <td className="px-4 py-3 text-center text-neutral-700">{player.careerStats?.wickets ?? 0}</td>
                  {isAdmin() && (
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleRemove(player._id)} className="text-neutral-300 hover:text-red-500 text-xs transition">Remove</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!team.players || team.players.length === 0) && (
          <p className="text-center py-10 text-neutral-400">No players in squad yet.</p>
        )}
      </div>

      {/* Add Existing Player Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Existing Player">
        <form onSubmit={handleAddExisting} className="space-y-4">
          <div>
            <label className="label">Select Player</label>
            <select className="input" value={selectedPid} onChange={e => setSelectedPid(e.target.value)} required>
              <option value="">— choose player —</option>
              {nonSquad.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add Player'}</button>
          </div>
        </form>
      </Modal>

      {/* Create Player Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Player">
        <form onSubmit={handleCreatePlayer} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" placeholder="Player name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" placeholder="9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create & Add'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
