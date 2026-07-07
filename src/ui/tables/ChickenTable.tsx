import { useState } from 'react';
import { useRunStore } from '../../store/runStore';
import type { ChickenDifficulty, ChickenState } from '../../engine/games/chicken';
import { chickenMultiplier, CHICKEN_LANES } from '../../engine/games/chicken';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';

const DIFFICULTIES: ChickenDifficulty[] = ['easy', 'medium', 'hard'];

export function ChickenTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [difficulty, setDifficulty] = useState<ChickenDifficulty>('medium');

  if (!run) return null;

  const state = currentRound?.state as ChickenState | undefined;
  const resolved = state?.resolved ?? false;

  if (!currentRound || !state || resolved) {
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
            {state.busted ? `Hit at lane ${state.lane + 1}` : `Cashed out after ${state.lane} lanes`}
          </p>
        )}

        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`rounded-full px-5 py-2 font-bold capitalize transition ${
                difficulty === d ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <button
          type="button"
          onClick={() => startRound({ difficulty })}
          disabled={run.bankroll <= 0}
          className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105 disabled:opacity-40"
        >
          {resolved ? 'Next Play' : 'Place Bet'}
        </button>
      </div>
    );
  }

  const liveMultiplier = state.lane > 0 ? chickenMultiplier(state.difficulty, state.lane) : 1;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-white/70">
        Lane {state.lane}/{CHICKEN_LANES} &middot; {currentRound.bet} chips
        {state.lane > 0 && (
          <>
            {' '}
            &middot; current <span className="font-mono text-amber-300">{liveMultiplier.toFixed(2)}x</span>
          </>
        )}
      </p>

      <div className="flex gap-1">
        {Array.from({ length: CHICKEN_LANES }, (_, i) => (
          <div
            key={i}
            className={`flex h-10 w-8 items-center justify-center rounded ${
              i < state.lane ? 'bg-emerald-600/60' : 'bg-white/10'
            }`}
          >
            {i < state.lane ? '🐔' : ''}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => submitAction('cross')}
          className="rounded-full bg-cyan-500/90 px-8 py-3 font-bold text-black transition hover:scale-105"
        >
          Cross
        </button>
        {state.lane > 0 && (
          <button
            type="button"
            onClick={() => submitAction('cashout')}
            className="rounded-full bg-emerald-500 px-8 py-3 font-bold text-black transition hover:scale-105"
          >
            Cash Out {liveMultiplier.toFixed(2)}x
          </button>
        )}
      </div>
    </div>
  );
}
