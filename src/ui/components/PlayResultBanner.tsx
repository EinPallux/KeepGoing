import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { celebrateForPayout } from '../fx/confetti';

interface PlayResultBannerProps {
  delta: number;
  payoutMultiplier: number;
}

/**
 * Shows the actual, charm-adjusted chip swing from the last play, and fires
 * a confetti celebration for BIG WIN / JACKPOT tiers (PLAN.md section 8).
 * Pass a `key` that changes every resolution (e.g. stepIndex) so this
 * remounts - and re-celebrates - on every new result, even repeat multipliers.
 */
export function PlayResultBanner({ delta, payoutMultiplier }: PlayResultBannerProps) {
  const rounded = Math.round(delta);
  const won = rounded > 0;
  const push = rounded === 0 && payoutMultiplier > 0;

  useEffect(() => {
    celebrateForPayout(payoutMultiplier);
  }, [payoutMultiplier]);

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`rounded-xl px-6 py-4 text-center ${
        won ? 'bg-emerald-500/15 text-emerald-300' : push ? 'bg-white/10 text-white/70' : 'bg-rose-500/15 text-rose-300'
      }`}
    >
      <p className="text-2xl font-bold">
        {rounded > 0 ? `+${rounded}` : rounded < 0 ? `${rounded}` : '±0'} chips
      </p>
      {payoutMultiplier > 0 && <p className="text-sm opacity-70">{payoutMultiplier.toFixed(2)}x</p>}
    </motion.div>
  );
}
