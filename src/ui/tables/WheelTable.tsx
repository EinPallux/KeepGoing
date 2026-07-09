import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import type { WheelRisk, WheelState } from '../../engine/games/wheel';
import { WHEEL_SEGMENTS, WHEEL_SEGMENT_COUNT } from '../../engine/games/wheel';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { TableFrame } from '../components/TableFrame';
import { useReveal } from '../fx/useReveal';
import { playWhoosh, playTick, playCoin } from '../fx/sound';

const RISKS: WheelRisk[] = ['low', 'medium', 'high'];
const SIZE = 500;
const CENTER = SIZE / 2;
const R = 232;
const SEG = (Math.PI * 2) / WHEEL_SEGMENT_COUNT;
const TURNS = 6;
const DURATION = 2800;
const REVEAL_MS = 2950;
// The pointer sits at the top; in canvas space "up" is -PI/2.
const POINTER = -Math.PI / 2;

function segColor(m: number): string {
  if (m >= 5) return '#ff4d6d'; // hot pink/red
  if (m >= 2) return '#ff9e4d'; // amber
  if (m >= 1) return '#c79a35'; // gold-dim
  return '#1e293b'; // dark slate
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function WheelTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [risk, setRisk] = useState<WheelRisk>('medium');

  const state = currentRound?.state as WheelState | undefined;
  const resolved = state?.resolved ?? false;
  const activeRisk = state?.risk ?? risk;
  const segmentIndex = state?.segmentIndex ?? null;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const { done } = useReveal(resolved, revealKey, REVEAL_MS);
  const spinning = resolved && !done;
  const landed = resolved && done;

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

    const mults = WHEEL_SEGMENTS[activeRisk];

    const drawWheel = (rot: number, highlight: number | null) => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Rotating wheel body.
      ctx.save();
      ctx.translate(CENTER, CENTER);
      ctx.rotate(rot);
      for (let i = 0; i < WHEEL_SEGMENT_COUNT; i++) {
        const a0 = (i - 0.5) * SEG;
        const a1 = (i + 0.5) * SEG;
        const hot = highlight === i;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, a0, a1);
        ctx.closePath();
        ctx.fillStyle = segColor(mults[i]);
        if (hot) {
          ctx.shadowColor = '#fff2c4';
          ctx.shadowBlur = 24;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = hot ? '#fff6d8' : 'rgba(0,0,0,0.35)';
        ctx.lineWidth = hot ? 3 : 1;
        ctx.stroke();

        // Multiplier label near the outer edge.
        ctx.save();
        ctx.rotate(i * SEG);
        ctx.translate(R * 0.74, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = mults[i] === 0 ? 'rgba(255,255,255,0.45)' : '#1a0f00';
        ctx.font = `${hot ? '900' : '800'} 15px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${mults[i]}×`, 0, 0);
        ctx.restore();
      }
      // Outer rim.
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,207,92,0.85)';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();

      // Center hub (fixed, does not rotate).
      const hub = ctx.createRadialGradient(CENTER - 6, CENTER - 6, 4, CENTER, CENTER, 46);
      hub.addColorStop(0, '#231a08');
      hub.addColorStop(1, '#0b0710');
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, 46, 0, Math.PI * 2);
      ctx.fillStyle = hub;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,207,92,0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Fixed pointer/ticker at the top.
      ctx.beginPath();
      ctx.moveTo(CENTER - 12, 6);
      ctx.lineTo(CENTER + 12, 6);
      ctx.lineTo(CENTER, 34);
      ctx.closePath();
      ctx.fillStyle = '#ffcf5c';
      ctx.shadowColor = '#ffcf5c';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // Rotation that lands `segmentIndex` centered under the pointer.
    const restRot = segmentIndex != null ? POINTER - segmentIndex * SEG : 0;

    if (!spinning || segmentIndex == null) {
      drawWheel(restRot, landed ? segmentIndex : null);
      return;
    }

    const endRot = TURNS * Math.PI * 2 + restRot;
    let raf = 0;
    let startT = 0;
    let lastSeg = 0;
    let lastTickT = -100;
    let coinPlayed = false;

    const frame = (now: number) => {
      if (!startT) startT = now;
      const elapsed = now - startT;
      const t = Math.min(1, elapsed / DURATION);
      const rot = endRot * easeOutCubic(t);

      const passed = Math.floor(rot / SEG);
      if (passed !== lastSeg && elapsed - lastTickT > 28) {
        lastSeg = passed;
        lastTickT = elapsed;
        playTick(0.4 + (1 - t) * 0.6);
      }

      if (t < 1) {
        drawWheel(rot, null);
        raf = requestAnimationFrame(frame);
      } else {
        drawWheel(restRot, segmentIndex);
        if (!coinPlayed) {
          coinPlayed = true;
          if (mults[segmentIndex] > 0) playCoin();
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [spinning, activeRisk, segmentIndex, landed]);

  if (!run) return null;

  const spin = () => {
    playWhoosh();
    startRound({ risk });
    submitAction('spin');
  };

  const winMult = landed && segmentIndex != null ? WHEEL_SEGMENTS[activeRisk][segmentIndex] : null;
  const showResult = landed && currentRound && currentRound.resultDelta !== null;

  return (
    <div className="flex flex-col items-center gap-5">
      <TableFrame surface="glass" className="p-4">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <canvas ref={canvasRef} style={{ width: SIZE, height: SIZE }} />
          <AnimatePresence>
            {winMult != null && (
              <motion.div
                key={revealKey}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <span
                  className={`kg-tnum text-2xl font-black ${
                    winMult > 0 ? 'kg-gold-text' : 'text-white/50'
                  }`}
                  style={winMult >= 5 ? { filter: 'drop-shadow(0 0 12px rgba(255,77,109,0.9))' } : undefined}
                >
                  {winMult}×
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </TableFrame>

      <div className="flex h-16 items-center">
        {showResult && (
          <PlayResultBanner
            key={revealKey}
            delta={currentRound.resultDelta ?? 0}
            payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
          />
        )}
      </div>

      <div className="flex gap-2">
        {RISKS.map((r) => (
          <button
            key={r}
            type="button"
            disabled={spinning}
            onClick={() => setRisk(r)}
            className={`rounded-full px-5 py-2 font-bold capitalize transition ${
              risk === r ? 'bg-amber-400 text-black' : 'kg-glass text-white/70 hover:text-white'
            } disabled:opacity-40`}
          >
            {r}
          </button>
        ))}
      </div>

      <BetSlider bet={bet} max={run.bankroll} onChange={setBet} disabled={spinning} />
      <ActionButton onClick={spin} disabled={run.bankroll <= 0 || spinning} sheen silent>
        {spinning ? 'Spinning…' : resolved ? 'Spin Again' : 'SPIN'}
      </ActionButton>
    </div>
  );
}
