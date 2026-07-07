/**
 * House Floor Twists - see PLAN.md section 3.1. Every House Floor (floors
 * 3, 6, 9, 12) forces a single table with one twist active, drawn
 * deterministically from this pool. Twists fold into the same Modifiers
 * object Charms use (see games/types.ts) - games have no idea whether a
 * Charm or a Twist produced a given modifier.
 */
import { createStream } from './rng';
import { NEUTRAL_MODIFIERS, type Modifiers } from './games/types';

export interface TwistDef {
  id: string;
  gameId: string;
  label: string;
  description: string;
}

export const TWIST_HOUSE_EDGE_BONUS = 0.06;
export const TWIST_KENO_PAYOUT_SCALE = 0.5;
export const TWIST_MINES_EXTRA_MINES = 2;

export const TWIST_DEFS: readonly TwistDef[] = [
  { id: 'rust', gameId: 'slots', label: 'Rust', description: 'The lowest-paying symbol (Cherry) pays nothing.' },
  {
    id: 'overcrowded',
    gameId: 'mines',
    label: 'Overcrowded',
    description: `${TWIST_MINES_EXTRA_MINES} extra mines are hidden on the board.`,
  },
  {
    id: 'double-zero',
    gameId: 'roulette',
    label: 'Double Zero',
    description: 'A second losing pocket appears on the wheel.',
  },
  { id: 'house-rules', gameId: 'blackjack', label: 'House Rules', description: 'The dealer wins all pushes.' },
  { id: 'loaded-house', gameId: 'dice', label: 'Loaded House', description: 'The house edge is much steeper this floor.' },
  { id: 'cold-deck', gameId: 'hilo', label: 'Cold Deck', description: 'The house edge is much steeper this floor.' },
  {
    id: 'loose-boards',
    gameId: 'tower',
    label: 'Loose Boards',
    description: 'The house edge is much steeper this floor.',
  },
  { id: 'tight-draw', gameId: 'keno', label: 'Tight Draw', description: 'Payouts are cut in half.' },
];

export function getTwistDef(id: string): TwistDef {
  const def = TWIST_DEFS.find((t) => t.id === id);
  if (!def) throw new Error(`Unknown twist id: ${id}`);
  return def;
}

/** Deterministic per run seed + floor, so reloading mid-floor shows the same twist. */
export function pickTwistForFloor(seed: string, floor: number): TwistDef {
  const rng = createStream(seed, `twist-floor-${floor}`);
  return rng.pick(TWIST_DEFS);
}

export function applyTwistToModifiers(mods: Modifiers, twist: TwistDef): Modifiers {
  switch (twist.id) {
    case 'rust':
      return { ...mods, slotsVoidSymbolId: 'cherry' };
    case 'overcrowded':
      return { ...mods, minesExtraMines: mods.minesExtraMines + TWIST_MINES_EXTRA_MINES };
    case 'double-zero':
      return { ...mods, rouletteDoubleZero: true };
    case 'house-rules':
      return { ...mods, blackjackDealerWinsPush: true };
    case 'loaded-house':
    case 'cold-deck':
    case 'loose-boards':
      return { ...mods, houseEdgeBonus: mods.houseEdgeBonus + TWIST_HOUSE_EDGE_BONUS };
    case 'tight-draw':
      return { ...mods, kenoPayoutScale: mods.kenoPayoutScale * TWIST_KENO_PAYOUT_SCALE };
    default:
      return mods;
  }
}

/** Convenience: modifiers for a twist alone, starting from neutral. Handy for tests and previews. */
export function modifiersForTwist(twist: TwistDef): Modifiers {
  return applyTwistToModifiers(NEUTRAL_MODIFIERS, twist);
}
