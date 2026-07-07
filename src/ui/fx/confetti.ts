import confetti from 'canvas-confetti';

const PALETTE = ['#f472b6', '#fbbf24', '#22d3ee', '#a78bfa'];

export function fireFloorClear(): void {
  confetti({ particleCount: 90, spread: 75, startVelocity: 40, origin: { y: 0.6 }, colors: PALETTE });
}

export function fireBigWin(): void {
  confetti({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.55 }, colors: PALETTE });
}

export function fireJackpot(): void {
  const end = Date.now() + 900;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 65, startVelocity: 55, origin: { x: 0, y: 0.6 }, colors: PALETTE });
    confetti({ particleCount: 6, angle: 120, spread: 65, startVelocity: 55, origin: { x: 1, y: 0.6 }, colors: PALETTE });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/** BIG WIN at 5x the bet, JACKPOT at 20x - see PLAN.md section 8 (win tiers). */
export function celebrateForPayout(payoutMultiplier: number): void {
  if (payoutMultiplier >= 20) fireJackpot();
  else if (payoutMultiplier >= 5) fireBigWin();
}
