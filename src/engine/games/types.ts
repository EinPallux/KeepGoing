/**
 * The shared contract every casino table implements. See PLAN.md section 10.2.
 * A GameModule is a pure function of (state, action, rng) -> (state, events);
 * React components render state and dispatch actions but never touch game math.
 *
 * Charm bonuses (payout %, refunds, streaks) are applied centrally after a
 * round resolves (see engine/charms) - games never see or apply them. The
 * only charm-driven inputs a game consumes are odds-shaping Modifiers below,
 * and even then the game has no idea a Charm produced them.
 */
import type { Rng } from '../rng';

/** Aggregate of active Charms for the current round. Neutral until a relevant Charm is owned. */
export interface Modifiers {
  /** Dice only: shifts the rolled number this many points in the player's favor. */
  diceOddsNudge: number;
  /** Mines only: the first tile revealed each round can never be a mine. */
  minesGuaranteedFirstSafe: boolean;
}

export const NEUTRAL_MODIFIERS: Modifiers = {
  diceOddsNudge: 0,
  minesGuaranteedFirstSafe: false,
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
