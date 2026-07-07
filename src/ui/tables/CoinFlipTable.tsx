import { useRunStore } from '../../store/runStore';
import type { CoinFlipState } from '../../engine/games/coinflip';
import { BetSlider } from '../components/BetSlider';

export function CoinFlipTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  if (!run) return null;

  const state = currentRound?.state as CoinFlipState | undefined;
  const resolved = state?.resolved ?? false;

  if (!currentRound || resolved) {
    return (
      <div className="flex flex-col items-center gap-6">
        {resolved && state && (
          <div
            className={`rounded-xl px-6 py-4 text-center ${
              state.won ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
            }`}
          >
            <p className="text-sm uppercase tracking-wide opacity-70">
              You called {state.call} &middot; it landed {state.result}
            </p>
            <p className="text-2xl font-bold">
              {state.won ? `+${currentRound!.bet} chips` : `-${currentRound!.bet} chips`}
            </p>
          </div>
        )}
        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <button
          type="button"
          onClick={startRound}
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
      <p className="text-white/70">Heads or tails? {currentRound.bet} chips on the line.</p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => submitAction('heads')}
          className="rounded-full bg-cyan-500/90 px-8 py-3 font-bold text-black transition hover:scale-105"
        >
          Heads
        </button>
        <button
          type="button"
          onClick={() => submitAction('tails')}
          className="rounded-full bg-violet-500/90 px-8 py-3 font-bold text-black transition hover:scale-105"
        >
          Tails
        </button>
      </div>
    </div>
  );
}
