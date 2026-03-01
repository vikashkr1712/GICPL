/**
 * recalcStats.js
 * Recomputes every player's careerStats by aggregating data from all completed Innings.
 * Run with: node scripts/recalcStats.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Player   = require('../models/Player');
const Innings  = require('../models/Innings');
const Match    = require('../models/Match');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const players = await Player.find().lean();
  console.log(`📋 Found ${players.length} players`);

  let updated = 0;

  for (const player of players) {
    const pid = player._id;

    // ── BATTING ──────────────────────────────────────────────────────────────
    // Gather all innings where this player appears in battingStats
    const battingInnings = await Innings.find(
      { 'battingStats.player': pid },
      { battingStats: 1, match: 1 }
    ).lean();

    let totalRuns    = 0;
    let totalBalls   = 0;
    let totalFours   = 0;
    let totalSixes   = 0;
    let highestScore = 0;
    let notOuts      = 0;
    const battingMatchIds = new Set();

    for (const inn of battingInnings) {
      const stat = inn.battingStats.find(s => s.player.toString() === pid.toString());
      if (!stat) continue;

      totalRuns  += stat.runs  || 0;
      totalBalls += stat.balls || 0;
      totalFours += stat.fours || 0;
      totalSixes += stat.sixes || 0;

      if (stat.runs > highestScore) highestScore = stat.runs;
      if (!stat.isOut) notOuts++;

      battingMatchIds.add(inn.match.toString());
    }

    // ── BOWLING ──────────────────────────────────────────────────────────────
    const bowlingInnings = await Innings.find(
      { 'bowlingStats.player': pid },
      { bowlingStats: 1, match: 1 }
    ).lean();

    let totalWickets      = 0;
    let totalBallsBowled  = 0;
    let totalRunsConceded = 0;
    let fifers            = 0;
    const bowlingMatchIds = new Set();

    for (const inn of bowlingInnings) {
      const stat = inn.bowlingStats.find(s => s.player.toString() === pid.toString());
      if (!stat) continue;

      totalWickets      += stat.wickets      || 0;
      totalBallsBowled  += stat.balls        || 0;   // stored as balls in Innings
      totalRunsConceded += stat.runsConceded || 0;

      if ((stat.wickets || 0) >= 5) fifers++;

      bowlingMatchIds.add(inn.match.toString());
    }

    // ── MATCHES ───────────────────────────────────────────────────────────────
    // Union of matches where player batted or bowled
    const allMatchIds = new Set([...battingMatchIds, ...bowlingMatchIds]);
    const matches = allMatchIds.size;

    // ── UPDATE ────────────────────────────────────────────────────────────────
    await Player.findByIdAndUpdate(pid, {
      $set: {
        'careerStats.matches':       matches,
        'careerStats.runs':          totalRuns,
        'careerStats.ballsFaced':    totalBalls,
        'careerStats.fours':         totalFours,
        'careerStats.sixes':         totalSixes,
        'careerStats.highestScore':  highestScore,
        'careerStats.notOuts':       notOuts,
        'careerStats.wickets':       totalWickets,
        'careerStats.ballsBowled':   totalBallsBowled,
        'careerStats.runsConceded':  totalRunsConceded,
        'careerStats.fifers':        fifers,
      }
    });

    console.log(
      `  ✔ ${player.name.padEnd(12)} | Mat:${matches} | Runs:${totalRuns} | HS:${highestScore} | SR:${totalBalls ? ((totalRuns/totalBalls)*100).toFixed(1) : 0}` +
      ` | Wkts:${totalWickets}${totalBallsBowled ? ` | Eco:${(totalRunsConceded/(totalBallsBowled/6)).toFixed(2)}` : ''}`
    );
    updated++;
  }

  console.log(`\n🏆 Updated ${updated} player(s).`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
