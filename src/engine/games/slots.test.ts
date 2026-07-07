import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { evaluatePaylines, GRID_SIZE, PAYLINES, slots, SYMBOLS } from './slots';

describe('evaluatePaylines', () => {
  it('detects a hit on every defined payline independently', () => {
    // A base arrangement with no accidental payline matches of its own,
    // so overwriting just the target line with 'lemon' can't spuriously
    // complete a different (overlapping) payline.
    const base = ['cherry', 'lemon', 'grape', 'bell', 'clover', 'star', 'diamond', 'seven', 'cherry'];
    for (const line of PAYLINES) {
      const grid = [...base];
      for (const i of line) grid[i] = 'lemon';
      const hits = evaluatePaylines(grid);
      expect(hits).toHaveLength(1);
      expect(hits[0].line).toEqual(line);
      expect(hits[0].symbolId).toBe('lemon');
    }
  });

  it('stacks multiple simultaneous line hits', () => {
    const grid = Array(GRID_SIZE).fill('seven'); // every line hits at once
    const hits = evaluatePaylines(grid);
    expect(hits).toHaveLength(PAYLINES.length);
  });

  it('finds no hits on a non-matching grid', () => {
    const grid = ['cherry', 'lemon', 'grape', 'bell', 'clover', 'star', 'diamond', 'cherry', 'lemon'];
    const hits = evaluatePaylines(grid);
    expect(hits).toEqual([]);
  });
});

describe('slots module', () => {
  it('resolves on a single spin action and fills a 9-cell grid', () => {
    const rng = createRng('slots-1');
    const state = slots.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    expect(slots.actions(state)).toEqual(['spin']);
    const { state: resolved } = slots.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
    expect(resolved.resolved).toBe(true);
    expect(resolved.grid).toHaveLength(GRID_SIZE);
    for (const cell of resolved.grid) {
      expect(SYMBOLS.some((s) => s.id === cell)).toBe(true);
    }
  });

  it('payoutMultiplier is the sum of all hit paylines, 0 if none hit', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`slots-payout-${i}`);
      const state = slots.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
      const { state: resolved, events } = slots.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
      const expected = evaluatePaylines(resolved.grid).reduce((sum, h) => sum + h.payout, 0);
      expect(resolved.payoutMultiplier).toBe(expected);
      expect(events[0].payoutMultiplier).toBe(expected);
      if (expected === 0) expect(resolved.hits).toEqual([]);
    }
  });

  it('is idempotent once resolved and throws on an unknown action', () => {
    const rng = createRng('slots-guard');
    const state = slots.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = slots.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
    const { state: again, events } = slots.step(resolved, 'spin', rng, NEUTRAL_MODIFIERS);
    expect(again).toBe(resolved);
    expect(events).toEqual([]);
    expect(() => slots.step(state, 'nudge', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('over ~20k Monte Carlo spins, RTP lands in a sane range', () => {
    const trials = 20_000;
    let totalPayout = 0;
    for (let i = 0; i < trials; i++) {
      const rng = createRng(`slots-rtp-${i}`);
      const state = slots.initRound(1, undefined, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = slots.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
      totalPayout += resolved.payoutMultiplier;
    }
    const rtp = totalPayout / trials;
    // Precise tuning happens in the M4 balance pass; this just guards against a
    // broken paytable (e.g. an accidental 10x weight or payout typo).
    expect(rtp).toBeGreaterThan(0.7);
    expect(rtp).toBeLessThan(1.15);
  });
});
