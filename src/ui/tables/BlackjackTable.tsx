import { useRunStore } from '../../store/runStore';
import type { BlackjackState } from '../../engine/games/blackjack';
import { handValue } from '../../engine/games/blackjack';
import { BetSlider } from '../components/BetSlider';
import { CardBack, CardFace } from '../components/CardFace';
import { PlayResultBanner } from '../components/PlayResultBanner';

const OUTCOME_LABEL: Record<string, string> = {
  blackjack: 'Blackjack!',
  win: 'You win',
  push: 'Push',
  loss: 'Dealer wins',
  bust: 'Bust',
};

export function BlackjackTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  if (!run) return null;

  const state = currentRound?.state as BlackjackState | undefined;
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
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-white/60">{OUTCOME_LABEL[state.outcome ?? '']}</p>
            <div className="flex gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs uppercase text-white/40">You ({handValue(state.playerCards)})</span>
                <div className="flex gap-1">
                  {state.playerCards.map((c, i) => (
                    <CardFace key={i} cardIndex={c} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs uppercase text-white/40">Dealer ({handValue(state.dealerCards)})</span>
                <div className="flex gap-1">
                  {state.dealerCards.map((c, i) => (
                    <CardFace key={i} cardIndex={c} />
                  ))}
                </div>
              </div>
            </div>
          </div>
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

  const canDouble = state.playerCards.length === 2;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs uppercase text-white/40">Dealer</span>
        <div className="flex gap-1">
          <CardFace cardIndex={state.dealerCards[0]} />
          <CardBack />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-xs uppercase text-white/40">You ({handValue(state.playerCards)})</span>
        <div className="flex gap-1">
          {state.playerCards.map((c, i) => (
            <CardFace key={i} cardIndex={c} />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => submitAction('hit')}
          className="rounded-full bg-cyan-500/90 px-6 py-3 font-bold text-black transition hover:scale-105"
        >
          Hit
        </button>
        <button
          type="button"
          onClick={() => submitAction('stand')}
          className="rounded-full bg-violet-500/90 px-6 py-3 font-bold text-black transition hover:scale-105"
        >
          Stand
        </button>
        {canDouble && (
          <button
            type="button"
            onClick={() => submitAction('double')}
            className="rounded-full bg-emerald-500 px-6 py-3 font-bold text-black transition hover:scale-105"
          >
            Double
          </button>
        )}
      </div>
    </div>
  );
}
