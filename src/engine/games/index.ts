import { dice } from './dice';
import { mines } from './mines';
import { hilo } from './hilo';
import { slots } from './slots';
import type { GameModule } from './types';

/** Every unlocked table, keyed by id. Grows to 12 entries through M2. */
export const GAME_MODULES: Record<string, GameModule<unknown, unknown>> = {
  [dice.id]: dice as GameModule<unknown, unknown>,
  [mines.id]: mines as GameModule<unknown, unknown>,
  [hilo.id]: hilo as GameModule<unknown, unknown>,
  [slots.id]: slots as GameModule<unknown, unknown>,
};

export const ALL_TABLE_IDS = Object.keys(GAME_MODULES);

export function getGameModule(id: string): GameModule<unknown, unknown> {
  const mod = GAME_MODULES[id];
  if (!mod) throw new Error(`Unknown table id: ${id}`);
  return mod;
}

export * from './types';
export { dice, mines, hilo, slots };
