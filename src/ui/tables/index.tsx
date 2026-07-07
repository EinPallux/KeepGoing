import type { ComponentType } from 'react';
import { CoinFlipTable } from './CoinFlipTable';

/** Maps a table id to the React component that renders it. Grows to 12 entries through M1/M2. */
export const TABLE_COMPONENTS: Record<string, ComponentType> = {
  coinflip: CoinFlipTable,
};
