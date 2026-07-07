/**
 * Pick 5 of 40 numbers; 10 are drawn. Payout scales with hits. See PLAN.md table #8.
 */
import type { GameModule } from './types';

export const KENO_POOL_SIZE = 40;
export const KENO_PICK_COUNT = 5;
export const KENO_DRAW_COUNT = 10;

/** Payout multiplier by hit count (0-5). Tuned for a sane RTP; exact tuning is an M4 balance pass. */
export const KENO_PAYTABLE: readonly number[] = [0, 0, 1, 3, 15, 800];

export interface KenoConfig {
  picks: number[];
}

export const DEFAULT_KENO_CONFIG: KenoConfig = { picks: [1, 2, 3, 4, 5] };

export interface KenoState {
  bet: number;
  picks: number[];
  drawn: number[] | null;
  hits: number;
  resolved: boolean;
  payoutMultiplier: number;
}

function sanitizePicks(picks: number[]): number[] {
  const unique = Array.from(new Set(picks)).filter((n) => n >= 1 && n <= KENO_POOL_SIZE);
  return unique.slice(0, KENO_PICK_COUNT);
}

export const keno: GameModule<KenoState, KenoConfig> = {
  id: 'keno',
  label: 'Keno',
  description: `Pick ${KENO_PICK_COUNT} of ${KENO_POOL_SIZE} numbers. ${KENO_DRAW_COUNT} are drawn - match more for a bigger payout.`,
  defaultConfig: DEFAULT_KENO_CONFIG,

  initRound(bet, config) {
    return {
      bet,
      picks: sanitizePicks(config.picks),
      drawn: null,
      hits: 0,
      resolved: false,
      payoutMultiplier: 0,
    };
  },

  actions(state) {
    return state.resolved ? [] : ['draw'];
  },

  step(state, action, rng, mods) {
    if (state.resolved) return { state, events: [] };
    if (action !== 'draw') throw new Error(`Keno received unknown action: ${action}`);

    const pool = Array.from({ length: KENO_POOL_SIZE }, (_, i) => i + 1);
    const drawn = rng.shuffle(pool).slice(0, KENO_DRAW_COUNT);
    const hits = state.picks.filter((p) => drawn.includes(p)).length;
    const payoutMultiplier = (KENO_PAYTABLE[hits] ?? 0) * mods.kenoPayoutScale;

    const nextState: KenoState = { ...state, drawn, hits, resolved: true, payoutMultiplier };

    return {
      state: nextState,
      events: [{ type: 'outcome', payoutMultiplier, meta: { hits, drawn } }],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
