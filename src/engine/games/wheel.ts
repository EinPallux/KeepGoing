/**
 * One spin, 24 equal segments. Risk presets change the multiplier mix.
 * See PLAN.md table #12. Exact RTP tuning is an M4 balance pass.
 */
import type { GameModule } from './types';

export const WHEEL_SEGMENT_COUNT = 24;

export type WheelRisk = 'low' | 'medium' | 'high';

export const WHEEL_SEGMENTS: Record<WheelRisk, readonly number[]> = {
  low: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 5],
  medium: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 5, 10],
  high: [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 8, 12,
  ],
};

export interface WheelConfig {
  risk: WheelRisk;
}

export const DEFAULT_WHEEL_CONFIG: WheelConfig = { risk: 'medium' };

export interface WheelState {
  bet: number;
  risk: WheelRisk;
  segmentIndex: number | null;
  resolved: boolean;
  payoutMultiplier: number;
}

export const wheel: GameModule<WheelState, WheelConfig> = {
  id: 'wheel',
  label: 'Wheel',
  description: 'One spin, 24 segments. Pick a risk level - low is steady, high is mostly nothing and rare big hits.',
  defaultConfig: DEFAULT_WHEEL_CONFIG,

  initRound(bet, config) {
    return { bet, risk: config.risk, segmentIndex: null, resolved: false, payoutMultiplier: 0 };
  },

  actions(state) {
    return state.resolved ? [] : ['spin'];
  },

  step(state, action, rng) {
    if (state.resolved) return { state, events: [] };
    if (action !== 'spin') throw new Error(`Wheel received unknown action: ${action}`);

    const segmentIndex = rng.int(0, WHEEL_SEGMENT_COUNT - 1);
    const payoutMultiplier = WHEEL_SEGMENTS[state.risk][segmentIndex];

    const nextState: WheelState = { ...state, segmentIndex, resolved: true, payoutMultiplier };

    return {
      state: nextState,
      events: [{ type: 'outcome', payoutMultiplier, meta: { segmentIndex } }],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
