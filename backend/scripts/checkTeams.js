require('dotenv').config();
const connectDB = require('../config/db');
const mongoose  = require('mongoose');
const Team   = require('../models/Team');
const Player = require('../models/Player');

(async () => {
  await connectDB();
  const teams   = await Team.find({}, 'name shortName players').lean();
  const players = await Player.find({}, 'name teams').lean();
  console.log(`\n=== ${teams.length} Teams in DB ===`);
  teams.forEach(t => console.log(` - "${t.name}" | players: ${t.players.length}`));
  console.log(`\n=== ${players.length} Players in DB ===`);
  players.forEach(p => console.log(` - ${p.name} | teams: ${p.teams.length}`));
  mongoose.disconnect();
})();
