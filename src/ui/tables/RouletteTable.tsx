import { useState } from 'react';
import { useRunStore } from '../../store/runStore';
import type { RouletteBetType, RouletteColor, RouletteParity, RouletteState } from '../../engine/games/roulette';
import { numberColor } from '../../engine/games/roulette';
import { BetSlider } from '../components/BetSlider';
import { PlayResultBanner } from '../components/PlayResultBanner';

const BET_TYPES: { id: RouletteBetType; label: string }[] = [
  { id: 'color', label: 'Red/Black' },
  { id: 'parity', label: 'Odd/Even' },
  { id: 'dozen', label: 'Dozen' },
  { id: 'straight', label: 'Straight Up' },
];

export function RouletteTable() {
  const run = useRunStore((s) => s.run);
  const bet = useRunStore((s) => s.bet);
  const currentRound = useRunStore((s) => s.currentRound);
  const setBet = useRunStore((s) => s.setBet);
  const startRound = useRunStore((s) => s.startRound);
  const submitAction = useRunStore((s) => s.submitAction);

  const [betType, setBetType] = useState<RouletteBetType>('color');
  const [color, setColor] = useState<RouletteColor>('red');
  const [parity, setParity] = useState<RouletteParity>('odd');
  const [dozen, setDozen] = useState<1 | 2 | 3>(1);
  const [straightNumber, setStraightNumber] = useState(17);

  if (!run) return null;

  const state = currentRound?.state as RouletteState | undefined;
  const resolved = state?.resolved ?? false;

  if (!currentRound || !state || resolved) {
    const value = betType === 'color' ? color : betType === 'parity' ? parity : betType === 'dozen' ? dozen : straightNumber;

    return (
      <div className="flex flex-col items-center gap-6">
        {resolved && state && currentRound && currentRound.resultDelta !== null && (
          <PlayResultBanner
            key={currentRound.stepIndex}
            delta={currentRound.resultDelta}
            payoutMultiplier={currentRound.finalPayoutMultiplier ?? 0}
          />
        )}
        {resolved && state && (
          <p className="text-sm text-white/60">
            Landed on <span className="font-mono text-amber-300">{state.result}</span> (
            {numberColor(state.result!)})
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {BET_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setBetType(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                betType === t.id ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {betType === 'color' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setColor('red')}
              className={`rounded-full px-5 py-2 font-bold ${color === 'red' ? 'bg-rose-500 text-black' : 'bg-white/10 text-white/70'}`}
            >
              Red
            </button>
            <button
              type="button"
              onClick={() => setColor('black')}
              className={`rounded-full px-5 py-2 font-bold ${color === 'black' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}
            >
              Black
            </button>
          </div>
        )}
        {betType === 'parity' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setParity('odd')}
              className={`rounded-full px-5 py-2 font-bold ${parity === 'odd' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70'}`}
            >
              Odd
            </button>
            <button
              type="button"
              onClick={() => setParity('even')}
              className={`rounded-full px-5 py-2 font-bold ${parity === 'even' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70'}`}
            >
              Even
            </button>
          </div>
        )}
        {betType === 'dozen' && (
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDozen(d)}
                className={`rounded-full px-5 py-2 font-bold ${dozen === d ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70'}`}
              >
                {d === 1 ? '1-12' : d === 2 ? '13-24' : '25-36'}
              </button>
            ))}
          </div>
        )}
        {betType === 'straight' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStraightNumber((n) => Math.max(0, n - 1))}
              className="rounded-full bg-white/10 px-4 py-2 font-bold text-white/70 hover:bg-white/20"
            >
              -
            </button>
            <span className="w-12 text-center font-mono text-xl text-amber-300">{straightNumber}</span>
            <button
              type="button"
              onClick={() => setStraightNumber((n) => Math.min(36, n + 1))}
              className="rounded-full bg-white/10 px-4 py-2 font-bold text-white/70 hover:bg-white/20"
            >
              +
            </button>
          </div>
        )}

        <BetSlider bet={bet} max={run.bankroll} onChange={setBet} />
        <button
          type="button"
          onClick={() => startRound({ betType, value })}
          disabled={run.bankroll <= 0}
          className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 font-bold text-black shadow-lg shadow-pink-500/30 transition hover:scale-105 disabled:opacity-40"
        >
          {resolved ? 'Next Play' : 'Place Bet'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-white/70">{currentRound.bet} chips on the line.</p>
      <button
        type="button"
        onClick={() => submitAction('spin')}
        className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-10 py-4 font-bold text-black transition hover:scale-105"
      >
        Spin
      </button>
    </div>
  );
}
