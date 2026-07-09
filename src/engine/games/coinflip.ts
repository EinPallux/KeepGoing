/**
 * Double-or-nothing coin flip. Call heads or tails; every correct call ~doubles
 * your running stake (a small house edge is baked into the multiplier). Bank it
 * anytime, or push your luck up to COINFLIP_MAX_FLIPS times. A wrong call busts.
 */
import type { GameModule } from './types';

export const COINFLIP_HOUSE_EDGE = 0.02;
export const COINFLIP_MAX_FLIPS = 12;

export type CoinSide = 'heads' | 'tails';

export interface CoinFlipRecord {
  call: CoinSide;
  result: CoinSide;
  won: boolean;
}

export interface CoinFlipState {
  bet: number;
  streak: number;
  chainMultiplier: number;
  history: CoinFlipRecord[];
  lastResult: CoinSide | null;
  resolved: boolean;
  busted: boolean;
  cashedOut: boolean;
  payoutMultiplier: number;
}

/** Running multiplier after `streak` correct calls: ((1 - edge) / 0.5) ^ streak. */
export function coinflipMultiplier(streak: number, houseEdge: number = COINFLIP_HOUSE_EDGE): number {
  return ((1 - houseEdge) / 0.5) ** streak;
}

export const coinflip: GameModule<CoinFlipState, undefined> = {
  id: 'coinflip',
  label: 'Coin Flip',
  description: `Call heads or tails. Each correct call almost doubles your stake - bank it or risk it again, up to ${COINFLIP_MAX_FLIPS} flips.`,
  defaultConfig: undefined,

  initRound(bet) {
    return {
      bet,
      streak: 0,
      chainMultiplier: 1,
      history: [],
      lastResult: null,
      resolved: false,
      busted: false,
      cashedOut: false,
      payoutMultiplier: 0,
    };
  },

  actions(state) {
    if (state.resolved) return [];
    const acts: string[] = ['heads', 'tails'];
    if (state.streak > 0) acts.push('cashout');
    return acts;
  },

  step(state, action, rng, mods) {
    if (state.resolved) return { state, events: [] };
    const houseEdge = COINFLIP_HOUSE_EDGE + mods.houseEdgeBonus;

    if (action === 'cashout') {
      if (state.streak === 0) throw new Error('CoinFlip: cannot cash out before a correct call');
      const payoutMultiplier = state.chainMultiplier;
      return {
        state: { ...state, resolved: true, cashedOut: true, payoutMultiplier },
        events: [{ type: 'outcome', payoutMultiplier, meta: { streak: state.streak } }],
      };
    }

    if (action !== 'heads' && action !== 'tails') throw new Error(`CoinFlip received unknown action: ${action}`);

    const result: CoinSide = rng.chance(0.5) ? 'heads' : 'tails';
    const won = action === result;
    const record: CoinFlipRecord = { call: action, result, won };

    if (!won) {
      return {
        state: { ...state, history: [...state.history, record], lastResult: result, resolved: true, busted: true, payoutMultiplier: 0 },
        events: [{ type: 'outcome', payoutMultiplier: 0, meta: { result } }],
      };
    }

    const streak = state.streak + 1;
    const chainMultiplier = coinflipMultiplier(streak, houseEdge);
    const history = [...state.history, record];

    if (streak >= COINFLIP_MAX_FLIPS) {
      return {
        state: { ...state, streak, chainMultiplier, history, lastResult: result, resolved: true, cashedOut: true, payoutMultiplier: chainMultiplier },
        events: [{ type: 'outcome', payoutMultiplier: chainMultiplier, meta: { streak, maxed: true } }],
      };
    }

    return {
      state: { ...state, streak, chainMultiplier, history, lastResult: result },
      events: [],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
