/**
 * Climb 8 rows of 3 doors, 1 trap per row. Cash out anytime, or pick the
 * trap and lose the bet. See PLAN.md table #11.
 */
import type { GameModule } from './types';

export const TOWER_ROWS = 8;
export const TOWER_DOORS = 3;
export const TOWER_HOUSE_EDGE = 0.03;

/** Fair multiplier (minus house edge) after climbing `rowsCleared` rows. */
export function towerMultiplier(rowsCleared: number): number {
  return (TOWER_DOORS / (TOWER_DOORS - 1)) ** rowsCleared * (1 - TOWER_HOUSE_EDGE);
}

export interface TowerState {
  bet: number;
  /** Precomputed trap door index (0..TOWER_DOORS-1) for every row. */
  trapDoors: number[];
  row: number;
  resolved: boolean;
  busted: boolean;
  cashedOut: boolean;
  payoutMultiplier: number;
}

export const tower: GameModule<TowerState, undefined> = {
  id: 'tower',
  label: 'Tower',
  description: `Climb ${TOWER_ROWS} floors, ${TOWER_DOORS} doors each, 1 trap per floor. Cash out anytime.`,
  defaultConfig: undefined,

  initRound(bet, _config, rng) {
    const trapDoors = Array.from({ length: TOWER_ROWS }, () => rng.int(0, TOWER_DOORS - 1));
    return { bet, trapDoors, row: 0, resolved: false, busted: false, cashedOut: false, payoutMultiplier: 0 };
  },

  actions(state) {
    if (state.resolved) return [];
    const doors = Array.from({ length: TOWER_DOORS }, (_, i) => `door:${i}`);
    return state.row > 0 ? [...doors, 'cashout'] : doors;
  },

  step(state, action) {
    if (state.resolved) return { state, events: [] };

    if (action === 'cashout') {
      if (state.row === 0) throw new Error('Tower: cannot cash out before climbing a floor');
      const payoutMultiplier = towerMultiplier(state.row);
      return {
        state: { ...state, resolved: true, cashedOut: true, payoutMultiplier },
        events: [{ type: 'outcome', payoutMultiplier, meta: { rowsCleared: state.row } }],
      };
    }

    const match = /^door:(\d+)$/.exec(action);
    if (!match) throw new Error(`Tower received unknown action: ${action}`);
    const doorIdx = Number(match[1]);
    if (doorIdx < 0 || doorIdx >= TOWER_DOORS) throw new Error(`Tower: door ${doorIdx} out of range`);

    if (state.trapDoors[state.row] === doorIdx) {
      return {
        state: { ...state, resolved: true, busted: true, payoutMultiplier: 0 },
        events: [{ type: 'outcome', payoutMultiplier: 0, meta: { row: state.row, door: doorIdx } }],
      };
    }

    const row = state.row + 1;
    if (row === TOWER_ROWS) {
      const payoutMultiplier = towerMultiplier(row);
      return {
        state: { ...state, row, resolved: true, cashedOut: true, payoutMultiplier },
        events: [{ type: 'outcome', payoutMultiplier, meta: { rowsCleared: row, cleared: true } }],
      };
    }

    return { state: { ...state, row }, events: [] };
  },

  isResolved(state) {
    return state.resolved;
  },
};
