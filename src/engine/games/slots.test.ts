import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { evaluatePaylines, GRID_SIZE, PAYLINES, REEL_COUNT, slots, SYMBOLS } from './slots';

// A base grid where every reel (column) is a distinct symbol, so no payline
// (one cell per reel, left to right) has any consecutive match on its own.
const COLS = ['cherry', 'lemon', 'grape', 'bell', 'clover'];
const cleanBase = () => Array.from({ length: GRID_SIZE }, (_, i) => COLS[i % REEL_COUNT]);

describe('evaluatePaylines', () => {
  it('detects a 5-of-a-kind on every payline independently', () => {
    for (const line of PAYLINES) {
      const grid = cleanBase();
      for (const i of line) grid[i] = 'star';
      const hits = evaluatePaylines(grid);
      expect(hits).toHaveLength(1);
      expect(hits[0].line).toEqual(line);
      expect(hits[0].symbolId).toBe('star');
      expect(hits[0].count).toBe(5);
    }
  });

  it('pays only for left-to-right runs of 3+ starting on reel 1', () => {
    const line = PAYLINES[0]; // [5,6,7,8,9]
    // 'star' isn't one of the base column symbols, so the run stops cleanly at 3.
    const grid = cleanBase();
    grid[line[0]] = 'star';
    grid[line[1]] = 'star';
    grid[line[2]] = 'star';
    const hits = evaluatePaylines(grid);
    expect(hits).toHaveLength(1);
    expect(hits[0].count).toBe(3);
    expect(hits[0].cells).toEqual(line.slice(0, 3));

    // A match that does NOT include reel 1 pays nothing.
    const grid2 = cleanBase();
    grid2[line[1]] = 'star';
    grid2[line[2]] = 'star';
    grid2[line[3]] = 'star';
    expect(evaluatePaylines(grid2)).toEqual([]);
  });

  it('stacks every payline when the whole grid is one symbol', () => {
    const grid = Array(GRID_SIZE).fill('seven');
    const hits = evaluatePaylines(grid);
    expect(hits).toHaveLength(PAYLINES.length);
    expect(hits.every((h) => h.count === 5)).toBe(true);
  });

  it('finds no hits on a reel-distinct grid', () => {
    expect(evaluatePaylines(cleanBase())).toEqual([]);
  });
});

describe('evaluatePaylines with a void symbol', () => {
  it('zeroes the payout for the voided symbol but still reports the hit', () => {
    const line = PAYLINES[0];
    const grid = cleanBase();
    for (const i of line.slice(0, 3)) grid[i] = 'cherry';
    const hits = evaluatePaylines(grid, 'cherry');
    expect(hits).toHaveLength(1);
    expect(hits[0].symbolId).toBe('cherry');
    expect(hits[0].payout).toBe(0);
  });

  it('does not affect other symbols', () => {
    const line = PAYLINES[0];
    const grid = cleanBase();
    for (const i of line.slice(0, 3)) grid[i] = 'bell';
    const hits = evaluatePaylines(grid, 'cherry');
    expect(hits[0].payout).toBeGreaterThan(0);
  });
});

describe('slots module', () => {
  it('resolves on a single spin and fills a 15-cell grid', () => {
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
    // Precise tuning is the M4 balance pass; this only guards against a broken paytable.
    expect(rtp).toBeGreaterThan(0.6);
    expect(rtp).toBeLessThan(1.25);
  });
});
