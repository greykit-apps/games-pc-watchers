# PumaCity: Watchers

**Four cyber-cats in long coats, and Casey Benton's orders.** A squad
tactics game in the spirit of *Syndicate* (Bullfrog, 1993), set in PumaCity.
You run the Watchers, the Boss's covert enforcers, through the city's
districts one contract at a time.

Status: engine plus one playable mission (Market Plaza). The overworld, where
research and investment drive the squad's upgrades, comes next.

## Play

Open `index.html` from disk, or serve the folder (`python -m http.server`).
Plain `<script>` tags, no build step, no network at play time. Everything,
art and sound included, is drawn and synthesised in the page.

### Mission 1: Market Plaza (Operation Clean Sweep)

Vesper Sly sells Skooma under Casey Benton's price from Cafe Miao, in the
north-east corner of Downtown's open-air mall. Kill him before his car leaves
the map.

- **Plaza Security** are mall cops who don't know who you are. A gun in plain
  view earns one warning, then they open fire and radio their friends.
- **Vesper's crew** spot an armed Watcher from across the plaza and an
  unarmed one only up close. Once they make you, Sly hesitates for a moment,
  then runs for his car on North Avenue. A car takes a few rounds, then goes
  up and takes anyone beside it.
- **The Purrsuader** talks people into following you. Shoppers come at once,
  Security once you have 2 followers, the crew at 4, and the bodyguards at 6.
  Followers pick up dropped guns and fight for you.
- **Stims** (the bars on each card): Zoomers for speed and rate of fire, Red
  Dot for aim and sight, Silvervine for reflexes and initiative. A dose above
  the midpoint burns off slowly and builds a dependency that eats into the
  effect.
- Bonuses: recruit 5 followers, and lose no more than 4 civilians. The
  debrief grades the run from S to D.

### Controls

| | |
|---|---|
| `1`–`4` | select a Watcher (`Shift` adds; double-tap centres the view) |
| `0` or `` ` `` | select the whole squad |
| Left click / drag | move there / box-select |
| Right click | fire at a person or car, or at a spot on the ground (hold to keep firing); with the Purrsuader out, persuade |
| `Q` `E` · `H` | previous / next weapon · holster |
| `WASD`, arrows, screen edge, middle-drag | scroll |
| `C` · `Tab` | centre on the selection · next Watcher |
| `Space` · `Esc` · `M` | pause · menu · sound |

## How it's built

```
index.html            the page: title host, HUD, two canvases
css/gk-tokens.css     greykit.games Tactical palette (canon copy)
css/watchers.css      this game's styles
js/gk-title.js        the canon boot and title block, byte for byte
js/core/util.js       the W namespace, iso projection, RNG, storage
js/core/audio.js      Web Audio synth: weapons, ambience, stingers
js/core/map.js        grid, buildings, props, line of sight, A*
js/core/weapons.js    weapon table and icons
js/core/sprites.js    procedural art: building cells, props, cats, cars, portraits
js/core/render.js     painter's-order renderer, cutaway, lights, rain, scanner
js/core/units.js      units, stims, hostility, AI per kind, firing, Purrsuader
js/core/world.js      a mission in progress: traffic, damage, effects, win/lose
js/levels/plaza.js    Mission 1: map, population, briefing, objectives
js/ui/hud.js          the left panel
js/main.js            screens, input, loop
tools/sim.js          headless bot runs of the mission
```

- **Isometric, pixel-scaled.** The city renders at a low internal resolution
  (2× or 3× by window size, adjustable in Settings) with hard pixels. A crisp
  full-resolution overlay carries text, speech bubbles and labels.
- **Painter's order by x + y.** Buildings are cut into one box per cell, so
  people, props and cars always sort correctly against them. Cell sprites are
  cached by look.
- **Cutaway.** Any building standing between the camera and a Watcher (or the
  target) fades to see-through.
- **Levels are code.** A level's `build(map)` uses `road`, `building`,
  `prop`, `fill` and `light`; `populate(world)` places the people and sets the
  objectives. Adding a district means adding a file under `js/levels/`.
- **The squad comes from a roster.** `W.defaultRoster()` stands in until the
  overworld supplies one. `populate` takes `opts.roster`, which is where
  persistent agents and their upgrades will plug in.

### Checks

```
node tools/sim.js 10 --quiet   # bot walks in holstered, draws late
node tools/sim.js 10           # bot goes in loud
node tools/sim.js 2 --attract  # the title screen's backdrop sim
```

The sim fails on a crash, a NaN position, a unit standing inside a wall, or a
mission that never ends. It also reports wins, losses and casualties, which
helps with balance.

`window.__PW` in the browser: `world`, `alarm()`, `win()`, `god()`.

## Standards

Only one greykit.games canon piece is required here: the boot logo, the
`@gk-title` block in `js/gk-title.js`, kept byte-identical with
`games/meta/canon/gk-title.js`. The game also borrows the Tactical palette
and the title screen, and carries the §1 credit on the title and in About.
Storage keys start with `pcwatchers_`, and Settings has *Forget everything*.

## Roadmap

1. The overworld: PumaCity's districts as a map, contracts, tax and
   investment, research that unlocks weapons and cyber-mods (legs, arms,
   chest, eyes, brain), and a persistent roster.
2. More districts: The Starport, PVN Tower, The Vault, The Ranch, The
   Convention Center, The Suburbs.
3. Engine: enterable vehicles, more weapons (minigun, laser, flamer, time
   bomb), mission types (persuade, evacuate, retrieve), touch controls.

## Credits

Game design by shandower, code with Claude. Inspired by *Syndicate*
(Bullfrog Productions, 1993). The `Source/` folder holds the original game
for reference only; nothing from it ships.
