# 🏏 GICPL — Cricket Club Management System

<p align="center">
  <img src="frontend/public/logo.png" alt="GICPL Logo" width="120" />
</p>

<p align="center">
  <strong>GICPL</strong> (Government Inter College Premier League) is a full-stack, CricHeroes-style cricket club management platform featuring live ball-by-ball scoring, real-time scorecards, detailed player statistics, leaderboards, and tournament management — all wrapped in a modern, responsive UI.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-Realtime-010101?logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.3-06B6D4?logo=tailwindcss&logoColor=white" />
</p>

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [User Roles & Permissions](#-user-roles--permissions)
- [Live Scoring Engine](#-live-scoring-engine)
- [API Endpoints](#-api-endpoints)
- [Real-Time Architecture](#-real-time-architecture)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🏟️ Tournament Management
- Create and manage multiple tournaments (e.g., Holi Cup 2026, Corporate League)
- Automatic **Points Table** with IPL-style ranking (W, L, NR, Pts, NRR)
- Net Run Rate (NRR) calculated live after every match
- Delete tournaments with full cascade cleanup (matches, innings, balls)

### 🏏 Live Ball-by-Ball Scoring
- Real-time scoring dashboard for ongoing matches
- Supports all delivery types: **Dot, 1, 2, 3, 4, 6, Wide, No-Ball, Bye, Leg Bye**
- **Wicket dismissals**: Bowled, Caught, LBW, Stumped, Run Out, Hit Wicket, Caught & Bowled
- **Run Out with runs**: Score runs (1, 2, 3) on the same delivery as a wicket
- **Run Out player selection**: Choose which batsman (striker or non-striker) is out
- **Undo Last Ball**: Safely reverts the last delivery using stored `scoreSnapshot`
- Over-by-over summary with ball-by-ball breakdown
- Live commentary panel

### 📊 Scorecards & Statistics
- Detailed batting scorecards (runs, balls, 4s, 6s, SR)
- Detailed bowling scorecards (overs, maidens, runs, wickets, economy)
- Fall of Wickets (FOW) timeline
- **Player of the Match** selection from winning team's squad
- Individual Player Profile pages with career stats across tournaments

### 🏆 Leaderboard
- **Batting**: Most Runs, Highest Average, Best Strike Rate, Most 4s, Most 6s
- **Bowling**: Most Wickets, Best Economy, Best Average, Best Strike Rate
- Powered by MongoDB aggregation pipelines for real-time accuracy

### 👥 Team & Player Management
- Create teams with squad rosters
- Add/remove players from teams
- **Smart player cleanup**: Deleting a player removes them from all teams; deleting the last team for a player auto-removes the orphaned player
- Player profiles with per-tournament and career statistics

### 🔐 Authentication & Authorization
- JWT-based authentication with secure token management
- **Three-tier RBAC** (Role-Based Access Control): Admin, Scorer, Player
- Protected routes on both frontend and backend
- Admin Panel for user management and role promotion

### ⚡ Real-Time Updates
- Socket.io powered live match updates
- All viewers see score changes instantly without refreshing
- Room-based architecture for efficient event routing (`joinMatch` / `scoreUpdate`)

### 🎨 Modern UI/UX
- Clean white + green (#22c55e) theme
- Fully responsive — works on desktop, tablet, and mobile
- Tailwind CSS utility-first styling
- Smooth transitions and hover effects
- Toast notifications for user feedback

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite 4, Tailwind CSS 3.3, React Router v6, Axios, Socket.io-client, Recharts, react-hot-toast, date-fns |
| **Backend** | Node.js, Express 4.18, Socket.io 4.6 |
| **Database** | MongoDB Atlas + Mongoose 7.5 |
| **Authentication** | JWT (jsonwebtoken) + bcryptjs |
| **Security** | Helmet, express-rate-limit, express-validator, CORS |
| **Logging** | Winston + Morgan |
| **Testing** | Jest + Supertest |
| **Deployment** | Vercel (Frontend) + Render (Backend) |

---

## 📁 Project Structure

```
GICPL/
├── README.md
├── .gitignore
│
├── backend/
│   ├── server.js                    # Express + Socket.io server entry
│   ├── package.json
│   ├── .env.example                 # Environment variable template
│   │
│   ├── config/
│   │   ├── db.js                    # MongoDB connection with Mongoose
│   │   └── logger.js                # Winston logger configuration
│   │
│   ├── middleware/
│   │   ├── authenticate.js          # JWT token verification
│   │   ├── authorize.js             # Role-based access control
│   │   ├── errorHandler.js          # Global error handling middleware
│   │   └── validate.js              # express-validator request validation
│   │
│   ├── models/
│   │   ├── User.js                  # User schema (name, email, role)
│   │   ├── Team.js                  # Team schema (name, players[])
│   │   ├── Player.js                # Player schema (name, teams[], stats)
│   │   ├── Tournament.js            # Tournament schema (name, teams[], matches[])
│   │   ├── Match.js                 # Match schema (teams, toss, result, innings)
│   │   ├── Innings.js               # Innings schema (batting/bowling stats)
│   │   ├── Ball.js                  # Ball-by-ball delivery schema
│   │   └── Booking.js               # Ground booking schema
│   │
│   ├── controllers/
│   │   ├── authController.js        # Register, login, token refresh
│   │   ├── userController.js        # User CRUD, role management
│   │   ├── teamController.js        # Team CRUD, add/remove players
│   │   ├── playerController.js      # Player CRUD, profile stats
│   │   ├── tournamentController.js  # Tournament CRUD, delete with cascade
│   │   ├── matchController.js       # Match CRUD, delete with cascade
│   │   ├── scoringController.js     # Ball-by-ball scoring, undo, POM
│   │   ├── scorecardController.js   # Full scorecard generation
│   │   ├── leaderboardController.js # Aggregation-based leaderboards
│   │   └── bookingController.js     # Ground booking management
│   │
│   ├── routes/
│   │   ├── authRoutes.js            # POST /api/auth/register, /login
│   │   ├── userRoutes.js            # GET/PUT /api/users
│   │   ├── teamRoutes.js            # CRUD /api/teams
│   │   ├── playerRoutes.js          # CRUD /api/players
│   │   ├── tournamentRoutes.js      # CRUD /api/tournaments (+ DELETE)
│   │   ├── matchRoutes.js           # CRUD /api/matches (+ DELETE)
│   │   ├── scoringRoutes.js         # POST /api/scoring/:matchId/ball
│   │   ├── scorecardRoutes.js       # GET /api/scorecard/:matchId
│   │   ├── leaderboardRoutes.js     # GET /api/leaderboard
│   │   └── bookingRoutes.js         # CRUD /api/bookings
│   │
│   ├── services/
│   │   └── scoringEngine.js         # ⭐ Core scoring engine (pure, testable)
│   │
│   ├── tests/
│   │   └── scoringEngine.test.js    # 10 unit tests for scoring engine
│   │
│   ├── scripts/
│   │   ├── checkDb.js               # Database inspection utility
│   │   ├── recalcStats.js           # Recalculate player statistics
│   │   ├── seed2026Holi.js          # Seed data scripts
│   │   ├── seedHoliTournament.js
│   │   ├── seedHoliTournamentV2.js
│   │   └── seedHoliV3.js
│   │
│   └── logs/                        # Winston log output directory
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js               # Vite config with API proxy
    ├── tailwind.config.js           # Tailwind with custom green primary
    ├── postcss.config.js
    ├── vercel.json                  # Vercel SPA rewrite rules
    ├── .env.example                 # Frontend env var template
    │
    ├── public/
    │   └── logo.png                 # GICPL logo
    │
    └── src/
        ├── main.jsx                 # React entry point
        ├── App.jsx                  # Router + protected routes
        ├── index.css                # Tailwind base + custom classes
        │
        ├── context/
        │   └── AuthContext.jsx      # Auth state (login, logout, user, role)
        │
        ├── services/
        │   ├── api.js               # Axios client (all API endpoints)
        │   └── socket.js            # Socket.io client helpers
        │
        ├── components/
        │   ├── Navbar.jsx           # Responsive nav with auth-aware menu
        │   ├── ScoreBoard.jsx       # Live score display component
        │   ├── BattingTable.jsx     # Batting scorecard table
        │   ├── BowlingTable.jsx     # Bowling scorecard table
        │   ├── ScoringButtons.jsx   # Ball type input buttons
        │   ├── CommentaryPanel.jsx  # Ball-by-ball commentary
        │   ├── OverSummary.jsx      # Over-by-over breakdown
        │   ├── MatchCard.jsx        # Match list card component
        │   ├── Modal.jsx            # Reusable modal component
        │   ├── PageHeader.jsx       # Page title header
        │   └── Spinner.jsx          # Loading spinner
        │
        └── pages/
            ├── Home.jsx             # Landing page with hero + features
            ├── Login.jsx            # Login form
            ├── Register.jsx         # Registration form
            ├── Dashboard.jsx        # User dashboard
            ├── AdminPanel.jsx       # Admin: user management
            ├── Teams.jsx            # Teams listing
            ├── TeamDetail.jsx       # Single team view with roster
            ├── Players.jsx          # Players listing
            ├── PlayerProfile.jsx    # Player stats & career overview
            ├── Matches.jsx          # Matches listing (+ admin delete)
            ├── CreateMatch.jsx      # New match form
            ├── LiveMatch.jsx        # ⭐ Live scoring interface
            ├── Scorecard.jsx        # Full match scorecard
            ├── Tournaments.jsx      # Tournaments listing (+ admin delete)
            ├── TournamentDetail.jsx # Points table + match list
            └── Leaderboard.jsx      # Batting & bowling leaderboards
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **MongoDB** (local installation or [MongoDB Atlas](https://www.mongodb.com/atlas) cloud cluster)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/vikashkr1712/GICPL.git
cd GICPL
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env     # Edit .env with your MongoDB URI and JWT secret
npm install
```

### 3. Setup Frontend

```bash
cd ../frontend
cp .env.example .env     # (Optional) Set VITE_API_URL for production
npm install
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

### 5. Open in Browser

```
http://localhost:3000
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/gicpl` |
| `JWT_SECRET` | Secret key for JWT signing | `your_super_secret_key_here` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `CLIENT_URL` | Allowed CORS origins (comma-separated) | `http://localhost:3000,https://gicpl.vercel.app` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://gicpl-backend.onrender.com/api` |
| `VITE_SOCKET_URL` | Backend Socket.io URL | `https://gicpl-backend.onrender.com` |

> **Note:** In local development, the Vite proxy handles API routing so frontend `.env` is optional.

---

## 👥 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — create/edit/delete matches, tournaments, teams, players; score balls; manage users; promote roles |
| **Scorer** | Can score balls during live matches |
| **Player** | Read-only — view scorecards, stats, leaderboards, tournament standings |

- Default registration role: **Player**
- Admins can promote users via the **Admin Panel**

---

## ⚙️ Live Scoring Engine

The heart of GICPL is the **ScoringEngine** — a pure, deterministic, fully unit-tested service class that processes every ball delivery.

### Supported Delivery Types

| Type | Description |
|------|-------------|
| `normal` | Regular delivery (0, 1, 2, 3, 4, 6 runs) |
| `wide` | Wide ball (+1 extra, no ball count) |
| `no-ball` | No ball (+1 extra, no ball count) |
| `bye` | Bye runs (counts as a legal delivery) |
| `leg-bye` | Leg bye runs (counts as a legal delivery) |
| `wicket` | All dismissal types (Bowled, Caught, LBW, Stumped, Run Out, Hit Wicket, Caught & Bowled) |

### Special Scenarios

- **Run Out + Runs**: Score 1, 2, or 3 runs on the same delivery as a run-out wicket
- **Run Out Player Selection**: Choose whether the striker or non-striker is dismissed
- **Undo**: Safely reverts the last ball using a stored `scoreSnapshot` (batting stats, bowling stats, team score)
- **Over Completion**: Automatic over increment and bowler rotation
- **Innings Completion**: Detects all-out or overs completed
- **Match Result**: Calculates winner, margin, and updates tournament standings

### Engine Architecture

```
ScoringEngine.addDelivery(ball)
    │
    ├── Validate delivery input
    ├── Calculate runs, extras, legal ball
    ├── Update batting stats (striker/non-striker)
    ├── Update bowling stats (current bowler)
    ├── Update team score and wickets
    ├── Check for over completion
    ├── Check for innings completion
    ├── Check for match result
    ├── Store scoreSnapshot for undo
    └── Return events array ['overComplete', 'inningsComplete', 'matchComplete', 'wicket']
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users (admin) |
| `PUT` | `/api/users/:id/role` | Update user role (admin) |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teams` | List all teams |
| `GET` | `/api/teams/:id` | Get team details with players |
| `POST` | `/api/teams` | Create a new team (admin) |
| `PUT` | `/api/teams/:id` | Update team (admin) |
| `DELETE` | `/api/teams/:id` | Delete team + cleanup players (admin) |
| `POST` | `/api/teams/:id/players` | Add player to team (admin) |
| `DELETE` | `/api/teams/:id/players/:playerId` | Remove player from team (admin) |

### Players
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/players` | List all players |
| `GET` | `/api/players/:id` | Get player profile with stats |
| `POST` | `/api/players` | Create a new player (admin) |
| `DELETE` | `/api/players/:id` | Delete player from all teams (admin) |

### Tournaments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tournaments` | List all tournaments |
| `GET` | `/api/tournaments/:id` | Get tournament with points table |
| `POST` | `/api/tournaments` | Create tournament (admin) |
| `DELETE` | `/api/tournaments/:id` | Delete tournament + all matches (admin) |

### Matches
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/matches` | List all matches |
| `GET` | `/api/matches/:id` | Get match details |
| `POST` | `/api/matches` | Create a new match (admin) |
| `DELETE` | `/api/matches/:id` | Delete match + innings + balls (admin) |

### Scoring (Live Match)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scoring/:matchId/ball` | Record a ball delivery |
| `POST` | `/api/scoring/:matchId/undo` | Undo the last ball |
| `POST` | `/api/scoring/:matchId/change-batsman` | Swap striker/non-striker |
| `POST` | `/api/scoring/:matchId/change-bowler` | Change current bowler |
| `POST` | `/api/scoring/:matchId/pom` | Set Player of the Match |
| `GET` | `/api/scoring/:matchId/state` | Get current match scoring state |

### Scorecard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/scorecard/:matchId` | Full scorecard with batting, bowling, FOW |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/leaderboard` | Batting & bowling leaderboard stats |

---

## 🏗️ Real-Time Architecture

```
┌─────────────┐         HTTP POST /api/scoring/:id/ball         ┌─────────────┐
│             │ ──────────────────────────────────────────────▶ │             │
│   React     │                                                 │   Express   │
│   Frontend  │ ◀─────── Socket.io 'scoreUpdate' ────────────  │   Backend   │
│             │                                                 │             │
└─────────────┘                                                 └──────┬──────┘
       │                                                               │
       │  socket.on('scoreUpdate')                                     │
       │  → Re-fetch match state                        ScoringEngine  │
       │  → Update UI instantly                         .addDelivery() │
       │                                                               │
       ▼                                                               ▼
  ┌──────────┐                                                 ┌──────────────┐
  │ Viewers  │  All connected clients see                      │   MongoDB    │
  │ (Room)   │  live score updates                             │   Atlas      │
  └──────────┘                                                 └──────────────┘
```

### Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `joinMatch` | Client → Server | Join a match room for updates |
| `leaveMatch` | Client → Server | Leave a match room |
| `scoreUpdate` | Server → Room | Broadcast score change to all viewers |

---

## 🌐 Deployment

### Backend — [Render](https://render.com)

1. Create a new **Web Service** on Render
2. Connect your GitHub repo (`vikashkr1712/GICPL`)
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Add environment variables:
   - `MONGO_URI` — Your MongoDB Atlas connection string
   - `JWT_SECRET` — A strong secret key
   - `NODE_ENV` — `production`
   - `CLIENT_URL` — Your Vercel frontend URL (e.g., `https://gicpl.vercel.app`)

### Frontend — [Vercel](https://vercel.com)

1. Import the GitHub repo on Vercel
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add environment variables:
   - `VITE_API_URL` — Your Render backend URL + `/api` (e.g., `https://gicpl-backend.onrender.com/api`)
   - `VITE_SOCKET_URL` — Your Render backend URL (e.g., `https://gicpl-backend.onrender.com`)

### Post-Deployment

After both are deployed, update Render's `CLIENT_URL` env var with the actual Vercel URL and redeploy the backend.

---

## 🧪 Testing

```bash
cd backend
npm test
```

### Test Coverage (ScoringEngine)

| Test Case | Description |
|-----------|-------------|
| Dot Ball | Verify 0 runs, legal ball counted |
| Single | Verify 1 run, strike rotation |
| Boundary (4) | Verify 4 runs, no strike rotation |
| Six | Verify 6 runs, no strike rotation |
| Wide | Verify +1 extra, ball not counted |
| No Ball | Verify +1 extra, ball not counted |
| Wicket (Bowled) | Verify wicket credited to bowler |
| Run Out | Verify wicket NOT credited to bowler |
| Over Completion | Verify over increments after 6 legal balls |
| Innings Completion | Verify all-out or overs exhausted detection |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Vikash Kumar**
- GitHub: [@vikashkr1712](https://github.com/vikashkr1712)

---

<p align="center">
  Made with ❤️ for cricket lovers
</p>
