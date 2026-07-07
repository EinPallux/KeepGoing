/**
 * European single-zero wheel: straight, color, parity, and dozen bets.
 * See PLAN.md table #6.
 */
import type { GameModule } from './types';

export const ROULETTE_HOUSE_NUMBERS = 37; // 0-36
export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type RouletteBetType = 'straight' | 'color' | 'parity' | 'dozen';
export type RouletteColor = 'red' | 'black';
export type RouletteParity = 'odd' | 'even';

export interface RouletteConfig {
  betType: RouletteBetType;
  /** straight: 0-36. color: 'red'|'black'. parity: 'odd'|'even'. dozen: 1|2|3. */
  value: number | RouletteColor | RouletteParity;
}

export const DEFAULT_ROULETTE_CONFIG: RouletteConfig = { betType: 'color', value: 'red' };

export interface RouletteState {
  bet: number;
  betType: RouletteBetType;
  value: number | RouletteColor | RouletteParity;
  result: number | null;
  resolved: boolean;
  payoutMultiplier: number;
}

export function numberColor(n: number): RouletteColor | 'green' {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

function payoutFor(config: RouletteConfig, result: number): number {
  switch (config.betType) {
    case 'straight':
      return result === config.value ? 36 : 0;
    case 'color':
      return numberColor(result) === config.value ? 2 : 0;
    case 'parity':
      if (result === 0) return 0;
      return (result % 2 === 0 ? 'even' : 'odd') === config.value ? 2 : 0;
    case 'dozen': {
      if (result === 0) return 0;
      const dozen = Math.ceil(result / 12);
      return dozen === config.value ? 3 : 0;
    }
    default:
      return 0;
  }
}

export const roulette: GameModule<RouletteState, RouletteConfig> = {
  id: 'roulette',
  label: 'Roulette',
  description: 'European wheel. Bet straight up, red/black, odd/even, or a dozen.',
  defaultConfig: DEFAULT_ROULETTE_CONFIG,

  initRound(bet, config) {
    return {
      bet,
      betType: config.betType,
      value: config.value,
      result: null,
      resolved: false,
      payoutMultiplier: 0,
    };
  },

  actions(state) {
    return state.resolved ? [] : ['spin'];
  },

  step(state, action, rng) {
    if (state.resolved) return { state, events: [] };
    if (action !== 'spin') throw new Error(`Roulette received unknown action: ${action}`);

    const result = rng.int(0, ROULETTE_HOUSE_NUMBERS - 1);
    const payoutMultiplier = payoutFor({ betType: state.betType, value: state.value }, result);

    const nextState: RouletteState = { ...state, result, resolved: true, payoutMultiplier };

    return {
      state: nextState,
      events: [{ type: 'outcome', payoutMultiplier, meta: { result, color: numberColor(result) } }],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
