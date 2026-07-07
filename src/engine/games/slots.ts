/**
 * 3x3 grid, 5 paylines, 8 weighted symbols. Only 3-of-a-kind pays; multiple
 * hit lines stack. See PLAN.md table #1. Exact RTP tuning happens in the
 * M4 balance pass (PLAN.md section 13) - these numbers are a reasonable
 * starting point, not a final figure.
 */
import type { Rng } from '../rng';
import type { GameModule } from './types';

export const GRID_SIZE = 9;

export interface SlotSymbol {
  id: string;
  glyph: string;
  weight: number;
  /** Payout multiplier for 3-of-a-kind on one payline. */
  payout: number;
}

export const SYMBOLS: readonly SlotSymbol[] = [
  { id: 'cherry', glyph: '🍒', weight: 30, payout: 3 },
  { id: 'lemon', glyph: '🍋', weight: 24, payout: 4 },
  { id: 'grape', glyph: '🍇', weight: 18, payout: 6 },
  { id: 'bell', glyph: '🔔', weight: 12, payout: 10 },
  { id: 'clover', glyph: '🍀', weight: 8, payout: 15 },
  { id: 'star', glyph: '⭐', weight: 5, payout: 27 },
  { id: 'diamond', glyph: '💎', weight: 2.5, payout: 65 },
  { id: 'seven', glyph: '7️⃣', weight: 1, payout: 150 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

/** Payline definitions as index triples into the flat, row-major 3x3 grid. */
export const PAYLINES: readonly number[][] = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 4, 8], // diagonal top-left to bottom-right
  [2, 4, 6], // diagonal top-right to bottom-left
];

function weightedSymbol(rng: Rng): SlotSymbol {
  let roll = rng.next() * TOTAL_WEIGHT;
  for (const symbol of SYMBOLS) {
    if (roll < symbol.weight) return symbol;
    roll -= symbol.weight;
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

export interface PaylineHit {
  line: number[];
  symbolId: string;
  payout: number;
}

export function evaluatePaylines(grid: string[]): PaylineHit[] {
  const hits: PaylineHit[] = [];
  for (const line of PAYLINES) {
    const [a, b, c] = line;
    if (grid[a] === grid[b] && grid[b] === grid[c]) {
      const symbol = SYMBOLS.find((s) => s.id === grid[a]);
      if (symbol) hits.push({ line, symbolId: symbol.id, payout: symbol.payout });
    }
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
  description: '3x3 reels, 5 paylines, 8 symbols. Match 3 in a row - stack multiple lines for bigger wins.',
  defaultConfig: undefined,

  initRound(bet) {
    return { bet, grid: [], resolved: false, payoutMultiplier: 0, hits: [] };
  },

  actions(state) {
    return state.resolved ? [] : ['spin'];
  },

  step(state, action, rng) {
    if (state.resolved) return { state, events: [] };
    if (action !== 'spin') throw new Error(`Slots received unknown action: ${action}`);

    const grid = Array.from({ length: GRID_SIZE }, () => weightedSymbol(rng).id);
    const hits = evaluatePaylines(grid);
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
