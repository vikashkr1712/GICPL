const Team = require('../models/Team');
const Player = require('../models/Player');

// @POST /api/teams
exports.createTeam = async (req, res, next) => {
  try {
    const { name, shortName, city, logo } = req.body;
    const team = await Team.create({ name, shortName, city, logo, createdBy: req.user._id });
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};

// @GET /api/teams
exports.getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find()
      .populate('players', 'name role')
      .populate('captain', 'name')
      .populate('createdBy', 'name')
      .lean();
    res.json({ success: true, count: teams.length, data: teams });
  } catch (err) {
    next(err);
  }
};

// @GET /api/teams/:id
exports.getTeamById = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('players', 'name role battingStyle bowlingStyle careerStats')
      .populate('captain', 'name')
      .populate('createdBy', 'name');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/teams/:id
exports.updateTeam = async (req, res, next) => {
  try {
    const { name, shortName, city, logo, captain } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { name, shortName, city, logo, captain },
      { new: true, runValidators: true }
    );
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};

// @DELETE /api/teams/:id
exports.deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    // Remove this team from all players' teams array
    await Player.updateMany({ teams: team._id }, { $pull: { teams: team._id } });
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/teams/:id/add-player
exports.addPlayerToTeam = async (req, res, next) => {
  try {
    const { playerId } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.players.includes(playerId)) {
      return res.status(400).json({ success: false, message: 'Player already in team' });
    }

    team.players.push(playerId);
    await team.save();

    // Also update player's teams array
    await Player.findByIdAndUpdate(playerId, { $addToSet: { teams: team._id } });

    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/teams/:id/remove-player
exports.removePlayerFromTeam = async (req, res, next) => {
  try {
    const { playerId } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $pull: { players: playerId, captain: playerId } },
      { new: true }
    );
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    // Pull this team from the player's teams list
    const player = await Player.findByIdAndUpdate(
      playerId,
      { $pull: { teams: team._id } },
      { new: true }
    );
    // If the player no longer belongs to any team, delete the player document
    if (player && player.teams.length === 0) {
      await Player.findByIdAndDelete(playerId);
    }
    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};
