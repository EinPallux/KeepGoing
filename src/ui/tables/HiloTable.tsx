import { motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { HiloState } from '../../engine/games/hilo';
import { cardRank } from '../../engine/games/hilo';
import { BetSlider } from '../components/BetSlider';
import { CardFace, CardBack } from '../components/CardFace';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { MultiplierBadge } from '../components/MultiplierBadge';
import { TableFrame } from '../components/TableFrame';
import { useReveal } from '../fx/useReveal';
import { playCoin, playCardFlip, playLose, playCashout, playWhoosh } from '../fx/sound';
import { screenShake } from '../fx/confetti';

type Glow = 'none' | 'win' | 'bust';

const RANK_GLYPHS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** The large current card. Keyed on `position` so every new card flips + deals in. */
function CurrentCard({ cardIndex, glow }: { cardIndex: number; glow: Glow }) {
  return (
    <motion.div
      initial={{ y: -34, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 19 }}
      className="relative"
      style={{ perspective: 900 }}
    >
      <div
        className={`pointer-events-none absolute -inset-2 rounded-2xl transition ${
          glow === 'win'
            ? 'ring-2 ring-emerald-400/70 shadow-[0_0_34px_rgba(52,224,161,0.6)]'
            : glow === 'bust'
              ? 'ring-2 ring-rose-500/80 shadow-[0_0_38px_rgba(255,92,122,0.65)] kg-anim-shake'
              : ''
        }`}
      />
      <motion.div
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="relative h-36 w-24"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}>
          <CardFace cardIndex={cardIndex} size="lg" />
        </div>
        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}>
          <CardBack size="lg" />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HiloTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const state = currentRound?.state as HiloState | undefined;
  const resolved = state?.resolved ?? false;
  const busted = state?.busted ?? false;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const { done } = useReveal(resolved, revealKey, busted ? 1300 : 1200);

  if (!run) return null;

  // --- Setup / result screen ---
  if (!state || (resolved && done)) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="h-20">
          {resolved && done && currentRound && currentRound.resultDelta !== null && (
            <PlayResultBanner
              key={revealKey}
              delta={currentRound.resultDelta}
              payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
            />
          )}
        </div>
        {resolved && done && state && (
          <p className="text-sm text-white/60">
            {state.busted
              ? `Wrong call after ${state.position - 1} correct guess${state.position - 1 === 1 ? '' : 'es'}`
              : `Cashed out at ${state.chainMultiplier.toFixed(2)}× on a ${state.position}-card chain`}
          </p>
        )}

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <ActionButton onClick={() => startRound()} disabled={run.bankroll <= 0} sheen>
          {resolved ? 'Play Again' : 'Place Bet'}
        </ActionButton>
      </div>
    );
  }

  // --- Interactive board (in play or final reveal) ---
  const currentIndex = state.deck[state.position];
  const currentRank = cardRank(currentIndex);
  const pool = state.deck.slice(state.position + 1);
  const canHigher = pool.some((c) => cardRank(c) > currentRank);
  const canLower = pool.some((c) => cardRank(c) < currentRank);
  const canCashOut = state.position > 0 && !resolved;
  const glow: Glow = busted ? 'bust' : state.position > 0 ? 'win' : 'none';
  const cardsLeft = pool.length;

  const guess = (dir: 'higher' | 'lower') => {
    if (resolved) return;
    playCardFlip();
    playWhoosh();
    submitAction(dir);
    const st = useRunStore.getState().currentRound?.state as HiloState | undefined;
    if (!st) return;
    if (st.busted) {
      playLose();
      screenShake('light');
    } else if (st.cashedOut) {
      // Deck exhausted -> auto cash out.
      playCashout();
    } else {
      playCoin();
    }
  };

  const cashOut = () => {
    submitAction('cashout');
    playCashout();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <MultiplierBadge
        value={state.chainMultiplier}
        tone={busted ? 'loss' : state.position > 0 ? 'win' : 'live'}
        size="lg"
        label="chain"
      />

      <TableFrame surface="felt" className="w-full max-w-md">
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">current</span>
            <CurrentCard key={state.position} cardIndex={currentIndex} glow={glow} />
            <span className="kg-tnum text-lg font-black text-white/85">{RANK_GLYPHS[currentRank - 1]}</span>
          </div>

          <span className="text-2xl text-white/30">vs</span>

          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">next</span>
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
              <CardBack size="lg" />
            </motion.div>
            <span className="text-xs text-white/40">{cardsLeft} left</span>
          </div>
        </div>
      </TableFrame>

      <div className="flex gap-3">
        <ActionButton onClick={() => guess('higher')} disabled={!canHigher || resolved} variant="action" silent>
          ▲ Higher
        </ActionButton>
        <ActionButton onClick={() => guess('lower')} disabled={!canLower || resolved} variant="primary" silent>
          ▼ Lower
        </ActionButton>
      </div>

      <div className="h-14 flex items-center">
        {canCashOut && (
          <ActionButton onClick={cashOut} variant="cash" silent>
            Cash Out {state.chainMultiplier.toFixed(2)}×
          </ActionButton>
        )}
      </div>
    </div>
  );
}
