require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Tournament = require('../models/Tournament');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  const teams = await Team.find().select('name shortName city players captain').lean();
  console.log('\n=== TEAMS ===');
  teams.forEach(t => console.log(`  ${t._id} | "${t.name}" | ${t.shortName} | players:${t.players.length}`));

  const players = await Player.find().select('name role teams').lean();
  console.log('\n=== PLAYERS ===');
  players.forEach(p => console.log(`  ${p._id} | "${p.name}" | ${p.role}`));

  const tournaments = await Tournament.find().select('name status matches teams').lean();
  console.log('\n=== TOURNAMENTS ===');
  tournaments.forEach(t => console.log(`  ${t._id} | "${t.name}" | status:${t.status} | teams:${t.teams.length} | matches:${t.matches.length}`));

  await mongoose.disconnect();
}
check().catch(console.error);
