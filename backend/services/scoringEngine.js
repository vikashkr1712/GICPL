/**
 * ScoringEngine — deterministic, stateful cricket scoring service.
 * 
 * Separated from transport layer (Express controllers) for:
 *   - Independent testability
 *   - Clean business logic isolation
 *   - Reusability
 * 
 * This engine mutates a provided innings state object and returns
 * the updated state + derived events. Persistence is handled outside.
 */

class ScoringEngine {
  /**
   * @param {Object} inningsState - Mongoose Innings document (plain or lean)
   * @param {Number} totalOvers - from Match document
   * @param {Number} target - runs needed (2nd innings only, else null)
   */
  constructor(inningsState, totalOvers, target = null) {
    this.state = inningsState;
    this.totalOvers = totalOvers;
    this.target = target; // null for 1st innings
    this.events = [];     // side-effects: 'overComplete', 'inningsComplete', 'matchComplete'
  }

  /**
   * Main entry point — processes one delivery.
   * Returns { updatedState, events, battingStatUpdate, bowlingStatUpdate }
   */
  addDelivery(delivery) {
    const {
      runs = 0,
      extraType = 'none',
      extraRuns = 1,
      wicket = false,
      wicketType = '',
      batsmanId,
      bowlerId,
      playerOutId = null
    } = delivery;

    this.validateState();
    this.events = [];

    const isLegalDelivery = this._isLegalDelivery(extraType);
    const totalRunsThisBall = this._calcTotalRuns(runs, extraType, extraRuns);

    // 1. Update innings runs
    this.state.totalRuns += totalRunsThisBall;

    // 2. Increment ball count only for legal deliveries
    if (isLegalDelivery) {
      this.state.balls += 1;
    }

    // 3. Handle wicket
    if (wicket && isLegalDelivery) {
      this.state.totalWickets += 1;
      this.events.push('wicket');
    }

    // 4. Batting stat updates for this innings
    const battingStatUpdate = this._buildBattingStatUpdate(
      batsmanId, runs, extraType, wicket, isLegalDelivery
    );

    // 5. Bowling stat updates for this innings
    const bowlingStatUpdate = this._buildBowlingStatUpdate(
      bowlerId, runs, extraType, extraRuns, wicket, isLegalDelivery
    );

    // Credit wicket to bowler (not for run-out / obstructing-field)
    if (wicket && this._shouldCreditWicketToBowler(wicketType)) {
      bowlingStatUpdate.wickets = 1;
    }

    // 6. Over completion
    if (isLegalDelivery && this.state.balls === 6) {
      this.state.overs += 1;
      this.state.balls = 0;
      this.events.push('overComplete');

      // Swap striker at end of over
      const temp = this.state.striker;
      this.state.striker = this.state.nonStriker;
      this.state.nonStriker = temp;
    } else if (isLegalDelivery) {
      // Strike rotation on odd runs during the over
      if (runs % 2 !== 0) {
        this._swapStrike();
      }
    } else {
      // Wide/no-ball: if scored odd runs, swap too
      if (runs % 2 !== 0) {
        this._swapStrike();
      }
    }

    // 7. Check innings completion
    const allOut = this.state.totalWickets >= 10;
    const oversComplete = this.state.overs >= this.totalOvers && this.state.balls === 0;

    if (allOut || oversComplete) {
      this.state.isCompleted = true;
      this.events.push('inningsComplete');
    }

    // 8. Second innings target check
    if (this.target !== null && this.state.totalRuns > this.target) {
      this.state.isCompleted = true;
      this.events.push('matchComplete');
      this.events = this.events.filter(e => e !== 'inningsComplete'); // match takes priority
    }

    return {
      updatedState: this.state,
      events: this.events,
      battingStatUpdate,
      bowlingStatUpdate,
      scoreSnapshot: {
        totalRuns:    this.state.totalRuns,
        totalWickets: this.state.totalWickets,
        overs:        this.state.overs,
        balls:        this.state.balls
      }
    };
  }

  /**
   * Validates that scoring can proceed.
   */
  validateState() {
    if (this.state.isCompleted) {
      throw Object.assign(new Error('Innings is already completed'), { statusCode: 400 });
    }
    if (this.state.totalWickets >= 10) {
      throw Object.assign(new Error('All 10 wickets have fallen'), { statusCode: 400 });
    }
    if (this.state.overs >= this.totalOvers) {
      throw Object.assign(new Error('All overs have been bowled'), { statusCode: 400 });
    }
  }

  /**
   * Returns true if the delivery counts as a legal (ball-counting) delivery.
   * Wide and No-ball are NOT legal deliveries.
   */
  _isLegalDelivery(extraType) {
    return extraType !== 'wide' && extraType !== 'no-ball';
  }

  /**
   * Calculates total runs added to innings score for this delivery.
   */
  _calcTotalRuns(runs, extraType, extraRuns) {
    if (extraType === 'wide' || extraType === 'no-ball') {
      // extra penalty (1) + any runs scored off the bat or additional extras
      return runs + extraRuns;
    }
    if (extraType === 'bye' || extraType === 'leg-bye') {
      // runs count to innings but NOT to batsman
      return runs;
    }
    return runs; // normal delivery
  }

  _swapStrike() {
    const temp = this.state.striker;
    this.state.striker = this.state.nonStriker;
    this.state.nonStriker = temp;
  }

  _buildBattingStatUpdate(batsmanId, runs, extraType, wicket, isLegal) {
    const update = { playerId: batsmanId, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };

    // Runs credited to batsman only on normal + no-ball (not byes/leg-byes/wide)
    if (extraType === 'none' || extraType === 'no-ball') {
      update.runs = runs;
      if (runs === 4) update.fours = 1;
      if (runs === 6) update.sixes = 1;
    }

    // Ball faced: counted on legal delivery (not wide)
    if (extraType !== 'wide' && isLegal) {
      update.balls = 1;
    }

    if (wicket) update.isOut = true;

    return update;
  }

  _buildBowlingStatUpdate(bowlerId, runs, extraType, extraRuns, wicket, isLegal) {
    const update = {
      playerId: bowlerId,
      balls: 0,
      runsConceded: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0
    };

    if (extraType === 'wide') {
      update.wides = 1;
      update.runsConceded = runs + extraRuns;
    } else if (extraType === 'no-ball') {
      update.noBalls = 1;
      update.runsConceded = runs + extraRuns;
    } else if (extraType === 'bye' || extraType === 'leg-bye') {
      // Byes not charged to bowler
      update.balls = 1;
    } else {
      update.balls = 1;
      update.runsConceded = runs;
    }

    return update;
  }

  /**
   * Separate method to add wicket credit to bowler (called from addDelivery).
   * Run-out and obstructing-field are not credited to bowler.
   */
  _shouldCreditWicketToBowler(wicketType) {
    return !['run-out', 'obstructing-field'].includes(wicketType);
  }

  /**
   * Calculates current run rate
   */
  static calcRunRate(runs, overs, balls) {
    const totalOvers = overs + balls / 6;
    if (totalOvers === 0) return 0;
    return (runs / totalOvers).toFixed(2);
  }

  /**
   * Calculates required run rate (2nd innings)
   */
  static calcRequiredRate(target, currentRuns, totalOvers, completedOvers, completedBalls) {
    const remaining = target - currentRuns + 1;
    const oversLeft = totalOvers - completedOvers - completedBalls / 6;
    if (oversLeft <= 0) return 'N/A';
    return (remaining / oversLeft).toFixed(2);
  }

  /**
   * Formats overs display: e.g., overs=5, balls=3 → "5.3"
   */
  static formatOvers(overs, balls) {
    return `${overs}.${balls}`;
  }

  /**
   * Auto-generates CricHeroes-style commentary for a delivery.
   */
  static generateCommentary(delivery, batsmanName = 'Batsman', bowlerName = 'Bowler') {
    const { runs = 0, extraType = 'none', wicket = false, wicketType = '' } = delivery;

    if (wicket) {
      const templates = {
        'bowled':      [`OUT! ${bowlerName} bowls ${batsmanName} — timber!`, `BOWLED! ${bowlerName} gets through ${batsmanName}'s defence.`],
        'caught':      [`OUT! ${batsmanName} finds the fielder — caught!`, `CAUGHT! ${batsmanName} skies it and it's taken!`],
        'lbw':         [`OUT! LBW — ${batsmanName} has to go! ${bowlerName} strikes!`, `LBW! Plumb in front, no doubt about that.`],
        'run-out':     [`RUN OUT! ${batsmanName} is short of the crease!`, `RUN OUT! ${batsmanName} has to go — great fielding!`],
        'stumped':     [`STUMPED! ${batsmanName} is out of the crease and the keeper does the rest!`, `STUMPED! ${batsmanName} deceived by ${bowlerName}.`],
        'hit-wicket':  [`HIT WICKET! Oh no — ${batsmanName} has hit his own stumps!`, `HIT WICKET! What a bizarre dismissal for ${batsmanName}!`],
      };
      const msgs = templates[wicketType] || [`OUT! ${batsmanName} is dismissed.`];
      return msgs[Math.floor(Math.random() * msgs.length)];
    }

    if (extraType === 'wide') {
      const wideMsgs = ['Wide ball!', `${bowlerName} fires it down the leg side — wide!`, 'Too wide, signals the umpire.'];
      return wideMsgs[Math.floor(Math.random() * wideMsgs.length)];
    }

    if (extraType === 'no-ball') {
      return `NO BALL! ${bowlerName} oversteps — free hit coming up!`;
    }

    if (extraType === 'bye') {
      return `Bye! Slips past the keeper for ${runs} run${runs !== 1 ? 's' : ''}.`;
    }

    if (extraType === 'leg-bye') {
      return `Leg bye! Hits the pad and they run ${runs}.`;
    }

    // Normal delivery
    if (runs === 0) {
      const dotMsgs = [`Dot ball. ${bowlerName} is building pressure.`, `Good delivery from ${bowlerName}, no run.`, `${batsmanName} plays and misses!`, `Defended solidly by ${batsmanName}.`];
      return dotMsgs[Math.floor(Math.random() * dotMsgs.length)];
    }
    if (runs === 1) {
      const singles = [`${batsmanName} nudges it for a single.`, `Good running between the wickets — one run.`, `${batsmanName} pushes it to the off side, they run one.`];
      return singles[Math.floor(Math.random() * singles.length)];
    }
    if (runs === 2) {
      const twos = [`TWO! ${batsmanName} drives it into the gap.`, `${batsmanName} and partner take a quick two.`, `Good running — 2 runs.`];
      return twos[Math.floor(Math.random() * twos.length)];
    }
    if (runs === 3) {
      return `THREE! ${batsmanName} finds the gap and they run hard for three!`;
    }
    if (runs === 4) {
      const fours = [`FOUR! ${batsmanName} drives it through the covers beautifully!`, `FOUR! Cracking shot to the boundary!`, `FOUR! ${batsmanName} cuts hard past point — no one's stopping that!`, `FOUR! In the gap and racing to the boundary!`];
      return fours[Math.floor(Math.random() * fours.length)];
    }
    if (runs === 5) {
      return `FIVE! Overthrows bring up 5 runs for ${batsmanName}!`;
    }
    if (runs === 6) {
      const sixes = [`SIX! ${batsmanName} sends it into the stands! Massive hit!`, `SIX! Maximum! ${batsmanName} clears the ropes with ease!`, `SIX! What a shot from ${batsmanName} — over long-on!`, `SIX! ${batsmanName} goes downtown!`];
      return sixes[Math.floor(Math.random() * sixes.length)];
    }

    return `${runs} run${runs !== 1 ? 's' : ''} off ${bowlerName}'s delivery.`;
  }

  /**
   * Calculates Net Run Rate (NRR) for tournament points table.
   * NRR = (total runs scored / total overs faced) - (total runs conceded / total overs bowled)
   */
  static calcNRR(runsFor, oversFor, runsAgainst, oversAgainst) {
    const rpo_for     = oversFor     > 0 ? runsFor     / oversFor     : 0;
    const rpo_against = oversAgainst > 0 ? runsAgainst / oversAgainst : 0;
    return parseFloat((rpo_for - rpo_against).toFixed(3));
  }

  /**
   * Calculates strike rate: (runs / balls) * 100
   */
  static calcStrikeRate(runs, balls) {
    if (balls === 0) return 0;
    return parseFloat(((runs / balls) * 100).toFixed(2));
  }

  /**
   * Calculates economy rate: (runs / overs)
   */
  static calcEconomy(runs, overs, balls) {
    const totalOvers = overs + balls / 6;
    if (totalOvers === 0) return 0;
    return parseFloat((runs / totalOvers).toFixed(2));
  }
}

module.exports = ScoringEngine;
