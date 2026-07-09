import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { MinesState } from '../../engine/games/mines';
import { MINE_COUNT_OPTIONS, MINES_GRID_SIZE, minesMultiplier } from '../../engine/games/mines';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { MultiplierBadge } from '../components/MultiplierBadge';
import { useReveal } from '../fx/useReveal';
import { playPing, playCoin, playExplosion, playCashout, playSelect } from '../fx/sound';
import { screenShake } from '../fx/confetti';

const COLS = 5;

function Sparkles() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="pointer-events-none absolute h-2 w-2 rounded-full bg-amber-200"
          style={{
            top: '50%',
            left: '50%',
            animation: 'kg-sparkle 0.5s ease-out forwards',
            transform: `translate(-50%,-50%) rotate(${i * 90}deg) translateY(-14px)`,
          }}
        />
      ))}
    </>
  );
}

export function MinesTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [mineCount, setMineCount] = useState<number>(MINE_COUNT_OPTIONS[1]);

  const state = currentRound?.state as MinesState | undefined;
  const resolved = state?.resolved ?? false;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const busted = state?.busted ?? false;
  const { done } = useReveal(resolved, revealKey, busted ? 1300 : 1000);

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
              ? `💥 Hit a mine after ${state.revealed.length - 1} safe pick${state.revealed.length - 1 === 1 ? '' : 's'}`
              : `Cashed out after ${state.revealed.length} safe picks`}
          </p>
        )}

        <div className="flex gap-2">
          {MINE_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => {
                setMineCount(count);
                playSelect();
              }}
              className={`rounded-full px-5 py-2 font-bold transition ${
                mineCount === count ? 'bg-rose-500 text-black' : 'kg-glass text-white/70 hover:text-white'
              }`}
            >
              💣 {count}
            </button>
          ))}
        </div>

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <ActionButton onClick={() => startRound({ mineCount })} disabled={run.bankroll <= 0} sheen>
          {resolved ? 'Play Again' : 'Place Bet'}
        </ActionButton>
      </div>
    );
  }

  // --- Interactive board (in play or bust reveal) ---
  const revealedCount = state.revealed.length;
  const liveMultiplier = revealedCount > 0 ? minesMultiplier(state.mineCount, revealedCount) : 1;
  const nextMultiplier = minesMultiplier(state.mineCount, revealedCount + 1);
  const showAllMines = busted;

  const reveal = (i: number) => {
    submitAction(`reveal:${i}`);
    const st = useRunStore.getState().currentRound?.state as MinesState | undefined;
    if (!st) return;
    if (st.busted) {
      playExplosion();
      screenShake('heavy');
    } else if (st.cashedOut) {
      playCashout();
    } else {
      playPing(Math.min(1, st.revealed.length / 8));
      playCoin();
    }
  };

  const cashOut = () => {
    submitAction('cashout');
    playCashout();
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <MultiplierBadge value={liveMultiplier} tone={busted ? 'loss' : revealedCount > 0 ? 'win' : 'idle'} size="lg" label="current" />

      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: MINES_GRID_SIZE }, (_, i) => {
          const isRevealed = state.revealed.includes(i);
          const isMine = state.minePositions.includes(i);
          const showMine = showAllMines && isMine;
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const faceUp = isRevealed || showMine;
          return (
            <button
              key={i}
              type="button"
              disabled={isRevealed || resolved}
              onClick={() => reveal(i)}
              className="relative h-14 w-14"
              style={{ perspective: 500 }}
            >
              <motion.div
                initial={false}
                animate={{ rotateY: faceUp ? 180 : 0 }}
                transition={{ duration: 0.35, delay: showMine && !isRevealed ? (row + col) * 0.05 : 0 }}
                style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-white/25">◇</span>
                </div>
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-lg text-2xl ${
                    isMine ? 'bg-rose-600/80' : 'bg-emerald-500/40 ring-1 ring-emerald-300/50'
                  }`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {faceUp ? (isMine ? '💣' : '💎') : ''}
                  {faceUp && !isMine && isRevealed && <Sparkles />}
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {revealedCount > 0 && !resolved && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-white/50">
            next pick → <span className="kg-tnum font-bold text-amber-300">{nextMultiplier.toFixed(2)}×</span>
          </motion.div>
        )}
      </AnimatePresence>

      {revealedCount > 0 && !resolved && (
        <ActionButton onClick={cashOut} variant="cash" silent>
          Cash Out {liveMultiplier.toFixed(2)}×
        </ActionButton>
      )}
    </div>
  );
}
