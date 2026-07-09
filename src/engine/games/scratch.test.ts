import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { evaluateScratch, scratch, SCRATCH_CELLS, SCRATCH_SYMBOLS } from './scratch';

const M = NEUTRAL_MODIFIERS;
const prizeOf = (id: string, count: number) =>
  SCRATCH_SYMBOLS.find((s) => s.id === id)!.prizes[Math.min(count, 5) - 3];

describe('evaluateScratch', () => {
  it('reports a win for any symbol appearing 3+ times, with the right prize', () => {
    const cells = ['coin', 'coin', 'coin', 'blankA', 'blankB', 'blankA', 'gem', 'gem', 'blankB'];
    const wins = evaluateScratch(cells);
    expect(wins).toHaveLength(1);
    expect(wins[0]).toMatchObject({ symbolId: 'coin', count: 3, prize: prizeOf('coin', 3) });
  });

  it('stacks multiple matched symbols and scales the prize by count', () => {
    const cells = ['star', 'star', 'star', 'star', 'gem', 'gem', 'gem', 'blankA', 'blankB'];
    const wins = evaluateScratch(cells);
    const byId = Object.fromEntries(wins.map((w) => [w.symbolId, w]));
    expect(byId.star).toMatchObject({ count: 4, prize: prizeOf('star', 4) });
    expect(byId.gem).toMatchObject({ count: 3, prize: prizeOf('gem', 3) });
  });

  it('pays nothing for fewer than 3, or for blank symbols', () => {
    expect(evaluateScratch(['coin', 'coin', 'gem', 'gem', 'blankA', 'blankB', 'star', 'star', 'bell'])).toEqual([]);
    const blanks = evaluateScratch(['blankA', 'blankA', 'blankA', 'blankB', 'blankB', 'blankB', 'coin', 'gem', 'star']);
    expect(blanks.every((w) => w.prize === 0)).toBe(true);
  });
});

describe('scratch module', () => {
  it('resolves on a single scratch and fills the card', () => {
    const rng = createRng('scr-1');
    const state = scratch.initRound(10, undefined, rng, M);
    expect(scratch.actions(state)).toEqual(['scratch']);
    const { state: resolved } = scratch.step(state, 'scratch', rng, M);
    expect(resolved.resolved).toBe(true);
    expect(resolved.cells).toHaveLength(SCRATCH_CELLS);
    for (const cell of resolved.cells) {
      expect(SCRATCH_SYMBOLS.some((s) => s.id === cell)).toBe(true);
    }
  });

  it('payoutMultiplier is the sum of all wins', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`scr-payout-${i}`);
      const state = scratch.initRound(10, undefined, rng, M);
      const { state: resolved, events } = scratch.step(state, 'scratch', rng, M);
      const expected = evaluateScratch(resolved.cells).reduce((sum, w) => sum + w.prize, 0);
      expect(resolved.payoutMultiplier).toBe(expected);
      expect(events[0].payoutMultiplier).toBe(expected);
    }
  });

  it('is idempotent once resolved and throws on an unknown action', () => {
    const rng = createRng('scr-guard');
    const state = scratch.initRound(10, undefined, rng, M);
    const resolved = scratch.step(state, 'scratch', rng, M).state;
    const again = scratch.step(resolved, 'scratch', rng, M);
    expect(again.state).toBe(resolved);
    expect(again.events).toEqual([]);
    expect(() => scratch.step(state, 'peek', rng, M)).toThrow();
  });

  it('over ~20k Monte Carlo cards, RTP lands in a sane range', () => {
    const trials = 20_000;
    let total = 0;
    for (let i = 0; i < trials; i++) {
      const rng = createRng(`scr-rtp-${i}`);
      const state = scratch.initRound(1, undefined, rng, M);
      total += scratch.step(state, 'scratch', rng, M).state.payoutMultiplier;
    }
    const rtp = total / trials;
    expect(rtp).toBeGreaterThan(0.6);
    expect(rtp).toBeLessThan(1.2);
  });
});
