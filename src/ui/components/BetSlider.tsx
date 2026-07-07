interface BetSliderProps {
  bet: number;
  max: number;
  onChange: (bet: number) => void;
  disabled?: boolean;
}

export function BetSlider({ bet, max, onChange, disabled }: BetSliderProps) {
  const safeMax = Math.max(1, max);
  const clamped = Math.min(bet, safeMax);

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <div className="flex items-center justify-between text-sm text-white/60">
        <span>Bet</span>
        <span className="font-mono text-amber-300">{clamped} chips</span>
      </div>
      <input
        type="range"
        min={1}
        max={safeMax}
        value={clamped}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-pink-500 disabled:opacity-40"
      />
      <div className="flex gap-2">
        {[0.25, 0.5, 1].map((fraction) => (
          <button
            key={fraction}
            type="button"
            disabled={disabled}
            onClick={() => onChange(Math.max(1, Math.floor(safeMax * fraction)))}
            className="flex-1 rounded-md bg-white/5 py-1 text-xs text-white/70 hover:bg-white/10 disabled:opacity-40"
          >
            {fraction === 1 ? 'MAX' : `${fraction * 100}%`}
          </button>
        ))}
      </div>
    </div>
  );
}
