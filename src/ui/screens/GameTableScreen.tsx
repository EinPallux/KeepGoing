import { getGameModule } from '../../engine/games';
import { floorTarget } from '../../engine/run';
import { useRunStore } from '../../store/runStore';
import { BigCounter } from '../components/BigCounter';
import { CharmShelf } from '../components/CharmShelf';
import { TABLE_COMPONENTS } from '../tables';

export function GameTableScreen() {
  const run = useRunStore((s) => s.run);
  const canCashOut = useRunStore((s) => s.canCashOutFloor());
  const cashOutFloor = useRunStore((s) => s.cashOutFloor);
  const activeTwist = useRunStore((s) => s.activeTwist);

  if (!run || !run.activeTableId) return null;

  const target = floorTarget(run.floor);
  const mod = getGameModule(run.activeTableId);
  const Table = TABLE_COMPONENTS[run.activeTableId];
  const twist = activeTwist();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4 text-sm">
        <span data-testid="table-label" data-table-id={mod.id} className="font-bold text-amber-300">
          {mod.label}
        </span>
        <span className="text-white/60">
          Floor {run.floor}/12 &middot; Target {target}
        </span>
        <span className="text-lg text-white">
          <BigCounter value={run.bankroll} /> chips
        </span>
        <span className="text-white/60">{run.playsLeft} plays left</span>
        {canCashOut && (
          <button
            type="button"
            onClick={cashOutFloor}
            className="rounded-full bg-emerald-500 px-4 py-1.5 font-bold text-black transition hover:scale-105"
          >
            Cash Out Floor (+{run.playsLeft * 10} bonus)
          </button>
        )}
      </div>

      {twist && (
        <div className="border-b border-rose-500/20 bg-rose-950/30 px-6 py-2 text-center text-sm">
          <span className="font-bold uppercase tracking-wide text-rose-300">Twist: {twist.label}</span>{' '}
          <span className="text-rose-100/70">{twist.description}</span>
        </div>
      )}

      <div className="border-b border-white/5 px-6 py-2">
        <CharmShelf />
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        {Table ? <Table /> : <p className="text-white/50">No UI registered for {mod.id} yet.</p>}
      </div>
    </div>
  );
}
