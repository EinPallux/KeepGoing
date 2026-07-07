import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { crash, CRASH_HOUSE_EDGE, sampleCrashPoint } from './crash';

describe('sampleCrashPoint', () => {
  it('never returns less than 1.00', () => {
    for (let i = 0; i < 500; i++) {
      const rng = createRng(`crash-sample-${i}`);
      expect(sampleCrashPoint(rng)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('crash module', () => {
  it('wins iff the crash point reaches the target, paying exactly the target', () => {
    for (let i = 0; i < 300; i++) {
      const rng = createRng(`crash-${i}`);
      const state = crash.initRound(10, { targetMultiplier: 2 }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = crash.step(state, 'launch', rng, NEUTRAL_MODIFIERS);
      if (resolved.crashPoint! >= 2) {
        expect(resolved.won).toBe(true);
        expect(resolved.payoutMultiplier).toBe(2);
      } else {
        expect(resolved.won).toBe(false);
        expect(resolved.payoutMultiplier).toBe(0);
      }
    }
  });

  it('clamps the target multiplier to a sane range', () => {
    const rng = createRng('crash-clamp');
    expect(crash.initRound(10, { targetMultiplier: 0.5 }, rng, NEUTRAL_MODIFIERS).targetMultiplier).toBe(1.01);
    expect(crash.initRound(10, { targetMultiplier: 5000 }, rng, NEUTRAL_MODIFIERS).targetMultiplier).toBe(100);
  });

  it('is idempotent once resolved and throws on an unknown action', () => {
    const rng = createRng('crash-guard');
    const state = crash.initRound(10, { targetMultiplier: 2 }, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = crash.step(state, 'launch', rng, NEUTRAL_MODIFIERS);
    const { state: again, events } = crash.step(resolved, 'launch', rng, NEUTRAL_MODIFIERS);
    expect(again).toBe(resolved);
    expect(events).toEqual([]);
    expect(() => crash.step(state, 'nudge', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('RTP is approximately constant across different targets (the core crash-game invariant)', () => {
    const trials = 20_000;
    for (const target of [1.5, 2, 5, 10]) {
      let totalPayout = 0;
      for (let i = 0; i < trials; i++) {
        const rng = createRng(`crash-rtp-${target}-${i}`);
        const state = crash.initRound(1, { targetMultiplier: target }, rng, NEUTRAL_MODIFIERS);
        const { state: resolved } = crash.step(state, 'launch', rng, NEUTRAL_MODIFIERS);
        totalPayout += resolved.payoutMultiplier;
      }
      const rtp = totalPayout / trials;
      expect(rtp).toBeGreaterThan(1 - CRASH_HOUSE_EDGE - 0.08);
      expect(rtp).toBeLessThan(1 - CRASH_HOUSE_EDGE + 0.08);
    }
  });
});
