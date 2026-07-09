# KeepGoing 🎰

A single-player **gambling roguelite** web game — all fake money, zero stakes, maximum juice.

Beat escalating bankroll targets across 12 casino floors, pick your tables (Slots, Plinko, Crash, Mines, Blackjack and more), stack game-warping Charms, and manage a Corruption meter that makes the run more generous *and* more hostile the deeper you go.

**Status:** M2 (games + twists) + **full "juice" overhaul** — **15 casino tables** are playable and each one *animates the play out* like a real gambling machine. Now including a real **5-reel × 3-row Slots** machine with 9 paylines, plus three brand-new games — **Coin Flip** (double-or-nothing streak), **Video Poker** (Jacks-or-Better hold & draw) and **Scratch Card** (match-3 reveal) — alongside Plinko, Crash, Chicken, Dice, Roulette, Blackjack, Keno, Hilo, Mines, Tower and Wheel. The animations: spinning reels, a Plinko ball bouncing down the pegs, a Crash rocket on an exponential curve, spinning roulette/prize wheels, a flipping 3D coin, dealing & flipping cards, mine/tower/scratch reveals with a live multiplier ladder, and more. Backed by a WebGL ambient background, a fully procedural Web Audio sound engine (no asset files), tiered win confetti + screen shake, and a "reveal" system that holds the bankroll until the animation lands so the outcome is never spoiled. Plus 10 Charms, a shop, and House Floor Twists (every 3rd floor forces a table with a nasty modifier). Still to come: consumables & jinxes, more Charms (25 total), the Corruption system, and random events.

📋 **Read the full game design & execution plan: [PLAN.md](./PLAN.md)**

## At a glance

- 🃏 15 casino games as roguelike "encounters", boss floors every 3rd floor
- ✨ Charms, consumables, jinxes, random events, corruption system
- 🚫 No real money, no purchases, no ads, no accounts — ever
- 🖥️ Single-player, static SPA (Vite + React + TS), deploys to Vercel with zero config

## Development

```bash
npm install
npm run dev       # local dev server
npm run test      # engine unit tests (Vitest)
npm run build     # typecheck + production build
```

The engine (`src/engine/`) is plain, framework-free TypeScript — RNG, the floor/run state machine, economy math, and the `GameModule` interface each of the 12 tables will implement. `src/store/runStore.ts` wraps it in a persisted Zustand store; `src/ui/` is React/Tailwind screens that read that store and never touch game math directly.
