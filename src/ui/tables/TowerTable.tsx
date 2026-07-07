import { useRunStore } from '../../store/runStore';
import type { TowerState } from '../../engine/games/tower';
import { towerMultiplier, TOWER_DOORS, TOWER_ROWS } from '../../engine/games/tower';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';

export function TowerTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  if (!run) return null;

  const state = currentRound?.state as TowerState | undefined;
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
            {state.busted ? `Hit a trap on floor ${state.row + 1}` : `Cashed out on floor ${state.row}`}
          </p>
        )}

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <button
          type="button"
          onClick={() => startRound()}
          disabled={run.bankroll <= 0}
          className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105 disabled:opacity-40"
        >
          {resolved ? 'Next Play' : 'Place Bet'}
        </button>
      </div>
    );
  }

  const liveMultiplier = state.row > 0 ? towerMultiplier(state.row) : 1;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-white/70">
        Floor {state.row}/{TOWER_ROWS} &middot; {currentRound.bet} chips
        {state.row > 0 && (
          <>
            {' '}
            &middot; current <span className="font-mono text-amber-300">{liveMultiplier.toFixed(2)}x</span>
          </>
        )}
      </p>

      <div className="flex flex-col-reverse gap-2">
        {Array.from({ length: TOWER_ROWS }, (_, row) => {
          const isCurrent = row === state.row;
          const isCleared = row < state.row;

          return (
            <div key={row} className="flex items-center gap-2">
              <span className="w-6 text-right text-xs text-white/30">{row + 1}</span>
              {Array.from({ length: TOWER_DOORS }, (_, doorIdx) => {
                if (isCurrent) {
                  return (
                    <button
                      key={doorIdx}
                      type="button"
                      onClick={() => submitAction(`door:${doorIdx}`)}
                      className="flex h-10 w-14 items-center justify-center rounded-md bg-white/10 text-lg transition hover:scale-105 hover:bg-white/20"
                    >
                      🚪
                    </button>
                  );
                }
                if (isCleared) {
                  const wasTrap = state.trapDoors[row] === doorIdx;
                  return (
                    <div
                      key={doorIdx}
                      className={`flex h-10 w-14 items-center justify-center rounded-md text-lg ${
                        wasTrap ? 'bg-rose-900/40' : 'bg-emerald-600/50'
                      }`}
                    >
                      {wasTrap ? '💣' : '✓'}
                    </div>
                  );
                }
                return <div key={doorIdx} className="h-10 w-14 rounded-md bg-white/5" />;
              })}
            </div>
          );
        })}
      </div>

      {state.row > 0 && (
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
