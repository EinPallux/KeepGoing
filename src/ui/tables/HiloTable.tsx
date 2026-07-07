import { useRunStore } from '../../store/runStore';
import type { HiloState } from '../../engine/games/hilo';
import { cardRank, cardSuit } from '../../engine/games/hilo';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';

const RANK_GLYPHS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_GLYPHS = ['♠', '♥', '♦', '♣'];
const SUIT_COLOR: Record<number, string> = { 0: 'text-white', 1: 'text-rose-400', 2: 'text-rose-400', 3: 'text-white' };

function CardFace({ cardIndex }: { cardIndex: number }) {
  const rank = RANK_GLYPHS[cardRank(cardIndex) - 1];
  const suit = cardSuit(cardIndex);
  return (
    <div className="flex h-28 w-20 flex-col items-center justify-center rounded-xl border border-white/20 bg-white/95 shadow-lg">
      <span className={`text-2xl font-black ${SUIT_COLOR[suit]}`}>{rank}</span>
      <span className={`text-3xl ${SUIT_COLOR[suit]}`}>{SUIT_GLYPHS[suit]}</span>
    </div>
  );
}

export function HiloTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  if (!run) return null;

  const state = currentRound?.state as HiloState | undefined;
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
        {resolved && state && <CardFace cardIndex={state.deck[state.position]} />}
        {resolved && state && (
          <p className="text-sm text-white/60">
            {state.busted ? 'Wrong call' : 'Cashed out'} at {state.chainMultiplier.toFixed(2)}x
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

  const canHigher = state.deck.slice(state.position + 1).some((c) => cardRank(c) > cardRank(state.deck[state.position]));
  const canLower = state.deck.slice(state.position + 1).some((c) => cardRank(c) < cardRank(state.deck[state.position]));
  const canCashOut = state.position > 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-white/70">
        {currentRound.bet} chips &middot; chain <span className="font-mono text-amber-300">{state.chainMultiplier.toFixed(2)}x</span>
      </p>
      <CardFace cardIndex={state.deck[state.position]} />
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => submitAction('higher')}
          disabled={!canHigher}
          className="rounded-full bg-cyan-500/90 px-6 py-3 font-bold text-black transition hover:scale-105 disabled:opacity-30"
        >
          Higher
        </button>
        <button
          type="button"
          onClick={() => submitAction('lower')}
          disabled={!canLower}
          className="rounded-full bg-violet-500/90 px-6 py-3 font-bold text-black transition hover:scale-105 disabled:opacity-30"
        >
          Lower
        </button>
      </div>
      {canCashOut && (
        <button
          type="button"
          onClick={() => submitAction('cashout')}
          className="rounded-full bg-emerald-500 px-8 py-3 font-bold text-black transition hover:scale-105"
        >
          Cash Out {state.chainMultiplier.toFixed(2)}x
        </button>
      )}
    </div>
  );
}
