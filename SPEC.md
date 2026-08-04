# FATHOM — Game Specification (v1, week-one prototype)

This document is the single source of truth for the FATHOM prototype. All code
generated for this project must conform to it. When a decision is not covered
here, prefer the simplest implementation and leave a `// SPEC-GAP:` comment.

## 1. One-line pitch

An endless arcade descent: hop down platforms inside a vertical shaft, dive as
deep as you can before the spiked ceiling catches you. Depth is your score.

Genre reference: NS-Shaft (1996). This is a tribute to that loop, not a clone
of its content — FATHOM uses its own platform mechanisms and aesthetic.

## 2. Tech stack

- Three.js (latest stable) for all rendering.
- Vite as dev server and bundler, vanilla ES modules, no framework.
- Node.js LTS. No backend of our own — the only network calls are to the
  VIVERSE SDK.
- Target platforms: desktop web browsers, and mobile browsers in BOTH
  portrait and landscape. Orientation must never be locked.

## 3. Visual style: "3D rendered as 90s pixels"

- The 3D scene renders to a low-resolution offscreen render target, then is
  drawn to the full-size canvas with nearest-neighbor filtering (no smoothing).
  Internal resolution ~320px on the short axis; scale factor snapped to
  integers where possible to keep pixels crisp.
- Flat-shaded, low-poly geometry with a limited palette (deep blues/teals for
  the shaft, warm amber for the player and pickups, hot red for hazards).
  Palette lives in one `palette.js` module — nothing hardcodes colors.
- Lighting: one ambient + one directional light. No shadows in v1
  (performance on mobile matters more).
- The camera looks slightly downward into the shaft so depth reads visually.

## 4. Core loop and rules

- The player character auto-falls under gravity. The player only steers
  left/right; there is no jump button. Landing on a platform stops the fall
  until the player walks off an edge or the platform ends them.
- The camera scrolls downward continuously. Scroll speed starts slow and
  ramps with depth (tuning constants in one `tuning.js` file).
- A spiked ceiling occupies the top of the screen and moves with the camera.
- Death conditions (either one ends the run instantly):
  1. Touching the spiked ceiling.
  2. Falling below the bottom edge of the screen.
- Score = maximum depth reached, in meters (world units / constant). Shown
  live in a corner HUD with a chunky pixel font.

## 5. Platform mechanisms (exactly these three in v1)

1. **Stone** — plain solid platform. The baseline.
2. **Brittle ice** — cracks on landing, crumbles and falls away ~0.5s after
   the player touches it. One use.
3. **Geyser vent** — launches the player upward on contact. Risk/reward:
   useful for repositioning, dangerous because up = toward the spikes.

Platform generation:
- Procedural, random each run (no daily seed in v1).
- Platforms spawn below the visible area and are recycled above it
  (object pooling — do not allocate per platform).
- Spawn weights shift with depth: early runs are mostly Stone; ice and
  geysers become more common as depth increases. Weights and vertical gap
  ranges live in `tuning.js`.
- Generation must guarantee reachability: consecutive platforms are always
  within horizontal steering range given current fall speed.

## 6. Controls

Desktop:
- Left/Right arrows or A/D to steer. Escape pauses. That is the entire scheme.

Mobile (both orientations):
- Touch-and-hold on the left or right half of the screen to steer.
  No on-screen buttons in v1 — the half-screen zones are the buttons.
- Respect device safe areas for HUD placement.

## 7. Orientation and layout

- The shaft has a fixed logical width in world units. In portrait, the shaft
  fills the width of the screen. In landscape, the shaft stays centered at
  the same logical width and the extra horizontal space shows decorative
  shaft-wall geometry (non-interactive).
- Handle `resize` and orientation changes live without restarting the run.
- The render-target pixel scale recomputes on resize so pixels stay square.

## 8. Game flow / screens

1. **Title screen** — logo, "tap/press to dive", a "Connect VIVERSE" button,
   and a "Records" button (leaderboard view).
2. **Run** — gameplay with live depth HUD.
3. **Game over** — final depth, personal best (localStorage), "dive again",
   and, if a VIVERSE account is connected, a "Submit score" button plus the
   leaderboard.

## 9. VIVERSE integration

- Use the official skill catalog at
  https://github.com/viverseofficial/viverse-sdk-skills as the authoritative
  reference for ALL VIVERSE SDK work (auth, leaderboard, publishing).
  Follow its playbooks rather than inventing API usage.
- v1 scope:
  - **Auth**: optional login from the title screen. The game is fully
    playable without an account.
  - **Leaderboard**: one all-time global leaderboard (deepest dive).
    Score submission is only available when logged in. Viewing the
    leaderboard should work for everyone if the SDK allows read without
    auth; otherwise gate viewing behind login too and note it in the UI.
  - **Publishing**: the build output must be a static site compatible with
    VIVERSE World hosting; keep any required env vars in `.env.example`
    (pattern: `VITE_VIVERSE_*`), never committed with real values.
- All VIVERSE calls live in a single module `src/viverse/ViverseSession.js`
  with graceful degradation: when the SDK is unavailable (local dev), every
  method resolves to a clear "unavailable" state and the UI reflects it.
  No VIVERSE failure may ever break gameplay.

## 10. Project structure

```
fathom/
  index.html
  vite.config.js
  package.json
  .env.example
  SPEC.md              <- this file
  src/
    main.js            <- boot, game loop, screen/state machine
    palette.js         <- the entire color palette
    tuning.js          <- every gameplay tuning constant
    core/              <- input, camera, pixel renderer, audio stub
    world/             <- shaft, platform pool, platform types, spikes
    player/            <- player entity, movement, collision
    ui/                <- HUD, title, game over, leaderboard views
    viverse/ViverseSession.js
  public/              <- favicon, any static assets
```

Rules:
- All tuning constants in `tuning.js`; all colors in `palette.js`.
- No per-frame allocations in the game loop (pool platforms, reuse vectors).
- Collision is simple AABB in the shaft's 2D logical plane; the third
  dimension is visual only.

## 11. Juice (required, not optional)

Minimum feedback set for v1: screen shake on death, particle burst when ice
crumbles, a squash-and-stretch on landing, geyser puff particles, and a depth
milestone flash every 100m. Audio can be a stub interface in v1, but the call
sites must exist.

## 12. Explicitly OUT of scope for v1

- Daily seeds or daily leaderboards.
- Ghost replays of other players.
- VIVERSE avatar rendering in-game.
- HP/health systems, pickups, power-ups.
- More than the three platform types above.
- Any multiplayer.

Do not implement anything in this list even if it seems easy.
