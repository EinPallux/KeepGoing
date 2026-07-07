import { useEffect, useState } from 'react';
import { useRunStore } from '../../store/runStore';
import type { CrashState } from '../../engine/games/crash';
import { CRASH_MAX_TARGET, CRASH_MIN_TARGET } from '../../engine/games/crash';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';

const PRESETS = [1.5, 2, 3, 5, 10];

export function CrashTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [target, setTarget] = useState(2);
  const [display, setDisplay] = useState(1);

  const state = currentRound?.state as CrashState | undefined;
  const resolved = state?.resolved ?? false;

  useEffect(() => {
    if (resolved && state?.crashPoint != null) {
      setDisplay(1);
      const raf = requestAnimationFrame(() => setDisplay(state.crashPoint!));
      return () => cancelAnimationFrame(raf);
    }
    setDisplay(1);
  }, [resolved, state?.crashPoint]);

  if (!run) return null;

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
          <p
            className={`text-4xl font-black transition-all duration-700 ${
              state.won ? 'text-emerald-300' : 'text-rose-400'
            }`}
          >
            {display.toFixed(2)}x
          </p>
        )}
        {resolved && state && (
          <p className="text-sm text-white/60">Your target was {state.targetMultiplier.toFixed(2)}x</p>
        )}

        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTarget(p)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                target === p ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {p}x
            </button>
          ))}
        </div>
        <div className="flex w-full max-w-sm flex-col items-center gap-2">
          <input
            type="range"
            min={CRASH_MIN_TARGET}
            max={20}
            step={0.1}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
          <p className="text-sm text-white/70">
            Auto-cashout at <span className="font-mono text-amber-300">{target.toFixed(2)}x</span>
          </p>
        </div>

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <button
          type="button"
          onClick={() => startRound({ targetMultiplier: Math.min(CRASH_MAX_TARGET, target) })}
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
        Target <span className="font-mono text-amber-300">{state.targetMultiplier.toFixed(2)}x</span> &middot;{' '}
        {currentRound.bet} chips on the line.
      </p>
      <button
        type="button"
        onClick={() => submitAction('launch')}
        className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-10 py-4 font-bold text-black transition hover:scale-105"
      >
        Launch
      </button>
    </div>
  );
}
