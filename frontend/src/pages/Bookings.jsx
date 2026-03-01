import React, { useEffect, useState } from 'react';
import { bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  approved:  'badge-success',
  pending:   'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-600',
  rejected:  'bg-red-100 text-red-600',
};

const PURPOSE_OPTIONS = [
  { value: 'practice',    label: 'Practice Session' },
  { value: 'match',       label: 'Match' },
  { value: 'net-session', label: 'Net Session' },
  { value: 'other',       label: 'Other' },
];

export default function Bookings() {
  const { isAdmin, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ groundName: 'Main Ground', date: '', startTime: '', endTime: '', purpose: 'practice' });
  const [saving, setSaving] = useState(false);

  const load = () =>
    bookingsAPI.getAll().then(r => setBookings(r.data.data || [])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await bookingsAPI.create(form);
      toast.success('Booking requested!');
      setShowCreate(false);
      setForm({ groundName: 'Main Ground', date: '', startTime: '', endTime: '', purpose: 'practice' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Time slot unavailable or error.');
    } finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try {
      await bookingsAPI.approve(id);
      toast.success('Booking approved.');
      load();
    } catch { toast.error('Failed to approve.'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await bookingsAPI.cancel(id);
      toast.success('Booking cancelled.');
      load();
    } catch { toast.error('Failed to cancel.'); }
  };

  if (loading) return <Spinner size="lg" className="mt-20" />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHeader
        title="Ground Bookings"
        subtitle="Reserve the cricket ground for practice or matches"
        action={
          <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowCreate(true)}>
            + Book Ground
          </button>
        }
      />

      {bookings.length === 0 ? (
        <div className="card text-center py-12 text-neutral-400">
          <p className="text-4xl mb-3">📅</p>
          <p>No bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b._id} className="card flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${STATUS_STYLE[b.status] || 'badge'} capitalize`}>{b.status}</span>
                  <span className="text-sm font-semibold text-neutral-800">
                    {new Date(b.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">{b.groundName}</p>
                <p className="text-sm text-neutral-600">
                  {b.startTime} — {b.endTime}
                </p>
                {b.purpose && <p className="text-xs text-neutral-400 mt-0.5 capitalize">{b.purpose.replace('-', ' ')}</p>}
                <p className="text-xs text-neutral-400 mt-1">
                  Booked by: {b.user?.name || 'Unknown'}
                </p>
              </div>
              {isAdmin() && b.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(b._id)} className="btn-primary text-xs px-3 py-1.5">
                    Approve
                  </button>
                  <button onClick={() => handleCancel(b._id)} className="btn-danger text-xs px-3 py-1.5">
                    Reject
                  </button>
                </div>
              )}
              {!isAdmin() && b.user?._id?.toString() === user?._id && b.status === 'pending' && (
                <button onClick={() => handleCancel(b._id)} className="btn-danger text-xs px-3 py-1.5">
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Booking Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Book the Ground">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Ground Name</label>
            <input className="input" placeholder="e.g. Main Ground" required value={form.groundName} onChange={e => set('groundName', e.target.value)} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" required value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time</label>
              <input type="time" className="input" required value={form.startTime} onChange={e => set('startTime', e.target.value)} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" className="input" required value={form.endTime} onChange={e => set('endTime', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Purpose</label>
            <select className="input" value={form.purpose} onChange={e => set('purpose', e.target.value)}>
              {PURPOSE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Booking…' : 'Request Booking'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
