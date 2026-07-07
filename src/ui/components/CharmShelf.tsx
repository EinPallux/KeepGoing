import { useRunStore } from '../../store/runStore';
import { getCharmDef, MAX_CHARM_SLOTS } from '../../engine/charms';

/** Owned charms as hoverable pills, with empty slots shown as placeholders. */
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
            className="cursor-help rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300"
          >
            {def.label}
          </span>
        );
      })}
      {Array.from({ length: MAX_CHARM_SLOTS - run.charms.length }, (_, i) => (
        <span
          key={`empty-${i}`}
          className="rounded-full border border-dashed border-white/15 px-3 py-1 text-xs text-white/30"
        >
          empty
        </span>
      ))}
    </div>
  );
}
