# KeepGoing 🎰

A single-player **gambling roguelite** web game — all fake money, zero stakes, maximum juice.

Beat escalating bankroll targets across 12 casino floors, pick your tables (Slots, Plinko, Crash, Mines, Blackjack and more), stack game-warping Charms, and manage a Corruption meter that makes the run more generous *and* more hostile the deeper you go.

**Status:** M1 vertical slice — 4 of 12 tables are playable (Dice, Mines, Hilo, Slots), with 10 Charms, a shop, and a first juice pass (animated bankroll counter, win/floor-clear confetti). The remaining 8 tables (Plinko, Crash, Chicken, Roulette, Blackjack, Keno, Tower, Wheel), House Floor twists, and the Corruption/event systems are still to come.

📋 **Read the full game design & execution plan: [PLAN.md](./PLAN.md)**

## At a glance

- 🃏 12 casino games as roguelike "encounters", boss floors every 3rd floor
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
