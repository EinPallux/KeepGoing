import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { SlotsState } from '../../engine/games/slots';
import { PAYLINES, SYMBOLS } from '../../engine/games/slots';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { TableFrame } from '../components/TableFrame';
import { useReveal } from '../fx/useReveal';
import { playReelStop, playWhoosh } from '../fx/sound';

const GLYPHS = SYMBOLS.map((s) => s.glyph);
const CELL = 74;
const STRIP_LEN = 24;
const SPIN_MS = 850;
const STAGGER = 220;
const DURATION = SPIN_MS + STAGGER * 2 + 320;

function glyphFor(symbolId: string): string {
  return SYMBOLS.find((s) => s.id === symbolId)?.glyph ?? '❔';
}

function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

interface ReelProps {
  finals: string[]; // [top, mid, bottom] glyphs
  spinToken: number;
  colIndex: number;
  spinning: boolean;
  winningRows: Set<number>; // 0,1,2 rows in this column that are part of a win
  showWins: boolean;
}

function Reel({ finals, spinToken, colIndex, spinning, winningRows, showWins }: ReelProps) {
  const [settled, setSettled] = useState(true);
  // Filler glyphs above the three finals; regenerated per spin for variety.
  const strip = useMemo(() => {
    void spinToken; // regenerate the filler glyphs on every new spin
    const filler = Array.from({ length: STRIP_LEN - 3 }, randomGlyph);
    return [finals[0], finals[1], finals[2], ...filler];
  }, [finals, spinToken]);

  const initialY = -(STRIP_LEN - 3) * CELL;

  return (
    <div className="relative overflow-hidden rounded-xl bg-black/45 shadow-inner" style={{ height: CELL * 3, width: CELL }}>
      <motion.div
        key={spinToken}
        initial={{ y: spinning ? initialY : 0 }}
        animate={{ y: 0 }}
        onAnimationStart={() => spinning && setSettled(false)}
        onAnimationComplete={() => {
          setSettled(true);
          if (spinning) playReelStop();
        }}
        transition={{
          duration: SPIN_MS / 1000,
          delay: (colIndex * STAGGER) / 1000,
          ease: [0.15, 0.85, 0.3, 1.0],
        }}
        style={{ filter: settled ? 'none' : 'blur(2.5px)' }}
      >
        {strip.map((g, i) => {
          const isFinalRow = i < 3;
          const win = showWins && isFinalRow && winningRows.has(i);
          return (
            <div
              key={i}
              className={`flex items-center justify-center transition-colors ${win ? 'bg-amber-400/25' : ''}`}
              style={{ height: CELL, width: CELL }}
            >
              <motion.span
                animate={win ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 0.5, repeat: win ? Infinity : 0, repeatDelay: 0.3 }}
                className="text-4xl"
                style={win ? { filter: 'drop-shadow(0 0 10px rgba(255,207,92,0.9))' } : undefined}
              >
                {g}
              </motion.span>
            </div>
          );
        })}
      </motion.div>
      {/* subtle center payline sheen */}
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

  const state = currentRound?.state as SlotsState | undefined;
  const resolved = state?.resolved ?? false;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  // Hooks must run unconditionally, so call useReveal before any early return.
  const { done } = useReveal(resolved, revealKey, DURATION);
  const spinning = resolved && !done;

  if (!run) return null;

  const grid = state?.grid?.length === 9 ? state.grid : null;
  const displayGrid = grid ?? Array.from({ length: 9 }, (_, i) => SYMBOLS[i % SYMBOLS.length].id);

  // Which (col,row) cells are part of a winning payline.
  const winCells = new Set(resolved && state ? state.hits.flatMap((h) => h.line) : []);
  const winByCol = (col: number) => {
    const rows = new Set<number>();
    for (let row = 0; row < 3; row++) if (winCells.has(row * 3 + col)) rows.add(row);
    return rows;
  };

  const spin = () => {
    playWhoosh();
    setSpinToken((t) => t + 1);
    startRound();
    submitAction('spin');
  };

  const busy = run.bankroll <= 0;

  return (
    <div className="flex flex-col items-center gap-6">
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
        <div className="flex gap-2">
          {[0, 1, 2].map((col) => (
            <Reel
              key={col}
              colIndex={col}
              finals={[glyphFor(displayGrid[col]), glyphFor(displayGrid[col + 3]), glyphFor(displayGrid[col + 6])]}
              spinToken={spinToken}
              spinning={spinning}
              winningRows={winByCol(col)}
              showWins={done}
            />
          ))}
        </div>
      </TableFrame>

      {resolved && done && state && state.hits.length > 0 && (
        <p className="text-sm text-white/60">
          {state.hits.length} line{state.hits.length > 1 ? 's' : ''} hit · {PAYLINES.length} paylines
        </p>
      )}

      <BetSlider bet={bet} max={run.bankroll} onChange={setBet} disabled={spinning} />
      <ActionButton onClick={spin} disabled={busy || spinning} sheen silent>
        {spinning ? 'Spinning…' : resolved ? 'Spin Again' : 'SPIN'}
      </ActionButton>
    </div>
  );
}
