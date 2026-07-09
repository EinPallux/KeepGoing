import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { KenoState } from '../../engine/games/keno';
import { KENO_PAYTABLE, KENO_PICK_COUNT, KENO_POOL_SIZE } from '../../engine/games/keno';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { TableFrame } from '../components/TableFrame';
import { useReveal } from '../fx/useReveal';
import { playWhoosh, playCoin, playTick } from '../fx/sound';
import { screenShake } from '../fx/confetti';

const STAGGER_MS = 170;
const LEAD_MS = 200;
const DURATION = LEAD_MS + 10 * STAGGER_MS + 500; // ~2400
// Smallest hit count that pays out (paytable is 0 for 0-1 hits).
const WIN_THRESHOLD = KENO_PAYTABLE.findIndex((m) => m > 0);

export function KenoTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [picks, setPicks] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(0); // how many drawn numbers have flipped up

  const state = currentRound?.state as KenoState | undefined;
  const resolved = state?.resolved ?? false;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const { done } = useReveal(resolved, revealKey, DURATION);
  const animating = resolved && !done;
  const drawn = state?.drawn ?? null;

  // Stagger the 10 drawn numbers into view, one every ~170ms, with per-number cues.
  useEffect(() => {
    if (!resolved || !drawn) {
      setRevealed(0);
      return;
    }
    const pickSet = new Set(state?.picks ?? []);
    setRevealed(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    drawn.forEach((num, i) => {
      timers.push(
        setTimeout(() => {
          setRevealed(i + 1);
          if (pickSet.has(num)) playCoin();
          else playTick();
          if (i === drawn.length - 1) {
            const finalHits = state?.hits ?? 0;
            if (finalHits >= 4) screenShake('heavy');
            else if (finalHits >= WIN_THRESHOLD) screenShake('light');
          }
        }, LEAD_MS + i * STAGGER_MS),
      );
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey, resolved]);

  if (!run) return null;

  const activePicks = resolved && state ? state.picks : picks;
  const pickSet = new Set(activePicks);
  const revealedDrawn = drawn ? drawn.slice(0, revealed) : [];
  const revealedSet = new Set(revealedDrawn);
  const hitsSoFar = revealedDrawn.filter((n) => pickSet.has(n)).length;

  const canDraw = run.bankroll > 0 && picks.length === KENO_PICK_COUNT;

  function toggle(n: number) {
    if (resolved) return;
    playTick();
    setPicks((cur) => {
      if (cur.includes(n)) return cur.filter((x) => x !== n);
      if (cur.length >= KENO_PICK_COUNT) return cur;
      return [...cur, n];
    });
  }

  function draw() {
    playWhoosh();
    startRound({ picks });
    submitAction('draw');
  }

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

      {/* Live hit counter */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">Hits</span>
        <motion.span
          key={hitsSoFar}
          initial={{ scale: 1 }}
          animate={hitsSoFar > 0 ? { scale: [1, 1.4, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`kg-tnum text-3xl font-black ${
            hitsSoFar >= WIN_THRESHOLD ? 'kg-gold-text' : 'text-white/80'
          }`}
        >
          {hitsSoFar}
          <span className="text-lg text-white/40"> / {KENO_PICK_COUNT}</span>
        </motion.span>
      </div>

      <TableFrame surface="glass">
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: KENO_POOL_SIZE }, (_, i) => i + 1).map((n) => {
            const isPick = pickSet.has(n);
            const isDrawn = revealedSet.has(n);
            const hit = isDrawn && isPick;
            const miss = isDrawn && !isPick;

            let cls = 'kg-glass text-white/55 hover:bg-white/20';
            if (hit) cls = 'bg-emerald-500 text-black ring-2 ring-emerald-300 shadow-[0_0_16px_rgba(52,224,161,0.7)] kg-anim-pop';
            else if (miss) cls = 'bg-amber-400/75 text-black kg-anim-pop';
            else if (isPick) cls = 'bg-pink-500 text-black shadow-[0_0_12px_rgba(244,114,182,0.5)]';

            return (
              <button
                key={n}
                type="button"
                disabled={resolved}
                onClick={() => toggle(n)}
                className={`kg-tnum flex h-12 w-12 items-center justify-center rounded-md text-sm font-bold transition-colors ${cls} ${
                  resolved ? 'cursor-default' : ''
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </TableFrame>

      {resolved && done && state && (
        <p className="text-sm text-white/60">
          {state.hits >= WIN_THRESHOLD
            ? `Matched ${state.hits} of ${state.picks.length} — paid ${state.payoutMultiplier.toFixed(2)}×`
            : `Only ${state.hits} match${state.hits === 1 ? '' : 'es'} — no payout`}
        </p>
      )}
      {!resolved && (
        <p className="text-xs text-white/45">
          Pick {KENO_PICK_COUNT} numbers · 10 are drawn · match {WIN_THRESHOLD}+ to win
        </p>
      )}

      <BetSlider bet={bet} max={run.bankroll} onChange={setBet} disabled={animating} />

      {resolved && done ? (
        <ActionButton onClick={draw} disabled={!canDraw} sheen silent>
          Draw Again
        </ActionButton>
      ) : (
        <ActionButton onClick={draw} disabled={!canDraw || animating} sheen silent>
          {animating ? 'Drawing…' : `DRAW (${picks.length}/${KENO_PICK_COUNT})`}
        </ActionButton>
      )}
    </div>
  );
}
