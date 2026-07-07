import { useRunStore } from '../../store/runStore';
import { getCharmDef, MAX_CHARM_SLOTS } from '../../engine/charms';
import { CharmShelf } from '../components/CharmShelf';

interface ShopScreenProps {
  onContinue: () => void;
}

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
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-8">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-white/50">The Shop</p>
        <h2 className="mt-1 text-3xl font-bold text-amber-300">{run.bankroll} chips</h2>
      </div>

      <CharmShelf />

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {offer.map((charmId) => {
          const def = getCharmDef(charmId);
          const price = shopPriceFor(charmId);
          const affordable = run.bankroll >= price && !full;
          return (
            <div key={charmId} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-5">
              <span className="text-lg font-bold text-amber-300">{def.label}</span>
              <span className="text-xs uppercase tracking-wide text-white/40">{def.rarity}</span>
              <span className="text-sm text-white/60">{def.description}</span>
              <button
                type="button"
                onClick={() => buyCharm(charmId)}
                disabled={!affordable}
                className="mt-2 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 py-2 font-bold text-black transition hover:scale-105 disabled:opacity-30"
              >
                Buy - {price} chips
              </button>
            </div>
          );
        })}
        {offer.length === 0 && <p className="col-span-full text-center text-white/50">Sold out.</p>}
      </div>

      {full && <p className="text-sm text-rose-300">Charm slots full ({MAX_CHARM_SLOTS}/{MAX_CHARM_SLOTS}).</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={rerollShop}
          disabled={run.bankroll < cost}
          className="rounded-full border border-white/20 px-6 py-2 text-white/80 transition hover:bg-white/10 disabled:opacity-30"
        >
          Reroll ({cost} chips)
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
