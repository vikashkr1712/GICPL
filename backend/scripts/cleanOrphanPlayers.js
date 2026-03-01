require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Player = require('../models/Player');
const Team   = require('../models/Team');

(async () => {
  await connectDB();
  try {
    // Get all currently-existing team IDs
    const existingTeamIds = await Team.distinct('_id');
    // Delete players whose teams array has no overlap with existing teams
    // (either empty [] or only contains IDs of deleted teams)
    const result = await Player.deleteMany({
      $or: [
        { teams: { $size: 0 } },
        { teams: { $not: { $elemMatch: { $in: existingTeamIds } } } }
      ]
    });
    console.log('Deleted orphan players:', result.deletedCount);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    mongoose.disconnect();
  }
})();
