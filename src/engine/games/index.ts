import { coinFlip } from './coinflip';
import type { GameModule } from './types';

/** Every unlocked table, keyed by id. Real games (Slots, Plinko, ...) join this in M1/M2. */
export const GAME_MODULES: Record<string, GameModule<unknown>> = {
  [coinFlip.id]: coinFlip as GameModule<unknown>,
};

export const ALL_TABLE_IDS = Object.keys(GAME_MODULES);

export function getGameModule(id: string): GameModule<unknown> {
  const mod = GAME_MODULES[id];
  if (!mod) throw new Error(`Unknown table id: ${id}`);
  return mod;
}

export * from './types';
export { coinFlip };
