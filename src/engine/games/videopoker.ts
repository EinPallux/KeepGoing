/**
 * Jacks-or-Better video poker. Deal 5 cards, hold any subset, draw replacements
 * for the rest, then get paid on the final poker hand. Single 52-card deck;
 * card indices share hilo's encoding (rank = index % 13 + 1, Ace = 1/high).
 */
import type { GameModule } from './types';
import { cardRank, cardSuit, DECK_SIZE } from './hilo';

export { cardRank, cardSuit };

export type PokerHand =
  | 'royal_flush'
  | 'straight_flush'
  | 'four_kind'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'three_kind'
  | 'two_pair'
  | 'jacks_or_better'
  | 'nothing';

/** Payout multiplier of the bet by hand (a 9/6-ish Jacks-or-Better table). */
export const VIDEO_POKER_PAYTABLE: Record<PokerHand, number> = {
  royal_flush: 500,
  straight_flush: 50,
  four_kind: 25,
  full_house: 9,
  flush: 6,
  straight: 4,
  three_kind: 3,
  two_pair: 2,
  jacks_or_better: 1,
  nothing: 0,
};

export const HAND_LABEL: Record<PokerHand, string> = {
  royal_flush: 'Royal Flush',
  straight_flush: 'Straight Flush',
  four_kind: 'Four of a Kind',
  full_house: 'Full House',
  flush: 'Flush',
  straight: 'Straight',
  three_kind: 'Three of a Kind',
  two_pair: 'Two Pair',
  jacks_or_better: 'Jacks or Better',
  nothing: 'No Win',
};

/** Classifies a 5-card hand. Ace plays high (10-J-Q-K-A) or low (A-2-3-4-5). */
export function evaluateHand(cards: readonly number[]): PokerHand {
  const ranks = cards.map(cardRank).sort((a, b) => a - b);
  const suits = cards.map(cardSuit);
  const isFlush = suits.every((s) => s === suits[0]);

  const key = ranks.join(',');
  const isRoyalRun = key === '1,10,11,12,13'; // 10-J-Q-K-A
  const uniqueRanks = new Set(ranks).size;
  const isStraight = uniqueRanks === 5 && (ranks[4] - ranks[0] === 4 || isRoyalRun);

  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const countVals = [...counts.values()].sort((a, b) => b - a);

  if (isStraight && isFlush) return isRoyalRun ? 'royal_flush' : 'straight_flush';
  if (countVals[0] === 4) return 'four_kind';
  if (countVals[0] === 3 && countVals[1] === 2) return 'full_house';
  if (isFlush) return 'flush';
  if (isStraight) return 'straight';
  if (countVals[0] === 3) return 'three_kind';
  if (countVals[0] === 2 && countVals[1] === 2) return 'two_pair';
  if (countVals[0] === 2) {
    const pairRank = [...counts.entries()].find(([, c]) => c === 2)![0];
    // Jacks, Queens, Kings (11-13) or Aces (1) qualify.
    return pairRank >= 11 || pairRank === 1 ? 'jacks_or_better' : 'nothing';
  }
  return 'nothing';
}

export interface VideoPokerState {
  bet: number;
  deck: number[];
  /** The five card indices currently in front of the player. */
  hand: number[];
  held: boolean[];
  phase: 'draw' | 'done';
  resolved: boolean;
  handRank: PokerHand | null;
  payoutMultiplier: number;
}

export const videopoker: GameModule<VideoPokerState, undefined> = {
  id: 'videopoker',
  label: 'Video Poker',
  description: 'Jacks or Better. Deal 5, hold the ones you want, draw the rest - the better the poker hand, the bigger the pay.',
  defaultConfig: undefined,

  initRound(bet, _config, rng) {
    const deck = rng.shuffle(Array.from({ length: DECK_SIZE }, (_, i) => i));
    return {
      bet,
      deck,
      hand: deck.slice(0, 5),
      held: [false, false, false, false, false],
      phase: 'draw',
      resolved: false,
      handRank: null,
      payoutMultiplier: 0,
    };
  },

  actions(state) {
    if (state.resolved || state.phase !== 'draw') return [];
    return ['hold:0', 'hold:1', 'hold:2', 'hold:3', 'hold:4', 'draw'];
  },

  step(state, action, _rng, _mods) {
    if (state.resolved) return { state, events: [] };

    const holdMatch = /^hold:(\d)$/.exec(action);
    if (holdMatch) {
      const i = Number(holdMatch[1]);
      if (i < 0 || i > 4) throw new Error(`Video Poker: hold index ${i} out of range`);
      const held = state.held.slice();
      held[i] = !held[i];
      return { state: { ...state, held }, events: [] };
    }

    if (action === 'draw') {
      let next = 5;
      const hand = state.hand.map((card, i) => (state.held[i] ? card : state.deck[next++]));
      const handRank = evaluateHand(hand);
      const payoutMultiplier = VIDEO_POKER_PAYTABLE[handRank];
      return {
        state: { ...state, hand, phase: 'done', resolved: true, handRank, payoutMultiplier },
        events: [{ type: 'outcome', payoutMultiplier, meta: { handRank } }],
      };
    }

    throw new Error(`Video Poker received unknown action: ${action}`);
  },

  isResolved(state) {
    return state.resolved;
  },
};
