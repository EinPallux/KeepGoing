import { getGameModule } from '../../engine/games';
import { floorTarget } from '../../engine/run';
import { useRunStore } from '../../store/runStore';
import { BigCounter } from '../components/BigCounter';
import { CharmShelf } from '../components/CharmShelf';
import { ActionButton } from '../components/ActionButton';
import { TABLE_COMPONENTS } from '../tables';

export function GameTableScreen() {
  const run = useRunStore((s) => s.run);
  const currentRound = useRunStore((s) => s.currentRound);
  const revealing = useRunStore((s) => s.revealing);
  const heldBankroll = useRunStore((s) => s.heldBankroll);
  const canCashOut = useRunStore((s) => s.canCashOutFloor());
  const cashOutFloor = useRunStore((s) => s.cashOutFloor);
  const activeTwist = useRunStore((s) => s.activeTwist);

  if (!run) return null;

  // During a reveal on the last play of a floor, activeTableId has already been
  // cleared - fall back to the round's table so the animation can finish.
  const tableId = run.activeTableId ?? currentRound?.tableId;
  if (!tableId) return null;

  const target = floorTarget(run.floor);
  const mod = getGameModule(tableId);
  const Table = TABLE_COMPONENTS[tableId];
  const twist = activeTwist();
  const displayBankroll = heldBankroll ?? run.bankroll;
  const progress = Math.min(1, displayBankroll / target);

  return (
    <div className="flex min-h-full flex-col">
      <header className="kg-glass-strong sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <div className="flex items-center gap-3">
          <span
            data-testid="table-label"
            data-table-id={mod.id}
            className="kg-gold-text text-lg font-black tracking-tight"
          >
            {mod.label}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/60">
            Floor {run.floor}/12
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-2xl font-black text-white">
              <BigCounter value={displayBankroll} /> <span className="text-sm text-white/50">chips</span>
            </span>
            <div className="mt-0.5 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="kg-tnum mt-0.5 text-[11px] text-white/45">target {target.toLocaleString()}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              {Array.from({ length: Math.min(run.playsTotal, 10) }, (_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${i < run.playsLeft ? 'bg-amber-300' : 'bg-white/15'}`}
                />
              ))}
            </div>
            <span className="text-[11px] text-white/45">{run.playsLeft} plays</span>
          </div>

          {canCashOut && !revealing && (
            <ActionButton variant="cash" onClick={cashOutFloor} className="!px-4 !py-2 !text-sm">
              Cash Out Floor +{run.playsLeft * 10}
            </ActionButton>
          )}
        </div>
      </header>

      {twist && (
        <div className="border-b border-rose-500/20 bg-rose-950/40 px-6 py-2 text-center text-sm backdrop-blur">
          <span className="font-bold uppercase tracking-wide text-rose-300">⚠ Twist: {twist.label}</span>{' '}
          <span className="text-rose-100/70">{twist.description}</span>
        </div>
      )}

      <div className="border-b border-white/5 px-6 py-2">
        <CharmShelf />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-4">
        {Table ? <Table /> : <p className="text-white/50">No UI registered for {mod.id} yet.</p>}
      </div>
    </div>
  );
}
