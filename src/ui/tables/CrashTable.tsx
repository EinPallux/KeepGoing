import { useEffect, useRef, useState } from 'react';
import { useRunStore } from '../../store/runStore';
import type { CrashState } from '../../engine/games/crash';
import { CRASH_MAX_TARGET, CRASH_MIN_TARGET } from '../../engine/games/crash';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { useReveal } from '../fx/useReveal';
import { playClimb, playExplosion, playCashout, playWhoosh } from '../fx/sound';
import { screenShake } from '../fx/confetti';

const PRESETS = [1.5, 2, 3, 5, 10];
const W = 540;
const H = 300;

function climbDuration(endpoint: number): number {
  return Math.min(2600, Math.max(900, 700 + 650 * Math.log2(Math.max(2, endpoint))));
}

export function CrashTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [target, setTarget] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const state = currentRound?.state as CrashState | undefined;
  const resolved = state?.resolved ?? false;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';

  const endpoint = state ? (state.won ? state.targetMultiplier : (state.crashPoint ?? 1)) : 1;
  const climbMs = climbDuration(endpoint);
  const { done } = useReveal(resolved, revealKey, climbMs + 550);
  const flying = resolved && !done;

  const [ended, setEnded] = useState<null | 'won' | 'lost'>(null);

  useEffect(() => {
    if (!flying || !state || state.crashPoint == null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const won = state.won === true;
    const end = won ? state.targetMultiplier : state.crashPoint;
    const maxM = end * 1.18;
    const pad = 34;
    setEnded(null);

    let raf = 0;
    let startT = 0;
    let lastTone = 0;

    const xAt = (p: number) => pad + p * (W - 2 * pad);
    const yAt = (m: number) => H - pad - (Math.log(m) / Math.log(maxM)) * (H - 2 * pad);

    const draw = (now: number) => {
      if (!startT) startT = now;
      const elapsed = now - startT;
      const pc = Math.min(1, elapsed / climbMs);
      const mHead = Math.pow(end, pc);

      ctx.clearRect(0, 0, W, H);

      // grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let gx = pad; gx <= W - pad; gx += (W - 2 * pad) / 6) {
        ctx.beginPath();
        ctx.moveTo(gx, pad);
        ctx.lineTo(gx, H - pad);
        ctx.stroke();
      }

      // curve
      const hue = won ? '#34e0a1' : '#38e1ff';
      ctx.beginPath();
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const p = (pc * i) / steps;
        const m = Math.pow(end, p);
        const x = xAt(p);
        const y = yAt(m);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // area fill
      const hx = xAt(pc);
      const hy = yAt(mHead);
      ctx.lineTo(hx, H - pad);
      ctx.lineTo(xAt(0), H - pad);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad, 0, H - pad);
      grad.addColorStop(0, won ? 'rgba(52,224,161,0.35)' : 'rgba(56,225,255,0.3)');
      grad.addColorStop(1, 'rgba(56,225,255,0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // stroke curve
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const p = (pc * i) / steps;
        const m = Math.pow(end, p);
        const x = xAt(p);
        const y = yAt(m);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = hue;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = hue;
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // rocket head
      ctx.font = '26px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚀', hx, hy - 4);

      // multiplier text
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.font = '900 52px system-ui';
      ctx.fillText(`${mHead.toFixed(2)}×`, W / 2, 60);

      if (elapsed > lastTone + 70) {
        lastTone = elapsed;
        playClimb(pc);
        if (pc > 0.7) screenShake('light');
      }

      if (pc < 1) {
        raf = requestAnimationFrame(draw);
      } else {
        setEnded(won ? 'won' : 'lost');
        if (won) {
          playCashout();
        } else {
          playExplosion();
          screenShake('heavy');
          // red burst
          ctx.fillStyle = 'rgba(255,80,110,0.5)';
          ctx.beginPath();
          ctx.arc(hx, hy, 40, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [flying, climbMs, state]);

  if (!run) return null;

  const launch = () => {
    playWhoosh();
    startRound({ targetMultiplier: Math.min(CRASH_MAX_TARGET, target) });
    submitAction('launch');
  };

  const showResult = resolved && done && state;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#080611] shadow-2xl" style={{ width: W, height: H }}>
        <canvas ref={canvasRef} style={{ width: W, height: H }} />
        {ended && flying && (
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center text-4xl font-black ${
              ended === 'won' ? 'text-emerald-300' : 'text-rose-400'
            }`}
          >
            <span className="rounded-xl bg-black/40 px-5 py-2 backdrop-blur kg-anim-pop">
              {ended === 'won' ? `CASHED @ ${state?.targetMultiplier.toFixed(2)}×` : `CRASHED @ ${state?.crashPoint?.toFixed(2)}×`}
            </span>
          </div>
        )}
        {!resolved && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/40">
            <span className="text-lg">Auto-cashout at {target.toFixed(2)}×</span>
          </div>
        )}
      </div>

      <div className="h-20">
        {showResult && currentRound && currentRound.resultDelta !== null && (
          <PlayResultBanner
            key={revealKey}
            delta={currentRound.resultDelta}
            payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
          />
        )}
      </div>

      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={flying}
            onClick={() => setTarget(p)}
            className={`kg-tnum rounded-full px-4 py-2 text-sm font-bold transition ${
              target === p ? 'bg-amber-400 text-black' : 'kg-glass text-white/70 hover:text-white'
            } disabled:opacity-40`}
          >
            {p}×
          </button>
        ))}
      </div>
      <div className="flex w-full max-w-sm flex-col items-center gap-1">
        <input
          type="range"
          min={CRASH_MIN_TARGET}
          max={20}
          step={0.1}
          value={target}
          disabled={flying}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="kg-range w-full disabled:opacity-40"
        />
        <p className="text-sm text-white/70">
          Auto-cashout at <span className="kg-tnum font-mono text-amber-300">{target.toFixed(2)}×</span>
        </p>
      </div>

      <BetSlider bet={bet} max={run.bankroll} onChange={setBet} disabled={flying} />
      <ActionButton onClick={launch} disabled={run.bankroll <= 0 || flying} variant="action" sheen silent>
        {flying ? 'Climbing…' : resolved ? 'Launch Again' : 'LAUNCH 🚀'}
      </ActionButton>
    </div>
  );
}
