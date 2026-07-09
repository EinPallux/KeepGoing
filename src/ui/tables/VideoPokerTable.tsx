import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { VideoPokerState, PokerHand } from '../../engine/games/videopoker';
import { VIDEO_POKER_PAYTABLE, HAND_LABEL } from '../../engine/games/videopoker';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { TableFrame } from '../components/TableFrame';
import { PlayingCard } from '../components/CardFace';
import { useReveal } from '../fx/useReveal';
import { playWhoosh, playCardFlip, playSelect } from '../fx/sound';
import { screenShake } from '../fx/confetti';

// High-to-low display order for the paytable panel (skip the 0-pay "nothing").
const PAYTABLE_ORDER: PokerHand[] = [
  'royal_flush',
  'straight_flush',
  'four_kind',
  'full_house',
  'flush',
  'straight',
  'three_kind',
  'two_pair',
  'jacks_or_better',
];

// Deal-in flip timing (kept comfortably inside the 1300ms reveal window).
const FLIP_LEAD_MS = 240;
const FLIP_STEP_MS = 120;

export function VideoPokerTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const state = currentRound?.state as VideoPokerState | undefined;
  const resolved = state?.resolved ?? false;
  const handRank = state?.handRank ?? null;
  const payoutMultiplier = state?.payoutMultiplier ?? 0;
  const won = payoutMultiplier > 0;

  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const { done } = useReveal(resolved, revealKey, 1300);

  // How many of the replaced (non-held) cards have flipped face-up so far, and
  // whether the final hand-rank flourish should show yet.
  const [flippedCount, setFlippedCount] = useState(0);
  const [showRank, setShowRank] = useState(false);

  useEffect(() => {
    if (!resolved || !state) {
      setFlippedCount(0);
      setShowRank(false);
      return;
    }
    setFlippedCount(0);
    setShowRank(false);
    const replacedCount = state.held.filter((h) => !h).length;
    const rankWon = state.payoutMultiplier > 0;
    const mult = state.payoutMultiplier;
    const timers: number[] = [];
    for (let k = 1; k <= replacedCount; k++) {
      timers.push(
        window.setTimeout(() => {
          setFlippedCount(k);
          playCardFlip();
        }, FLIP_LEAD_MS + (k - 1) * FLIP_STEP_MS),
      );
    }
    const rankDelay = FLIP_LEAD_MS + replacedCount * FLIP_STEP_MS + 120;
    timers.push(
      window.setTimeout(() => {
        setShowRank(true);
        // Just the shake here; the win fanfare + confetti fire once via
        // PlayResultBanner when the reveal finishes (avoids double-celebrating).
        if (rankWon) screenShake(mult >= 5 ? 'heavy' : 'light');
      }, rankDelay),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, revealKey]);

  if (!run) return null;

  // ---------- Pre-deal setup (no hand dealt yet) ----------
  if (!state) {
    return (
      <div className="flex flex-col items-center gap-6">
        <p className="max-w-sm text-center text-white/50">Deal five cards, hold your keepers, then draw the rest. Jacks or better pays.</p>
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
          Deal
        </ActionButton>
      </div>
    );
  }

  // ---------- Interactive board (hold / draw / reveal) ----------
  // Order among the non-held cards, so their flips can stagger left-to-right.
  const replacedOrder = new Map<number, number>();
  {
    let o = 0;
    state.hand.forEach((_, i) => {
      if (!state.held[i]) {
        replacedOrder.set(i, o);
        o++;
      }
    });
  }

  const flourishClass =
    payoutMultiplier >= 5
      ? 'kg-gold-text'
      : won
        ? 'text-emerald-300'
        : 'text-rose-300';

  const toggleHold = (i: number) => {
    if (resolved) return;
    submitAction(`hold:${i}`);
    playSelect();
  };

  const draw = () => {
    submitAction('draw');
    playWhoosh();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Hand-rank flourish (revealed after the draw lands) */}
      <div className="flex h-11 items-center justify-center">
        <AnimatePresence>
          {resolved && showRank && handRank && (
            <motion.span
              key={revealKey}
              initial={{ opacity: 0, scale: 0.5, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 15 }}
              className={`kg-anim-pop text-3xl font-black uppercase tracking-widest ${flourishClass}`}
              style={{ textShadow: '0 0 24px currentColor' }}
            >
              {HAND_LABEL[handRank]}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <TableFrame surface="felt" className="flex-col gap-4">
        {/* The five cards */}
        <div className="w-full overflow-x-auto">
          <div className="flex justify-center gap-4 px-2">
            {state.hand.map((card, i) => {
              const held = state.held[i];
              const order = replacedOrder.get(i) ?? 0;
              // Replaced cards deal in face-down, then flip up in sequence.
              const faceDown = resolved && !held && order >= flippedCount;
              return (
                <div key={`slot-${i}`} className="flex flex-col items-center gap-2">
                  <div className="flex h-7 items-center">
                    <AnimatePresence>
                      {held && (
                        <motion.span
                          initial={{ opacity: 0, y: 8, scale: 0.6 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          className="kg-anim-pulse-glow rounded-full bg-amber-400 px-3 py-0.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_16px_rgba(255,207,92,0.85)]"
                        >
                          Held
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <motion.button
                    type="button"
                    disabled={resolved}
                    onClick={() => toggleHold(i)}
                    whileHover={resolved ? undefined : { y: -8 }}
                    whileTap={resolved ? undefined : { scale: 0.96 }}
                    className={`rounded-xl transition-shadow ${
                      held
                        ? 'ring-4 ring-amber-400/80 shadow-[0_0_26px_rgba(255,207,92,0.5)]'
                        : ''
                    } ${resolved ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <PlayingCard key={`card-${i}-${card}`} cardIndex={card} faceDown={faceDown} size="lg" index={i} />
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compact paytable */}
        <div className="kg-glass w-full max-w-lg rounded-xl p-3">
          <div className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-white/40">
            Paytable
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            {PAYTABLE_ORDER.map((h) => {
              const achieved = resolved && showRank && handRank === h;
              return (
                <div
                  key={h}
                  className={`flex items-center justify-between rounded-md px-3 py-1 text-sm transition-colors ${
                    achieved
                      ? 'kg-anim-pop bg-amber-400 font-black text-black shadow-[0_0_18px_rgba(255,207,92,0.8)]'
                      : 'text-white/65'
                  }`}
                >
                  <span className="truncate">{HAND_LABEL[h]}</span>
                  <span className="kg-tnum ml-2 font-bold">{VIDEO_POKER_PAYTABLE[h]}×</span>
                </div>
              );
            })}
          </div>
        </div>
      </TableFrame>

      {/* Controls */}
      {!resolved && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-white/45">Tap cards to hold, then draw the rest</p>
          <ActionButton onClick={draw} variant="primary" sheen silent>
            DRAW
          </ActionButton>
        </div>
      )}
      {resolved && !done && <p className="text-sm text-white/40">Dealing…</p>}
      {resolved && done && (
        <div className="flex flex-col items-center gap-4">
          {currentRound && currentRound.resultDelta !== null && (
            <PlayResultBanner
              key={revealKey}
              delta={currentRound.resultDelta}
              payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
            />
          )}
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
            Deal Again
          </ActionButton>
        </div>
      )}
    </div>
  );
}
