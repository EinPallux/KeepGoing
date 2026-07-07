import { describe, expect, it } from 'vitest';
import { createRng, createStream } from './rng';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng('floor-1-seed');
    const b = createRng('floor-1-seed');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds', () => {
    const a = createRng('seed-a');
    const b = createRng('seed-b');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const rng = createRng('range-check');
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() stays within inclusive bounds', () => {
    const rng = createRng('int-check');
    for (let i = 0; i < 500; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('pick() only returns items from the array', () => {
    const rng = createRng('pick-check');
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('shuffle() is a permutation of the input', () => {
    const rng = createRng('shuffle-check');
    const items = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(items);
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual([...items].sort());
  });
});

describe('createStream', () => {
  it('derives independent streams from one run seed', () => {
    const games = createStream('run-42', 'games');
    const shop = createStream('run-42', 'shop');
    const gamesSeq = Array.from({ length: 10 }, () => games.next());
    const shopSeq = Array.from({ length: 10 }, () => shop.next());
    expect(gamesSeq).not.toEqual(shopSeq);
  });

  it('is reproducible for the same run seed + stream name', () => {
    const a = createStream('run-99', 'events');
    const b = createStream('run-99', 'events');
    expect(a.next()).toEqual(b.next());
  });
});
