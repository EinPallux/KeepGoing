/**
 * A proper 5-reel, 3-row slot machine. Nine paylines, left-to-right
 * consecutive matching (3, 4 or 5 of a kind pay), eight weighted symbols.
 * The grid is row-major: index = row * REEL_COUNT + reel, so a reel (column)
 * is the cells [reel, reel + 5, reel + 10]. Exact RTP tuning is an M4 balance
 * pass (PLAN.md section 13); the paytable below is Monte-Carlo-checked to sit
 * in a sane band, not final.
 */
import type { Rng } from '../rng';
import type { GameModule } from './types';

export const REEL_COUNT = 5;
export const ROW_COUNT = 3;
export const GRID_SIZE = REEL_COUNT * ROW_COUNT; // 15

export interface SlotSymbol {
  id: string;
  glyph: string;
  weight: number;
  /** Payout multiplier for [3, 4, 5]-of-a-kind, left-to-right, per payline. */
  pays: readonly [number, number, number];
}

export const SYMBOLS: readonly SlotSymbol[] = [
  { id: 'cherry', glyph: '🍒', weight: 30, pays: [1, 2, 5] },
  { id: 'lemon', glyph: '🍋', weight: 24, pays: [1.2, 3, 10] },
  { id: 'grape', glyph: '🍇', weight: 18, pays: [1.6, 5, 20] },
  { id: 'bell', glyph: '🔔', weight: 12, pays: [3, 10, 40] },
  { id: 'clover', glyph: '🍀', weight: 8, pays: [5, 20, 80] },
  { id: 'star', glyph: '⭐', weight: 5, pays: [10, 40, 200] },
  { id: 'diamond', glyph: '💎', weight: 2.5, pays: [20, 100, 500] },
  { id: 'seven', glyph: '7️⃣', weight: 1, pays: [50, 250, 1500] },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

/**
 * The nine paylines as five cell indices each (one per reel, left to right)
 * into the row-major 5x3 grid. Rows, V, inverted-V and four humps/zigzags.
 */
export const PAYLINES: readonly number[][] = [
  [5, 6, 7, 8, 9], // middle row
  [0, 1, 2, 3, 4], // top row
  [10, 11, 12, 13, 14], // bottom row
  [0, 6, 12, 8, 4], // V
  [10, 6, 2, 8, 14], // inverted V
  [0, 1, 7, 13, 14], // top-down zigzag
  [10, 11, 7, 3, 4], // bottom-up zigzag
  [5, 1, 2, 3, 9], // top hump
  [5, 11, 12, 13, 9], // bottom hump
];

function symbolById(id: string): SlotSymbol | undefined {
  return SYMBOLS.find((s) => s.id === id);
}

function weightedSymbol(rng: Rng): SlotSymbol {
  let roll = rng.next() * TOTAL_WEIGHT;
  for (const symbol of SYMBOLS) {
    if (roll < symbol.weight) return symbol;
    roll -= symbol.weight;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

export interface PaylineHit {
  /** The full payline (five cell indices). */
  line: number[];
  symbolId: string;
  /** How many consecutive matched from the left (3, 4 or 5). */
  count: number;
  /** The specific winning cells (first `count` cells of the line). */
  cells: number[];
  payout: number;
}

/** Left-to-right consecutive matching from reel 1. A voided symbol reports the hit but pays 0. */
export function evaluatePaylines(grid: string[], voidSymbolId: string | null = null): PaylineHit[] {
  const hits: PaylineHit[] = [];
  for (const line of PAYLINES) {
    const first = grid[line[0]];
    if (first === undefined) continue;
    let count = 1;
    for (let r = 1; r < line.length; r++) {
      if (grid[line[r]] === first) count++;
      else break;
    }
    if (count < 3) continue;
    const symbol = symbolById(first);
    if (!symbol) continue;
    const payout = first === voidSymbolId ? 0 : symbol.pays[count - 3];
    hits.push({ line, symbolId: first, count, cells: line.slice(0, count), payout });
  }
  return hits;
}

export interface SlotsState {
  bet: number;
  grid: string[];
  resolved: boolean;
  payoutMultiplier: number;
  hits: PaylineHit[];
}

export const slots: GameModule<SlotsState, undefined> = {
  id: 'slots',
  label: 'Slots',
  description: '5 reels, 3 rows, 9 paylines. Line up 3+ matching symbols left-to-right - the rarer the symbol, the bigger the win.',
  defaultConfig: undefined,

  initRound(bet) {
    return { bet, grid: [], resolved: false, payoutMultiplier: 0, hits: [] };
  },

  actions(state) {
    return state.resolved ? [] : ['spin'];
  },

  step(state, action, rng, mods) {
    if (state.resolved) return { state, events: [] };
    if (action !== 'spin') throw new Error(`Slots received unknown action: ${action}`);

    const grid = Array.from({ length: GRID_SIZE }, () => weightedSymbol(rng).id);
    const hits = evaluatePaylines(grid, mods.slotsVoidSymbolId);
    const payoutMultiplier = hits.reduce((sum, h) => sum + h.payout, 0);

    const nextState: SlotsState = { ...state, grid, resolved: true, payoutMultiplier, hits };

    return {
      state: nextState,
      events: [{ type: 'outcome', payoutMultiplier, meta: { hits: hits.length } }],
    };
  },

  isResolved(state) {
    return state.resolved;
  },
};
