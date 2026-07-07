import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import {
  FLOOR_COUNT,
  FLOOR_TARGETS,
  PLAYS_PER_FLOOR,
  STARTING_BANKROLL,
  applyOutcome,
  cashOutFloor,
  canCashOutFloor,
  chooseTable,
  floorTarget,
  isHouseFloor,
  offerTables,
  startRun,
} from './run';

describe('startRun', () => {
  it('initializes a fresh run', () => {
    const run = startRun('seed-1');
    expect(run.status).toBe('in-progress');
    expect(run.floor).toBe(1);
    expect(run.bankroll).toBe(STARTING_BANKROLL);
    expect(run.playsLeft).toBe(PLAYS_PER_FLOOR);
    expect(run.playsTotal).toBe(PLAYS_PER_FLOOR);
    expect(run.activeTableId).toBeNull();
    expect(run.history).toEqual([]);
  });
});

describe('isHouseFloor', () => {
  it('flags every 3rd floor as a boss floor', () => {
    expect(isHouseFloor(3)).toBe(true);
    expect(isHouseFloor(6)).toBe(true);
    expect(isHouseFloor(9)).toBe(true);
    expect(isHouseFloor(12)).toBe(true);
    expect(isHouseFloor(1)).toBe(false);
    expect(isHouseFloor(4)).toBe(false);
  });
});

describe('floorTarget', () => {
  it('matches the published target curve', () => {
    expect(floorTarget(1)).toBe(150);
    expect(floorTarget(12)).toBe(14000);
    expect(FLOOR_TARGETS).toHaveLength(FLOOR_COUNT);
  });

  it('throws for an out-of-range floor', () => {
    expect(() => floorTarget(0)).toThrow();
    expect(() => floorTarget(13)).toThrow();
  });
});

describe('offerTables', () => {
  it('offers 3 distinct tables when the pool is large enough', () => {
    const rng = createRng('offer-1');
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const offered = offerTables(pool, rng);
    expect(offered).toHaveLength(3);
    expect(new Set(offered).size).toBe(3);
    for (const id of offered) expect(pool).toContain(id);
  });

  it('samples with replacement when the pool is smaller than the offer size', () => {
    const rng = createRng('offer-2');
    const offered = offerTables(['only-one'], rng);
    expect(offered).toEqual(['only-one', 'only-one', 'only-one']);
  });

  it('throws on an empty pool', () => {
    const rng = createRng('offer-3');
    expect(() => offerTables([], rng)).toThrow();
  });
});

describe('chooseTable', () => {
  it('sets the active table on an in-progress run', () => {
    const run = chooseTable(startRun('seed'), 'coinflip');
    expect(run.activeTableId).toBe('coinflip');
  });
});

describe('applyOutcome', () => {
  it('grows the bankroll on a win', () => {
    const run = startRun('seed');
    const next = applyOutcome(run, 50, 2); // win: 2x payout multiplier
    expect(next.bankroll).toBe(STARTING_BANKROLL + 50);
    expect(next.playsLeft).toBe(PLAYS_PER_FLOOR - 1);
    expect(next.status).toBe('in-progress');
  });

  it('shrinks the bankroll on a loss', () => {
    const run = startRun('seed');
    const next = applyOutcome(run, 50, 0);
    expect(next.bankroll).toBe(STARTING_BANKROLL - 50);
    expect(next.status).toBe('in-progress');
  });

  it('ends the run as lost when the bankroll is wiped out', () => {
    const run = startRun('seed');
    const next = applyOutcome(run, STARTING_BANKROLL, 0);
    expect(next.bankroll).toBe(0);
    expect(next.status).toBe('lost');
    expect(next.history).toHaveLength(1);
    expect(next.history[0].cleared).toBe(false);
  });

  it('is a no-op once the run has ended', () => {
    const run = startRun('seed');
    const lost = applyOutcome(run, STARTING_BANKROLL, 0);
    const again = applyOutcome(lost, 10, 2);
    expect(again).toBe(lost);
  });

  it('clears the floor and applies interest + unused-play bonus when plays run out above target', () => {
    let run = startRun('seed');
    // Floor 1 target is 150; win big once, then burn remaining plays on pushes (1x) to hit 0.
    run = applyOutcome(run, 100, 2); // bankroll 100 -> 200, playsLeft 7
    expect(run.bankroll).toBe(200);
    for (let i = 0; i < 6; i++) {
      run = applyOutcome(run, 0, 1); // 0-stake pushes just to burn plays deterministically
    }
    expect(run.playsLeft).toBe(1);
    run = applyOutcome(run, 0, 1); // last play, playsLeft -> 0, triggers floor resolution
    expect(run.floor).toBe(2);
    expect(run.playsLeft).toBe(PLAYS_PER_FLOOR);
    expect(run.status).toBe('in-progress');
    const record = run.history[0];
    expect(record.cleared).toBe(true);
    expect(record.interestEarned).toBe(Math.min(20, Math.floor(200 / 25)));
    expect(record.unusedPlayBonus).toBe(0);
  });

  it('loses the run when plays run out below target', () => {
    let run = startRun('seed');
    for (let i = 0; i < PLAYS_PER_FLOOR; i++) {
      run = applyOutcome(run, 1, 1); // pushes: bankroll never moves, never reaches 150 target
    }
    expect(run.status).toBe('lost');
    expect(run.history[0].cleared).toBe(false);
  });

  it('wins the run after clearing floor 12', () => {
    let run = startRun('seed');
    for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
      const target = floorTarget(floor);
      const need = Math.max(0, target - run.bankroll);
      if (need > 0) run = applyOutcome(run, need, 2); // exact win to hit target in one play
      // burn remaining plays as pushes
      while (run.status === 'in-progress' && run.playsLeft > 0 && run.floor === floor) {
        run = applyOutcome(run, 0, 1);
      }
    }
    expect(run.status).toBe('won');
    expect(run.history).toHaveLength(FLOOR_COUNT);
    expect(run.history.every((r) => r.cleared)).toBe(true);
  });
});

describe('cashOutFloor', () => {
  it('is unavailable below target or with no plays spent', () => {
    const run = startRun('seed');
    expect(canCashOutFloor(run)).toBe(false);
    expect(cashOutFloor(run)).toBe(run);
  });

  it('ends the floor early once target is met, banking unused plays as bonus', () => {
    let run = startRun('seed');
    run = applyOutcome(run, 100, 2); // bankroll 100 -> 200 (>= target 150), playsLeft 7
    expect(canCashOutFloor(run)).toBe(true);
    const cashedOut = cashOutFloor(run);
    expect(cashedOut.floor).toBe(2);
    expect(cashedOut.playsLeft).toBe(PLAYS_PER_FLOOR);
    const record = cashedOut.history[0];
    expect(record.cleared).toBe(true);
    expect(record.unusedPlayBonus).toBe(7 * 10);
    expect(record.interestEarned).toBe(Math.min(20, Math.floor(200 / 25)));
  });
});
