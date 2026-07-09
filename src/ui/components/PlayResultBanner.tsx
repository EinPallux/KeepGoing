import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { celebrateForPayout } from '../fx/confetti';
import { playWin, playLose } from '../fx/sound';

interface PlayResultBannerProps {
  delta: number;
  payoutMultiplier: number;
}

function tierFor(mult: number): { label: string; tone: 'jackpot' | 'big' | 'win' | 'push' | 'loss' } {
  if (mult >= 20) return { label: 'JACKPOT', tone: 'jackpot' };
  if (mult >= 5) return { label: 'BIG WIN', tone: 'big' };
  if (mult > 1) return { label: 'WIN', tone: 'win' };
  if (mult === 1) return { label: 'PUSH', tone: 'push' };
  return { label: '', tone: 'loss' };
}

/**
 * The charm-adjusted chip swing from the last play, shown once a table's reveal
 * animation has finished. Fires tiered confetti + sound (PLAN.md section 8).
 * Pass a `key` that changes every resolution so it remounts + re-celebrates.
 */
export function PlayResultBanner({ delta, payoutMultiplier }: PlayResultBannerProps) {
  const rounded = Math.round(delta);
  const push = rounded === 0 && payoutMultiplier >= 1;
  const { label, tone } = tierFor(payoutMultiplier);

  useEffect(() => {
    celebrateForPayout(payoutMultiplier);
    if (payoutMultiplier >= 20) playWin('jackpot');
    else if (payoutMultiplier >= 5) playWin('big');
    else if (payoutMultiplier > 1) playWin('small');
    else if (payoutMultiplier < 1) playLose();
  }, [payoutMultiplier]);

  const toneClass =
    tone === 'jackpot'
      ? 'text-amber-200 border-amber-300/60 bg-amber-400/10'
      : tone === 'big'
        ? 'text-amber-300 border-amber-400/40 bg-amber-500/10'
        : tone === 'win'
          ? 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10'
          : push
            ? 'text-white/80 border-white/20 bg-white/10'
            : 'text-rose-300 border-rose-400/40 bg-rose-500/10';

  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0, y: -8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      className={`rounded-2xl border px-7 py-3 text-center backdrop-blur ${toneClass}`}
    >
      {label && (
        <motion.p
          initial={{ letterSpacing: '0.5em', opacity: 0 }}
          animate={{ letterSpacing: '0.18em', opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-xs font-black uppercase"
        >
          {label}
        </motion.p>
      )}
      <p className="kg-tnum text-3xl font-black">
        {rounded > 0 ? `+${rounded.toLocaleString()}` : rounded < 0 ? rounded.toLocaleString() : '±0'}
        <span className="ml-1 text-base font-bold opacity-70">chips</span>
      </p>
      {payoutMultiplier > 0 && (
        <p className="kg-tnum text-sm font-bold opacity-75">{payoutMultiplier.toFixed(2)}×</p>
      )}
    </motion.div>
  );
}
