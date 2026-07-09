import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import { ActionButton } from '../components/ActionButton';
import { fireJackpot } from '../fx/confetti';
import { playWin, playLose } from '../fx/sound';

export function SummaryScreen() {
  const run = useRunStore((s) => s.run);
  const startNewRun = useRunStore((s) => s.startNewRun);
  const abandonRun = useRunStore((s) => s.abandonRun);

  const won = run?.status === 'won';

  useEffect(() => {
    if (won) {
      fireJackpot();
      playWin('jackpot');
    } else {
      playLose();
    }
  }, [won]);

  if (!run) return null;

  const floorsCleared = run.history.filter((r) => r.cleared).length;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.p
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 14 }}
        className={`text-5xl font-black ${won ? 'kg-gold-text' : 'text-rose-400'}`}
      >
        {won ? '👑 You Beat The House' : '💀 Busted'}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="kg-glass flex flex-wrap items-center justify-center gap-6 rounded-2xl px-8 py-5"
      >
        <Stat label="Floor" value={`${run.floor} / 12`} />
        <Stat label="Floors cleared" value={`${floorsCleared}`} />
        <Stat label="Final bankroll" value={run.bankroll.toLocaleString()} accent />
      </motion.div>

      <div className="flex gap-3">
        <ActionButton onClick={startNewRun} sheen>
          New Run
        </ActionButton>
        <button
          type="button"
          onClick={abandonRun}
          className="kg-glass rounded-full px-8 py-3 font-bold text-white/80 transition hover:text-white"
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`kg-tnum text-2xl font-black ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</span>
      <span className="text-xs uppercase tracking-widest text-white/45">{label}</span>
    </div>
  );
}
