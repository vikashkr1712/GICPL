const Match = require('../models/Match');
const Innings = require('../models/Innings');
const Ball = require('../models/Ball');
const Player = require('../models/Player');
const Tournament = require('../models/Tournament');
const ScoringEngine = require('../services/scoringEngine');

/**
 * Guards: ensure only admin or the assigned scorer can modify scoring.
 */
const checkScorerAccess = (match, userId, userRole) => {
  if (userRole === 'admin') return true;
  if (!match.scorer) return false;
  return match.scorer.toString() === userId.toString();
};

// ── Helper: build proper result description ──────────────────────────
function buildResultDescription(winningTeamName, winningInningsNumber, winnerInnings, loserInnings) {
  if (winningInningsNumber === 2) {
    // Chasing team won — won by # wickets
    const wicketsLeft = 10 - winnerInnings.totalWickets;
    return `${winningTeamName} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
  } else {
    // Defending team won — won by # runs
    const runsMargin = loserInnings
      ? winnerInnings.totalRuns - loserInnings.totalRuns
      : winnerInnings.totalRuns;
    return `${winningTeamName} won by ${Math.max(0, runsMargin)} run${runsMargin !== 1 ? 's' : ''}`;
  }
}

// ── Helper: update tournament points table after match completes ─────
async function updateTournamentPointsTable(match) {
  if (!match.tournament) return;
  const tournament = await Tournament.findById(match.tournament);
  if (!tournament) return;

  const innings1 = await Innings.findOne({ match: match._id, inningsNumber: 1 });
  const innings2 = await Innings.findOne({ match: match._id, inningsNumber: 2 });
  if (!innings1 || !innings2) return;

  const isTie = !match.winner;

  const teamAId = match.teamA.toString();
  const teamBId = match.teamB.toString();
  const winnerId = match.winner ? match.winner.toString() : null;

  // Determine runs/overs for NRR
  // innings1.battingTeam batted first
  const firstBattingId = innings1.battingTeam.toString();
  const secondBattingId = innings2.battingTeam.toString();
  const firstOvers  = innings1.overs + innings1.balls / 6;
  const secondOvers = innings2.overs + innings2.balls / 6;

  for (const teamId of [teamAId, teamBId]) {
    let entry = tournament.pointsTable.find(r => r.team && r.team.toString() === teamId);
    if (!entry) {
      tournament.pointsTable.push({ team: teamId, played: 0, won: 0, lost: 0, noResult: 0, points: 0, nrr: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0 });
      entry = tournament.pointsTable[tournament.pointsTable.length - 1];
    }

    entry.played += 1;

    if (isTie) {
      entry.points += 1;
      entry.noResult += 1;
    } else if (winnerId === teamId) {
      entry.points += 2;
      entry.won += 1;
    } else {
      entry.lost += 1;
    }

    // NRR: add runs for/against
    if (teamId === firstBattingId) {
      entry.runsFor    = (entry.runsFor    || 0) + innings1.totalRuns;
      entry.oversFor   = (entry.oversFor   || 0) + firstOvers;
      entry.runsAgainst= (entry.runsAgainst|| 0) + innings2.totalRuns;
      entry.oversAgainst= (entry.oversAgainst|| 0) + secondOvers;
    } else {
      entry.runsFor    = (entry.runsFor    || 0) + innings2.totalRuns;
      entry.oversFor   = (entry.oversFor   || 0) + secondOvers;
      entry.runsAgainst= (entry.runsAgainst|| 0) + innings1.totalRuns;
      entry.oversAgainst= (entry.oversAgainst|| 0) + firstOvers;
    }

    entry.nrr = ScoringEngine.calcNRR(entry.runsFor, entry.oversFor, entry.runsAgainst, entry.oversAgainst);
  }

  // Sort points table
  tournament.pointsTable.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });

  await tournament.save();
}

// @POST /api/scoring/:matchId/add-ball
exports.addBall = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const {
      runs = 0, extraType = 'none', extraRuns = 0,
      wicket = false, wicketType = '',
      batsmanId, bowlerId, playerOutId = null
    } = req.body;

    // Fetch match + innings
    const match = await Match.findById(matchId)
      .populate('teamA', 'name')
      .populate('teamB', 'name')
      .populate('winner', 'name');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'live') {
      return res.status(400).json({ success: false, message: 'Match is not live' });
    }

    if (!checkScorerAccess(match, req.user._id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to score this match' });
    }

    const innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInnings });
    if (!innings) return res.status(404).json({ success: false, message: 'Innings not found' });

    // Determine target for 2nd innings
    let target = null;
    if (match.currentInnings === 2) {
      target = match.target !== null ? match.target - 1 : null;
      if (target === null) {
        const firstInnings = await Innings.findOne({ match: matchId, inningsNumber: 1 });
        if (firstInnings) target = firstInnings.totalRuns;
      }
    }

    // Run scoring engine
    const engine = new ScoringEngine(innings.toObject(), match.totalOvers, target);
    const { updatedState, events, battingStatUpdate, bowlingStatUpdate, scoreSnapshot } = engine.addDelivery({
      runs, extraType, extraRuns: extraRuns || (extraType === 'wide' || extraType === 'no-ball' ? 1 : 0),
      wicket, wicketType, batsmanId, bowlerId, playerOutId
    });

    // Get player names for commentary
    const [batsmanDoc, bowlerDoc] = await Promise.all([
      Player.findById(batsmanId, 'name').lean(),
      Player.findById(bowlerId, 'name').lean()
    ]);
    const commentary = ScoringEngine.generateCommentary(
      { runs, extraType, wicket, wicketType },
      batsmanDoc?.name || 'Batsman',
      bowlerDoc?.name || 'Bowler'
    );

    // Save ball document
    const isLegal = extraType !== 'wide' && extraType !== 'no-ball';
    const ballDoc = await Ball.create({
      match: matchId,
      innings: innings._id,
      inningsNumber: match.currentInnings,
      over:       innings.overs,
      ballNumber: isLegal ? innings.balls + 1 : innings.balls,
      batsman: batsmanId,
      bowler:  bowlerId,
      runs,
      extraRuns: isLegal ? 0 : (extraRuns || 1),
      extraType,
      wicket,
      wicketType: wicketType || '',
      playerOut: playerOutId,
      scoreSnapshot,
      commentary
    });

    // Apply engine state to innings document
    innings.totalRuns    = updatedState.totalRuns;
    innings.totalWickets = updatedState.totalWickets;
    innings.overs        = updatedState.overs;
    innings.balls        = updatedState.balls;
    innings.isCompleted  = updatedState.isCompleted;
    innings.striker      = updatedState.striker;
    innings.nonStriker   = updatedState.nonStriker;

    // Update extras breakdown
    if (!innings.extras) innings.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
    if (extraType === 'wide')    { innings.extras.wides   = (innings.extras.wides   || 0) + 1; innings.extras.total = (innings.extras.total || 0) + 1 + (runs || 0); }
    if (extraType === 'no-ball') { innings.extras.noBalls = (innings.extras.noBalls || 0) + 1; innings.extras.total = (innings.extras.total || 0) + 1 + (runs || 0); }
    if (extraType === 'bye')     { innings.extras.byes    = (innings.extras.byes    || 0) + runs; innings.extras.total = (innings.extras.total || 0) + runs; }
    if (extraType === 'leg-bye') { innings.extras.legByes = (innings.extras.legByes || 0) + runs; innings.extras.total = (innings.extras.total || 0) + runs; }

    // Partnership tracking
    if (isLegal && extraType !== 'bye' && extraType !== 'leg-bye') {
      innings.partnershipRuns  = (innings.partnershipRuns  || 0) + runs;
      innings.partnershipBalls = (innings.partnershipBalls || 0) + 1;
    } else if (isLegal) {
      innings.partnershipBalls = (innings.partnershipBalls || 0) + 1;
    }
    // Reset partnership on wicket
    if (wicket) {
      innings.partnershipRuns  = 0;
      innings.partnershipBalls = 0;
    }

    // Update per-innings batting stats
    const bIdx = innings.battingStats.findIndex(s => s.player.toString() === batsmanId.toString());
    if (bIdx !== -1) {
      innings.battingStats[bIdx].runs   += battingStatUpdate.runs;
      innings.battingStats[bIdx].balls  += battingStatUpdate.balls;
      innings.battingStats[bIdx].fours  += battingStatUpdate.fours;
      innings.battingStats[bIdx].sixes  += battingStatUpdate.sixes;
      if (battingStatUpdate.isOut && wicketType !== 'run-out') {
        // Normal dismissal: striker is out
        innings.battingStats[bIdx].isOut = true;
        innings.battingStats[bIdx].dismissal = wicketType || 'out';
      }
    } else {
      innings.battingStats.push({
        player: batsmanId,
        runs:  battingStatUpdate.runs,
        balls: battingStatUpdate.balls,
        fours: battingStatUpdate.fours,
        sixes: battingStatUpdate.sixes,
        isOut: battingStatUpdate.isOut && wicketType !== 'run-out',
        dismissal: (battingStatUpdate.isOut && wicketType !== 'run-out') ? (wicketType || 'out') : ''
      });
    }

    // For run-outs: mark the actual playerOut (may be non-striker)
    if (wicket && wicketType === 'run-out' && playerOutId) {
      const outIdx = innings.battingStats.findIndex(s => s.player.toString() === playerOutId.toString());
      if (outIdx !== -1) {
        innings.battingStats[outIdx].isOut = true;
        innings.battingStats[outIdx].dismissal = 'run-out';
      } else {
        // Player not yet in battingStats (non-striker who hasn't faced a ball)
        innings.battingStats.push({
          player: playerOutId,
          runs: 0, balls: 0, fours: 0, sixes: 0,
          isOut: true,
          dismissal: 'run-out'
        });
      }
    }

    // Update per-innings bowling stats
    const wIdx = innings.bowlingStats.findIndex(s => s.player.toString() === bowlerId.toString());
    if (wIdx !== -1) {
      innings.bowlingStats[wIdx].balls        += bowlingStatUpdate.balls;
      innings.bowlingStats[wIdx].runsConceded += bowlingStatUpdate.runsConceded;
      innings.bowlingStats[wIdx].wickets      += bowlingStatUpdate.wickets;
      innings.bowlingStats[wIdx].wides        += bowlingStatUpdate.wides;
      innings.bowlingStats[wIdx].noBalls      += bowlingStatUpdate.noBalls;
      innings.bowlingStats[wIdx].overs = Math.floor(innings.bowlingStats[wIdx].balls / 6);
    } else {
      innings.bowlingStats.push({
        player:       bowlerId,
        overs:        0,
        balls:        bowlingStatUpdate.balls,
        runsConceded: bowlingStatUpdate.runsConceded,
        wickets:      bowlingStatUpdate.wickets,
        wides:        bowlingStatUpdate.wides,
        noBalls:      bowlingStatUpdate.noBalls
      });
    }

    // Fall of wickets
    if (wicket) {
      innings.fallOfWickets.push({
        wicketNumber: innings.totalWickets,
        runs:  innings.totalRuns,
        overs: ScoringEngine.formatOvers(innings.overs, innings.balls),
        player: playerOutId || batsmanId
      });
    }

    // On over completion — clear current bowler so new bowler must be selected
    if (events.includes('overComplete') && !events.includes('inningsComplete')) {
      innings.currentBowler = null;
    }

    await innings.save();

    // Handle side-effects from engine events
    let resultDesc = '';
    if (events.includes('matchComplete')) {
      const winningInnings = innings;
      const losingInnings  = await Innings.findOne({ match: matchId, inningsNumber: match.currentInnings === 2 ? 1 : 2 });
      const winnerTeam     = match.currentInnings === 2 ? innings.battingTeam : innings.bowlingTeam;
      const winnerTeamDoc  = match.teamA._id.toString() === winnerTeam.toString() ? match.teamA : match.teamB;
      resultDesc = buildResultDescription(
        winnerTeamDoc.name,
        match.currentInnings,
        winningInnings,
        losingInnings
      );
      match.status = 'completed';
      match.winner = winnerTeam;
      match.resultDescription = resultDesc;
      await match.save();
      await _updateCareerStats(matchId, match.currentInnings);
      await updateTournamentPointsTable(match);
    } else if (events.includes('inningsComplete') && match.currentInnings === 1) {
      // Switch to 2nd innings
      const targetRuns = innings.totalRuns + 1;
      match.target = targetRuns;
      const battingTeamNext = innings.bowlingTeam;
      const bowlingTeamNext = innings.battingTeam;
      await Innings.create({
        match: matchId,
        inningsNumber: 2,
        battingTeam: battingTeamNext,
        bowlingTeam: bowlingTeamNext
      });
      match.currentInnings = 2;
      await match.save();
    } else if (events.includes('inningsComplete') && match.currentInnings === 2) {
      const firstInnings = await Innings.findOne({ match: matchId, inningsNumber: 1 });
      const firstBattingTeamId = firstInnings.battingTeam.toString();
      const winnerTeam = innings.totalRuns < (firstInnings?.totalRuns || 0) ? innings.bowlingTeam : innings.battingTeam;
      const isDraw = innings.totalRuns === (firstInnings?.totalRuns || 0);
      const winnerTeamDoc = match.teamA._id.toString() === winnerTeam.toString() ? match.teamA : match.teamB;
      resultDesc = isDraw ? 'Match Tied!' : buildResultDescription(
        winnerTeamDoc.name, match.currentInnings, innings, firstInnings
      );
      match.status = 'completed';
      match.winner = isDraw ? null : winnerTeam;
      match.resultDescription = resultDesc;
      await match.save();
      await _updateCareerStats(matchId, match.currentInnings);
      await updateTournamentPointsTable(match);
    }

    // Emit real-time update
    const io = req.app.get('io');
    const payload = {
      matchId,
      inningsNumber: innings.inningsNumber,
      totalRuns: innings.totalRuns,
      totalWickets: innings.totalWickets,
      overs: ScoringEngine.formatOvers(innings.overs, innings.balls),
      events,
      commentary,
      requireNewBowler: events.includes('overComplete') && !events.includes('inningsComplete'),
      lastBall: {
        runs, extraType, wicket,
        over: ballDoc.over,
        ballNumber: ballDoc.ballNumber,
        commentary
      }
    };
    io.to(matchId).emit('scoreUpdate', payload);

    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
};


// @POST /api/scoring/:matchId/undo
exports.undoBall = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (!checkScorerAccess(match, req.user._id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get last ball
    const lastBall = await Ball.findOne({ match: matchId }).sort({ createdAt: -1 });
    if (!lastBall) {
      return res.status(400).json({ success: false, message: 'No balls to undo' });
    }

    // Restore innings from snapshot stored before this ball
    const innings = await Innings.findById(lastBall.innings);

    if (!innings) return res.status(404).json({ success: false, message: 'Innings not found' });

    // Revert batting stats
    const bIdx = innings.battingStats.findIndex(s => s.player.toString() === lastBall.batsman.toString());
    if (bIdx !== -1) {
      const isLegal = lastBall.extraType !== 'wide' && lastBall.extraType !== 'no-ball';
      const runsToCredit = (lastBall.extraType === 'none' || lastBall.extraType === 'no-ball')
        ? lastBall.runs : 0;
      innings.battingStats[bIdx].runs  -= runsToCredit;
      if (isLegal && lastBall.extraType !== 'wide') innings.battingStats[bIdx].balls -= 1;
      if (lastBall.runs === 4) innings.battingStats[bIdx].fours -= 1;
      if (lastBall.runs === 6) innings.battingStats[bIdx].sixes -= 1;
      // For non-run-out dismissals, revert on the batsman (striker)
      if (lastBall.wicket && lastBall.wicketType !== 'run-out') {
        innings.battingStats[bIdx].isOut = false;
        innings.battingStats[bIdx].dismissal = '';
      }
    }

    // For run-outs, revert on the actual playerOut (may be non-striker)
    if (lastBall.wicket && lastBall.wicketType === 'run-out' && lastBall.playerOut) {
      const outIdx = innings.battingStats.findIndex(s => s.player.toString() === lastBall.playerOut.toString());
      if (outIdx !== -1) {
        innings.battingStats[outIdx].isOut = false;
        innings.battingStats[outIdx].dismissal = '';
      }
    }

    // Revert bowling stats
    const wIdx = innings.bowlingStats.findIndex(s => s.player.toString() === lastBall.bowler.toString());
    if (wIdx !== -1) {
      const isLegal = lastBall.extraType !== 'wide' && lastBall.extraType !== 'no-ball';
      if (isLegal) innings.bowlingStats[wIdx].balls -= 1;
      // Only revert bowler wicket if it was originally credited (not run-out/obstructing-field)
      if (lastBall.wicket && !['run-out', 'obstructing-field'].includes(lastBall.wicketType)) {
        innings.bowlingStats[wIdx].wickets -= 1;
      }
      innings.bowlingStats[wIdx].runsConceded -= (lastBall.runs + (lastBall.extraRuns || 0));
    }

    // Restore score from snapshot
    if (lastBall.scoreSnapshot) {
      innings.totalRuns    = lastBall.scoreSnapshot.totalRuns - (lastBall.runs + (lastBall.extraRuns || 0));
      innings.totalWickets = lastBall.scoreSnapshot.totalWickets - (lastBall.wicket ? 1 : 0);
      innings.overs        = lastBall.scoreSnapshot.overs;
      innings.balls        = lastBall.scoreSnapshot.balls - (
        (lastBall.extraType !== 'wide' && lastBall.extraType !== 'no-ball') ? 1 : 0
      );
      // Clamp
      if (innings.balls < 0) { innings.overs -= 1; innings.balls = 5; }
      innings.isCompleted = false;
    }

    // Remove fall of wicket entry if this ball had a wicket
    if (lastBall.wicket) {
      innings.fallOfWickets.pop();
    }

    await innings.save();
    await lastBall.deleteOne();

    const io = req.app.get('io');
    io.to(matchId).emit('scoreUpdate', {
      matchId,
      inningsNumber: innings.inningsNumber,
      totalRuns: innings.totalRuns,
      totalWickets: innings.totalWickets,
      overs: ScoringEngine.formatOvers(innings.overs, innings.balls),
      events: ['undone']
    });

    res.json({ success: true, message: 'Last ball undone', innings });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/scoring/:matchId/change-batsman
exports.changeBatsman = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { newBatsmanId, isStriker = true } = req.body;

    const match = await Match.findById(matchId);
    if (!checkScorerAccess(match, req.user._id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInnings });
    if (!innings) return res.status(404).json({ success: false, message: 'Innings not found' });

    if (isStriker) innings.striker = newBatsmanId;
    else innings.nonStriker = newBatsmanId;

    // Add new batsman to batting stats
    const exists = innings.battingStats.find(s => s.player.toString() === newBatsmanId.toString());
    if (!exists) innings.battingStats.push({ player: newBatsmanId });

    await innings.save();
    res.json({ success: true, message: 'Batsman changed', innings });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/scoring/:matchId/change-bowler
exports.changeBowler = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { newBowlerId } = req.body;

    const match = await Match.findById(matchId);
    if (!checkScorerAccess(match, req.user._id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInnings });
    if (!innings) return res.status(404).json({ success: false, message: 'Innings not found' });

    innings.currentBowler = newBowlerId;
    const exists = innings.bowlingStats.find(s => s.player.toString() === newBowlerId.toString());
    if (!exists) innings.bowlingStats.push({ player: newBowlerId });

    await innings.save();
    res.json({ success: true, message: 'Bowler changed', innings });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/scoring/:matchId/set-players — set opening batsmen and first bowler
exports.setOpeningPlayers = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { strikerId, nonStrikerId, bowlerId, battingTeamId } = req.body;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (!checkScorerAccess(match, req.user._id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInnings });

    // Auto-create innings if it doesn't exist (recovery path for matches started via general update)
    if (!innings) {
      // Determine batting/bowling teams
      let battingTeam = battingTeamId || match.teamA;
      let bowlingTeam = battingTeam.toString() === match.teamA.toString() ? match.teamB : match.teamA;

      // If tossWinner/tossDecision are set, honour them
      if (match.tossWinner && match.tossDecision) {
        if (match.tossDecision === 'bat') {
          battingTeam = match.tossWinner;
          bowlingTeam = match.tossWinner.toString() === match.teamA.toString() ? match.teamB : match.teamA;
        } else {
          bowlingTeam = match.tossWinner;
          battingTeam = match.tossWinner.toString() === match.teamA.toString() ? match.teamB : match.teamA;
        }
      }

      innings = await Innings.create({
        match: matchId,
        inningsNumber: match.currentInnings,
        battingTeam,
        bowlingTeam
      });
    }

    innings.striker = strikerId;
    innings.nonStriker = nonStrikerId;
    innings.currentBowler = bowlerId;

    // Initialize batting/bowling stats entries
    if (!innings.battingStats.find(s => s.player.toString() === strikerId.toString()))
      innings.battingStats.push({ player: strikerId });
    if (!innings.battingStats.find(s => s.player.toString() === nonStrikerId.toString()))
      innings.battingStats.push({ player: nonStrikerId });
    if (!innings.bowlingStats.find(s => s.player.toString() === bowlerId.toString()))
      innings.bowlingStats.push({ player: bowlerId });

    await innings.save();
    res.json({ success: true, data: innings });
  } catch (err) {
    next(err);
  }
};

/**
 * Internal: update career stats when match ends.
 */
async function _updateCareerStats(matchId, inningsCount) {
  for (let i = 1; i <= inningsCount; i++) {
    const innings = await Innings.findOne({ match: matchId, inningsNumber: i });
    if (!innings) continue;

    for (const bs of innings.battingStats) {
      await Player.findByIdAndUpdate(bs.player, {
        $inc: {
          'careerStats.runs':       bs.runs,
          'careerStats.ballsFaced': bs.balls,
          'careerStats.fours':      bs.fours,
          'careerStats.sixes':      bs.sixes,
          'careerStats.matches':    1
        }
      });
      // Update highest score
      const player = await Player.findById(bs.player);
      if (player && bs.runs > player.careerStats.highestScore) {
        await Player.findByIdAndUpdate(bs.player, {
          $set: { 'careerStats.highestScore': bs.runs }
        });
      }
    }

    for (const bws of innings.bowlingStats) {
      await Player.findByIdAndUpdate(bws.player, {
        $inc: {
          'careerStats.wickets':      bws.wickets,
          'careerStats.ballsBowled':  bws.balls + bws.overs * 6,
          'careerStats.runsConceded': bws.runsConceded
        }
      });
    }
  }
}

// @POST /api/scoring/:matchId/end-innings — admin manually ends innings
exports.endInnings = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId)
      .populate('teamA', 'name')
      .populate('teamB', 'name');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'live') return res.status(400).json({ success: false, message: 'Match is not live' });

    if (!checkScorerAccess(match, req.user._id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const innings = await Innings.findOne({ match: matchId, inningsNumber: match.currentInnings });
    if (!innings) return res.status(404).json({ success: false, message: 'Innings not found' });

    innings.isCompleted = true;
    await innings.save();

    if (match.currentInnings === 1) {
      const targetRuns = innings.totalRuns + 1;
      match.target = targetRuns;
      await Innings.create({
        match: matchId,
        inningsNumber: 2,
        battingTeam: innings.bowlingTeam,
        bowlingTeam: innings.battingTeam
      });
      match.currentInnings = 2;
      await match.save();

      const io = req.app.get('io');
      io.to(matchId).emit('inningsEnded', { matchId, inningsNumber: 1, target: targetRuns });
      res.json({ success: true, message: '1st innings ended', target: targetRuns, data: { currentInnings: 2 } });
    } else {
      // End match
      const firstInnings = await Innings.findOne({ match: matchId, inningsNumber: 1 });
      const isDraw = innings.totalRuns === (firstInnings?.totalRuns || 0);
      let winnerTeam, resultDesc;

      if (isDraw) {
        winnerTeam = null;
        resultDesc = 'Match Tied!';
      } else if (innings.totalRuns < (firstInnings?.totalRuns || 0)) {
        winnerTeam = innings.bowlingTeam;
        const winnerTeamDoc = match.teamA._id.toString() === winnerTeam.toString() ? match.teamA : match.teamB;
        resultDesc = buildResultDescription(winnerTeamDoc.name, 1, firstInnings, innings);
      } else {
        winnerTeam = innings.battingTeam;
        const winnerTeamDoc = match.teamA._id.toString() === winnerTeam.toString() ? match.teamA : match.teamB;
        resultDesc = buildResultDescription(winnerTeamDoc.name, 2, innings, firstInnings);
      }

      match.status = 'completed';
      match.winner = winnerTeam;
      match.resultDescription = resultDesc;
      await match.save();
      await _updateCareerStats(matchId, 2);
      await updateTournamentPointsTable(match);

      const io = req.app.get('io');
      io.to(matchId).emit('matchCompleted', { matchId, winner: winnerTeam, resultDescription: resultDesc });
      res.json({ success: true, message: 'Match completed', data: match });
    }
  } catch (err) {
    next(err);
  }
};

// @PUT /api/scoring/:matchId/player-of-match
exports.setPlayerOfMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { playerId } = req.body;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (!checkScorerAccess(match, req.user._id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    match.playerOfMatch = playerId;
    await match.save();
    res.json({ success: true, message: 'Player of the match set' });
  } catch (err) {
    next(err);
  }
};
