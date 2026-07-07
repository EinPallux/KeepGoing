import { useState } from 'react';
import { useRunStore } from '../../store/runStore';
import type { MinesState } from '../../engine/games/mines';
import { MINE_COUNT_OPTIONS, MINES_GRID_SIZE, minesMultiplier } from '../../engine/games/mines';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';

export function MinesTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [mineCount, setMineCount] = useState<number>(MINE_COUNT_OPTIONS[1]);

  if (!run) return null;

  const state = currentRound?.state as MinesState | undefined;
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
            {state.busted ? `Hit a mine after ${state.revealed.length - 1} safe reveals` : `Cashed out after ${state.revealed.length} safe reveals`}
          </p>
        )}

        <div className="flex gap-2">
          {MINE_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setMineCount(count)}
              className={`rounded-full px-5 py-2 font-bold transition ${
                mineCount === count ? 'bg-rose-500 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {count} mines
            </button>
          ))}
        </div>

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <button
          type="button"
          onClick={() => startRound({ mineCount })}
          disabled={run.bankroll <= 0}
          className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105 disabled:opacity-40"
        >
          {resolved ? 'Next Play' : 'Place Bet'}
        </button>
      </div>
    );
  }

  const revealedCount = state.revealed.length;
  const liveMultiplier = revealedCount > 0 ? minesMultiplier(state.mineCount, revealedCount) : 1;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-white/70">
        {state.mineCount} mines &middot; {currentRound.bet} chips on the line
        {revealedCount > 0 && (
          <>
            {' '}
            &middot; current <span className="font-mono text-amber-300">{liveMultiplier.toFixed(2)}x</span>
          </>
        )}
      </p>

      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: MINES_GRID_SIZE }, (_, i) => {
          const isRevealed = state.revealed.includes(i);
          const isMine = state.minePositions.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={isRevealed}
              onClick={() => submitAction(`reveal:${i}`)}
              className={`flex h-14 w-14 items-center justify-center rounded-lg text-2xl transition ${
                isRevealed
                  ? isMine
                    ? 'bg-rose-600/80'
                    : 'bg-emerald-600/60'
                  : 'bg-white/10 hover:scale-105 hover:bg-white/20'
              }`}
            >
              {isRevealed ? (isMine ? '💣' : '💎') : ''}
            </button>
          );
        })}
      </div>

      {revealedCount > 0 && (
        <button
          type="button"
          onClick={() => submitAction('cashout')}
          className="rounded-full bg-emerald-500 px-8 py-3 font-bold text-black transition hover:scale-105"
        >
          Cash Out {liveMultiplier.toFixed(2)}x
        </button>
      )}
    </div>
  );
}
