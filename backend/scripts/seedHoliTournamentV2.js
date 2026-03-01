/**
 * Seed Script v2: GICPL_2025_Holi
 * - Removes the 4 fake teams & their players created previously
 * - Removes old GICPL_2025_Holi tournament + its matches/innings/balls
 * - Uses existing PUNTERS & NISHACHAR teams + their real players
 * - Creates 3 completed T20 matches between them with full scorecards
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

const oid = () => new mongoose.Types.ObjectId();

// ─── Over scripts (realistic T20 scoring) ────────────────────────────────────
// Each ball: { r: runs, f: four, s: six, w: wicket, wt: wicketType }
const INNINGS1_OVERS = [
  [{r:1},{r:4,f:true},{r:0},{r:6,s:true},{r:2},{r:1}],
  [{r:0},{r:0,w:true,wt:'bowled'},{r:4,f:true},{r:1},{r:0},{r:3}],
  [{r:2},{r:6,s:true},{r:1},{r:0},{r:4,f:true},{r:1}],
  [{r:0},{r:1},{r:0,w:true,wt:'caught'},{r:2},{r:4,f:true},{r:0}],
  [{r:1},{r:1},{r:6,s:true},{r:0},{r:1},{r:4,f:true}],
  [{r:0},{r:4,f:true},{r:0,w:true,wt:'lbw'},{r:0},{r:6,s:true},{r:2}],
  [{r:1},{r:0},{r:4,f:true},{r:1},{r:1},{r:0}],
  [{r:6,s:true},{r:0,w:true,wt:'stumped'},{r:1},{r:4,f:true},{r:2},{r:1}],
  [{r:0},{r:1},{r:0},{r:6,s:true},{r:4,f:true},{r:2}],
  [{r:1},{r:1},{r:0,w:true,wt:'caught'},{r:4,f:true},{r:0},{r:6,s:true}],
  [{r:2},{r:0},{r:4,f:true},{r:1},{r:1},{r:0}],
  [{r:6,s:true},{r:6,s:true},{r:4,f:true},{r:0,w:true,wt:'bowled'},{r:2},{r:1}],
  [{r:0},{r:1},{r:0},{r:4,f:true},{r:2},{r:4,f:true}],
  [{r:1},{r:6,s:true},{r:1},{r:0,w:true,wt:'run-out'},{r:4,f:true},{r:2}],
  [{r:0},{r:2},{r:4,f:true},{r:1},{r:0},{r:6,s:true}],
  [{r:4,f:true},{r:0,w:true,wt:'caught'},{r:1},{r:0},{r:6,s:true},{r:4,f:true}],
  [{r:2},{r:1},{r:0},{r:4,f:true},{r:1},{r:2}],
  [{r:6,s:true},{r:0,w:true,wt:'bowled'},{r:4,f:true},{r:1},{r:0},{r:2}],
  [{r:1},{r:4,f:true},{r:0},{r:6,s:true},{r:2},{r:1}],
  [{r:4,f:true},{r:6,s:true},{r:4,f:true},{r:0,w:true,wt:'caught'},{r:2},{r:6,s:true}],
];

const INNINGS2_OVERS = [
  [{r:2},{r:4,f:true},{r:1},{r:0},{r:6,s:true},{r:2}],
  [{r:0},{r:1},{r:4,f:true},{r:0,w:true,wt:'bowled'},{r:2},{r:1}],
  [{r:6,s:true},{r:1},{r:0},{r:4,f:true},{r:2},{r:0}],
  [{r:1},{r:0,w:true,wt:'caught'},{r:4,f:true},{r:0},{r:1},{r:6,s:true}],
  [{r:2},{r:2},{r:0},{r:6,s:true},{r:1},{r:4,f:true}],
  [{r:0,w:true,wt:'lbw'},{r:4,f:true},{r:1},{r:0},{r:6,s:true},{r:2}],
  [{r:1},{r:1},{r:4,f:true},{r:0},{r:2},{r:1}],
  [{r:6,s:true},{r:0,w:true,wt:'stumped'},{r:4,f:true},{r:1},{r:0},{r:2}],
  [{r:1},{r:0},{r:6,s:true},{r:4,f:true},{r:2},{r:0}],
  [{r:0,w:true,wt:'caught'},{r:1},{r:4,f:true},{r:6,s:true},{r:0},{r:2}],
  [{r:4,f:true},{r:1},{r:0},{r:2},{r:6,s:true},{r:1}],
  [{r:0,w:true,wt:'bowled'},{r:6,s:true},{r:4,f:true},{r:2},{r:1},{r:0}],
  [{r:1},{r:4,f:true},{r:2},{r:0},{r:6,s:true},{r:1}],
  [{r:4,f:true},{r:0,w:true,wt:'run-out'},{r:1},{r:6,s:true},{r:2},{r:0}],
  [{r:0},{r:2},{r:4,f:true},{r:6,s:true},{r:1},{r:1}],
  [{r:6,s:true},{r:0,w:true,wt:'caught'},{r:4,f:true},{r:1},{r:0},{r:2}],
  [{r:2},{r:1},{r:6,s:true},{r:0},{r:4,f:true},{r:1}],
  [{r:0,w:true,wt:'bowled'},{r:4,f:true},{r:2},{r:6,s:true},{r:1},{r:0}],
  [{r:1},{r:6,s:true},{r:0},{r:4,f:true},{r:2},{r:1}],
  [{r:6,s:true},{r:4,f:true},{r:0,w:true,wt:'caught'},{r:6,s:true},{r:4,f:true},{r:2}],
];

// Match 2 scripts (different scores)
const MATCH2_INNINGS1 = [
  [{r:4,f:true},{r:1},{r:0},{r:6,s:true},{r:2},{r:0}],
  [{r:0,w:true,wt:'bowled'},{r:1},{r:4,f:true},{r:0},{r:2},{r:6,s:true}],
  [{r:1},{r:0},{r:6,s:true},{r:4,f:true},{r:1},{r:2}],
  [{r:0},{r:4,f:true},{r:0,w:true,wt:'caught'},{r:6,s:true},{r:1},{r:0}],
  [{r:2},{r:6,s:true},{r:1},{r:4,f:true},{r:0},{r:1}],
  [{r:0,w:true,wt:'lbw'},{r:0},{r:4,f:true},{r:6,s:true},{r:2},{r:1}],
  [{r:4,f:true},{r:2},{r:1},{r:0},{r:4,f:true},{r:1}],
  [{r:0,w:true,wt:'caught'},{r:1},{r:6,s:true},{r:0},{r:4,f:true},{r:2}],
  [{r:2},{r:4,f:true},{r:0},{r:6,s:true},{r:1},{r:1}],
  [{r:0,w:true,wt:'bowled'},{r:4,f:true},{r:2},{r:1},{r:0},{r:6,s:true}],
  [{r:1},{r:6,s:true},{r:4,f:true},{r:2},{r:0},{r:1}],
  [{r:0,w:true,wt:'stumped'},{r:4,f:true},{r:1},{r:6,s:true},{r:0},{r:2}],
  [{r:2},{r:1},{r:4,f:true},{r:0},{r:1},{r:6,s:true}],
  [{r:0,w:true,wt:'caught'},{r:6,s:true},{r:2},{r:4,f:true},{r:1},{r:0}],
  [{r:4,f:true},{r:0},{r:1},{r:6,s:true},{r:2},{r:1}],
  [{r:0,w:true,wt:'run-out'},{r:4,f:true},{r:1},{r:0},{r:6,s:true},{r:2}],
  [{r:1},{r:2},{r:4,f:true},{r:0},{r:1},{r:6,s:true}],
  [{r:0,w:true,wt:'bowled'},{r:6,s:true},{r:4,f:true},{r:1},{r:2},{r:0}],
  [{r:4,f:true},{r:1},{r:6,s:true},{r:2},{r:0},{r:4,f:true}],
  [{r:6,s:true},{r:0,w:true,wt:'caught'},{r:4,f:true},{r:6,s:true},{r:2},{r:4,f:true}],
];

const MATCH2_INNINGS2 = [
  [{r:1},{r:6,s:true},{r:4,f:true},{r:0},{r:2},{r:1}],
  [{r:0,w:true,wt:'caught'},{r:4,f:true},{r:1},{r:6,s:true},{r:0},{r:2}],
  [{r:4,f:true},{r:2},{r:1},{r:6,s:true},{r:0},{r:1}],
  [{r:0,w:true,wt:'bowled'},{r:1},{r:4,f:true},{r:2},{r:6,s:true},{r:0}],
  [{r:2},{r:4,f:true},{r:0},{r:6,s:true},{r:1},{r:2}],
  [{r:0,w:true,wt:'lbw'},{r:6,s:true},{r:4,f:true},{r:1},{r:0},{r:2}],
  [{r:1},{r:0},{r:4,f:true},{r:6,s:true},{r:2},{r:1}],
  [{r:0,w:true,wt:'stumped'},{r:4,f:true},{r:2},{r:6,s:true},{r:1},{r:0}],
  [{r:4,f:true},{r:1},{r:0},{r:2},{r:6,s:true},{r:4,f:true}],
  [{r:0,w:true,wt:'run-out'},{r:2},{r:4,f:true},{r:6,s:true},{r:1},{r:0}],
  [{r:6,s:true},{r:4,f:true},{r:1},{r:0},{r:2},{r:4,f:true}],
  [{r:0,w:true,wt:'caught'},{r:4,f:true},{r:6,s:true},{r:1},{r:2},{r:0}],
  [{r:2},{r:6,s:true},{r:4,f:true},{r:1},{r:0},{r:2}],
  [{r:0,w:true,wt:'bowled'},{r:1},{r:6,s:true},{r:4,f:true},{r:2},{r:0}],
  [{r:4,f:true},{r:2},{r:0},{r:6,s:true},{r:1},{r:4,f:true}],
  [{r:0,w:true,wt:'caught'},{r:6,s:true},{r:4,f:true},{r:2},{r:1},{r:0}],
  [{r:1},{r:4,f:true},{r:6,s:true},{r:0},{r:2},{r:1}],
  [{r:0,w:true,wt:'bowled'},{r:4,f:true},{r:2},{r:6,s:true},{r:0},{r:1}],
  [{r:6,s:true},{r:4,f:true},{r:1},{r:2},{r:0},{r:4,f:true}],
  [{r:4,f:true},{r:6,s:true},{r:0,w:true,wt:'caught'},{r:4,f:true},{r:6,s:true},{r:2}],
];

// Match 3 scripts (final/decider)
const MATCH3_INNINGS1 = [
  [{r:6,s:true},{r:4,f:true},{r:1},{r:0},{r:6,s:true},{r:4,f:true}],
  [{r:0,w:true,wt:'bowled'},{r:2},{r:4,f:true},{r:1},{r:6,s:true},{r:0}],
  [{r:4,f:true},{r:1},{r:6,s:true},{r:2},{r:0},{r:4,f:true}],
  [{r:1},{r:0,w:true,wt:'lbw'},{r:6,s:true},{r:4,f:true},{r:0},{r:2}],
  [{r:4,f:true},{r:6,s:true},{r:1},{r:0},{r:4,f:true},{r:2}],
  [{r:0,w:true,wt:'caught'},{r:1},{r:4,f:true},{r:6,s:true},{r:2},{r:0}],
  [{r:6,s:true},{r:4,f:true},{r:0},{r:2},{r:1},{r:4,f:true}],
  [{r:0,w:true,wt:'stumped'},{r:6,s:true},{r:4,f:true},{r:1},{r:0},{r:2}],
  [{r:4,f:true},{r:2},{r:6,s:true},{r:0},{r:4,f:true},{r:1}],
  [{r:0,w:true,wt:'run-out'},{r:4,f:true},{r:6,s:true},{r:2},{r:1},{r:0}],
  [{r:6,s:true},{r:4,f:true},{r:2},{r:1},{r:0},{r:4,f:true}],
  [{r:0,w:true,wt:'bowled'},{r:6,s:true},{r:4,f:true},{r:2},{r:1},{r:0}],
  [{r:4,f:true},{r:6,s:true},{r:1},{r:0},{r:4,f:true},{r:2}],
  [{r:0,w:true,wt:'caught'},{r:4,f:true},{r:6,s:true},{r:1},{r:2},{r:0}],
  [{r:6,s:true},{r:2},{r:4,f:true},{r:1},{r:0},{r:6,s:true}],
  [{r:0,w:true,wt:'caught'},{r:4,f:true},{r:1},{r:6,s:true},{r:0},{r:2}],
  [{r:4,f:true},{r:6,s:true},{r:2},{r:1},{r:4,f:true},{r:0}],
  [{r:0,w:true,wt:'run-out'},{r:6,s:true},{r:4,f:true},{r:2},{r:1},{r:0}],
  [{r:4,f:true},{r:2},{r:6,s:true},{r:4,f:true},{r:1},{r:0}],
  [{r:6,s:true},{r:4,f:true},{r:6,s:true},{r:0,w:true,wt:'caught'},{r:4,f:true},{r:6,s:true}],
];

const MATCH3_INNINGS2 = [
  [{r:4,f:true},{r:6,s:true},{r:2},{r:1},{r:0},{r:4,f:true}],
  [{r:0,w:true,wt:'caught'},{r:4,f:true},{r:6,s:true},{r:1},{r:2},{r:0}],
  [{r:6,s:true},{r:4,f:true},{r:1},{r:2},{r:0},{r:4,f:true}],
  [{r:0,w:true,wt:'bowled'},{r:6,s:true},{r:4,f:true},{r:1},{r:0},{r:2}],
  [{r:4,f:true},{r:2},{r:6,s:true},{r:1},{r:4,f:true},{r:0}],
  [{r:0,w:true,wt:'lbw'},{r:4,f:true},{r:6,s:true},{r:2},{r:1},{r:0}],
  [{r:6,s:true},{r:1},{r:4,f:true},{r:0},{r:2},{r:6,s:true}],
  [{r:0,w:true,wt:'stumped'},{r:4,f:true},{r:2},{r:6,s:true},{r:1},{r:4,f:true}],
  [{r:2},{r:6,s:true},{r:4,f:true},{r:1},{r:0},{r:4,f:true}],
  [{r:0,w:true,wt:'run-out'},{r:4,f:true},{r:6,s:true},{r:2},{r:4,f:true},{r:1}],
  [{r:6,s:true},{r:4,f:true},{r:2},{r:0},{r:6,s:true},{r:1}],
  [{r:0,w:true,wt:'caught'},{r:4,f:true},{r:6,s:true},{r:2},{r:1},{r:4,f:true}],
  [{r:4,f:true},{r:2},{r:6,s:true},{r:0},{r:4,f:true},{r:1}],
  [{r:0,w:true,wt:'bowled'},{r:6,s:true},{r:4,f:true},{r:1},{r:2},{r:0}],
  [{r:4,f:true},{r:6,s:true},{r:1},{r:4,f:true},{r:0},{r:2}],
  [{r:0,w:true,wt:'caught'},{r:4,f:true},{r:6,s:true},{r:2},{r:4,f:true},{r:1}],
  [{r:6,s:true},{r:4,f:true},{r:0},{r:2},{r:6,s:true},{r:1}],
  [{r:0,w:true,wt:'hit-wicket'},{r:4,f:true},{r:6,s:true},{r:2},{r:1},{r:4,f:true}],
  [{r:6,s:true},{r:4,f:true},{r:2},{r:6,s:true},{r:1},{r:0}],
  [{r:4,f:true},{r:6,s:true},{r:4,f:true},{r:6,s:true},{r:0,w:true,wt:'caught'},{r:4,f:true}],
];

// ─── Core innings builder ─────────────────────────────────────────────────────
function buildInnings({ matchId, inningsId, inningsNumber, battingTeamId, bowlingTeamId,
                        batsmen, bowlers, overScripts, targetRuns }) {
  const balls = [];
  const battingStats = {};
  const bowlingStats = {};

  batsmen.forEach(p => {
    battingStats[p.toString()] = { player: p, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: '' };
  });
  bowlers.forEach(p => {
    bowlingStats[p.toString()] = { player: p, overs: 0, balls: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0 };
  });

  let totalRuns = 0, totalWickets = 0;
  let strikerIdx = 0, nonStrikerIdx = 1;
  const fallOfWickets = [];
  const extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
  const bowlerCount = bowlers.length;

  for (let over = 0; over < 20; over++) {
    const bowlerIdx = over % bowlerCount;
    const currentBowler = bowlers[bowlerIdx];
    const overBalls = overScripts[over] || [{r:1},{r:0},{r:0},{r:4,f:true},{r:2},{r:1}];
    const bowlerKey = currentBowler.toString();

    let ballNum = 0;
    for (const b of overBalls) {
      const striker = batsmen[strikerIdx];
      if (!striker) break;

      ballNum++;
      const runsScored = b.r || 0;
      const isFour  = !!b.f;
      const isSix   = !!b.s;
      const isWicket = !!b.w && totalWickets < 10;

      totalRuns += runsScored;

      // batting stats
      const bsKey = striker.toString();
      if (!battingStats[bsKey]) {
        battingStats[bsKey] = { player: striker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: '' };
      }
      battingStats[bsKey].runs += runsScored;
      battingStats[bsKey].balls += 1;
      if (isFour) battingStats[bsKey].fours += 1;
      if (isSix)  battingStats[bsKey].sixes  += 1;

      // bowling stats
      bowlingStats[bowlerKey].runsConceded += runsScored;
      bowlingStats[bowlerKey].balls += 1;

      if (isWicket) {
        totalWickets++;
        battingStats[bsKey].isOut = true;
        battingStats[bsKey].dismissal = b.wt || 'bowled';
        bowlingStats[bowlerKey].wickets += 1;
        fallOfWickets.push({ wicketNumber: totalWickets, runs: totalRuns, overs: `${over}.${ballNum}`, player: striker });
        strikerIdx++;
        if (strikerIdx >= batsmen.length) break;
      } else {
        if (runsScored % 2 !== 0) [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
      }

      balls.push({
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
        commentary: buildComm(over, ballNum, runsScored, isWicket, b.wt, isFour, isSix)
      });

      if (targetRuns && totalRuns >= targetRuns) break;
    }

    bowlingStats[bowlerKey].overs += 1;
    // end-of-over: rotate strike
    [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
    if (totalWickets >= 10) break;
    if (targetRuns && totalRuns >= targetRuns) break;
  }

  const lastBall = balls[balls.length - 1];
  const finalOvers = lastBall ? lastBall.scoreSnapshot.overs  : 20;
  const finalBalls = lastBall ? lastBall.scoreSnapshot.balls  : 0;

  return {
    innings: {
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
    },
    balls
  };
}

function buildComm(over, ball, runs, isWicket, wt, isFour, isSix) {
  const loc = `${over + 1}.${ball}`;
  if (isWicket) return `${loc} - WICKET! ${wt || 'out'}`;
  if (isSix)    return `${loc} - SIX! Massive hit`;
  if (isFour)   return `${loc} - FOUR!`;
  if (runs === 0) return `${loc} - Dot ball`;
  return `${loc} - ${runs} run${runs > 1 ? 's' : ''}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');

  // ── Find admin user ──────────────────────────────────────────────────────────
  const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne();
  const adminId = adminUser._id;
  console.log('👤 Admin:', adminUser.email);

  // ── Step 1: Remove 4 fake teams created in previous seed ────────────────────
  const fakeTeamNames = ['GICPL Rising Stars', 'Holi Warriors', 'Spring Smashers', 'Colors XI'];
  const fakeTeams = await Team.find({ name: { $in: fakeTeamNames } }).select('_id players');
  const fakeTeamIds  = fakeTeams.map(t => t._id);
  const fakePlayerIds = fakeTeams.flatMap(t => t.players);

  if (fakeTeamIds.length) {
    await Team.deleteMany({ _id: { $in: fakeTeamIds } });
    await Player.deleteMany({ _id: { $in: fakePlayerIds } });
    console.log(`🗑️  Removed ${fakeTeamIds.length} fake teams & ${fakePlayerIds.length} fake players`);
  }

  // ── Step 2: Remove old GICPL_2025_Holi tournament & related data ────────────
  const oldTournament = await Tournament.findOne({ name: 'GICPL_2025_Holi' });
  if (oldTournament) {
    await Ball.deleteMany({ match: { $in: oldTournament.matches } });
    await Innings.deleteMany({ match: { $in: oldTournament.matches } });
    await Match.deleteMany({ _id: { $in: oldTournament.matches } });
    await Tournament.deleteOne({ _id: oldTournament._id });
    console.log('🗑️  Removed old GICPL_2025_Holi tournament');
  }

  // ── Step 3: Load existing real teams ────────────────────────────────────────
  const punters   = await Team.findOne({ name: 'PUNTERS' }).populate('players').lean();
  const nishachar = await Team.findOne({ name: 'NISHACHAR' }).populate('players').lean();

  if (!punters || !nishachar) {
    throw new Error('Could not find PUNTERS or NISHACHAR teams!');
  }
  console.log(`🏏 PUNTERS (${punters.players.length} players): ${punters.players.map(p=>p.name).join(', ')}`);
  console.log(`🏏 NISHACHAR (${nishachar.players.length} players): ${nishachar.players.map(p=>p.name).join(', ')}`);

  // ── Step 4: Build a complete T20 match ──────────────────────────────────────
  async function createMatch({ battingFirst, battingSecond, scripts1, scripts2,
                               venue, matchDate, tournamentId, matchNum }) {
    const matchId = oid();
    const inn1Id  = oid();
    const inn2Id  = oid();

    const bFirstPlayers  = battingFirst.players.map(p => p._id || p);
    const bSecondPlayers = battingSecond.players.map(p => p._id || p);

    // Batsmen = first 6, rest bowl (cap at 5 bowlers)
    const batsmen1 = bFirstPlayers.slice(0, 6);
    const bowlers1Idx = bSecondPlayers.slice(6, 11).length >= 5
      ? bSecondPlayers.slice(6, 11) : bSecondPlayers.slice(Math.max(0, bSecondPlayers.length - 5));
    const bowlers1 = bowlers1Idx.length ? bowlers1Idx : bSecondPlayers.slice(0, 5);

    const batsmen2 = bSecondPlayers.slice(0, 6);
    const bowlers2Idx = bFirstPlayers.slice(6, 11).length >= 5
      ? bFirstPlayers.slice(6, 11) : bFirstPlayers.slice(Math.max(0, bFirstPlayers.length - 5));
    const bowlers2 = bowlers2Idx.length ? bowlers2Idx : bFirstPlayers.slice(0, 5);

    // Include lower order in batting order
    const fullBatsmen1 = [...new Set([...batsmen1, ...bFirstPlayers.slice(6)])];
    const fullBatsmen2 = [...new Set([...batsmen2, ...bSecondPlayers.slice(6)])];

    // Innings 1
    const { innings: inn1Data, balls: balls1 } = buildInnings({
      matchId, inningsId: inn1Id, inningsNumber: 1,
      battingTeamId: battingFirst._id, bowlingTeamId: battingSecond._id,
      batsmen: fullBatsmen1,
      bowlers: bowlers1,
      overScripts: scripts1
    });

    // Innings 2
    const { innings: inn2Data, balls: balls2 } = buildInnings({
      matchId, inningsId: inn2Id, inningsNumber: 2,
      battingTeamId: battingSecond._id, bowlingTeamId: battingFirst._id,
      batsmen: fullBatsmen2,
      bowlers: bowlers2,
      overScripts: scripts2,
      targetRuns: inn1Data.totalRuns + 1
    });

    const teamXWon = inn2Data.totalRuns < inn1Data.totalRuns ||
                     (inn2Data.totalRuns === inn1Data.totalRuns && inn2Data.totalWickets === 10);
    const winner     = teamXWon ? battingFirst : battingSecond;
    const loser      = teamXWon ? battingSecond : battingFirst;
    const runDiff    = Math.abs(inn1Data.totalRuns - inn2Data.totalRuns);
    const wktsLeft   = 10 - inn2Data.totalWickets;
    const resultDesc = teamXWon
      ? `${battingFirst.name} won by ${runDiff} runs`
      : `${battingSecond.name} won by ${wktsLeft} wicket${wktsLeft !== 1 ? 's' : ''}`;

    await Match.create({
      _id: matchId,
      teamA: battingFirst._id,
      teamB: battingSecond._id,
      playingXI_A: bFirstPlayers.slice(0, 11),
      playingXI_B: bSecondPlayers.slice(0, 11),
      totalOvers: 20,
      venue,
      matchType: 'T20',
      status: 'completed',
      currentInnings: 2,
      tossWinner: battingFirst._id,
      tossDecision: 'bat',
      scorer: adminId,
      winner: winner._id,
      resultDescription: resultDesc,
      tournament: tournamentId,
      matchDate,
      target: inn1Data.totalRuns + 1,
      playerOfMatch: fullBatsmen1[0],
      version: 0
    });

    await Innings.create(inn1Data);
    await Innings.create(inn2Data);
    await Ball.insertMany(balls1, { ordered: false }).catch(() => {});
    await Ball.insertMany(balls2, { ordered: false }).catch(() => {});

    const inn1Summary = `${inn1Data.totalRuns}/${inn1Data.totalWickets} (${inn1Data.overs}.${inn1Data.balls} ov)`;
    const inn2Summary = `${inn2Data.totalRuns}/${inn2Data.totalWickets} (${inn2Data.overs}.${inn2Data.balls} ov)`;
    console.log(`  ✅ Match ${matchNum}: ${battingFirst.name} vs ${battingSecond.name}`);
    console.log(`     ${battingFirst.name}:   ${inn1Summary}`);
    console.log(`     ${battingSecond.name}: ${inn2Summary}`);
    console.log(`     Result: ${resultDesc}`);
    console.log(`     Balls:  ${balls1.length + balls2.length}`);

    return matchId;
  }

  // ── Step 5: Create tournament ID ────────────────────────────────────────────
  const tournamentId = oid();

  console.log('\n🏆 Creating 3 T20 matches...\n');

  // Match 1: PUNTERS bats first vs NISHACHAR
  const matchId1 = await createMatch({
    battingFirst: punters, battingSecond: nishachar,
    scripts1: INNINGS1_OVERS, scripts2: INNINGS2_OVERS,
    venue: 'GICPL Ground, Sector 5',
    matchDate: new Date('2025-03-13'),
    tournamentId, matchNum: 1
  });

  // Match 2: NISHACHAR bats first vs PUNTERS
  const matchId2 = await createMatch({
    battingFirst: nishachar, battingSecond: punters,
    scripts1: MATCH2_INNINGS1, scripts2: MATCH2_INNINGS2,
    venue: 'Holi Maidan, Sector 12',
    matchDate: new Date('2025-03-14'),
    tournamentId, matchNum: 2
  });

  // Match 3 (Final): PUNTERS bats first vs NISHACHAR
  const matchId3 = await createMatch({
    battingFirst: punters, battingSecond: nishachar,
    scripts1: MATCH3_INNINGS1, scripts2: MATCH3_INNINGS2,
    venue: 'GICPL Ground, Sector 5',
    matchDate: new Date('2025-03-15'),
    tournamentId, matchNum: 3
  });

  // ── Step 6: Create Tournament ────────────────────────────────────────────────
  await Tournament.create({
    _id: tournamentId,
    name: 'GICPL_2025_Holi',
    organizer: adminId,
    teams: [punters._id, nishachar._id],
    matches: [matchId1, matchId2, matchId3],
    format: 'league',
    status: 'completed',
    startDate: new Date('2025-03-13'),
    endDate:   new Date('2025-03-15'),
    pointsTable: [
      { team: punters._id,   played: 3, won: 0, lost: 0, noResult: 0, points: 0, nrr: 0 },
      { team: nishachar._id, played: 3, won: 0, lost: 0, noResult: 0, points: 0, nrr: 0 }
    ]
  });

  console.log('\n🏆 Tournament GICPL_2025_Holi created successfully!');
  console.log('   Teams: PUNTERS & NISHACHAR (existing real players)');
  console.log('   Matches: 3 completed T20 matches with full scorecards\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
