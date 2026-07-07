import { useState } from 'react';
import { useRunStore } from '../../store/runStore';
import type { WheelRisk, WheelState } from '../../engine/games/wheel';
import { WHEEL_SEGMENTS } from '../../engine/games/wheel';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';

const RISKS: WheelRisk[] = ['low', 'medium', 'high'];

export function WheelTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [risk, setRisk] = useState<WheelRisk>('medium');

  if (!run) return null;

  const state = currentRound?.state as WheelState | undefined;
  const resolved = state?.resolved ?? false;
  const activeRisk = state?.risk ?? risk;

  return (
    <div className="flex flex-col items-center gap-6">
      {resolved && state && currentRound && currentRound.resultDelta !== null && (
        <PlayResultBanner
          key={currentRound.stepIndex}
          delta={currentRound.resultDelta}
          payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
        />
      )}

      <div className="flex flex-wrap justify-center gap-1 rounded-xl bg-black/30 p-3">
        {WHEEL_SEGMENTS[activeRisk].map((mult, i) => (
          <div
            key={i}
            className={`flex h-10 w-10 items-center justify-center rounded text-xs font-bold transition ${
              resolved && state?.segmentIndex === i ? 'bg-amber-400 text-black ring-2 ring-white' : 'bg-white/10 text-white/60'
            }`}
          >
            {mult}x
          </div>
        ))}
      </div>

      {!currentRound || resolved ? (
        <>
          <div className="flex gap-2">
            {RISKS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRisk(r)}
                className={`rounded-full px-5 py-2 font-bold capitalize transition ${
                  risk === r ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
          <button
            type="button"
            onClick={() => startRound({ risk })}
            disabled={run.bankroll <= 0}
            className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105 disabled:opacity-40"
          >
            {resolved ? 'Next Play' : 'Place Bet'}
          </button>
        </>
      ) : (
        <>
          <p className="text-white/70">{currentRound.bet} chips on the line.</p>
          <button
            type="button"
            onClick={() => submitAction('spin')}
            className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-10 py-4 font-bold text-black transition hover:scale-105"
          >
            Spin
          </button>
        </>
      )}
    </div>
  );
}
