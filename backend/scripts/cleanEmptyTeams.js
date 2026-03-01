require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('../models/Team');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const all = await Team.find().lean();
  console.log('=== All teams in DB ===');
  all.forEach(t => console.log(` - "${t.name || '(no name)'}" | players: ${(t.players || []).length}`));

  // Delete teams with no name (leftover from seed scripts)
  const deleted = await Team.deleteMany({ $or: [{ name: null }, { name: '' }, { name: { $exists: false } }] });
  console.log(`\nDeleted ${deleted.deletedCount} nameless team(s).`);

  const remaining = await Team.countDocuments();
  console.log(`Teams remaining: ${remaining}`);
  process.exit(0);
});
