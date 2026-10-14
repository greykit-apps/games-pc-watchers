# PumaCity: Watchers

**Four cyber-cats in long coats, and Casey Benton's orders.** A squad
tactics game in the spirit of *Syndicate* (Bullfrog, 1993), set in PumaCity.
You run the Watchers, the Boss's covert enforcers, holding her city zone by
zone against Cal and the gangs he sets on it.

Status: the engine; the meta-game (eight zones, daily production, Cal, research,
Take Control and lockdowns: see `docs/meta.md`), with persuade, intel, job,
crackdown, sweep, assassination, Cal's crew, siege and story missions; five
districts, each one large map with generated missions.

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
  goes next. He learns how the Watchers work: lean on one way (the BanHammer,
  stealth, guns, talk) and his people are set out against it until you vary it.
- **The briefing** offers a choice of drop-offs and getaway car spots, and
  counts the armed trouble along each way. Its map marks each with a moving
  ring and a word: the drop-off cyan, pulling in; the getaway car blue,
  pushing out; the job red; where the target runs amber; side jobs gold. The
  scanner in the field uses the same colours.
- **PVN** runs the news along the bottom of the command screen: your work, as
  Casey Benton would have it told.
- **Research** costs money to start and research points to finish; points
  can't be banked and split between the projects running. Weapons, mods, the
  scanner and the Purrsuader come in three marks; the BanHammer, overseers,
  zone works and requisitions besides.
- **Missions** arrive in zones over time, a short board of four to seven:
  one or two ordinary offers a zone, five at most city-wide, no kind twice,
  each up for 6 to 12 days; Cal's crew, sieges and story steps on top; and
  always a quiet training job at threat 2 or less. What turns up fits the
  zone (talk where it's calm, fighting where it isn't). A mission's threat is
  its own, fixed when it turns up: the kind, the zone, and Cal's escalation
  as the campaign goes on. Missions take 3 to 8 days during which the pips
  stand as set, and pay research (half of what is left on the first project
  running), money (enough for a real purchase) or control.
- **The squad**: up to 8 Watchers, 4 deploy. Weapons are bought per Watcher,
  mods fitted at the Clinic; the dead are gone with everything spent on them.
- **Take Control**, Casey Benton's order once there are 30 upgrade points:
  decay rises by 30%, Cal commits, and each zone gets a story chain whose last
  step locks it down. Lock every zone down to win.

The campaign saves under `pcwatchers_campaign_v2` after every change.

### Districts

Each district of PumaCity is **one map**, far bigger than any one mission
needs, and every mission is played on all of it: the squad can walk from
the market to the cathedral to the station if it wants to. What a mission
chooses is where things are: a target spot (in a named landmark, or
anywhere), a drop point a long walk from it (a third to three quarters of
the district's width), the way out the target runs for, away from the
squad, and the **pickup**: a getaway car parked on the sidewalk or a verge
near a road leaving the district, far from the target and, where it can be,
from the drop point too, so the way out is a second long walk. A seed picks
them all, so one map gives a great many missions.

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
  something at its places of interest (inside buildings, open spaces, big
  back alleys, two-way streets): a gang drinking in a bar or a club, a deal
  going down, a mugging, lookouts on a corner, a pack of the crew walking
  the streets together, a mob of the crew's lowest (a dozen or more, few of
  them armed, moving as one), the crew's car across a street with them round it,
  the police round a body in the road or stopping a street at a checkpoint
  (their cars across both lanes; traffic turns round), a patrol, a rally
  with the police watching, a crowd. Crew also walk the streets alone,
  among everyone else. How much is going on follows the district's size and
  the threat (about 14 places on Downtown at threat 1, 30 at threat 5), and
  so does the hostile share of it; the police turn out in force only at the
  higher threats. More than half of it lies across the ways from the drop
  point to the mark and from the mark to the getaway car, so the way out
  runs through it; none of it is on top of the drop point, the mark or the
  car. Nobody has to die: going round is often the answer.
- **Alarms are local.** Crew within 20 tiles of where an alarm goes up turn
  on the squad; within 32 they know a Watcher on sight from then on; the
  target, or a persuade job's subject, hears of it only from their own
  people or within 40 tiles. The rest of the district carries on as it was,
  so a fight on the far side of town does not spook the mark, but each
  fight on the way leaves its block awake for the way back.
- **Silenced guns.** The pistol and the Longwhisker are heard only within 3
  tiles of the shooter or of where the round lands. Whoever a silenced round
  kills raises no alarm; one it only wounds turns on the shooter, but their
  shout reaches no further than those 3 tiles. So a lone lookout can be
  picked off from range without waking the block; two together, and the
  second calls it in. (The crew's own pistols are silenced too.)
- **Surprise.** A Watcher's Longwhisker kills with one shot while nobody
  within 12 tiles of the one hit (them included) is on guard: crew alerted
  or fighting, police called in, civilians panicking. Shoot one of a crowd
  and the rest panic, and the next shot is just a rifle again. A miss lands
  close enough to be heard, and spends the surprise too.
- **Cars and people.** Drivers brake for pedestrians, now and then too late:
  a knockdown and some damage. A speeding car (a getaway, or a driver
  panicking away from gunfire) kills whoever it hits, but a Watcher's
  chassis takes it: badly hurt and knocked flat. Walking into a car's
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

### The scanner

Syndicate's: a top-down map turned 45° so it faces the way the view does,
centred on the lead Watcher. A radar ping sweeps out every two seconds and
blips flare as it passes; a target off the edge gets an arrow on the rim.
Click to look somewhere, Shift-click to send the squad, and use the wheel
to zoom.

Its mark is the best any Watcher still in the field carries (the campaign's
`scannerMk`, sent as `L.scannerMk` or on a roster entry):

- **MK1**: the plain view, and nobody under a roof none of yours is under.
- **MK2**: guns marked within 12 tiles of a Watcher, and unarmed crew shown
  apart from armed.
- **MK3**: guns marked within 22 tiles, and people seen through roofs and
  walls. Against Cal (his crew, a siege, a zone he holds) his people within
  range show as crew, plain clothes or not.

That matters because **not all the crew wear red**. From threat 3 up, some
dress like everyone else (about one in eight at threat 3, nearly half at
threat 5; twice as many among those roaming the crowd). A gun under plain
clothes that the scanner has marked flashes orange on the scanner and over
the wearer's head. Once one of them shows their hand, a red trim gives them
away. Watchers sent in with `E` shoot only those plain clothes the scanner
has marked or that have shown themselves.

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
  Security once you have 2 followers, the crew at 4, and the bodyguards at 6;
  the target too, at 6, and a target talked round counts as the job done.
  Followers pick up dropped guns and fight for you.
- **Stims** (the bars on each card): Zoomers for speed and rate of fire, Red
  Dot for aim and sight, Silvervine for reflexes and initiative. A dose above
  the midpoint burns off slowly and builds a dependency that eats into the
  effect.
- Bonuses: recruit 5 followers, and lose no more than 4 civilians. The
  debrief grades the run from S to D.
- **Then get out.** With the target dead the job is not over: every Watcher
  still standing has to reach the pickup (the getaway car, marked from the
  start, and the only way out). Some of the crew lose heart and run when
  their boss goes down (most of a small outfit, few of an army); the rest
  keep coming. On the way out, pick over the dead: they drop every gun they
  had, and sometimes a medikit, and a Watcher carries up to eight things
  home, guns you have not researched included. Lost if nobody makes it out.

### The jobs

The campaign says what kind of job it is (`L.mission.kind`), and the
briefing, the opening radio and the title card follow it. Every job ends the
same way: get out, to the getaway car at the pickup. Walking off the map
anywhere else does not count.

| Job | At the mark | Done when | Lost when |
|---|---|---|---|
| **Assassination** | the target, with bodyguards | the target dies | the target gets away |
| **Persuade** (quiet) | someone to talk round, minders watching from further out | they are walked out | they die, or run off once an alarm near them is up |
| **Intel** (quiet) | a terminal: stand at it 6 seconds | the data's carrier is out | the carrier dies |
| **Job** | a safe: stand at it 3 seconds | the goods are out | nobody gets them out (a fallen carrier drops them) |
| **Sweep** | the crew's hangout and four pieces of trouble round it | at least one is broken up and the squad is out (each one more pays) | nobody gets out |
| **Crackdown** (and a hit on Cal's crew) | the operation's stash, among its crew | the stash is burned and most of the crew are down or run off | the squad is wiped out |
| **Siege** | the crew dug in, in the building nearest the mark, holding their posts | every defender is down | the squad is wiped out |
| **Story** | step 1 a hit, step 2 a persuade, step 3 a siege | as those | as those |

**Side jobs.** Every job also marks two or three pieces of trouble on the
ways in and out (BONUS on the map, amber on the scanner): break one up
before leaving (everyone in it down, run off or talked round) and it pays
money and a little control on top, even if the job itself went wrong, as
long as somebody gets out.

**Veterancy.** A Watcher who comes home from 3 missions is a Regular, from
8 a Veteran, from 15 Elite: each rank a little more aim and a little quicker
to take it (stars on the card), and a little more squad power.

**The enemy's level** is the threat less one, matched to the Watchers' own:
at threat 1 a third of them carry an MK1 pistol; by threat 5 they carry MK3
rifles, miniguns and lasers and take half as much again to kill, and there
are nearly four times as many. What they carry is what they drop (see `docs/missions.md`).

An empty-handed Watcher close to the crew is only suspicious at first ("Hey.
Who are you?"); linger about two seconds and they work it out. A gun, or an
alarm near them, gives you away at once. The following the squad can hold is set by
its best Purrsuader (6, 10 or 16); a persuade job's subject never counts.

### Controls

| | |
|---|---|
| `` ` `` `1`–`4` | select the whole squad / a Watcher (`Shift` adds; double-tap centres the view) |
| Left click / drag | move there / box-select |
| `Alt` + left click | move there the quiet way: round the armed crew the scanner shows |
| Right click | fire at a person or car, or at a spot on the ground (hold to keep firing); with the Purrsuader out, persuade |
| `E` | go: every stim to full, guns out, the crew shot on sight |
| `C` | calm: stims to nothing, guns away, nobody shoots first |
| `R` · `Q` | guns (each one's last) out or away · the Purrsuader out or away |
| `F` | first aid: a medikit for each Watcher at half health or worse |
| `X` | the BanHammer: click a spot a Watcher can see; four seconds later everything within 6 tiles dies |
| `Z` | the selected Watchers' followers hold where they stand (still firing), or come again |
| `V` | the scanner view, over the city: the better the scanner, the more ground it covers |
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
