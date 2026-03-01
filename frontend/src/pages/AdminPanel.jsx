import React, { useEffect, useState } from 'react';
import { usersAPI } from '../services/api';
import PageHeader from '../components/PageHeader';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const ROLES = ['player', 'scorer', 'admin'];
const ROLE_STYLE = {
  admin:  'bg-red-100 text-red-700',
  scorer: 'bg-blue-100 text-blue-700',
  player: 'bg-neutral-100 text-neutral-600',
};

export default function AdminPanel() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);

  useEffect(() => {
    usersAPI.getAll().then(r => setUsers(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setSaving(userId);
    try {
      await usersAPI.updateRole(userId, newRole);
      setUsers(u => u.map(x => x._id === userId ? { ...x, role: newRole } : x));
      toast.success('Role updated.');
    } catch {
      toast.error('Failed to update role.');
    } finally { setSaving(null); }
  };

  if (loading) return <Spinner size="lg" className="mt-20" />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        back={false}
        title="Admin Panel"
        subtitle="Manage users, roles and club settings"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Users',  value: users.length, icon: '👤' },
          { label: 'Admins',       value: users.filter(u => u.role === 'admin').length, icon: '🔐' },
          { label: 'Scorers',      value: users.filter(u => u.role === 'scorer').length, icon: '📊' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
              <p className="text-xs text-neutral-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-800">User Management</h2>
          <span className="text-sm text-neutral-400">{users.length} users</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-neutral-600">#</th>
              <th className="text-left px-5 py-3 font-semibold text-neutral-600">Name</th>
              <th className="text-left px-5 py-3 font-semibold text-neutral-600">Email</th>
              <th className="text-center px-5 py-3 font-semibold text-neutral-600">Role</th>
              <th className="text-center px-5 py-3 font-semibold text-neutral-600">Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u._id} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                <td className="px-5 py-3 text-neutral-400">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-neutral-800">{u.name}</td>
                <td className="px-5 py-3 text-neutral-500 text-xs">{u.email}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`badge capitalize ${ROLE_STYLE[u.role] || 'bg-neutral-100 text-neutral-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <select
                    className="text-sm border border-neutral-200 rounded-lg px-2 py-1 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    value={u.role}
                    onChange={e => handleRoleChange(u._id, e.target.value)}
                    disabled={saving === u._id}
                  >
                    {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center py-10 text-neutral-400">No users found.</p>
        )}
      </div>
    </div>
  );
}
