import { describe, expect, it } from 'vitest';
import { startRun } from '../run';
import {
  applyCharmsToOutcome,
  computeBonusPlays,
  computeModifiers,
  computeShopPriceMultiplier,
  minBetFraction,
} from './index';

function runWith(charms: string[], overrides: Partial<ReturnType<typeof startRun>> = {}) {
  return { ...startRun('seed'), charms, ...overrides };
}

describe('computeModifiers', () => {
  it('is neutral with no relevant charms', () => {
    expect(computeModifiers(['lucky-cent'])).toEqual({ diceOddsNudge: 0, minesGuaranteedFirstSafe: false });
  });

  it('applies loaded-die and steady-hands', () => {
    expect(computeModifiers(['loaded-die']).diceOddsNudge).toBe(3);
    expect(computeModifiers(['steady-hands']).minesGuaranteedFirstSafe).toBe(true);
  });
});

describe('computeBonusPlays', () => {
  it('is 0 without The Regular', () => {
    expect(computeBonusPlays(['lucky-cent'])).toBe(0);
  });

  it('grants +2 plays with The Regular', () => {
    expect(computeBonusPlays(['the-regular'])).toBe(2);
  });
});

describe('computeShopPriceMultiplier / minBetFraction', () => {
  it('discounts prices with Velvet Rope', () => {
    expect(computeShopPriceMultiplier([])).toBe(1);
    expect(computeShopPriceMultiplier(['velvet-rope'])).toBe(0.75);
  });

  it('forces a minimum bet fraction with High Roller', () => {
    expect(minBetFraction([])).toBe(0);
    expect(minBetFraction(['high-roller'])).toBe(0.05);
  });
});

describe('applyCharmsToOutcome', () => {
  it('passes through payoutMultiplier unchanged with no charms', () => {
    const run = runWith([]);
    const result = applyCharmsToOutcome(run, 2);
    expect(result.payoutMultiplier).toBe(2);
    expect(result.winCount).toBe(1);
    expect(result.currentStreak).toBe(1);
  });

  it('boosts a win by 5% with Lucky Cent', () => {
    const run = runWith(['lucky-cent']);
    const result = applyCharmsToOutcome(run, 2);
    expect(result.payoutMultiplier).toBeCloseTo(2.1);
  });

  it('does not boost a loss or push with Lucky Cent', () => {
    const run = runWith(['lucky-cent']);
    expect(applyCharmsToOutcome(run, 0).payoutMultiplier).toBe(0);
    expect(applyCharmsToOutcome(run, 1).payoutMultiplier).toBe(1);
  });

  it('Hot Streak scales with the incoming streak', () => {
    const run = runWith(['hot-streak'], { currentStreak: 3 });
    const result = applyCharmsToOutcome(run, 2);
    expect(result.payoutMultiplier).toBeCloseTo(2 * 1.09);
    expect(result.currentStreak).toBe(4);
  });

  it('resets the streak on a loss but not on a push', () => {
    const run = runWith([], { currentStreak: 5 });
    expect(applyCharmsToOutcome(run, 0).currentStreak).toBe(0);
    expect(applyCharmsToOutcome(run, 1).currentStreak).toBe(5);
  });

  it('High Roller adds a flat +10% to wins', () => {
    const run = runWith(['high-roller']);
    expect(applyCharmsToOutcome(run, 2).payoutMultiplier).toBeCloseTo(2.2);
  });

  it('Golden Goose doubles every 5th win', () => {
    const run = runWith(['golden-goose'], { winCount: 4 });
    const result = applyCharmsToOutcome(run, 2);
    expect(result.payoutMultiplier).toBe(4);
    expect(result.winCount).toBe(5);
  });

  it('Golden Goose does not trigger on the 4th win', () => {
    const run = runWith(['golden-goose'], { winCount: 3 });
    const result = applyCharmsToOutcome(run, 2);
    expect(result.payoutMultiplier).toBe(2);
  });

  it("Rabbit's Foot refunds half the bet on the first bust each floor, then stops", () => {
    const run = runWith(['rabbits-foot'], { floor: 1 });
    const first = applyCharmsToOutcome(run, 0);
    expect(first.payoutMultiplier).toBe(0.5);
    expect(first.floorFlags['rabbits-foot']).toBe(1);

    const runAfterFirstBust = { ...run, floorFlags: first.floorFlags };
    const second = applyCharmsToOutcome(runAfterFirstBust, 0);
    expect(second.payoutMultiplier).toBe(0);
  });

  it("Rabbit's Foot re-arms on a new floor", () => {
    const run = runWith(['rabbits-foot'], { floor: 2, floorFlags: { 'rabbits-foot': 1 } });
    const result = applyCharmsToOutcome(run, 0);
    expect(result.payoutMultiplier).toBe(0.5);
  });

  it('Insurance guarantees at least a 20% refund on any bust', () => {
    const run = runWith(['insurance']);
    expect(applyCharmsToOutcome(run, 0).payoutMultiplier).toBeCloseTo(0.2);
  });

  it('stacks Rabbit\'s Foot and Insurance without conflict (higher refund wins)', () => {
    const run = runWith(['rabbits-foot', 'insurance'], { floor: 1 });
    const result = applyCharmsToOutcome(run, 0);
    expect(result.payoutMultiplier).toBe(0.5);
  });
});
