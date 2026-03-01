/**
 * Seed Script: GICPL_2025_Holi Tournament
 * Creates:
 *  - 1 Tournament (GICPL_2025_Holi)
 *  - 4 Teams  (6 players each = 24 players)
 *  - 3 Completed T20 Matches with full Innings + Ball-by-ball data
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const User       = require('../models/User');
const Team       = require('../models/Team');
const Player     = require('../models/Player');
const Tournament = require('../models/Tournament');
const Match      = require('../models/Match');
const Innings    = require('../models/Innings');
const Ball       = require('../models/Ball');

// ── helpers ──────────────────────────────────────────────────────────────────
const oid = () => new mongoose.Types.ObjectId();

/** Build a deterministic T20 innings (20 overs, realistic scores) */
function buildInnings({ matchId, inningsId, inningsNumber, battingTeamId, bowlingTeamId,
                        batsmen, bowlers, targetRuns }) {
  const balls = [];
  const battingStats = {};
  const bowlingStats = {};

  batsmen.forEach(p => {
    battingStats[p.toString()] = { player: p, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: '' };
  });
  bowlers.forEach(p => {
    bowlingStats[p.toString()] = { player: p, overs: 0, balls: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0 };
  });

  // Preset over scripts for two innings to make scores realistic
  // Each over: array of {runs, extra: 'none'|'wide'|'no-ball', wicket: bool, wicketType}
  const overScripts1 = [
    [{r:1},{r:4,f:true},{r:0},{r:6,s:true},{r:2},{r:1}],                              // 14
    [{r:0},{r:0,w:true,wt:'bowled'},{r:4,f:true},{r:1},{r:0},{r:3}],                  // 8-1w
    [{r:2},{r:6,s:true},{r:1},{r:0},{r:4,f:true},{r:1}],                              // 14
    [{r:0},{r:1},{r:0,w:true,wt:'caught'},{r:2},{r:4,f:true},{r:0}],                  // 7-1w
    [{r:1},{r:1},{r:6,s:true},{r:0},{r:1},{r:4,f:true}],                              // 13
    [{r:0},{r:4,f:true},{r:0,w:true,wt:'lbw'},{r:0},{r:6,s:true},{r:2}],             // 12-1w
    [{r:1},{r:0},{r:4,f:true},{r:1},{r:1},{r:0}],                                     // 7
    [{r:6,s:true},{r:0,w:true,wt:'stumped'},{r:1},{r:4,f:true},{r:2},{r:1}],         // 14-1w
    [{r:0},{r:1},{r:0},{r:6,s:true},{r:4,f:true},{r:2}],                             // 13
    [{r:1},{r:1},{r:0,w:true,wt:'caught'},{r:4,f:true},{r:0},{r:6,s:true}],          // 12-1w
    [{r:2},{r:0},{r:4,f:true},{r:1},{r:1},{r:0}],                                     // 8
    [{r:6,s:true},{r:6,s:true},{r:4,f:true},{r:0,w:true,wt:'bowled'},{r:2},{r:1}],   // 19-1w
    [{r:0},{r:1},{r:0},{r:4,f:true},{r:2},{r:4,f:true}],                             // 11
    [{r:1},{r:6,s:true},{r:1},{r:0,w:true,wt:'run-out'},{r:4,f:true},{r:2}],        // 14-1w
    [{r:0},{r:2},{r:4,f:true},{r:1},{r:0},{r:6,s:true}],                             // 13
    [{r:4,f:true},{r:0,w:true,wt:'caught'},{r:1},{r:0},{r:6,s:true},{r:4,f:true}],  // 15-1w
    [{r:2},{r:1},{r:0},{r:4,f:true},{r:1},{r:2}],                                    // 10
    [{r:6,s:true},{r:0,w:true,wt:'bowled'},{r:4,f:true},{r:1},{r:0},{r:2}],         // 13-1w
    [{r:1},{r:4,f:true},{r:0},{r:6,s:true},{r:2},{r:1}],                             // 14
    [{r:4,f:true},{r:6,s:true},{r:4,f:true},{r:0,w:true,wt:'caught'},{r:2},{r:6,s:true}],  // 22-1w
  ];

  const overScripts2 = [
    [{r:2},{r:4,f:true},{r:1},{r:0},{r:6,s:true},{r:2}],                             // 15
    [{r:0},{r:1},{r:4,f:true},{r:0,w:true,wt:'bowled'},{r:2},{r:1}],                // 8-1w
    [{r:6,s:true},{r:1},{r:0},{r:4,f:true},{r:2},{r:0}],                            // 13
    [{r:1},{r:0,w:true,wt:'caught'},{r:4,f:true},{r:0},{r:1},{r:6,s:true}],        // 12-1w
    [{r:2},{r:2},{r:0},{r:6,s:true},{r:1},{r:4,f:true}],                            // 15
    [{r:0,w:true,wt:'lbw'},{r:4,f:true},{r:1},{r:0},{r:6,s:true},{r:2}],           // 13-1w
    [{r:1},{r:1},{r:4,f:true},{r:0},{r:2},{r:1}],                                   // 9
    [{r:6,s:true},{r:0,w:true,wt:'stumped'},{r:4,f:true},{r:1},{r:0},{r:2}],       // 13-1w
    [{r:1},{r:0},{r:6,s:true},{r:4,f:true},{r:2},{r:0}],                            // 13
    [{r:0,w:true,wt:'caught'},{r:1},{r:4,f:true},{r:6,s:true},{r:0},{r:2}],        // 13-1w
    [{r:4,f:true},{r:1},{r:0},{r:2},{r:6,s:true},{r:1}],                            // 14
    [{r:0,w:true,wt:'bowled'},{r:6,s:true},{r:4,f:true},{r:2},{r:1},{r:0}],        // 13-1w
    [{r:1},{r:4,f:true},{r:2},{r:0},{r:6,s:true},{r:1}],                            // 14
    [{r:4,f:true},{r:0,w:true,wt:'run-out'},{r:1},{r:6,s:true},{r:2},{r:0}],       // 13-1w
    [{r:0},{r:2},{r:4,f:true},{r:6,s:true},{r:1},{r:1}],                            // 14
    [{r:6,s:true},{r:0,w:true,wt:'caught'},{r:4,f:true},{r:1},{r:0},{r:2}],        // 13-1w
    [{r:2},{r:1},{r:6,s:true},{r:0},{r:4,f:true},{r:1}],                            // 14
    [{r:0,w:true,wt:'bowled'},{r:4,f:true},{r:2},{r:6,s:true},{r:1},{r:0}],        // 13-1w
    [{r:1},{r:6,s:true},{r:0},{r:4,f:true},{r:2},{r:1}],                            // 14
    [{r:6,s:true},{r:4,f:true},{r:0,w:true,wt:'caught'},{r:6,s:true},{r:4,f:true},{r:2}],  // 22-1w
  ];

  const scripts = inningsNumber === 1 ? overScripts1 : overScripts2;

  let totalRuns = 0, totalWickets = 0;
  let currentBatsmanIdx = 0, nonStrikerIdx = 1;
  const wicketsPerBatsman = {}; // track who is out
  const bowlerCount = bowlers.length;

  const fallOfWickets = [];
  const extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };

  // Assign overs to bowlers round-robin (max 4 overs each in T20)
  // bowlers[0..3] get 5 overs, but T20: max 4. Use 5 bowlers x 4 = 20.
  const bowlerOversAllowed = {};
  bowlers.forEach((b, i) => { bowlerOversAllowed[b.toString()] = 0; });

  for (let over = 0; over < 20; over++) {
    // pick bowler: round-robin, staying within 4-over cap
    const bowlerIdx = over % bowlerCount;
    const currentBowler = bowlers[bowlerIdx];

    const overBalls = scripts[over] || [{r:1},{r:0},{r:0},{r:4,f:true},{r:2},{r:1}];

    let ballNum = 0;
    for (const b of overBalls) {
      ballNum++;

      const striker = batsmen[currentBatsmanIdx];
      if (!striker) break; // all out

      const isWicket = !!b.w && totalWickets < 10;
      const runsScored = b.r || 0;
      const isFour = !!b.f;
      const isSix  = !!b.s;

      totalRuns += runsScored;

      // batting stats
      const bsKey = striker.toString();
      if (!battingStats[bsKey]) {
        battingStats[bsKey] = { player: striker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: '' };
      }
      battingStats[bsKey].runs  += runsScored;
      battingStats[bsKey].balls += 1;
      if (isFour) battingStats[bsKey].fours += 1;
      if (isSix)  battingStats[bsKey].sixes += 1;

      // bowling stats
      const bowlerKey = currentBowler.toString();
      if (!bowlingStats[bowlerKey]) {
        bowlingStats[bowlerKey] = { player: currentBowler, overs: 0, balls: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0 };
      }
      bowlingStats[bowlerKey].runsConceded += runsScored;
      bowlingStats[bowlerKey].balls += 1;

      if (isWicket) {
        totalWickets++;
        battingStats[bsKey].isOut = true;
        battingStats[bsKey].dismissal = b.wt || 'bowled';
        bowlingStats[bowlerKey].wickets += 1;

        fallOfWickets.push({
          wicketNumber: totalWickets,
          runs: totalRuns,
          overs: `${over}.${ballNum}`,
          player: striker
        });

        currentBatsmanIdx++;
        if (currentBatsmanIdx >= batsmen.length) break;
      } else {
        // rotate strike on odd runs
        if (runsScored % 2 !== 0) {
          [currentBatsmanIdx, nonStrikerIdx] = [nonStrikerIdx, currentBatsmanIdx];
        }
      }

      const ball = {
        _id: oid(),
        match: matchId,
        innings: inningsId,
        inningsNumber,
        over,
        ballNumber: ballNum,
        batsman: striker,
        bowler: currentBowler,
        runs: runsScored,
        extraRuns: 0,
        extraType: 'none',
        wicket: isWicket,
        wicketType: isWicket ? (b.wt || 'bowled') : '',
        playerOut: isWicket ? striker : null,
        scoreSnapshot: { totalRuns, totalWickets, overs: over, balls: ballNum },
        commentary: buildCommentary({ over, ballNum, striker, bowler: currentBowler,
                                      runs: runsScored, isWicket, wicketType: b.wt, isFour, isSix })
      };
      balls.push(ball);

      // Check if target chased
      if (targetRuns && totalRuns >= targetRuns) break;
    }

    // rotate strike end of over
    [currentBatsmanIdx, nonStrikerIdx] = [nonStrikerIdx, currentBatsmanIdx];

    // update bowler overs
    bowlingStats[currentBowler.toString()].overs += 1;

    if (totalWickets >= 10) break;
    if (targetRuns && totalRuns >= targetRuns) break;
  }

  // final overs count
  const lastBall = balls[balls.length - 1];
  const finalOvers  = lastBall ? lastBall.scoreSnapshot.overs  : 20;
  const finalBalls  = lastBall ? lastBall.scoreSnapshot.balls  : 0;

  const innings = {
    _id: inningsId,
    match: matchId,
    inningsNumber,
    battingTeam: battingTeamId,
    bowlingTeam: bowlingTeamId,
    totalRuns,
    totalWickets,
    overs: finalOvers,
    balls: finalBalls,
    isCompleted: true,
    battingStats: Object.values(battingStats),
    bowlingStats: Object.values(bowlingStats),
    extras,
    fallOfWickets,
    partnershipRuns: 0,
    partnershipBalls: 0
  };

  return { innings, balls };
}

/** Simple commentary generator */
function buildCommentary({ over, ballNum, striker, bowler, runs, isWicket, wicketType, isFour, isSix }) {
  const overStr = `${over + 1}.${ballNum}`;
  if (isWicket) return `${overStr} - WICKET! ${wicketType || 'out'}`;
  if (isSix)    return `${overStr} - SIX! Massive hit for 6 runs`;
  if (isFour)   return `${overStr} - FOUR! Good shot for 4 runs`;
  if (runs === 0) return `${overStr} - Dot ball`;
  return `${overStr} - ${runs} run${runs > 1 ? 's' : ''}`;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected');

  // ── Step 0: Find or create admin user ──────────────────────────────────────
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) adminUser = await User.findOne();
  if (!adminUser) {
    const bcrypt = require('bcryptjs');
    adminUser = await User.create({
      name: 'Admin',
      email: 'admin@gicpl.com',
      password: await bcrypt.hash('Admin@123', 10),
      role: 'admin'
    });
    console.log('➕ Created admin user');
  }
  const adminId = adminUser._id;
  console.log('👤 Using admin:', adminUser.email);

  // ── Step 1: Clean old Holi tournament data ─────────────────────────────────
  const oldTournament = await Tournament.findOne({ name: 'GICPL_2025_Holi' });
  if (oldTournament) {
    const matchIds = oldTournament.matches;
    await Ball.deleteMany({ match: { $in: matchIds } });
    await Innings.deleteMany({ match: { $in: matchIds } });
    await Match.deleteMany({ _id: { $in: matchIds } });
    await Tournament.deleteOne({ _id: oldTournament._id });
    console.log('🗑️  Removed old GICPL_2025_Holi data');
  }

  // ── Step 2: Create Players ─────────────────────────────────────────────────
  const teamAPlayerNames = [
    'Rohit Sharma', 'Virat Kohli', 'Shubman Gill',
    'Hardik Pandya', 'Rishabh Pant', 'Ravindra Jadeja',
    'Jasprit Bumrah', 'Mohammed Shami', 'Kuldeep Yadav',
    'Yuzvendra Chahal', 'Deepak Chahar'
  ];
  const teamBPlayerNames = [
    'David Warner', 'Steve Smith', 'Glenn Maxwell',
    'Pat Cummins', 'Mitchell Marsh', 'Marcus Stoinis',
    'Josh Hazlewood', 'Adam Zampa', 'Travis Head',
    'Matthew Wade', 'Nathan Lyon'
  ];
  const teamCPlayerNames = [
    'Babar Azam', 'Mohammad Rizwan', 'Shaheen Afridi',
    'Fakhar Zaman', 'Shadab Khan', 'Naseem Shah',
    'Haris Rauf', 'Iftikhar Ahmed', 'Mohammad Nawaz',
    'Azam Khan', 'Saim Ayub'
  ];
  const teamDPlayerNames = [
    'Quinton de Kock', 'Temba Bavuma', 'Kagiso Rabada',
    'Aiden Markram', 'David Miller', 'Marco Jansen',
    'Anrich Nortje', 'Tabraiz Shamsi', 'Rassie van der Dussen',
    'Heinrich Klaasen', 'Keshav Maharaj'
  ];

  async function createPlayers(names, role = 'all-rounder') {
    const players = [];
    for (const name of names) {
      const p = await Player.create({
        name,
        battingStyle: 'right-hand',
        bowlingStyle: 'medium-fast',
        role,
        careerStats: { matches: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, highestScore: 0, wickets: 0, ballsBowled: 0, runsConceded: 0 }
      });
      players.push(p);
    }
    return players;
  }

  const playersA = await createPlayers(teamAPlayerNames);
  const playersB = await createPlayers(teamBPlayerNames);
  const playersC = await createPlayers(teamCPlayerNames);
  const playersD = await createPlayers(teamDPlayerNames);
  console.log('👥 Players created');

  // ── Step 3: Create Teams ───────────────────────────────────────────────────
  const teamA = await Team.create({
    name: 'GICPL Rising Stars',
    shortName: 'GRS',
    city: 'Mumbai',
    createdBy: adminId,
    players: playersA.map(p => p._id),
    captain: playersA[0]._id
  });
  const teamB = await Team.create({
    name: 'Holi Warriors',
    shortName: 'HLW',
    city: 'Delhi',
    createdBy: adminId,
    players: playersB.map(p => p._id),
    captain: playersB[0]._id
  });
  const teamC = await Team.create({
    name: 'Spring Smashers',
    shortName: 'SSM',
    city: 'Pune',
    createdBy: adminId,
    players: playersC.map(p => p._id),
    captain: playersC[0]._id
  });
  const teamD = await Team.create({
    name: 'Colors XI',
    shortName: 'CLX',
    city: 'Bangalore',
    createdBy: adminId,
    players: playersD.map(p => p._id),
    captain: playersD[0]._id
  });
  console.log('🏏 Teams created:', teamA.name, '|', teamB.name, '|', teamC.name, '|', teamD.name);

  // ── Step 4: Helper to build a complete T20 match ──────────────────────────
  async function createT20Match({ teamX, teamXPlayers, teamY, teamYPlayers,
                                  venue, matchDate, tournamentId, matchNum }) {
    const matchId = oid();
    // Batsmen: first 6 players; Bowlers: last 5 players
    const batsmenX  = teamXPlayers.slice(0, 6).map(p => p._id);
    const bowlersX  = teamXPlayers.slice(6, 11).map(p => p._id);
    const batsmenY  = teamYPlayers.slice(0, 6).map(p => p._id);
    const bowlersY  = teamYPlayers.slice(6, 11).map(p => p._id);

    // Build innings 1 (teamX bats)
    const inn1Id = oid();
    const { innings: inn1Data, balls: balls1 } = buildInnings({
      matchId, inningsId: inn1Id, inningsNumber: 1,
      battingTeamId: teamX._id, bowlingTeamId: teamY._id,
      batsmen: [...batsmenX, ...bowlersX],
      bowlers: [...bowlersY, ...batsmenY.slice(0, 1)]
    });

    // Build innings 2 (teamY chases)
    const inn2Id = oid();
    const { innings: inn2Data, balls: balls2 } = buildInnings({
      matchId, inningsId: inn2Id, inningsNumber: 2,
      battingTeamId: teamY._id, bowlingTeamId: teamX._id,
      batsmen: [...batsmenY, ...bowlersY],
      bowlers: [...bowlersX, ...batsmenX.slice(0, 1)],
      targetRuns: inn1Data.totalRuns + 1
    });

    // Determine winner
    const teamXWon = inn2Data.totalRuns < inn1Data.totalRuns ||
                     (inn2Data.totalRuns === inn1Data.totalRuns && inn2Data.totalWickets === 10);
    const winnerId = teamXWon ? teamX._id : teamY._id;
    const winnerName = teamXWon ? teamX.name : teamY.name;
    const runDiff = Math.abs(inn1Data.totalRuns - inn2Data.totalRuns);
    const wicketsLeft = 10 - inn2Data.totalWickets;
    const resultDesc = teamXWon
      ? `${teamX.name} won by ${runDiff} runs`
      : `${teamY.name} won by ${wicketsLeft} wickets`;

    // Persist match
    await Match.create({
      _id: matchId,
      teamA: teamX._id,
      teamB: teamY._id,
      playingXI_A: teamXPlayers.map(p => p._id),
      playingXI_B: teamYPlayers.map(p => p._id),
      totalOvers: 20,
      venue,
      matchType: 'T20',
      status: 'completed',
      currentInnings: 2,
      tossWinner: teamX._id,
      tossDecision: 'bat',
      scorer: adminId,
      winner: winnerId,
      resultDescription: resultDesc,
      tournament: tournamentId,
      matchDate,
      target: inn1Data.totalRuns + 1,
      playerOfMatch: batsmenX[0],
      version: 0
    });

    // Persist innings
    await Innings.create(inn1Data);
    await Innings.create(inn2Data);

    // Persist balls in batches
    await Ball.insertMany(balls1, { ordered: false }).catch(() => {});
    await Ball.insertMany(balls2, { ordered: false }).catch(() => {});

    console.log(`  ✅ Match ${matchNum}: ${teamX.name} vs ${teamY.name}  →  ${resultDesc}`);
    console.log(`     Innings 1: ${inn1Data.totalRuns}/${inn1Data.totalWickets} in ${inn1Data.overs}.${inn1Data.balls} overs`);
    console.log(`     Innings 2: ${inn2Data.totalRuns}/${inn2Data.totalWickets} in ${inn2Data.overs}.${inn2Data.balls} overs`);
    console.log(`     Balls recorded: ${balls1.length + balls2.length}`);

    return matchId;
  }

  // ── Step 5: Create Tournament placeholder first (needs id for matches) ─────
  const tournamentId = oid();

  console.log('\n🏆 Creating 3 T20 matches...');
  const matchId1 = await createT20Match({
    teamX: teamA, teamXPlayers: playersA,
    teamY: teamB, teamYPlayers: playersB,
    venue: 'GICPL Cricket Ground, Mumbai',
    matchDate: new Date('2025-03-13'),
    tournamentId,
    matchNum: 1
  });

  const matchId2 = await createT20Match({
    teamX: teamC, teamXPlayers: playersC,
    teamY: teamD, teamYPlayers: playersD,
    venue: 'Holi Maidan, Pune',
    matchDate: new Date('2025-03-14'),
    tournamentId,
    matchNum: 2
  });

  const matchId3 = await createT20Match({
    teamX: teamA, teamXPlayers: playersA,
    teamY: teamC, teamYPlayers: playersC,
    venue: 'GICPL Cricket Ground, Mumbai',
    matchDate: new Date('2025-03-15'),
    tournamentId,
    matchNum: 3
  });

  // ── Step 6: Create Tournament ─────────────────────────────────────────────
  const allTeams = [teamA._id, teamB._id, teamC._id, teamD._id];
  const allMatches = [matchId1, matchId2, matchId3];

  // Simple points table calculation
  const pointsTable = allTeams.map(teamId => ({
    team: teamId,
    played: 0, won: 0, lost: 0, noResult: 0, points: 0, nrr: 0,
    runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0
  }));

  const tournament = await Tournament.create({
    _id: tournamentId,
    name: 'GICPL_2025_Holi',
    organizer: adminId,
    teams: allTeams,
    matches: allMatches,
    format: 'league',
    status: 'completed',
    startDate: new Date('2025-03-13'),
    endDate:   new Date('2025-03-15'),
    pointsTable
  });

  console.log('\n🏆 Tournament created:', tournament.name);
  console.log('   Teams:', allTeams.length);
  console.log('   Matches:', allMatches.length);
  console.log('   Status:', tournament.status);
  console.log('\n✅ Seed complete! GICPL_2025_Holi is ready.\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
