/**
 * Seed: GICPL 2026_HOLI
 * - Uses existing tournament document (id: 699d96f410a4cb5e2a2e12d4)
 * - Uses PUNTERS & NISHACHAR (real teams/players)
 * - 3 T20 matches, scores 150–200, PUNTERS wins 2-1
 *   Match 1: PUNTERS wins  | Match 2: NISHACHAR wins | Match 3: PUNTERS wins
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const User       = require('../models/User');
const Team       = require('../models/Team');
const Player     = require('../models/Player'); // needed for Team.populate
const Tournament = require('../models/Tournament');
const Match      = require('../models/Match');
const Innings    = require('../models/Innings');
const Ball       = require('../models/Ball');

const oid = () => new mongoose.Types.ObjectId();
const TOURNAMENT_ID = '699d96f410a4cb5e2a2e12d4';

/* ─── Over generator ─────────────────────────────────────────────────────── */
const WICKET_TYPES = ['bowled','caught','lbw','stumped','run-out','caught','bowled','caught'];
let _wi = 0;
const pickWkt = () => WICKET_TYPES[_wi++ % WICKET_TYPES.length];

function generateOver(targetRuns, wicketBall = 0) {
  const balls = [0,0,0,0,0,0];
  let rem = targetRuns;

  const distribute = (idxs) => {
    const sh = [...idxs].sort(() => 0.5 - Math.random());
    if (rem >= 6 && sh.length > 0) { balls[sh[0]] = 6; rem -= 6; sh.shift(); }
    if (rem >= 4 && sh.length > 0) { balls[sh[0]] = 4; rem -= 4; sh.shift(); }
    for (const i of sh) {
      if (rem <= 0) break;
      const v = rem >= 2 ? 2 : rem;
      balls[i] = v; rem -= v;
    }
  };

  if (wicketBall > 0) {
    balls[wicketBall - 1] = 'W';
    distribute([0,1,2,3,4,5].filter(i => i !== wicketBall - 1));
  } else {
    distribute([0,1,2,3,4,5]);
  }

  return balls.map(b => {
    if (b === 'W') return { r: 0, w: true, wt: pickWkt() };
    if (b === 6)   return { r: 6, s: true };
    if (b === 4)   return { r: 4, f: true };
    return { r: b };
  });
}

function buildScript(runsPerOver, wicketOvers) {
  return runsPerOver.map((r, i) => {
    const hasWicket = wicketOvers.includes(i);
    const wb = hasWicket ? (1 + (i % 5) + 1) : 0;
    return generateOver(r, wb);
  });
}

/* ─── Innings engine ─────────────────────────────────────────────────────── */
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

  for (let over = 0; over < 20; over++) {
    const currentBowler = bowlers[over % bowlers.length];
    const bowlerKey = currentBowler.toString();
    const overBalls = overScripts[over] || generateOver(7, 0);
    let ballNum = 0;

    for (const b of overBalls) {
      const striker = batsmen[strikerIdx];
      if (!striker) break;
      ballNum++;

      const runsScored = b.r || 0;
      const isFour = !!b.f, isSix = !!b.s;
      const isWicket = !!b.w && totalWickets < 10;
      totalRuns += runsScored;

      const bsKey = striker.toString();
      if (!battingStats[bsKey]) battingStats[bsKey] = { player: striker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: '' };
      battingStats[bsKey].runs += runsScored;
      battingStats[bsKey].balls += 1;
      if (isFour) battingStats[bsKey].fours += 1;
      if (isSix)  battingStats[bsKey].sixes  += 1;

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
        _id: oid(), match: matchId, innings: inningsId,
        inningsNumber, over, ballNumber: ballNum,
        batsman: striker, bowler: currentBowler,
        runs: runsScored, extraRuns: 0, extraType: 'none',
        wicket: isWicket, wicketType: isWicket ? (b.wt || 'bowled') : '',
        playerOut: isWicket ? striker : null,
        scoreSnapshot: { totalRuns, totalWickets, overs: over, balls: ballNum },
        commentary: comm(over, ballNum, runsScored, isWicket, b.wt, isFour, isSix)
      });

      if (targetRuns && totalRuns >= targetRuns) break;
    }

    bowlingStats[bowlerKey].overs += 1;
    [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
    if (totalWickets >= 10) break;
    if (targetRuns && totalRuns >= targetRuns) break;
  }

  const lastBall = balls[balls.length - 1];
  return {
    innings: {
      _id: inningsId, match: matchId, inningsNumber,
      battingTeam: battingTeamId, bowlingTeam: bowlingTeamId,
      totalRuns, totalWickets,
      overs: lastBall ? lastBall.scoreSnapshot.overs : 20,
      balls: lastBall ? lastBall.scoreSnapshot.balls : 0,
      isCompleted: true,
      battingStats: Object.values(battingStats),
      bowlingStats: Object.values(bowlingStats),
      extras, fallOfWickets, partnershipRuns: 0, partnershipBalls: 0
    },
    balls
  };
}

function comm(ov, bl, r, isW, wt, f, s) {
  const loc = `${ov+1}.${bl}`;
  if (isW) return `${loc} - WICKET! ${wt||'out'}`;
  if (s)   return `${loc} - SIX!`;
  if (f)   return `${loc} - FOUR!`;
  if (r===0) return `${loc} - Dot ball`;
  return `${loc} - ${r} run${r>1?'s':''}`;
}

/* ─── Over scripts 150-200 range ─────────────────────────────────────────────
 *
 * MATCH 1: PUNTERS wins
 *   Inn1 (PUNTERS):  170/7  → PUNTERS bat a good PP + accelerate
 *   Inn2 (NISHACHAR chases 171): all out for 158  → PUNTERS win by 12 runs
 *
 * MATCH 2: NISHACHAR wins
 *   Inn1 (NISHACHAR): 185/6  → explosive batting
 *   Inn2 (PUNTERS chases 186): 169/9 all out  → NISHACHAR win by 16 runs
 *
 * MATCH 3: PUNTERS wins (decider)
 *   Inn1 (PUNTERS):  195/8  → high-scoring game
 *   Inn2 (NISHACHAR chases 196): 178/9 all out → PUNTERS win by 17 runs
 * ─────────────────────────────────────────────────────────────────────────── */

// Match 1 Inn1 — PUNTERS 170/7
// PP:  9+10+9+8+9+10 = 55  (0w)
// 7-11: 8+9+6+8+7   = 38  (3w: over idx 6,8,10)
// 12-15: 8+9+7+8    = 32  (2w: over idx 11,13)
// 16-20: 9+10+9+9+8 = 45  (2w: over idx 15,18)
// Total: 55+38+32+45 = 170  wickets=7 ✓
const M1_I1 = buildScript(
  [9,10,9,8,9,10, 8,9,6,8,7, 8,9,7,8, 9,10,9,9,8],
  [6,8,10,         11,13,      15,18]
);

// Match 1 Inn2 — NISHACHAR chases 171, gets all out for 158 (8 wickets to be safe)
// PP:  8+9+8+7+8+9  = 49  (0w)
// 7-11: 7+8+6+8+7  = 36  (3w: 6,8,10)
// 12-15: 7+8+6+7   = 28  (3w: 11,12,14)
// 16-20: 9+8+7+8+7 = 39  (2w: 15,18)  — doesn't reach 171
// Total = 49+36+28+39 = 152... let me adjust
// PP: 9+9+8+8+8+9 = 51
// 7-11: 7+8+6+8+7  = 36
// 12-15: 7+8+7+7   = 29
// 16-20: 9+8+9+8+8 = 42 — doesn't reach 171 since we have 8 wickets
// Total = 51+36+29+42 = 158  wickets=8  NISHACHAR short of 171 ✓
const M1_I2 = buildScript(
  [9,9,8,8,8,9, 7,8,6,8,7, 7,8,7,7, 9,8,9,8,8],
  [6,8,10,       11,13,     15,17,19]   // 8 wickets
);

// Match 2 Inn1 — NISHACHAR 185/6
// PP:  11+10+9+10+11+10 = 61  (0w)
// 7-11: 9+8+9+8+9      = 43  (2w: 6,9)
// 12-15: 9+10+9+9      = 37  (2w: 11,13)
// 16-20: 8+9+8+9+10    = 44  (2w: 15,18)
// Total = 61+43+37+44 = 185  wickets=6 ✓
const M2_I1 = buildScript(
  [11,10,9,10,11,10, 9,8,9,8,9, 9,10,9,9, 8,9,8,9,10],
  [6,9,              11,13,      15,18]
);

// Match 2 Inn2 — PUNTERS chases 186, falls for 169/9
// PP:  10+9+9+8+9+10 = 55  (0w)
// 7-11: 8+8+7+8+7   = 38  (3w: 6,8,10)
// 12-15: 7+8+7+8    = 30  (2w: 11,13)
// 16-20: 9+7+8+8+7  = 39 (4w: 15,16,18,19) — doesn't reach 186
//  Total = 55+38+30+39=162... need 169
// Adjust: PP: 11+9+9+8+9+10=56, death: 9+8+9+9+7=42  → 56+38+30+42=166
// PP: 11+10+9+8+9+10=57, death: 9+8+9+9+7=42  → 57+38+30+42=167
// PP: 11+10+9+9+9+10=58, death: 9+8+9+9+7=42  → 58+38+30+42=168
// PP: 11+10+9+9+9+11=59, death: 9+8+9+9+7=42  → 59+38+30+42=169 ✓ wickets=9✓
const M2_I2 = buildScript(
  [11,10,9,9,9,11, 8,8,7,8,7, 7,8,7,8, 9,8,9,9,7],
  [6,8,10,          11,13,     15,16,18,19]   // 9 wickets
);

// Match 3 Inn1 — PUNTERS 195/8
// PP:  12+11+10+10+11+12 = 66  (0w)
// 7-11: 9+9+8+9+9       = 44  (2w: 6,9)
// 12-15: 9+10+9+9        = 37  (2w: 11,13)
// 16-20: 10+9+10+10+9   = 48  (4w: 15,16,17,19)
// Total = 66+44+37+48 = 195  wickets=8 ✓
const M3_I1 = buildScript(
  [12,11,10,10,11,12, 9,9,8,9,9, 9,10,9,9, 10,9,10,10,9],
  [6,9,               11,13,      15,16,17,19]
);

// Match 3 Inn2 — NISHACHAR chases 196, falls for 178/9
// PP:  11+10+10+9+10+11 = 61  (0w)
// 7-11: 9+8+9+8+8      = 42  (2w: 7,9)
// 12-15: 8+9+8+8       = 33  (2w: 11,13)
// 16-20: 9+8+9+8+8     = 42  (5w: 15,16,17,18,19)
// Total = 61+42+33+42 = 178  wickets=9 ✓ (17 runs short of 196)
const M3_I2 = buildScript(
  [11,10,10,9,10,11, 9,8,9,8,8, 8,9,8,8, 9,8,9,8,8],
  [7,9,               11,13,     15,16,17,18,19]
);

/* ─── Main ──────────────────────────────────────────────────────────────── */
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected');

  const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne();
  const adminId = adminUser._id;
  console.log('👤 Admin:', adminUser.email);

  // Clean any previously added matches to this tournament
  const existingT = await Tournament.findById(TOURNAMENT_ID);
  if (existingT && existingT.matches.length > 0) {
    await Ball.deleteMany({ match: { $in: existingT.matches } });
    await Innings.deleteMany({ match: { $in: existingT.matches } });
    await Match.deleteMany({ _id: { $in: existingT.matches } });
    existingT.matches = [];
    existingT.teams   = [];
    existingT.pointsTable = [];
    await existingT.save();
    console.log('🗑️  Cleared old match data for GICPL 2026_HOLI');
  }

  // Load real teams
  const punters   = await Team.findOne({ name: 'PUNTERS' }).populate('players').lean();
  const nishachar = await Team.findOne({ name: 'NISHACHAR' }).populate('players').lean();
  if (!punters || !nishachar) throw new Error('Teams not found!');

  const pIds  = punters.players.map(p => p._id);
  const nIds  = nishachar.players.map(p => p._id);
  const pBowlers = pIds.slice(6, 11);
  const nBowlers = nIds.slice(6, 11);

  console.log(`🏏 ${punters.name}: ${punters.players.map(p=>p.name).join(', ')}`);
  console.log(`🏏 ${nishachar.name}: ${nishachar.players.map(p=>p.name).join(', ')}`);

  /* ─── Match creator ──────────────────────────────────────────────── */
  async function createMatch({ tFirst, tFirstPlayers, tFirstBowlers,
                                tSecond, tSecondPlayers, tSecondBowlers,
                                scripts1, scripts2, venue, matchDate, matchNum, note }) {
    const matchId = oid(), inn1Id = oid(), inn2Id = oid();

    const { innings: inn1, balls: b1 } = buildInnings({
      matchId, inningsId: inn1Id, inningsNumber: 1,
      battingTeamId: tFirst._id, bowlingTeamId: tSecond._id,
      batsmen: tFirstPlayers, bowlers: tSecondBowlers,
      overScripts: scripts1
    });
    const { innings: inn2, balls: b2 } = buildInnings({
      matchId, inningsId: inn2Id, inningsNumber: 2,
      battingTeamId: tSecond._id, bowlingTeamId: tFirst._id,
      batsmen: tSecondPlayers, bowlers: tFirstBowlers,
      overScripts: scripts2,
      targetRuns: inn1.totalRuns + 1
    });

    // Determine winner (first innings team wins if target not chased)
    const firstWon = inn2.totalRuns < inn1.totalRuns ||
                    (inn2.totalRuns === inn1.totalRuns && inn2.totalWickets === 10);
    const winner  = firstWon ? tFirst : tSecond;
    const runDiff = Math.abs(inn1.totalRuns - inn2.totalRuns);
    const wkts    = 10 - inn2.totalWickets;
    const result  = firstWon
      ? `${tFirst.name} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`
      : `${tSecond.name} won by ${wkts} wicket${wkts !== 1 ? 's' : ''}`;

    await Match.create({
      _id: matchId,
      teamA: tFirst._id, teamB: tSecond._id,
      playingXI_A: tFirstPlayers.slice(0, 11),
      playingXI_B: tSecondPlayers.slice(0, 11),
      totalOvers: 20, venue, matchType: 'T20', status: 'completed',
      currentInnings: 2, tossWinner: tFirst._id, tossDecision: 'bat',
      scorer: adminId, winner: winner._id,
      resultDescription: result,
      tournament: new mongoose.Types.ObjectId(TOURNAMENT_ID),
      matchDate, target: inn1.totalRuns + 1,
      playerOfMatch: tFirstPlayers[0], version: 0
    });

    await Innings.create(inn1);
    await Innings.create(inn2);
    await Ball.insertMany(b1, { ordered: false }).catch(() => {});
    await Ball.insertMany(b2, { ordered: false }).catch(() => {});

    console.log(`\n  ✅ Match ${matchNum} — ${note}`);
    console.log(`     ${tFirst.name.padEnd(12)}: ${inn1.totalRuns}/${inn1.totalWickets} (${inn1.overs}.${inn1.balls} ov)`);
    console.log(`     ${tSecond.name.padEnd(12)}: ${inn2.totalRuns}/${inn2.totalWickets} (${inn2.overs}.${inn2.balls} ov)`);
    console.log(`     ${result}`);
    console.log(`     Balls: ${b1.length + b2.length}`);
    return matchId;
  }

  console.log('\n🏆 Creating 3 T20 matches for GICPL 2026_HOLI...');

  // Match 1: PUNTERS bats first, wins
  const mid1 = await createMatch({
    tFirst: punters,   tFirstPlayers: pIds,  tFirstBowlers: pBowlers,
    tSecond: nishachar, tSecondPlayers: nIds, tSecondBowlers: nBowlers,
    scripts1: M1_I1, scripts2: M1_I2,
    venue: 'GICPL Ground, Sector 5',
    matchDate: new Date('2026-03-11'),
    matchNum: 1, note: 'PUNTERS wins'
  });

  // Match 2: NISHACHAR bats first, wins
  const mid2 = await createMatch({
    tFirst: nishachar,  tFirstPlayers: nIds,  tFirstBowlers: nBowlers,
    tSecond: punters,   tSecondPlayers: pIds, tSecondBowlers: pBowlers,
    scripts1: M2_I1, scripts2: M2_I2,
    venue: 'Holi Maidan, Sector 12',
    matchDate: new Date('2026-03-12'),
    matchNum: 2, note: 'NISHACHAR wins'
  });

  // Match 3: PUNTERS bats first, wins (decider)
  const mid3 = await createMatch({
    tFirst: punters,   tFirstPlayers: pIds,  tFirstBowlers: pBowlers,
    tSecond: nishachar, tSecondPlayers: nIds, tSecondBowlers: nBowlers,
    scripts1: M3_I1, scripts2: M3_I2,
    venue: 'GICPL Ground, Sector 5',
    matchDate: new Date('2026-03-13'),
    matchNum: 3, note: 'PUNTERS wins (Final)'
  });

  /* ─── Update tournament ──────────────────────────────────────────── */
  // Compute points table
  const allMatchIds = [mid1, mid2, mid3];
  const dbMatches   = await Match.find({ _id: { $in: allMatchIds } });

  const tableMap = {};
  for (const t of [punters._id, nishachar._id]) {
    tableMap[t.toString()] = { team: t, played:0, won:0, lost:0, noResult:0, points:0, nrr:0, runsFor:0, oversFor:0, runsAgainst:0, oversAgainst:0 };
  }

  for (const m of dbMatches) {
    const inns = await Innings.find({ match: m._id }).lean();
    if (inns.length < 2) continue;
    const [i1, i2] = inns;
    const tA = m.teamA.toString(), tB = m.teamB.toString();

    if (tableMap[tA]) {
      tableMap[tA].runsFor     += i1.totalRuns;
      tableMap[tA].oversFor    += i1.overs + i1.balls / 6;
      tableMap[tA].runsAgainst += i2.totalRuns;
      tableMap[tA].oversAgainst+= i2.overs + i2.balls / 6;
    }
    if (tableMap[tB]) {
      tableMap[tB].runsFor     += i2.totalRuns;
      tableMap[tB].oversFor    += i2.overs + i2.balls / 6;
      tableMap[tB].runsAgainst += i1.totalRuns;
      tableMap[tB].oversAgainst+= i1.overs + i1.balls / 6;
    }
    if (m.winner) {
      const w = m.winner.toString(), l = w === tA ? tB : tA;
      if (tableMap[w]) { tableMap[w].won += 1; tableMap[w].points += 2; }
      if (tableMap[l]) { tableMap[l].lost += 1; }
    }
    if (tableMap[tA]) tableMap[tA].played += 1;
    if (tableMap[tB]) tableMap[tB].played += 1;
  }

  const pointsTable = Object.values(tableMap).map(row => ({
    ...row,
    nrr: row.oversFor > 0 && row.oversAgainst > 0
      ? parseFloat(((row.runsFor / row.oversFor) - (row.runsAgainst / row.oversAgainst)).toFixed(3))
      : 0
  })).sort((a, b) => b.points - a.points || b.nrr - a.nrr);

  // Update the existing tournament
  await Tournament.findByIdAndUpdate(TOURNAMENT_ID, {
    teams:       [punters._id, nishachar._id],
    matches:     allMatchIds,
    status:      'completed',
    startDate:   new Date('2026-03-11'),
    endDate:     new Date('2026-03-13'),
    format:      'league',
    pointsTable
  }, { new: true });

  console.log('\n📊 Points Table:');
  pointsTable.forEach(row => {
    const nm = row.team.toString() === punters._id.toString() ? 'PUNTERS' : 'NISHACHAR';
    console.log(`   ${nm.padEnd(12)}: P=${row.played} W=${row.won} L=${row.lost} Pts=${row.points} NRR=${row.nrr}`);
  });

  console.log('\n✅ GICPL 2026_HOLI fully seeded! PUNTERS wins 2-1\n');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
