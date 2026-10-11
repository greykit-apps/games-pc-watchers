---
version: 1
slug: "js-ui-command-js"
primary_target: "js/ui/command.js"
related_targets: ["css/watchers.css"]
---

# Command screens (the campaign board)

Mode: Operate. Scope: the whole command screen (js/ui/command.js), rebuilt as a hub plus three screens. Briefing and debrief are out of scope (follow-up).

Audience and job: the player between missions (Syndicate veterans first). Read the city, set the pressure, pick a mission, spend on research and the squad. Success: in five seconds they know which zone is in trouble, where Cal pushes, which mission ends it, and how near war is; after Wait a day they see what changed without reading a log.

Decisions (user, 2026-10-10): stylised territory map in the canon PumaCity layout (games/pumacity/.impeccable.md: Convention | Ranch / Vault | Suburbs / Starport | Downtown); Syndicate 1993 GUI; Wait a day plus dispatch, with wait-until shortcuts; one tax dial per zone (control share, whole pips) plus one city-wide research/money balance; separate screens (City, Lab, Clinic and Armoury, Casey's Office); pixel display type drawn from a bitmap font in code; nothing off-limits.

## Direction contract

THESIS: The city is the board. A Syndicate-style territory map of PumaCity, filled in Benton gold as control rises and cut by Cal's red, is the screen you act on; it refuses the card grid, the tabbed dashboard and the log wall.

OWN-WORLD: Bevelled steel-blue panels (light top-left edge, dark bottom-right), an inset slate ground, orange-amber for live controls, Benton gold for control (dim ochre at L0 to bright gold at L3, crosshatched gold when locked), Cal red with hazard stripes for lost ground, Watcher cyan for selection. Pixel bitmap capitals for headings, the screen bar and LCD readouts; a readable system sans with tabular numerals for data.

STORY: The player sees the city's state as a map, opens a zone's dossier, turns its tax dial (squeeze for control, or take it for research and money), briefs the mission that matters (urgent first), and waits a day to watch the dispatch play out on the map.

FIRST VIEWPORT: Top bar: PumaCity Watchers in pixel caps, LCDs for day, cash, the day's take, and the war meter; the city balance slider; Wait a day with an Until menu. Screen bar: City, Lab, Clinic, Office (keys 1-4). Body: the map on the left at full height (portrait, 2x3 canon grid, the Vault sealed); right of it the selected zone's dossier (gauge, dial, forecast, its missions) or, with none selected, the urgent strip and missions grouped by zone; the day's dispatch under them.

FORM: Syndicate 1993 interface language, user-pinned (no concept-seed roll: pinned direction). Signature move: the day's dispatch on the map (zones re-tint, Cal's front advances, deltas float up, LCDs count). Seed key: none (pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Open after build: briefing/debrief restyle; Casey portrait art fidelity.
