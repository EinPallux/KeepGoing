import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { NEUTRAL_MODIFIERS } from './types';
import { numberColor, roulette, RED_NUMBERS } from './roulette';

describe('numberColor', () => {
  it('0 is green', () => {
    expect(numberColor(0)).toBe('green');
  });

  it('classifies red and black correctly', () => {
    for (let n = 1; n <= 36; n++) {
      expect(numberColor(n)).toBe(RED_NUMBERS.has(n) ? 'red' : 'black');
    }
  });
});

describe('roulette module', () => {
  it('straight bet pays 36x on an exact match, 0 otherwise', () => {
    for (let i = 0; i < 100; i++) {
      const rng = createRng(`straight-${i}`);
      const state = roulette.initRound(10, { betType: 'straight', value: 17 }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = roulette.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
      expect(resolved.payoutMultiplier).toBe(resolved.result === 17 ? 36 : 0);
    }
  });

  it('color bet pays 2x on a match, 0 on the other color or zero', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`color-${i}`);
      const state = roulette.initRound(10, { betType: 'color', value: 'red' }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = roulette.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
      const expected = numberColor(resolved.result!) === 'red' ? 2 : 0;
      expect(resolved.payoutMultiplier).toBe(expected);
    }
  });

  it('parity bet pays 2x on a match, loses on zero', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`parity-${i}`);
      const state = roulette.initRound(10, { betType: 'parity', value: 'odd' }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = roulette.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
      if (resolved.result === 0) {
        expect(resolved.payoutMultiplier).toBe(0);
      } else {
        expect(resolved.payoutMultiplier).toBe(resolved.result! % 2 === 1 ? 2 : 0);
      }
    }
  });

  it('dozen bet pays 3x on a match, loses on zero', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`dozen-${i}`);
      const state = roulette.initRound(10, { betType: 'dozen', value: 1 }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = roulette.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
      if (resolved.result === 0) {
        expect(resolved.payoutMultiplier).toBe(0);
      } else {
        const expected = resolved.result! >= 1 && resolved.result! <= 12 ? 3 : 0;
        expect(resolved.payoutMultiplier).toBe(expected);
      }
    }
  });

  it('result is always in [0, 36]', () => {
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`range-${i}`);
      const state = roulette.initRound(10, { betType: 'color', value: 'red' }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = roulette.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
      expect(resolved.result).toBeGreaterThanOrEqual(0);
      expect(resolved.result).toBeLessThanOrEqual(36);
    }
  });

  it('is idempotent once resolved and throws on an unknown action', () => {
    const rng = createRng('guard');
    const state = roulette.initRound(10, { betType: 'color', value: 'red' }, rng, NEUTRAL_MODIFIERS);
    const { state: resolved } = roulette.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
    const { state: again, events } = roulette.step(resolved, 'spin', rng, NEUTRAL_MODIFIERS);
    expect(again).toBe(resolved);
    expect(events).toEqual([]);
    expect(() => roulette.step(state, 'nudge', rng, NEUTRAL_MODIFIERS)).toThrow();
  });
});

describe('Double Zero twist', () => {
  it('adds a 38th pocket (index 37) that is green and loses every outside bet', () => {
    let sawDoubleZero = false;
    for (let i = 0; i < 500; i++) {
      const rng = createRng(`double-zero-${i}`);
      const state = roulette.initRound(10, { betType: 'color', value: 'red' }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = roulette.step(state, 'spin', rng, { ...NEUTRAL_MODIFIERS, rouletteDoubleZero: true });
      expect(resolved.result).toBeGreaterThanOrEqual(0);
      expect(resolved.result).toBeLessThanOrEqual(37);
      if (resolved.result === 37) {
        sawDoubleZero = true;
        expect(numberColor(37)).toBe('green');
        expect(resolved.payoutMultiplier).toBe(0);
      }
    }
    expect(sawDoubleZero).toBe(true);
  });

  it('never appears without the twist active', () => {
    for (let i = 0; i < 300; i++) {
      const rng = createRng(`no-double-zero-${i}`);
      const state = roulette.initRound(10, { betType: 'color', value: 'red' }, rng, NEUTRAL_MODIFIERS);
      const { state: resolved } = roulette.step(state, 'spin', rng, NEUTRAL_MODIFIERS);
      expect(resolved.result).toBeLessThanOrEqual(36);
    }
  });
});
