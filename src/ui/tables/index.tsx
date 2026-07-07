import type { ComponentType } from 'react';
import { DiceTable } from './DiceTable';
import { MinesTable } from './MinesTable';
import { HiloTable } from './HiloTable';
import { SlotsTable } from './SlotsTable';

/** Maps a table id to the React component that renders it. Grows to 12 entries through M2. */
export const TABLE_COMPONENTS: Record<string, ComponentType> = {
  dice: DiceTable,
  mines: MinesTable,
  hilo: HiloTable,
  slots: SlotsTable,
};
