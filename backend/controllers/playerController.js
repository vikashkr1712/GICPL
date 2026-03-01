const Player = require('../models/Player');
const Team   = require('../models/Team');

// @POST /api/players
exports.createPlayer = async (req, res, next) => {
  try {
    const { name, user, battingStyle, bowlingStyle, role: playerRole, profileImage } = req.body;
    const player = await Player.create({ name, user, battingStyle, bowlingStyle, role: playerRole, profileImage });
    res.status(201).json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
};

// @GET /api/players
exports.getPlayers = async (req, res, next) => {
  try {
    const { search, role } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (role) filter.role = role;

    const players = await Player.find(filter)
      .populate('teams', 'name shortName')
      .lean();
    res.json({ success: true, count: players.length, data: players });
  } catch (err) {
    next(err);
  }
};

// @GET /api/players/:id
exports.getPlayerById = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id)
      .populate('teams', 'name shortName city')
      .populate('user', 'name email');
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    res.json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
};

// @PUT /api/players/:id
exports.updatePlayer = async (req, res, next) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    res.json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
};

// @DELETE /api/players/:id
exports.deletePlayer = async (req, res, next) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    // Remove the player from all teams that reference them
    await Team.updateMany({ players: player._id }, { $pull: { players: player._id, captain: player._id } });
    res.json({ success: true, message: 'Player deleted' });
  } catch (err) {
    next(err);
  }
};
