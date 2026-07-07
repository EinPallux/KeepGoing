import { useRunStore } from '../../store/runStore';

export function MenuScreen() {
  const startNewRun = useRunStore((s) => s.startNewRun);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="bg-gradient-to-r from-amber-300 via-pink-400 to-violet-400 bg-clip-text text-6xl font-black text-transparent">
          KeepGoing
        </h1>
        <p className="mt-3 text-white/60">A fake-money gambling roguelite. Twelve floors. The House always waits.</p>
      </div>
      <button
        type="button"
        onClick={startNewRun}
        className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-10 py-4 text-lg font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105"
      >
        New Run
      </button>
    </div>
  );
}
