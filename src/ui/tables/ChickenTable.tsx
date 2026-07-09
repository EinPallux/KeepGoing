import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { ChickenState, ChickenDifficulty } from '../../engine/games/chicken';
import { CHICKEN_LANES, CHICKEN_SURVIVAL_CHANCE, chickenMultiplier } from '../../engine/games/chicken';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { MultiplierBadge } from '../components/MultiplierBadge';
import { useReveal } from '../fx/useReveal';
import { playWhoosh, playPing, playCoin, playCashout, playExplosion, playSelect } from '../fx/sound';
import { screenShake } from '../fx/confetti';

const DIFFICULTIES: { id: ChickenDifficulty; label: string; emoji: string; active: string }[] = [
  { id: 'easy', label: 'Easy', emoji: '🟢', active: 'bg-emerald-500 text-black' },
  { id: 'medium', label: 'Medium', emoji: '🟡', active: 'bg-amber-400 text-black' },
  { id: 'hard', label: 'Hard', emoji: '🔴', active: 'bg-rose-500 text-black' },
];

const CARS = ['🚗', '🚕', '🚙', '🚌', '🚚'];

export function ChickenTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [difficulty, setDifficulty] = useState<ChickenDifficulty>('medium');

  const state = currentRound?.state as ChickenState | undefined;
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
              ? `💥 Splatted crossing lane ${state.lane + 1}`
              : `🐔 Made it across ${state.lane} lane${state.lane === 1 ? '' : 's'}`}
          </p>
        )}

        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDifficulty(d.id);
                playSelect();
              }}
              className={`flex flex-col items-center rounded-2xl px-5 py-2 font-bold transition ${
                difficulty === d.id ? d.active : 'kg-glass text-white/70 hover:text-white'
              }`}
            >
              <span>
                {d.emoji} {d.label}
              </span>
              <span className="text-[10px] font-semibold opacity-70">
                {Math.round(CHICKEN_SURVIVAL_CHANCE[d.id] * 100)}% safe
              </span>
            </button>
          ))}
        </div>

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <ActionButton onClick={() => startRound({ difficulty })} disabled={run.bankroll <= 0} sheen>
          {resolved ? 'Play Again' : 'Place Bet'}
        </ActionButton>
      </div>
    );
  }

  // --- Interactive road (in play or bust reveal) ---
  const lane = state.lane;
  const liveMultiplier = lane > 0 ? chickenMultiplier(state.difficulty, lane) : 1;
  const nextMultiplier = chickenMultiplier(state.difficulty, lane + 1);
  const splatCell = busted ? lane : -1; // attempted lane (lane+1) → cell index `lane`

  const cross = () => {
    submitAction('cross');
    const st = useRunStore.getState().currentRound?.state as ChickenState | undefined;
    if (!st) return;
    if (st.busted) {
      playExplosion();
      screenShake('heavy');
    } else if (st.cashedOut) {
      playCashout();
    } else {
      playWhoosh();
      playPing(Math.min(1, st.lane / CHICKEN_LANES));
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
        value={liveMultiplier}
        tone={busted ? 'loss' : lane > 0 ? 'win' : 'idle'}
        size="lg"
        label={lane > 0 ? `crossed ${lane}` : 'get ready'}
      />

      {/* The road */}
      <div className="w-full max-w-2xl overflow-x-auto rounded-3xl bg-emerald-900/40 p-2 ring-1 ring-emerald-500/20">
        <div className="flex items-stretch gap-1 rounded-2xl bg-neutral-900 p-2">
          {/* Start curb */}
          <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-700/50 py-3">
            {lane === 0 && !busted && (
              <motion.span
                key="start"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-2xl"
              >
                🐔
              </motion.span>
            )}
            <span className="mt-1 text-[9px] font-bold uppercase text-emerald-200/70">start</span>
          </div>

          {Array.from({ length: CHICKEN_LANES }, (_, i) => {
            const laneNo = i + 1;
            const crossed = lane >= laneNo;
            const hasChicken = !busted && lane === laneNo;
            const hasSplat = splatCell === i;
            const targetMult = chickenMultiplier(state.difficulty, laneNo);
            return (
              <div
                key={i}
                className={`relative flex w-14 shrink-0 flex-col items-center justify-between overflow-hidden rounded-xl py-2 ${
                  crossed ? 'bg-neutral-800' : 'bg-neutral-950'
                }`}
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, rgba(250,204,21,0.35) 0 8px, transparent 8px 20px)',
                  backgroundSize: '2px 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
              >
                {/* Traffic */}
                {!crossed && !hasSplat && (
                  <motion.span
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl"
                    initial={{ y: -30 }}
                    animate={{ y: 60 }}
                    transition={{
                      duration: 1.1 + (i % 4) * 0.35,
                      repeat: Infinity,
                      ease: 'linear',
                      delay: (i % 5) * 0.4,
                    }}
                  >
                    {CARS[i % CARS.length]}
                  </motion.span>
                )}

                <span className="relative z-10 text-[9px] font-black text-amber-300/80">{targetMult.toFixed(2)}×</span>

                <div className="relative z-10 flex h-8 items-center justify-center">
                  <AnimatePresence>
                    {hasChicken && (
                      <motion.span
                        key={`chick-${laneNo}`}
                        initial={{ y: -22, scale: 0.8 }}
                        animate={{ y: [-22, -4, 0], scale: [0.8, 1.15, 1] }}
                        transition={{ duration: 0.4, times: [0, 0.6, 1] }}
                        className="text-2xl drop-shadow"
                      >
                        🐔
                      </motion.span>
                    )}
                    {hasSplat && (
                      <motion.span
                        key={`splat-${laneNo}`}
                        initial={{ scale: 0.4, rotate: -20 }}
                        animate={{ scale: [0.4, 1.6, 1.2], rotate: [-20, 10, 0] }}
                        transition={{ duration: 0.4 }}
                        className="text-2xl"
                      >
                        💥
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <span className="relative z-10 text-[8px] font-bold text-white/30">{laneNo}</span>
              </div>
            );
          })}

          {/* Finish curb */}
          <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-700/50 py-3">
            <span className="text-xl">🏁</span>
            <span className="mt-1 text-[9px] font-bold uppercase text-emerald-200/70">win</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!resolved && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-white/50">
            next lane → <span className="kg-tnum font-bold text-amber-300">{nextMultiplier.toFixed(2)}×</span>
            <span className="ml-2 opacity-60">
              ({Math.round(CHICKEN_SURVIVAL_CHANCE[state.difficulty] * 100)}% safe)
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {!resolved && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ActionButton onClick={cross} variant="action" sheen silent>
            🐔 CROSS
          </ActionButton>
          {lane > 0 && (
            <ActionButton onClick={cashOut} variant="cash" silent>
              Cash Out {liveMultiplier.toFixed(2)}×
            </ActionButton>
          )}
        </div>
      )}
    </div>
  );
}
