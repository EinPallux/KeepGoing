import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { coinflip, coinflipMultiplier, COINFLIP_MAX_FLIPS, type CoinSide } from './coinflip';

const M = NEUTRAL_MODIFIERS;
const init = () => coinflip.initRound(10, undefined, createRng('init'), M);

// The coin result for a seed is deterministic, so we can force a correct or
// wrong call by peeking with a fresh rng from the same seed.
function resultFor(seed: string): CoinSide {
  return createRng(seed).chance(0.5) ? 'heads' : 'tails';
}

describe('coinflipMultiplier', () => {
  it('is 1 at streak 0 and compounds ~1.96 per correct call', () => {
    expect(coinflipMultiplier(0)).toBe(1);
    expect(coinflipMultiplier(1)).toBeCloseTo(1.96);
    expect(coinflipMultiplier(3)).toBeCloseTo(1.96 ** 3);
  });
});

describe('coinflip module', () => {
  it('offers heads/tails, and cashout only after a correct call', () => {
    const state = init();
    expect(coinflip.actions(state)).toEqual(['heads', 'tails']);
    const seed = 'win-first';
    const won = coinflip.step(state, resultFor(seed), createRng(seed), M).state;
    expect(won.streak).toBe(1);
    expect(coinflip.actions(won)).toContain('cashout');
  });

  it('grows the streak and multiplier on correct calls, then cashes out', () => {
    let state = init();
    for (let k = 0; k < 5; k++) {
      const seed = `run-${k}`;
      state = coinflip.step(state, resultFor(seed), createRng(seed), M).state;
      expect(state.busted).toBe(false);
      expect(state.streak).toBe(k + 1);
      expect(state.chainMultiplier).toBeCloseTo(coinflipMultiplier(k + 1));
    }
    const cashed = coinflip.step(state, 'cashout', createRng('c'), M);
    expect(cashed.state.cashedOut).toBe(true);
    expect(cashed.state.resolved).toBe(true);
    expect(cashed.state.payoutMultiplier).toBeCloseTo(coinflipMultiplier(5));
    expect(cashed.events[0].payoutMultiplier).toBeCloseTo(coinflipMultiplier(5));
  });

  it('busts (payout 0) on a wrong call', () => {
    const state = init();
    const seed = 'lose';
    const correct = resultFor(seed);
    const wrong: CoinSide = correct === 'heads' ? 'tails' : 'heads';
    const r = coinflip.step(state, wrong, createRng(seed), M);
    expect(r.state.busted).toBe(true);
    expect(r.state.resolved).toBe(true);
    expect(r.state.payoutMultiplier).toBe(0);
  });

  it('auto-cashes out at the max streak', () => {
    let state = init();
    for (let k = 0; k < COINFLIP_MAX_FLIPS; k++) {
      const seed = `max-${k}`;
      state = coinflip.step(state, resultFor(seed), createRng(seed), M).state;
    }
    expect(state.resolved).toBe(true);
    expect(state.cashedOut).toBe(true);
    expect(state.streak).toBe(COINFLIP_MAX_FLIPS);
    expect(state.payoutMultiplier).toBeCloseTo(coinflipMultiplier(COINFLIP_MAX_FLIPS));
  });

  it('guards: cashout before a win, unknown action, and post-resolve idempotency', () => {
    const state = init();
    expect(() => coinflip.step(state, 'cashout', createRng('x'), M)).toThrow();
    expect(() => coinflip.step(state, 'edge', createRng('x'), M)).toThrow();
    const busted = coinflip.step(state, resultFor('b') === 'heads' ? 'tails' : 'heads', createRng('b'), M).state;
    const again = coinflip.step(busted, 'heads', createRng('y'), M);
    expect(again.state).toBe(busted);
    expect(again.events).toEqual([]);
  });
});
