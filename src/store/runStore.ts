/**
 * Thin Zustand wrapper around the pure engine (see src/engine). This is the
 * only place React ever touches RNG streams, GameModules, or the charm
 * resolver directly; screens just read state and call these actions.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStream, randomSeed } from '../engine/rng';
import { calcPlayoutDelta } from '../engine/economy';
import {
  applyOutcome,
  cashOutFloor as engineCashOutFloor,
  canCashOutFloor as engineCanCashOutFloor,
  chooseTable,
  offerTables,
  startRun,
  type RunState,
} from '../engine/run';
import { ALL_TABLE_IDS, getGameModule, type ActionId } from '../engine/games';
import {
  applyCharmsToOutcome,
  CHARM_DEFS,
  computeBonusPlays,
  computeModifiers,
  computeShopPriceMultiplier,
  getCharmDef,
  MAX_CHARM_SLOTS,
  minBetFraction,
} from '../engine/charms';

interface CurrentRound {
  tableId: string;
  state: unknown;
  bet: number;
  /** Increments on every initRound/step call so each gets its own deterministic RNG draw. */
  stepIndex: number;
  /** Charm-adjusted net chip change from this play once resolved; null until then. */
  resultDelta: number | null;
  /** Charm-adjusted payout multiplier once resolved; null until then. */
  finalPayoutMultiplier: number | null;
}

const SHOP_OFFER_SIZE = 3;
const SHOP_REROLL_BASE_COST = 10;

interface RunStore {
  run: RunState | null;
  currentRound: CurrentRound | null;
  bet: number;

  startNewRun: () => void;
  tableOffer: () => string[];
  pickTable: (tableId: string) => void;
  setBet: (bet: number) => void;
  minBet: () => number;
  startRound: (config?: unknown) => void;
  submitAction: (actionId: ActionId) => void;
  cashOutFloor: () => void;
  canCashOutFloor: () => boolean;

  shopOffer: () => string[];
  shopPriceFor: (charmId: string) => number;
  rerollCost: () => number;
  buyCharm: (charmId: string) => void;
  rerollShop: () => void;

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
        const bonusPlays = computeBonusPlays(run.charms);
        set({ run: chooseTable(run, tableId, bonusPlays), currentRound: null });
      },

      setBet: (bet) => set({ bet: Math.max(1, Math.floor(bet)) }),

      minBet: () => {
        const { run } = get();
        if (!run) return 1;
        return Math.max(1, Math.ceil(run.bankroll * minBetFraction(run.charms)));
      },

      startRound: (config) => {
        const { run, bet } = get();
        if (!run || !run.activeTableId) return;
        const module = getGameModule(run.activeTableId);
        const minBet = Math.max(1, Math.ceil(run.bankroll * minBetFraction(run.charms)));
        const clampedBet = Math.max(minBet, Math.min(bet, run.bankroll));
        const mods = computeModifiers(run.charms);
        const rng = createStream(run.seed, roundSeedKey(run, 0));
        const state = module.initRound(clampedBet, config ?? module.defaultConfig, rng, mods);
        set({
          currentRound: {
            tableId: run.activeTableId,
            state,
            bet: clampedBet,
            stepIndex: 0,
            resultDelta: null,
            finalPayoutMultiplier: null,
          },
        });
      },

      submitAction: (actionId) => {
        const { run, currentRound } = get();
        if (!run || !currentRound) return;
        const module = getGameModule(currentRound.tableId);
        const nextStepIndex = currentRound.stepIndex + 1;
        const rng = createStream(run.seed, roundSeedKey(run, nextStepIndex));
        const mods = computeModifiers(run.charms);
        const { state, events } = module.step(currentRound.state, actionId, rng, mods);
        const updatedRound: CurrentRound = { ...currentRound, state, stepIndex: nextStepIndex };

        if (!module.isResolved(state)) {
          set({ currentRound: updatedRound });
          return;
        }

        const outcome = events.find((e) => e.type === 'outcome');
        if (!outcome) {
          set({ currentRound: updatedRound });
          return;
        }

        const charmResult = applyCharmsToOutcome(run, outcome.payoutMultiplier);
        const runWithCharmBookkeeping: RunState = {
          ...run,
          winCount: charmResult.winCount,
          currentStreak: charmResult.currentStreak,
          floorFlags: charmResult.floorFlags,
        };
        const nextRun = applyOutcome(runWithCharmBookkeeping, currentRound.bet, charmResult.payoutMultiplier);
        const resultDelta = calcPlayoutDelta(currentRound.bet, charmResult.payoutMultiplier);
        set({
          run: nextRun,
          currentRound: { ...updatedRound, resultDelta, finalPayoutMultiplier: charmResult.payoutMultiplier },
        });
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

      shopOffer: () => {
        const { run } = get();
        if (!run) return [];
        const owned = new Set(run.charms);
        const available = CHARM_DEFS.filter((c) => !owned.has(c.id));
        if (available.length === 0) return [];
        const rng = createStream(run.seed, `shop-floor-${run.floor}-reroll-${run.shopRerolls}`);
        return rng
          .shuffle(available)
          .slice(0, Math.min(SHOP_OFFER_SIZE, available.length))
          .map((c) => c.id);
      },

      shopPriceFor: (charmId) => {
        const { run } = get();
        if (!run) return 0;
        const base = getCharmDef(charmId).price;
        const floorScale = 1 + (run.floor - 1) * 0.05;
        const discount = computeShopPriceMultiplier(run.charms);
        return Math.round(base * floorScale * discount);
      },

      rerollCost: () => {
        const { run } = get();
        return run ? SHOP_REROLL_BASE_COST * (run.shopRerolls + 1) : 0;
      },

      buyCharm: (charmId) => {
        const { run } = get();
        if (!run) return;
        if (run.charms.length >= MAX_CHARM_SLOTS || run.charms.includes(charmId)) return;
        const price = get().shopPriceFor(charmId);
        if (run.bankroll < price) return;
        set({ run: { ...run, bankroll: run.bankroll - price, charms: [...run.charms, charmId] } });
      },

      rerollShop: () => {
        const { run } = get();
        if (!run) return;
        const cost = get().rerollCost();
        if (run.bankroll < cost) return;
        set({ run: { ...run, bankroll: run.bankroll - cost, shopRerolls: run.shopRerolls + 1 } });
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
