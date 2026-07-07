import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { mines, minesMultiplier, MINES_GRID_SIZE } from './mines';

describe('minesMultiplier', () => {
  it('is 1 (minus house edge) for 0 safe reveals', () => {
    expect(minesMultiplier(5, 0)).toBeCloseTo(1 - 0.02);
  });

  it('grows with each safe reveal', () => {
    const m1 = minesMultiplier(5, 1);
    const m2 = minesMultiplier(5, 2);
    const m3 = minesMultiplier(5, 3);
    expect(m2).toBeGreaterThan(m1);
    expect(m3).toBeGreaterThan(m2);
  });

  it('grows faster with more mines', () => {
    expect(minesMultiplier(10, 3)).toBeGreaterThan(minesMultiplier(3, 3));
  });
});

describe('mines module', () => {
  it('places exactly mineCount mines on init', () => {
    const rng = createRng('mines-init');
    const state = mines.initRound(10, { mineCount: 5 }, rng, NEUTRAL_MODIFIERS);
    expect(state.minePositions).toHaveLength(5);
    expect(new Set(state.minePositions).size).toBe(5);
    for (const p of state.minePositions) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(MINES_GRID_SIZE);
    }
  });

  it('clamps mine count to [1, 24]', () => {
    const rng = createRng('mines-clamp');
    expect(mines.initRound(10, { mineCount: 0 }, rng, NEUTRAL_MODIFIERS).mineCount).toBe(1);
    expect(mines.initRound(10, { mineCount: 99 }, rng, NEUTRAL_MODIFIERS).mineCount).toBe(24);
  });

  it('does not offer cashout before any reveal', () => {
    const rng = createRng('mines-actions');
    const state = mines.initRound(10, { mineCount: 5 }, rng, NEUTRAL_MODIFIERS);
    expect(mines.actions(state)).not.toContain('cashout');
    expect(mines.actions(state)).toHaveLength(MINES_GRID_SIZE);
  });

  it('throws if cashing out with zero reveals', () => {
    const rng = createRng('mines-cashout-guard');
    const state = mines.initRound(10, { mineCount: 5 }, rng, NEUTRAL_MODIFIERS);
    expect(() => mines.step(state, 'cashout', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('revealing a safe tile keeps the round open and offers cashout next', () => {
    const rng = createRng('mines-safe-reveal');
    let state = mines.initRound(10, { mineCount: 1 }, rng, NEUTRAL_MODIFIERS);
    const safeTile = Array.from({ length: MINES_GRID_SIZE }, (_, i) => i).find(
      (i) => !state.minePositions.includes(i),
    )!;
    const { state: next, events } = mines.step(state, `reveal:${safeTile}`, rng, NEUTRAL_MODIFIERS);
    expect(events).toEqual([]);
    expect(next.resolved).toBe(false);
    expect(next.revealed).toEqual([safeTile]);
    expect(mines.actions(next)).toContain('cashout');
  });

  it('revealing a mine busts the round with payoutMultiplier 0', () => {
    const rng = createRng('mines-bust');
    const state = mines.initRound(10, { mineCount: 1 }, rng, NEUTRAL_MODIFIERS);
    const mineTile = state.minePositions[0];
    const { state: next, events } = mines.step(state, `reveal:${mineTile}`, rng, NEUTRAL_MODIFIERS);
    expect(next.resolved).toBe(true);
    expect(next.busted).toBe(true);
    expect(next.payoutMultiplier).toBe(0);
    expect(events[0].payoutMultiplier).toBe(0);
    expect(mines.isResolved(next)).toBe(true);
    expect(mines.actions(next)).toEqual([]);
  });

  it('cashing out after safe reveals pays the fair multiplier', () => {
    const rng = createRng('mines-cashout');
    let state = mines.initRound(10, { mineCount: 3 }, rng, NEUTRAL_MODIFIERS);
    const safeTiles = Array.from({ length: MINES_GRID_SIZE }, (_, i) => i).filter(
      (i) => !state.minePositions.includes(i),
    );
    const { state: afterReveal } = mines.step(state, `reveal:${safeTiles[0]}`, rng, NEUTRAL_MODIFIERS);
    const { state: afterCashout, events } = mines.step(afterReveal, 'cashout', rng, NEUTRAL_MODIFIERS);
    expect(afterCashout.resolved).toBe(true);
    expect(afterCashout.cashedOut).toBe(true);
    expect(afterCashout.payoutMultiplier).toBeCloseTo(minesMultiplier(3, 1));
    expect(events[0].payoutMultiplier).toBeCloseTo(minesMultiplier(3, 1));
  });

  it('auto-resolves as a win once every safe tile is revealed', () => {
    const rng = createRng('mines-clear');
    let state = mines.initRound(10, { mineCount: 24 }, rng, NEUTRAL_MODIFIERS); // only 1 safe tile
    const safeTile = Array.from({ length: MINES_GRID_SIZE }, (_, i) => i).find(
      (i) => !state.minePositions.includes(i),
    )!;
    const { state: next, events } = mines.step(state, `reveal:${safeTile}`, rng, NEUTRAL_MODIFIERS);
    expect(next.resolved).toBe(true);
    expect(next.cashedOut).toBe(true);
    expect(events[0].payoutMultiplier).toBeCloseTo(minesMultiplier(24, 1));
  });

  it('guarantees the first reveal is safe when the modifier is set, without changing mine count', () => {
    for (let i = 0; i < 30; i++) {
      const rng = createRng(`mines-guard-${i}`);
      const state = mines.initRound(10, { mineCount: 24 }, rng, NEUTRAL_MODIFIERS); // 24/25 tiles are mines
      const forcedTile = state.minePositions[0]; // guaranteed to be a mine tile under normal odds
      const { state: next } = mines.step(state, `reveal:${forcedTile}`, rng, {
        ...NEUTRAL_MODIFIERS,
        minesGuaranteedFirstSafe: true,
      });
      expect(next.busted).toBe(false);
      expect(next.minePositions).toHaveLength(24);
      expect(new Set(next.minePositions).size).toBe(24);
    }
  });

  it('rejects re-revealing a tile or an out-of-range tile', () => {
    const rng = createRng('mines-guard-2');
    let state = mines.initRound(10, { mineCount: 1 }, rng, NEUTRAL_MODIFIERS);
    const safeTile = Array.from({ length: MINES_GRID_SIZE }, (_, i) => i).find(
      (i) => !state.minePositions.includes(i),
    )!;
    const { state: next } = mines.step(state, `reveal:${safeTile}`, rng, NEUTRAL_MODIFIERS);
    expect(() => mines.step(next, `reveal:${safeTile}`, rng, NEUTRAL_MODIFIERS)).toThrow();
    expect(() => mines.step(state, 'reveal:99', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('minesExtraMines (e.g. a House Floor Twist) adds to the configured mine count', () => {
    const rng = createRng('mines-extra');
    const state = mines.initRound(10, { mineCount: 5 }, rng, { ...NEUTRAL_MODIFIERS, minesExtraMines: 2 });
    expect(state.mineCount).toBe(7);
    expect(state.minePositions).toHaveLength(7);
  });
});
