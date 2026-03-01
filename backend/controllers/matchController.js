const Match = require('../models/Match');
const Innings = require('../models/Innings');
const Tournament = require('../models/Tournament');

// @POST /api/matches
exports.createMatch = async (req, res, next) => {
  try {
    const {
      teamA, teamB, playingXI_A, playingXI_B,
      totalOvers, venue, matchType, matchDate,
      tossWinner, tossDecision, scorer, tournament
    } = req.body;

    if (teamA === teamB) {
      return res.status(400).json({ success: false, message: 'Team A and Team B cannot be the same' });
    }

    const match = await Match.create({
      teamA, teamB, playingXI_A, playingXI_B,
      totalOvers, venue, matchType, matchDate,
      tossWinner, tossDecision, scorer, tournament: tournament || null
    });

    // If linked to a tournament: auto-add match + teams + update status
    if (tournament) {
      await Tournament.findByIdAndUpdate(tournament, {
        $addToSet: { matches: match._id },
        $push: { teams: { $each: [] } }, // no-op, handled below
      });
      await Tournament.findByIdAndUpdate(tournament, {
        $addToSet: { teams: { $each: [teamA, teamB] } }
      });
      // Ensure pointsTable has entries for both teams
      const t = await Tournament.findById(tournament);
      if (t) {
        const existingTeamIds = t.pointsTable.map(r => r.team.toString());
        const teamsToAdd = [teamA, teamB].filter(id => !existingTeamIds.includes(id.toString()));
        if (teamsToAdd.length) {
          await Tournament.findByIdAndUpdate(tournament, {
            $push: { pointsTable: { $each: teamsToAdd.map(id => ({ team: id })) } }
          });
        }
        // Set tournament status to ongoing if it was upcoming
        if (t.status === 'upcoming') {
          await Tournament.findByIdAndUpdate(tournament, { status: 'ongoing' });
        }
      }
    }

    res.status(201).json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
};

// @GET /api/matches
exports.getMatches = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [matches, total] = await Promise.all([
      Match.find(filter)
        .populate('teamA', 'name shortName logo')
        .populate('teamB', 'name shortName logo')
        .populate('scorer', 'name')
        .populate('winner', 'name shortName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Match.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: matches.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: matches
    });
  } catch (err) {
    next(err);
  }
};

// @GET /api/matches/:id
exports.getMatchById = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate({ path: 'teamA', select: 'name shortName logo city players', populate: { path: 'players', select: 'name role' } })
      .populate({ path: 'teamB', select: 'name shortName logo city players', populate: { path: 'players', select: 'name role' } })
      .populate('playingXI_A', 'name role')
      .populate('playingXI_B', 'name role')
      .populate('tossWinner', 'name')
      .populate('winner', 'name')
      .populate('playerOfMatch', 'name role')
      .populate('scorer', 'name email')
      .populate('tournament', 'name');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/matches/:id/start
exports.startMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: 'Match already started or completed' });
    }

    const { tossWinner, tossDecision, scorer } = req.body;
    match.tossWinner = tossWinner || match.tossWinner;
    match.tossDecision = tossDecision || match.tossDecision;
    if (scorer) match.scorer = scorer;
    match.status = 'live';

    // Determine batting team for 1st innings
    let battingTeam, bowlingTeam;
    if (tossDecision === 'bat') {
      battingTeam = tossWinner;
      bowlingTeam = match.teamA.toString() === tossWinner.toString() ? match.teamB : match.teamA;
    } else {
      bowlingTeam = tossWinner;
      battingTeam = match.teamA.toString() === tossWinner.toString() ? match.teamB : match.teamA;
    }

    // Create 1st innings
    await Innings.create({
      match: match._id,
      inningsNumber: 1,
      battingTeam,
      bowlingTeam
    });

    await match.save();

    const io = req.app.get('io');
    io.to(match._id.toString()).emit('matchStarted', { matchId: match._id, status: 'live' });

    res.json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/matches/:id/end
exports.endMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const { winner, resultDescription } = req.body;
    match.status = 'completed';
    match.winner = winner || null;
    match.resultDescription = resultDescription || '';
    await match.save();

    const io = req.app.get('io');
    io.to(match._id.toString()).emit('matchCompleted', {
      matchId: match._id,
      winner,
      resultDescription: match.resultDescription
    });

    res.json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
};

// @DELETE /api/matches/:id
exports.deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    // Delete related balls and innings
    const Ball = require('../models/Ball');
    const Innings = require('../models/Innings');
    await Ball.deleteMany({ match: match._id });
    await Innings.deleteMany({ match: match._id });

    // Remove match from tournament if linked
    if (match.tournament) {
      const Tournament = require('../models/Tournament');
      await Tournament.findByIdAndUpdate(match.tournament, { $pull: { matches: match._id } });
    }

    await match.deleteOne();
    res.json({ success: true, message: 'Match deleted' });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/matches/:id — general update (scorer assignment, etc.)
exports.updateMatch = async (req, res, next) => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
};
