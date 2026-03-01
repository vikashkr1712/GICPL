require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Player = require('../models/Player');
const Team   = require('../models/Team');

(async () => {
  await connectDB();
  try {
    const players = await Player.find({}, 'name teams careerStats').lean();
    const teams   = await Team.find({}, 'name').lean();
    const teamIdSet = new Set(teams.map(t => t._id.toString()));

    console.log('\n=== Existing Teams ===');
    teams.forEach(t => console.log(' -', t.name, t._id));

    console.log('\n=== All Players ===');
    players.forEach(p => {
      const validTeams = p.teams.filter(tid => teamIdSet.has(tid.toString()));
      console.log(` - ${p.name} | teams in DB: [${p.teams.join(', ')}] | valid: ${validTeams.length}`);
    });

    const orphans = players.filter(p =>
      p.teams.length === 0 || !p.teams.some(tid => teamIdSet.has(tid.toString()))
    );
    console.log('\n=== Orphan Players (to be deleted) ===');
    orphans.forEach(p => console.log(' -', p.name, p._id));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    mongoose.disconnect();
  }
})();
