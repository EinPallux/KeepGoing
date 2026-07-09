import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { playClick } from '../fx/sound';

type Variant = 'primary' | 'action' | 'cash';

interface ActionButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: Variant;
  /** Adds an animated sheen sweep - use for the marquee "spin/roll/drop" CTA. */
  sheen?: boolean;
  className?: string;
  /** Suppress the built-in click sound (e.g. when the handler plays its own cue). */
  silent?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'kg-btn-primary',
  action: 'kg-btn-action',
  cash: 'kg-btn-cash',
};

/** The shared, juicy call-to-action button used across every table. */
export function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  sheen,
  className = '',
  silent,
}: ActionButtonProps) {
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      disabled={disabled}
      onClick={() => {
        if (!silent) playClick();
        onClick();
      }}
      className={`kg-btn ${VARIANT_CLASS[variant]} ${sheen ? 'kg-sheen overflow-hidden' : ''} px-9 py-3.5 text-lg ${className}`}
    >
      {children}
    </motion.button>
  );
}
