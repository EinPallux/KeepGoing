import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { wheel, WHEEL_SEGMENTS, WHEEL_SEGMENT_COUNT } from './wheel';

describe('WHEEL_SEGMENTS', () => {
  it('each risk tier has exactly WHEEL_SEGMENT_COUNT segments', () => {
    for (const risk of ['low', 'medium', 'high'] as const) {
      expect(WHEEL_SEGMENTS[risk]).toHaveLength(WHEEL_SEGMENT_COUNT);
    }
  });

  it('higher risk tiers have a higher maximum multiplier', () => {
    const maxOf = (risk: 'low' | 'medium' | 'high') => Math.max(...WHEEL_SEGMENTS[risk]);
    expect(maxOf('medium')).toBeGreaterThan(maxOf('low'));
    expect(maxOf('high')).toBeGreaterThan(maxOf('medium'));
  });
});

describe('wheel module', () => {
  it('resolves on a single spin and pays whatever segment it lands on', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`wheel-${i}`);
      const state = wheel.initRound(10, { risk: 'medium' }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved, events } = wheel.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
      expect(resolved.resolved).toBe(true);
      expect(resolved.segmentIndex).toBeGreaterThanOrEqual(0);
      expect(resolved.segmentIndex).toBeLessThan(WHEEL_SEGMENT_COUNT);
      expect(resolved.payoutMultiplier).toBe(WHEEL_SEGMENTS.medium[resolved.segmentIndex!]);
      expect(events[0].payoutMultiplier).toBe(resolved.payoutMultiplier);
    }
  });

  it('is idempotent once resolved and throws on an unknown action', () => {
    const rng = createRng('wheel-guard');
    const state = wheel.initRound(10, { risk: 'low' }, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = wheel.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
    const { state: again, events } = wheel.step(resolved, 'spin', rng, NEUTRAL_MODIFIERS);
    expect(again).toBe(resolved);
    expect(events).toEqual([]);
    expect(() => wheel.step(state, 'nudge', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('over ~20k Monte Carlo spins per risk tier, RTP lands in a sane range', () => {
    for (const risk of ['low', 'medium', 'high'] as const) {
      const trials = 20_000;
      let totalPayout = 0;
      for (let i = 0; i < trials; i++) {
        const rng = createRng(`wheel-rtp-${risk}-${i}`);
        const state = wheel.initRound(1, { risk }, rng, NEUTRAL_MODIFIERS);
        const { state: resolved } = wheel.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
        totalPayout += resolved.payoutMultiplier;
      }
      const rtp = totalPayout / trials;
      expect(rtp).toBeGreaterThan(0.6);
      expect(rtp).toBeLessThan(1.2);
    }
  });
});
