/**
 * Deterministic PRNG (mulberry32) plus named stream splitting.
 * Same run seed + same choices => same outcomes, always.
 */

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** True with probability p (0..1). */
  chance(p: number): boolean;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Fisher-Yates shuffle, returns a new array. */
  shuffle<T>(items: readonly T[]): T[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hashes a string seed into a 32-bit int (xfnv1a-ish). */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function makeRng(seedInt: number): Rng {
  const next = mulberry32(seedInt);
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p) {
      return next() < p;
    },
    pick(items) {
      if (items.length === 0) throw new Error('pick() called on empty array');
      return items[Math.floor(next() * items.length)];
    },
    shuffle(items) {
      const arr = items.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

/**
 * Creates an Rng from a string or numeric seed.
 * Use createStream() to derive independent, reproducible sub-streams
 * (e.g. "games", "shop", "events") from one run seed so that, say,
 * rerolling the shop never perturbs game outcomes.
 */
export function createRng(seed: string | number): Rng {
  const seedInt = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  return makeRng(seedInt);
}

export function createStream(runSeed: string, streamName: string): Rng {
  return createRng(`${runSeed}:${streamName}`);
}

/** Generates a fresh random run seed (for "new run", not Daily Run). */
export function randomSeed(): string {
  return Math.floor(Math.random() * 0xffffffff).toString(36);
}
