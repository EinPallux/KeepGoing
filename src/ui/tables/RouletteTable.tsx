import { useEffect, useRef, useState } from 'react';
import { useRunStore } from '../../store/runStore';
import type { RouletteBetType, RouletteColor, RouletteParity, RouletteState } from '../../engine/games/roulette';
import { numberColor } from '../../engine/games/roulette';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { TableFrame } from '../components/TableFrame';
import { useReveal } from '../fx/useReveal';
import { playWhoosh, playTick, playCoin } from '../fx/sound';

const BET_TYPES: { id: RouletteBetType; label: string }[] = [
  { id: 'color', label: 'Red/Black' },
  { id: 'parity', label: 'Odd/Even' },
  { id: 'dozen', label: 'Dozen' },
  { id: 'straight', label: 'Straight Up' },
];

const SIZE = 500;
const DUR = 3200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 234;
const R_INNER = 134;
const R_NUM = 184;

const POCKET_FILL: Record<string, string> = { red: '#e5405e', black: '#1c2030', green: '#0f9d58' };

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function label(n: number): string {
  return n === 37 ? '00' : String(n);
}

export function RouletteTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [betType, setBetType] = useState<RouletteBetType>('color');
  const [color, setColor] = useState<RouletteColor>('red');
  const [parity, setParity] = useState<RouletteParity>('odd');
  const [dozen, setDozen] = useState<1 | 2 | 3>(1);
  const [straightNumber, setStraightNumber] = useState(17);
  const [settled, setSettled] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const state = currentRound?.state as RouletteState | undefined;
  const resolved = state?.resolved ?? false;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const { done } = useReveal(resolved, revealKey, DUR + 200);
  const spinning = resolved && !done;

  const result = state?.result ?? null;
  const total = result === 37 ? 38 : 37;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== SIZE * dpr) {
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const anglePer = (2 * Math.PI) / total;
    const topAngle = -Math.PI / 2;
    // baseAngle(i) = i * anglePer. Rotate wheel so `result` lands under the top pointer.
    const wheelRotFinal = result != null ? topAngle - result * anglePer : 0;

    const drawWheel = (rot: number, ballPos: { x: number; y: number } | null, flash: number) => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // outer gold rim
      ctx.beginPath();
      ctx.arc(CX, CY, R_OUTER + 8, 0, Math.PI * 2);
      ctx.fillStyle = '#3a2c10';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#d9a441';
      ctx.stroke();

      // pockets
      for (let i = 0; i < total; i++) {
        const mid = i * anglePer + rot;
        const a0 = mid - anglePer / 2;
        const a1 = mid + anglePer / 2;
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, R_OUTER, a0, a1);
        ctx.closePath();
        ctx.fillStyle = POCKET_FILL[numberColor(i)];
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.stroke();

        // winning-pocket flash overlay
        if (flash > 0 && result != null && i === result) {
          ctx.beginPath();
          ctx.moveTo(CX, CY);
          ctx.arc(CX, CY, R_OUTER, a0, a1);
          ctx.closePath();
          ctx.fillStyle = `rgba(255,240,180,${0.55 * flash})`;
          ctx.fill();
        }

        // number
        ctx.save();
        ctx.translate(CX + R_NUM * Math.cos(mid), CY + R_NUM * Math.sin(mid));
        ctx.rotate(mid + Math.PI / 2);
        ctx.fillStyle = '#fff';
        ctx.font = '700 12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label(i), 0, 0);
        ctx.restore();
      }

      // inner hub
      ctx.beginPath();
      ctx.arc(CX, CY, R_INNER, 0, Math.PI * 2);
      const hub = ctx.createRadialGradient(CX, CY, 8, CX, CY, R_INNER);
      hub.addColorStop(0, '#241a2e');
      hub.addColorStop(1, '#0d0912');
      ctx.fillStyle = hub;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#d9a441';
      ctx.stroke();

      // spokes
      ctx.strokeStyle = 'rgba(217,164,65,0.35)';
      ctx.lineWidth = 2;
      for (let s = 0; s < 8; s++) {
        const a = rot + (s * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(CX + R_INNER * Math.cos(a), CY + R_INNER * Math.sin(a));
        ctx.stroke();
      }

      // ball
      if (ballPos) {
        ctx.beginPath();
        ctx.arc(ballPos.x, ballPos.y, 8, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(ballPos.x - 2, ballPos.y - 2, 1, ballPos.x, ballPos.y, 9);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#c9cdd6');
        ctx.fillStyle = g;
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // top pointer
      ctx.beginPath();
      ctx.moveTo(CX - 12, CY - R_OUTER - 12);
      ctx.lineTo(CX + 12, CY - R_OUTER - 12);
      ctx.lineTo(CX, CY - R_OUTER + 12);
      ctx.closePath();
      ctx.fillStyle = '#ffcf5c';
      ctx.shadowColor = '#ffcf5c';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    if (!spinning || result == null) {
      const rot = resolved && result != null ? wheelRotFinal : 0;
      const ballPos = resolved && result != null ? { x: CX, y: CY - (R_OUTER + R_INNER) / 2 } : null;
      drawWheel(rot, ballPos, resolved && result != null ? 1 : 0);
      return;
    }

    setSettled(false);
    const wheelTurns = 5;
    const ballTurns = 9;
    let raf = 0;
    let startT = 0;
    let lastIdx = 999;
    let lastTickT = -1;
    let coined = false;

    const frame = (now: number) => {
      if (!startT) startT = now;
      const elapsed = now - startT;
      const p = Math.min(1, elapsed / DUR);
      const e = easeOutCubic(p);

      const rot = wheelRotFinal - 2 * Math.PI * wheelTurns * (1 - e);
      // Ball orbits opposite direction, spiraling inward as it slows.
      const ballAngle = topAngle + 2 * Math.PI * ballTurns * (1 - e);
      const settleR = (R_OUTER + R_INNER) / 2;
      const ballR = R_OUTER - 4 - (R_OUTER - 4 - settleR) * e;
      const ballPos = { x: CX + ballR * Math.cos(ballAngle), y: CY + ballR * Math.sin(ballAngle) };

      // tick as ball passes pockets (throttled)
      const rel = ballAngle - rot;
      const idx = Math.floor(rel / anglePer);
      if (idx !== lastIdx && elapsed - lastTickT > 34 && p < 0.99) {
        lastIdx = idx;
        lastTickT = elapsed;
        playTick(0.4 + 0.6 * (1 - p));
      }

      const flash = p > 0.9 ? (p - 0.9) / 0.1 : 0;
      drawWheel(rot, ballPos, flash);

      if (p < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        drawWheel(wheelRotFinal, { x: CX, y: CY - settleR }, 1);
        setSettled(true);
        if (!coined) {
          coined = true;
          if (state && state.payoutMultiplier > 0) playCoin();
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [spinning, resolved, result, total, state]);

  if (!run) return null;

  const value: number | RouletteColor | RouletteParity =
    betType === 'color' ? color : betType === 'parity' ? parity : betType === 'dozen' ? dozen : straightNumber;

  const spin = () => {
    playWhoosh();
    startRound({ betType, value });
    submitAction('spin');
  };

  const showResult = resolved && done && state;
  const showLabel = (settled || (resolved && done)) && result != null;

  return (
    <div className="flex flex-col items-center gap-5">
      <TableFrame surface="glass" className="!p-3">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <canvas ref={canvasRef} style={{ width: SIZE, height: SIZE }} />
          {showLabel && result != null && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <span
                className={`kg-anim-pop kg-tnum rounded-full px-5 py-1.5 text-lg font-black backdrop-blur ${
                  numberColor(result) === 'red'
                    ? 'bg-rose-500/25 text-rose-200 border border-rose-400/50'
                    : numberColor(result) === 'green'
                      ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50'
                      : 'bg-white/15 text-white border border-white/40'
                }`}
              >
                {label(result)} {numberColor(result).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </TableFrame>

      <div className="flex h-20 items-center">
        {showResult && currentRound && currentRound.resultDelta !== null && (
          <PlayResultBanner
            key={revealKey}
            delta={currentRound.resultDelta}
            payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
          />
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {BET_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={spinning}
            onClick={() => setBetType(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              betType === t.id ? 'bg-amber-400 text-black' : 'kg-glass text-white/70 hover:text-white'
            } disabled:opacity-40`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex h-11 items-center">
        {betType === 'color' && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={spinning}
              onClick={() => setColor('red')}
              className={`rounded-full px-5 py-2 font-bold transition ${color === 'red' ? 'bg-rose-500 text-black' : 'kg-glass text-white/70'} disabled:opacity-40`}
            >
              Red
            </button>
            <button
              type="button"
              disabled={spinning}
              onClick={() => setColor('black')}
              className={`rounded-full px-5 py-2 font-bold transition ${color === 'black' ? 'bg-white text-black' : 'kg-glass text-white/70'} disabled:opacity-40`}
            >
              Black
            </button>
          </div>
        )}
        {betType === 'parity' && (
          <div className="flex gap-2">
            {(['odd', 'even'] as const).map((pv) => (
              <button
                key={pv}
                type="button"
                disabled={spinning}
                onClick={() => setParity(pv)}
                className={`rounded-full px-5 py-2 font-bold capitalize transition ${parity === pv ? 'bg-amber-400 text-black' : 'kg-glass text-white/70'} disabled:opacity-40`}
              >
                {pv}
              </button>
            ))}
          </div>
        )}
        {betType === 'dozen' && (
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((d) => (
              <button
                key={d}
                type="button"
                disabled={spinning}
                onClick={() => setDozen(d)}
                className={`rounded-full px-5 py-2 font-bold transition ${dozen === d ? 'bg-amber-400 text-black' : 'kg-glass text-white/70'} disabled:opacity-40`}
              >
                {d === 1 ? '1-12' : d === 2 ? '13-24' : '25-36'}
              </button>
            ))}
          </div>
        )}
        {betType === 'straight' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={spinning}
              onClick={() => setStraightNumber((n) => Math.max(0, n - 1))}
              className="kg-glass rounded-full px-4 py-2 font-bold text-white/70 hover:text-white disabled:opacity-40"
            >
              −
            </button>
            <span
              className={`kg-tnum w-14 rounded-xl py-1 text-center font-mono text-xl font-black ${
                numberColor(straightNumber) === 'red'
                  ? 'text-rose-300'
                  : numberColor(straightNumber) === 'green'
                    ? 'text-emerald-300'
                    : 'text-white'
              }`}
            >
              {straightNumber}
            </span>
            <button
              type="button"
              disabled={spinning}
              onClick={() => setStraightNumber((n) => Math.min(36, n + 1))}
              className="kg-glass rounded-full px-4 py-2 font-bold text-white/70 hover:text-white disabled:opacity-40"
            >
              +
            </button>
          </div>
        )}
      </div>

      <BetSlider bet={bet} max={run.bankroll} onChange={setBet} disabled={spinning} />
      <ActionButton onClick={spin} disabled={run.bankroll <= 0 || spinning} variant="action" sheen silent>
        {spinning ? 'No more bets…' : resolved ? 'Spin Again' : 'SPIN'}
      </ActionButton>
    </div>
  );
}
