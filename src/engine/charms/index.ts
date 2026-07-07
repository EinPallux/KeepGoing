/**
 * Charm effects, resolved centrally rather than through a generic hook engine
 * (see PLAN.md section 10.3) - with only 10 charms in M1, a handful of
 * explicit switches here is simpler than a plugin framework, and cheap to
 * grow into one later once the charm count actually demands it.
 */
import type { RunState } from '../run';
import { NEUTRAL_MODIFIERS, type Modifiers } from '../games/types';
import { CHARM_DEFS, getCharmDef } from './data';

export * from './types';
export { CHARM_DEFS, getCharmDef };

export const MAX_CHARM_SLOTS = 5;

/** Odds-shaping inputs a game consumes directly (see games/types.ts Modifiers). */
export function computeModifiers(charmIds: readonly string[]): Modifiers {
  const mods = { ...NEUTRAL_MODIFIERS };
  for (const id of charmIds) {
    if (id === 'loaded-die') mods.diceOddsNudge += 3;
    if (id === 'steady-hands') mods.minesGuaranteedFirstSafe = true;
  }
  return mods;
}

/** Extra plays granted per floor by owned charms (e.g. The Regular). */
export function computeBonusPlays(charmIds: readonly string[]): number {
  return charmIds.filter((id) => id === 'the-regular').length * 2;
}

/** Multiplies shop prices; < 1 means cheaper (e.g. Velvet Rope). */
export function computeShopPriceMultiplier(charmIds: readonly string[]): number {
  return charmIds.includes('velvet-rope') ? 0.75 : 1;
}

/** Minimum bet as a fraction of bankroll forced by owned charms (e.g. High Roller). */
export function minBetFraction(charmIds: readonly string[]): number {
  return charmIds.includes('high-roller') ? 0.05 : 0;
}

export interface CharmOutcomeResolution {
  payoutMultiplier: number;
  winCount: number;
  currentStreak: number;
  floorFlags: Record<string, number>;
}

/**
 * Applies economic charm effects (payout %, refunds, streak bonuses) to a
 * resolved play's raw payout multiplier, and updates the run-level
 * bookkeeping (win count, streak, per-floor "used" flags) those effects need.
 * Called once per play, before the result is handed to applyOutcome().
 */
export function applyCharmsToOutcome(run: RunState, rawPayoutMultiplier: number): CharmOutcomeResolution {
  let payoutMultiplier = rawPayoutMultiplier;
  let winCount = run.winCount;
  let currentStreak = run.currentStreak;
  let floorFlags = run.floorFlags;

  const won = rawPayoutMultiplier > 1;
  const busted = rawPayoutMultiplier === 0;

  for (const id of run.charms) {
    switch (id) {
      case 'lucky-cent':
        if (won) payoutMultiplier *= 1.05;
        break;
      case 'hot-streak':
        if (won) payoutMultiplier *= 1 + 0.03 * currentStreak;
        break;
      case 'high-roller':
        if (won) payoutMultiplier *= 1.1;
        break;
      case 'golden-goose':
        if (won && (winCount + 1) % 5 === 0) payoutMultiplier *= 2;
        break;
      case 'rabbits-foot':
        if (busted && floorFlags['rabbits-foot'] !== run.floor) {
          payoutMultiplier = 0.5;
          floorFlags = { ...floorFlags, 'rabbits-foot': run.floor };
        }
        break;
      case 'insurance':
        if (busted) payoutMultiplier = Math.max(payoutMultiplier, 0.2);
        break;
      default:
        break;
    }
  }

  if (won) {
    winCount += 1;
    currentStreak += 1;
  } else if (rawPayoutMultiplier < 1) {
    currentStreak = 0;
  }

  return { payoutMultiplier, winCount, currentStreak, floorFlags };
}
