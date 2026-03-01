import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { matchesAPI, teamsAPI, tournamentsAPI } from '../services/api';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

const MATCH_TYPES = ['T10', 'T20', 'ODI', 'Test', 'Other'];

// Preset overs grouped for display
const OVER_PRESETS = [5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 50];

// Auto-fill overs when match type changes
const TYPE_OVERS = { T10: 10, T20: 20, ODI: 50, Test: 90 };

export default function CreateMatch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillTournament = searchParams.get('tournament') || '';
  const prefillTeamA = searchParams.get('teamA') || '';
  const prefillTeamB = searchParams.get('teamB') || '';

  const [teams, setTeams]           = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [customOvers, setCustomOvers] = useState('');
  const [form, setForm]             = useState({
    teamA: prefillTeamA, teamB: prefillTeamB, matchDate: '', venue: '',
    totalOvers: 20, matchType: 'T20', tournament: prefillTournament,
  });
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    teamsAPI.getAll().then(r => setTeams(r.data.data || []));
    tournamentsAPI.getAll().then(r => setTournaments(r.data.data || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // When match type changes, auto-set overs
  const handleTypeChange = (type) => {
    set('matchType', type);
    if (TYPE_OVERS[type]) {
      set('totalOvers', TYPE_OVERS[type]);
      setCustomOvers('');
    }
  };

  // When preset tile clicked
  const handlePreset = (o) => {
    set('totalOvers', o);
    setCustomOvers('');
  };

  // When custom input changes
  const handleCustom = (val) => {
    setCustomOvers(val);
    const n = parseInt(val);
    if (!isNaN(n) && n > 0) set('totalOvers', n);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.teamA === form.teamB) { toast.error('Team A and Team B cannot be the same.'); return; }
    if (!form.totalOvers || form.totalOvers < 1) { toast.error('Please select valid overs.'); return; }
    setSaving(true);
    try {
      const res = await matchesAPI.create(form);
      toast.success('Match scheduled!');
      navigate(`/matches/${res.data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create match.');
    } finally { setSaving(false); }
  };

  const isCustomActive = customOvers !== '' || !OVER_PRESETS.includes(form.totalOvers);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <PageHeader title="Schedule Match" subtitle="Set up a new match between two teams" />

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Teams Row */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Team A</label>
            <select className="input" required value={form.teamA} onChange={e => set('teamA', e.target.value)}>
              <option value="">— select team —</option>
              {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Team B</label>
            <select className="input" required value={form.teamB} onChange={e => set('teamB', e.target.value)}>
              <option value="">— select team —</option>
              {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Tournament (optional) */}
        <div>
          <label className="label">Tournament <span className="text-neutral-400 font-normal text-xs">(optional)</span></label>
          <select className="input" value={form.tournament} onChange={e => set('tournament', e.target.value)}>
            <option value="">— No Tournament (Friendly) —</option>
            {tournaments.map(t => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Date & Venue */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Date &amp; Time</label>
            <input
              type="datetime-local"
              className="input"
              required
              value={form.matchDate}
              onChange={e => set('matchDate', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Venue</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Central Cricket Ground"
              value={form.venue}
              onChange={e => set('venue', e.target.value)}
            />
          </div>
        </div>

        {/* Match Type — pill buttons */}
        <div>
          <label className="label mb-2">Match Type</label>
          <div className="flex flex-wrap gap-2">
            {MATCH_TYPES.map(t => (
              <button
                type="button"
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                  form.matchType === t
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Overs — visual tiles */}
        <div>
          <label className="label mb-1">
            Overs per Innings
            <span className="ml-2 text-primary-600 font-bold">{form.totalOvers} ov</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {OVER_PRESETS.map(o => (
              <button
                type="button"
                key={o}
                onClick={() => handlePreset(o)}
                className={`w-12 h-10 rounded-xl border-2 text-sm font-bold transition-all ${
                  form.totalOvers === o && !isCustomActive
                    ? 'border-primary-500 bg-primary-500 text-white shadow'
                    : 'border-neutral-200 text-neutral-600 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
          {/* Custom overs input */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500 whitespace-nowrap">Custom overs:</span>
            <input
              type="number"
              min="1"
              max="200"
              placeholder="e.g. 7"
              value={customOvers}
              onChange={e => handleCustom(e.target.value)}
              className={`input w-28 text-center font-semibold ${isCustomActive ? 'border-primary-400 ring-2 ring-primary-200' : ''}`}
            />
            {isCustomActive && (
              <span className="text-xs text-primary-600 font-medium">{form.totalOvers} overs selected</span>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-neutral-100">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary px-6" disabled={saving}>
            {saving ? 'Scheduling…' : 'Schedule Match'}
          </button>
        </div>
      </form>
    </div>
  );
}
