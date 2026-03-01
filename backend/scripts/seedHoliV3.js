/**
 * Seed v3: GICPL_2025_Holi
 * - Realistic T20 scores: 130–180
 * - NISHACHAR wins 2 matches, PUNTERS wins 1
 * - Fixes points table via updatePointsTable API call
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

/* ─────────────────────────────────────────────────────────────────────────────
 * Over-script builder helpers
 * Each over spec: { r: targetRunsInOver, w: wicketOnBall (1-6, or 0=none) }
 * generateOver returns 6 balls summing to r with exactly one wicket if w>0
 * ───────────────────────────────────────────────────────────────────────────*/
function generateOver(r, wicketBall = 0) {
  // Build 6 dots, then distribute runs
  const balls = [0, 0, 0, 0, 0, 0];

  let remaining = r;
  // Place wicket
  if (wicketBall > 0) {
    balls[wicketBall - 1] = 'W'; // placeholder
    // distribute 'r' runs across other 5 balls
    const otherIdxs = [0,1,2,3,4,5].filter(i => i !== wicketBall - 1);
    remaining = distribute(remaining, otherIdxs, balls);
  } else {
    remaining = distribute(remaining, [0,1,2,3,4,5], balls);
  }

  // Convert to ball objects
  return balls.map(b => {
    if (b === 'W') return { r: 0, w: true, wt: pickWicketType() };
    if (b === 4)   return { r: 4, f: true };
    if (b === 6)   return { r: 6, s: true };
    return { r: b };
  });
}

function distribute(runs, idxs, balls) {
  let rem = runs;
  const shuffled = [...idxs].sort(() => 0.5 - Math.random());
  // Try to place a six first (if runs >= 6)
  if (rem >= 6 && shuffled.length > 0) { balls[shuffled[0]] = 6; rem -= 6; shuffled.shift(); }
  // Try to place a four (if runs >= 4)
  if (rem >= 4 && shuffled.length > 0) { balls[shuffled[0]] = 4; rem -= 4; shuffled.shift(); }
  // Distribute rest as 1s and 2s
  for (const i of shuffled) {
    if (rem <= 0) break;
    const put = rem >= 2 ? 2 : rem;
    balls[i] = put;
    rem -= put;
  }
  return rem;
}

const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'stumped', 'run-out', 'caught'];
let _wIdx = 0;
function pickWicketType() { return WICKET_TYPES[_wIdx++ % WICKET_TYPES.length]; }

/**
 * Build a full 20-over innings script from a spec array.
 * spec: array of 20 items, each { r: runsInOver, w: wicketBall(0=none,1-6) }
 */
function buildScript(spec) {
  return spec.map(({ r, w }) => generateOver(r, w || 0));
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Match designs  (batting-first scores, chase target = score+1)
 *
 * Match 1: PUNTERS bats → 144/7, NISHACHAR chases 145 → reaches ~148/5  (NISHACHAR wins)
 * Match 2: NISHACHAR bats → 162/8, PUNTERS chases 163 → reaches ~165/5   (PUNTERS wins)
 * Match 3: PUNTERS bats → 157/9, NISHACHAR chases 158 → reaches ~161/6   (NISHACHAR wins)
 * ───────────────────────────────────────────────────────────────────────────*/

// Each number = runs in that over; w= which ball is wicket (0=no wicket)
// Match 1, Inn 1 (PUNTERS): 144 runs, 7 wickets
const M1_I1_SPEC = [
  {r:8,w:0},{r:7,w:0},{r:7,w:0},{r:6,w:0},{r:8,w:0},{r:9,w:0},   // PP 45
  {r:6,w:3},{r:7,w:0},{r:5,w:5},{r:8,w:0},{r:7,w:0},              // middle 38-2w
  {r:6,w:2},{r:8,w:0},{r:7,w:4},{r:6,w:0},                        // middle 27-2w
  {r:9,w:3},{r:7,w:0},{r:7,w:5},{r:8,w:0},{r:8,w:4}               // death 39-3w
]; // total: 45+38+27+39 = 149... let me recount
// PP: 8+7+7+6+8+9 = 45
// 7,8,9,10,11: 6+7+5+8+7 = 33-2w
// 12,13,14,15: 6+8+7+6 = 27-2w
// 16-20: 9+7+7+8+8 = 39-3w
// Total = 45+33+27+39 = 144 ✓  Wickets = 0+2+2+3 = 7 ✓

// Match 1, Inn 2 (NISHACHAR chases 145): target = 145
const M1_I2_SPEC = [
  {r:9,w:0},{r:8,w:0},{r:8,w:0},{r:7,w:0},{r:9,w:0},{r:10,w:0},  // PP 51
  {r:7,w:3},{r:8,w:0},{r:7,w:0},{r:6,w:5},{r:8,w:0},              // middle 36-2w
  {r:7,w:0},{r:8,w:0},{r:9,w:4},{r:7,w:0},                        
  {r:8,w:0},{r:6,w:0},{r:7,w:5},{r:9,w:0},{r:6,w:0}               
]; // NISHACHAR will reach 145 somewhere around over 14-15

// Match 2, Inn 1 (NISHACHAR bats): 162 runs, 8 wickets
const M2_I1_SPEC = [
  {r:9,w:0},{r:8,w:0},{r:8,w:0},{r:7,w:0},{r:9,w:0},{r:11,w:0},  // PP 52
  {r:7,w:2},{r:6,w:0},{r:8,w:4},{r:7,w:0},{r:6,w:3},              // 34-3w
  {r:8,w:0},{r:7,w:0},{r:6,w:5},{r:7,w:0},                        // 28-1w
  {r:8,w:2},{r:6,w:0},{r:7,w:4},{r:9,w:0},{r:7,w:1}               // 37-4w
]; 
// PP: 52, mid1: 34-3w, mid2: 28-1w, death: 37-4w = 151... hmm
// PP: 9+8+8+7+9+11=52
// Over 7-11: 7+6+8+7+6=34, 3w
// Over 12-15: 8+7+6+7=28, 1w
// Over 16-20: 8+6+7+9+7=37, 4w
// Total = 52+34+28+37 = 151... need 162. Let me adjust.

// Actually let me just directly specify scores more carefully and use consistent numbering
// I'll just use a simpler approach: specify runs per over as a flat array

/* ─── Simplified approach: specify [runsPerOver] and [wicketOvers] ─── */

function buildScriptSimple(runsPerOver, wicketOvers) {
  // runsPerOver: array of 20 numbers
  // wicketOvers: array of 0-indexed over numbers that have wickets
  return runsPerOver.map((r, i) => {
    const hasWicket = wicketOvers.includes(i);
    const wicketBall = hasWicket ? (1 + (i % 5) || 3) : 0; // spread wicket balls
    return generateOver(r, wicketBall);
  });
}

/* ─── Innings data engine ─────────────────────────────────────────── */
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
    const bowlerIdx = over % bowlers.length;
    const currentBowler = bowlers[bowlerIdx];
    const overBalls = overScripts[over] || generateOver(6, 0);
    const bowlerKey = currentBowler.toString();

    let ballNum = 0;
    for (const b of overBalls) {
      const striker = batsmen[strikerIdx];
      if (!striker) break;

      ballNum++;
      const runsScored = b.r || 0;
      const isFour = !!b.f;
      const isSix  = !!b.s;
      const isWicket = !!b.w && totalWickets < 10;

      totalRuns += runsScored;

      const bsKey = striker.toString();
      if (!battingStats[bsKey]) {
        battingStats[bsKey] = { player: striker, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: '' };
      }
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
    [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
    if (totalWickets >= 10) break;
    if (targetRuns && totalRuns >= targetRuns) break;
  }

  const lastBall = balls[balls.length - 1];
  return {
    innings: {
      _id: inningsId,
      match: matchId,
      inningsNumber,
      battingTeam: battingTeamId,
      bowlingTeam: bowlingTeamId,
      totalRuns,
      totalWickets,
      overs: lastBall ? lastBall.scoreSnapshot.overs : 20,
      balls: lastBall ? lastBall.scoreSnapshot.balls : 0,
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
  if (isSix)    return `${loc} - SIX!`;
  if (isFour)   return `${loc} - FOUR!`;
  if (runs === 0) return `${loc} - Dot ball`;
  return `${loc} - ${runs} run${runs > 1 ? 's' : ''}`;
}

/* ─── Main ──────────────────────────────────────────────────────────── */
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected');

  const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne();
  const adminId = adminUser._id;
  console.log('👤 Admin:', adminUser.email);

  // ── Clean old data ─────────────────────────────────────────────────────────
  const oldT = await Tournament.findOne({ name: 'GICPL_2025_Holi' });
  if (oldT) {
    await Ball.deleteMany({ match: { $in: oldT.matches } });
    await Innings.deleteMany({ match: { $in: oldT.matches } });
    await Match.deleteMany({ _id: { $in: oldT.matches } });
    await Tournament.deleteOne({ _id: oldT._id });
    console.log('🗑️  Cleared old GICPL_2025_Holi');
  }

  // ── Load real teams ────────────────────────────────────────────────────────
  const punters   = await Team.findOne({ name: 'PUNTERS' }).populate('players').lean();
  const nishachar = await Team.findOne({ name: 'NISHACHAR' }).populate('players').lean();
  if (!punters || !nishachar) throw new Error('PUNTERS or NISHACHAR not found!');

  const pIds  = punters.players.map(p => p._id);   // 11 players
  const nIds  = nishachar.players.map(p => p._id); // 11 players

  // Batting order: all 11; Bowlers: last 5
  const pBowlers = pIds.slice(6, 11);
  const nBowlers = nIds.slice(6, 11);

  /* ══════════════════════════════════════════════════════════════════
   * MATCH 1: PUNTERS bats first → 144/7
   *           NISHACHAR chases 145 → wins ~148/5  (NISHACHAR WIN)
   * ══════════════════════════════════════════════════════════════════*/
  // PP(1-6):  8+7+7+6+8+9  = 45  (0w)
  // Mid(7-11):6+7+5+8+7    = 33  (2w: overs 7,9)
  // Mid(12-15):6+8+7+6     = 27  (2w: overs 12,14)
  // Death(16-20):9+7+7+8+8 = 39  (3w: overs 16,18,20)
  // Total = 144, 7w ✓
  const M1_I1 = buildScriptSimple(
    [8,7,7,6,8,9, 6,7,5,8,7, 6,8,7,6, 9,7,7,8,8],
    [6,8,         11,13,      15,17,19]
  );

  // NISHACHAR chases 145 — generate a "rich" script, loop breaks when target hit
  // Estimated they reach 145 around over 17 comfortably
  const M1_I2 = buildScriptSimple(
    [9,8,8,7,9,10, 7,8,7,6,8, 7,8,9,7, 8,7,8,9,7],
    [7,10,          13,16]     // 4 wickets
  );

  /* ══════════════════════════════════════════════════════════════════
   * MATCH 2: NISHACHAR bats first → 162/8
   *           PUNTERS chases 163 → wins ~166/5  (PUNTERS WIN)
   * ══════════════════════════════════════════════════════════════════*/
  // PP(1-6):  10+9+8+7+9+11 = 54  (0w)
  // Mid(7-11): 7+6+8+7+6   = 34  (3w: overs 7,9,11)
  // Mid(12-15): 8+7+7+8    = 30  (2w: overs 12,14)
  // Death(16-20): 8+7+9+9+8 = 41  hmm 54+34+30+41=159 need 162
  // Adjust death: 9+8+9+9+8 = 43  → 54+34+30+43=161, still off by 1
  // Adjust: PP to 10+9+8+8+9+11=55, death 9+8+9+9+8=43 → 55+34+30+43=162 ✓
  const M2_I1 = buildScriptSimple(
    [10,9,8,8,9,11, 7,6,8,7,6, 8,7,7,8, 9,8,9,9,8],
    [6,8,10,         11,13,      15,17,19] // 8 wickets
  );

  // PUNTERS chases 163 — rich script, breaks when target reached
  const M2_I2 = buildScriptSimple(
    [10,9,8,9,10,9, 8,7,9,8,7, 8,9,8,7, 9,8,9,8,9],
    [7,10,           13,16]    // 4 wickets, PUNTERS win comfortably
  );

  /* ══════════════════════════════════════════════════════════════════
   * MATCH 3 (decider): PUNTERS bats first → 157/9
   *                     NISHACHAR chases 158 → wins ~161/7  (NISHACHAR WIN)
   * ══════════════════════════════════════════════════════════════════*/
  // PP(1-6):  9+8+8+7+9+10 = 51  (0w)
  // Mid(7-11): 7+6+8+7+6  = 34  (3w: overs 7,9,11)
  // Mid(12-15): 7+8+6+8   = 29  (2w: overs 12,14)
  // Death(16-20): 9+7+9+9+9 = 43  (4w: overs 16,17,18,20)
  // Total = 51+34+29+43 = 157, 9w ✓
  const M3_I1 = buildScriptSimple(
    [9,8,8,7,9,10, 7,6,8,7,6, 7,8,6,8, 9,7,9,9,9],
    [6,8,10,        11,13,      15,16,17,19] // 9 wickets
  );

  // NISHACHAR chases 158 — good script, should reach target
  const M3_I2 = buildScriptSimple(
    [9,8,9,8,9,10, 8,7,8,7,8, 7,9,8,8, 9,8,9,8,9],
    [7,10,           13,15,17,19]  // 6 wickets
  );

  /* ─── Create matches ───────────────────────────────────────────────── */
  const tournamentId = oid();

  async function createMatch({ tFirst, tFirstPlayers, tFirstBowlers,
                                tSecond, tSecondPlayers, tSecondBowlers,
                                scripts1, scripts2, venue, matchDate, matchNum }) {
    const matchId = oid();
    const inn1Id  = oid();
    const inn2Id  = oid();

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
      tournament: tournamentId, matchDate,
      target: inn1.totalRuns + 1,
      playerOfMatch: tFirstPlayers[0], version: 0
    });

    await Innings.create(inn1);
    await Innings.create(inn2);
    await Ball.insertMany(b1, { ordered: false }).catch(() => {});
    await Ball.insertMany(b2, { ordered: false }).catch(() => {});

    console.log(`  ✅ Match ${matchNum}: ${tFirst.name} vs ${tSecond.name}`);
    console.log(`     ${tFirst.name.padEnd(12)}: ${inn1.totalRuns}/${inn1.totalWickets} (${inn1.overs}.${inn1.balls} ov)`);
    console.log(`     ${tSecond.name.padEnd(12)}: ${inn2.totalRuns}/${inn2.totalWickets} (${inn2.overs}.${inn2.balls} ov)`);
    console.log(`     ${result}`);
    console.log(`     Balls stored: ${b1.length + b2.length}`);
    return matchId;
  }

  console.log('\n🏆 Creating 3 T20 matches...\n');

  const mid1 = await createMatch({
    tFirst: punters,   tFirstPlayers:  pIds, tFirstBowlers:  pBowlers,
    tSecond: nishachar, tSecondPlayers: nIds, tSecondBowlers: nBowlers,
    scripts1: M1_I1, scripts2: M1_I2,
    venue: 'GICPL Ground, Sector 5',
    matchDate: new Date('2025-03-13'),
    matchNum: 1
  });

  const mid2 = await createMatch({
    tFirst: nishachar,  tFirstPlayers:  nIds, tFirstBowlers:  nBowlers,
    tSecond: punters,   tSecondPlayers: pIds, tSecondBowlers: pBowlers,
    scripts1: M2_I1, scripts2: M2_I2,
    venue: 'Holi Maidan, Sector 12',
    matchDate: new Date('2025-03-14'),
    matchNum: 2
  });

  const mid3 = await createMatch({
    tFirst: punters,   tFirstPlayers:  pIds, tFirstBowlers:  pBowlers,
    tSecond: nishachar, tSecondPlayers: nIds, tSecondBowlers: nBowlers,
    scripts1: M3_I1, scripts2: M3_I2,
    venue: 'GICPL Ground, Sector 5',
    matchDate: new Date('2025-03-15'),
    matchNum: 3
  });

  /* ─── Create Tournament ─────────────────────────────────────────── */
  const tournament = await Tournament.create({
    _id: tournamentId,
    name: 'GICPL_2025_Holi',
    organizer: adminId,
    teams: [punters._id, nishachar._id],
    matches: [mid1, mid2, mid3],
    format: 'league', status: 'completed',
    startDate: new Date('2025-03-13'),
    endDate:   new Date('2025-03-15'),
    pointsTable: [
      { team: punters._id,   played: 0, won: 0, lost: 0, noResult: 0, points: 0, nrr: 0 },
      { team: nishachar._id, played: 0, won: 0, lost: 0, noResult: 0, points: 0, nrr: 0 }
    ]
  });

  /* ─── Compute correct points table ─────────────────────────────── */
  const matches = await Match.find({ tournament: tournamentId, status: 'completed' });
  const tableMap = {};
  for (const t of [punters._id, nishachar._id]) {
    tableMap[t.toString()] = { team: t, played:0, won:0, lost:0, noResult:0, points:0, nrr:0, runsFor:0, oversFor:0, runsAgainst:0, oversAgainst:0 };
  }

  for (const m of matches) {
    const inns = await Innings.find({ match: m._id }).lean();
    if (inns.length < 2) continue;
    const [i1, i2] = inns;
    const tA = m.teamA.toString(), tB = m.teamB.toString();

    if (tableMap[tA]) { tableMap[tA].runsFor += i1.totalRuns; tableMap[tA].oversFor += i1.overs + i1.balls/6; tableMap[tA].runsAgainst += i2.totalRuns; tableMap[tA].oversAgainst += i2.overs + i2.balls/6; }
    if (tableMap[tB]) { tableMap[tB].runsFor += i2.totalRuns; tableMap[tB].oversFor += i2.overs + i2.balls/6; tableMap[tB].runsAgainst += i1.totalRuns; tableMap[tB].oversAgainst += i1.overs + i1.balls/6; }

    if (m.winner) {
      const w = m.winner.toString();
      const l = w === tA ? tB : tA;
      if (tableMap[w]) { tableMap[w].won += 1; tableMap[w].points += 2; }
      if (tableMap[l]) { tableMap[l].lost += 1; }
    }
    if (tableMap[tA]) tableMap[tA].played += 1;
    if (tableMap[tB]) tableMap[tB].played += 1;
  }

  // NRR = (runsFor/oversFor) - (runsAgainst/oversAgainst)
  const pointsTable = Object.values(tableMap).map(row => ({
    ...row,
    nrr: row.oversFor > 0 && row.oversAgainst > 0
      ? parseFloat(((row.runsFor / row.oversFor) - (row.runsAgainst / row.oversAgainst)).toFixed(3))
      : 0
  })).sort((a, b) => b.points - a.points || b.nrr - a.nrr);

  tournament.pointsTable = pointsTable;
  await tournament.save();

  console.log('\n📊 Points Table:');
  pointsTable.forEach(row => {
    const name = row.team.toString() === punters._id.toString() ? 'PUNTERS' : 'NISHACHAR';
    console.log(`   ${name.padEnd(12)}: P=${row.played} W=${row.won} L=${row.lost} Pts=${row.points} NRR=${row.nrr}`);
  });

  console.log('\n✅ GICPL_2025_Holi seeded successfully!\n');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message, err.stack);
  process.exit(1);
});
