/**
 * A scratch-off card: a 3x3 grid of hidden symbols. Reveal them all; any symbol
 * that turns up 3+ times pays its prize (4 and 5+ pay more). Multiple matches
 * stack. Pure chance - the whole card is decided on the first (and only) action;
 * the UI just animates scratching each cell. RTP tuning is an M4 pass.
 */
import type { Rng } from '../rng';
import type { GameModule } from './types';

export const SCRATCH_CELLS = 9;
export const SCRATCH_MATCH_MIN = 3;

export interface ScratchSymbol {
  id: string;
  glyph: string;
  weight: number;
  /** Prize (bet multiplier) for exactly 3, exactly 4, and 5+ occurrences. */
  prizes: readonly [number, number, number];
}

// The two "blank" symbols carry most of the weight - like a real scratch card,
// most cells are duds, so matching 3 of a *paying* symbol is the exciting part.
export const SCRATCH_SYMBOLS: readonly ScratchSymbol[] = [
  { id: 'blankA', glyph: '🍋', weight: 24, prizes: [0, 0, 0] },
  { id: 'blankB', glyph: '🍒', weight: 24, prizes: [0, 0, 0] },
  { id: 'coin', glyph: '🪙', weight: 13, prizes: [1.2, 4, 12] },
  { id: 'gem', glyph: '💎', weight: 9, prizes: [2.5, 8, 25] },
  { id: 'bell', glyph: '🔔', weight: 6, prizes: [5, 16, 50] },
  { id: 'star', glyph: '⭐', weight: 4, prizes: [10, 36, 120] },
  { id: 'clover', glyph: '🍀', weight: 2.5, prizes: [25, 80, 280] },
  { id: 'crown', glyph: '👑', weight: 1, prizes: [60, 200, 800] },
];

const TOTAL_WEIGHT = SCRATCH_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

function symbolById(id: string): ScratchSymbol | undefined {
  return SCRATCH_SYMBOLS.find((s) => s.id === id);
}

function weightedSymbol(rng: Rng): ScratchSymbol {
  let roll = rng.next() * TOTAL_WEIGHT;
  for (const symbol of SCRATCH_SYMBOLS) {
    if (roll < symbol.weight) return symbol;
    roll -= symbol.weight;
  }
  return SCRATCH_SYMBOLS[SCRATCH_SYMBOLS.length - 1];
}

export interface ScratchWin {
  symbolId: string;
  count: number;
  prize: number;
}

/** Every symbol appearing 3+ times, with its prize. */
export function evaluateScratch(cells: string[]): ScratchWin[] {
  const counts = new Map<string, number>();
  for (const id of cells) counts.set(id, (counts.get(id) ?? 0) + 1);
  const wins: ScratchWin[] = [];
  for (const [symbolId, count] of counts) {
    if (count < SCRATCH_MATCH_MIN) continue;
    const symbol = symbolById(symbolId);
    if (!symbol) continue;
    const prize = symbol.prizes[Math.min(count, 5) - 3];
    wins.push({ symbolId, count, prize });
  }
  return wins;
}

export interface ScratchState {
  bet: number;
  cells: string[];
  wins: ScratchWin[];
  resolved: boolean;
  payoutMultiplier: number;
}

export const scratch: GameModule<ScratchState, undefined> = {
  id: 'scratch',
  label: 'Scratch Card',
  description: `Scratch a ${SCRATCH_CELLS}-cell card. Match 3 or more of a prize symbol (fruit are duds) to win - the rarer the symbol, the richer the payout.`,
  defaultConfig: undefined,

  initRound(bet) {
    return { bet, cells: [], wins: [], resolved: false, payoutMultiplier: 0 };
  },

  actions(state) {
    return state.resolved ? [] : ['scratch'];
  },

  step(state, action, rng) {
    if (state.resolved) return { state, events: [] };
    if (action !== 'scratch') throw new Error(`Scratch received unknown action: ${action}`);

    const cells = Array.from({ length: SCRATCH_CELLS }, () => weightedSymbol(rng).id);
    const wins = evaluateScratch(cells);
    const payoutMultiplier = wins.reduce((sum, w) => sum + w.prize, 0);

    return {
      state: { ...state, cells, wins, resolved: true, payoutMultiplier },
      events: [{ type: 'outcome', payoutMultiplier, meta: { wins: wins.length } }],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
