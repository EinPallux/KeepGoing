import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { SlotsState } from '../../engine/games/slots';
import { PAYLINES, REEL_COUNT, ROW_COUNT, SYMBOLS } from '../../engine/games/slots';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { TableFrame } from '../components/TableFrame';
import { useReveal } from '../fx/useReveal';
import { playReelStop, playWhoosh } from '../fx/sound';
import { screenShake } from '../fx/confetti';

const GLYPHS = SYMBOLS.map((s) => s.glyph);
const CELL = 86;
const STRIP_LEN = 26;
const SPIN_MS = 900;
const STAGGER = 180;
const SETTLE = 350;
const DURATION = SPIN_MS + STAGGER * (REEL_COUNT - 1) + SETTLE; // ~1970

function glyphFor(symbolId: string): string {
  return SYMBOLS.find((s) => s.id === symbolId)?.glyph ?? '❔';
}

function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

interface ReelProps {
  finals: string[]; // [top, mid, bottom] glyphs for this reel
  spinToken: number;
  reelIndex: number;
  spinning: boolean;
  winningRows: Set<number>; // which of the 3 rows in this reel are part of a win
  showWins: boolean;
}

function Reel({ finals, spinToken, reelIndex, spinning, winningRows, showWins }: ReelProps) {
  const [settled, setSettled] = useState(true);
  // Filler glyphs above the three finals; regenerated per spin for variety.
  const strip = useMemo(() => {
    void spinToken; // regenerate the filler glyphs on every new spin
    const filler = Array.from({ length: STRIP_LEN - ROW_COUNT }, randomGlyph);
    return [finals[0], finals[1], finals[2], ...filler];
  }, [finals, spinToken]);

  const initialY = -(STRIP_LEN - ROW_COUNT) * CELL;

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-black/50 shadow-inner ring-1 ring-white/5"
      style={{ height: CELL * ROW_COUNT, width: CELL }}
    >
      <motion.div
        key={spinToken}
        initial={{ y: spinning ? initialY : 0 }}
        animate={{ y: 0 }}
        onAnimationStart={() => spinning && setSettled(false)}
        onAnimationComplete={() => {
          setSettled(true);
          if (spinning) {
            playReelStop();
            screenShake('light');
          }
        }}
        transition={{
          duration: SPIN_MS / 1000,
          delay: (reelIndex * STAGGER) / 1000,
          ease: [0.16, 0.84, 0.28, 1.0],
        }}
        style={{ filter: settled ? 'none' : 'blur(3px)' }}
      >
        {strip.map((g, i) => {
          const isFinalRow = i < ROW_COUNT;
          const win = showWins && isFinalRow && winningRows.has(i);
          return (
            <div
              key={i}
              className={`flex items-center justify-center transition-colors ${
                win ? 'bg-amber-400/25' : ''
              }`}
              style={{ height: CELL, width: CELL }}
            >
              <motion.span
                animate={win ? { scale: [1, 1.32, 1] } : { scale: 1 }}
                transition={{ duration: 0.55, repeat: win ? Infinity : 0, repeatDelay: 0.25 }}
                className="text-5xl leading-none"
                style={win ? { filter: 'drop-shadow(0 0 12px rgba(255,207,92,0.95))' } : undefined}
              >
                {g}
              </motion.span>
            </div>
          );
        })}
      </motion.div>
      {/* center payline sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-1/3 h-1/3 border-y border-white/10 bg-white/[0.03]" />
    </div>
  );
}

export function SlotsTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);
  const [spinToken, setSpinToken] = useState(0);
  const celebratedRef = useRef<string | null>(null);

  const state = currentRound?.state as SlotsState | undefined;
  const resolved = state?.resolved ?? false;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  // Hooks must run unconditionally, so call useReveal before any early return.
  const { done } = useReveal(resolved, revealKey, DURATION);
  const spinning = resolved && !done;

  // Add a screen shake once after every reel settles on a win. The confetti +
  // win fanfare fire once via PlayResultBanner, so we don't duplicate them here.
  useEffect(() => {
    if (!done || !resolved || !state) return;
    if (celebratedRef.current === revealKey) return;
    celebratedRef.current = revealKey;
    if (state.payoutMultiplier > 0) screenShake('heavy');
  }, [done, resolved, revealKey, state]);

  if (!run) return null;

  const displayGrid =
    state?.grid?.length === REEL_COUNT * ROW_COUNT
      ? state.grid
      : Array.from({ length: REEL_COUNT * ROW_COUNT }, (_, i) => SYMBOLS[i % SYMBOLS.length].id);

  // Union of every winning cell across all hits (specific winning cells, not whole lines).
  const winCells = new Set<number>(resolved && state ? state.hits.flatMap((h) => h.cells) : []);
  const winRowsForReel = (reel: number) => {
    const rows = new Set<number>();
    for (let row = 0; row < ROW_COUNT; row++) {
      if (winCells.has(row * REEL_COUNT + reel)) rows.add(row);
    }
    return rows;
  };

  const spin = () => {
    playWhoosh();
    setSpinToken((t) => t + 1);
    startRound();
    submitAction('spin');
  };

  const busy = run.bankroll <= 0;
  const hits = resolved && state ? state.hits.length : 0;
  const totalMult = resolved && state ? state.payoutMultiplier : 0;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Reserved banner slot to prevent layout jump. */}
      <div className="h-24">
        {resolved && done && currentRound && currentRound.resultDelta !== null && (
          <PlayResultBanner
            key={revealKey}
            delta={currentRound.resultDelta}
            payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
          />
        )}
      </div>

      <TableFrame>
        <div className="flex gap-2.5">
          {Array.from({ length: REEL_COUNT }, (_, reel) => (
            <Reel
              key={reel}
              reelIndex={reel}
              finals={[
                glyphFor(displayGrid[reel]),
                glyphFor(displayGrid[reel + REEL_COUNT]),
                glyphFor(displayGrid[reel + REEL_COUNT * 2]),
              ]}
              spinToken={spinToken}
              spinning={spinning}
              winningRows={winRowsForReel(reel)}
              showWins={done}
            />
          ))}
        </div>
      </TableFrame>

      {/* Summary slot */}
      <div className="flex h-7 items-center">
        {resolved && done && hits > 0 && (
          <motion.p
            key={revealKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-base font-bold"
          >
            <span className="kg-gold-text">
              {hits} line{hits > 1 ? 's' : ''}
            </span>
            <span className="text-white/40"> · </span>
            <span className="kg-tnum kg-gold-text">{totalMult.toFixed(2)}×</span>
          </motion.p>
        )}
        {resolved && done && hits === 0 && (
          <p className="text-sm text-white/45">No lines · {PAYLINES.length} paylines active</p>
        )}
        {!resolved && (
          <p className="text-xs text-white/45">
            5 reels · {PAYLINES.length} paylines · match 3+ left-to-right
          </p>
        )}
      </div>

      <BetSlider bet={bet} max={run.bankroll} onChange={setBet} disabled={spinning} />
      <ActionButton onClick={spin} disabled={busy || spinning} sheen silent>
        {spinning ? 'Spinning…' : resolved ? 'Spin Again' : 'SPIN'}
      </ActionButton>
    </div>
  );
}
