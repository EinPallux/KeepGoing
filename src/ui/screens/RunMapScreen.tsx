import { motion } from 'framer-motion';
import { computeBonusPlays } from '../../engine/charms';
import { getGameModule } from '../../engine/games';
import { floorTarget, isHouseFloor, PLAYS_PER_FLOOR } from '../../engine/run';
import { useRunStore } from '../../store/runStore';
import { CharmShelf } from '../components/CharmShelf';
import { playSelect } from '../fx/sound';

const TABLE_EMOJI: Record<string, string> = {
  dice: '🎲',
  mines: '💣',
  hilo: '🃏',
  slots: '🎰',
  roulette: '🔴',
  blackjack: '♠️',
  keno: '🔢',
  tower: '🗼',
  chicken: '🐔',
  wheel: '🎡',
  crash: '🚀',
  plinko: '🎯',
};

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
  const pick = (id: string) => {
    playSelect();
    pickTable(id);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">
          Floor {run.floor} / 12 {houseFloor && <span className="font-bold text-rose-400">· House Floor</span>}
        </p>
        <h2 className="mt-2 text-4xl font-black">
          Reach <span className="kg-gold-text">{target.toLocaleString()}</span> chips
        </h2>
        <p className="mt-2 text-white/60">
          Bankroll <span className="kg-tnum font-bold text-emerald-300">{run.bankroll.toLocaleString()}</span> ·{' '}
          {playsAvailable} plays available
        </p>
      </motion.div>

      <CharmShelf />

      {houseFloor && twist ? (
        <motion.button
          type="button"
          data-testid="table-offer-card"
          data-table-id={twist.gameId}
          onClick={() => pick(twist.gameId)}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="flex w-full max-w-md flex-col gap-2 rounded-2xl border border-rose-400/40 bg-gradient-to-b from-rose-950/50 to-rose-950/20 p-6 text-left shadow-[0_0_30px_rgba(255,92,122,0.2)]"
        >
          <span className="flex items-center gap-2 text-xl font-black text-amber-300">
            <span className="text-2xl">{TABLE_EMOJI[twist.gameId] ?? '🎲'}</span>
            {getGameModule(twist.gameId).label}
          </span>
          <span className="text-sm text-white/60">{getGameModule(twist.gameId).description}</span>
          <div className="mt-2 rounded-lg bg-rose-500/15 px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wide text-rose-300">⚠ Twist: {twist.label}</span>
            <p className="text-sm text-rose-100/80">{twist.description}</p>
          </div>
        </motion.button>
      ) : (
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {offer.map((tableId, i) => {
            const mod = getGameModule(tableId);
            return (
              <motion.button
                key={`${tableId}-${i}`}
                type="button"
                data-testid="table-offer-card"
                data-table-id={tableId}
                onClick={() => pick(tableId)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.04, y: -6 }}
                whileTap={{ scale: 0.97 }}
                className="kg-glass group flex flex-col gap-2 rounded-2xl p-5 text-left transition hover:border-pink-400/50 hover:shadow-[0_0_28px_rgba(255,77,157,0.28)]"
              >
                <span className="text-4xl transition group-hover:scale-110">{TABLE_EMOJI[tableId] ?? '🎲'}</span>
                <span className="text-lg font-black text-amber-300">{mod.label}</span>
                <span className="text-sm text-white/55">{mod.description}</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
