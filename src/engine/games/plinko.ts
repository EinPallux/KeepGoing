/**
 * A ball drops through 12 rows of pegs into one of 13 multiplier buckets.
 * Risk presets change the payout curve. See PLAN.md table #2.
 *
 * Simplification: the engine only determines the fair outcome - a 12-step
 * left/right random walk (Pascal's-triangle odds), same as a real peg board
 * produces. The `path` is exposed so the UI can animate a ball bouncing
 * through the board (a lightweight CSS/framer-motion tween is enough; no
 * physics engine is needed since the bucket is already decided).
 */
import type { GameModule } from './types';

export const PLINKO_ROWS = 12;
export const PLINKO_BUCKETS = PLINKO_ROWS + 1;

export type PlinkoRisk = 'low' | 'medium' | 'high';

export const PLINKO_MULTIPLIERS: Record<PlinkoRisk, readonly number[]> = {
  low: [5, 3, 2, 1.3, 1.0, 0.9, 0.8, 0.9, 1.0, 1.3, 2, 3, 5],
  medium: [10, 5, 3, 1.5, 1.0, 0.7, 0.5, 0.7, 1.0, 1.5, 3, 5, 10],
  high: [26, 9, 4, 2.5, 1.0, 0.5, 0.3, 0.5, 1.0, 2.5, 4, 9, 26],
};

export interface PlinkoConfig {
  risk: PlinkoRisk;
}

export const DEFAULT_PLINKO_CONFIG: PlinkoConfig = { risk: 'medium' };

export interface PlinkoState {
  bet: number;
  risk: PlinkoRisk;
  /** true = bounced right at that row; drives the ball's drop animation. */
  path: boolean[] | null;
  bucket: number | null;
  resolved: boolean;
  payoutMultiplier: number;
}

export const plinko: GameModule<PlinkoState, PlinkoConfig> = {
  id: 'plinko',
  label: 'Plinko',
  description: `A ball drops through ${PLINKO_ROWS} rows of pegs into one of ${PLINKO_BUCKETS} buckets. Pick a risk level.`,
  defaultConfig: DEFAULT_PLINKO_CONFIG,

  initRound(bet, config) {
    return { bet, risk: config.risk, path: null, bucket: null, resolved: false, payoutMultiplier: 0 };
  },

  actions(state) {
    return state.resolved ? [] : ['drop'];
  },

  step(state, action, rng) {
    if (state.resolved) return { state, events: [] };
    if (action !== 'drop') throw new Error(`Plinko received unknown action: ${action}`);

    const path = Array.from({ length: PLINKO_ROWS }, () => rng.chance(0.5));
    const bucket = path.filter(Boolean).length;
    const payoutMultiplier = PLINKO_MULTIPLIERS[state.risk][bucket];

    const nextState: PlinkoState = { ...state, path, bucket, resolved: true, payoutMultiplier };

    return {
      state: nextState,
      events: [{ type: 'outcome', payoutMultiplier, meta: { bucket } }],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
