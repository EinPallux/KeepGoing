import { useEffect, useRef, useState } from 'react';
import { useRunStore } from '../../store/runStore';
import type { PlinkoRisk, PlinkoState } from '../../engine/games/plinko';
import { PLINKO_MULTIPLIERS, PLINKO_ROWS } from '../../engine/games/plinko';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';
import { ActionButton } from '../components/ActionButton';
import { useReveal } from '../fx/useReveal';
import { playPing, playWhoosh, playCoin } from '../fx/sound';

const RISKS: PlinkoRisk[] = ['low', 'medium', 'high'];
const W = 580;
const H = 600;
const TOP = 40;
const BUCKET_H = 58;
const MARGIN = 36;
const SPACING = (W - 2 * MARGIN) / PLINKO_ROWS;
const ROW_GAP = (H - TOP - BUCKET_H) / PLINKO_ROWS;
const CENTER = W / 2;
const SEG_MS = 92;
const DURATION = SEG_MS * PLINKO_ROWS + 380;

function bucketColor(mult: number): string {
  if (mult >= 5) return '#ff4d6d';
  if (mult >= 2) return '#ff9e4d';
  if (mult >= 1) return '#ffcf5c';
  if (mult >= 0.7) return '#7c8bff';
  return '#4d6bff';
}

export function PlinkoTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [risk, setRisk] = useState<PlinkoRisk>('medium');

  const state = currentRound?.state as PlinkoState | undefined;
  const resolved = state?.resolved ?? false;
  const activeRisk = state?.risk ?? risk;
  const playIndex = run ? run.playsTotal - run.playsLeft : 0;
  const revealKey = run ? `${run.floor}:${playIndex}` : 'idle';
  const { done } = useReveal(resolved, revealKey, DURATION);
  const dropping = resolved && !done;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== W * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const mults = PLINKO_MULTIPLIERS[activeRisk];
    const bucketX = (b: number) => CENTER + (b - PLINKO_ROWS / 2) * SPACING;

    const drawBoard = (litPeg: { r: number; i: number } | null, highlightBucket: number | null, ball: { x: number; y: number } | null) => {
      ctx.clearRect(0, 0, W, H);
      // pegs
      for (let r = 0; r < PLINKO_ROWS; r++) {
        for (let i = 0; i <= r; i++) {
          const x = CENTER + (i - r / 2) * SPACING;
          const y = TOP + (r + 0.5) * ROW_GAP;
          const lit = litPeg && litPeg.r === r && litPeg.i === i;
          ctx.beginPath();
          ctx.arc(x, y, lit ? 5 : 3, 0, Math.PI * 2);
          ctx.fillStyle = lit ? '#fff2c4' : 'rgba(255,255,255,0.5)';
          if (lit) {
            ctx.shadowColor = '#ffcf5c';
            ctx.shadowBlur = 12;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      // buckets
      for (let b = 0; b <= PLINKO_ROWS; b++) {
        const cx = bucketX(b);
        const w = SPACING * 0.92;
        const x = cx - w / 2;
        const y = H - BUCKET_H;
        const col = bucketColor(mults[b]);
        const hot = highlightBucket === b;
        ctx.fillStyle = hot ? col : `${col}55`;
        if (hot) {
          ctx.shadowColor = col;
          ctx.shadowBlur = 18;
        }
        ctx.beginPath();
        ctx.roundRect(x, y, w, BUCKET_H - 6, 6);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = hot ? '#1a0f00' : 'rgba(255,255,255,0.85)';
        ctx.font = `${hot ? '800 ' : ''}11px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${mults[b]}×`, cx, y + (BUCKET_H - 6) / 2);
      }
      // ball
      if (ball) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, 9);
        g.addColorStop(0, '#fff6d8');
        g.addColorStop(1, '#f0a83a');
        ctx.fillStyle = g;
        ctx.shadowColor = '#ffcf5c';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    if (!dropping || !state?.path) {
      drawBoard(null, resolved && state?.bucket != null ? state.bucket : null, null);
      return;
    }

    // Build waypoints from the deterministic path.
    const path = state.path;
    const waypoints: { x: number; y: number }[] = [{ x: CENTER, y: TOP }];
    let rights = 0;
    for (let r = 0; r < PLINKO_ROWS; r++) {
      if (path[r]) rights++;
      const x = CENTER + (2 * rights - (r + 1)) * (SPACING / 2);
      const y = TOP + (r + 1) * ROW_GAP;
      waypoints.push({ x, y });
    }
    const finalBucket = rights;

    let raf = 0;
    let startT = 0;
    let lastRow = -1;

    const frame = (now: number) => {
      if (!startT) startT = now;
      const elapsed = now - startT;
      const seg = Math.min(PLINKO_ROWS, elapsed / SEG_MS);
      const idx = Math.floor(seg);
      const localT = seg - idx;
      let ball: { x: number; y: number };
      if (idx >= PLINKO_ROWS) {
        ball = waypoints[PLINKO_ROWS];
      } else {
        const a = waypoints[idx];
        const b = waypoints[idx + 1];
        const ease = localT * localT; // accelerate downward
        ball = { x: a.x + (b.x - a.x) * localT, y: a.y + (b.y - a.y) * ease };
      }
      const curRow = Math.min(PLINKO_ROWS - 1, idx);
      if (curRow !== lastRow && idx < PLINKO_ROWS) {
        lastRow = curRow;
        playPing(curRow / PLINKO_ROWS);
      }
      const litPeg = idx < PLINKO_ROWS ? { r: idx, i: Math.round((ball.x - (CENTER - (idx / 2) * SPACING)) / SPACING) } : null;
      drawBoard(litPeg, elapsed >= DURATION - 380 ? finalBucket : null, ball);

      if (elapsed < DURATION - 200) {
        raf = requestAnimationFrame(frame);
      } else {
        drawBoard(null, finalBucket, waypoints[PLINKO_ROWS]);
        if (mults[finalBucket] >= 1) playCoin();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [dropping, activeRisk, resolved, state]);

  if (!run) return null;

  const drop = () => {
    playWhoosh();
    startRound({ risk });
    submitAction('drop');
  };

  const showResult = resolved && done && state;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="rounded-2xl border border-white/10 bg-[#080611] p-2 shadow-2xl">
        <canvas ref={canvasRef} style={{ width: W, height: H }} />
      </div>

      <div className="h-16">
        {showResult && currentRound && currentRound.resultDelta !== null && (
          <PlayResultBanner
            key={revealKey}
            delta={currentRound.resultDelta}
            payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
          />
        )}
      </div>

      <div className="flex gap-2">
        {RISKS.map((r) => (
          <button
            key={r}
            type="button"
            disabled={dropping}
            onClick={() => setRisk(r)}
            className={`rounded-full px-5 py-2 font-bold capitalize transition ${
              risk === r ? 'bg-amber-400 text-black' : 'kg-glass text-white/70 hover:text-white'
            } disabled:opacity-40`}
          >
            {r}
          </button>
        ))}
      </div>

      <BetSlider bet={bet} max={run.bankroll} onChange={setBet} disabled={dropping} />
      <ActionButton onClick={drop} disabled={run.bankroll <= 0 || dropping} sheen silent>
        {dropping ? 'Dropping…' : resolved ? 'Drop Again' : 'DROP'}
      </ActionButton>
    </div>
  );
}
