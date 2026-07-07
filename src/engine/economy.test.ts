import { describe, expect, it } from 'vitest';
import { calcInterest, calcPlayoutDelta, calcUnusedPlayBonus } from './economy';

describe('calcInterest', () => {
  it('gives +1 per 25 held', () => {
    expect(calcInterest(0)).toBe(0);
    expect(calcInterest(24)).toBe(0);
    expect(calcInterest(25)).toBe(1);
    expect(calcInterest(249)).toBe(9);
  });

  it('caps at +20', () => {
    expect(calcInterest(1000)).toBe(20);
    expect(calcInterest(10000)).toBe(20);
  });
});

describe('calcUnusedPlayBonus', () => {
  it('is 10 chips per unspent play', () => {
    expect(calcUnusedPlayBonus(0)).toBe(0);
    expect(calcUnusedPlayBonus(3)).toBe(30);
  });

  it('never goes negative', () => {
    expect(calcUnusedPlayBonus(-5)).toBe(0);
  });
});

describe('calcPlayoutDelta', () => {
  it('is a full loss at multiplier 0', () => {
    expect(calcPlayoutDelta(50, 0)).toBe(-50);
  });

  it('is neutral at multiplier 1 (push)', () => {
    expect(calcPlayoutDelta(50, 1)).toBe(0);
  });

  it('is net profit above 1', () => {
    expect(calcPlayoutDelta(50, 2)).toBe(50);
    expect(calcPlayoutDelta(50, 3)).toBe(100);
  });
});
