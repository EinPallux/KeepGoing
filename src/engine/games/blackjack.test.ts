import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { blackjack, handValue, isBlackjack } from './blackjack';

describe('handValue', () => {
  it('treats a single ace as 11', () => {
    // Ace of spades (index 0) + 5 of spades (index 4, rank 5).
    expect(handValue([0, 4])).toBe(16);
  });

  it('downgrades aces to avoid busting', () => {
    // Ace (0) + King (12, rank 13) + King (25, rank 13 of hearts) => 11+10+10=31 -> ace becomes 1 -> 21
    expect(handValue([0, 12, 25])).toBe(21);
  });

  it('face cards are worth 10', () => {
    // Jack (10, rank 11) + Queen (11, rank 12)
    expect(handValue([10, 11])).toBe(20);
  });
});

describe('isBlackjack', () => {
  it('is true only for a 2-card 21', () => {
    expect(isBlackjack([0, 12])).toBe(true); // Ace + King
    expect(isBlackjack([0, 4, 8])).toBe(false); // 3-card 21 is not a "blackjack"
  });
});

describe('blackjack module', () => {
  it('deals 2 cards to player and dealer, and starts in player phase unless someone has blackjack', () => {
    let sawPlayerPhase = false;
    for (let i = 0; i < 100; i++) {
      const rng = createRng(`deal-${i}`);
      const state = blackjack.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
      expect(state.playerCards).toHaveLength(2);
      expect(state.dealerCards).toHaveLength(2);
      if (!state.resolved) {
        sawPlayerPhase = true;
        expect(state.phase).toBe('player');
        expect(blackjack.actions(state)).toEqual(['hit', 'stand', 'double']);
      }
    }
    expect(sawPlayerPhase).toBe(true);
  });

  it('resolves immediately on a natural blackjack (player or dealer)', () => {
    let sawResolvedDeal = false;
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`natural-${i}`);
      const state = blackjack.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
      if (state.resolved) {
        sawResolvedDeal = true;
        expect(['blackjack', 'push', 'loss']).toContain(state.outcome);
        if (state.outcome === 'blackjack') expect(state.payoutMultiplier).toBe(2.5);
        if (state.outcome === 'push') expect(state.payoutMultiplier).toBe(1);
        if (state.outcome === 'loss') expect(state.payoutMultiplier).toBe(0);
      }
    }
    expect(sawResolvedDeal).toBe(true);
  });

  it('hitting to bust pays 0 immediately', () => {
    // Search for a seed where the player can bust by hitting repeatedly.
    let found = false;
    for (let i = 0; i < 300 && !found; i++) {
      const rng = createRng(`bust-${i}`);
      let state = blackjack.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
      if (state.resolved) continue;
      for (let hits = 0; hits < 10; hits++) {
        const { state: next, events } = blackjack.step(state, 'hit', rng, NEUTRAL_MODIFIERS);
        state = next;
        if (state.resolved) {
          if (state.outcome === 'bust') {
            found = true;
            expect(state.payoutMultiplier).toBe(0);
            expect(events[0].payoutMultiplier).toBe(0);
          }
          break;
        }
      }
    }
    expect(found).toBe(true);
  });

  it('standing runs the dealer to 17+ and settles win/push/loss', () => {
    for (let i = 0; i < 50; i++) {
      const rng = createRng(`stand-${i}`);
      let state = blackjack.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
      if (state.resolved) continue;
      const { state: settled } = blackjack.step(state, 'stand', rng, NEUTRAL_MODIFIERS);
      expect(settled.resolved).toBe(true);
      expect(handValue(settled.dealerCards)).toBeGreaterThanOrEqual(17);
      expect(['win', 'push', 'loss']).toContain(settled.outcome);
    }
  });

  it('double draws exactly one card, doubles the payout scale, and forces a stand', () => {
    for (let i = 0; i < 50; i++) {
      const rng = createRng(`double-${i}`);
      let state = blackjack.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
      if (state.resolved) continue;
      const cardsBefore = state.playerCards.length;
      const { state: doubled } = blackjack.step(state, 'double', rng, NEUTRAL_MODIFIERS);
      expect(doubled.playerCards).toHaveLength(cardsBefore + 1);
      expect(doubled.doubled).toBe(true);
      expect(doubled.resolved).toBe(true);
      if (doubled.outcome === 'win') expect(doubled.payoutMultiplier).toBe(4);
      if (doubled.outcome === 'push') expect(doubled.payoutMultiplier).toBe(2);
      if (doubled.outcome === 'loss' || doubled.outcome === 'bust') expect(doubled.payoutMultiplier).toBe(0);
    }
  });

  it('double is only available as the first decision', () => {
    const rng = createRng('double-guard');
    let state = blackjack.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    if (state.resolved) return;
    const { state: afterHit } = blackjack.step(state, 'hit', rng, NEUTRAL_MODIFIERS);
    if (afterHit.resolved) return;
    expect(blackjack.actions(afterHit)).not.toContain('double');
    expect(() => blackjack.step(afterHit, 'double', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('is idempotent once resolved and throws on an unknown action', () => {
    const rng = createRng('guard-2');
    let state = blackjack.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    if (!state.resolved) {
      const stepped = blackjack.step(state, 'stand', rng, NEUTRAL_MODIFIERS);
      state = stepped.state;
    }
    const { state: again, events } = blackjack.step(state, 'stand', rng, NEUTRAL_MODIFIERS);
    expect(again).toBe(state);
    expect(events).toEqual([]);
  });
});
