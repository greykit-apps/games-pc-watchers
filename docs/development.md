# Watchers: development

How the game is built, how to check it, and the greykit.games canon it
carries. For playing it, see the [README](../README.md).

## How it's built

```
index.html            the page: title host, HUD, two canvases
css/gk-tokens.css     greykit.games Tactical palette (canon copy)
css/watchers.css      this game's styles
js/gk-title.js        the canon boot and title block (v0.4)
js/core/util.js       the W namespace, iso projection, RNG, storage
js/core/audio.js      Web Audio synth: weapons, ambience, stingers
js/core/map.js        grid, buildings, props, line of sight, A*
js/core/weapons.js    weapon table and icons
js/core/sprites.js    procedural art: building cells, props, cats, cars, portraits
js/core/render.js     painter's-order renderer, cutaway, lights, rain, scanner
js/core/units.js      units, stims, hostility, AI per kind, firing, Purrsuader
js/core/world.js      a mission in progress: traffic, damage, effects, win/lose
js/levels/plaza.js    Mission 1: map, population, briefing, objectives
js/districts/kit.js   district registry, warrens, fences, lamps, parking, mission generator
js/districts/encounters.js  places of interest, and what is going on at them
js/districts/*.js     Downtown, Suburbs, Convention Center, The Ranch, Starport
js/campaign/meta.js   the campaign: zones, Cal, research, missions, squad (no DOM)
js/ui/hud.js          the mission's left panel
js/ui/command.js      Watchers command: the board, missions, research, squad, events
js/main.js            screens, input, loop
tools/sim.js          headless bot runs of the mission
tools/bench.js        the tactics bench: a mission by level, threat and tactic
tools/campaign.js     a bot plays the campaign headless; checks its invariants; --report
tools/fights.json     the fight table it rolls from, measured with tools/bench.js
tools/metasim.js      the meta-game's numbers, run and tuned headless
tools/maps.js         every district: points walkable and connected
tools/serve.py        a dev server that never lets the browser cache
```

- **Isometric, pixel-scaled.** The city renders at a low internal resolution
  (2× or 3× by window size, adjustable in Settings) with hard pixels. A crisp
  full-resolution overlay carries text, speech bubbles and labels.
- **Painter's order by x + y.** Buildings are cut into one box per cell, so
  people, props and cars always sort correctly against them. Cell sprites are
  cached by look.
- **Cutaway.** Any building standing between the camera and a Watcher (or the
  target) fades to see-through.
- **Maps are code.** A district's `build(map, rng)` uses `street`,
  `divided`, `rail`, `drive`, `lane`, `fill`, `building` (any style, or a
  cell mask for odd shapes like the arena), `structure` and `partition`
  (enterable buildings and their rooms), `prop` (including `box`
  furniture), `light`, `daub` (ground paint), `park`, `loot` and `point`.
  `W.K` has the warren generator (`lots`), pavement dressing, signals, rail
  fences, fences, lamp lines and parking rows. Adding a district means a
  file under `js/districts/` and its `<script>` tag.
- **Big maps stay cheap.** The ground is drawn lazily in 512px chunks as it
  comes into view, and pathfinding scales its search to the map.
- **The squad comes from a roster.** `populate` takes `opts.roster`, which the
  campaign builds; `W.defaultRoster()` stands in without one.

## Checks

```
node tools/sim.js 10 --quiet   # bot walks in holstered, draws late
node tools/sim.js 10           # bot goes in loud
node tools/sim.js 10 --campaign  # with a new campaign's kit (no Uzis)
node tools/sim.js 2 --attract  # the title screen's backdrop sim
node tools/campaign.js 100     # a bot plays 100 missions (outcomes rolled); --fight plays them out
node tools/campaign.js --report  # a dozen campaigns against the balance targets (docs/balance-plan.md)
node tools/maps.js             # every district and section is sound
node tools/sim.js 6 --quiet --district=downtown   # generated missions
node tools/bench.js --kind=sweep --threat=2 --level=1 --tactic=stealth   # one cell of the tactics bench
node tools/bench.js --grid --kinds=assassinate --jobs=4   # every level, threat and tactic, in parallel
node tools/bench.js --table=grid.jsonl > tools/fights.json   # a grid as the campaign bot's fight table
```

The sim fails on a crash, a NaN position, a unit standing inside a wall, or a
mission that never ends. It also reports wins, losses and casualties, which
helps with balance.

`window.__PW` in the browser: `world`, `alarm()`, `win()`, `god()`.

## Standards

Only one greykit.games canon piece is required here: the boot logo, the
`@gk-title` block in `js/gk-title.js`, a copy of
`games-meta/canon/gk-title.js` (v0.4) whose boot must match canon's. The game
also borrows the Tactical palette and the block's default title, opened the
first time by `introTitle` in `js/main.js`, and carries the §1 credit on the
title and in About.
Storage keys start with `pcwatchers_`, and Settings has *Forget everything*.
