---
name: "PumaCity: Watchers"
description: "Four cyber-cats in long coats, and Casey Benton's orders. The command screens, in Syndicate's 1993 manner."
colors:
  steel-face: "#2b3447"
  steel-face-deep: "#1c2230"
  bevel-light: "#5a6a88"
  bevel-dark: "#0c1018"
  groove: "#36425a"
  slate-ground: "#0b0f17"
  inset: "#121822"
  well: "#070a10"
  steel-button: "#3a4660"
  steel-button-hover: "#46546f"
  steel-button-bevel: "#6d7d9c"
  steel-disabled: "#262e3e"
  divider: "#4a5770"
  chip-dark: "#151a24"
  text-bright: "#eef2f8"
  text-body: "#c3cbdb"
  text-quiet: "#9aa6bd"
  live-orange: "#ff9a2e"
  live-orange-hover: "#ffab50"
  live-orange-hi: "#ffc27a"
  live-orange-lo: "#7a4008"
  ink-on-orange: "#1c0d00"
  benton-gold: "#f2c230"
  control-l0: "#8a6a3e"
  control-l1: "#b8862a"
  control-l2: "#dda21f"
  control-l3: "#f2c230"
  control-locked: "#ffd95a"
  cal-red: "#ff4552"
  cal-red-text: "#ff8a8f"
  armed-red: "#7a1a22"
  watcher-cyan: "#5ff0ff"
  money-green: "#9be36a"
  research-blue: "#6fd8ff"
  dark-corner: "#6a4a78"
  dark-corner-text: "#ffb0e8"
  ink-on-green: "#0d1f06"
typography:
  display:
    fontFamily: "PumaCity Pixel 5x7, bitmap"
    fontSize: "21px"
    lineHeight: 1
  headline:
    fontFamily: "PumaCity Pixel 5x7, bitmap"
    fontSize: "14px"
    lineHeight: 1
  lcd:
    fontFamily: "PumaCity Pixel 5x7, bitmap"
    fontSize: "14px"
    lineHeight: 1
  title:
    fontFamily: "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, \"Helvetica Neue\", Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, \"Helvetica Neue\", Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  body-small:
    fontFamily: "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, \"Helvetica Neue\", Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  button:
    fontFamily: "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, \"Helvetica Neue\", Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
  label:
    fontFamily: "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, \"Helvetica Neue\", Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.12em"
  label-lcd:
    fontFamily: "\"Segoe UI Variable Text\", \"Segoe UI\", system-ui, -apple-system, \"Helvetica Neue\", Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.14em"
rounded:
  none: "0px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
components:
  panel:
    backgroundColor: "{colors.steel-face}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.none}"
    padding: "12px 14px"
  button-steel:
    backgroundColor: "{colors.steel-button}"
    textColor: "{colors.text-bright}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "6px 12px"
    height: "34px"
  button-steel-hover:
    backgroundColor: "{colors.steel-button-hover}"
  button-steel-disabled:
    backgroundColor: "{colors.steel-disabled}"
    textColor: "#949fb3"
  button-go:
    backgroundColor: "{colors.live-orange}"
    textColor: "{colors.ink-on-orange}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "6px 12px"
    height: "34px"
  button-go-hover:
    backgroundColor: "{colors.live-orange-hover}"
  button-armed:
    backgroundColor: "{colors.armed-red}"
    textColor: "#ffffff"
    rounded: "{rounded.none}"
  button-link:
    textColor: "{colors.live-orange}"
    typography: "{typography.button}"
    padding: "4px 0"
    height: "28px"
  button-mini:
    typography: "{typography.label}"
    padding: "3px 8px"
    height: "28px"
  lcd:
    backgroundColor: "{colors.well}"
    textColor: "{colors.live-orange}"
    typography: "{typography.lcd}"
    rounded: "{rounded.none}"
    padding: "5px 10px"
    height: "48px"
  screen-tab:
    backgroundColor: "{colors.steel-face}"
    textColor: "{colors.text-body}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
    padding: "4px 14px"
    height: "40px"
  screen-tab-selected:
    backgroundColor: "{colors.steel-face-deep}"
    textColor: "{colors.watcher-cyan}"
  level-chip:
    textColor: "#1a1204"
    typography: "{typography.label}"
    padding: "3px 7px"
  select:
    backgroundColor: "{colors.well}"
    textColor: "{colors.text-bright}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "5px 8px"
---

# Design System: PumaCity: Watchers

## Overview

**Creative North Star: "The Syndicate Console"**

The campaign command screens are an operator's console from 1993, rebuilt in the browser: each screen one steel-blue chassis, lit from the top left and cut into compartments, with orange marking anything you can press now. The city is the board. A satellite map of PumaCity fills the left of the City screen at full height, its zones tinted Benton gold as control rises and cut by Cal's red where ground is lost. Everything else is a compartment of the same chassis beside it: the dossier, the missions, the dispatch. Inside a compartment, content sits flat on the steel.

The display voice is a 5x7 pixel face drawn from a bitmap in code. It carries the brand, panel headings, the screen bar and the LCD readouts, where unlit 8s sit behind every digit like a segment display. Data, prose and controls are in a plain system sans with tabular figures, so numbers line up and long text stays readable. Density is high and deliberate: the target player is a Syndicate veteran who is at home in tight tactical UI, on a desktop, with a mouse and keyboard.

Scope. This system governs the command screens (City, Lab, Clinic and Armoury, Casey's Office, the top bar, banners and toast), scoped under `.cx` and `.cx-layer` in `css/command.css`. It is the game's design direction. The mission HUD, title, briefing and debrief screens are pre-existing and still use the older greykit Tactical tokens (`css/gk-tokens.css`, `css/watchers.css`: monospace, navy, cyan); they have not been moved to this system yet, and nothing here describes them.

**Key Characteristics:**
- Bevel, not shadow, and only where it means something: raised is "press this", sunk is "read this", and the chassis has one round its edge. Everything else is flat on the face.
- Square corners everywhere (0px).
- Orange means "press this"; gold means control; red means Cal; cyan means selected or ours.
- Pixel capitals for titles and readouts, system sans with tabular figures for data.
- Desktop only, by the author's decision. No phone or tablet layout exists or is planned.
- Self-contained: no web fonts, images or other assets are fetched at play time. The pixel face, the screen-bar icons, the map, the Clinic figure and Casey's office are all drawn in code.

## Colors

A cold steel-and-slate ground carrying four hot signal colors, each with exactly one meaning.

### Primary
- **Live Orange** (live-orange): the colour of action. The primary button ("Wait a day", "Brief"), the range-slider thumbs, LCD digits, the WATCHERS nameplate, text links, count badges and map count tags. Panel headings are not orange: they are text-bright. Its bevel pair is live-orange-hi / live-orange-lo; text sitting on it is ink-on-orange.

### Secondary
- **Benton Gold** (benton-gold): Casey Benton's control. The control ramp runs dim ochre to bright gold across levels 0 to 3 (control-l0 to control-l3), with control-locked as the brighter gold for locked zones (crosshatched on the map and legend). Also used for the Take Control meter (upgrade points before the order, one cell a locked zone after it), the dial's "hold" marker and value, Casey's quote attribution, event targets in the Office, and PVN, her news channel, on the ticker.

### Tertiary
- **Cal Red** (cal-red): Cal and lost ground. Hazard stripes over lost zones, Cal's pulsing front on the map, urgent strips, deadly threat, red banners, mission badges that can't wait. Text sitting on red is ink-on-orange, never white (white on cal-red is 3:1). Text in red on dark panels uses the lighter cal-red-text for legibility. armed-red is the fill of a button armed for a destructive confirm.
- **Watcher Cyan** (watcher-cyan): selection and the squad. Focus rings, the selected screen tab's label and icon (and HELP while open), the selected roster card, "in squad" chips, running research bars, the Clinic figure's mods, text selection, "quiet" mission flags.
- **Money Green** (money-green) and **Research Blue** (research-blue): the two outputs of the city split, used on LCDs, the split slider's labels and forecast arrows. Green also marks good outcomes and safe threat.
- **Dark Corner Violet** (dark-corner, dark-corner-text): the "dark corner" research tree, dark events in the Office and dark flags. A minor, reused accent not named in the original direction; it marks morally dark options only.

### Neutral
- **Steel Face** (steel-face): the chassis face every compartment shares. **Steel Face Deep** (steel-face-deep): a clear step darker, for what is pressed in (the open screen's tab).
- **Bevel Light / Bevel Dark** (bevel-light, bevel-dark): the two edges of a bevel. Bevel dark is also the 2px cut between compartments. **Groove** (groove): the faint 1px light along a compartment's top and left edge, the lit side of the cut.
- **Slate Ground** (slate-ground): the screen behind the panels.
- **Well** (well): the black of sunk readouts: LCDs, gauge tracks, slider tracks, selects, progress bars.
- **Inset** (inset): scrollbar track and the figure's backdrop.
- **Steel Button** family (steel-button, steel-button-hover, steel-button-bevel, steel-disabled): ordinary buttons, a step brighter than the face: the plates you press. Draggable kit (filled slots, the racks, the dealer's marks) uses the same plate with a 1px bevel.
- **Divider** (divider): 1px rules between list rows, about 1.8:1 on the face, so a rule can part content where a box used to. **Chip Dark** (chip-dark): neutral badges and empty cells.
- **Text** ramp: text-bright for names, values and button labels; text-body for running prose; text-quiet for metadata, hints and captions.

### Named Rules
**The One Meaning Rule.** Each signal colour keeps its meaning. Orange is live: what you can press now, and the LCD digits; as a status it means caution (hard threat, warnings, IDLE). Headings speak in text-bright, so orange keeps its pull. Gold is Benton control and what it buys. Red is Cal, loss and deadly. Cyan is selection, the squad and what is running. Never use red for an ordinary action, or cyan for a button.

**The Two Golds Rule.** The map tints zones with a darker ramp blended continuously from control (sidecar `goldStops`), so the satellite ground shows through; chips and gauges use the brighter control-l0 to control-l3 so labels on them stay legible. Both ramps end at the same benton-gold.

## Typography

**Display Font:** PumaCity Pixel 5x7, a bitmap face drawn in code (`js/ui/pixfont.js`), no fallback needed because it ships no file
**Body Font:** Segoe UI Variable Text (with Segoe UI, system-ui, -apple-system, Helvetica Neue, Roboto, sans-serif)

**Character:** Hard pixel capitals in orange or white for the console's voice, against a quiet, highly legible system sans that does the reading work. The pixel face is proportional (each glyph as wide as its ink) and has a 1px drop shadow on headings.

### Hierarchy
- **Display** (pixel, scale 3, 21px cap height): the WATCHERS brand mark and the selected Watcher's name in the Clinic. Banner headlines too.
- **Headline** (pixel, scale 2, 14px): panel headings (MISSIONS, DISPATCH, ROSTER, ARMOURY), the zone name in the dossier, screen-bar tab labels, map labels and tags.
- **LCD** (pixel, scale 2, 14px, ghosted 8s behind digits): day, cash, the day's take, AT WAR.
- **Title** (600, 15px, 1.45): mission names in offers.
- **Body** (400, 14px, 1.45, tabular figures): the default for all command-screen text.
- **Body small** (400, 13px): row text, hints, blurbs, list items.
- **Button** (600, 13px, 0.02em): every button label.
- **Label** (600 to 700, 12px, 0.12em, uppercase): list subheads ("Can't wait", "Weapons"), dial labels, level chips. LCD captions are 11px, 0.14em, uppercase, text-quiet.

### Named Rules
**The Pixel Is Voice, Not Data Rule.** The pixel face is for headings, tab labels, LCD numbers and map labels, never for paragraphs, lists or anything the player must read at length. Every pixel heading carries its real text for screen readers (a visually hidden span beside an aria-hidden canvas).

**The Tabular Rule.** All command-screen text uses tabular figures, so money, days and points line up in columns.

## Layout

A fixed full-viewport console: top bar, screen bar, then one screen that fills the remaining height (`grid-template-rows: auto auto minmax(0,1fr)`). Screens do not scroll as a page at full desktop width; their columns scroll internally.

- **Top bar:** brand, LCD cluster, the city split slider, and "Wait a day" plus the Until menu pushed to the right.
- **Screen bar:** five equal tabs (City, Lab, Clinic, Office, Armoury; keys 1 to 5), each with a 9x9 pixel icon, a pixel label, an optional badge and its key; then HELP (key ?), a narrower segment outside the tablist.
- **City:** three columns: the map (near square, full height, at most 50vw) over a two-row key (territory, then the map's own marks); the middle column, the dossier or the overview (led by NEXT MOVE, the mission B briefs and why) over the dispatch; and the missions column. The dossier stops 220px short of the column's foot and scrolls, and the dispatch takes whatever is left. Below 1180px the middle column sits over the missions: it takes what it needs up to 58% of the height and scrolls as one past that, and the missions always keep the rest.
- **Help:** "How it works" floats over the right of whichever screen is open (the screen's grid cell, at most 460px or 42vw wide), with the floating-menu shadow. Esc or HELP closes it.
- **Lab:** two columns, war footing and running research on top, the trees below in auto-fit columns of at least 420px.
- **Clinic:** the roster, then the selected Watcher's figure with mod slots either side.
- **Armoury:** the squad's kit across the top; the racks and the dealer on the left, the selected item's card on the right.
- **Office:** Casey's scene (wider) beside the desk.

Spacing runs on a tight 2/4/6/10/12/16px rhythm: 12px gaps between panels, 12x14px panel padding, 16px screen gutters, 4 to 6px inside lists.

Desktop only, by the author's decision. Below 1180px wide the City folds to two columns (the map spans both rows, the missions keep at least 42% of the right column), the Clinic and Armoury narrow their columns and the kit wraps two Watchers to a row, and the Lab, Clinic and Office scroll as a page. No phone or tablet layout is specified.

## Elevation & Depth

Depth is bevelled, not shadowed, and a bevel has to mean something. Not everything is bevelled (user, 2026-10-13: "Not everything needs to be beveled"). There are four tiers:

- **Chassis.** Each screen is one steel body with a 2px raised edge (the top bar too). Its compartments (the map, the dossier, the missions, the dispatch, the Lab's trees, the roster) share its face. They are parted by a 2px cut in bevel-dark, with a faint 1px groove light along each compartment's top and left. Nothing floats on a dark floor.
- **Controls, raised.** Only what can be pressed now: steel, go, armed and research-buy buttons with a 2px bevel; mini buttons and draggable kit (filled slots, racks, the dealer's marks) with a 1px bevel. Pressing flips the bevel and drops 1px.
- **Wells, sunk.** Only readouts: LCDs, the Take Control well, gauge and slider tracks, selects, the map slot, the Clinic figure, the Office scene and the Armoury card's picture.
- **Content, flat.** Missions, mod slots, roster rows, the squad's kit, flags, the dial, the tally and the Lab's marks sit on the face. They are parted by space and 1px divider rules, or by a tonal step: Cal's compartment warms red while he pushes, the urgent strip is tinted red, the dark corner violet, and a picked roster row or kit is lit steel with its name in cyan.

A control that can't be pressed has no plate. It reads as text in #949fb3 with its reason under it. An empty kit slot is a 1px dashed outline. A locked Lab mark is quiet text.

### Shadow Vocabulary
- **Floating menu** (`box-shadow: 0 10px 24px rgba(0,0,0,.5)`): the Until menu and the help panel.
- **Banner** (`box-shadow: 0 18px 40px rgba(0,0,0,.6)`): the red and gold announcement banners: a slim full-width band docked under the screen bar, which drops in like a shutter 0.9s after a wait so the map's sweep plays first. What one wait brings comes as one banner (the first headline in pixel scale 3, each further event a line beside it), up for 7 seconds, held while the pointer is on it, dismissed by a click or Esc (Esc also cancels one not yet landed). TAKE CONTROL is gold: it's Benton's moment.

### Named Rules
**The Bevel Means Something Rule.** Raised means "press this" and sunk means "read this", and the chassis has one edge round it. Anything else gets no bevel: no plates for rows, cards, slots, panels or disabled buttons, and no box inside a box. Reach for space, a 1px rule or a tonal step first.

**The Light From Top-Left Rule.** Raised is light top-left, dark bottom-right; sunk is the reverse; pressed flips a raised control to sunk. Never mix the directions on one screen.

**The Floating Only Rule.** Soft drop shadows appear only on layers that float over the screen (menu, banners). Panels sitting in the layout never cast one.

## Shapes

Square corners everywhere (0px), on panels, buttons, inputs, slider thumbs and chips. Controls are rectangular plates, readouts rectangular wells, and content has no outline at all. Small square cells do the work of meters: the Take Control meter's 4x12px cells (18px wide, one a zone, once the order is given), 7px threat dots, mark pips in the Clinic slots. The map uses crosshatch for locked zones and diagonal hazard stripes for lost ones; the legend repeats both as 12px swatches.

## Components

### Buttons
Steel plates you press in. Only a button that can be pressed now is a plate.
- **Shape:** square (0px), 2px bevel, minimum 34px tall, 6x12px padding.
- **Steel (default):** steel-button with a steel-button-bevel top-left edge and text-bright label.
- **Go:** live-orange with its own orange bevel and ink-on-orange label. One per panel: the thing to do next ("Wait a day", "Brief", the recommended action).
- **Armed:** armed-red with a red bevel, for a destructive action awaiting confirm.
- **Link:** no plate, orange underlined text, for secondary navigation inside panels.
- **Mini:** 28px tall, 12px text, 1px bevel, for row actions.
- **Research buy:** in the Lab trees, an open node is a dark bronze plate with a bronze bevel and pale gold text, the price of control made into a button. It is the only plate in the trees: finished marks are cyan text, locked marks quiet text that names only a need from another line, and a line with nothing open yet folds to one note ("MK1 to MK3 · needs Uzi MK1").
- **Hover / Focus / Active:** hover lightens the plate one step; focus-visible is a 2px watcher-cyan outline offset 2px; active flips the bevel to sunk and drops 1px (no drop under reduced motion). Disabled has no plate: transparent, no bevel, #949fb3 text at full opacity (the mission screens' global `button:disabled` opacity is reset under `.cx`). Where a disabled action would only be a plate with a price on it (fitting a mod), it is written as text instead, the price and then the reason. The map's zone labels are bare hit areas: no plate, no hover fill, no press drop; the canvas draws their hover.
- **Reason:** why a control can't be pressed sits under it in text-quiet, 12px, behind a 6px live-orange caution square; never orange text, which would read as pressable.

### Chips
- **Level chip:** solid control-l0 to control-l3 (control-locked when locked, cal-red when lost), dark ink, 12px bold, slight tracking.
- **Screen-bar badge:** solid orange count; "IDLE" as bare orange caution text; a soft count as bare text-quiet figures.
- **Map tags (and the key):** orange mission count (cal-red when one can't wait), green or red tags for what the last wait moved, in the pixel face on solid plates with dark ink.
- **Squad state:** no chip for the usual case. A Watcher in reserve says RESERVE in quiet uppercase text.

### Cards / Containers
- **Corner Style:** square (0px).
- **Background:** steel-face, the chassis face; no sub-panels.
- **Shadow Strategy:** none. A compartment is parted from the next by the chassis's 2px cut (see Elevation & Depth).
- **Border:** none. Cal's compartment and the dark-corner tree are tinted, not edged.
- **Internal Padding:** 12px 14px.

### Inputs / Fields
- **Slider:** a sunk well track with an orange bevelled thumb, as Syndicate's slider bars. Used for the city split and each zone's tax dial, which runs as Syndicate's tax slider (user, 2026-10-12): right hands the city more. A gold tick and "HOLD" marker show the break-even tax: under it invests in control, over it milks the zone.
- **Select:** sunk well, text-bright 13px semibold, square.
- **Focus:** 2px watcher-cyan outline, offset 2px.

### Navigation
- **Screen bar:** one strip cut into five equal segments, 40px tall, and a HELP segment after them. The segments are parted by 2px cuts, like the chassis. Default: steel-face with a text-bright pixel label and a quiet icon. Selected: pressed in to steel-face-deep, with a 2px cyan underline and the label and icon in watcher-cyan. Each segment leads with its number key (and HELP its ?) as a quiet figure, not a boxed key cap; it is aria-hidden and named as `aria-keyshortcuts` instead. Key hints elsewhere sit in a dark shade, never a bordered box.

### LCD Readout (signature)
A sunk black well, 48px tall, with an 11px uppercase caption in text-quiet over pixel digits in live-orange (money in green, research in blue). Unlit 8s are drawn behind every digit in a dark tint of the digit colour, as on a segment display.

### The Satellite Map (signature)
A canvas satellite view of PumaCity: ocean west, country round the city, zones outlined along roads, the creek and the coast. Zone fill blends continuously along the gold ramp by control; lost zones carry red hazard stripes; locked zones a gold crosshatch; Cal's front pulses as a dashed red outline. Labels sit on dark translucent plates on leader lines in the pixel face, with orange (or red, if urgent) mission-count tags. After a day passes, changed zones flash green or red and carry tagged level moves until the next action.

## Do's and Don'ts

### Do:
- **Do** bevel only what is pressed (raised) or read (sunk), and the chassis edge; flip a control to sunk while it is held.
- **Do** keep orange for things the player can press now, and give each panel one orange "go" button at most.
- **Do** set headings, tab labels, LCD numbers and map labels in the pixel face, at scale 2 (scale 3 for the brand and a Watcher's name), with real text beside the canvas for readers.
- **Do** set data in the system sans with tabular figures, 13 to 14px.
- **Do** use the gold ramp for control level only, and red with hazard stripes for anything Cal holds or has taken.
- **Do** draw any new glyph, icon or illustration in code (bitmap or canvas); nothing is fetched at play time.

### Don't:
- **Don't** round corners; everything is 0px.
- **Don't** plate content: no bevelled rows, cards, slots or disabled buttons, and no box inside a box. Part content with space, a 1px rule or a tonal step.
- **Don't** put soft drop shadows on panels that sit in the layout; shadows are for floating layers only.
- **Don't** load web fonts, image files or icon packages; the pixel face lives in `js/ui/pixfont.js`.
- **Don't** set paragraphs or long lists in the pixel face.
- **Don't** design phone or tablet layouts; the game is desktop only.
- **Don't** restyle the mission, title, briefing or debrief screens by borrowing tokens from here piecemeal; moving them is a separate, whole-screen job.
