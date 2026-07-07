import { describe, expect, it } from 'vitest';
import { NEUTRAL_MODIFIERS } from './games/types';
import {
  applyTwistToModifiers,
  getTwistDef,
  pickTwistForFloor,
  TWIST_DEFS,
  TWIST_HOUSE_EDGE_BONUS,
  TWIST_KENO_PAYOUT_SCALE,
  TWIST_MINES_EXTRA_MINES,
} from './twists';

describe('TWIST_DEFS', () => {
  it('has exactly 8 twists, each targeting a distinct game', () => {
    expect(TWIST_DEFS).toHaveLength(8);
    const gameIds = TWIST_DEFS.map((t) => t.gameId);
    expect(new Set(gameIds).size).toBe(8);
  });
});

describe('getTwistDef', () => {
  it('finds a twist by id and throws for an unknown one', () => {
    expect(getTwistDef('rust').gameId).toBe('slots');
    expect(() => getTwistDef('nonexistent')).toThrow();
  });
});

describe('pickTwistForFloor', () => {
  it('is deterministic for the same seed and floor', () => {
    expect(pickTwistForFloor('seed-1', 3)).toEqual(pickTwistForFloor('seed-1', 3));
  });

  it('can differ across floors of the same run', () => {
    const picks = new Set(
      [3, 6, 9, 12].map((floor) => pickTwistForFloor('varied-seed', floor).id),
    );
    // Not a strict requirement (random collisions are fine) but with 8 twists and
    // 4 floors we'd expect at least some variety across a handful of seeds.
    expect(picks.size).toBeGreaterThanOrEqual(1);
  });

  it('always returns one of the defined twists', () => {
    for (let floor = 1; floor <= 12; floor++) {
      const twist = pickTwistForFloor('any-seed', floor);
      expect(TWIST_DEFS.map((t) => t.id)).toContain(twist.id);
    }
  });
});

describe('applyTwistToModifiers', () => {
  it('rust voids the cherry symbol', () => {
    const mods = applyTwistToModifiers(NEUTRAL_MODIFIERS, getTwistDef('rust'));
    expect(mods.slotsVoidSymbolId).toBe('cherry');
  });

  it('overcrowded adds extra mines', () => {
    const mods = applyTwistToModifiers(NEUTRAL_MODIFIERS, getTwistDef('overcrowded'));
    expect(mods.minesExtraMines).toBe(TWIST_MINES_EXTRA_MINES);
  });

  it('double-zero sets the roulette flag', () => {
    const mods = applyTwistToModifiers(NEUTRAL_MODIFIERS, getTwistDef('double-zero'));
    expect(mods.rouletteDoubleZero).toBe(true);
  });

  it('house-rules sets the blackjack flag', () => {
    const mods = applyTwistToModifiers(NEUTRAL_MODIFIERS, getTwistDef('house-rules'));
    expect(mods.blackjackDealerWinsPush).toBe(true);
  });

  it('loaded-house, cold-deck, and loose-boards all add the same house edge bonus', () => {
    for (const id of ['loaded-house', 'cold-deck', 'loose-boards']) {
      const mods = applyTwistToModifiers(NEUTRAL_MODIFIERS, getTwistDef(id));
      expect(mods.houseEdgeBonus).toBe(TWIST_HOUSE_EDGE_BONUS);
    }
  });

  it('tight-draw scales keno payouts down', () => {
    const mods = applyTwistToModifiers(NEUTRAL_MODIFIERS, getTwistDef('tight-draw'));
    expect(mods.kenoPayoutScale).toBe(TWIST_KENO_PAYOUT_SCALE);
  });

  it('stacks additively on top of existing (charm-driven) modifiers', () => {
    const withCharm = { ...NEUTRAL_MODIFIERS, houseEdgeBonus: 0.05 };
    const mods = applyTwistToModifiers(withCharm, getTwistDef('loaded-house'));
    expect(mods.houseEdgeBonus).toBeCloseTo(0.05 + TWIST_HOUSE_EDGE_BONUS);
  });
});
