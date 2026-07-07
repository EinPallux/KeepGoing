import { useState } from 'react';
import { useRunStore } from '../../store/runStore';
import type { DiceConfig, DiceDirection, DiceState } from '../../engine/games/dice';
import { DICE_MAX_THRESHOLD, DICE_MIN_THRESHOLD, dicePayoutMultiplier, diceWinChance } from '../../engine/games/dice';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';

export function DiceTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [direction, setDirection] = useState<DiceDirection>('under');
  const [threshold, setThreshold] = useState(50);

  if (!run) return null;

  const state = currentRound?.state as DiceState | undefined;
  const resolved = state?.resolved ?? false;

  if (!currentRound || resolved) {
    const chance = diceWinChance(direction, threshold);
    const payout = dicePayoutMultiplier(direction, threshold);
    const config: DiceConfig = { direction, threshold };

    return (
      <div className="flex flex-col items-center gap-6">
        {resolved && state && currentRound && currentRound.resultDelta !== null && (
          <PlayResultBanner
            key={currentRound.stepIndex}
            delta={currentRound.resultDelta}
            payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
          />
        )}
        {resolved && state && (
          <p className="text-sm text-white/60">
            Rolled <span className="font-mono text-amber-300">{state.roll}</span> &middot; called {state.direction} {state.threshold}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDirection('under')}
            className={`rounded-full px-5 py-2 font-bold transition ${
              direction === 'under' ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Under
          </button>
          <button
            type="button"
            onClick={() => setDirection('over')}
            className={`rounded-full px-5 py-2 font-bold transition ${
              direction === 'over' ? 'bg-violet-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            Over
          </button>
        </div>

        <div className="flex w-full max-w-sm flex-col items-center gap-2">
          <input
            type="range"
            min={DICE_MIN_THRESHOLD}
            max={DICE_MAX_THRESHOLD}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
          <p className="text-sm text-white/70">
            Roll {direction} <span className="font-mono text-amber-300">{threshold}</span> &middot;{' '}
            {(chance * 100).toFixed(0)}% chance &middot; {payout.toFixed(2)}x payout
          </p>
        </div>

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <button
          type="button"
          onClick={() => startRound(config)}
          disabled={run.bankroll <= 0}
          className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105 disabled:opacity-40"
        >
          {resolved ? 'Next Play' : 'Place Bet'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-white/70">
        Rolling {state?.direction} {state?.threshold}&hellip; {currentRound.bet} chips on the line.
      </p>
      <button
        type="button"
        onClick={() => submitAction('roll')}
        className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-10 py-4 font-bold text-black transition hover:scale-105"
      >
        Roll
      </button>
    </div>
  );
}
