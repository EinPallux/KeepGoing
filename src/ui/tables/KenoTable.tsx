import { useState } from 'react';
import { useRunStore } from '../../store/runStore';
import type { KenoState } from '../../engine/games/keno';
import { KENO_PICK_COUNT, KENO_POOL_SIZE } from '../../engine/games/keno';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';

export function KenoTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [picks, setPicks] = useState<number[]>([]);

  if (!run) return null;

  const state = currentRound?.state as KenoState | undefined;
  const resolved = state?.resolved ?? false;

  function toggle(n: number) {
    setPicks((cur) => {
      if (cur.includes(n)) return cur.filter((x) => x !== n);
      if (cur.length >= KENO_PICK_COUNT) return cur;
      return [...cur, n];
    });
  }

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
        {resolved && state && <p className="text-sm text-white/60">{state.hits} of {state.picks.length} hit</p>}

        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: KENO_POOL_SIZE }, (_, i) => i + 1).map((n) => {
            const picked = resolved ? state?.picks.includes(n) : picks.includes(n);
            const drawn = resolved && state?.drawn?.includes(n);
            return (
              <button
                key={n}
                type="button"
                disabled={resolved}
                onClick={() => toggle(n)}
                className={`flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold transition ${
                  drawn && picked
                    ? 'bg-emerald-500 text-black'
                    : drawn
                      ? 'bg-amber-400/60 text-black'
                      : picked
                        ? 'bg-pink-500 text-black'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <button
          type="button"
          onClick={() => startRound({ picks })}
          disabled={run.bankroll <= 0 || picks.length !== KENO_PICK_COUNT}
          className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105 disabled:opacity-40"
        >
          {resolved ? 'Next Play' : `Place Bet (${picks.length}/${KENO_PICK_COUNT})`}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-white/70">{currentRound.bet} chips on {state.picks.join(', ')}.</p>
      <button
        type="button"
        onClick={() => submitAction('draw')}
        className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-10 py-4 font-bold text-black transition hover:scale-105"
      >
        Draw
      </button>
    </div>
  );
}
