import type { ComponentType } from 'react';
import { DiceTable } from './DiceTable';
import { MinesTable } from './MinesTable';
import { HiloTable } from './HiloTable';
import { SlotsTable } from './SlotsTable';
import { RouletteTable } from './RouletteTable';
import { BlackjackTable } from './BlackjackTable';
import { KenoTable } from './KenoTable';
import { TowerTable } from './TowerTable';
import { ChickenTable } from './ChickenTable';
import { WheelTable } from './WheelTable';
import { CrashTable } from './CrashTable';
import { PlinkoTable } from './PlinkoTable';
import { CoinFlipTable } from './CoinFlipTable';
import { VideoPokerTable } from './VideoPokerTable';
import { ScratchTable } from './ScratchTable';

/** Maps a table id to the React component that renders it. */
export const TABLE_COMPONENTS: Record<string, ComponentType> = {
  dice: DiceTable,
  mines: MinesTable,
  hilo: HiloTable,
  slots: SlotsTable,
  roulette: RouletteTable,
  blackjack: BlackjackTable,
  keno: KenoTable,
  tower: TowerTable,
  chicken: ChickenTable,
  wheel: WheelTable,
  crash: CrashTable,
  plinko: PlinkoTable,
  coinflip: CoinFlipTable,
  videopoker: VideoPokerTable,
  scratch: ScratchTable,
};
