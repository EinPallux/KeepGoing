/**
 * Thin Zustand wrapper around the pure engine (see src/engine). This is the
 * only place React ever touches RNG streams or GameModules directly; screens
 * just read state and call these actions.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStream, randomSeed } from '../engine/rng';
import {
  applyOutcome,
  cashOutFloor as engineCashOutFloor,
  canCashOutFloor as engineCanCashOutFloor,
  chooseTable,
  offerTables,
  startRun,
  type RunState,
} from '../engine/run';
import { ALL_TABLE_IDS, NEUTRAL_MODIFIERS, getGameModule, type ActionId } from '../engine/games';

interface CurrentRound {
  tableId: string;
  state: unknown;
  bet: number;
  /** Increments on every initRound/step call so each gets its own deterministic RNG draw. */
  stepIndex: number;
}

interface RunStore {
  run: RunState | null;
  currentRound: CurrentRound | null;
  bet: number;

  startNewRun: () => void;
  tableOffer: () => string[];
  pickTable: (tableId: string) => void;
  setBet: (bet: number) => void;
  startRound: () => void;
  submitAction: (actionId: ActionId) => void;
  cashOutFloor: () => void;
  canCashOutFloor: () => boolean;
  abandonRun: () => void;
}

const DEFAULT_BET = 10;

function roundSeedKey(run: RunState, stepIndex: number): string {
  const playIndex = run.playsTotal - run.playsLeft;
  return `round-floor-${run.floor}-play-${playIndex}-step-${stepIndex}`;
}

export const useRunStore = create<RunStore>()(
  persist(
    (set, get) => ({
      run: null,
      currentRound: null,
      bet: DEFAULT_BET,

      startNewRun: () => {
        set({ run: startRun(randomSeed()), currentRound: null, bet: DEFAULT_BET });
      },

      tableOffer: () => {
        const { run } = get();
        if (!run) return [];
        const rng = createStream(run.seed, `offer-floor-${run.floor}`);
        return offerTables(ALL_TABLE_IDS, rng);
      },

      pickTable: (tableId) => {
        const { run } = get();
        if (!run) return;
        set({ run: chooseTable(run, tableId), currentRound: null });
      },

      setBet: (bet) => set({ bet: Math.max(1, Math.floor(bet)) }),

      startRound: () => {
        const { run, bet } = get();
        if (!run || !run.activeTableId) return;
        const clampedBet = Math.max(1, Math.min(bet, run.bankroll));
        const module = getGameModule(run.activeTableId);
        const rng = createStream(run.seed, roundSeedKey(run, 0));
        const state = module.initRound(clampedBet, rng, NEUTRAL_MODIFIERS);
        set({ currentRound: { tableId: run.activeTableId, state, bet: clampedBet, stepIndex: 0 } });
      },

      submitAction: (actionId) => {
        const { run, currentRound } = get();
        if (!run || !currentRound) return;
        const module = getGameModule(currentRound.tableId);
        const nextStepIndex = currentRound.stepIndex + 1;
        const rng = createStream(run.seed, roundSeedKey(run, nextStepIndex));
        const { state, events } = module.step(currentRound.state, actionId, rng, NEUTRAL_MODIFIERS);
        const updatedRound: CurrentRound = { ...currentRound, state, stepIndex: nextStepIndex };

        if (!module.isResolved(state)) {
          set({ currentRound: updatedRound });
          return;
        }

        const outcome = events.find((e) => e.type === 'outcome');
        const nextRun = outcome ? applyOutcome(run, currentRound.bet, outcome.payoutMultiplier) : run;
        set({ run: nextRun, currentRound: updatedRound });
      },

      cashOutFloor: () => {
        const { run } = get();
        if (!run || !engineCanCashOutFloor(run)) return;
        set({ run: engineCashOutFloor(run), currentRound: null });
      },

      canCashOutFloor: () => {
        const { run } = get();
        return run ? engineCanCashOutFloor(run) : false;
      },

      abandonRun: () => set({ run: null, currentRound: null, bet: DEFAULT_BET }),
    }),
    {
      name: 'keepgoing-run',
      version: 1,
      partialize: (state) => ({ run: state.run, currentRound: state.currentRound, bet: state.bet }),
    },
  ),
);
