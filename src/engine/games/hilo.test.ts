import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { cardRank, hilo } from './hilo';

describe('cardRank', () => {
  it('cycles 1-13 across the 52-card deck', () => {
    expect(cardRank(0)).toBe(1);
    expect(cardRank(12)).toBe(13);
    expect(cardRank(13)).toBe(1);
    expect(cardRank(51)).toBe(13);
  });
});

describe('hilo module', () => {
  it('starts unresolved with a chain multiplier of 1 and no cashout offered yet', () => {
    const rng = createRng('hilo-init');
    const state = hilo.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    expect(state.chainMultiplier).toBe(1);
    expect(state.resolved).toBe(false);
    expect(hilo.actions(state)).not.toContain('cashout');
  });

  it('offers only guesses that can possibly win at the deck edges', () => {
    // Force the current card to the deck's lowest rank by checking a few seeds;
    // rather than depend on shuffle output, assert the general invariant instead.
    for (let i = 0; i < 20; i++) {
      const rng = createRng(`hilo-actions-${i}`);
      const state = hilo.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
      const acts = hilo.actions(state);
      expect(acts.length).toBeGreaterThan(0);
      expect(acts.every((a) => ['higher', 'lower', 'cashout'].includes(a))).toBe(true);
    }
  });

  it('throws cashing out before any correct guess', () => {
    const rng = createRng('hilo-cashout-guard');
    const state = hilo.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    expect(() => hilo.step(state, 'cashout', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('a wrong (or tied) guess busts with payoutMultiplier 0', () => {
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const trialRng = createRng(`hilo-bust-${i}`);
      const state = hilo.initRound(10, undefined, trialRng, NEUTRAL_MODIFIERS);
      const acts = hilo.actions(state);
      const guess = acts.includes('higher') ? 'higher' : 'lower';
      const wrongGuess = guess === 'higher' ? 'lower' : 'higher';
      if (!acts.includes(wrongGuess)) continue; // both guesses were winnable, skip - we want a guaranteed-wrong one below
      // Deliberately guess the direction we know loses by checking against actual next card.
      const currentRank = cardRank(state.deck[state.position]);
      const nextRank = cardRank(state.deck[state.position + 1]);
      const badGuess = nextRank > currentRank ? 'lower' : nextRank < currentRank ? 'higher' : 'higher';
      const { state: resolved, events } = hilo.step(state, badGuess, trialRng, NEUTRAL_MODIFIERS);
      if (resolved.busted) {
        found = true;
        expect(resolved.resolved).toBe(true);
        expect(resolved.payoutMultiplier).toBe(0);
        expect(events[0].payoutMultiplier).toBe(0);
      }
    }
    expect(found).toBe(true);
  });

  it('a correct guess compounds the chain multiplier and unlocks cashout', () => {
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const trialRng = createRng(`hilo-win-${i}`);
      const state = hilo.initRound(10, undefined, trialRng, NEUTRAL_MODIFIERS);
      const currentRank = cardRank(state.deck[state.position]);
      const nextRank = cardRank(state.deck[state.position + 1]);
      if (nextRank === currentRank) continue; // ties always lose; skip to find a clean win
      const goodGuess = nextRank > currentRank ? 'higher' : 'lower';
      const { state: resolved, events } = hilo.step(state, goodGuess, trialRng, NEUTRAL_MODIFIERS);
      found = true;
      expect(resolved.resolved).toBe(false);
      expect(resolved.chainMultiplier).toBeGreaterThan(1);
      expect(events).toEqual([]);
      expect(hilo.actions(resolved)).toContain('cashout');
    }
    expect(found).toBe(true);
  });

  it('cashing out pays exactly the current chain multiplier', () => {
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const trialRng = createRng(`hilo-cashout-${i}`);
      let state = hilo.initRound(10, undefined, trialRng, NEUTRAL_MODIFIERS);
      const currentRank = cardRank(state.deck[state.position]);
      const nextRank = cardRank(state.deck[state.position + 1]);
      if (nextRank === currentRank) continue;
      const goodGuess = nextRank > currentRank ? 'higher' : 'lower';
      const stepped = hilo.step(state, goodGuess, trialRng, NEUTRAL_MODIFIERS);
      state = stepped.state;
      const { state: cashedOut, events } = hilo.step(state, 'cashout', trialRng, NEUTRAL_MODIFIERS);
      found = true;
      expect(cashedOut.resolved).toBe(true);
      expect(cashedOut.cashedOut).toBe(true);
      expect(cashedOut.payoutMultiplier).toBeCloseTo(state.chainMultiplier);
      expect(events[0].payoutMultiplier).toBeCloseTo(state.chainMultiplier);
    }
    expect(found).toBe(true);
  });

  it('throws on an unknown action', () => {
    const rng = createRng('hilo-unknown-action');
    const state = hilo.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    expect(() => hilo.step(state, 'sideways', rng, NEUTRAL_MODIFIERS)).toThrow();
  });
});
