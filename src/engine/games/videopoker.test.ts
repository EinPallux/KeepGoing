import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { evaluateHand, videopoker, VIDEO_POKER_PAYTABLE, type PokerHand } from './videopoker';

const M = NEUTRAL_MODIFIERS;
/** card index from a rank (A=1..K=13) and suit (0-3), matching hilo's encoding. */
const c = (rank: number, suit: number) => suit * 13 + (rank - 1);

describe('evaluateHand', () => {
  const cases: [string, number[], PokerHand][] = [
    ['royal flush', [c(10, 0), c(11, 0), c(12, 0), c(13, 0), c(1, 0)], 'royal_flush'],
    ['straight flush', [c(5, 0), c(6, 0), c(7, 0), c(8, 0), c(9, 0)], 'straight_flush'],
    ['wheel straight flush (A-5)', [c(1, 1), c(2, 1), c(3, 1), c(4, 1), c(5, 1)], 'straight_flush'],
    ['four of a kind', [c(1, 0), c(1, 1), c(1, 2), c(1, 3), c(13, 0)], 'four_kind'],
    ['full house', [c(5, 0), c(5, 1), c(5, 2), c(13, 0), c(13, 1)], 'full_house'],
    ['flush', [c(2, 0), c(4, 0), c(6, 0), c(9, 0), c(11, 0)], 'flush'],
    ['straight (mixed)', [c(6, 0), c(7, 1), c(8, 2), c(9, 3), c(10, 0)], 'straight'],
    ['ace-high straight (mixed)', [c(10, 0), c(11, 1), c(12, 2), c(13, 3), c(1, 0)], 'straight'],
    ['wheel straight (mixed)', [c(1, 0), c(2, 1), c(3, 2), c(4, 3), c(5, 0)], 'straight'],
    ['three of a kind', [c(7, 0), c(7, 1), c(7, 2), c(2, 0), c(4, 1)], 'three_kind'],
    ['two pair', [c(3, 0), c(3, 1), c(9, 0), c(9, 1), c(13, 0)], 'two_pair'],
    ['jacks or better', [c(11, 0), c(11, 1), c(2, 0), c(4, 0), c(7, 1)], 'jacks_or_better'],
    ['pair of aces qualifies', [c(1, 0), c(1, 1), c(3, 0), c(6, 0), c(9, 1)], 'jacks_or_better'],
    ['low pair is nothing', [c(5, 0), c(5, 1), c(2, 0), c(7, 0), c(9, 1)], 'nothing'],
    ['high card is nothing', [c(2, 0), c(5, 1), c(8, 2), c(11, 3), c(13, 0)], 'nothing'],
  ];
  for (const [name, cards, expected] of cases) {
    it(`classifies a ${name}`, () => {
      expect(evaluateHand(cards)).toBe(expected);
    });
  }
});

describe('videopoker module', () => {
  it('deals 5, exposes hold/draw actions, and pays per the hand on draw', () => {
    const rng = createRng('vp-1');
    const state = videopoker.initRound(10, undefined, rng, M);
    expect(state.hand).toHaveLength(5);
    expect(videopoker.actions(state)).toEqual(['hold:0', 'hold:1', 'hold:2', 'hold:3', 'hold:4', 'draw']);

    const { state: resolved, events } = videopoker.step(state, 'draw', rng, M);
    expect(resolved.resolved).toBe(true);
    expect(resolved.phase).toBe('done');
    expect(resolved.handRank).not.toBeNull();
    expect(resolved.payoutMultiplier).toBe(VIDEO_POKER_PAYTABLE[resolved.handRank!]);
    expect(events[0].payoutMultiplier).toBe(resolved.payoutMultiplier);
  });

  it('keeps held cards and replaces the rest from the deck', () => {
    const rng = createRng('vp-hold');
    let state = videopoker.initRound(10, undefined, rng, M);
    const original = [...state.hand];
    state = videopoker.step(state, 'hold:0', rng, M).state;
    state = videopoker.step(state, 'hold:2', rng, M).state;
    expect(state.held).toEqual([true, false, true, false, false]);
    const drawn = videopoker.step(state, 'draw', rng, M).state;
    expect(drawn.hand[0]).toBe(original[0]);
    expect(drawn.hand[2]).toBe(original[2]);
    // replaced positions come off the top of the remaining deck
    expect(drawn.hand[1]).toBe(state.deck[5]);
    expect(drawn.hand[3]).toBe(state.deck[6]);
    expect(drawn.hand[4]).toBe(state.deck[7]);
  });

  it('is idempotent once resolved and throws on an unknown action', () => {
    const rng = createRng('vp-guard');
    const state = videopoker.initRound(10, undefined, rng, M);
    const resolved = videopoker.step(state, 'draw', rng, M).state;
    const again = videopoker.step(resolved, 'draw', rng, M);
    expect(again.state).toBe(resolved);
    expect(again.events).toEqual([]);
    expect(() => videopoker.step(state, 'fold', rng, M)).toThrow();
  });
});
