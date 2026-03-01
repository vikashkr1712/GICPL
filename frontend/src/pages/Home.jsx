import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { matchesAPI } from "../services/api";

/* ── data ───────────────────────────────────────────── */
const STEPS = [
  {
    step: "STEP 1",
    icon: "🏏",
    title: "Live Ball-by-Ball Scoring",
    desc: "Real-time score updates with commentary for every ball bowled during a match.",
  },
  {
    step: "STEP 2",
    icon: "📋",
    title: "Detailed Scorecards",
    desc: "Full batting & bowling tables, partnerships, and fall of wickets after every innings.",
  },
  {
    step: "STEP 3",
    icon: "🏆",
    title: "Tournament Management",
    desc: "Points table, NRR, fixtures, and knockout bracket managed automatically.",
  },
];

const MORE_FEATURES = [
  { icon: "📊", title: "Player Leaderboards", desc: "Top run-scorers and wicket-takers ranked across all seasons." },
  { icon: "👥", title: "Team & Squad Management", desc: "Build squads, assign captains, and track career stats." },
  { icon: "⚡", title: "Real-Time Updates", desc: "Socket-powered live commentary — no refresh required." },
];

const CONTACT = {
  email:     "gicpl.official@gmail.com",
  phone:     "+91 7017645320",
  address:   "Etawah, Uttar Pradesh, India",
  instagram: "https://www.instagram.com/gicp.l?igsh=MXYyZGo1MGJuNjZkOA==",
};

/* ── icons ──────────────────────────────────────────── */
function IconMail() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 8l10 7 10-7" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.8 19.8 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72 12.8 12.8 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.8 12.8 0 002.81.7A2 2 0 0122 14.92z" />
    </svg>
  );
}
function IconLocation() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

/* ── live match card ─────────────────────────────────── */
function LiveMatchCard({ match }) {
  const inn   = match.currentInningsData;
  const score = inn
    ? `${inn.totalRuns}/${inn.totalWickets} (${inn.overs || 0}.${inn.balls || 0} Ov)`
    : "In Progress";
  return (
    <Link
      to={`/matches/${match._id}`}
      className="group bg-white rounded-xl border border-neutral-200 p-5 hover:border-primary-300 hover:shadow-md transition shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-bold text-red-600 tracking-widest uppercase">Live</span>
        <span className="text-xs text-neutral-400 ml-auto">
          {match.matchType} · {match.overs} Ov
        </span>
      </div>
      <p className="font-semibold text-neutral-900 text-sm mb-1">
        {match.teamA?.name}{" "}
        <span className="text-neutral-400 font-normal mx-1">vs</span>{" "}
        {match.teamB?.name}
      </p>
      <p className="text-primary-600 text-sm font-semibold tabular-nums">{score}</p>
      {match.venue && (
        <p className="text-xs text-neutral-400 mt-1.5 truncate">{match.venue}</p>
      )}
    </Link>
  );
}

/* ── main component ─────────────────────────────────── */
export default function Home() {
  const { user } = useAuth();
  const [liveMatches, setLiveMatches] = useState([]);

  useEffect(() => {
    matchesAPI.getAll({ status: "live" })
      .then((r) => setLiveMatches(r.data.data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900">

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          {/* Tag */}
          <div className="inline-flex items-center gap-1.5 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            <span className="text-primary-500">🏏</span>
            Cricket Premier League · Etawah, UP
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 mb-3 leading-tight">
            Manage Matches with
          </h1>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary-500 mb-6 leading-tight">
            Real-Time Precision
          </h1>

          {/* Subtitle */}
          <p className="text-neutral-500 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Ball-by-ball scoring, live scorecards, team management and player
            leaderboards — all in one clean platform for GICPL.
          </p>

          {/* CTAs */}
          {user ? (
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/dashboard"
                className="inline-block bg-neutral-900 text-white text-sm font-semibold px-7 py-3 rounded-xl hover:bg-neutral-700 transition"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/matches"
                className="inline-block border border-neutral-300 text-neutral-700 text-sm font-medium px-7 py-3 rounded-xl hover:border-neutral-500 hover:text-neutral-900 transition"
              >
                View Matches
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/register"
                className="inline-block bg-neutral-900 text-white text-sm font-semibold px-7 py-3 rounded-xl hover:bg-neutral-700 transition"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="inline-block border border-neutral-300 text-neutral-700 text-sm font-medium px-7 py-3 rounded-xl hover:border-neutral-500 hover:text-neutral-900 transition"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── LIVE MATCHES ────────────────────────────────────────────────── */}
      {liveMatches.length > 0 && (
        <section className="py-10 px-6 border-b border-neutral-100 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-bold tracking-widest uppercase text-neutral-700">
                Live Now
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveMatches.map((m) => (
                <LiveMatchCard key={m._id} match={m} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PLATFORM STEPS ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400 mb-2">
              Platform
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">
              How GICPL Works
            </h2>
          </div>

          {/* Step cards */}
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="relative bg-white rounded-2xl border border-neutral-200 p-6 pt-10 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Floating icon */}
                <div className="absolute -top-5 left-6 w-10 h-10 rounded-xl bg-white border-2 border-primary-300 flex items-center justify-center text-xl shadow-sm">
                  {s.icon}
                </div>
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-neutral-400 mb-2">
                  {s.step}
                </p>
                <h3 className="text-base font-semibold text-neutral-900 mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MORE FEATURES ───────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-neutral-50 border-y border-neutral-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-neutral-900">
              Advanced Capabilities
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {MORE_FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-xl mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-sm text-neutral-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUICK LINKS ─────────────────────────────────────────────────── */}
      <section className="py-10 px-6 border-b border-neutral-100 bg-white">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-3 items-center justify-between">
          <p className="text-sm font-medium text-neutral-400">Explore the platform</p>
          <div className="flex flex-wrap gap-2">
            {[
              { to: "/matches",     label: "Matches" },
              { to: "/teams",       label: "Teams" },
              { to: "/players",     label: "Players" },
              { to: "/tournaments", label: "Tournaments" },
              { to: "/leaderboard", label: "Leaderboard" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-xs bg-white border border-neutral-200 text-neutral-600 px-4 py-1.5 rounded-full hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50 transition"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-start">
          {/* Left */}
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-400 mb-3">
              Contact Us
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-neutral-500 text-sm leading-relaxed mb-8">
              Have a question or want to know more about GICPL? Reach out
              through any of these channels.
            </p>
            {/* Follow on Instagram CTA */}
            <a
              href={CONTACT.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-neutral-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-neutral-700 transition"
            >
              <IconInstagram />
              Follow on Instagram
            </a>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-600">
                <IconMail />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">Email</p>
                <a href={`mailto:${CONTACT.email}`} className="text-sm font-medium text-neutral-800 hover:text-primary-600 transition">
                  {CONTACT.email}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-600">
                <IconPhone />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">Phone</p>
                <a href={`tel:${CONTACT.phone}`} className="text-sm font-medium text-neutral-800 hover:text-primary-600 transition">
                  {CONTACT.phone}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-600">
                <IconLocation />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">Location</p>
                <p className="text-sm font-medium text-neutral-800">{CONTACT.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-600">
                <IconInstagram />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">Instagram</p>
                <a
                  href={CONTACT.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-neutral-800 hover:text-primary-600 transition"
                >
                  @gicp.l
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-200 bg-neutral-50 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
              🏏
            </div>
            <span className="font-bold text-neutral-800 text-sm">GICPL</span>
          </div>
          <div className="flex items-center gap-5">
            {[
              { to: "/matches",     label: "Matches" },
              { to: "/teams",       label: "Teams" },
              { to: "/players",     label: "Players" },
              { to: "/leaderboard", label: "Leaderboard" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-xs text-neutral-400 hover:text-neutral-700 transition"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a
              href={CONTACT.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-primary-600 transition"
            >
              <IconInstagram />
            </a>
            <p className="text-xs text-neutral-400">
              &copy; 2026 GICPL &mdash; Made with ♥ by Harihar Bajpai
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
