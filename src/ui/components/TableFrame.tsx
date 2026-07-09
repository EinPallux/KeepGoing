import type { ReactNode } from 'react';

interface TableFrameProps {
  children: ReactNode;
  /** 'felt' = green casino felt, 'glass' = dark glass (for boards / grids). */
  surface?: 'felt' | 'glass';
  className?: string;
}

/** A consistent rounded casino-table surface every game's playfield sits on. */
export function TableFrame({ children, surface = 'felt', className = '' }: TableFrameProps) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-3xl p-5 ${
        surface === 'felt' ? 'kg-felt' : 'kg-glass-strong'
      } ${className}`}
    >
      {children}
    </div>
  );
}
