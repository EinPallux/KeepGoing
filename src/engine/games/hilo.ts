/**
 * Guess whether the next card is higher or lower than the current one.
 * Each correct guess compounds a chain multiplier; cash out anytime. A tie
 * counts as a loss. See PLAN.md table #10.
 */
import type { GameModule } from './types';

export const HILO_HOUSE_EDGE = 0.02;
export const DECK_SIZE = 52;
export const RANKS_PER_SUIT = 13;

export type HiloGuess = 'higher' | 'lower';

export interface HiloState {
  bet: number;
  /** Shuffled card indices 0-51; rank = (index % 13) + 1 (Ace low, King high). */
  deck: number[];
  /** Index into `deck` of the currently revealed card. */
  position: number;
  chainMultiplier: number;
  resolved: boolean;
  busted: boolean;
  cashedOut: boolean;
  payoutMultiplier: number;
}

export function cardRank(cardIndex: number): number {
  return (cardIndex % RANKS_PER_SUIT) + 1;
}

export function cardSuit(cardIndex: number): number {
  return Math.floor(cardIndex / RANKS_PER_SUIT);
}

function remainingPool(state: HiloState): number[] {
  return state.deck.slice(state.position + 1);
}

/** How many successful guesses have been chained so far (also the cash-out gate). */
function guessesWon(state: HiloState): number {
  return state.position;
}

export const hilo: GameModule<HiloState, undefined> = {
  id: 'hilo',
  label: 'Hilo',
  description: 'Guess higher or lower than the last card. Chain guesses for a growing multiplier - a tie loses.',
  defaultConfig: undefined,

  initRound(bet, _config, rng) {
    const deck = rng.shuffle(Array.from({ length: DECK_SIZE }, (_, i) => i));
    return {
      bet,
      deck,
      position: 0,
      chainMultiplier: 1,
      resolved: false,
      busted: false,
      cashedOut: false,
      payoutMultiplier: 0,
    };
  },

  actions(state) {
    if (state.resolved) return [];
    const pool = remainingPool(state);
    const currentRank = cardRank(state.deck[state.position]);
    const acts: string[] = [];
    if (pool.some((c) => cardRank(c) > currentRank)) acts.push('higher');
    if (pool.some((c) => cardRank(c) < currentRank)) acts.push('lower');
    if (guessesWon(state) > 0) acts.push('cashout');
    return acts;
  },

  step(state, action, _rng, mods) {
    if (state.resolved) return { state, events: [] };

    if (action === 'cashout') {
      if (guessesWon(state) === 0) throw new Error('Hilo: cannot cash out before a correct guess');
      const payoutMultiplier = state.chainMultiplier;
      return {
        state: { ...state, resolved: true, cashedOut: true, payoutMultiplier },
        events: [{ type: 'outcome', payoutMultiplier, meta: { chain: guessesWon(state) } }],
      };
    }

    if (action !== 'higher' && action !== 'lower') {
      throw new Error(`Hilo received unknown action: ${action}`);
    }

    const pool = remainingPool(state);
    if (pool.length === 0) throw new Error('Hilo: deck exhausted');

    const currentRank = cardRank(state.deck[state.position]);
    const nextIndex = state.position + 1;
    const nextRank = cardRank(state.deck[nextIndex]);
    const correct = action === 'higher' ? nextRank > currentRank : nextRank < currentRank;

    if (!correct) {
      return {
        state: { ...state, position: nextIndex, resolved: true, busted: true, payoutMultiplier: 0 },
        events: [{ type: 'outcome', payoutMultiplier: 0, meta: { call: action, nextRank } }],
      };
    }

    const higherCount = pool.filter((c) => cardRank(c) > currentRank).length;
    const lowerCount = pool.filter((c) => cardRank(c) < currentRank).length;
    const winCount = action === 'higher' ? higherCount : lowerCount;
    const chance = winCount / pool.length;
    const houseEdge = HILO_HOUSE_EDGE + mods.houseEdgeBonus;
    const roundMultiplier = (1 - houseEdge) / chance;
    const chainMultiplier = state.chainMultiplier * roundMultiplier;

    const deckExhausted = nextIndex === DECK_SIZE - 1;
    if (deckExhausted) {
      return {
        state: {
          ...state,
          position: nextIndex,
          chainMultiplier,
          resolved: true,
          cashedOut: true,
          payoutMultiplier: chainMultiplier,
        },
        events: [{ type: 'outcome', payoutMultiplier: chainMultiplier, meta: { deckExhausted: true } }],
      };
    }

    return {
      state: { ...state, position: nextIndex, chainMultiplier },
      events: [],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
