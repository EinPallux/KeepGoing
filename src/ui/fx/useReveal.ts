import { useCallback, useEffect, useRef, useState } from 'react';
import { useRunStore } from '../../store/runStore';

/**
 * Drives the per-table "reveal" of an already-resolved play. While a reveal is
 * running the store holds the header bankroll and defers the floor-clear
 * screen (see runStore.revealing); this hook is what eventually releases that
 * gate via endReveal().
 *
 * `active`      - true once the round is resolved and there's an outcome to show.
 * `key`         - a value that changes on every new resolution (e.g. stepIndex),
 *                 so re-resolving restarts the reveal.
 * `durationMs`  - how long the table's animation runs; the reveal auto-finishes
 *                 then (also the failsafe if `finish()` is never called).
 *
 * Returns `done` (safe to show the payout banner / fire confetti) and `finish`
 * (call the instant a bespoke animation lands, to end the reveal early). On
 * unmount the store gate is always released, so a table can never wedge the run.
 */
export function useReveal(
  active: boolean,
  key: string | number,
  durationMs: number,
): { done: boolean; finish: () => void } {
  const endReveal = useRunStore((s) => s.endReveal);
  // Held in a ref so effects can call the latest endReveal without listing it as
  // a dependency (which would otherwise re-run the timer effect).
  const endRevealRef = useRef(endReveal);
  endRevealRef.current = endReveal;

  const [finishedKey, setFinishedKey] = useState<string | number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armedKeyRef = useRef<string | number | null>(null);

  const done = !active || finishedKey === key;

  const clearTimer = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const finish = useCallback(() => {
    clearTimer();
    if (armedKeyRef.current != null) setFinishedKey(armedKeyRef.current);
    endRevealRef.current();
  }, []);

  useEffect(() => {
    if (!active) return;
    armedKeyRef.current = key;
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setFinishedKey(key);
      endRevealRef.current();
    }, durationMs);
    // Only cancel the pending timer when the key/active changes. Do NOT end the
    // reveal here: on repeat plays submitAction opens the gate in the SAME render
    // that changes `key`, so ending it in this cleanup would slam it shut before
    // the animation runs (spoiling the outcome / skipping the win screen).
    return () => clearTimer();
  }, [active, key, durationMs]);

  // Safety net: release the gate only on a real unmount, never on key changes.
  useEffect(() => () => endRevealRef.current(), []);

  return { done, finish };
}
