import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 second timeout — prevents infinite spinner if server is down
});

// Response interceptor — auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cc_user');
      localStorage.removeItem('cc_token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register: (data)  => api.post('/auth/register', data),
  login:    (data)  => api.post('/auth/login', data),
  getMe:    ()      => api.get('/auth/me'),
};

// ── Users ─────────────────────────────────────────────────────
export const usersAPI = {
  getAll:      ()            => api.get('/users'),
  updateRole:  (id, role)    => api.put(`/users/${id}/role`, { role }),
  updateProfile: (data)      => api.put('/users/profile', data),
};

// ── Teams ─────────────────────────────────────────────────────
export const teamsAPI = {
  create:          (data)    => api.post('/teams', data),
  getAll:          ()        => api.get('/teams'),
  getById:         (id)      => api.get(`/teams/${id}`),
  update:          (id, data)=> api.put(`/teams/${id}`, data),
  delete:          (id)      => api.delete(`/teams/${id}`),
  addPlayer:       (id, pid) => api.put(`/teams/${id}/add-player`, { playerId: pid }),
  removePlayer:    (id, pid) => api.put(`/teams/${id}/remove-player`, { playerId: pid }),
};

// ── Players ───────────────────────────────────────────────────
export const playersAPI = {
  create:  (data)            => api.post('/players', data),
  getAll:  (params)          => api.get('/players', { params }),
  getById: (id)              => api.get(`/players/${id}`),
  update:  (id, data)        => api.put(`/players/${id}`, data),
  delete:  (id)              => api.delete(`/players/${id}`),
};

// ── Matches ───────────────────────────────────────────────────
export const matchesAPI = {
  create:  (data)            => api.post('/matches', data),
  getAll:  (params)          => api.get('/matches', { params }),
  getById: (id)              => api.get(`/matches/${id}`),
  update:  (id, data)        => api.put(`/matches/${id}`, data),
  start:   (id, data)        => api.put(`/matches/${id}/start`, data),
  end:     (id, data)        => api.put(`/matches/${id}/end`, data),
  delete:  (id)              => api.delete(`/matches/${id}`),
};

// ── Bookings ──────────────────────────────────────────────────
export const bookingsAPI = {
  create:       (data)        => api.post('/bookings', data),
  getAll:       (params)      => api.get('/bookings', { params }),
  approve:      (id)          => api.put(`/bookings/${id}/approve`),
  cancel:       (id)          => api.put(`/bookings/${id}/cancel`),
  updateStatus: (id, status)  => status === 'confirmed'
    ? api.put(`/bookings/${id}/approve`)
    : api.put(`/bookings/${id}/cancel`),
  delete:       (id)          => api.delete(`/bookings/${id}`),
};

// ── Scoring ───────────────────────────────────────────────────
export const scoringAPI = {
  addBall:          (matchId, data) => api.post(`/scoring/${matchId}/add-ball`, data),
  undo:             (matchId)       => api.post(`/scoring/${matchId}/undo`),
  undoBall:         (matchId)       => api.post(`/scoring/${matchId}/undo`),
  endInnings:       (matchId)       => api.post(`/scoring/${matchId}/end-innings`),
  changeBatsman:    (matchId, data) => api.put(`/scoring/${matchId}/change-batsman`, data),
  changeBowler:     (matchId, data) => api.put(`/scoring/${matchId}/change-bowler`, data),
  setPlayers:       (matchId, data) => api.put(`/scoring/${matchId}/set-players`, data),
  setOpeningPlayers:(matchId, data) => api.put(`/scoring/${matchId}/set-players`, data),
  setPlayerOfMatch: (matchId, data) => api.put(`/scoring/${matchId}/player-of-match`, data),
};

// ── Scorecard ─────────────────────────────────────────────────
export const scorecardAPI = {
  get:          (matchId)           => api.get(`/scorecard/${matchId}`),
  getScorecard: (matchId)           => api.get(`/scorecard/${matchId}`),
  getBalls:     (matchId, innings)  => api.get(`/scorecard/${matchId}/balls`, { params: { innings } }),
};

// ── Tournaments ───────────────────────────────────────────────
export const tournamentsAPI = {
  create:       (data)          => api.post('/tournaments', data),
  getAll:       ()              => api.get('/tournaments'),
  getById:      (id)            => api.get(`/tournaments/${id}`),
  addTeam:      (id, teamId)    => api.put(`/tournaments/${id}/add-team`, { teamId }),
  removeTeam:   (id, teamId)    => api.put(`/tournaments/${id}/remove-team`, { teamId }),
  updateStatus: (id, status)    => api.put(`/tournaments/${id}/status`, { status }),
  updatePoints: (id)            => api.put(`/tournaments/${id}/update-points`),
  delete:       (id)            => api.delete(`/tournaments/${id}`),
};

// ── Leaderboard ───────────────────────────────────────────────
export const leaderboardAPI = {
  batting: (limit) => api.get('/leaderboard/batting', { params: { limit } }),
  bowling: (limit) => api.get('/leaderboard/bowling', { params: { limit } }),
  sixes:   (limit) => api.get('/leaderboard/sixes',   { params: { limit } }),
};

export default api;
