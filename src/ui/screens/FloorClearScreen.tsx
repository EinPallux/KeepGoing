import type { FloorRecord } from '../../engine/run';

interface FloorClearScreenProps {
  record: FloorRecord;
  onContinue: () => void;
}

export function FloorClearScreen({ record, onContinue }: FloorClearScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm uppercase tracking-widest text-emerald-400">Floor {record.floor} Cleared</p>
      <p className="text-5xl font-black text-amber-300">{record.endBankroll} chips</p>

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
