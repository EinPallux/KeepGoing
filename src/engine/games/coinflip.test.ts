import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { coinFlip } from './coinflip';

describe('coinFlip', () => {
  it('offers heads/tails until resolved, then nothing', () => {
    const state = coinFlip.initRound(50, createRng('s'), NEUTRAL_MODIFIERS);
    expect(coinFlip.actions(state)).toEqual(['heads', 'tails']);
    const { state: resolved } = coinFlip.step(state, 'heads', createRng('s'), NEUTRAL_MODIFIERS);
    expect(coinFlip.actions(resolved)).toEqual([]);
    expect(coinFlip.isResolved(resolved)).toBe(true);
  });

  it('pays 2x on a correct call, 0 on a wrong call', () => {
    let wins = 0;
    let losses = 0;
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`trial-${i}`);
      const state = coinFlip.initRound(10, rng, NEUTRAL_MODIFIERS);
      const { state: resolved, events } = coinFlip.step(state, 'heads', rng, NEUTRAL_MODIFIERS);
      const outcome = events[0];
      expect(outcome.type).toBe('outcome');
      if (resolved.won) {
        wins++;
        expect(outcome.payoutMultiplier).toBe(2);
      } else {
        losses++;
        expect(outcome.payoutMultiplier).toBe(0);
      }
    }
    // Sanity check the RNG isn't degenerate (should land roughly 50/50 over 200 trials).
    expect(wins).toBeGreaterThan(50);
    expect(losses).toBeGreaterThan(50);
  });

  it('applies the payout modifier multiplicatively', () => {
    const rng = createRng('mods');
    const state = coinFlip.initRound(10, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = coinFlip.step(state, resolvedCall(state), rng, { payoutMultiplier: 1.5 });
    if (resolved.won) {
      expect(resolved.payoutMultiplier).toBe(3);
    } else {
      expect(resolved.payoutMultiplier).toBe(0);
    }
  });

  it('is a no-op once resolved', () => {
    const rng = createRng('idempotent');
    const state = coinFlip.initRound(10, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = coinFlip.step(state, 'heads', rng, NEUTRAL_MODIFIERS);
    const { state: again, events } = coinFlip.step(resolved, 'tails', rng, NEUTRAL_MODIFIERS);
    expect(again).toBe(resolved);
    expect(events).toEqual([]);
  });

  it('throws on an unknown action', () => {
    const rng = createRng('bad-action');
    const state = coinFlip.initRound(10, rng, NEUTRAL_MODIFIERS);
    expect(() => coinFlip.step(state, 'sideways', rng, NEUTRAL_MODIFIERS)).toThrow();
  });
});

// Deterministic helper: always call "heads" (win/loss distribution already covered above).
function resolvedCall(_state: unknown): 'heads' {
  return 'heads';
}
