const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Innings = require('../models/Innings');
const ScoringEngine = require('../services/scoringEngine');

// @DELETE /api/tournaments/:id
exports.deleteTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    // Optionally delete all matches, innings, and balls belonging to this tournament
    const Ball = require('../models/Ball');
    const matchIds = tournament.matches || [];
    if (matchIds.length > 0) {
      await Ball.deleteMany({ match: { $in: matchIds } });
      await Innings.deleteMany({ match: { $in: matchIds } });
      await Match.deleteMany({ _id: { $in: matchIds } });
    }

    await tournament.deleteOne();
    res.json({ success: true, message: 'Tournament deleted' });
  } catch (err) {
    next(err);
  }
};

// @POST /api/tournaments
exports.createTournament = async (req, res, next) => {
  try {
    const { name, format, startDate, endDate } = req.body;
    const tournament = await Tournament.create({
      name, format, startDate, endDate,
      organizer: req.user._id
    });
    res.status(201).json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
};

// @GET /api/tournaments
exports.getTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find()
      .populate('teams', 'name shortName logo')
      .populate('organizer', 'name')
      .lean();
    res.json({ success: true, count: tournaments.length, data: tournaments });
  } catch (err) {
    next(err);
  }
};

// @GET /api/tournaments/:id
exports.getTournamentById = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('teams', 'name shortName logo city')
      .populate('organizer', 'name')
      .populate({
        path: 'matches',
        populate: [
          { path: 'teamA', select: 'name shortName' },
          { path: 'teamB', select: 'name shortName' },
          { path: 'winner', select: 'name shortName' }
        ]
      })
      .populate('pointsTable.team', 'name shortName logo');

    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/tournaments/:id/add-team
exports.addTeam = async (req, res, next) => {
  try {
    const { teamId } = req.body;
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { teams: teamId, 'pointsTable': { team: teamId } } },
      { new: true }
    );
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/tournaments/:id/status — update tournament status
exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['upcoming', 'ongoing', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
};

// @DELETE /api/tournaments/:id/remove-team — remove a team from tournament
exports.removeTeam = async (req, res, next) => {
  try {
    const { teamId } = req.body;
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      {
        $pull: { teams: teamId, pointsTable: { team: teamId } }
      },
      { new: true }
    );
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
};
exports.updatePointsTable = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    const matches = await Match.find({
      tournament: tournament._id,
      status: 'completed'
    });

    // Reset points table
    const tableMap = {};
    for (const teamId of tournament.teams) {
      tableMap[teamId.toString()] = {
        team: teamId, played: 0, won: 0, lost: 0, noResult: 0,
        points: 0, nrr: 0, runsFor: 0, oversFor: 0,
        runsAgainst: 0, oversAgainst: 0
      };
    }

    for (const match of matches) {
      const inningsList = await Innings.find({ match: match._id }).lean();
      if (inningsList.length < 2) continue;

      const [inn1, inn2] = inningsList;
      const tA = match.teamA.toString();
      const tB = match.teamB.toString();

      // Accumulate for NRR
      if (inn1.battingTeam.toString() === tA) {
        if (tableMap[tA]) { tableMap[tA].runsFor += inn1.totalRuns; tableMap[tA].oversFor += inn1.overs + inn1.balls / 6; }
        if (tableMap[tB]) { tableMap[tB].runsAgainst += inn1.totalRuns; tableMap[tB].oversAgainst += inn1.overs + inn1.balls / 6; }
        if (tableMap[tB]) { tableMap[tB].runsFor += inn2.totalRuns; tableMap[tB].oversFor += inn2.overs + inn2.balls / 6; }
        if (tableMap[tA]) { tableMap[tA].runsAgainst += inn2.totalRuns; tableMap[tA].oversAgainst += inn2.overs + inn2.balls / 6; }
      }

      // Points: win = 2, loss = 0, NR = 1
      if (match.winner) {
        const winnerId = match.winner.toString();
        const loserId = winnerId === tA ? tB : tA;
        if (tableMap[winnerId]) { tableMap[winnerId].won += 1; tableMap[winnerId].points += 2; }
        if (tableMap[loserId]) { tableMap[loserId].lost += 1; }
      } else {
        if (tableMap[tA]) { tableMap[tA].noResult += 1; tableMap[tA].points += 1; }
        if (tableMap[tB]) { tableMap[tB].noResult += 1; tableMap[tB].points += 1; }
      }

      if (tableMap[tA]) tableMap[tA].played += 1;
      if (tableMap[tB]) tableMap[tB].played += 1;
    }

    // Calculate NRR for each team
    const pointsTable = Object.values(tableMap).map(row => ({
      ...row,
      nrr: ScoringEngine.calcNRR(row.runsFor, row.oversFor, row.runsAgainst, row.oversAgainst)
    })).sort((a, b) => b.points - a.points || b.nrr - a.nrr);

    tournament.pointsTable = pointsTable;
    await tournament.save();

    res.json({ success: true, data: tournament.pointsTable });
  } catch (err) {
    next(err);
  }
};
