import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { ScratchState } from '../../engine/games/scratch';
import { SCRATCH_CELLS, SCRATCH_SYMBOLS, evaluateScratch } from '../../engine/games/scratch';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { TableFrame } from '../components/TableFrame';
import { useReveal } from '../fx/useReveal';
import { playWhoosh, playPing, playCoin, playCardFlip } from '../fx/sound';
import { screenShake } from '../fx/confetti';

const COLS = 3;
const LEAD_MS = 150;
const STAGGER_MS = 150;
const DURATION = LEAD_MS + SCRATCH_CELLS * STAGGER_MS + 500; // ~2000ms

const GLYPH_BY_ID = new Map(SCRATCH_SYMBOLS.map((s) => [s.id, s.glyph] as const));
// "Blank" symbols never pay - render them greyed out so they read as filler, not a missed win.
const DUD_IDS = new Set(SCRATCH_SYMBOLS.filter((s) => s.prizes.every((p) => p === 0)).map((s) => s.id));

export function ScratchTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [revealed, setRevealed] = useState(0); // how many cells have been scratched open

  const state = currentRound?.state as ScratchState | undefined;
  const resolved = state?.resolved ?? false;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const { done } = useReveal(resolved, revealKey, DURATION);
  const animating = resolved && !done;

  const cells = state?.cells ?? [];

  // The symbol ids that actually pay (3+ of a non-blank symbol) - these glow gold.
  const winningIds = useMemo(() => {
    if (!resolved || cells.length !== SCRATCH_CELLS) return new Set<string>();
    const ids = new Set<string>();
    for (const w of evaluateScratch(cells)) if (w.prize > 0) ids.add(w.symbolId);
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey, resolved]);

  // Scratch the 9 cells open one at a time with per-cell cues.
  useEffect(() => {
    if (!resolved || cells.length !== SCRATCH_CELLS) {
      setRevealed(0);
      return;
    }
    setRevealed(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < SCRATCH_CELLS; i++) {
      timers.push(
        setTimeout(() => {
          setRevealed(i + 1);
          playCardFlip();
          if (winningIds.has(cells[i])) playCoin();
          else playPing(0.35 + (i / SCRATCH_CELLS) * 0.5);
          if (i === SCRATCH_CELLS - 1) {
            const payout = state?.payoutMultiplier ?? 0;
            if (payout >= 5) screenShake('heavy');
            else if (payout > 0) screenShake('light');
          }
        }, LEAD_MS + i * STAGGER_MS),
      );
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey, resolved]);

  if (!run) return null;

  const wins = resolved && state ? state.wins.filter((w) => w.prize > 0) : [];
  // Live matches hint: winning glyphs uncovered so far.
  let matchesSoFar = 0;
  for (let i = 0; i < revealed; i++) if (winningIds.has(cells[i])) matchesSoFar++;

  const canScratch = run.bankroll > 0;

  const scratch = () => {
    playWhoosh();
    startRound();
    submitAction('scratch');
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Reserved banner slot to prevent layout jump. */}
      <div className="h-20">
        {resolved && done && currentRound && currentRound.resultDelta !== null && (
          <PlayResultBanner
            key={revealKey}
            delta={currentRound.resultDelta}
            payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
          />
        )}
      </div>

      {/* Live matches counter */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">Matches</span>
        <motion.span
          key={matchesSoFar}
          initial={{ scale: 1 }}
          animate={matchesSoFar > 0 ? { scale: [1, 1.4, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`kg-tnum text-3xl font-black ${matchesSoFar > 0 ? 'kg-gold-text' : 'text-white/70'}`}
        >
          {matchesSoFar}
        </motion.span>
      </div>

      <TableFrame surface="glass">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: SCRATCH_CELLS }, (_, i) => {
            const open = resolved && i < revealed;
            const id = open ? cells[i] : null;
            const glyph = id ? GLYPH_BY_ID.get(id) ?? '' : '';
            const isWin = id != null && winningIds.has(id);
            const isDud = id != null && DUD_IDS.has(id);
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            return (
              <div key={i} className="relative h-24 w-24" style={{ perspective: 600 }}>
                <motion.div
                  initial={false}
                  animate={{ rotateY: open ? 180 : 0 }}
                  transition={{ duration: 0.4, delay: 0 }}
                  style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
                >
                  {/* Foil cover */}
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br from-amber-200/25 via-white/10 to-amber-500/20 text-4xl font-black text-white/35"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span
                      className="drop-shadow"
                      style={{
                        background: 'linear-gradient(135deg,#fff6d5 10%,#c9a24a 45%,#fffbe8 70%,#b8862f 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      ?
                    </span>
                  </div>
                  {/* Revealed glyph */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-xl text-5xl ${
                      isWin
                        ? 'bg-amber-400/20 ring-2 ring-amber-300 shadow-[0_0_22px_rgba(255,207,92,0.65)] kg-anim-pop'
                        : 'bg-white/[0.04] ring-1 ring-white/10'
                    }`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <motion.span
                      initial={open ? { scale: 0.4, opacity: 0 } : false}
                      animate={open ? { scale: isDud ? 0.85 : 1, opacity: isWin ? 1 : isDud ? 0.3 : 0.7 } : {}}
                      transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.12 }}
                      style={isDud ? { filter: 'grayscale(1)' } : undefined}
                    >
                      {glyph}
                    </motion.span>
                    {isWin && (
                      <span
                        className="pointer-events-none absolute inset-0 rounded-xl"
                        style={{ animation: `kg-pulse-glow 1s ease-in-out ${(row + col) * 0.05}s infinite` }}
                      />
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </TableFrame>

      {/* Win list once fully scratched */}
      <div className="h-8">
        <AnimatePresence>
          {resolved && done && (
            <motion.div
              key="wins"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              {wins.length > 0 ? (
                wins.map((w) => (
                  <span
                    key={w.symbolId}
                    className="kg-chip flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-amber-200"
                  >
                    <span className="text-lg">{GLYPH_BY_ID.get(w.symbolId)}</span>
                    <span className="kg-tnum text-white/70">×{w.count}</span>
                    <span className="kg-gold-text">+{w.prize.toFixed(2)}×</span>
                  </span>
                ))
              ) : (
                <span className="text-sm text-white/50">No prize match — better luck next card</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {!resolved && (
          <p className="text-xs text-white/45">Match 3+ of a prize symbol (🪙 💎 🔔 ⭐ 🍀 👑) to win — the rarer, the richer</p>
        )}
      </div>

      <BetSlider bet={bet} max={run.bankroll} onChange={setBet} disabled={animating} />

      <ActionButton
        onClick={scratch}
        disabled={!canScratch || animating}
        variant="action"
        sheen
        silent
      >
        {animating ? 'Scratching…' : resolved ? 'New Card' : 'SCRATCH! 🪙'}
      </ActionButton>
    </div>
  );
}
