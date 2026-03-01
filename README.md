# 🏏 Cricket Club Management System

A full-stack CricHeroes-style cricket club management platform with live scoring, real-time scorecards, player stats, leaderboards, ground bookings and tournament management.

---

## Tech Stack

| Layer      | Technologies |
|------------|-------------|
| Frontend   | React 18, Vite, Tailwind CSS, React Router v6, Socket.io-client, Recharts |
| Backend    | Node.js, Express, Socket.io |
| Database   | MongoDB + Mongoose |
| Auth       | JWT + bcryptjs |
| Security   | Helmet, express-rate-limit, express-validator, CORS |
| Logging    | Winston + Morgan |
| Tests      | Jest (ScoringEngine unit tests) |

---

## Project Structure

```
CRICKET CLUB/
├── backend/
│   ├── config/           # DB + Winston logger
│   ├── controllers/      # 9 controllers (auth, users, teams, players, matches, bookings, scoring, scorecard, tournaments, leaderboard)
│   ├── middleware/        # authenticate, authorize (RBAC), errorHandler, validate
│   ├── models/           # User, Team, Player, Match, Innings, Ball, Booking, Tournament
│   ├── routes/           # 10 route files
│   ├── services/
│   │   └── scoringEngine.js  ⭐ FLAGSHIP — deterministic ball-by-ball engine
│   ├── tests/
│   │   └── scoringEngine.test.js  (10 unit tests)
│   ├── server.js
│   └── .env.example
│
└── frontend/
    └── src/
        ├── components/   # Navbar, ScoreBoard, BattingTable, BowlingTable, ScoringButtons, MatchCard, Modal, Spinner, PageHeader
        ├── context/      # AuthContext (login, logout, role helpers)
        ├── pages/        # 17 pages (Home, Login, Register, Dashboard, Teams, TeamDetail, Players, PlayerProfile, Matches, CreateMatch, LiveMatch, Scorecard, Bookings, Leaderboard, Tournaments, TournamentDetail, AdminPanel)
        ├── services/     # api.js (all endpoints) + socket.js (Socket.io helpers)
        ├── App.jsx       # Full routing with ProtectedRoute + AdminRoute
        └── index.css     # Tailwind + component classes
```

---

## Setup & Run

### 1. Clone and install

```bash
# Backend
cd backend
cp .env.example .env      # fill MONGO_URI and JWT_SECRET
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start development servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open → http://localhost:3000

---

## Environment Variables (backend/.env)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/cricketclub
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

---

## User Roles

| Role    | Permissions |
|---------|-------------|
| `admin` | Full access — create matches, score balls, manage users, approve bookings |
| `scorer`| Can score balls during live matches |
| `player`| Read-only — view scorecards, stats, bookings |

Default registration role: `player`. Promote via Admin Panel.

---

## Key Features

- **Live Scoring** — Ball-by-ball with Wide, No-Ball, Wicket (dismissal type), Bye, Leg Bye
- **Undo Last Ball** — Reverts score from `scoreSnapshot` (safe rollback)
- **Real-time updates** — Socket.io rooms (`joinMatch`, `scoreUpdate`)
- **ScoringEngine** — Pure service class, fully unit-tested, separated from Express
- **RBAC** — Three-tier role system enforced on every endpoint
- **Leaderboard** — MongoDB aggregation pipelines for batting avg, SR, bowling economy
- **Points Table** — IPL-style with NRR calculated live
- **Ground Bookings** — Conflict detection on time overlap

---

## Run Tests

```bash
cd backend
npm test
```

10 unit tests cover: dot balls, boundaries, wickets, extras, over completion, innings completion, match win, NRR calculation, and error cases.

---

## Architecture Highlights

```
HTTP Request
     ↓
Express Router
     ↓
authenticate (JWT) + authorize (RBAC)
     ↓
Controller
     ↓
ScoringEngine.addDelivery()  ← pure function, no side effects
     ↓
Mongoose (MongoDB)
     ↓
Socket.io emit → all viewers
```

---

*Built as a Tier-1 SDE portfolio project demonstrating: service-layer architecture, real-time systems, role-based security, MongoDB aggregation, and production-grade error handling.*
