# PumaCity: Watchers

**Four cyber-cats in long coats, and Casey Benton's orders.** A squad
tactics game in the spirit of *Syndicate* (Bullfrog, 1993), set in PumaCity.
You run the Watchers, the Boss's covert enforcers, holding her city zone by
zone against Cal and the gangs he sets on it.

Status: the engine; the meta-game (eight zones, daily production, Cal, research,
war and lockdowns: see `docs/meta.md`), its missions played for now as the one
mission type the engine has; five districts, each one large map with generated
missions.

## Play

Open `index.html` from disk, or serve the folder (`python -m http.server`).
Plain `<script>` tags, no build step, no network at play time. Everything,
art and sound included, is drawn and synthesised in the page.

### The campaign

The rules, and the numbers behind them, are in [docs/meta.md](docs/meta.md);
`tools/metasim.js` tunes them headless. In short:

- **Eight zones** on the five district maps. Each makes whole **pips** a day,
  split between **research**, **money** and **control** by clicking them on the
  board. Control decays every day; each level of it adds a pip, and a calm
  zone's pips are worth more. At zero the zone is lost until a **siege**.
- **Cal** pushes one zone at a time, harder the better you're doing, and can
  leave **tactics** behind that need researching away. Intel shows where he
  goes next.
- **Research** costs money to start and research points to finish; points
  can't be banked and split between the projects running. Weapons, mods, the
  scanner and the Purrsuader come in three marks; the BanHammer, overseers,
  zone works and requisitions besides.
- **Missions** are offered in zones (more where control is low), take 3 to 8
  days during which the pips stand as set, and pay research (half of what is
  left on every project running), money (enough for a real purchase) or
  control. The mission itself is, for now, the engine's one type: find and
  kill the target.
- **The squad**: up to 8 Watchers, 4 deploy. Weapons are bought per Watcher,
  mods fitted at the Clinic; the dead are gone with everything spent on them.
- **War** comes after 30 upgrade points: decay rises by half, and each zone
  gets a story chain whose last step locks it down. Lock every zone down to win.
- **Skirmish** on the title plays any district with the standard kit and saves
  nothing.

The campaign saves under `pcwatchers_campaign_v2` after every change.

### Districts and the Map Room

Each district of PumaCity is **one map**, far bigger than any one mission
needs, and every mission is played on all of it: the squad can walk from
the market to the cathedral to the station if it wants to. What a mission
chooses is where things are: a target spot (in a named landmark, or
anywhere), a drop point 24 to 60 tiles away, and the way out the target
runs for, away from the squad. A seed picks all three, so one map gives a
great many missions.

| District | Size | Landmarks |
|---|---|---|
| **Downtown** | 224×224 | Market Plaza (the first contract), Club Nine Lives, the PVN Theater under Casey Benton's tower, St. Felis Cathedral, the Downtown Precinct, Central Station, the financial towers, City Hall, St. Whiskers Hospital, the Fifth Street garage, Old Town, Lantern Row, Pounce Park |
| **Suburbs** | 240×240 | the water tower, Pounceton Community College, Main Street's coffee shops, Pounceton Station and its park-and-ride, Whisker Hill Cemetery, and street after street of houses |
| **Convention Center** | 224×224 | the Convention Center itself, the expo plaza, Garages A and B, the arena and Pounce FC, the Rail Yard Market, two footbridges over the light rail, Neon Street (Club Catnip, The Litter Box, the Purrcade, Nine Tails Karaoke, Sake Lantern), the night market, Lantern Square, the derelict Old Expo Hall |
| **The Ranch** | 144×144 | the farmstead, the greenhouses, workers' row, the north fields, and a patchwork of hedged catnip farms around the processing yard |
| **Starport** | 160×160 | the landing field and the docked ship, Hangar Row and Bay 9, the cargo yard, the warehouses |

What makes them play:

- **Warrens.** Dense blocks are split again and again by alleys, one and
  two tiles wide, into small lots. Every alley joins the network and reaches
  a street, and narrow ones mean single file.
- **Buildings you can walk into.** The precinct, the cathedral, the
  stations, the clubs, the bars, the theater, the garages, the library and
  the Convention Center have walls, rooms, doors and furniture. While a
  Watcher is inside, the roof comes off and the walls drop to stubs; from
  outside, the roof hides whoever is in there.
- **Traffic.** Streets with traffic lights, all on one clock: one set per
  approach, and a divided road's crossing counts as one junction. Divided
  boulevards are one-way each side. Trams (four carriages) and commuter
  trains (six), one each way per line and a long wait between them, stop at
  their stations, under glass canopies that fade like any roof. A train stops
  for nobody, but hurts nobody either: people wait at the tracks for it to
  pass, and anyone on the line is pushed off ahead of it, to the nearer side
  (so a squad can be split by one). Cars give way at level crossings. Car
  parks have a loop road, aisles and gates; every driveway runs through the
  sidewalk to a road.
- **Encounters.** The district goes on without you. Each mission puts
  something at a handful of its places of interest (inside buildings, open
  spaces, big back alleys, two-way streets): a gang drinking in a bar or a
  club, a deal going down, the police round a body in the road with their
  cars across both lanes (traffic turns round), a patrol, a crowd. A few of
  the crew walk the streets among everyone else. The hostile ones scale with
  the threat, none are near the drop point, and nobody has to die: going
  round is often the answer.
- **Cars and people.** Drivers brake for pedestrians, now and then too late:
  a knockdown and some damage. A speeding car (a getaway, or a driver
  panicking away from gunfire) kills whoever it hits. Walking into a car's
  side knocks you back, dazed. Only the fight's deaths count against the
  squad: gunfire and blasts, the getaway car, panicked drivers. Other traffic
  deaths are accidents, and the debrief lists them apart.
- **Choke points.** Railways are fenced their whole length: the way across
  is a street crossing, a station, or a footbridge, Syndicate-style, whose
  walkers are up out of the trains' way.
- **Suburbs** are open on purpose: wide boulevards with long sightlines,
  houses of varied shapes (some with garages, every driveway reaching the
  street, sidewalks on both sides), and fenced backyards and alleys behind
  every row for the slow way round.

**Skirmish** on the title opens the **Map Room**: every district, top-down,
with its landmarks listed. Pick one to put the target there, or leave it to
chance; *Shuffle* rolls another mission; *Fly over* shows the district live
with a free camera (and `R` takes every roof off); *Brief & play* runs it.

### The scanner

Syndicate's: a top-down map turned 45° so it faces the way the view does,
centred on the lead Watcher. A radar ping sweeps out every two seconds and
blips flare as it passes; a target off the edge gets an arrow on the rim.
Click to look somewhere, Shift-click to send the squad, and use the wheel
to zoom.

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
| `` ` `` `1`–`4` | select the whole squad / a Watcher (`Shift` adds; double-tap centres the view) |
| Left click / drag | move there / box-select |
| Right click | fire at a person or car, or at a spot on the ground (hold to keep firing); with the Purrsuader out, persuade |
| `E` | go: every stim to full, guns out, the crew shot on sight |
| `C` | calm: stims to nothing, guns away, nobody shoots first |
| `R` · `Q` | guns (each one's last) out or away · the Purrsuader out or away |
| `F` | first aid: a medikit for each Watcher at half health or worse |
| `WASD`, arrows, screen edge, middle-drag | scroll |
| `Tab` | next Watcher |
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
js/districts/kit.js   district registry, warrens, fences, lamps, parking, mission generator
js/districts/encounters.js  places of interest, and what is going on at them
js/districts/*.js     Downtown, Suburbs, Convention Center, The Ranch, Starport
js/campaign/meta.js   the campaign: zones, Cal, research, missions, squad (no DOM)
js/ui/hud.js          the mission's left panel
js/ui/command.js      Watchers command: the board, missions, research, squad, events
js/ui/maproom.js      the Map Room: districts, sections, missions, fly-overs
js/main.js            screens, input, loop
tools/sim.js          headless bot runs of the mission
tools/campaign.js     a bot plays the campaign headless; checks its invariants
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
- **The squad comes from a roster.** `W.defaultRoster()` stands in until the
  overworld supplies one. `populate` takes `opts.roster`, which is where
  persistent agents and their upgrades will plug in.

### Checks

```
node tools/sim.js 10 --quiet   # bot walks in holstered, draws late
node tools/sim.js 10           # bot goes in loud
node tools/sim.js 10 --campaign  # with a new campaign's kit (no Uzis)
node tools/sim.js 2 --attract  # the title screen's backdrop sim
node tools/campaign.js 100     # a bot plays 100 missions (outcomes rolled); --fight plays them out
node tools/maps.js             # every district and section is sound
node tools/sim.js 6 --quiet --district=downtown   # generated missions
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
2. ~~Districts: Downtown, the Suburbs, the Convention Center, the Ranch,
   the Starport.~~ Next: The Vault; bring the Starport up to the others;
   campaign contracts in every district.
3. Overworld depth: districts held pay tribute, rival syndicates, events.
4. Engine: enterable vehicles, more weapons (minigun, laser, flamer, time
   bomb), mission types (persuade, evacuate, retrieve), touch controls.

## Credits

Game design by shandower, code with Claude. Inspired by *Syndicate*
(Bullfrog Productions, 1993). The `Source/` folder holds the original game
for reference only; nothing from it ships.
