import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { matchesAPI, scoringAPI, scorecardAPI } from '../services/api';
import { connectSocket, joinMatchRoom, leaveMatchRoom, onScoreUpdate, offScoreUpdate } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import ScoreBoard from '../components/ScoreBoard';
import BattingTable from '../components/BattingTable';
import BowlingTable from '../components/BowlingTable';
import ScoringButtons from '../components/ScoringButtons';
import CommentaryPanel from '../components/CommentaryPanel';
import OverSummary from '../components/OverSummary';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

export default function LiveMatch() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user, isAdmin } = useAuth();

  const [match,    setMatch]    = useState(null);
  const [innings,  setInnings]  = useState(null);
  const [scorecard,setScorecard]= useState(null);
  const [balls,    setBalls]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showWicketModal,   setShowWicketModal]   = useState(false);
  const [showBatsmanModal,  setShowBatsmanModal]  = useState(false);
  const [showBowlerModal,   setShowBowlerModal]   = useState(false);
  const [showOpeningModal,  setShowOpeningModal]  = useState(false);
  const [showStartModal,    setShowStartModal]    = useState(false);
  const [showPomModal,      setShowPomModal]      = useState(false);
  const [recoveryBattingTeam, setRecoveryBattingTeam] = useState(''); // for live match with no innings yet

  // Form state for modals
  const [pendingBall,   setPendingBall]   = useState(null);
  const [wicketType,    setWicketType]    = useState('bowled');
  const [playerOutId,   setPlayerOutId]   = useState('striker'); // 'striker' or non-striker id
  const [runsOnWicket,  setRunsOnWicket]  = useState(0);        // runs completed before run-out
  const [replaceStriker, setReplaceStriker] = useState(true);   // which position incoming batsman fills
  const [newBatsman,    setNewBatsman]    = useState('');
  const [newBowler,     setNewBowler]     = useState('');
  const [openingStriker,    setOpeningStriker]    = useState('');
  const [openingNonStriker, setOpeningNonStriker] = useState('');
  const [openingBowler,     setOpeningBowler]     = useState('');
  const [pomPlayer,         setPomPlayer]         = useState('');

  // Toss
  const [tossWinner,   setTossWinner]   = useState('');
  const [tossDecision, setTossDecision] = useState('bat');

  const pollingRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [matchRes, cardRes] = await Promise.allSettled([
        matchesAPI.getById(id),
        scorecardAPI.getScorecard(id),
      ]);
      let matchData = null;
      if (matchRes.status === 'fulfilled') {
        matchData = matchRes.value.data.data;
        setMatch(matchData);
      }
      if (cardRes.status === 'fulfilled') {
        const c = cardRes.value.data.data;
        setScorecard(c);
        if (c?.innings?.length > 0) {
          const currentInnNum = matchData?.currentInnings || 1;
          const currentInn = c.innings.find(i => i.inningsNumber === currentInnNum)
            || c.innings[c.innings.length - 1];
          if (currentInn) {
            setInnings(currentInn);
            // Fetch ball-by-ball commentary for current innings
            try {
              const ballsRes = await scorecardAPI.getBalls(id, currentInn.inningsNumber);
              setBalls(ballsRes.data.data || []);
            } catch (_) { setBalls([]); }
          }
        } else {
          setInnings(null);
          setBalls([]);
        }
      }
    } catch (_) {}
  }, [id]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));

    // Socket setup
    const socket = connectSocket();
    joinMatchRoom(id);
    onScoreUpdate(id, (data) => {
      setScorecard(data.scorecard || null);
      if (data.scorecard?.currentInnings) setInnings(data.scorecard.currentInnings);
      if (data.matchStatus) setMatch(m => m ? { ...m, status: data.matchStatus } : m);
    });

    // Fallback polling every 10s for viewers
    pollingRef.current = setInterval(fetchData, 10000);

    return () => {
      leaveMatchRoom(id);
      offScoreUpdate(id);
      clearInterval(pollingRef.current);
    };
  }, [id, fetchData]);

  // ---- Actions ----

  const handleScore = async (scoreData) => {
    // Intercept wickets to ask dismissal type
    if (scoreData.type === 'wicket') {
      setPendingBall(scoreData);
      setShowWicketModal(true);
      return;
    }
    await submitBall(scoreData);
  };

  const submitBall = async (ballData) => {
    // Build batsmanId + bowlerId from current innings state
    const batsmanId = innings?.striker?._id || innings?.striker;
    const bowlerId  = innings?.currentBowler?._id || innings?.currentBowler;
    if (!batsmanId || !bowlerId) {
      toast.error('Batsman or bowler not set. Please set opening players.');
      return;
    }

    // Map frontend type → API payload
    let payload = {
      batsmanId,
      bowlerId,
      runs:      0,
      extraType: 'none',
      extraRuns: 0,
      wicket:    false,
      wicketType: '',
      playerOutId: null,
    };

    switch (ballData.type) {
      case 'run':
        payload.runs = ballData.runs ?? 0;
        break;
      case 'wide':
        payload.extraType = 'wide';
        payload.extraRuns = 1;
        payload.runs = ballData.runs ?? 0; // runs off a wide (e.g. overthrows)
        break;
      case 'noBall':
        payload.extraType = 'no-ball';
        payload.extraRuns = 1;
        payload.runs = ballData.runs ?? 0; // runs off bat off no-ball
        break;
      case 'bye':
        payload.extraType = 'bye';
        payload.runs = ballData.runs ?? 1;
        break;
      case 'legBye':
        payload.extraType = 'leg-bye';
        payload.runs = ballData.runs ?? 1;
        break;
      case 'wicket':
        payload.wicket     = true;
        payload.wicketType = ballData.dismissalType || 'bowled';
        payload.playerOutId = ballData.playerOutId || batsmanId;
        payload.runs = ballData.runs ?? 0; // runs completed before run-out etc.
        break;
      default:
        payload.runs = ballData.runs ?? 0;
    }

    setSubmitting(true);
    try {
      const res = await scoringAPI.addBall(id, payload);
      const result = res.data?.data || {};
      const events = result.events || [];

      // Refresh data
      await fetchData();

      // Handle events from backend
      if (result.requireNewBowler) {
        toast.success('Over complete! Please select new bowler.');
        setNewBowler('');
        setShowBowlerModal(true);
      }
      if (events.includes('wicket')) {
        // Show change batsman after wicket (unless innings complete)
        if (!events.includes('inningsComplete') && !events.includes('matchComplete')) {
          setNewBatsman('');
          setShowBatsmanModal(true);
        }
      }
      if (events.includes('inningsComplete')) {
        if (result.inningsNumber === 1) {
          // 1st innings done → set opening players for 2nd innings
          toast.success('1st innings complete! Set opening players for 2nd innings.');
          setOpeningStriker(''); setOpeningNonStriker(''); setOpeningBowler('');
          // Small delay to let fetchData settle
          setTimeout(() => setShowOpeningModal(true), 600);
        } else {
          toast.success('Match complete!');
        }
      }
      if (events.includes('matchComplete')) {
        toast.success(result.resultDescription || 'Match complete!');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Score update failed.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWicketSubmit = async (e) => {
    e.preventDefault();
    setShowWicketModal(false);

    // Normalize dismissal type: 'run out' → 'run-out', 'hit wicket' → 'hit-wicket'
    const normalized = wicketType.replace(/\s+/g, '-');

    // For run-out: determine who is out and runs completed
    let outId = null;
    let runsCompleted = 0;
    if (normalized === 'run-out') {
      const strikerId = innings?.striker?._id || innings?.striker;
      const nonStrikerId = innings?.nonStriker?._id || innings?.nonStriker;
      outId = playerOutId === 'non-striker' ? nonStrikerId : strikerId;
      runsCompleted = runsOnWicket;
      // Track which position needs replacement for the incoming batsman modal
      setReplaceStriker(playerOutId !== 'non-striker');
    } else {
      // Non-run-out dismissals: striker is always out
      setReplaceStriker(true);
    }

    await submitBall({
      ...pendingBall,
      dismissalType: normalized,
      playerOutId: outId,
      runs: runsCompleted,
    });
    setPendingBall(null);
    setPlayerOutId('striker');
    setRunsOnWicket(0);
  };

  const handleUndo = async () => {
    if (!window.confirm('Undo the last ball?')) return;
    setSubmitting(true);
    try {
      await scoringAPI.undoBall(id);
      toast.success('Last ball undone.');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Undo failed.');
    } finally { setSubmitting(false); }
  };

  const handleEndInnings = async () => {
    if (!window.confirm('End this innings early? This cannot be undone.')) return;
    setSubmitting(true);
    try {
      await scoringAPI.endInnings(id);
      toast.success('Innings ended.');
      await fetchData();
      // Open opening players modal for 2nd innings
      setTimeout(() => setShowOpeningModal(true), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end innings.');
    } finally { setSubmitting(false); }
  };

  const handleSetPom = async (e) => {
    e.preventDefault();
    if (!pomPlayer) return;
    setSubmitting(true);
    try {
      await scoringAPI.setPlayerOfMatch(id, { playerId: pomPlayer });
      toast.success('Player of the Match set!');
      setShowPomModal(false);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally { setSubmitting(false); }
  };

  const handleChangeBatsman = async (e) => {
    e.preventDefault();
    if (!newBatsman) return;
    setSubmitting(true);
    try {
      await scoringAPI.changeBatsman(id, { newBatsmanId: newBatsman, isStriker: replaceStriker });
      toast.success('Batsman changed.');
      setShowBatsmanModal(false);
      setNewBatsman('');
      setReplaceStriker(true); // reset
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally { setSubmitting(false); }
  };

  const handleChangeBowler = async (e) => {
    e.preventDefault();
    if (!newBowler) return;
    setSubmitting(true);
    try {
      await scoringAPI.changeBowler(id, { newBowlerId: newBowler });
      toast.success('Bowler changed.');
      setShowBowlerModal(false);
      setNewBowler('');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally { setSubmitting(false); }
  };

  const handleSetOpening = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Determine which team is batting (for recovery: innings may not exist yet)
      const innBattingId = innings?.battingTeam?._id?.toString() || innings?.battingTeam?.toString();
      const teamAId = match?.teamA?._id?.toString();
      const isBattingA = innBattingId ? (innBattingId === teamAId)
        : (recoveryBattingTeam ? recoveryBattingTeam === teamAId : true);
      await scoringAPI.setOpeningPlayers(id, {
        strikerId: openingStriker,
        nonStrikerId: openingNonStriker,
        bowlerId: openingBowler,
        battingTeamId: isBattingA ? match.teamA?._id : match.teamB?._id,
      });
      toast.success('Opening players set! Start scoring.');
      setShowOpeningModal(false);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally { setSubmitting(false); }
  };

  const handleStartMatch = async (e) => {
    e.preventDefault();
    if (!tossWinner) { toast.error('Please select toss winner.'); return; }
    setSubmitting(true);
    try {
      await matchesAPI.start(id, { tossWinner, tossDecision });
      toast.success('Match started!');
      setShowStartModal(false);
      await fetchData();
      setShowOpeningModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start match.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Spinner size="lg" className="mt-20" />;
  if (!match)  return <div className="text-center mt-20 text-neutral-500">Match not found.</div>;

  const isLive      = match.status === 'live';
  const isCompleted = match.status === 'completed';
  const canScore    = isAdmin() && isLive;

  // Determine batting/bowling squads based on actual innings battingTeam (or recoveryBattingTeam for broken live matches)
  const innBattingId = innings?.battingTeam?._id?.toString() || innings?.battingTeam?.toString();
  const teamAId = match.teamA?._id?.toString();
  const battingTeamIsA = innBattingId
    ? (innBattingId === teamAId)
    : recoveryBattingTeam
      ? (recoveryBattingTeam === teamAId || recoveryBattingTeam === match.teamA?._id)
      : true;
  // Fallback to full team squad when playingXI not explicitly set
  const squadA = match.playingXI_A?.length > 0 ? match.playingXI_A : (match.teamA?.players || []);
  const squadB = match.playingXI_B?.length > 0 ? match.playingXI_B : (match.teamB?.players || []);
  const battingSquad  = battingTeamIsA ? squadA : squadB;
  const bowlingSquad  = battingTeamIsA ? squadB : squadA;

  // Exclude dismissed + currently batting players from batter options
  const dismissedIds     = (innings?.battingStats || []).filter(b => b.isOut).map(b => b.player?._id?.toString() || b.player?.toString());
  const currentBatterIds = [innings?.striker?._id?.toString() || innings?.striker?.toString(), innings?.nonStriker?._id?.toString() || innings?.nonStriker?.toString()].filter(Boolean);
  const batterOptions    = battingSquad.filter(p => { const pid = p._id?.toString(); return pid && !dismissedIds.includes(pid) && !currentBatterIds.includes(pid); });
  const bowlerOptions    = bowlingSquad;

  const battingTeamName  = battingTeamIsA ? match.teamA?.name : match.teamB?.name;
  const bowlingTeamName  = battingTeamIsA ? match.teamB?.name : match.teamA?.name;

  // Opening players set?
  const openersSet = !!(innings?.striker && innings?.nonStriker && innings?.currentBowler);

  // Toss display
  const tossWinTeamId = match.tossWinner?._id?.toString() || match.tossWinner?.toString();
  const tossWinName   = tossWinTeamId === match.teamA?._id?.toString() ? match.teamA?.name
    : tossWinTeamId === match.teamB?._id?.toString() ? match.teamB?.name : null;
  const tossInfo      = tossWinName
    ? `${tossWinName} won toss & elected to ${match.tossDecision === 'bat' ? 'bat' : 'field'} first`
    : null;

  const firstInnings   = scorecard?.innings?.[0];
  const secondInnings  = scorecard?.innings?.[1];
  const currentInnings = innings;
  const target         = firstInnings?.totalRuns;

  // Player IDs for table highlighting
  const strikerId     = currentInnings?.striker?._id?.toString()     || currentInnings?.striker?.toString();
  const nonStrikerId  = currentInnings?.nonStriker?._id?.toString()  || currentInnings?.nonStriker?.toString();
  const currentBowlerId = currentInnings?.currentBowler?._id?.toString() || currentInnings?.currentBowler?.toString();

  // Fall of wickets
  const fallOfWickets = (currentInnings?.battingStats || [])
    .filter(b => b.isOut)
    .map(b => ({ name: b.player?.name || '?', runs: b.runs, at: `${b.overs || 0}.${b.balls || 0}` }));

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 mb-4 transition-colors group">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Match Header Card */}
      <div className="card mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {isLive && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />LIVE
                </span>
              )}
              {isCompleted && <span className="badge bg-green-100 text-green-700 text-xs">Completed</span>}
              {match.status === 'upcoming' && <span className="badge bg-blue-100 text-blue-700 text-xs">Upcoming</span>}
              <span className="text-xs text-neutral-500">{match.matchType} · {match.totalOvers || match.overs} Ov</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-neutral-900">
              {match.teamA?.name} <span className="text-neutral-400 font-normal">vs</span> {match.teamB?.name}
            </h1>
            {match.venue && <p className="text-xs text-neutral-400 mt-0.5">📍 {match.venue}</p>}
            {tossInfo && <p className="text-xs text-primary-600 font-medium mt-1">🪙 {tossInfo}</p>}
            {isLive && currentInnings && (
              <p className="text-xs text-neutral-500 mt-1">
                🏏 <strong>{battingTeamName}</strong> batting · 🎳 <strong>{bowlingTeamName}</strong> bowling
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {isCompleted && (
              <Link to={`/matches/${id}/scorecard`} className="btn-secondary text-xs sm:text-sm px-3 py-1.5">Full Scorecard</Link>
            )}
            {isAdmin() && isCompleted && (
              <button className="btn-secondary text-xs sm:text-sm px-3 py-1.5" onClick={() => { setPomPlayer(''); setShowPomModal(true); }}>
                🏅 Set Player of Match
              </button>
            )}
            {isAdmin() && match.status === 'upcoming' && (
              <button className="btn-primary text-xs sm:text-sm px-3 py-1.5" onClick={() => { setTossWinner(''); setShowStartModal(true); }}>
                🏏 Start Match
              </button>
            )}
            {canScore && !openersSet && (
              <button className="btn-primary text-xs sm:text-sm px-3 py-1.5" onClick={() => setShowOpeningModal(true)}>
                Set Opening Players
              </button>
            )}
            {canScore && openersSet && (
              <>
                <button className="btn-secondary text-xs sm:text-sm px-3 py-1.5" onClick={() => setShowBatsmanModal(true)}>Change Batsman</button>
                <button className="btn-secondary text-xs sm:text-sm px-3 py-1.5" onClick={() => setShowBowlerModal(true)}>Change Bowler</button>
                <button
                  onClick={handleEndInnings}
                  disabled={submitting}
                  className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border-2 border-orange-400 bg-orange-50 text-orange-700 font-semibold hover:bg-orange-100 transition disabled:opacity-40"
                >
                  End Innings
                </button>
              </>
            )}
          </div>
        </div>

        {match.resultDescription && (
          <div className="mt-3 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2 text-sm font-medium text-center">
            🏆 {match.resultDescription}
          </div>
        )}
        {match.playerOfMatch?.name && (
          <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm font-medium text-center">
            🏅 Player of the Match: <strong>{match.playerOfMatch.name}</strong>
          </div>
        )}
      </div>

      {/* Openers not set warning */}
      {isLive && !openersSet && isAdmin() && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-4 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>⚠️ Opening players not set — scoring is blocked until you set them.</span>
          <button className="btn-primary text-xs px-4 py-1.5" onClick={() => setShowOpeningModal(true)}>Set Now</button>
        </div>
      )}

      {/* Main Grid: scorecard left, scoring panel right on large screens */}
      <div className={`grid gap-4 ${canScore && openersSet ? 'lg:grid-cols-3' : ''}`}>
        <div className={canScore && openersSet ? 'lg:col-span-2 space-y-4' : 'space-y-4'}>

          {currentInnings && (
            <ScoreBoard
              innings={currentInnings}
              matchStatus={match.status}
              targetRuns={currentInnings.inningsNumber === 2 ? target : undefined}
            />
          )}

          {firstInnings && secondInnings && (
            <ScoreBoard innings={firstInnings} matchStatus="completed" />
          )}

          {currentInnings?.battingStats?.length > 0 && (
            <div className="card !p-0 overflow-hidden">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 pt-3 pb-1">Batting</p>
              <div className="overflow-x-auto">
                <BattingTable
                  stats={currentInnings.battingStats}
                  extras={currentInnings.extras}
                  strikerId={strikerId}
                  nonStrikerId={nonStrikerId}
                />
              </div>
            </div>
          )}

          {currentInnings?.bowlingStats?.length > 0 && (
            <div className="card !p-0 overflow-hidden">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 pt-3 pb-1">Bowling</p>
              <div className="overflow-x-auto">
                <BowlingTable
                  stats={currentInnings.bowlingStats}
                  currentBowlerId={currentBowlerId}
                />
              </div>
            </div>
          )}

          {/* Fall of Wickets */}
          {fallOfWickets.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Fall of Wickets</p>
              <div className="flex flex-wrap gap-2">
                {fallOfWickets.map((fow, i) => (
                  <span key={i} className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-2 py-1">
                    {i + 1}. {fow.name} {fow.runs && `(${fow.runs})`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Commentary Panel */}
          {balls.length > 0 && (
            <CommentaryPanel balls={balls} />
          )}

          {!currentInnings && match.status === 'upcoming' && (
            <div className="card text-center py-12 text-neutral-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="mb-4">Match has not started yet.</p>
              {isAdmin() && (
                <button className="btn-primary text-sm px-6" onClick={() => { setTossWinner(''); setShowStartModal(true); }}>Start Match</button>
              )}
            </div>
          )}
        </div>

        {/* Scoring Panel — below on mobile, right column on desktop */}
        {canScore && openersSet && (
          <div className="space-y-3">
            {/* This Over */}
            <OverSummary
              balls={balls}
              currentOvers={currentInnings?.overs || 0}
              currentBalls={currentInnings?.balls || 0}
              bowlerName={currentInnings?.currentBowler?.name}
            />
            <ScoringButtons onScore={handleScore} onUndo={handleUndo} disabled={submitting} />
          </div>
        )}
      </div>

      {/* ──────── MODALS ──────── */}

      {/* Start Match — Toss Setup */}
      <Modal isOpen={showStartModal} onClose={() => setShowStartModal(false)} title="🏏 Start Match — Toss" size="md">
        <form onSubmit={handleStartMatch} className="space-y-5">
          <div>
            <p className="label mb-2">Who won the toss?</p>
            <div className="grid grid-cols-2 gap-3">
              {[match.teamA, match.teamB].filter(Boolean).map(team => (
                <button
                  type="button"
                  key={team._id}
                  onClick={() => setTossWinner(team._id)}
                  className={`border-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    tossWinner === team._id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </div>

          {tossWinner && (
            <div>
              <p className="label mb-2">
                {tossWinner === match.teamA?._id ? match.teamA?.name : match.teamB?.name} elected to…
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[{ val: 'bat', icon: '🏏', label: 'Bat First' }, { val: 'bowl', icon: '🧤', label: 'Field First' }].map(opt => (
                  <button
                    type="button"
                    key={opt.val}
                    onClick={() => setTossDecision(opt.val)}
                    className={`border-2 rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      tossDecision === opt.val
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tossWinner && (
            <div className="bg-neutral-50 rounded-xl px-4 py-3 text-sm text-neutral-700">
              🪙 <strong>{tossWinner === match.teamA?._id ? match.teamA?.name : match.teamB?.name}</strong> won toss &amp; elected to{' '}
              <strong className="text-primary-600">{tossDecision === 'bat' ? 'bat first' : 'field first'}</strong>.<br />
              <span className="text-xs text-neutral-500">
                Batting first:{' '}
                <strong>
                  {tossDecision === 'bat'
                    ? (tossWinner === match.teamA?._id ? match.teamA?.name : match.teamB?.name)
                    : (tossWinner === match.teamA?._id ? match.teamB?.name : match.teamA?.name)
                  }
                </strong>
              </span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowStartModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={!tossWinner || submitting}>
              {submitting ? 'Starting…' : '🏏 Start Match'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Set Opening Players */}
      <Modal isOpen={showOpeningModal} onClose={() => setShowOpeningModal(false)} title="Set Opening Players" size="md">
        <form onSubmit={handleSetOpening} className="space-y-4">
          {/* Recovery: let admin pick which team bats when innings doesn't exist yet */}
          {!innings && (
            <div>
              <p className="label mb-2">Who is batting first?</p>
              <div className="grid grid-cols-2 gap-3">
                {[match.teamA, match.teamB].filter(Boolean).map(team => (
                  <button
                    type="button"
                    key={team._id}
                    onClick={() => setRecoveryBattingTeam(team._id)}
                    className={`border-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                      (recoveryBattingTeam || match.teamA?._id) === team._id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {innings && (
            <div className="bg-primary-50 rounded-lg px-3 py-2 text-xs text-primary-700 font-medium">
              🏏 <strong>{battingTeamName}</strong> is batting &nbsp;·&nbsp; 🎳 <strong>{bowlingTeamName}</strong> is bowling
            </div>
          )}
          <div>
            <label className="label">Opening Striker ({battingTeamName})</label>
            <select className="input" required value={openingStriker} onChange={e => setOpeningStriker(e.target.value)}>
              <option value="">— select batter —</option>
              {battingSquad.map(p => (
                <option key={p._id || p} value={p._id || p}>{p.name || p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Non-Striker ({battingTeamName})</label>
            <select className="input" required value={openingNonStriker} onChange={e => setOpeningNonStriker(e.target.value)}>
              <option value="">— select batter —</option>
              {battingSquad.filter(p => (p._id || p) !== openingStriker).map(p => (
                <option key={p._id || p} value={p._id || p}>{p.name || p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Opening Bowler ({bowlingTeamName})</label>
            <select className="input" required value={openingBowler} onChange={e => setOpeningBowler(e.target.value)}>
              <option value="">— select bowler —</option>
              {bowlingSquad.map(p => (
                <option key={p._id || p} value={p._id || p}>{p.name || p}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowOpeningModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving…' : 'Start Scoring ▶'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Wicket Dismissal */}
      <Modal isOpen={showWicketModal} onClose={() => setShowWicketModal(false)} title="Select Dismissal">
        <form onSubmit={handleWicketSubmit} className="space-y-4">
          {/* Dismissal type */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['bowled', 'caught', 'lbw', 'run out', 'stumped', 'hit wicket', 'other'].map(d => (
              <button
                type="button"
                key={d}
                onClick={() => { setWicketType(d); if (d !== 'run out') { setRunsOnWicket(0); setPlayerOutId('striker'); } }}
                className={`border-2 rounded-xl py-2 px-2 text-xs font-semibold capitalize transition-all ${
                  wicketType === d ? 'border-red-400 bg-red-50 text-red-700' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Run Out extras: who is out + runs completed */}
          {wicketType === 'run out' && (
            <div className="space-y-3 border border-orange-200 bg-orange-50 rounded-xl p-3">
              <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Run Out Details</p>

              {/* Who is out? */}
              <div>
                <p className="text-xs text-neutral-600 mb-1.5 font-medium">Who is out?</p>
                <div className="flex gap-2">
                  {[{ key: 'striker', label: innings?.striker?.name || 'Striker' }, { key: 'non-striker', label: innings?.nonStriker?.name || 'Non-Striker' }].map(opt => (
                    <button
                      type="button"
                      key={opt.key}
                      onClick={() => setPlayerOutId(opt.key)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all ${
                        playerOutId === opt.key
                          ? 'border-orange-400 bg-orange-100 text-orange-800'
                          : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Runs completed */}
              <div>
                <p className="text-xs text-neutral-600 mb-1.5 font-medium">Runs completed before run out</p>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map(r => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRunsOnWicket(r)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all ${
                        runsOnWicket === r
                          ? 'border-orange-400 bg-orange-100 text-orange-800'
                          : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowWicketModal(false)}>Cancel</button>
            <button type="submit" className="flex-1 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition">Confirm Wicket</button>
          </div>
        </form>
      </Modal>

      {/* Change Batsman */}
      <Modal isOpen={showBatsmanModal} onClose={() => setShowBatsmanModal(false)} title="Incoming Batsman">
        <form onSubmit={handleChangeBatsman} className="space-y-4">
          <div>
            <label className="label">Select New Batsman ({battingTeamName})</label>
            {batterOptions.length === 0
              ? <p className="text-sm text-neutral-400 py-2">All players have batted.</p>
              : (
                <select className="input" required value={newBatsman} onChange={e => setNewBatsman(e.target.value)}>
                  <option value="">— select player —</option>
                  {batterOptions.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              )
            }
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowBatsmanModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting || batterOptions.length === 0}>
              {submitting ? 'Saving…' : 'Set Batsman'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Bowler */}
      <Modal isOpen={showBowlerModal} onClose={() => setShowBowlerModal(false)} title="Change Bowler">
        <form onSubmit={handleChangeBowler} className="space-y-4">
          <div>
            <label className="label">Select New Bowler ({bowlingTeamName})</label>
            <select className="input" required value={newBowler} onChange={e => setNewBowler(e.target.value)}>
              <option value="">— select player —</option>
              {bowlerOptions.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowBowlerModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving…' : 'Set Bowler'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Player of Match */}
      <Modal isOpen={showPomModal} onClose={() => setShowPomModal(false)} title="🏅 Player of the Match">
        <form onSubmit={handleSetPom} className="space-y-4">
          <div>
            {(() => {
              const winnerId = match?.winner?._id?.toString() || match?.winner?.toString();
              const teamAId  = match?.teamA?._id?.toString();
              const isWinnerA = winnerId === teamAId;
              const winnerName = isWinnerA ? match?.teamA?.name : match?.teamB?.name;
              const winnerPlayers = isWinnerA
                ? (match?.playingXI_A?.length > 0 ? match.playingXI_A : match?.teamA?.players || [])
                : (match?.playingXI_B?.length > 0 ? match.playingXI_B : match?.teamB?.players || []);
              return (
                <>
                  <label className="label">Select Player {winnerName ? `(${winnerName})` : ''}</label>
                  <select className="input" required value={pomPlayer} onChange={e => setPomPlayer(e.target.value)}>
                    <option value="">— select player —</option>
                    {winnerPlayers.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </>
              );
            })()}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowPomModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting || !pomPlayer}>
              {submitting ? 'Saving…' : 'Set Player of Match'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
