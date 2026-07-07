import { useRunStore } from '../../store/runStore';

export function SummaryScreen() {
  const run = useRunStore((s) => s.run);
  const startNewRun = useRunStore((s) => s.startNewRun);
  const abandonRun = useRunStore((s) => s.abandonRun);

  if (!run) return null;

  const won = run.status === 'won';
  const floorsCleared = run.history.filter((r) => r.cleared).length;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <p
        className={`text-4xl font-black ${won ? 'text-amber-300' : 'text-rose-400'}`}
      >
        {won ? 'You Beat The House' : 'Busted'}
      </p>
      <p className="text-white/70">
        Reached floor {run.floor} / 12 &middot; {floorsCleared} floors cleared &middot; final bankroll {run.bankroll} chips
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={startNewRun}
          className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105"
        >
          New Run
        </button>
        <button
          type="button"
          onClick={abandonRun}
          className="rounded-full border border-white/20 px-8 py-3 font-bold text-white/80 transition hover:bg-white/10"
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}
