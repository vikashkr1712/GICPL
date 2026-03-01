import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import Home         from './pages/Home';
import Login        from './pages/Login';
import Register     from './pages/Register';
import Dashboard    from './pages/Dashboard';
import Teams        from './pages/Teams';
import TeamDetail   from './pages/TeamDetail';
import Players      from './pages/Players';
import PlayerProfile from './pages/PlayerProfile';
import Matches      from './pages/Matches';
import CreateMatch  from './pages/CreateMatch';
import LiveMatch    from './pages/LiveMatch';
import Scorecard    from './pages/Scorecard';
import Tournaments  from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import Leaderboard  from './pages/Leaderboard';
import AdminPanel   from './pages/AdminPanel';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/login"      element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register"   element={user ? <Navigate to="/dashboard" /> : <Register />} />

          <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/teams"      element={<Teams />} />
          <Route path="/teams/:id"  element={<TeamDetail />} />
          <Route path="/players"    element={<Players />} />
          <Route path="/players/:id" element={<PlayerProfile />} />
          <Route path="/matches"    element={<Matches />} />
          <Route path="/matches/create" element={<AdminRoute><CreateMatch /></AdminRoute>} />
          <Route path="/create-match"   element={<AdminRoute><CreateMatch /></AdminRoute>} />
          {/* Public shareable match page — anyone with link can view live score */}
          <Route path="/matches/:id"          element={<LiveMatch />} />
          <Route path="/matches/:id/live"     element={<LiveMatch />} />
          <Route path="/matches/:id/scorecard" element={<Scorecard />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin"      element={<AdminRoute><AdminPanel /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
