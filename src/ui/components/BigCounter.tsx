import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

interface BigCounterProps {
  value: number;
  className?: string;
}

/** Animated, odometer-style bankroll display - counts up/down and flashes on change. */
export function BigCounter({ value, className = '' }: BigCounterProps) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString());
  const prevValueRef = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (value === prev) return;

    setFlash(value > prev ? 'up' : 'down');
    const controls = animate(motionValue, value, { duration: 0.6, ease: 'easeOut' });
    const timeout = setTimeout(() => setFlash(null), 500);
    prevValueRef.current = value;

    return () => {
      controls.stop();
      clearTimeout(timeout);
    };
  }, [value, motionValue]);

  return (
    <motion.span
      animate={{ scale: flash ? 1.12 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={`inline-block font-mono tabular-nums transition-colors ${
        flash === 'up' ? 'text-emerald-300' : flash === 'down' ? 'text-rose-400' : ''
      } ${className}`}
    >
      {rounded}
    </motion.span>
  );
}
