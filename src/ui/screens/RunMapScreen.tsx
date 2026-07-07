import { computeBonusPlays } from '../../engine/charms';
import { getGameModule } from '../../engine/games';
import { floorTarget, isHouseFloor, PLAYS_PER_FLOOR } from '../../engine/run';
import { useRunStore } from '../../store/runStore';
import { CharmShelf } from '../components/CharmShelf';

export function RunMapScreen() {
  const run = useRunStore((s) => s.run);
  const tableOffer = useRunStore((s) => s.tableOffer);
  const activeTwist = useRunStore((s) => s.activeTwist);
  const pickTable = useRunStore((s) => s.pickTable);

  if (!run) return null;

  const target = floorTarget(run.floor);
  const houseFloor = isHouseFloor(run.floor);
  const offer = tableOffer();
  const twist = activeTwist();
  const playsAvailable = PLAYS_PER_FLOOR + computeBonusPlays(run.charms);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-white/50">
          Floor {run.floor} / 12 {houseFloor && <span className="text-rose-400">&middot; House Floor</span>}
        </p>
        <h2 className="mt-1 text-3xl font-bold">
          Reach <span className="text-amber-300">{target}</span> chips
        </h2>
        <p className="mt-1 text-white/60">
          Bankroll: {run.bankroll} &middot; {playsAvailable} plays available
        </p>
      </div>

      <CharmShelf />

      {houseFloor && twist ? (
        <button
          type="button"
          data-testid="table-offer-card"
          data-table-id={twist.gameId}
          onClick={() => pickTable(twist.gameId)}
          className="flex w-full max-w-md flex-col gap-2 rounded-xl border border-rose-400/40 bg-rose-950/30 p-6 text-left transition hover:scale-[1.02] hover:border-rose-300/60 hover:bg-rose-950/50"
        >
          <span className="text-lg font-bold text-amber-300">{getGameModule(twist.gameId).label}</span>
          <span className="text-sm text-white/60">{getGameModule(twist.gameId).description}</span>
          <div className="mt-2 rounded-lg bg-rose-500/15 px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wide text-rose-300">Twist: {twist.label}</span>
            <p className="text-sm text-rose-100/80">{twist.description}</p>
          </div>
        </button>
      ) : (
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {offer.map((tableId, i) => {
            const mod = getGameModule(tableId);
            return (
              <button
                key={`${tableId}-${i}`}
                type="button"
                data-testid="table-offer-card"
                data-table-id={tableId}
                onClick={() => pickTable(tableId)}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-5 text-left transition hover:scale-[1.02] hover:border-pink-400/50 hover:bg-white/10"
              >
                <span className="text-lg font-bold text-amber-300">{mod.label}</span>
                <span className="text-sm text-white/60">{mod.description}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
