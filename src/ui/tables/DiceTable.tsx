import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { DiceDirection, DiceState } from '../../engine/games/dice';
import {
  DICE_MAX_THRESHOLD,
  DICE_MIN_THRESHOLD,
  diceWinChance,
  dicePayoutMultiplier,
} from '../../engine/games/dice';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { MultiplierBadge } from '../components/MultiplierBadge';
import { TableFrame } from '../components/TableFrame';
import { useReveal } from '../fx/useReveal';
import { playWhoosh, playTick, playReelStop, playSelect } from '../fx/sound';
import { screenShake } from '../fx/confetti';

const TUMBLE_MS = 900;
const REVEAL_MS = 1250;

export function DiceTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [direction, setDirection] = useState<DiceDirection>('under');
  const [threshold, setThreshold] = useState(50);
  const [displayRoll, setDisplayRoll] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);

  const state = currentRound?.state as DiceState | undefined;
  const resolved = state?.resolved ?? false;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const { done } = useReveal(resolved, revealKey, REVEAL_MS);
  const rolling = resolved && !done;

  // Tumbling-number animation: rapidly cycle 0..99 then thud onto the real roll.
  useEffect(() => {
    if (!rolling || state?.roll == null) return;
    const finalRoll = state.roll;
    const won = state.won === true;
    const startT = performance.now();
    let raf = 0;
    let lastTick = -999;
    setSettled(false);
    const loop = (now: number) => {
      const el = now - startT;
      if (el < TUMBLE_MS) {
        if (el - lastTick > 55) {
          lastTick = el;
          setDisplayRoll(Math.floor(Math.random() * 100));
          playTick(0.8);
        }
        raf = requestAnimationFrame(loop);
      } else {
        setDisplayRoll(finalRoll);
        setSettled(true);
        playReelStop();
        screenShake(won ? 'light' : 'heavy');
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rolling, revealKey, state]);

  if (!run) return null;

  const winChancePct = diceWinChance(direction, threshold) * 100;
  const payout = dicePayoutMultiplier(direction, threshold);

  // Win-zone geometry (percent along the 0..100 track).
  const winLeft = direction === 'under' ? 0 : threshold;
  const winWidth = direction === 'under' ? threshold : 100 - threshold;

  const rollPct = state?.roll != null ? state.roll : threshold;
  const numberColor = settled
    ? state?.won
      ? 'text-emerald-300'
      : 'text-rose-400'
    : 'text-amber-200';
  // While rolling, never show the real roll before the tumble's first tick sets displayRoll.
  const shown = displayRoll != null ? displayRoll : rolling ? 0 : resolved ? (state?.roll ?? 0) : 0;

  const pickDirection = (d: DiceDirection) => {
    if (rolling || d === direction) return;
    playSelect();
    setDirection(d);
  };

  const roll = () => {
    playWhoosh();
    setSettled(false);
    setDisplayRoll(Math.floor(Math.random() * 100)); // start on a random face, never the real roll
    startRound({ direction, threshold });
    submitAction('roll');
  };

  const showResult = resolved && done && currentRound && currentRound.resultDelta !== null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="h-24">
        {showResult && (
          <PlayResultBanner
            key={revealKey}
            delta={currentRound.resultDelta as number}
            payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
          />
        )}
      </div>

      <TableFrame surface="glass" className="w-full max-w-2xl flex-col gap-8">
        {/* Tumbling roll readout */}
        <motion.div
          key={`num-${revealKey}`}
          animate={settled ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.4 }}
          className={`kg-tnum text-8xl font-black tabular-nums ${numberColor}`}
          style={settled ? { filter: 'drop-shadow(0 0 18px currentColor)' } : undefined}
        >
          {String(shown).padStart(2, '0')}
        </motion.div>

        {/* The 0..100 track */}
        <div className="relative h-20 w-full">
          <div className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-rose-950/50 shadow-inner">
            {/* win zone */}
            <div
              className="absolute inset-y-0 bg-emerald-500/35"
              style={{ left: `${winLeft}%`, width: `${winWidth}%` }}
            />
            {/* threshold marker line */}
            <div
              className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-amber-300 shadow-[0_0_10px_rgba(255,207,92,0.9)]"
              style={{ left: `${threshold}%` }}
            />
          </div>

          {/* scale ticks */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-5 flex justify-between px-0.5 text-[10px] font-bold text-white/40">
            {[0, 25, 50, 75, 100].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>

          {/* the flying pill marker */}
          {resolved && (
            <motion.div
              key={`pill-${revealKey}`}
              initial={{ left: '0%', y: -26, opacity: 0 }}
              animate={{ left: `${rollPct}%`, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 90, damping: 9, mass: 0.9 }}
              className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            >
              <div
                className={`kg-tnum rounded-lg px-2.5 py-1 text-sm font-black text-black shadow-lg ${
                  settled ? (state?.won ? 'bg-emerald-300' : 'bg-rose-400') : 'bg-amber-200'
                }`}
              >
                {String(shown).padStart(2, '0')}
              </div>
              <div
                className={`-mt-1 h-3 w-3 rotate-45 ${
                  settled ? (state?.won ? 'bg-emerald-300' : 'bg-rose-400') : 'bg-amber-200'
                }`}
              />
            </motion.div>
          )}
        </div>

        {/* Live odds */}
        <div className="flex items-center gap-8 pt-2">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Win chance</span>
            <span className="kg-tnum text-2xl font-black text-cyan-300">{winChancePct.toFixed(0)}%</span>
          </div>
          <MultiplierBadge value={payout} tone="idle" size="md" label="Payout" />
        </div>
      </TableFrame>

      {/* Under / Over toggle */}
      <div className="flex gap-2">
        {(['under', 'over'] as const).map((d) => (
          <button
            key={d}
            type="button"
            disabled={rolling}
            onClick={() => pickDirection(d)}
            className={`kg-tnum rounded-full px-6 py-2 text-sm font-black uppercase tracking-wide transition ${
              direction === d ? 'bg-amber-400 text-black' : 'kg-glass text-white/70 hover:text-white'
            } disabled:opacity-40`}
          >
            {d === 'under' ? `▼ Under ${threshold}` : `▲ Over ${threshold}`}
          </button>
        ))}
      </div>

      {/* Threshold slider */}
      <div className="flex w-full max-w-sm flex-col items-center gap-1">
        <input
          type="range"
          min={DICE_MIN_THRESHOLD}
          max={DICE_MAX_THRESHOLD}
          step={1}
          value={threshold}
          disabled={rolling}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="kg-range w-full disabled:opacity-40"
        />
        <p className="text-sm text-white/70">
          Line at <span className="kg-tnum font-mono text-amber-300">{threshold}</span>
        </p>
      </div>

      <BetSlider bet={bet} max={run.bankroll} onChange={setBet} disabled={rolling} />
      <ActionButton onClick={roll} disabled={run.bankroll <= 0 || rolling} variant="action" sheen silent>
        {rolling ? 'Rolling…' : resolved ? 'Roll Again' : 'ROLL'}
      </ActionButton>
    </div>
  );
}
