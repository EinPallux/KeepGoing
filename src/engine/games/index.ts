import { dice } from './dice';
import { mines } from './mines';
import { hilo } from './hilo';
import { slots } from './slots';
import { roulette } from './roulette';
import { blackjack } from './blackjack';
import { keno } from './keno';
import { tower } from './tower';
import { chicken } from './chicken';
import { wheel } from './wheel';
import { crash } from './crash';
import { plinko } from './plinko';
import type { GameModule } from './types';

/** All 12 tables, keyed by id. See PLAN.md section 3. */
export const GAME_MODULES: Record<string, GameModule<unknown, unknown>> = {
  [dice.id]: dice as GameModule<unknown, unknown>,
  [mines.id]: mines as GameModule<unknown, unknown>,
  [hilo.id]: hilo as GameModule<unknown, unknown>,
  [slots.id]: slots as GameModule<unknown, unknown>,
  [roulette.id]: roulette as GameModule<unknown, unknown>,
  [blackjack.id]: blackjack as GameModule<unknown, unknown>,
  [keno.id]: keno as GameModule<unknown, unknown>,
  [tower.id]: tower as GameModule<unknown, unknown>,
  [chicken.id]: chicken as GameModule<unknown, unknown>,
  [wheel.id]: wheel as GameModule<unknown, unknown>,
  [crash.id]: crash as GameModule<unknown, unknown>,
  [plinko.id]: plinko as GameModule<unknown, unknown>,
};

export const ALL_TABLE_IDS = Object.keys(GAME_MODULES);

export function getGameModule(id: string): GameModule<unknown, unknown> {
  const mod = GAME_MODULES[id];
  if (!mod) throw new Error(`Unknown table id: ${id}`);
  return mod;
}

export * from './types';
export { dice, mines, hilo, slots, roulette, blackjack, keno, tower, chicken, wheel, crash, plinko };
