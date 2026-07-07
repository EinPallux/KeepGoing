/**
 * The floor loop state machine. See PLAN.md section 2 (Core Loop).
 * Pure functions only: every transition takes a RunState and returns a new one.
 */
import type { Rng } from './rng';
import { calcInterest, calcPlayoutDelta, calcUnusedPlayBonus } from './economy';

export const FLOOR_COUNT = 12;
export const HOUSE_FLOOR_INTERVAL = 3;
export const PLAYS_PER_FLOOR = 8;
export const STARTING_BANKROLL = 100;
export const TABLES_OFFERED_PER_FLOOR = 3;

export const FLOOR_TARGETS: readonly number[] = [
  150, 250, 400, 600, 900, 1400, 2000, 3000, 4500, 6500, 9500, 14000,
];

export type RunStatus = 'in-progress' | 'won' | 'lost';

export interface FloorRecord {
  floor: number;
  target: number;
  startBankroll: number;
  endBankroll: number;
  playsUsed: number;
  cleared: boolean;
  interestEarned: number;
  unusedPlayBonus: number;
}

export interface RunState {
  seed: string;
  status: RunStatus;
  /** 1-indexed floor the player is currently on (or, once won/lost, the last floor played). */
  floor: number;
  bankroll: number;
  playsLeft: number;
  playsTotal: number;
  /** Table chosen for the current floor; null until the player picks from the offer. */
  activeTableId: string | null;
  history: FloorRecord[];
  /** Owned charm ids, max MAX_CHARM_SLOTS (see engine/charms). */
  charms: string[];
  /** Total wins this run; drives streak-based charms like Golden Goose. */
  winCount: number;
  /** Consecutive wins on the current floor; resets on a loss or bust. */
  currentStreak: number;
  /** Per-floor "already triggered" markers for once-per-floor charms (e.g. Rabbit's Foot), keyed by charm id -> floor number. */
  floorFlags: Record<string, number>;
  /** Shop rerolls used so far this floor; resets when the floor advances. */
  shopRerolls: number;
}

export function isHouseFloor(floor: number): boolean {
  return floor % HOUSE_FLOOR_INTERVAL === 0;
}

export function floorTarget(floor: number): number {
  const target = FLOOR_TARGETS[floor - 1];
  if (target === undefined) throw new Error(`No target defined for floor ${floor}`);
  return target;
}

export function startRun(seed: string): RunState {
  return {
    seed,
    status: 'in-progress',
    floor: 1,
    bankroll: STARTING_BANKROLL,
    playsLeft: PLAYS_PER_FLOOR,
    playsTotal: PLAYS_PER_FLOOR,
    activeTableId: null,
    history: [],
    charms: [],
    winCount: 0,
    currentStreak: 0,
    floorFlags: {},
    shopRerolls: 0,
  };
}

/** Samples TABLES_OFFERED_PER_FLOOR table ids from a pool (with replacement if the pool is small). */
export function offerTables(pool: readonly string[], rng: Rng): string[] {
  if (pool.length === 0) throw new Error('offerTables() called with an empty pool');
  if (pool.length >= TABLES_OFFERED_PER_FLOOR) {
    return rng.shuffle(pool).slice(0, TABLES_OFFERED_PER_FLOOR);
  }
  return Array.from({ length: TABLES_OFFERED_PER_FLOOR }, () => rng.pick(pool));
}

/**
 * Picks the table for the floor and locks in its plays budget. Called exactly
 * once per floor (right after the shop), so `bonusPlays` reflects whatever
 * charms the player owns at that moment - including ones just bought.
 */
export function chooseTable(run: RunState, tableId: string, bonusPlays = 0): RunState {
  if (run.status !== 'in-progress') return run;
  const playsTotal = PLAYS_PER_FLOOR + bonusPlays;
  return { ...run, activeTableId: tableId, playsLeft: playsTotal, playsTotal };
}

/** Applies one resolved bet's outcome, then auto-resolves the floor if plays hit 0. */
export function applyOutcome(run: RunState, bet: number, payoutMultiplier: number): RunState {
  if (run.status !== 'in-progress') return run;

  const delta = calcPlayoutDelta(bet, payoutMultiplier);
  const bankroll = Math.max(0, run.bankroll + delta);
  const playsLeft = run.playsLeft - 1;
  const withOutcome: RunState = { ...run, bankroll, playsLeft };

  if (bankroll <= 0) {
    return recordFloorEnd(withOutcome, { cleared: false });
  }
  if (playsLeft <= 0) {
    return resolveFloorEnd(withOutcome);
  }
  return withOutcome;
}

export function canCashOutFloor(run: RunState): boolean {
  return (
    run.status === 'in-progress' &&
    run.playsLeft > 0 &&
    run.playsLeft < run.playsTotal &&
    run.bankroll >= floorTarget(run.floor)
  );
}

/** Player-invoked early clear: banks remaining plays as bonus chips instead of spending them. */
export function cashOutFloor(run: RunState): RunState {
  if (!canCashOutFloor(run)) return run;
  return resolveFloorEnd(run);
}

function resolveFloorEnd(run: RunState): RunState {
  const cleared = run.bankroll >= floorTarget(run.floor);
  return recordFloorEnd(run, { cleared });
}

function recordFloorEnd(run: RunState, opts: { cleared: boolean }): RunState {
  const target = floorTarget(run.floor);

  if (!opts.cleared) {
    const record: FloorRecord = {
      floor: run.floor,
      target,
      startBankroll: run.bankroll,
      endBankroll: run.bankroll,
      playsUsed: run.playsTotal - run.playsLeft,
      cleared: false,
      interestEarned: 0,
      unusedPlayBonus: 0,
    };
    return { ...run, status: 'lost', history: [...run.history, record] };
  }

  const interestEarned = calcInterest(run.bankroll);
  const unusedPlayBonus = calcUnusedPlayBonus(run.playsLeft);
  const endBankroll = run.bankroll + interestEarned + unusedPlayBonus;

  const record: FloorRecord = {
    floor: run.floor,
    target,
    startBankroll: run.bankroll,
    endBankroll,
    playsUsed: run.playsTotal - run.playsLeft,
    cleared: true,
    interestEarned,
    unusedPlayBonus,
  };

  const nextFloor = run.floor + 1;
  const history = [...run.history, record];

  if (nextFloor > FLOOR_COUNT) {
    return {
      ...run,
      bankroll: endBankroll,
      status: 'won',
      history,
    };
  }

  return {
    ...run,
    bankroll: endBankroll,
    floor: nextFloor,
    playsLeft: PLAYS_PER_FLOOR,
    playsTotal: PLAYS_PER_FLOOR,
    activeTableId: null,
    shopRerolls: 0,
    history,
  };
}
