/**
 * Roll 0-99 and call it: under a threshold, or over it. The tighter the
 * range you call, the bigger the payout. See PLAN.md table #5.
 */
import type { GameModule } from './types';

export const DICE_HOUSE_EDGE = 0.02;
export const DICE_MIN_THRESHOLD = 2;
export const DICE_MAX_THRESHOLD = 98;

export type DiceDirection = 'under' | 'over';

export interface DiceConfig {
  direction: DiceDirection;
  /** Roll under this value (exclusive) to win, or over it, depending on direction. */
  threshold: number;
}

export const DEFAULT_DICE_CONFIG: DiceConfig = { direction: 'under', threshold: 50 };

export interface DiceState {
  bet: number;
  direction: DiceDirection;
  threshold: number;
  roll: number | null;
  resolved: boolean;
  won: boolean | null;
  payoutMultiplier: number;
}

function clampThreshold(threshold: number): number {
  return Math.min(DICE_MAX_THRESHOLD, Math.max(DICE_MIN_THRESHOLD, Math.round(threshold)));
}

/** Chance of winning, as a fraction, for a given direction/threshold. */
export function diceWinChance(direction: DiceDirection, threshold: number): number {
  return direction === 'under' ? threshold / 100 : (100 - threshold) / 100;
}

/** Fair-ish payout multiplier (house edge baked in) for a winning call. */
export function dicePayoutMultiplier(
  direction: DiceDirection,
  threshold: number,
  houseEdge: number = DICE_HOUSE_EDGE,
): number {
  return (1 - houseEdge) / diceWinChance(direction, threshold);
}

export const dice: GameModule<DiceState, DiceConfig> = {
  id: 'dice',
  label: 'Dice',
  description: 'Call a roll under or over your line. The tighter the call, the bigger the payout.',
  defaultConfig: DEFAULT_DICE_CONFIG,

  initRound(bet, config) {
    return {
      bet,
      direction: config.direction,
      threshold: clampThreshold(config.threshold),
      roll: null,
      resolved: false,
      won: null,
      payoutMultiplier: 0,
    };
  },

  actions(state) {
    return state.resolved ? [] : ['roll'];
  },

  step(state, action, rng, mods) {
    if (state.resolved) return { state, events: [] };
    if (action !== 'roll') throw new Error(`Dice received unknown action: ${action}`);

    let roll = rng.int(0, 99);
    if (mods.diceOddsNudge > 0) {
      roll =
        state.direction === 'under'
          ? Math.max(0, roll - mods.diceOddsNudge)
          : Math.min(99, roll + mods.diceOddsNudge);
    }

    const won = state.direction === 'under' ? roll < state.threshold : roll > state.threshold;
    const houseEdge = DICE_HOUSE_EDGE + mods.houseEdgeBonus;
    const payoutMultiplier = won ? dicePayoutMultiplier(state.direction, state.threshold, houseEdge) : 0;

    const nextState: DiceState = { ...state, roll, resolved: true, won, payoutMultiplier };

    return {
      state: nextState,
      events: [
        {
          type: 'outcome',
          payoutMultiplier,
          meta: { roll, direction: state.direction, threshold: state.threshold },
        },
      ],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
