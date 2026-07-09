import { motion } from 'framer-motion';
import { useRunStore } from '../../store/runStore';
import { getCharmDef, MAX_CHARM_SLOTS } from '../../engine/charms';
import { CharmShelf } from '../components/CharmShelf';
import { ActionButton } from '../components/ActionButton';
import { playCoin, playSelect } from '../fx/sound';

interface ShopScreenProps {
  onContinue: () => void;
}

const RARITY_STYLE: Record<string, string> = {
  common: 'border-white/15 text-white/70',
  uncommon: 'border-emerald-400/40 text-emerald-300',
  rare: 'border-cyan-400/40 text-cyan-300',
  epic: 'border-violet-400/50 text-violet-300',
  legendary: 'border-amber-400/60 text-amber-300',
};

export function ShopScreen({ onContinue }: ShopScreenProps) {
  const run = useRunStore((s) => s.run);
  const shopOffer = useRunStore((s) => s.shopOffer);
  const shopPriceFor = useRunStore((s) => s.shopPriceFor);
  const rerollCost = useRunStore((s) => s.rerollCost);
  const buyCharm = useRunStore((s) => s.buyCharm);
  const rerollShop = useRunStore((s) => s.rerollShop);

  if (!run) return null;

  const offer = shopOffer();
  const full = run.charms.length >= MAX_CHARM_SLOTS;
  const cost = rerollCost();

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-6 py-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">✦ The Charm Shop ✦</p>
        <h2 className="mt-1 flex items-center justify-center gap-2 text-4xl font-black">
          <span className="kg-chip h-8 w-8 text-sm">$</span>
          <span className="kg-gold-text kg-tnum">{run.bankroll.toLocaleString()}</span>
        </h2>
      </motion.div>

      <CharmShelf />

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {offer.map((charmId, i) => {
          const def = getCharmDef(charmId);
          const price = shopPriceFor(charmId);
          const affordable = run.bankroll >= price && !full;
          const rarityCls = RARITY_STYLE[def.rarity] ?? RARITY_STYLE.common;
          return (
            <motion.div
              key={charmId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`kg-glass flex flex-col gap-2 rounded-2xl border p-5 ${rarityCls.split(' ')[0]}`}
            >
              <span className="text-lg font-black text-amber-300">✦ {def.label}</span>
              <span className={`text-xs font-bold uppercase tracking-widest ${rarityCls.split(' ')[1]}`}>
                {def.rarity}
              </span>
              <span className="text-sm text-white/60">{def.description}</span>
              <button
                type="button"
                onClick={() => {
                  buyCharm(charmId);
                  playCoin();
                }}
                disabled={!affordable}
                className="kg-btn kg-btn-primary mt-2 py-2 text-sm disabled:opacity-30"
              >
                Buy · {price} chips
              </button>
            </motion.div>
          );
        })}
        {offer.length === 0 && <p className="col-span-full text-center text-white/50">Sold out.</p>}
      </div>

      {full && <p className="text-sm text-rose-300">Charm slots full ({MAX_CHARM_SLOTS}/{MAX_CHARM_SLOTS}).</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            rerollShop();
            playSelect();
          }}
          disabled={run.bankroll < cost}
          className="kg-glass rounded-full px-6 py-2.5 text-white/80 transition hover:text-white disabled:opacity-30"
        >
          🔄 Reroll ({cost})
        </button>
        <ActionButton onClick={onContinue} sheen>
          Continue →
        </ActionButton>
      </div>
    </div>
  );
}
