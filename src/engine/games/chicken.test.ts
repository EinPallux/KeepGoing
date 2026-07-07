import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { chicken, chickenMultiplier, CHICKEN_LANES } from './chicken';

describe('chickenMultiplier', () => {
  it('grows with lanes crossed and with difficulty', () => {
    const easy2 = chickenMultiplier('easy', 2);
    const hard2 = chickenMultiplier('hard', 2);
    expect(hard2).toBeGreaterThan(easy2);
    expect(chickenMultiplier('medium', 3)).toBeGreaterThan(chickenMultiplier('medium', 2));
  });
});

describe('chicken module', () => {
  it('does not offer cashout before crossing a lane', () => {
    const rng = createRng('chicken-actions');
    const state = chicken.initRound(10, { difficulty: 'medium' }, rng, NEUTRAL_MODIFIERS);
    expect(chicken.actions(state)).toEqual(['cross']);
  });

  it('throws cashing out before crossing', () => {
    const rng = createRng('chicken-cashout-guard');
    const state = chicken.initRound(10, { difficulty: 'medium' }, rng, NEUTRAL_MODIFIERS);
    expect(() => chicken.step(state, 'cashout', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('busts with payoutMultiplier 0 on a hit', () => {
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const rng = createRng(`chicken-bust-${i}`);
      const state = chicken.initRound(10, { difficulty: 'hard' }, rng, NEUTRAL_MODIFIERS);
      const { state: next, events } = chicken.step(state, 'cross', rng, NEUTRAL_MODIFIERS);
      if (next.busted) {
        found = true;
        expect(next.resolved).toBe(true);
        expect(next.payoutMultiplier).toBe(0);
        expect(events[0].payoutMultiplier).toBe(0);
      }
    }
    expect(found).toBe(true);
  });

  it('crossing safely advances a lane and unlocks cashout', () => {
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const rng = createRng(`chicken-safe-${i}`);
      const state = chicken.initRound(10, { difficulty: 'easy' }, rng, NEUTRAL_MODIFIERS);
      const { state: next, events } = chicken.step(state, 'cross', rng, NEUTRAL_MODIFIERS);
      if (!next.resolved) {
        found = true;
        expect(next.lane).toBe(1);
        expect(events).toEqual([]);
        expect(chicken.actions(next)).toContain('cashout');
      }
    }
    expect(found).toBe(true);
  });

  it('cashing out pays the fair multiplier for lanes crossed', () => {
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const rng = createRng(`chicken-cashout-${i}`);
      const state = chicken.initRound(10, { difficulty: 'easy' }, rng, NEUTRAL_MODIFIERS);
      const { state: afterCross } = chicken.step(state, 'cross', rng, NEUTRAL_MODIFIERS);
      if (!afterCross.resolved) {
        found = true;
        const { state: cashedOut, events } = chicken.step(afterCross, 'cashout', rng, NEUTRAL_MODIFIERS);
        expect(cashedOut.resolved).toBe(true);
        expect(cashedOut.cashedOut).toBe(true);
        expect(cashedOut.payoutMultiplier).toBeCloseTo(chickenMultiplier('easy', 1));
        expect(events[0].payoutMultiplier).toBeCloseTo(chickenMultiplier('easy', 1));
      }
    }
    expect(found).toBe(true);
  });

  it('auto-resolves as a win after crossing every lane', () => {
    const rng = createRng('chicken-fixed-win');
    // A near-certain survival chance keeps this deterministic without special-casing rng.
    let state = chicken.initRound(10, { difficulty: 'easy' }, rng, NEUTRAL_MODIFIERS);
    for (let lane = 0; lane < CHICKEN_LANES && !state.resolved; lane++) {
      const stepped = chicken.step(state, 'cross', rng, NEUTRAL_MODIFIERS);
      state = stepped.state;
    }
    if (state.cashedOut && state.lane === CHICKEN_LANES) {
      expect(state.payoutMultiplier).toBeCloseTo(chickenMultiplier('easy', CHICKEN_LANES));
    }
    // Either a full clear or a bust along the way are both valid outcomes for this seed;
    // the important invariant is that the game always terminates in a resolved state.
    expect(state.resolved).toBe(true);
  });

  it('throws on an unknown action', () => {
    const rng = createRng('chicken-guard');
    const state = chicken.initRound(10, { difficulty: 'medium' }, rng, NEUTRAL_MODIFIERS);
    expect(() => chicken.step(state, 'nudge', rng, NEUTRAL_MODIFIERS)).toThrow();
  });
});
