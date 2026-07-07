/**
 * The shared contract every casino table implements. See PLAN.md section 10.2.
 * A GameModule is a pure function of (state, action, rng) -> (state, events);
 * React components render state and dispatch actions but never touch game math.
 *
 * Charm bonuses (payout %, refunds, streaks) are applied centrally after a
 * round resolves (see engine/charms) - games never see or apply them. The
 * only charm- or twist-driven inputs a game consumes are the odds-shaping
 * Modifiers below, and even then the game has no idea what produced them -
 * House Floor Twists (see engine/twists.ts) fold into this same object.
 */
import type { Rng } from '../rng';

/** Aggregate of active Charms/Twists for the current round. Neutral unless something's active. */
export interface Modifiers {
  /** Dice only: shifts the rolled number this many points in the player's favor. */
  diceOddsNudge: number;
  /** Mines only: the first tile revealed each round can never be a mine. */
  minesGuaranteedFirstSafe: boolean;
  /** Added to a game's base house edge. Consumed by Dice, Hilo, and Tower. */
  houseEdgeBonus: number;
  /** Mines only: added to the round's configured mine count. */
  minesExtraMines: number;
  /** Slots only: this symbol id always pays 0, even on a 3-of-a-kind line. */
  slotsVoidSymbolId: string | null;
  /** Roulette only: adds a second losing "00" pocket to the wheel. */
  rouletteDoubleZero: boolean;
  /** Blackjack only: the dealer wins pushes instead of returning the bet. */
  blackjackDealerWinsPush: boolean;
  /** Keno only: multiplies the paytable (1 = normal, 0.5 = halved). */
  kenoPayoutScale: number;
}

export const NEUTRAL_MODIFIERS: Modifiers = {
  diceOddsNudge: 0,
  minesGuaranteedFirstSafe: false,
  houseEdgeBonus: 0,
  minesExtraMines: 0,
  slotsVoidSymbolId: null,
  rouletteDoubleZero: false,
  blackjackDealerWinsPush: false,
  kenoPayoutScale: 1,
};

export type ActionId = string;

export interface OutcomeEvent {
  type: 'outcome';
  /** 0 = total loss, 1 = push, >1 = win. Multiplies the bet to produce the payout. */
  payoutMultiplier: number;
  meta?: Record<string, unknown>;
}

export type GameEvent = OutcomeEvent;

export interface StepResult<S> {
  state: S;
  events: GameEvent[];
}

export interface GameModule<S, C = unknown> {
  id: string;
  label: string;
  description: string;
  defaultConfig: C;
  initRound(bet: number, config: C, rng: Rng, mods: Modifiers): S;
  actions(state: S): ActionId[];
  step(state: S, action: ActionId, rng: Rng, mods: Modifiers): StepResult<S>;
  isResolved(state: S): boolean;
}
