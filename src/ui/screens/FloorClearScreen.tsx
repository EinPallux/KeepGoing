import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { FloorRecord } from '../../engine/run';
import { fireFloorClear } from '../fx/confetti';

interface FloorClearScreenProps {
  record: FloorRecord;
  onContinue: () => void;
}

export function FloorClearScreen({ record, onContinue }: FloorClearScreenProps) {
  useEffect(() => {
    fireFloorClear();
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm uppercase tracking-widest text-emerald-400">Floor {record.floor} Cleared</p>
      <motion.p
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="text-5xl font-black text-amber-300"
      >
        {record.endBankroll} chips
      </motion.p>

      <div className="flex flex-col gap-1 text-white/70">
        <span>Target was {record.target}, banked {record.startBankroll}</span>
        <span>+{record.interestEarned} interest</span>
        {record.unusedPlayBonus > 0 && <span>+{record.unusedPlayBonus} unused-play bonus</span>}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105"
      >
        Continue
      </button>
    </div>
  );
}
