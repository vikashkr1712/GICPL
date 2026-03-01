import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { playersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const ROLE_COLOR = {
  batsman: 'bg-blue-100 text-blue-700',
  bowler:  'bg-green-100 text-green-700',
  allrounder: 'bg-orange-100 text-orange-700',
  wicketkeeper: 'bg-neutral-100 text-neutral-600',
};

export default function Players() {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'batsman', battingStyle: '', bowlingStyle: '' });
  const [saving, setSaving] = useState(false);

  const load = () =>
    playersAPI.getAll().then(r => setPlayers(r.data.data || [])).finally(() => setLoading(false));

  const filtered = players.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => { load(); }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await playersAPI.create(form);
      toast.success('Player created!');
      setShowCreate(false);
      setForm({ name: '', role: 'batsman', battingStyle: '', bowlingStyle: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create player.');
    } finally { setSaving(false); }
  };



  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        back={false}
        title="Players"
        subtitle={`${players.length} player${players.length !== 1 ? 's' : ''} registered`}
        action={isAdmin() && (
          <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowCreate(true)}>
            + Add Player
          </button>
        )}
      />

      {/* Search */}
      <div className="mb-6">
        <input
          className="input max-w-sm"
          placeholder="Search player by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <Spinner size="lg" className="mt-16" />
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14 text-neutral-400">
          <p className="text-4xl mb-3">🏏</p>
          <p className="font-medium">{search ? 'No players match your search.' : 'No players yet.'}</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-neutral-600">#</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-600">Player</th>
                <th className="text-left px-4 py-3 font-semibold text-neutral-600">Role</th>
                <th className="text-center px-4 py-3 font-semibold text-neutral-600">Matches</th>
                <th className="text-center px-4 py-3 font-semibold text-neutral-600">Runs</th>
                <th className="text-center px-4 py-3 font-semibold text-neutral-600">HS</th>
                <th className="text-center px-4 py-3 font-semibold text-neutral-600">Avg</th>
                <th className="text-center px-4 py-3 font-semibold text-neutral-600">Wkts</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const cs  = p.careerStats || {};
                const avg = cs.innings > 0
                  ? (cs.runs / Math.max(1, cs.innings - (cs.notOuts || 0))).toFixed(1)
                  : '—';
                return (
                  <tr key={p._id} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                    <td className="px-4 py-3 text-neutral-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link to={`/players/${p._id}`} className="font-medium text-neutral-800 hover:text-primary-600 transition">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge capitalize ${ROLE_COLOR[p.role] || 'bg-neutral-100 text-neutral-600'}`}>
                        {p.role || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-600">{cs.matches || 0}</td>
                    <td className="px-4 py-3 text-center font-medium text-neutral-800">{cs.runs || 0}</td>
                    <td className="px-4 py-3 text-center text-neutral-600">{cs.highestScore || 0}</td>
                    <td className="px-4 py-3 text-center text-neutral-600">{avg}</td>
                    <td className="px-4 py-3 text-center font-medium text-neutral-800">{cs.wickets || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Player Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add New Player">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Player Name</label>
            <input className="input" placeholder="Full name" required autoFocus
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="batsman">Batsman</option>
              <option value="bowler">Bowler</option>
              <option value="allrounder">All-Rounder</option>
              <option value="wicketkeeper">Wicket-Keeper</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Batting Style</label>
              <select className="input" value={form.battingStyle} onChange={e => setForm(f => ({ ...f, battingStyle: e.target.value }))}>
                <option value="">— optional —</option>
                <option value="right-hand">Right Hand</option>
                <option value="left-hand">Left Hand</option>
              </select>
            </div>
            <div>
              <label className="label">Bowling Style</label>
              <select className="input" value={form.bowlingStyle} onChange={e => setForm(f => ({ ...f, bowlingStyle: e.target.value }))}>
                <option value="">— optional —</option>
                <option value="right-arm-fast">Right Arm Fast</option>
                <option value="right-arm-medium">Right Arm Medium</option>
                <option value="right-arm-spin">Right Arm Spin</option>
                <option value="left-arm-fast">Left Arm Fast</option>
                <option value="left-arm-medium">Left Arm Medium</option>
                <option value="left-arm-spin">Left Arm Spin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add Player'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
