/**
 * A multiplier climbs from 1.00x; you set an auto-cashout target before the
 * round and win if the crash point reaches it. See PLAN.md table #3.
 *
 * Simplification: rather than a live, real-time climb the player reacts to,
 * the target is committed up front (like a limit order) and resolved in one
 * step - this keeps the engine a pure, testable function like every other
 * table. The math still rewards nerve: P(win) = (1 - houseEdge) / target, so
 * RTP is identical at every target and the choice is pure risk appetite.
 * The UI is free to animate a cosmetic climb up to the revealed crash point.
 */
import type { GameModule } from './types';
import type { Rng } from '../rng';

export const CRASH_HOUSE_EDGE = 0.03;
export const CRASH_MIN_TARGET = 1.01;
export const CRASH_MAX_TARGET = 100;

export interface CrashConfig {
  targetMultiplier: number;
}

export const DEFAULT_CRASH_CONFIG: CrashConfig = { targetMultiplier: 2 };

export interface CrashState {
  bet: number;
  targetMultiplier: number;
  crashPoint: number | null;
  resolved: boolean;
  won: boolean | null;
  payoutMultiplier: number;
}

function clampTarget(target: number): number {
  return Math.min(CRASH_MAX_TARGET, Math.max(CRASH_MIN_TARGET, target));
}

export function sampleCrashPoint(rng: Rng): number {
  const r = rng.next();
  const raw = (1 - CRASH_HOUSE_EDGE) / (1 - r);
  return Math.max(1, Math.floor(raw * 100) / 100);
}

export const crash: GameModule<CrashState, CrashConfig> = {
  id: 'crash',
  label: 'Crash',
  description: 'Set an auto-cashout target. The rocket climbs from 1.00x - if it reaches your target before crashing, you win.',
  defaultConfig: DEFAULT_CRASH_CONFIG,

  initRound(bet, config) {
    return {
      bet,
      targetMultiplier: clampTarget(config.targetMultiplier),
      crashPoint: null,
      resolved: false,
      won: null,
      payoutMultiplier: 0,
    };
  },

  actions(state) {
    return state.resolved ? [] : ['launch'];
  },

  step(state, action, rng) {
    if (state.resolved) return { state, events: [] };
    if (action !== 'launch') throw new Error(`Crash received unknown action: ${action}`);

    const crashPoint = sampleCrashPoint(rng);
    const won = crashPoint >= state.targetMultiplier;
    const payoutMultiplier = won ? state.targetMultiplier : 0;

    const nextState: CrashState = { ...state, crashPoint, resolved: true, won, payoutMultiplier };

    return {
      state: nextState,
      events: [{ type: 'outcome', payoutMultiplier, meta: { crashPoint, target: state.targetMultiplier } }],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
