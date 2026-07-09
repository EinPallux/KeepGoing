import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { CoinFlipState, CoinSide } from '../../engine/games/coinflip';
import { COINFLIP_MAX_FLIPS } from '../../engine/games/coinflip';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { MultiplierBadge } from '../components/MultiplierBadge';
import { useReveal } from '../fx/useReveal';
import { playWhoosh, playCoin, playLose, playCashout } from '../fx/sound';
import { screenShake } from '../fx/confetti';

const COIN_SIZE = 176;
const FLIP_MS = 720;

type Glow = 'win' | 'loss' | null;

/** One face of the 3D coin. */
function CoinFace({ side, back }: { side: CoinSide; back?: boolean }) {
  const isHeads = side === 'heads';
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-full"
      style={{
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : undefined,
        background: isHeads
          ? 'radial-gradient(circle at 35% 30%, #fff2c4 0%, #ffcf5c 38%, #e29a2a 78%, #a9701c 100%)'
          : 'radial-gradient(circle at 35% 30%, #ffe9a8 0%, #f0b64a 40%, #c98a24 80%, #8f6015 100%)',
        boxShadow: 'inset 0 5px 14px rgba(255,255,255,0.55), inset 0 -8px 18px rgba(120,74,10,0.65)',
        border: '5px solid rgba(255,240,190,0.55)',
      }}
    >
      <span className="text-6xl drop-shadow">{isHeads ? '🪙' : '👑'}</span>
      <span className="kg-tnum text-2xl font-black tracking-widest text-amber-950/80">
        {isHeads ? 'HEADS' : 'TAILS'}
      </span>
    </div>
  );
}

/** Small coin in the past-flips trail. */
function TrailCoin({ result, won, index }: { result: CoinSide; won: boolean; index: number }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -30, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18, delay: index * 0.02 }}
      className={`kg-tnum flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${
        won
          ? 'border-emerald-300/70 bg-emerald-500/25 text-emerald-100 shadow-[0_0_12px_rgba(52,224,161,0.5)]'
          : 'border-rose-300/70 bg-rose-600/30 text-rose-100 shadow-[0_0_12px_rgba(255,92,122,0.5)]'
      }`}
    >
      {result === 'heads' ? 'H' : 'T'}
    </motion.div>
  );
}

export function CoinFlipTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [rotation, setRotation] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [glow, setGlow] = useState<Glow>(null);
  // Snapshot of the pre-flip display values, shown while the coin spins so the
  // resolved streak/multiplier/trail don't appear before the coin lands.
  const [frozen, setFrozen] = useState<Pick<CoinFlipState, 'streak' | 'chainMultiplier' | 'busted' | 'history'> | null>(null);
  const timers = useRef<number[]>([]);

  const state = currentRound?.state as CoinFlipState | undefined;
  const resolved = state?.resolved ?? false;
  const busted = state?.busted ?? false;
  const streak = state?.streak ?? 0;
  const chainMultiplier = state?.chainMultiplier ?? 1;

  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const { done } = useReveal(resolved, revealKey, busted ? 1200 : 1000);

  // Clean up any pending flip timers on unmount.
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Reset the coin whenever we drop back to the setup screen.
  useEffect(() => {
    if (!state) {
      setRotation(0);
      setGlow(null);
      setFlipping(false);
    }
  }, [state]);

  if (!run) return null;

  // ---------- Setup / result screen ----------
  if (!state || (resolved && done)) {
    const placeBet = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      setRotation(0);
      setGlow(null);
      setFlipping(false);
      startRound();
      playWhoosh();
    };
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
        {resolved && done && state && (
          <p className="text-sm text-white/60">
            {state.busted
              ? `💥 Busted after a ${state.streak}-flip streak`
              : `Banked ${state.streak} correct call${state.streak === 1 ? '' : 's'} at ${state.payoutMultiplier.toFixed(2)}×`}
          </p>
        )}
        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <ActionButton onClick={placeBet} disabled={run.bankroll <= 0} sheen silent>
          {resolved ? 'Play Again' : 'Place Bet'}
        </ActionButton>
      </div>
    );
  }

  // ---------- Interactive board (in play or reveal) ----------
  // While the coin spins the store already holds the resolved state, so show the
  // frozen pre-flip values until it lands - otherwise the streak/multiplier/trail
  // would spoil the outcome before the coin does.
  const dStreak = flipping && frozen ? frozen.streak : streak;
  const dMult = flipping && frozen ? frozen.chainMultiplier : chainMultiplier;
  const dBusted = flipping && frozen ? frozen.busted : busted;
  const dHistory = flipping && frozen ? frozen.history : state.history;
  const flipsLeft = COINFLIP_MAX_FLIPS - dStreak;
  const busy = flipping || resolved;

  const flip = (call: CoinSide) => {
    if (busy) return;
    setFlipping(true);
    setGlow(null);
    setFrozen({ streak, chainMultiplier, busted, history: state.history });
    playWhoosh();
    submitAction(call);

    const st = useRunStore.getState().currentRound?.state as CoinFlipState | undefined;
    const result: CoinSide = st?.lastResult ?? call;

    // Spin at least 3 full turns, landing on the side that actually came up.
    const targetMod = result === 'heads' ? 0 : 180;
    setRotation((r) => {
      let next = (Math.ceil(r / 360) + 3) * 360 + targetMod;
      if (next <= r) next += 360;
      return next;
    });

    const midTick = window.setTimeout(() => playWhoosh(), 300);
    const land = window.setTimeout(() => {
      setFlipping(false);
      const finalSt = useRunStore.getState().currentRound?.state as CoinFlipState | undefined;
      const rec = finalSt?.history[finalSt.history.length - 1];
      if (finalSt?.busted) {
        setGlow('loss');
        playLose();
        screenShake('light');
      } else if (rec?.won) {
        setGlow('win');
        playCoin();
      }
    }, FLIP_MS);
    timers.current.push(midTick, land);
  };

  const cashOut = () => {
    if (busy) return;
    setGlow('win');
    submitAction('cashout');
    playCashout();
  };

  const glowShadow =
    glow === 'win'
      ? '0 0 60px 8px rgba(52,224,161,0.65)'
      : glow === 'loss'
        ? '0 0 60px 8px rgba(255,92,122,0.65)'
        : '0 0 40px 4px rgba(255,207,92,0.35)';

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div key={dStreak} animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 0.35 }}>
        <MultiplierBadge
          value={dMult}
          tone={dBusted ? 'loss' : dStreak > 0 ? 'win' : 'idle'}
          size="xl"
          label="streak ×"
        />
      </motion.div>

      {/* The big 3D coin */}
      <div
        className="relative flex items-center justify-center rounded-full transition-shadow duration-300"
        style={{ width: COIN_SIZE, height: COIN_SIZE, perspective: 1000, boxShadow: glowShadow }}
      >
        <motion.div
          animate={{ rotateY: rotation }}
          transition={{ duration: FLIP_MS / 1000, ease: [0.3, 0, 0.2, 1] }}
          style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
        >
          <CoinFace side="heads" />
          <CoinFace side="tails" back />
        </motion.div>
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-white/45">
        {flipping
          ? 'Flipping…'
          : resolved
            ? busted
              ? 'Busted'
              : 'Cashed out'
            : `${flipsLeft} flip${flipsLeft === 1 ? '' : 's'} left · call it`}
      </p>

      {/* Past-flips trail */}
      <div className="flex min-h-[2.75rem] max-w-full flex-wrap items-center justify-center gap-2">
        <AnimatePresence>
          {dHistory.map((rec, i) => (
            <TrailCoin key={i} result={rec.result} won={rec.won} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {/* Controls */}
      {!resolved && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <ActionButton onClick={() => flip('heads')} disabled={busy} variant="action" silent>
              🪙 Heads
            </ActionButton>
            <ActionButton onClick={() => flip('tails')} disabled={busy} variant="action" silent>
              👑 Tails
            </ActionButton>
          </div>
          {streak > 0 && (
            <ActionButton onClick={cashOut} disabled={busy} variant="cash" silent>
              Cash Out {chainMultiplier.toFixed(2)}×
            </ActionButton>
          )}
        </div>
      )}
    </div>
  );
}
