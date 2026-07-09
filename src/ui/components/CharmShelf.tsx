import { useRunStore } from '../../store/runStore';
import { getCharmDef, MAX_CHARM_SLOTS } from '../../engine/charms';

/** Owned charms as glowing hoverable pills, with empty slots shown as placeholders. */
export function CharmShelf() {
  const run = useRunStore((s) => s.run);
  if (!run) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {run.charms.map((id) => {
        const def = getCharmDef(id);
        return (
          <span
            key={id}
            title={def.description}
            className="cursor-help rounded-full border border-amber-400/50 bg-gradient-to-b from-amber-400/20 to-amber-500/5 px-3 py-1 text-xs font-bold text-amber-200 shadow-[0_0_14px_rgba(255,207,92,0.25)] transition hover:scale-105 hover:shadow-[0_0_20px_rgba(255,207,92,0.5)]"
          >
            ✦ {def.label}
          </span>
        );
      })}
      {Array.from({ length: MAX_CHARM_SLOTS - run.charms.length }, (_, i) => (
        <span
          key={`empty-${i}`}
          className="rounded-full border border-dashed border-white/15 px-3 py-1 text-xs text-white/25"
        >
          empty
        </span>
      ))}
    </div>
  );
}
