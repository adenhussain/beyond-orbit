# BEYOND ORBIT

A 2D side-scrolling space exploration and spacecraft engineering game.
You control an astronaut: walk a surface base, collect supplies, build a
spacecraft from what you found, then walk around inside it during the flight
and respond to three emergencies. A Time Machine lets you return to any past
decision and explore an alternative timeline.

Educational game with simplified, consistent engineering rules. It is not a
flight-certified tool.

## Run it

```bash
npm install
npm run dev      # open http://localhost:5173
```

Other commands:

```bash
npm test         # engine tests: every decision path, determinism, Time Machine
npm run build    # type-check and build for production (output in dist/)
npm run preview  # serve the production build
```

## Controls

| Key | Action |
| --- | --- |
| A / D or ← / → | Move |
| Space, W or ↑ | Jump |
| Shift | Sprint |
| E | Interact (collect, refill oxygen, enter workshop, use console) |
| Esc | Pause |

## Game flow

1. **Main menu** — Start New Mission, Continue Mission (autosave), Settings, Credits.
2. **Mission selection and briefing** — Lunar South Pole or Mars Sample Collection.
3. **Exploration** (Phaser) — collect supplies, avoid geysers / dust devils and
   crevasses, refill suit oxygen at O2 stations, reach the workshop at the far end.
4. **Workshop** — install components in nine categories. Every part costs
   supplies you collected; the design must also fit budget, mass, power and fuel.
5. **Launch**, then the **spacecraft interior** (Phaser) — six rooms. When an
   emergency fires, the affected room goes to red alert and you must walk to
   its console and press E to decide.
6. **Time Machine** — at the Command Room console (or from the mission report).
7. **Mission report**, Failure Autopsy and Review Board.

## How the code is organised

```
src/
  game/            The Phaser game world
    bridge.ts        the one link between React and Phaser
    textures.ts      all artwork, drawn in code at start-up
    config/          Phaser game configuration
    entities/        Astronaut (movement, jumping, animation)
    maps/            level data: lunarMap, marsMap, spacecraftMap
    scenes/          BootScene, ExplorationScene, InteriorScene
  engine/          The simulation rules. Pure TypeScript, no React, no Phaser.
    resourceCalculator.ts  design totals, launch validation, supply check
    technicalDebt.ts       thermal / power / reliability / comm debt
    missionSimulator.ts    flight state, flying a segment, oxygen, life support
    challengeManager.ts    starting a challenge, advisories, locked options
    decisionProcessor.ts   conditions, effects, applying a decision
    timelineManager.ts     snapshots and branching (the Time Machine)
    outcomeEvaluator.ts    success / partial / failure
    failureAnalyzer.ts     Failure Autopsy from the simulation log
  data/            Missions, components, supplies, challenges, hazards (no logic)
  state/           One reducer holding all game state, plus autosave
  components/      React interface: HUD, inventory, workshop, dialogs, reports
  pages/           One file per screen
  services/        Sound effects and the optional AI advisor service
  types/           Shared TypeScript types
```

Three rules keep it maintainable:

- **Phaser draws the world, React draws the interface.** They only talk
  through `src/game/bridge.ts`: scenes read `bridge.state` and call
  `bridge.dispatch(...)`.
- **The engine decides, everything else displays.** Scenes and components
  never calculate outcomes; they dispatch an action and show the result.
- **The simulation is deterministic.** The same design and decisions always
  give the same outcome, so timelines can be compared fairly.

## How things connect

- Supplies collected on foot (`inventory`) are what the workshop spends.
  `materialsFor()` in `src/data/resources.ts` sets each part's cost.
- Repair kits are not used in construction. They come aboard and are spent on
  in-flight repairs or on servicing the oxygen scrubbers by hand.
- Weak design choices become technical debt, which triggers hazards during
  the flight (`src/data/events.ts`) and changes what challenge options do.
- Each challenge option sets flags that later challenges react to
  (`src/data/challenges.ts`). That is the Butterfly Effect.
- A snapshot of the whole spacecraft state is stored at every decision point.
  Rewinding copies it into a **new** timeline; older timelines are never changed.

## Changing things

- **Level layout:** edit `src/game/maps/lunarMap.ts` or `marsMap.ts`
  (platforms, gaps, items, hazards are plain data).
- **Artwork:** every sprite is drawn in `src/game/textures.ts`. To use real
  image files, load them in `BootScene` under the same texture keys.
- **New mission:** add it to `src/data/missions.ts`, add three challenges and
  its hazards, and add a level map.
- **Debugging:** in development the running game is available in the browser
  console as `__bo` (`__bo.game`, `__bo.bridge.state`).

## AI Mission Review Board (optional)

The Review Board works offline using built-in responses generated from the
engine's verified results. To use an AI service instead, run your own backend
(for example Python + FastAPI, keeping the API key on the server) and set
`VITE_AI_ADVISOR_URL` in a `.env.local` file. The game POSTs
`{ "facts": ... }` and expects
`{ "reviews": [{ "id", "headline", "comments": [] }] }`. The engine's outcome
is sent as a fact; the AI only words the explanation. No backend is included
in this repository yet.
