/**
 * 5x5 grid, N hidden mines. Reveal gems to grow a fair multiplier; cash out
 * anytime, or hit a mine and lose the bet. See PLAN.md table #9.
 */
import type { GameModule } from './types';

export const MINES_GRID_SIZE = 25;
export const MINES_HOUSE_EDGE = 0.02;
export const MINE_COUNT_OPTIONS = [3, 5, 10] as const;

export interface MinesConfig {
  mineCount: number;
}

export const DEFAULT_MINES_CONFIG: MinesConfig = { mineCount: 5 };

export interface MinesState {
  bet: number;
  mineCount: number;
  minePositions: number[];
  revealed: number[];
  resolved: boolean;
  busted: boolean;
  cashedOut: boolean;
  payoutMultiplier: number;
}

function clampMineCount(mineCount: number): number {
  return Math.min(MINES_GRID_SIZE - 1, Math.max(1, Math.round(mineCount)));
}

/** Fair multiplier (minus house edge) after `safeReveals` consecutive safe tiles. */
export function minesMultiplier(mineCount: number, safeReveals: number): number {
  let mult = 1;
  for (let i = 0; i < safeReveals; i++) {
    const tilesRemaining = MINES_GRID_SIZE - i;
    const safeRemaining = tilesRemaining - mineCount;
    mult *= tilesRemaining / safeRemaining;
  }
  return mult * (1 - MINES_HOUSE_EDGE);
}

export const mines: GameModule<MinesState, MinesConfig> = {
  id: 'mines',
  label: 'Mines',
  description: 'Reveal gems on a 5x5 grid. Every safe tile grows your multiplier - cash out before you hit a mine.',
  defaultConfig: DEFAULT_MINES_CONFIG,

  initRound(bet, config, rng, mods) {
    const mineCount = clampMineCount(config.mineCount + mods.minesExtraMines);
    const minePositions = rng.shuffle(Array.from({ length: MINES_GRID_SIZE }, (_, i) => i)).slice(0, mineCount);
    return {
      bet,
      mineCount,
      minePositions,
      revealed: [],
      resolved: false,
      busted: false,
      cashedOut: false,
      payoutMultiplier: 0,
    };
  },

  actions(state) {
    if (state.resolved) return [];
    const unrevealed = Array.from({ length: MINES_GRID_SIZE }, (_, i) => i).filter(
      (i) => !state.revealed.includes(i),
    );
    const reveals = unrevealed.map((i) => `reveal:${i}`);
    return state.revealed.length > 0 ? [...reveals, 'cashout'] : reveals;
  },

  step(state, action, rng, mods) {
    if (state.resolved) return { state, events: [] };

    if (action === 'cashout') {
      if (state.revealed.length === 0) throw new Error('Mines: cannot cash out before revealing a tile');
      const payoutMultiplier = minesMultiplier(state.mineCount, state.revealed.length);
      const nextState: MinesState = { ...state, resolved: true, cashedOut: true, payoutMultiplier };
      return {
        state: nextState,
        events: [{ type: 'outcome', payoutMultiplier, meta: { safeReveals: state.revealed.length } }],
      };
    }

    const match = /^reveal:(\d+)$/.exec(action);
    if (!match) throw new Error(`Mines received unknown action: ${action}`);
    const idx = Number(match[1]);
    if (idx < 0 || idx >= MINES_GRID_SIZE) throw new Error(`Mines: tile ${idx} out of range`);
    if (state.revealed.includes(idx)) throw new Error(`Mines: tile ${idx} already revealed`);

    let minePositions = state.minePositions;
    const isFirstReveal = state.revealed.length === 0;
    if (isFirstReveal && mods.minesGuaranteedFirstSafe && minePositions.includes(idx)) {
      const safeSpots = Array.from({ length: MINES_GRID_SIZE }, (_, i) => i).filter(
        (i) => i !== idx && !minePositions.includes(i),
      );
      const relocateTo = rng.pick(safeSpots);
      minePositions = minePositions.map((p) => (p === idx ? relocateTo : p));
    }

    if (minePositions.includes(idx)) {
      const nextState: MinesState = {
        ...state,
        minePositions,
        revealed: [...state.revealed, idx],
        resolved: true,
        busted: true,
        payoutMultiplier: 0,
      };
      return { state: nextState, events: [{ type: 'outcome', payoutMultiplier: 0, meta: { hitMine: idx } }] };
    }

    const revealed = [...state.revealed, idx];
    const safeTileCount = MINES_GRID_SIZE - state.mineCount;

    if (revealed.length === safeTileCount) {
      const payoutMultiplier = minesMultiplier(state.mineCount, revealed.length);
      const nextState: MinesState = {
        ...state,
        minePositions,
        revealed,
        resolved: true,
        cashedOut: true,
        payoutMultiplier,
      };
      return {
        state: nextState,
        events: [{ type: 'outcome', payoutMultiplier, meta: { safeReveals: revealed.length, cleared: true } }],
      };
    }

    return { state: { ...state, minePositions, revealed }, events: [] };
  },

  isResolved(state) {
    return state.resolved;
  },
};
