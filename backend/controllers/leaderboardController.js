const Player = require('../models/Player');
const ScoringEngine = require('../services/scoringEngine');

// @GET /api/leaderboard/batting — top run scorers
exports.getBattingLeaderboard = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const players = await Player.aggregate([
      { $match: { 'careerStats.runs': { $gt: 0 } } },
      {
        $addFields: {
          strikeRate: {
            $cond: [
              { $eq: ['$careerStats.ballsFaced', 0] },
              0,
              { $multiply: [{ $divide: ['$careerStats.runs', '$careerStats.ballsFaced'] }, 100] }
            ]
          },
          average: {
            $cond: [
              { $eq: [{ $subtract: ['$careerStats.matches', '$careerStats.notOuts'] }, 0] },
              '$careerStats.runs',
              { $divide: ['$careerStats.runs', { $subtract: ['$careerStats.matches', '$careerStats.notOuts'] }] }
            ]
          }
        }
      },
      { $sort: { 'careerStats.runs': -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          name: 1,
          runs:         '$careerStats.runs',
          matches:      '$careerStats.matches',
          highestScore: '$careerStats.highestScore',
          fours:        '$careerStats.fours',
          sixes:        '$careerStats.sixes',
          notOuts:      '$careerStats.notOuts',
          ballsFaced:   '$careerStats.ballsFaced',
          strikeRate:   { $round: ['$strikeRate', 2] },
          average:      { $round: ['$average', 2] }
        }
      }
    ]);

    res.json({ success: true, data: players });
  } catch (err) {
    next(err);
  }
};

// @GET /api/leaderboard/bowling — top wicket takers
exports.getBowlingLeaderboard = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const players = await Player.aggregate([
      { $match: { 'careerStats.wickets': { $gt: 0 } } },
      {
        $addFields: {
          economy: {
            $cond: [
              { $eq: ['$careerStats.ballsBowled', 0] },
              0,
              { $divide: ['$careerStats.runsConceded', { $divide: ['$careerStats.ballsBowled', 6] }] }
            ]
          }
        }
      },
      { $sort: { 'careerStats.wickets': -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          name: 1,
          wickets:      '$careerStats.wickets',
          matches:      '$careerStats.matches',
          ballsBowled:  '$careerStats.ballsBowled',
          runsConceded: '$careerStats.runsConceded',
          oversBowled: {
            $concat: [
              { $toString: { $floor: { $divide: ['$careerStats.ballsBowled', 6] } } },
              '.',
              { $toString: { $mod: ['$careerStats.ballsBowled', 6] } }
            ]
          },
          economy:      { $round: ['$economy', 2] }
        }
      }
    ]);

    res.json({ success: true, data: players });
  } catch (err) {
    next(err);
  }
};

// @GET /api/leaderboard/sixes — most sixes
exports.getSixesLeaderboard = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const players = await Player.find({ 'careerStats.sixes': { $gt: 0 } })
      .sort({ 'careerStats.sixes': -1 })
      .limit(parseInt(limit))
      .select('name careerStats.sixes careerStats.matches')
      .lean();
    res.json({ success: true, data: players });
  } catch (err) {
    next(err);
  }
};
