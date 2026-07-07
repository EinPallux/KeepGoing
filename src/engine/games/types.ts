/**
 * The shared contract every casino table implements. See PLAN.md section 10.2.
 * A GameModule is a pure function of (state, action, rng) -> (state, events);
 * React components render state and dispatch actions but never touch game math.
 */
import type { Rng } from '../rng';

/** Aggregate of active Charms/Twists/Corruption for the current round. Neutral until M2/M3 build those systems. */
export interface Modifiers {
  /** Multiplicative bonus applied to all payouts. 1 = neutral. */
  payoutMultiplier: number;
}

export const NEUTRAL_MODIFIERS: Modifiers = { payoutMultiplier: 1 };

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

export interface GameModule<S> {
  id: string;
  label: string;
  description: string;
  initRound(bet: number, rng: Rng, mods: Modifiers): S;
  actions(state: S): ActionId[];
  step(state: S, action: ActionId, rng: Rng, mods: Modifiers): StepResult<S>;
  isResolved(state: S): boolean;
}
