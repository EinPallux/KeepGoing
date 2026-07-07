import type { CharmDef } from './types';

/** The M1 charm pool. Grows toward ~40 (with Corrupted rarities) through M2/M3. */
export const CHARM_DEFS: readonly CharmDef[] = [
  {
    id: 'lucky-cent',
    label: 'Lucky Cent',
    description: '+5% payout on every win.',
    rarity: 'common',
    price: 20,
  },
  {
    id: 'loaded-die',
    label: 'Loaded Die',
    description: 'Dice: your roll is nudged 3 points in your favor.',
    rarity: 'common',
    price: 20,
  },
  {
    id: 'steady-hands',
    label: 'Steady Hands',
    description: 'Mines: your first reveal each round can never be a mine.',
    rarity: 'common',
    price: 20,
  },
  {
    id: 'rabbits-foot',
    label: "Rabbit's Foot",
    description: 'The first bust each floor refunds half your bet.',
    rarity: 'common',
    price: 25,
  },
  {
    id: 'insurance',
    label: 'Insurance',
    description: 'Every bust refunds 20% of your bet.',
    rarity: 'uncommon',
    price: 35,
  },
  {
    id: 'hot-streak',
    label: 'Hot Streak',
    description: '+3% payout for every consecutive win this floor.',
    rarity: 'uncommon',
    price: 35,
  },
  {
    id: 'high-roller',
    label: 'High Roller',
    description: '+10% payout on wins, but every bet must be at least 5% of your bankroll.',
    rarity: 'uncommon',
    price: 40,
  },
  {
    id: 'the-regular',
    label: 'The Regular',
    description: '+2 plays every floor.',
    rarity: 'rare',
    price: 55,
  },
  {
    id: 'golden-goose',
    label: 'Golden Goose',
    description: 'Every 5th win this run pays double.',
    rarity: 'rare',
    price: 60,
  },
  {
    id: 'velvet-rope',
    label: 'Velvet Rope',
    description: 'Shop prices are 25% cheaper.',
    rarity: 'rare',
    price: 50,
  },
];

export function getCharmDef(id: string): CharmDef {
  const def = CHARM_DEFS.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown charm id: ${id}`);
  return def;
}
