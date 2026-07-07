# KeepGoing — Game Design & Execution Plan

> A single-player **gambling roguelite** for the web. All fake money. Beat escalating bankroll targets across a run of casino floors, collect game-warping Charms, flirt with Corruption, and see how deep you can go before The House takes everything.
>
> **One sentence pitch:** *Balatro's run structure meets a full fake-money casino.*

---

## 1. Design Pillars

1. **Every bet is a decision, not a lever pull.** The roguelite layer (targets, limited plays, Charms, Corruption) makes each wager tactical.
2. **Juice over complexity.** Few systems, each dripping with animation, sound, and feedback. If a feature doesn't make the player grin, cut it.
3. **No real money, ever.** No purchases, no ads, no wallet. Chips are toy currency; losing is part of the comedy.
4. **Runs are short and moreish.** A full run: 20–35 minutes. Losing always teaches something and unlocks something.
5. **Simple to build.** Static SPA, no backend, no accounts. Everything runs in the browser and deploys to Vercel with zero config.

---

## 2. Core Loop (the Roguelike Skeleton)

```
START RUN (100 Chips)
   │
   ▼
┌─ FLOOR ──────────────────────────────────────────────┐
│ Pick 1 of 3 offered Tables (casino games)            │
│ You get a limited number of PLAYS (bets) this floor  │
│ Reach the floor's TARGET bankroll before plays end   │
└──────────────┬───────────────────────────────────────┘
               │ target hit
               ▼
        REWARD + INTEREST
               │
               ▼
     SHOP  or  RANDOM EVENT  (alternating / weighted)
               │
               ▼
     NEXT FLOOR (higher target, every 3rd = HOUSE FLOOR)
               │
   ... Floor 12 = THE HOUSE (final boss table) ...
               │
               ▼
   WIN → Endless Mode option    LOSE (bust / out of plays) → Run Summary
               │
               ▼
   META: earn Shards → unlock new Charms, Tables, Decks
```

### 2.1 Floors & Targets

- A run = **12 floors** (4 "acts" of 3). Every 3rd floor is a **House Floor** (boss): one game with a nasty twist modifier.
- Each floor: choose **1 of 3 offered tables**. Which games appear is seeded per run (guarantees variety; House Floors pick from your unlocked pool).
- **Plays budget:** you get **8 plays** per floor (modifiable by Charms). One play = one bet resolution (one slot spin, one blackjack hand, one mines cashout-or-bust, etc.).
- **Target:** you must end the floor at/above the target bankroll. Starting numbers (tune in playtest):

| Floor | 1 | 2 | 3 (House) | 4 | 5 | 6 (House) | 7 | 8 | 9 (House) | 10 | 11 | 12 (The House) |
|-------|---|---|---|---|---|---|---|---|---|----|----|----|
| Target | 150 | 250 | 400 | 600 | 900 | 1,400 | 2,000 | 3,000 | 4,500 | 6,500 | 9,500 | 14,000 |

- **Failing:** if plays run out below target, or bankroll hits 0 → run over.
- **Skipping:** once per act you may **skip a floor** for a small consolation prize (a Tag-style bonus: free Charm, +2 plays next floor, etc.). Risk/reward: no chip growth that floor, but the target still rises.

### 2.2 Economy

- **Chips** — run currency. Start with 100. Bet them, win them, spend them in the shop.
- **Interest** — after each cleared floor: **+1 Chip per 25 held, capped at +20**. Creates the classic "bet big vs. bank it" tension.
- **Unused plays** — each unspent play converts to +10 Chips at floor end (rewards efficient clears).
- **Shards** — meta currency, earned at run end (win or lose) based on floors cleared, corruption carried, and style bonuses. Spent between runs on permanent unlocks. Never spendable inside a run.

---

## 3. The Twelve Tables (Casino Games)

Each game is deliberately **rules-light** — the depth comes from Charms and modifiers hooking into them. All games share one interface (see §10) and one bet slider.

| # | Game | One-liner spec | Skill/agency | Roguelite hook examples |
|---|------|----------------|--------------|--------------------------|
| 1 | **Slots** | 3×3 grid, 5 paylines, ~8 symbols. Payout table visible. | None (pure juice) | Charms add wild symbols, re-spins, symbol upgrades |
| 2 | **Plinko** | Ball drops through 12 rows of pegs into multiplier buckets (0.2×–26×). Risk presets: Low/Med/High. | Low | Charms add extra balls, magnet pegs, golden buckets |
| 3 | **Crash** | Multiplier climbs from 1.00×; cash out before it busts. Bust point sampled from house curve. | High (timing/nerve) | Charms give auto-cashout insurance, "second chance" rockets |
| 4 | **Chicken** | Cross N lanes of traffic; each lane raises multiplier, each has a hit chance. Cash out anytime. | High (push your luck) | Charms reveal one safe lane, revive once per floor |
| 5 | **Dice** | Slider: roll under/over X out of 100. Payout scales with improbability. | Medium (odds choice) | Charms nudge rolls ±3, reroll once, mirror wins |
| 6 | **Roulette** | European wheel (single zero). Bets: red/black, odd/even, dozens, straight. | Low | Charms remove the zero, double a dozen, "echo" last win |
| 7 | **Blackjack** | Single deck, dealer stands 17, blackjack pays 3:2. Hit/stand/double (no split in v1). | High | Charms peek dealer hole card, 5-card-charlie wins, push→win |
| 8 | **Keno** | Pick 5 of 40 numbers, 10 drawn. Paytable by hits. | Low | Charms add hot numbers, +1 pick, redraw misses |
| 9 | **Hilo** | Guess next card higher/lower; chain multiplier; cash out anytime. | High (push your luck) | Charms show card suit, skip one card, tie = win |
| 10 | **Mines** | 5×5 grid, N mines (choose 3/5/10). Reveal gems, multiplier grows, cash out or boom. | High (push your luck) | Charms defuse first mine, reveal a safe tile, gem tiles ×2 |
| 11 | **Tower** | 8 rows, 3 doors each, 1 trap per row. Climb for growing multiplier, cash out anytime. | High (push your luck) | Charms add a 4th safe door, checkpoint at row 4 |
| 12 | **Wheel** | One spin, 24 segments (mix of 0×–10×). Risk presets change segment mix. | None (pure juice) | Charms remove 0× segments, respin once, sticky multiplier |

**Scope guard:** every game must be describable in one paragraph and playable with one bet slider + at most 3 buttons. No side bets, no paylines configuration, no split/insurance in Blackjack v1.

**House edge:** all games use honest, published math with a small house edge (~2–5%). The *player* overcomes the edge through Charms — that's the fantasy: you're the one rigging the casino.

### 3.1 House Floors (Bosses)

Every 3rd floor. One forced game + one **Twist** drawn from a per-game pool. Examples:

- **Slots:** "Rust" — lowest symbol pays 0.
- **Crash:** "Nervous Ticker" — the multiplier display hides after 2×.
- **Roulette:** "Double Zero" — an extra zero pocket appears.
- **Blackjack:** "House Rules" — dealer wins all pushes.
- **Mines:** "Shifting Ground" — one mine relocates after every 3rd reveal.
- **Floor 12 — THE HOUSE:** a gauntlet: clear a mini-target on 3 random tables back-to-back with a shared plays budget, all with Twists active. Beating it wins the run.

---

## 4. Charms, Consumables & Jinxes (the Upgrade System)

The Balatro-joker layer. All effects hook into a small set of engine events (§10.3), so adding a Charm never means touching game code.

### 4.1 Charms (passive relics, max 5 slots)

Rarities: **Common / Uncommon / Rare / Corrupted**. ~40 at launch. Examples:

| Charm | Rarity | Effect |
|-------|--------|--------|
| Lucky Cent | Common | +5% payout on all wins |
| Loaded Die | Common | Dice: rolls nudge 2 in your favor |
| Rabbit's Foot | Common | First loss each floor refunds half the bet |
| Magnet Peg | Uncommon | Plinko: balls drift one bucket toward center's best neighbor |
| Card Counter | Uncommon | Blackjack: see the deck's remaining high/low ratio |
| Insurance Scam | Uncommon | Crash: busting below 1.5× refunds the bet |
| Golden Goose | Rare | Every 5th win pays double |
| The Regular | Rare | +2 plays every floor |
| Velvet Rope | Rare | Shop prices −25%, one free reroll |
| Dead Man's Hand | Corrupted | All wins ×1.5, but +3 Corruption per floor |
| Cursed Chip | Corrupted | Losses build a pot; next win claims the pot ×2. +5 Corruption on pickup |
| House Key | Corrupted | Choose the House Floor's game, but its Twist is doubled |

### 4.2 Consumables (max 3 held, one use)

Bought in shops or dropped by events: **Mulligan** (undo last losing play), **Loupe** (reveal one hidden info: dealer card / next Hilo card / one mine), **Adrenaline** (+3 plays this floor), **Bribe** (reroll the floor's table offer), **Exorcism** (−15 Corruption).

### 4.3 Jinxes (negative items)

Forced on you by events/Corruption; occupy a Charm slot until cleansed (shop service or event). Examples: **Sticky Fingers** (interest halved), **Tilted** (can't bet less than 10% of bankroll), **Static** (UI visually glitches — cosmetic only, but disorienting on purpose).

### 4.4 Shop (between floors)

- Stock: **3 Charms, 2 Consumables, 1 Service** (cleanse Jinx / remove Charm / +1 Charm slot, expensive).
- Reroll stock for escalating Chip cost. Prices scale with floor. Shop is skippable (banking chips for interest is a valid strategy).

---

## 5. Corruption System

A run-long meter, **0–100**. The devil's bargain dial: the game gets more generous *and* more hostile as it fills.

- **Gain:** Corrupted Charms, certain event choices, playing the optional **Corrupted Table** variant (any floor: takes the offered game and gives it +50% payouts + a random Twist + 5 Corruption).
- **Lose:** rare — Exorcism consumable, a few event choices, cleansing service.

| Threshold | The Good | The Bad |
|-----------|----------|---------|
| 25 — *Marked* | Corrupted Charms start appearing in shops | UI develops glitch flickers; 1 Jinx offered per act |
| 50 — *Haunted* | All payouts +10% | Every floor, one random play is "possessed" (house edge doubled, marked visibly) |
| 75 — *Consumed* | Shop has a 4th, always-Corrupted slot; payouts +20% | Targets +15%; occasional screen-wide static events |
| 100 — *Collapse* | — | Immediate event: **The Audit** — survive one brutal forced table or lose half your bankroll. Meter resets to 60 after |

- **Style payoff:** Shards earned at run end scale with peak Corruption — high-corruption wins are the flex.
- **Visual language:** corruption literally infects the UI — palette shifts toward sickly green/magenta, chromatic aberration, symbols occasionally "melt". All cosmetic layers driven by one `corruption` value (cheap to implement, huge atmosphere).

---

## 6. Random Events

Between floors (weighted vs. shops, ~1 event per act guaranteed). Simple choice cards, 2–3 options each, ~20 at launch. Flavor: seedy casino noir with a wink. Examples:

- **The Janitor** — "Found a chip under the Plinko machine." *(+30 Chips)* or *(He keeps it; +1 free Consumable)*
- **Loan Shark** — Take 200 Chips now; owe 300 by end of next act or gain a Jinx.
- **High Roller's Ghost** — Bet 25% of your bankroll on a coin flip at 2.2× (positive EV, scary variance).
- **The Chapel** — Pray: −10 Corruption *or* sacrifice a Charm for a Rare Charm.
- **Rigged Vending Machine** — Free random Consumable, +3 Corruption.
- **Pit Boss Inspection** — Own 3+ Corrupted Charms? Lose one *or* take 15 Corruption and keep them all.

Events are pure data (JSON): condition → options → effects. Trivial to add more.

---

## 7. Meta Progression (between runs)

Kept deliberately thin — the run is the game.

- **Shards** buy permanent unlocks from **The Vault**:
  - New Charms/Consumables/Events added to the pool (start pool: ~60%, unlock the rest).
  - Tables: start with 6 games unlocked (Slots, Dice, Mines, Hilo, Plinko, Roulette); unlock the other 6.
  - **Decks** (starting loadouts, Balatro-style): *Standard* / *Gambler* (start 150 Chips, targets +10%) / *Cursed* (start with a Corrupted Charm and 15 Corruption) / *Minimalist* (3 Charm slots, +25% payouts).
- **Stats & Codex:** lifetime stats, discovered Charms/Events, best runs.
- **Daily Run:** everyone gets the same seed (pure client-side, seeded RNG — no server needed). Local best tracked; share result as a copyable emoji/text block (Wordle-style).

---

## 8. UI / Art Direction

**Vibe:** *neon-noir arcade casino* — dark felt-green/near-black backgrounds, hot pink + gold + electric cyan accents, chunky rounded UI, everything glows. Playful, not sleazy. Think Balatro's tactility × NEON WHITE's speed × a cartoon Vegas.

- **Typography:** one loud display font for numbers/headers (e.g., "Bungee" or "Lilita One"), one clean UI font (e.g., "Inter"). Numbers are the heroes — bankroll counter is huge, always visible, and *rolls* like an odometer.
- **The Big Counter:** the single most important widget. Wins: count-up ticker, gold burst particles, elastic scale-punch, rising pitch SFX. Losses: chips visually crumble/fly away, brief desaturation. Near-target: counter pulses.
- **Juice checklist (every game must ship with):** screen shake on big wins (subtle, toggleable), particle bursts, squash-and-stretch on buttons, anticipation beats (dice hang in the air, last reel lands late, Crash rocket trembles), slow-mo on multiplier milestones, confetti on floor clear.
- **Win tiers:** normal / **BIG WIN** (≥5× bet) / **JACKPOT** (≥20× bet) — escalating full-screen celebrations.
- **Layout:** single-screen game view. Top bar: bankroll, target progress bar, plays left, corruption meter. Left rail: Charm shelf (hover = tooltip; Charms *wiggle* when they trigger, with a floating "+X" toast — players must always see WHY they won extra). Center: the table. Bottom: bet slider + action buttons.
- **Corruption skinning:** one global shader-ish CSS layer (hue-rotate, glitch clip-paths, scanlines) whose intensity = corruption/100.
- **Sound:** Howler.js. One music loop per act (intensity rises), thick SFX library (chip clacks, card snaps, reel thunks, crowd gasps). Mute/volume in settings, persisted.
- **Accessibility:** reduced-motion mode (kills shake/particles, keeps state changes readable), colorblind-safe win/loss cues (icons + color), everything keyboard-playable.

---

## 9. Tech Stack

Chosen for "simple, static, Vercel-native":

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Vite + React 18 + TypeScript** | SPA, no SSR needed, instant Vercel deploy |
| State | **Zustand** (+ `persist` middleware) | Tiny, no boilerplate, easy save/load |
| Styling | **Tailwind CSS** | Fast iteration on flashy UI |
| Animation | **Framer Motion** | Springs, layout animation, gesture feel |
| Physics | **matter-js** — *Plinko only* | Only game that needs physics |
| Canvas | Plain `<canvas>` for Plinko & Crash curve; DOM/SVG for everything else | Keep it simple |
| Particles/FX | **canvas-confetti** + a tiny in-house particle helper | No heavy engine |
| Sound | **Howler.js** | Sprite sheets, reliable mobile audio |
| RNG | **mulberry32** seeded PRNG (in-house, 10 lines) | Deterministic runs, daily seeds, replayable bugs |
| Saves | `localStorage`, versioned JSON with migration fn | No backend |
| Testing | **Vitest** for engine/math; Playwright smoke test | Game math must be provably correct |
| Deploy | **Vercel** static build (`vite build` → `dist/`) | Zero config, no serverless functions needed |

**Explicitly not used:** no backend, no database, no auth, no PixiJS/Phaser (overkill), no Redux, no CSS-in-JS.

---

## 10. Architecture

### 10.1 Separation of concerns

```
src/
├── engine/               # Pure TypeScript. Zero React imports. 100% unit-testable.
│   ├── rng.ts            # Seeded PRNG + stream splitting (one stream per system)
│   ├── run.ts            # Run state machine: floors, targets, plays, win/lose
│   ├── economy.ts        # Bets, payouts, interest, shard calc
│   ├── events/           # Event bus + hook types (see 10.3)
│   ├── charms/           # Charm defs (data) + effect resolvers
│   ├── corruption.ts
│   └── games/            # One module per table, all implementing GameModule
│       ├── types.ts      # GameModule interface
│       ├── dice.ts, slots.ts, mines.ts, ... (12 files)
├── store/                # Zustand stores wrapping the engine (runStore, metaStore, settingsStore)
├── ui/
│   ├── screens/          # Menu, RunMap, GameTable, Shop, Event, Summary, Vault
│   ├── tables/           # One React component per game (rendering ONLY)
│   ├── components/       # BigCounter, CharmShelf, BetSlider, CorruptionLayer, WinCelebration
│   └── fx/               # particles, shake, confetti wrappers
├── data/                 # charms.json, events.json, twists.json, decks.json, paytables/
└── audio/, assets/
```

### 10.2 GameModule interface (the key abstraction)

Every table is a pure function of `(state, action, rng)` → `(state, effects)`. React components render state and dispatch actions; they contain **no game math**.

```ts
interface GameModule<S> {
  id: TableId;
  initRound(bet: number, rng: Rng, mods: Modifiers): S;
  actions(state: S): ActionId[];                  // e.g. ['hit','stand'] / ['cashout','reveal:12']
  step(state: S, action: ActionId, rng: Rng, mods: Modifiers): { state: S; events: GameEvent[] };
  // Resolved rounds emit a single Outcome event: { payoutMultiplier, meta }
}
```

`Modifiers` is the computed aggregate of active Charms/Twists/Corruption for this round (payout multiplier, odds nudges, extra reveals, etc.) — games consume modifiers; they never know which Charm produced them.

### 10.3 Effect hooks (how Charms plug in)

Small fixed set of hooks; every Charm/Jinx/Twist is data + a resolver keyed to hooks:

`onRoundStart · onOutcome (win/loss) · onCashoutDecision · modifyOdds · modifyPayout · onFloorStart · onFloorEnd · onShopEnter · onCorruptionChange`

Adding content = adding a JSON entry + (at most) a 5-line resolver. This is the moat against complexity creep.

### 10.4 Fairness & determinism

- One seeded master RNG per run, split into named streams (`games`, `shop`, `events`) so shop rerolls never change game outcomes.
- Every round's seed is logged in run history → any result is reproducible (debugging + "provably fake-fair" flavor page).
- All paytables/odds live in `data/paytables/` with unit tests asserting expected RTP (return-to-player) within tolerance via Monte Carlo (100k simulated rounds in Vitest).

### 10.5 Save format

```ts
{ version: 1,
  meta: { shards, unlocks[], stats, codex[], settings },
  activeRun?: { seed, floor, bankroll, playsLeft, charms[], consumables[], jinxes[], corruption, history[] } }
```
Saved to `localStorage` on every state change (Zustand persist). Mid-run refresh resumes exactly. `version` gate + migration function from day one.

---

## 11. Screens Inventory

1. **Title/Menu** — Play, Daily Run, The Vault, Codex, Settings. Animated logo, ambient casino loop.
2. **Deck Select** — choose starting Deck, see run modifiers.
3. **Run Map / Floor Select** — the 3 offered tables as flip-cards, target & plays shown, skip button.
4. **Game Table** — the main screen (per-game component inside the shared frame from §8).
5. **Floor Clear** — interest breakdown, unused-play bonus, confetti.
6. **Shop** — shelf of cards, reroll, services.
7. **Event** — full-screen choice card.
8. **Run Summary** — win/lose, floor reached, peak corruption, shard payout, best moments ("Biggest win: 43× on Mines"), share block.
9. **The Vault** — spend Shards on unlocks.
10. **Codex & Stats**, **Settings** (audio, reduced motion, colorblind, wipe save).

---

## 12. Build Roadmap

Ship in vertical slices — every milestone is a playable game.

### M0 — Skeleton (foundation)
Vite/React/TS/Tailwind/Zustand scaffold · seeded RNG · run state machine (floors/targets/plays/interest) · save/load · placeholder UI for menu → floor → summary. **Exit test: a full run is playable with a "coin flip" placeholder table.**

### M1 — First Fun (vertical slice)
4 tables: **Dice, Mines, Hilo, Slots** (cheapest + best push-your-luck spread) · bet slider, Big Counter with full juice · 10 Charms + shop · floor clear/lose flow · win celebrations. **Exit test: strangers play 3+ runs voluntarily.**

### M2 — Full Casino
Remaining 8 tables (Plinko last — physics) · House Floors + 8 Twists · consumables & jinxes · 25 Charms total.

### M3 — The Soul
Corruption system + visual infection layer · 20 events · Floor 12 finale gauntlet · sound pass (music + SFX) · 40 Charms.

### M4 — Meta & Polish
Vault/unlocks, Decks, Daily Run, Codex · Run Summary share block · accessibility pass · balance pass (Monte Carlo tuning of targets vs. RTP) · perf pass (60fps on mid phones) · Vercel deploy, custom domain, OG images.

*(No time estimates baked in — milestones are scope gates, not dates.)*

---

## 13. Balance Starting Points (tune in M4)

- Base RTP per game ≈ 95–98% → without Charms, a run is *just barely* losable-by-default; Charms push effective RTP well above 100%, which is the power fantasy.
- Target curve (§2.1) assumes the player roughly needs to ~1.5× their bankroll per floor with 8 plays → average required edge per play is modest; risk appetite (bet sizing) is the real skill.
- Interest cap (+20) keeps "turtle strategy" viable but not dominant.
- Corrupted Charms should be strictly stronger in raw EV — the meter is the cost.
- Monte Carlo harness (Vitest) simulates 10k runs with simple bot policies (flat-bet, kelly-ish, all-in) to sanity-check the curve before human tuning.

---

## 14. Scope Guards (what we are NOT building)

- ❌ Multiplayer, leaderboards with servers, accounts, cloud saves
- ❌ Real money, purchases, ads, or anything resembling them
- ❌ Blackjack splits/insurance, roulette call bets, multi-hand anything (v1)
- ❌ 3D, WebGL engines, custom shaders (CSS filters fake it fine)
- ❌ Mobile app wrappers — responsive web only
- ❌ Localization (English v1; string table from day one so it's possible later)

---

## 15. Open Questions (decide during M1 playtest)

1. Plays budget: flat 8/floor vs. scaling down on later floors for tension?
2. Should push-your-luck games (Mines/Tower/Hilo/Crash/Chicken) count a full round as one play, or each reveal? *(Plan: full round = 1 play.)*
3. Endless mode at launch or post-launch?
4. Does the Loan Shark event need a hard cap to avoid degenerate strategies?
