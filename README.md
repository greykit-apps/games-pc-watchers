# PumaCity: Watchers

**Four cyber-cats in long coats, and Casey Benton's orders.** A squad
tactics game in the spirit of *Syndicate* (Bullfrog, 1993), set in PumaCity.
You run the Watchers, the Boss's covert enforcers, through the city's
districts one contract at a time.

Status: the engine, one playable district (Market Plaza), and the campaign
loop: contracts pay, money funds research, research unlocks gear.

## Play

Open `index.html` from disk, or serve the folder (`python -m http.server`).
Plain `<script>` tags, no build step, no network at play time. Everything,
art and sound included, is drawn and synthesised in the page.

### The campaign

As in *Syndicate Wars*, the Boss pays by the contract and the money buys the
squad's future:

- **Contracts** pay a fee on success, plus a bonus for each optional
  objective, scaled by grade (S ×1.25 to D ×0.8). A finished contract can be
  run again as a mop-up, for a smaller fee.
- **Research.** Two labs, *Weapons* and *Cyber*, each work on one project at
  a time and spend their daily funding ($0 to $4,000) as days pass. A
  contract takes two days; *Wait a day* passes one.
  - Weapons: Uzi, Longwhisker rifle, Purrsuader II, Minigun (needs the Uzi),
    Laser (needs the rifle), Gauss Gun (needs both).
  - Cyber: Legs, Arms, Chest, Heart, Eyes and Brain, in three versions each.
- **The Armoury** sells what has been researched, to a chosen Watcher (8
  slots each). Ammunition is topped up free before every mission; medikits
  are bought. Selling pays back half the price.
- **The Clinic** installs researched mods, one version at a time.
- **The Roster** holds up to 8 Watchers; 4 deploy. The dead stay dead, along
  with what they carried. Weapons picked up in the field come home. Hire
  replacements for $4,000.
- **Skirmish** on the title plays Market Plaza with the standard kit and
  saves nothing.

The campaign saves under `pcwatchers_campaign_v1` after every change.

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
js/campaign/campaign.js  the campaign: research, prices, roster, pay (no DOM)
js/ui/hud.js          the mission's left panel
js/ui/overworld.js    Watchers command: city, contracts, labs, Armoury, Clinic, Roster
js/main.js            screens, input, loop
tools/sim.js          headless bot runs of the mission
tools/campaign.js     a headless campaign: contracts, research, shopping
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
node tools/sim.js 10 --campaign  # with a new campaign's kit (no Uzis)
node tools/sim.js 2 --attract  # the title screen's backdrop sim
node tools/campaign.js 14      # a bot plays 14 contracts; checks the economy
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

1. ~~The campaign loop: contracts, research, Armoury, Clinic, roster.~~
2. More districts: The Starport, PVN Tower, The Vault, The Ranch, The
   Convention Center, The Suburbs.
3. Overworld depth: districts held pay tribute, rival syndicates, events.
4. Engine: enterable vehicles, more weapons (minigun, laser, flamer, time
   bomb), mission types (persuade, evacuate, retrieve), touch controls.

## Credits

Game design by shandower, code with Claude. Inspired by *Syndicate*
(Bullfrog Productions, 1993). The `Source/` folder holds the original game
for reference only; nothing from it ships.
