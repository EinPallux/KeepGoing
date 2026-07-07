/** Pure money math. See PLAN.md section 2.2 (Economy). */

const INTEREST_RATE_CHIPS_PER = 25;
const INTEREST_CAP = 20;
const UNUSED_PLAY_BONUS = 10;

/** +1 Chip per 25 held, capped at +20. */
export function calcInterest(bankroll: number): number {
  return Math.min(INTEREST_CAP, Math.floor(bankroll / INTEREST_RATE_CHIPS_PER));
}

/** Each unspent play converts to +10 Chips at floor end. */
export function calcUnusedPlayBonus(playsLeft: number): number {
  return Math.max(0, playsLeft) * UNUSED_PLAY_BONUS;
}

/** Net chip delta for a resolved bet. payoutMultiplier: 0 = total loss, 1 = push, >1 = win. */
export function calcPlayoutDelta(bet: number, payoutMultiplier: number): number {
  return bet * payoutMultiplier - bet;
}
