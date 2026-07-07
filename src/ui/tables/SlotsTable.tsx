import { useRunStore } from '../../store/runStore';
import type { SlotsState } from '../../engine/games/slots';
import { PAYLINES, SYMBOLS } from '../../engine/games/slots';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';

function glyphFor(symbolId: string): string {
  return SYMBOLS.find((s) => s.id === symbolId)?.glyph ?? '?';
}

export function SlotsTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  if (!run) return null;

  const state = currentRound?.state as SlotsState | undefined;
  const resolved = state?.resolved ?? false;
  const hitCells = new Set(resolved && state ? state.hits.flatMap((h) => h.line) : []);

  return (
    <div className="flex flex-col items-center gap-6">
      {resolved && state && currentRound && currentRound.resultDelta !== null && (
        <PlayResultBanner
          key={currentRound.stepIndex}
          delta={currentRound.resultDelta}
          payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
        />
      )}

      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-black/30 p-4">
        {Array.from({ length: 9 }, (_, i) => {
          const symbolId = state?.grid[i];
          const isHit = hitCells.has(i);
          return (
            <div
              key={i}
              className={`flex h-16 w-16 items-center justify-center rounded-lg text-3xl transition ${
                isHit ? 'bg-amber-400/30 ring-2 ring-amber-300' : 'bg-white/5'
              }`}
            >
              {symbolId ? glyphFor(symbolId) : ''}
            </div>
          );
        })}
      </div>

      {resolved && state && state.hits.length > 0 && (
        <p className="text-sm text-white/60">
          {state.hits.length} line{state.hits.length > 1 ? 's' : ''} hit ({PAYLINES.length} paylines checked)
        </p>
      )}

      {!currentRound || resolved ? (
        <>
          <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
          <button
            type="button"
            onClick={() => startRound()}
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
