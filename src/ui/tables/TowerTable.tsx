import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { TowerState } from '../../engine/games/tower';
import { TOWER_ROWS, TOWER_DOORS, towerMultiplier } from '../../engine/games/tower';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { MultiplierBadge } from '../components/MultiplierBadge';
import { TableFrame } from '../components/TableFrame';
import { useReveal } from '../fx/useReveal';
import { playPing, playCoin, playExplosion, playCashout, playSelect } from '../fx/sound';
import { screenShake } from '../fx/confetti';

const DOOR_IDS = Array.from({ length: TOWER_DOORS }, (_, i) => i);
const ROW_IDS = Array.from({ length: TOWER_ROWS }, (_, i) => i);

export function TowerTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  // Track which safe door the player opened on each cleared row (engine doesn't store it).
  const [chosen, setChosen] = useState<number[]>([]);

  const state = currentRound?.state as TowerState | undefined;
  const resolved = state?.resolved ?? false;
  const busted = state?.busted ?? false;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
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
              ? `💥 A trap door on floor ${state.row + 1} — climbed ${state.row} floor${state.row === 1 ? '' : 's'}`
              : `🏆 Escaped after ${state.row} floor${state.row === 1 ? '' : 's'}`}
          </p>
        )}

        <p className="max-w-xs text-center text-xs text-white/45">
          Climb {TOWER_ROWS} floors, {TOWER_DOORS} doors each. One is a trap. Cash out any time.
        </p>

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <ActionButton
          onClick={() => {
            setChosen([]);
            playSelect();
            startRound();
          }}
          disabled={run.bankroll <= 0}
          sheen
          silent
        >
          {resolved ? 'Play Again' : 'Place Bet'}
        </ActionButton>
      </div>
    );
  }

  // --- Interactive tower (in play or bust reveal) ---
  const liveMultiplier = state.row > 0 ? towerMultiplier(state.row) : 1;
  const showTrap = (r: number) => resolved && (busted || r < state.row);

  const climb = (door: number) => {
    const fromRow = state.row;
    submitAction(`door:${door}`);
    const st = useRunStore.getState().currentRound?.state as TowerState | undefined;
    if (!st) return;
    if (st.busted) {
      playExplosion();
      screenShake('heavy');
    } else {
      // Safe: remember the chosen door and celebrate the ascent.
      setChosen((prev) => {
        const next = [...prev];
        next[fromRow] = door;
        return next;
      });
      if (st.resolved) playCashout(); // reached the top floor
      else {
        playPing(st.row / TOWER_ROWS);
        playCoin();
      }
    }
  };

  const cashOut = () => {
    submitAction('cashout');
    playCashout();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <MultiplierBadge
        value={liveMultiplier}
        tone={busted ? 'loss' : state.row > 0 ? 'win' : 'idle'}
        size="lg"
        label={busted ? 'busted' : 'climbing'}
      />

      <TableFrame surface="glass" className="w-full max-w-sm">
        <div className="flex w-full flex-col-reverse gap-1.5">
          {ROW_IDS.map((r) => {
            const isActive = r === state.row && !resolved;
            const cleared = r < state.row;
            const locked = r > state.row && !resolved;
            const rowMult = towerMultiplier(r + 1);
            return (
              <motion.div
                key={r}
                animate={{
                  opacity: locked ? 0.35 : 1,
                  scale: isActive ? 1 : 0.98,
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${
                  isActive ? 'bg-cyan-400/10 ring-1 ring-cyan-300/40 kg-anim-pulse-glow' : ''
                }`}
              >
                <span
                  className={`kg-tnum w-14 shrink-0 text-right text-[11px] font-bold ${
                    cleared ? 'text-emerald-300' : isActive ? 'text-cyan-200' : 'text-white/35'
                  }`}
                >
                  {rowMult.toFixed(2)}×
                </span>
                <div className="flex flex-1 justify-around gap-1.5">
                  {DOOR_IDS.map((d) => {
                    const isChosen = cleared && chosen[r] === d;
                    const isTrap = state.trapDoors[r] === d;
                    const trapVisible = showTrap(r) && isTrap;
                    const clickable = isActive;

                    let face = <span className="text-2xl opacity-70">🚪</span>;
                    let skin = 'bg-white/5';
                    if (isChosen) {
                      face = <span className="text-2xl">✅</span>;
                      skin = 'bg-emerald-500/30 ring-1 ring-emerald-300/50';
                    } else if (trapVisible) {
                      face = <span className="text-2xl">💣</span>;
                      skin = 'bg-rose-600/70 ring-1 ring-rose-300/40';
                    } else if (isActive) {
                      face = <span className="text-2xl">🚪</span>;
                      skin = 'bg-cyan-400/20 ring-1 ring-cyan-300/60 hover:bg-cyan-400/35';
                    }

                    return (
                      <motion.button
                        key={d}
                        type="button"
                        disabled={!clickable}
                        onClick={() => climb(d)}
                        whileHover={clickable ? { scale: 1.08, y: -2 } : undefined}
                        whileTap={clickable ? { scale: 0.9 } : undefined}
                        className={`flex h-16 flex-1 items-center justify-center rounded-lg text-xl transition ${skin} ${
                          clickable ? 'cursor-pointer' : 'cursor-default'
                        }`}
                        style={{ perspective: 500 }}
                      >
                        <motion.span
                          initial={false}
                          animate={{ rotateY: trapVisible || isChosen ? [0, 180, 360] : 0 }}
                          transition={{ duration: 0.4, delay: trapVisible ? r * 0.05 : 0 }}
                          style={{ display: 'inline-flex' }}
                        >
                          {face}
                        </motion.span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </TableFrame>

      <div className="h-12">
        <AnimatePresence>
          {state.row > 0 && !resolved && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ActionButton onClick={cashOut} variant="cash" silent>
                Cash Out {liveMultiplier.toFixed(2)}×
              </ActionButton>
            </motion.div>
          )}
          {state.row === 0 && !resolved && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-3 text-xs text-white/45"
            >
              Pick a door to start climbing ↑
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
