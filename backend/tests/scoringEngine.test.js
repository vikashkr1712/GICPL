const ScoringEngine = require('../services/scoringEngine');

// ── Factory helper ──────────────────────────────────────────────
function makeInnings(overrides = {}) {
  return Object.assign(
    {
      totalRuns: 0,
      totalWickets: 0,
      overs: 0,
      balls: 0,
      isCompleted: false,
      striker: 'batsman1',
      nonStriker: 'batsman2',
      currentBowler: 'bowler1',
      battingStats: [],
      bowlingStats: [],
      fallOfWickets: []
    },
    overrides
  );
}

function makeDelivery(overrides = {}) {
  return Object.assign(
    {
      runs: 0,
      extraType: 'none',
      extraRuns: 1,
      wicket: false,
      wicketType: '',
      batsmanId: 'batsman1',
      bowlerId: 'bowler1',
      playerOutId: null
    },
    overrides
  );
}

// ── 1. Normal run scoring ────────────────────────────────────────
describe('Normal delivery', () => {
  test('adds runs and increments ball count', () => {
    const engine = new ScoringEngine(makeInnings(), 20);
    const { updatedState } = engine.addDelivery(makeDelivery({ runs: 4 }));
    expect(updatedState.totalRuns).toBe(4);
    expect(updatedState.balls).toBe(1);
  });

  test('dot ball increments ball count, no runs', () => {
    const engine = new ScoringEngine(makeInnings(), 20);
    const { updatedState } = engine.addDelivery(makeDelivery({ runs: 0 }));
    expect(updatedState.totalRuns).toBe(0);
    expect(updatedState.balls).toBe(1);
  });
});

// ── 2. Over completion ───────────────────────────────────────────
describe('Over completion', () => {
  test('after 6 legal deliveries, overs increments and balls resets', () => {
    const innings = makeInnings({ balls: 5 });
    const engine = new ScoringEngine(innings, 20);
    const { updatedState, events } = engine.addDelivery(makeDelivery({ runs: 1 }));
    expect(updatedState.overs).toBe(1);
    expect(updatedState.balls).toBe(0);
    expect(events).toContain('overComplete');
  });

  test('striker and non-striker swap at end of over', () => {
    const innings = makeInnings({ balls: 5, striker: 'A', nonStriker: 'B' });
    const engine = new ScoringEngine(innings, 20);
    const { updatedState } = engine.addDelivery(makeDelivery({ runs: 0 }));
    expect(updatedState.striker).toBe('B');
    expect(updatedState.nonStriker).toBe('A');
  });
});

// ── 3. Strike rotation ───────────────────────────────────────────
describe('Strike rotation', () => {
  test('odd runs swap striker mid-over', () => {
    const innings = makeInnings({ striker: 'A', nonStriker: 'B' });
    const engine = new ScoringEngine(innings, 20);
    const { updatedState } = engine.addDelivery(makeDelivery({ runs: 1 }));
    expect(updatedState.striker).toBe('B');
    expect(updatedState.nonStriker).toBe('A');
  });

  test('even runs do NOT swap striker', () => {
    const innings = makeInnings({ striker: 'A', nonStriker: 'B' });
    const engine = new ScoringEngine(innings, 20);
    const { updatedState } = engine.addDelivery(makeDelivery({ runs: 2 }));
    expect(updatedState.striker).toBe('A');
  });
});

// ── 4. Wicket handling ───────────────────────────────────────────
describe('Wicket handling', () => {
  test('wicket increments totalWickets', () => {
    const engine = new ScoringEngine(makeInnings(), 20);
    const { updatedState } = engine.addDelivery(makeDelivery({ wicket: true, wicketType: 'bowled' }));
    expect(updatedState.totalWickets).toBe(1);
  });

  test('10 wickets triggers inningsComplete event', () => {
    const innings = makeInnings({ totalWickets: 9, balls: 2 });
    const engine = new ScoringEngine(innings, 20);
    const { updatedState, events } = engine.addDelivery(makeDelivery({ wicket: true }));
    expect(updatedState.totalWickets).toBe(10);
    expect(updatedState.isCompleted).toBe(true);
    expect(events).toContain('inningsComplete');
  });
});

// ── 5. Wide delivery ─────────────────────────────────────────────
describe('Wide delivery', () => {
  test('wide does NOT increment ball count', () => {
    const engine = new ScoringEngine(makeInnings(), 20);
    const { updatedState } = engine.addDelivery(makeDelivery({ extraType: 'wide', runs: 0, extraRuns: 1 }));
    expect(updatedState.balls).toBe(0);
    expect(updatedState.totalRuns).toBe(1);
  });
});

// ── 6. No-ball delivery ──────────────────────────────────────────
describe('No-ball delivery', () => {
  test('no-ball does NOT increment legal ball count', () => {
    const engine = new ScoringEngine(makeInnings(), 20);
    const { updatedState } = engine.addDelivery(makeDelivery({ extraType: 'no-ball', runs: 4, extraRuns: 1 }));
    expect(updatedState.balls).toBe(0);
    expect(updatedState.totalRuns).toBe(5); // 4 runs + 1 no-ball penalty
  });
});

// ── 7. Target chase — match complete ────────────────────────────
describe('Target chase', () => {
  test('batting team surpasses target → matchComplete event', () => {
    const innings = makeInnings({ totalRuns: 99 });
    const engine = new ScoringEngine(innings, 20, 100); // target = 100
    const { events } = engine.addDelivery(makeDelivery({ runs: 6 }));
    expect(events).toContain('matchComplete');
  });

  test('batting team equals target but not exceeded → no matchComplete', () => {
    const innings = makeInnings({ totalRuns: 94 });
    const engine = new ScoringEngine(innings, 20, 100);
    const { events } = engine.addDelivery(makeDelivery({ runs: 6 }));
    // 94+6=100, need >100 to win
    expect(events).not.toContain('matchComplete');
  });
});

// ── 8. Innings end on overs ──────────────────────────────────────
describe('Overs complete', () => {
  test('last over last ball triggers inningsComplete', () => {
    const innings = makeInnings({ overs: 19, balls: 5 });
    const engine = new ScoringEngine(innings, 20);
    const { events } = engine.addDelivery(makeDelivery({ runs: 0 }));
    expect(events).toContain('inningsComplete');
  });
});

// ── 9. Validate state ─────────────────────────────────────────────
describe('validateState', () => {
  test('throws if innings already completed', () => {
    const innings = makeInnings({ isCompleted: true });
    const engine = new ScoringEngine(innings, 20);
    expect(() => engine.addDelivery(makeDelivery())).toThrow('Innings is already completed');
  });
});

// ── 10. Static helpers ───────────────────────────────────────────
describe('Static helpers', () => {
  test('calcRunRate', () => {
    expect(ScoringEngine.calcRunRate(120, 10, 0)).toBe('12.00');
  });

  test('calcRequiredRate', () => {
    const rr = ScoringEngine.calcRequiredRate(200, 100, 20, 10, 0);
    expect(parseFloat(rr)).toBe(10);
  });

  test('formatOvers', () => {
    expect(ScoringEngine.formatOvers(5, 3)).toBe('5.3');
  });

  test('calcNRR', () => {
    const nrr = ScoringEngine.calcNRR(200, 20, 180, 20);
    expect(nrr).toBe(1); // (200/20) - (180/20) = 10 - 9 = 1
  });

  test('calcStrikeRate', () => {
    expect(ScoringEngine.calcStrikeRate(50, 40)).toBe(125);
  });
});
