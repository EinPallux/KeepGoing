/**
 * Placeholder table used to prove out the full run loop before the real
 * twelve games exist (see PLAN.md M0 exit test). One play = one flip.
 */
import type { GameModule } from './types';

export interface CoinFlipState {
  bet: number;
  resolved: boolean;
  won: boolean | null;
  call: 'heads' | 'tails' | null;
  result: 'heads' | 'tails' | null;
  payoutMultiplier: number;
}

export const coinFlip: GameModule<CoinFlipState> = {
  id: 'coinflip',
  label: 'Coin Flip',
  description: 'Call it. Heads or tails, double or nothing.',

  initRound(bet) {
    return { bet, resolved: false, won: null, call: null, result: null, payoutMultiplier: 0 };
  },

  actions(state) {
    return state.resolved ? [] : ['heads', 'tails'];
  },

  step(state, action, rng, mods) {
    if (state.resolved) return { state, events: [] };
    if (action !== 'heads' && action !== 'tails') {
      throw new Error(`CoinFlip received unknown action: ${action}`);
    }

    const result = rng.chance(0.5) ? 'heads' : 'tails';
    const won = action === result;
    const payoutMultiplier = won ? 2 * mods.payoutMultiplier : 0;

    const nextState: CoinFlipState = {
      ...state,
      resolved: true,
      won,
      call: action,
      result,
      payoutMultiplier,
    };

    return {
      state: nextState,
      events: [{ type: 'outcome', payoutMultiplier, meta: { call: action, result } }],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
