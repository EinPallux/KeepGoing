import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { tower, towerMultiplier, TOWER_ROWS, TOWER_DOORS, TOWER_HOUSE_EDGE } from './tower';

describe('towerMultiplier', () => {
  it('grows with each cleared row', () => {
    const m1 = towerMultiplier(1);
    const m2 = towerMultiplier(2);
    const m3 = towerMultiplier(3);
    expect(m2).toBeGreaterThan(m1);
    expect(m3).toBeGreaterThan(m2);
  });

  it('is close to (3/2)^rows minus the house edge', () => {
    expect(towerMultiplier(0)).toBeCloseTo(1 - 0.03);
  });
});

describe('tower module', () => {
  it('does not offer cashout on row 0', () => {
    const rng = createRng('tower-actions');
    const state = tower.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    expect(tower.actions(state)).not.toContain('cashout');
    expect(tower.actions(state)).toHaveLength(TOWER_DOORS);
  });

  it('throws cashing out before climbing', () => {
    const rng = createRng('tower-cashout-guard');
    const state = tower.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    expect(() => tower.step(state, 'cashout', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('picking the trap door busts with payoutMultiplier 0', () => {
    const rng = createRng('tower-bust');
    const state = tower.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    const trapDoor = state.trapDoors[0];
    const { state: next, events } = tower.step(state, `door:${trapDoor}`, rng, NEUTRAL_MODIFIERS);
    expect(next.resolved).toBe(true);
    expect(next.busted).toBe(true);
    expect(next.payoutMultiplier).toBe(0);
    expect(events[0].payoutMultiplier).toBe(0);
  });

  it('picking a safe door advances a row and unlocks cashout', () => {
    const rng = createRng('tower-safe');
    const state = tower.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    const safeDoor = Array.from({ length: TOWER_DOORS }, (_, i) => i).find((i) => i !== state.trapDoors[0])!;
    const { state: next, events } = tower.step(state, `door:${safeDoor}`, rng, NEUTRAL_MODIFIERS);
    expect(next.resolved).toBe(false);
    expect(next.row).toBe(1);
    expect(events).toEqual([]);
    expect(tower.actions(next)).toContain('cashout');
  });

  it('cashing out pays the fair multiplier for rows cleared', () => {
    const rng = createRng('tower-cashout');
    const state = tower.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    const safeDoor = Array.from({ length: TOWER_DOORS }, (_, i) => i).find((i) => i !== state.trapDoors[0])!;
    const { state: afterClimb } = tower.step(state, `door:${safeDoor}`, rng, NEUTRAL_MODIFIERS);
    const { state: cashedOut, events } = tower.step(afterClimb, 'cashout', rng, NEUTRAL_MODIFIERS);
    expect(cashedOut.resolved).toBe(true);
    expect(cashedOut.cashedOut).toBe(true);
    expect(cashedOut.payoutMultiplier).toBeCloseTo(towerMultiplier(1));
    expect(events[0].payoutMultiplier).toBeCloseTo(towerMultiplier(1));
  });

  it('auto-resolves as a win after clearing every row', () => {
    const rng = createRng('tower-top');
    let state = tower.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    for (let row = 0; row < TOWER_ROWS; row++) {
      const safeDoor = Array.from({ length: TOWER_DOORS }, (_, i) => i).find((i) => i !== state.trapDoors[row])!;
      const stepped = tower.step(state, `door:${safeDoor}`, rng, NEUTRAL_MODIFIERS);
      state = stepped.state;
    }
    expect(state.resolved).toBe(true);
    expect(state.cashedOut).toBe(true);
    expect(state.row).toBe(TOWER_ROWS);
    expect(state.payoutMultiplier).toBeCloseTo(towerMultiplier(TOWER_ROWS));
  });

  it('throws on an out-of-range door and an unknown action', () => {
    const rng = createRng('tower-guard');
    const state = tower.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    expect(() => tower.step(state, 'door:99', rng, NEUTRAL_MODIFIERS)).toThrow();
    expect(() => tower.step(state, 'nudge', rng, NEUTRAL_MODIFIERS)).toThrow();
  });

  it('a house edge bonus (e.g. a House Floor Twist) lowers the cashout multiplier', () => {
    const rng = createRng('tower-edge-bonus');
    const state = tower.initRound(10, undefined, rng, NEUTRAL_MODIFIERS);
    const safeDoor = Array.from({ length: TOWER_DOORS }, (_, i) => i).find((i) => i !== state.trapDoors[0])!;
    const { state: afterClimb } = tower.step(state, `door:${safeDoor}`, rng, NEUTRAL_MODIFIERS);
    const { state: twisted } = tower.step(afterClimb, 'cashout', rng, { ...NEUTRAL_MODIFIERS, houseEdgeBonus: 0.2 });
    expect(twisted.payoutMultiplier).toBeCloseTo(towerMultiplier(1, TOWER_HOUSE_EDGE + 0.2));
    expect(twisted.payoutMultiplier).toBeLessThan(towerMultiplier(1));
  });
});
