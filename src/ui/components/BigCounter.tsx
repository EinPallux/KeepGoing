import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

interface BigCounterProps {
  value: number;
  className?: string;
}

/** Odometer-style bankroll display - counts up/down and flashes green/red on change. */
export function BigCounter({ value, className = '' }: BigCounterProps) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString());
  const prevValueRef = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (value === prev) return;

    setFlash(value > prev ? 'up' : 'down');
    const controls = animate(motionValue, value, { duration: 0.7, ease: 'easeOut' });
    const timeout = setTimeout(() => setFlash(null), 650);
    prevValueRef.current = value;

    return () => {
      controls.stop();
      clearTimeout(timeout);
    };
  }, [value, motionValue]);

  return (
    <motion.span
      animate={{ scale: flash ? 1.14 : 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14 }}
      className={`kg-tnum inline-block font-mono transition-colors ${
        flash === 'up'
          ? 'text-emerald-300 [text-shadow:0_0_18px_rgba(52,224,161,0.6)]'
          : flash === 'down'
            ? 'text-rose-400 [text-shadow:0_0_18px_rgba(255,92,122,0.5)]'
            : ''
      } ${className}`}
    >
      {rounded}
    </motion.span>
  );
}
