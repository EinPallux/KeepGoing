import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { keno, KENO_DRAW_COUNT, KENO_PAYTABLE, KENO_POOL_SIZE } from './keno';

describe('keno module', () => {
  it('draws exactly KENO_DRAW_COUNT distinct numbers within the pool', () => {
    const rng = createRng('keno-draw');
    const state = keno.initRound(10, { picks: [1, 2, 3, 4, 5] }, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = keno.step(state, 'draw', rng, NEUTRAL_MODIFIERS);
    expect(resolved.drawn).toHaveLength(KENO_DRAW_COUNT);
    expect(new Set(resolved.drawn).size).toBe(KENO_DRAW_COUNT);
    for (const n of resolved.drawn!) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(KENO_POOL_SIZE);
    }
  });

  it('hits count matches the overlap between picks and drawn numbers', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`keno-hits-${i}`);
      const state = keno.initRound(10, { picks: [1, 2, 3, 4, 5] }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = keno.step(state, 'draw', rng, NEUTRAL_MODIFIERS);
      const expectedHits = [1, 2, 3, 4, 5].filter((p) => resolved.drawn!.includes(p)).length;
      expect(resolved.hits).toBe(expectedHits);
      expect(resolved.payoutMultiplier).toBe(KENO_PAYTABLE[expectedHits]);
    }
  });

  it('deduplicates and caps picks at 5', () => {
    const rng = createRng('keno-sanitize');
    const state = keno.initRound(10, { picks: [1, 1, 2, 3, 4, 5, 6, 7] }, rng, NEUTRAL_MODIFIERS);
    expect(state.picks).toEqual([1, 2, 3, 4, 5]);
  });

  it('is idempotent once resolved and throws on an unknown action', () => {
    const rng = createRng('keno-guard');
    const state = keno.initRound(10, { picks: [1, 2, 3, 4, 5] }, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = keno.step(state, 'draw', rng, NEUTRAL_MODIFIERS);
    const { state: again, events } = keno.step(resolved, 'draw', rng, NEUTRAL_MODIFIERS);
    expect(again).toBe(resolved);
    expect(events).toEqual([]);
    expect(() => keno.step(state, 'nudge', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('over ~20k Monte Carlo draws, RTP lands in a sane range', () => {
    const trials = 20_000;
    let totalPayout = 0;
    for (let i = 0; i < trials; i++) {
      const rng = createRng(`keno-rtp-${i}`);
      const state = keno.initRound(1, { picks: [1, 2, 3, 4, 5] }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = keno.step(state, 'draw', rng, NEUTRAL_MODIFIERS);
      totalPayout += resolved.payoutMultiplier;
    }
    const rtp = totalPayout / trials;
    expect(rtp).toBeGreaterThan(0.7);
    expect(rtp).toBeLessThan(1.2);
  });

  it('a payout scale (e.g. a House Floor Twist) shrinks every payout proportionally', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`keno-scale-${i}`);
      const state = keno.initRound(10, { picks: [1, 2, 3, 4, 5] }, rng, NEUTRAL_MODIFIERS);
      const { state: normal } = keno.step(state, 'draw', rng, NEUTRAL_MODIFIERS);
      const rng2 = createRng(`keno-scale-${i}`);
      const state2 = keno.initRound(10, { picks: [1, 2, 3, 4, 5] }, rng2, NEUTRAL_MODIFIERS);
      const { state: halved } = keno.step(state2, 'draw', rng2, { ...NEUTRAL_MODIFIERS, kenoPayoutScale: 0.5 });
      expect(halved.payoutMultiplier).toBeCloseTo(normal.payoutMultiplier * 0.5);
    }
  });
});
