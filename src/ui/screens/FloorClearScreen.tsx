import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { FloorRecord } from '../../engine/run';
import { fireFloorClear } from '../fx/confetti';
import { playFloorClear } from '../fx/sound';
import { BigCounter } from '../components/BigCounter';
import { ActionButton } from '../components/ActionButton';

interface FloorClearScreenProps {
  record: FloorRecord;
  onContinue: () => void;
}

export function FloorClearScreen({ record, onContinue }: FloorClearScreenProps) {
  useEffect(() => {
    fireFloorClear();
    playFloorClear();
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.p
        initial={{ opacity: 0, letterSpacing: '0.6em' }}
        animate={{ opacity: 1, letterSpacing: '0.3em' }}
        className="text-sm font-bold uppercase text-emerald-400"
      >
        ✦ Floor {record.floor} Cleared ✦
      </motion.p>

      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 15 }}
        className="text-6xl font-black"
      >
        <span className="kg-gold-text">
          <BigCounter value={record.endBankroll} />
        </span>{' '}
        <span className="text-2xl text-white/50">chips</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="kg-glass flex flex-col gap-1 rounded-2xl px-8 py-4 text-white/70"
      >
        <span>
          Target was {record.target.toLocaleString()} · banked {record.startBankroll.toLocaleString()}
        </span>
        <span className="text-emerald-300">+{record.interestEarned.toLocaleString()} interest</span>
        {record.unusedPlayBonus > 0 && (
          <span className="text-amber-300">+{record.unusedPlayBonus.toLocaleString()} unused-play bonus</span>
        )}
      </motion.div>

      <ActionButton onClick={onContinue} sheen>
        To the Shop →
      </ActionButton>
    </div>
  );
}
