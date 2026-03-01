const Match = require('../models/Match');
const Innings = require('../models/Innings');
const Ball = require('../models/Ball');
const ScoringEngine = require('../services/scoringEngine');

// @GET /api/scorecard/:matchId
exports.getScorecard = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate('teamA', 'name shortName logo')
      .populate('teamB', 'name shortName logo')
      .populate('winner', 'name shortName')
      .populate('scorer', 'name')
      .populate('playerOfMatch', 'name role')
      .populate('tossWinner', 'name')
      .lean();

    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const inningsList = await Innings.find({ match: req.params.matchId })
      .populate('battingTeam', 'name shortName')
      .populate('bowlingTeam', 'name shortName')
      .populate('striker', 'name')
      .populate('nonStriker', 'name')
      .populate('currentBowler', 'name')
      .populate('battingStats.player', 'name')
      .populate('bowlingStats.player', 'name')
      .populate('fallOfWickets.player', 'name')
      .lean();

    // Enrich each innings with calculated stats
    const enrichedInnings = inningsList.map(inn => {
      const batting = inn.battingStats.map(b => ({
        ...b,
        strikeRate: ScoringEngine.calcStrikeRate(b.runs, b.balls)
      }));

      const bowling = inn.bowlingStats.map(bw => {
        const totalBalls = (bw.overs * 6) + bw.balls;
        const oversDisplay = ScoringEngine.formatOvers(bw.overs, bw.balls);
        return {
          ...bw,
          oversDisplay,
          economy: ScoringEngine.calcEconomy(bw.runsConceded, bw.overs, bw.balls)
        };
      });

      return {
        ...inn,
        oversDisplay: ScoringEngine.formatOvers(inn.overs, inn.balls),
        runRate: ScoringEngine.calcRunRate(inn.totalRuns, inn.overs, inn.balls),
        battingStats: batting,
        bowlingStats: bowling,
        extras: inn.extras || { total: 0 }
      };
    });

    // Required run rate for live 2nd innings
    let requiredRate = null;
    if (match.status === 'live' && enrichedInnings.length === 2) {
      const first = enrichedInnings[0];
      const second = enrichedInnings[1];
      requiredRate = ScoringEngine.calcRequiredRate(
        first.totalRuns,
        second.totalRuns,
        match.totalOvers,
        second.overs,
        second.balls
      );
    }

    res.json({
      success: true,
      data: {
        match,
        innings: enrichedInnings,
        requiredRate
      }
    });
  } catch (err) {
    next(err);
  }
};

// @GET /api/matches/:matchId/balls — ball-by-ball commentary
exports.getBalls = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { innings = 1 } = req.query;

    const balls = await Ball.find({ match: matchId, inningsNumber: parseInt(innings) })
      .populate('batsman', 'name')
      .populate('bowler', 'name')
      .populate('playerOut', 'name')
      .sort({ over: 1, ballNumber: 1 })
      .lean();

    res.json({ success: true, count: balls.length, data: balls });
  } catch (err) {
    next(err);
  }
};
