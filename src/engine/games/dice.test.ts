import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { dice, dicePayoutMultiplier, diceWinChance, DICE_HOUSE_EDGE } from './dice';

describe('diceWinChance / dicePayoutMultiplier', () => {
  it('gives higher chance for a looser "under" call', () => {
    expect(diceWinChance('under', 80)).toBeCloseTo(0.8);
    expect(diceWinChance('under', 20)).toBeCloseTo(0.2);
  });

  it('gives higher chance for a looser "over" call', () => {
    expect(diceWinChance('over', 20)).toBeCloseTo(0.8);
    expect(diceWinChance('over', 80)).toBeCloseTo(0.2);
  });

  it('pays out roughly the inverse of the win chance, minus house edge', () => {
    const chance = diceWinChance('under', 25);
    const payout = dicePayoutMultiplier('under', 25);
    expect(payout).toBeCloseTo((1 - DICE_HOUSE_EDGE) / chance);
    expect(payout).toBeGreaterThan(1 / chance - 0.2); // sanity: edge is small
  });
});

describe('dice module', () => {
  it('resolves in a single roll action', () => {
    const rng = createRng('dice-1');
    const state = dice.initRound(10, { direction: 'under', threshold: 50 }, rng, NEUTRAL_MODIFIERS);
    expect(dice.actions(state)).toEqual(['roll']);
    const { state: resolved } = dice.step(state, 'roll', rng, NEUTRAL_MODIFIERS);
    expect(dice.isResolved(resolved)).toBe(true);
    expect(dice.actions(resolved)).toEqual([]);
  });

  it('pays dicePayoutMultiplier on a win and 0 on a loss', () => {
    for (let i = 0; i < 100; i++) {
      const rng = createRng(`dice-trial-${i}`);
      const config = { direction: 'under' as const, threshold: 50 };
      const state = dice.initRound(10, config, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = dice.step(state, 'roll', rng, NEUTRAL_MODIFIERS);
      if (resolved.won) {
        expect(resolved.payoutMultiplier).toBeCloseTo(dicePayoutMultiplier('under', 50));
      } else {
        expect(resolved.payoutMultiplier).toBe(0);
      }
    }
  });

  it('clamps an out-of-range threshold', () => {
    const rng = createRng('dice-clamp');
    const state = dice.initRound(10, { direction: 'under', threshold: 500 }, rng, NEUTRAL_MODIFIERS);
    expect(state.threshold).toBe(98);
    const state2 = dice.initRound(10, { direction: 'under', threshold: -20 }, rng, NEUTRAL_MODIFIERS);
    expect(state2.threshold).toBe(2);
  });

  it('nudges the roll in the player favor when diceOddsNudge is set', () => {
    let wins = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      const rng = createRng(`nudge-${i}`);
      const config = { direction: 'under' as const, threshold: 50 };
      const state = dice.initRound(10, config, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = dice.step(state, 'roll', rng, { ...NEUTRAL_MODIFIERS, diceOddsNudge: 20 });
      if (resolved.won) wins++;
    }
    // Base win chance is 50%; a +20 favorable nudge should push this well above baseline.
    expect(wins / trials).toBeGreaterThan(0.6);
  });

  it('is idempotent once resolved and throws on an unknown action', () => {
    const rng = createRng('dice-guard');
    const state = dice.initRound(10, { direction: 'under', threshold: 50 }, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = dice.step(state, 'roll', rng, NEUTRAL_MODIFIERS);
    const { state: again, events } = dice.step(resolved, 'roll', rng, NEUTRAL_MODIFIERS);
    expect(again).toBe(resolved);
    expect(events).toEqual([]);
    expect(() => dice.step(state, 'flip', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('over ~10k Monte Carlo rolls, RTP is close to the published house edge', () => {
    const trials = 10_000;
    const config = { direction: 'under' as const, threshold: 33 };
    let totalPayout = 0;
    for (let i = 0; i < trials; i++) {
      const rng = createRng(`rtp-${i}`);
      const state = dice.initRound(1, config, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = dice.step(state, 'roll', rng, NEUTRAL_MODIFIERS);
      totalPayout += resolved.payoutMultiplier;
    }
    const rtp = totalPayout / trials;
    expect(rtp).toBeGreaterThan(1 - DICE_HOUSE_EDGE - 0.05);
    expect(rtp).toBeLessThan(1 - DICE_HOUSE_EDGE + 0.05);
  });

  it('a house edge bonus (e.g. a House Floor Twist) lowers the payout on a win', () => {
    const rng = createRng('dice-edge-bonus');
    const config = { direction: 'under' as const, threshold: 50 };
    const state = dice.initRound(10, config, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = dice.step(state, 'roll', rng, { ...NEUTRAL_MODIFIERS, houseEdgeBonus: 0.1 });
    if (resolved.won) {
      expect(resolved.payoutMultiplier).toBeCloseTo(dicePayoutMultiplier('under', 50, DICE_HOUSE_EDGE + 0.1));
      expect(resolved.payoutMultiplier).toBeLessThan(dicePayoutMultiplier('under', 50));
    }
  });
});
