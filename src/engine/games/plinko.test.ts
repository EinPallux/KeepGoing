import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { plinko, PLINKO_BUCKETS, PLINKO_MULTIPLIERS, PLINKO_ROWS } from './plinko';

describe('PLINKO_MULTIPLIERS', () => {
  it('each risk tier has exactly PLINKO_BUCKETS entries', () => {
    for (const risk of ['low', 'medium', 'high'] as const) {
      expect(PLINKO_MULTIPLIERS[risk]).toHaveLength(PLINKO_BUCKETS);
    }
  });

  it('is symmetric (edge buckets pay the same as their mirror)', () => {
    for (const risk of ['low', 'medium', 'high'] as const) {
      const row = PLINKO_MULTIPLIERS[risk];
      for (let i = 0; i < row.length; i++) {
        expect(row[i]).toBeCloseTo(row[row.length - 1 - i]);
      }
    }
  });

  it('higher risk tiers pay more at the edges', () => {
    expect(PLINKO_MULTIPLIERS.high[0]).toBeGreaterThan(PLINKO_MULTIPLIERS.medium[0]);
    expect(PLINKO_MULTIPLIERS.medium[0]).toBeGreaterThan(PLINKO_MULTIPLIERS.low[0]);
  });
});

describe('plinko module', () => {
  it('the path has PLINKO_ROWS steps and the bucket equals the count of right-bounces', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`plinko-${i}`);
      const state = plinko.initRound(10, { risk: 'medium' }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved, events } = plinko.step(state, 'drop', rng, NEUTRAL_MODIFIERS);
      expect(resolved.path).toHaveLength(PLINKO_ROWS);
      const expectedBucket = resolved.path!.filter(Boolean).length;
      expect(resolved.bucket).toBe(expectedBucket);
      expect(resolved.payoutMultiplier).toBe(PLINKO_MULTIPLIERS.medium[expectedBucket]);
      expect(events[0].payoutMultiplier).toBe(resolved.payoutMultiplier);
    }
  });

  it('bucket is always within [0, PLINKO_BUCKETS - 1]', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`plinko-range-${i}`);
      const state = plinko.initRound(10, { risk: 'high' }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = plinko.step(state, 'drop', rng, NEUTRAL_MODIFIERS);
      expect(resolved.bucket).toBeGreaterThanOrEqual(0);
      expect(resolved.bucket).toBeLessThan(PLINKO_BUCKETS);
    }
  });

  it('is idempotent once resolved and throws on an unknown action', () => {
    const rng = createRng('plinko-guard');
    const state = plinko.initRound(10, { risk: 'low' }, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = plinko.step(state, 'drop', rng, NEUTRAL_MODIFIERS);
    const { state: again, events } = plinko.step(resolved, 'drop', rng, NEUTRAL_MODIFIERS);
    expect(again).toBe(resolved);
    expect(events).toEqual([]);
    expect(() => plinko.step(state, 'nudge', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('over ~20k Monte Carlo drops per risk tier, RTP lands in a sane range', () => {
    const trials = 20_000;
    for (const risk of ['low', 'medium', 'high'] as const) {
      let totalPayout = 0;
      for (let i = 0; i < trials; i++) {
        const rng = createRng(`plinko-rtp-${risk}-${i}`);
        const state = plinko.initRound(1, { risk }, rng, NEUTRAL_MODIFIERS);
        const { state: resolved } = plinko.step(state, 'drop', rng, NEUTRAL_MODIFIERS);
        totalPayout += resolved.payoutMultiplier;
      }
      const rtp = totalPayout / trials;
      expect(rtp).toBeGreaterThan(0.7);
      expect(rtp).toBeLessThan(1.15);
    }
  });
});
