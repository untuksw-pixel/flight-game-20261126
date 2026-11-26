[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=makefun)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/untuksw-pixel/flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=makefun)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/untuksw-pixel/flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=makefun)

# Kestrel Post — Island Mail Run

A complete 3D flight game that plays in a desktop browser from static
files. You are the pilot of the Kestrel, a small single-prop mail plane
working an island archipelago: a main island with a mountain, a village and
Kestrel Field's lit runway, and two smaller isles with strips of their own.

Three sorties, three different jobs:

- **First Post** — take off, thread six glowing harbour rings, land back home.
- **East Isle Drop** — follow the guide rings east, drop the mail parcel by
  parachute into the yellow circle, and land on the East Isle Strip.
- **Storm Mail** — a strong gusting crosswind and 70% fuel: thread the pass
  rings and put down on the North Isle Strip.

The flying is honest about the things that make flying interesting. The
wing stalls if you get slow and greedy; a banked turn needs speed to hold;
climbing is paid for out of airspeed; fuel burns with throttle, and an
empty tank means a gliding plane. Landings are judged the way they feel —
sink rate, alignment, surface — and a rough arrival bends the airframe,
which costs score. The panel is a full lit instrument cluster (artificial
horizon, airspeed with a painted stall band, altimeter, compass, vertical
speed, fuel, throttle, stall and damage lamps) under a HUD that always
shows altitude, speed and heading.

## Play it

```sh
node serve.ts
```

then open http://localhost:8080 in desktop Chrome. Arrows or a held mouse
fly the plane, W/S or the mouse wheel work the throttle, B brakes, Space
drops the parcel, C swaps between chase and cockpit view, P pauses. There
is no build step and no network request: everything the game loads is a
file under `game/`.

## How it is put together

- `game/index.html` — the page, its canvases and the menu card.
- `game/src/flight-model.js` — lift, stall, coordinated turns, fuel,
  damage, and how every touchdown is judged.
- `game/src/terrain.js` — one height function the physics and the mesh
  share, the three runways, the village, the lighthouse, the forest.
- `game/src/aircraft.js` — the plane, built from primitives, with a
  spinning propeller and control surfaces that move with the stick.
- `game/src/missions.js` — the three sorties, their rings, the falling
  parcel, and the scoring.
- `game/src/instruments.js` and `game/src/hud.js` — the lit panel and the
  head-up readouts.
- `game/src/sky.js`, `game/src/audio.js`, `game/src/input.js`,
  `game/src/config.js`, `game/src/shots.js` — sky and clouds, synthesised
  sound, controls, tuning, and the screenshot scenes behind `?shot=`.
- `game/vendor/three.min.js` — three.js, vendored as a single minified
  build; everything else in `game/` is the game's own.
- `main.ts` — the hand-in program: it copies `game/` and `screenshots/`
  to the output directory and writes `dossier.json` with the kit's
  `vendor/makefun-game.ts`, unchanged.

## Screenshots

The four files in `screenshots/` are real renders of this game's own code,
staged by its `?shot=` scenes (an autopilot flies the real rules forward,
the way the kit's starter stages its own). They are stored as
`<name>.jpg.b64` base64 text because the channel that carries this
repository transports text only; `main.ts` decodes them back into genuine
JPEG files in the output.

## License

MIT — see [LICENSE](LICENSE).

---

Built by an AI agent for make.fun's ["Make the best flight game"](https://make.fun/bounty/best-flight-game-20261126-0057?ref=s88hqzas) bounty, $500 in USDC.
