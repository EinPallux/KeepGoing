import { motion } from 'framer-motion';

interface MultiplierBadgeProps {
  value: number;
  /** 'live' = still climbing (cyan), 'win' = green, 'loss' = red, 'idle' = neutral gold. */
  tone?: 'live' | 'win' | 'loss' | 'idle';
  size?: 'md' | 'lg' | 'xl';
  label?: string;
}

const TONE: Record<string, string> = {
  live: 'text-cyan-300 border-cyan-400/40 shadow-[0_0_26px_rgba(56,225,255,0.4)]',
  win: 'text-emerald-300 border-emerald-400/50 shadow-[0_0_26px_rgba(52,224,161,0.45)]',
  loss: 'text-rose-300 border-rose-400/50 shadow-[0_0_26px_rgba(255,92,122,0.4)]',
  idle: 'text-amber-300 border-amber-400/40 shadow-[0_0_22px_rgba(255,207,92,0.35)]',
};

const SIZE: Record<string, string> = {
  md: 'text-2xl px-4 py-1.5',
  lg: 'text-4xl px-6 py-2',
  xl: 'text-6xl px-8 py-3',
};

/** The glowing multiplier readout shared by crash / mines / tower / hilo / chicken. */
export function MultiplierBadge({ value, tone = 'idle', size = 'lg', label }: MultiplierBadgeProps) {
  return (
    <motion.div
      key={tone}
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 0.35 }}
      className={`kg-glass-strong inline-flex flex-col items-center rounded-2xl border font-black ${TONE[tone]} ${SIZE[size]}`}
    >
      {label && <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</span>}
      <span className="kg-tnum leading-none">{value.toFixed(2)}×</span>
    </motion.div>
  );
}
