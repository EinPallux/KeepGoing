import confetti from 'canvas-confetti';

const GOLD = ['#ffcf5c', '#f0a83a', '#fff2c4'];
const PARTY = ['#ff4d9d', '#ffcf5c', '#38e1ff', '#a855f7', '#34e0a1'];

export function fireFloorClear(): void {
  confetti({ particleCount: 140, spread: 90, startVelocity: 45, origin: { y: 0.6 }, colors: PARTY });
  setTimeout(() => confetti({ particleCount: 80, spread: 110, startVelocity: 35, origin: { y: 0.5 }, colors: GOLD }), 180);
}

export function fireBigWin(): void {
  confetti({ particleCount: 120, spread: 85, startVelocity: 48, origin: { y: 0.55 }, colors: PARTY });
}

/** A gold coin fountain from the bottom center - for cash-outs and wins. */
export function fireCoins(): void {
  confetti({
    particleCount: 60,
    angle: 90,
    spread: 55,
    startVelocity: 55,
    gravity: 1.1,
    scalar: 1.1,
    origin: { x: 0.5, y: 0.9 },
    colors: GOLD,
  });
}

export function fireJackpot(): void {
  const end = Date.now() + 1400;
  (function frame() {
    confetti({ particleCount: 7, angle: 60, spread: 70, startVelocity: 60, origin: { x: 0, y: 0.6 }, colors: PARTY });
    confetti({ particleCount: 7, angle: 120, spread: 70, startVelocity: 60, origin: { x: 1, y: 0.6 }, colors: PARTY });
    confetti({ particleCount: 4, angle: 90, spread: 120, startVelocity: 45, origin: { x: 0.5, y: 0.4 }, colors: GOLD });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/** Briefly shake the whole app frame (element with id="kg-app-root"). */
export function screenShake(intensity: 'light' | 'heavy' = 'light'): void {
  const el = document.getElementById('kg-app-root');
  if (!el) return;
  el.classList.remove('kg-screen-shake');
  // reflow so the animation restarts even on repeat calls
  void el.offsetWidth;
  el.style.setProperty('--kg-shake-mag', intensity === 'heavy' ? '10px' : '4px');
  el.classList.add('kg-screen-shake');
  setTimeout(() => el.classList.remove('kg-screen-shake'), 600);
}

/** BIG WIN at 5x the bet, JACKPOT at 20x - see PLAN.md section 8 (win tiers). */
export function celebrateForPayout(payoutMultiplier: number): void {
  if (payoutMultiplier >= 20) fireJackpot();
  else if (payoutMultiplier >= 5) fireBigWin();
  else if (payoutMultiplier > 1) fireCoins();
}
