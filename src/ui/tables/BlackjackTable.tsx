import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { BlackjackState, BlackjackOutcome } from '../../engine/games/blackjack';
import { handValue, isBlackjack } from '../../engine/games/blackjack';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { TableFrame } from '../components/TableFrame';
import { PlayingCard } from '../components/CardFace';
import { useReveal } from '../fx/useReveal';
import { playWhoosh, playCardFlip, playExplosion, playCoin } from '../fx/sound';
import { screenShake } from '../fx/confetti';

interface Flourish {
  text: string;
  className: string;
}

const FLOURISH: Record<BlackjackOutcome, Flourish> = {
  blackjack: { text: 'BLACKJACK!', className: 'text-amber-300' },
  win: { text: 'YOU WIN', className: 'text-emerald-300' },
  push: { text: 'PUSH', className: 'text-white/80' },
  loss: { text: 'DEALER WINS', className: 'text-rose-300' },
  bust: { text: 'BUST', className: 'text-rose-400' },
};

function HandLabel({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold">
      <span className="uppercase tracking-widest text-white/45">{label}</span>
      <span className={`kg-tnum rounded-lg px-2 py-0.5 ${tone}`}>{value}</span>
    </div>
  );
}

export function BlackjackTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const state = currentRound?.state as BlackjackState | undefined;
  const resolved = state?.resolved ?? false;
  const outcome = state?.outcome ?? null;
  const dealerLen = state?.dealerCards.length ?? 2;

  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const revealMs = 700 + dealerLen * 320 + (outcome === 'bust' || outcome === 'blackjack' ? 300 : 0);
  const { done } = useReveal(resolved, revealKey, revealMs);

  // How many dealer cards are currently face-up during the resolve sequence.
  const [dealerUp, setDealerUp] = useState(0);

  useEffect(() => {
    if (!resolved || !state) {
      setDealerUp(0);
      return;
    }
    const total = state.dealerCards.length;
    const bust = state.outcome === 'bust';
    setDealerUp(1); // first dealer card is already face-up from the player phase
    const timers: number[] = [];
    for (let i = 2; i <= total; i++) {
      timers.push(
        window.setTimeout(() => {
          setDealerUp(i);
          playCardFlip();
          if (i === 2 && bust) {
            playExplosion();
            screenShake('heavy');
          } else if (i === total && !bust && (state.outcome === 'win' || state.outcome === 'blackjack')) {
            playCoin();
          }
        }, 320 + (i - 2) * 320),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, revealKey]);

  if (!run) return null;

  // ---------- Setup / result screen ----------
  if (!state || (resolved && done)) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-24 items-center">
          {resolved && done && currentRound && currentRound.resultDelta !== null && (
            <PlayResultBanner
              key={revealKey}
              delta={currentRound.resultDelta}
              payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
            />
          )}
        </div>
        {resolved && done && state && outcome && (
          <p className="kg-tnum text-sm text-white/55">
            You {handValue(state.playerCards)} · Dealer {handValue(state.dealerCards)}
          </p>
        )}
        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <ActionButton
          onClick={() => {
            startRound();
            playWhoosh();
            playCardFlip();
          }}
          disabled={run.bankroll <= 0}
          sheen
          silent
        >
          {resolved ? 'Deal Again' : 'Deal'}
        </ActionButton>
      </div>
    );
  }

  // ---------- Board (in play or dealer reveal) ----------
  const dealerCards = state.dealerCards;
  const dealerUpCount = resolved ? dealerUp : 1;
  const dealerVisible = resolved ? Math.max(2, dealerUp) : 2;
  const playerValue = handValue(state.playerCards);
  const dealerShownValue = handValue(dealerCards.slice(0, dealerUpCount));
  const allDealerRevealed = resolved && dealerUp >= dealerLen;
  const canDouble = state.playerCards.length === 2 && !resolved;
  const playerBJ = isBlackjack(state.playerCards);

  const hit = () => {
    submitAction('hit');
    const st = useRunStore.getState().currentRound?.state as BlackjackState | undefined;
    playCardFlip();
    if (st?.resolved && st.outcome !== 'bust') playWhoosh();
  };
  const stand = () => {
    submitAction('stand');
    playWhoosh();
  };
  const double = () => {
    submitAction('double');
    playCardFlip();
    const st = useRunStore.getState().currentRound?.state as BlackjackState | undefined;
    if (st?.resolved && st.outcome !== 'bust') playWhoosh();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <TableFrame surface="felt" className="w-full max-w-md flex-col gap-5">
        {/* Dealer */}
        <div className="flex w-full flex-col items-center gap-2">
          <HandLabel
            label="Dealer"
            value={resolved ? String(dealerShownValue) : '?'}
            tone={allDealerRevealed && dealerShownValue > 21 ? 'bg-rose-500/25 text-rose-200' : 'bg-black/30 text-white'}
          />
          <div className="flex min-h-[7.5rem] items-center gap-2">
            {dealerCards.slice(0, dealerVisible).map((c, i) => (
              <PlayingCard key={`d-${i}-${c}`} cardIndex={c} faceDown={i >= dealerUpCount} size="md" index={i} />
            ))}
          </div>
        </div>

        {/* Outcome flourish */}
        <div className="flex h-8 items-center justify-center">
          <AnimatePresence>
            {allDealerRevealed && outcome && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                className={`kg-anim-pop text-2xl font-black uppercase tracking-widest ${FLOURISH[outcome].className}`}
                style={{ textShadow: '0 0 22px currentColor' }}
              >
                {FLOURISH[outcome].text}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Player */}
        <div className="flex w-full flex-col items-center gap-2">
          <div className="flex min-h-[7.5rem] items-center gap-2">
            {state.playerCards.map((c, i) => (
              <PlayingCard key={`p-${i}-${c}`} cardIndex={c} size="md" index={i} />
            ))}
          </div>
          <HandLabel
            label="You"
            value={String(playerValue)}
            tone={
              playerValue > 21
                ? 'bg-rose-500/30 text-rose-100'
                : playerBJ
                  ? 'bg-amber-400/25 text-amber-200'
                  : 'bg-emerald-500/20 text-emerald-100'
            }
          />
        </div>
      </TableFrame>

      {/* Controls */}
      {!resolved && (
        <div className="flex items-center gap-3">
          <ActionButton onClick={hit} variant="action">
            Hit
          </ActionButton>
          <ActionButton onClick={stand} variant="primary">
            Stand
          </ActionButton>
          {canDouble && (
            <ActionButton onClick={double} variant="cash">
              Double
            </ActionButton>
          )}
        </div>
      )}
      {resolved && !done && <p className="text-sm text-white/40">Dealer plays…</p>}
    </div>
  );
}
