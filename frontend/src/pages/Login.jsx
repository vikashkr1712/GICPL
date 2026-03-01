import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import Spinner from '../components/Spinner';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [mode, setMode]     = useState(null); // 'admin' | 'player'
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await authAPI.login({ email: form.email, password: form.password });
      const { user: userData, token } = res.data;
      // Warn if selected mode doesn't match actual role
      if (mode === 'admin' && userData.role !== 'admin') {
        setError(`This account has role "${userData.role}" — not admin. Contact the admin to upgrade your role.`);
        setLoading(false);
        return;
      }
      login(userData, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="GICPL" className="w-20 h-20 object-contain mx-auto mb-3 drop-shadow-lg" />
          <h1 className="text-2xl font-bold text-neutral-900">GICPL</h1>
          <p className="text-neutral-500 text-sm mt-1">Cricket Club Management</p>
        </div>

        {/* Step 1 — choose mode */}
        {!mode ? (
          <div>
            <p className="text-center text-sm font-medium text-neutral-500 mb-4">
              Who are you logging in as?
            </p>

            {/* Admin button */}
            <button
              onClick={() => { setMode('admin'); setError(''); }}
              className="w-full card border-2 border-transparent hover:border-red-400 hover:shadow-md transition-all text-left flex items-center gap-4 group mb-3"
            >
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-2xl shrink-0 group-hover:bg-red-200 transition">
                🔐
              </div>
              <div>
                <p className="font-bold text-neutral-900">Admin</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Create matches · Score balls · Manage users
                </p>
              </div>
              <span className="ml-auto text-xl text-neutral-300 group-hover:text-red-400 transition">›</span>
            </button>

            {/* Player / Viewer button */}
            <button
              onClick={() => { setMode('player'); setError(''); }}
              className="w-full card border-2 border-transparent hover:border-primary-400 hover:shadow-md transition-all text-left flex items-center gap-4 group mb-4"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-2xl shrink-0 group-hover:bg-primary-200 transition">
                🏏
              </div>
              <div>
                <p className="font-bold text-neutral-900">Player / Viewer</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  View live scores · Scorecards · Stats · Leaderboard
                </p>
              </div>
              <span className="ml-auto text-xl text-neutral-300 group-hover:text-primary-400 transition">›</span>
            </button>

            <p className="text-center text-sm text-neutral-500">
              No account?{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:underline">Register</Link>
            </p>
          </div>
        ) : (
          /* Step 2 — login form */
          <div>
            {/* Selected mode banner */}
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-4 border ${
              mode === 'admin' ? 'bg-red-50 border-red-200' : 'bg-primary-50 border-primary-200'
            }`}>
              <span className="text-xl">{mode === 'admin' ? '🔐' : '🏏'}</span>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${mode === 'admin' ? 'text-red-800' : 'text-primary-800'}`}>
                  {mode === 'admin' ? 'Admin Login' : 'Player / Viewer Login'}
                </p>
                <p className={`text-xs ${mode === 'admin' ? 'text-red-500' : 'text-primary-500'}`}>
                  {mode === 'admin' ? 'Requires admin role in the system' : 'For players, scorers & viewers'}
                </p>
              </div>
              <button
                onClick={() => { setMode(null); setError(''); }}
                className="text-xs text-neutral-400 hover:text-neutral-700 underline"
              >
                Change
              </button>
            </div>

            <div className="card">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email" name="email" className="input"
                    placeholder="you@example.com"
                    value={form.email} onChange={handleChange}
                    required autoFocus
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password" name="password" className="input"
                    placeholder="••••••••"
                    value={form.password} onChange={handleChange}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 rounded-lg font-semibold text-white transition disabled:opacity-50 ${
                    mode === 'admin' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  {loading
                    ? <Spinner size="sm" className="inline-flex" />
                    : `Sign in as ${mode === 'admin' ? 'Admin' : 'Player'}`}
                </button>
              </form>

              <p className="text-center text-sm text-neutral-500 mt-5">
                No account?{' '}
                <Link to="/register" className="text-primary-600 font-medium hover:underline">Register</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

