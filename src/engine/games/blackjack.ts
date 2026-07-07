/**
 * Single deck, dealer stands on 17+, blackjack pays 3:2, hit/stand/double
 * (no split in v1). See PLAN.md table #7.
 */
import type { GameModule, StepResult } from './types';
import { cardRank, cardSuit, DECK_SIZE } from './hilo';

export { cardRank, cardSuit };

const DEALER_STAND_VALUE = 17;

export type BlackjackOutcome = 'blackjack' | 'win' | 'push' | 'loss' | 'bust';

export interface BlackjackState {
  bet: number;
  deck: number[];
  /** Index of the next undealt card in `deck`. */
  position: number;
  playerCards: number[];
  dealerCards: number[];
  phase: 'player' | 'done';
  doubled: boolean;
  resolved: boolean;
  outcome: BlackjackOutcome | null;
  payoutMultiplier: number;
}

function cardValue(cardIndex: number): number {
  const rank = cardRank(cardIndex);
  if (rank === 1) return 11;
  if (rank >= 11) return 10;
  return rank;
}

export function handValue(cards: readonly number[]): number {
  let sum = 0;
  let aces = 0;
  for (const c of cards) {
    const rank = cardRank(c);
    if (rank === 1) aces++;
    sum += cardValue(c);
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

export function isBlackjack(cards: readonly number[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

function resolveMultiplier(outcome: BlackjackOutcome, doubled: boolean): number {
  const scale = doubled ? 2 : 1;
  switch (outcome) {
    case 'blackjack':
      return 2.5 * scale;
    case 'win':
      return 2 * scale;
    case 'push':
      return 1 * scale;
    case 'loss':
    case 'bust':
      return 0;
  }
}

function finish(state: BlackjackState, outcome: BlackjackOutcome): StepResult<BlackjackState> {
  const payoutMultiplier = resolveMultiplier(outcome, state.doubled);
  const nextState: BlackjackState = { ...state, phase: 'done', resolved: true, outcome, payoutMultiplier };
  return {
    state: nextState,
    events: [{ type: 'outcome', payoutMultiplier, meta: { outcome, player: handValue(state.playerCards), dealer: handValue(state.dealerCards) } }],
  };
}

function runDealerAndSettle(state: BlackjackState): BlackjackState {
  let dealerCards = state.dealerCards;
  let position = state.position;
  while (handValue(dealerCards) < DEALER_STAND_VALUE) {
    dealerCards = [...dealerCards, state.deck[position]];
    position++;
  }
  return { ...state, dealerCards, position };
}

/** Compares final hands after the dealer has played out. Caller guarantees the player hasn't bust. */
function settleOutcome(state: BlackjackState): BlackjackOutcome {
  const playerValue = handValue(state.playerCards);
  const dealerValue = handValue(state.dealerCards);
  if (dealerValue > 21 || playerValue > dealerValue) return 'win';
  if (playerValue === dealerValue) return 'push';
  return 'loss';
}

export const blackjack: GameModule<BlackjackState, undefined> = {
  id: 'blackjack',
  label: 'Blackjack',
  description: 'Single deck, dealer stands on 17. Blackjack pays 3:2. Hit, stand, or double down.',
  defaultConfig: undefined,

  initRound(bet, _config, rng) {
    const deck = rng.shuffle(Array.from({ length: DECK_SIZE }, (_, i) => i));
    const playerCards = [deck[0], deck[2]];
    const dealerCards = [deck[1], deck[3]];

    const base: BlackjackState = {
      bet,
      deck,
      position: 4,
      playerCards,
      dealerCards,
      phase: 'player',
      doubled: false,
      resolved: false,
      outcome: null,
      payoutMultiplier: 0,
    };

    const playerBJ = isBlackjack(playerCards);
    const dealerBJ = isBlackjack(dealerCards);
    if (playerBJ || dealerBJ) {
      const outcome: BlackjackOutcome = playerBJ && dealerBJ ? 'push' : playerBJ ? 'blackjack' : 'loss';
      const payoutMultiplier = resolveMultiplier(outcome, false);
      return { ...base, phase: 'done', resolved: true, outcome, payoutMultiplier };
    }

    return base;
  },

  actions(state) {
    if (state.resolved || state.phase !== 'player') return [];
    const acts = ['hit', 'stand'];
    if (state.playerCards.length === 2) acts.push('double');
    return acts;
  },

  step(state, action, _rng) {
    if (state.resolved) return { state, events: [] };

    if (action === 'stand') {
      const afterDealer = runDealerAndSettle(state);
      return finish(afterDealer, settleOutcome(afterDealer));
    }

    if (action === 'double') {
      if (state.playerCards.length !== 2) throw new Error('Blackjack: can only double on your first decision');
      const drawn = state.deck[state.position];
      const playerCards = [...state.playerCards, drawn];
      const doubled = { ...state, playerCards, position: state.position + 1, doubled: true };
      if (handValue(playerCards) > 21) return finish(doubled, 'bust');
      const afterDealer = runDealerAndSettle(doubled);
      return finish(afterDealer, settleOutcome(afterDealer));
    }

    if (action === 'hit') {
      const drawn = state.deck[state.position];
      const playerCards = [...state.playerCards, drawn];
      const nextState = { ...state, playerCards, position: state.position + 1 };
      const value = handValue(playerCards);
      if (value > 21) return finish(nextState, 'bust');
      if (value === 21) {
        const afterDealer = runDealerAndSettle(nextState);
        return finish(afterDealer, settleOutcome(afterDealer));
      }
      return { state: nextState, events: [] };
    }

    throw new Error(`Blackjack received unknown action: ${action}`);
  },

  isResolved(state) {
    return state.resolved;
  },
};
