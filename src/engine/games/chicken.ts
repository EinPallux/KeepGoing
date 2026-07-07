/**
 * Cross lanes of traffic; each lane crossed compounds a fair multiplier.
 * Cash out anytime, or get hit and lose the bet. Unlike Tower's door pick,
 * each lane is a single cross-or-stop decision. See PLAN.md table #4.
 */
import type { GameModule } from './types';

export const CHICKEN_LANES = 10;
export const CHICKEN_HOUSE_EDGE = 0.03;

export type ChickenDifficulty = 'easy' | 'medium' | 'hard';

/** Chance of safely crossing a single lane at each difficulty. */
export const CHICKEN_SURVIVAL_CHANCE: Record<ChickenDifficulty, number> = {
  easy: 0.9,
  medium: 0.8,
  hard: 0.65,
};

export interface ChickenConfig {
  difficulty: ChickenDifficulty;
}

export const DEFAULT_CHICKEN_CONFIG: ChickenConfig = { difficulty: 'medium' };

export interface ChickenState {
  bet: number;
  difficulty: ChickenDifficulty;
  lane: number;
  resolved: boolean;
  busted: boolean;
  cashedOut: boolean;
  payoutMultiplier: number;
}

/** Fair multiplier (minus house edge) after crossing `lanesCrossed` lanes. */
export function chickenMultiplier(difficulty: ChickenDifficulty, lanesCrossed: number): number {
  const survival = CHICKEN_SURVIVAL_CHANCE[difficulty];
  return (1 / survival) ** lanesCrossed * (1 - CHICKEN_HOUSE_EDGE);
}

export const chicken: GameModule<ChickenState, ChickenConfig> = {
  id: 'chicken',
  label: 'Chicken',
  description: `Cross ${CHICKEN_LANES} lanes of traffic. Cash out anytime - get hit and lose the bet.`,
  defaultConfig: DEFAULT_CHICKEN_CONFIG,

  initRound(bet, config) {
    return {
      bet,
      difficulty: config.difficulty,
      lane: 0,
      resolved: false,
      busted: false,
      cashedOut: false,
      payoutMultiplier: 0,
    };
  },

  actions(state) {
    if (state.resolved) return [];
    return state.lane > 0 ? ['cross', 'cashout'] : ['cross'];
  },

  step(state, action, rng) {
    if (state.resolved) return { state, events: [] };

    if (action === 'cashout') {
      if (state.lane === 0) throw new Error('Chicken: cannot cash out before crossing a lane');
      const payoutMultiplier = chickenMultiplier(state.difficulty, state.lane);
      return {
        state: { ...state, resolved: true, cashedOut: true, payoutMultiplier },
        events: [{ type: 'outcome', payoutMultiplier, meta: { lanesCrossed: state.lane } }],
      };
    }

    if (action !== 'cross') throw new Error(`Chicken received unknown action: ${action}`);

    const survived = rng.chance(CHICKEN_SURVIVAL_CHANCE[state.difficulty]);
    if (!survived) {
      return {
        state: { ...state, resolved: true, busted: true, payoutMultiplier: 0 },
        events: [{ type: 'outcome', payoutMultiplier: 0, meta: { lane: state.lane } }],
      };
    }

    const lane = state.lane + 1;
    if (lane === CHICKEN_LANES) {
      const payoutMultiplier = chickenMultiplier(state.difficulty, lane);
      return {
        state: { ...state, lane, resolved: true, cashedOut: true, payoutMultiplier },
        events: [{ type: 'outcome', payoutMultiplier, meta: { lanesCrossed: lane, cleared: true } }],
      };
    }

    return { state: { ...state, lane }, events: [] };
  },

  isResolved(state) {
    return state.resolved;
  },
};
