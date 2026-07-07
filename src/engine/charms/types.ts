export type CharmRarity = 'common' | 'uncommon' | 'rare';

export interface CharmDef {
  id: string;
  label: string;
  description: string;
  rarity: CharmRarity;
  price: number;
}
