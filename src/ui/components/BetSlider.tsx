import { playBet } from '../fx/sound';

interface BetSliderProps {
  bet: number;
  max: number;
  onChange: (bet: number) => void;
  disabled?: boolean;
  min?: number;
}

const QUICK = [
  { label: '−', mult: 0 as const, kind: 'dec' as const },
  { label: '½', mult: 0.5 as const, kind: 'frac' as const },
  { label: '2×', mult: 2 as const, kind: 'mul' as const },
  { label: 'MAX', mult: 1 as const, kind: 'max' as const },
];

/** Bet control: a golden-thumb slider plus quick chip adjustments, with a chip clink on change. */
export function BetSlider({ bet, max, onChange, disabled, min = 1 }: BetSliderProps) {
  const safeMax = Math.max(min, max);
  const clamped = Math.min(Math.max(bet, min), safeMax);

  const apply = (next: number) => {
    const v = Math.min(Math.max(Math.floor(next), min), safeMax);
    if (v !== clamped) playBet();
    onChange(v);
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <div className="flex items-center justify-between text-sm text-white/60">
        <span className="uppercase tracking-wide">Bet</span>
        <span className="kg-tnum flex items-center gap-1 font-bold text-amber-300">
          <span className="kg-chip h-4 w-4 text-[8px]">$</span>
          {clamped.toLocaleString()}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={safeMax}
        value={clamped}
        disabled={disabled}
        onChange={(e) => apply(Number(e.target.value))}
        className="kg-range w-full disabled:opacity-40"
      />
      <div className="flex gap-2">
        {QUICK.map((q) => (
          <button
            key={q.label}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (q.kind === 'dec') apply(clamped - Math.max(1, Math.round(safeMax * 0.1)));
              else if (q.kind === 'frac') apply(safeMax * q.mult);
              else if (q.kind === 'mul') apply(clamped * q.mult);
              else apply(safeMax);
            }}
            className="kg-glass flex-1 rounded-lg py-1.5 text-xs font-bold text-white/75 transition hover:text-white disabled:opacity-40"
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
