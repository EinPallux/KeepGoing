import { motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import { ActionButton } from '../components/ActionButton';

const FLOATERS = ['🎰', '🃏', '💎', '🎲', '🍀', '🚀', '💰', '⭐'];

export function MenuScreen() {
  const startNewRun = useRunStore((s) => s.startNewRun);

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-10 overflow-hidden px-6 text-center">
      {/* drifting casino icons */}
      {FLOATERS.map((emoji, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute select-none text-4xl opacity-20"
          style={{ left: `${8 + i * 11}%`, top: `${12 + ((i * 37) % 70)}%` }}
          animate={{ y: [0, -22, 0], rotate: [0, i % 2 ? 12 : -12, 0] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        >
          {emoji}
        </motion.span>
      ))}

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        className="relative"
      >
        <h1 className="kg-title text-7xl font-black sm:text-8xl">KeepGoing</h1>
        <div className="mt-1 flex items-center justify-center gap-2 text-sm uppercase tracking-[0.35em] text-amber-300/80">
          <span>🎰</span> Fake-money gambling roguelite <span>🎰</span>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="max-w-md text-white/60"
      >
        Twelve floors. Twelve games. Stack charms, ride your luck, and beat escalating targets. The House
        always waits — how far can you go?
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <ActionButton onClick={startNewRun} sheen className="!px-14 !py-5 !text-xl">
          New Run
        </ActionButton>
      </motion.div>

      <p className="text-xs text-white/30">No real money · no accounts · no ads — just for fun</p>
    </div>
  );
}
