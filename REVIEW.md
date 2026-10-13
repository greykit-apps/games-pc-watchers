# PumaCity: Watchers — review (2026-10-12)

Branch `review/2026-10-12`, worktree `.claude/worktrees/review`, from `main` at `4e8e37d`.
Review scripts live in `tools/review/`; their saved output is in `tools/review/out/`.
Rerun any of them with `node tools/review/<name>.js`.

**Status:** complete. The final re-verification pass is at the end.

## Decisions (author, 2026-10-13)

1. A siege goes away after an amnesty — done in `53b1815`.
2. Persuade missions require persuading (killing the subject already loses them); **persuading an elimination
   target is acceptable** — implemented in `912f9bd`: the mark can be talked round with a bodyguard's crowd (6, or
   3 with the Purrsuader II, never locked out by a full following) and counts as the job done.
3. The tax moves with the level so a zone set to hold stays on hold — done in `43aeaf4`.
4. The level-0 gain pricing (F-05) is **by design**: missions or money get a zone higher.
5. **An ending**: losing every zone is a failure — implemented in `2b24503`. And since Cal never pushes the
   Towers, **every zone but the Towers lost is a retreat, not the end** (author, same day): Casey Benton retreats to
   her stronghold, the player can rebuild from there — implemented in `7a5a6f1`.

## Summary: the five things to fix or decide first (as first reported)

1. **A stale siege after an amnesty resets a rebuilt zone to control 0.6** (F-01, VERIFIED, High).
   Offers are never removed when their zone stops being lost, and a siege's reward is "the zone back at 0.6" unconditionally.
2. **Offers survive their zone being lost, and can be run there** (F-02/F-03, VERIFIED, Medium). A T3 job or a story
   step rolled for a calm zone is playable after Cal takes the zone, with `zoneLevel: -1, cal: true` on the ground
   and its control reward silently skipped. Story step 1 run in a lost zone still advances the chain.
3. **The tax dial does not mean what it says once a zone changes level** (F-04, VERIFIED, Medium). The new pip a
   level-up brings goes to money, so a zone dialled to "Invest" (tax 0) at level 1 is taxed 2 by the time it reaches
   level 3, and a zone left on full control from 1.0 stalls at 2.73 forever instead of climbing the wall.
4. **The control model has a cheap shortcut through the wall it describes** (F-05, VERIFIED, Medium/balance). A pip buys
   1.0 control at level 0 and 0.3 at level 3, priced at the level the day *starts* on: a base-3 zone at 0.99 with
   every pip on control is at 3.04 the next morning, while the same zone from 1.00 takes six days and a daily re-dial.
   Half the zones (base 2) cannot reach level 3 by pips at all: they stall at about 2.7.
5. **The campaign cannot be lost** (F-10, VERIFIED, design). A wiped squad gets a free recruit, there is no clock, a T2
   money job is guaranteed when broke, and the bot wins 72 of 72 campaigns across six strategies. Decide whether a
   fail state is wanted; the current shape is "you can only lose time and Watchers".

## Assumptions

- Code is the authority over `docs/`; a disagreement between them is reported as a Low doc finding unless in-game
  text promises something the code does not do.
- Desktop only, about 1024 px wide as the floor; no colour-blindness work (per the author, 2026-10-12).
- The `tools/fights.json` bench table (4 fights a cell) is taken as the best available measurement of the mission
  engine, and its small sample size is itself reported (F-20).
- Bot strategies in `tools/campaign.js` stand in for players; where a human would obviously do better or worse
  (reloading a lost mission, waiting for money) that is reported separately rather than simulated.
- Fixes are limited to bugs with a reproduced failure; balance changes are suggestions only.

## Findings table

| ID | Severity | Category | Status | Location | Description |
|---|---|---|---|---|---|
| F-01 | High | game logic | VERIFIED, fixed `53b1815` | `js/campaign/meta.js:581`, `:911` | Siege offer survives an amnesty; running it resets the zone to 0.6 |
| F-02 | Medium | game logic | VERIFIED, fixed `53b1815` | `js/campaign/meta.js:581`, `:628` | Ordinary offers survive their zone being lost and are runnable there |
| F-03 | Medium | game logic | VERIFIED, fixed `53b1815` | `js/campaign/meta.js:581`, `:913` | Story step 1 runnable in a lost zone; advances the chain, pays no control |
| F-04 | Medium | game logic | VERIFIED, fixed `43aeaf4` (rules change) | `js/campaign/meta.js:299-306` | `fitPolicy` puts a zone's new pip on money: the tax dial drifts after a level-up; "Invest" stalls at 2.73 |
| F-05 | — | design | VERIFIED, by design (author) | `js/campaign/meta.js:23,266,286` | Level-0 gain is priced for the whole day: 0.99 → 3.04 in one day; base-2 zones never reach level 3 by pips |
| F-06 | Low | game logic | VERIFIED | `js/campaign/meta.js:491-497` | Research points past a finishing project are lost, not passed to the others |
| F-07 | Low | game logic | VERIFIED | `js/campaign/meta.js:993` | A persuade's control reward is repriced after the days away; the briefing figure is not what is paid |
| F-08 | Low | PX | VERIFIED | `js/campaign/meta.js:354-361` | The dossier forecast is a straight line through a curved decay: "Level 1 in 2 days" for a zone that never falls |
| F-09 | Low | docs | VERIFIED | `docs/meta.md` "Control" | A plateau zone with no pips is lost in 5 days, not "lands at level 1"; with 1 pip it falls to level 0 |
| F-10 | — | design | VERIFIED, fixed `2b24503` | `js/campaign/meta.js:985`, `:619` | No fail state: free recruit on a wipe, guaranteed money job, no clock; 72/72 bot campaigns won |
| F-11 | High | game logic / PX | VERIFIED, fixed `02c8ddf` | `js/districts/kit.js:629-638` | Every persuade mission carries an "Eliminate <subject>" objective, shown in the HUD and ticked ✓ in the debrief |
| F-12 | Medium | input | VERIFIED, fixed `16d8663` | `js/main.js:823,860,870` | Shift+1–4 never adds a Watcher to the selection: `ev.key` is `!`/`@`/`#`/`$` with Shift held |
| F-13 | Medium | exploit | VERIFIED | `js/main.js:990-995` | Reloading the page mid-mission is a free retry: the campaign saves only at the debrief |
| F-14 | Medium | PX / input | VERIFIED, fixed `d6b5186` | `js/main.js:12,765,428-432` | A mission begun with the mouse resting over the view scrolls the camera to the map's corner (`ui.x/y` start at 0,0) |
| F-15 | Low | PX | VERIFIED | `js/main.js:972` | The grade's time term starts at 4 minutes: a flawless 10-minute district mission grades C |
| F-16 | Low | PX | VERIFIED | `js/districts/kit.js:641` | "Recruit 5 followers" is a bonus on every mission, including ones with no Purrsuader in the squad |
| F-17 | Low | text | VERIFIED | `js/main.js:135` | About says "One district so far: more are coming"; there are five |
| F-18 | Medium | balance | VERIFIED | `tools/review/out/grid-n12.txt` | Stealth is the best way in at every measured cell; the Purrsuader "mob" is the worst one step over the tier |
| F-19 | Low | PX | VERIFIED | `js/campaign/meta.js:135,177` | A new squad's first push from Cal is answerable only by a T4 "Hit Cal's crew": the counter-mission is beyond tier 1 |
| F-20 | Medium | tooling | VERIFIED | `tools/fights.json` | Every balance claim rests on 4 fights per cell; the bot's "careful" number takes the best 2 of 4-5 tactics |
| F-21 | Low | game logic | VERIFIED | `js/core/units.js:430,447`, `W.FOLLOWING` | A bodyguard needs 6 followers but the MK1 Purrsuader's following caps at 6, so MK1 never persuades one without a Brain mod |


## Detailed findings

### F-01 · Stale siege after an amnesty resets the zone (High, VERIFIED)

**Evidence.** `tools/review/meta-checks.js` check `amnesty-stale-siege`: buy an amnesty for the Ranch on day 1,
dial it to full control for 14 days (control 1.75, level 1), then brief the siege that is still on the board.
`M.settle` runs the `retake` branch and sets `z.lost = false; z.C = 0.6`: control 1.75 → 0.65, level 1 → 0.

**Why.** `M.refreshOffers` (`meta.js:581`) only drops offers that have expired, Cal offers once his push moves, and
offers in locked zones. Nothing drops a siege when its zone is no longer lost, and `M.event` for `amnesty`
(`meta.js:881`) does not touch `s.offers`. The siege's reward (`meta.js:911`) does not check that the zone is lost.
The player sees a "Can't wait" siege on a zone they just paid $150,000 to recover, with "the zone back, at level 0"
as its reward; taking it (it is first in the urgent list and B-key default) throws the rebuild away.

**Fix.** In `M.refreshOffers`'s filter, drop `siege` offers whose zone is not lost (and, symmetrically, drop
non-siege offers whose zone *is* lost; see F-02). Guard the `retake` branch with `if (z.lost)`.

### F-02 · Ordinary offers survive their zone being lost (Medium, VERIFIED)

**Evidence.** `meta-checks.js` `offers-survive-zone-loss`: a T3 job offered in the Expo at level 0 stays on the board
after the Expo is lost, `M.canRun` allows it, and `M.missionFor` builds the mission with
`zoneLevel: -1, cal: true` (Cal's own people, everyone hostile) at the stale threat 3. The money reward is paid;
any control reward is skipped by the `!z.lost` guards.

**Why.** Threat is fixed when an offer is rolled (by design), but the offer's *zone* can change state under it.
The engine then plays a "job in a lost zone", which no table in `docs/meta.md` describes, at a threat two steps
under what a lost zone would roll.

**Fix.** Drop non-siege offers from a zone the moment it is lost (same filter as F-01), or re-roll their threat.

### F-03 · A story step can be run in a lost zone (Medium, VERIFIED)

**Evidence.** `meta-checks.js` `story-step-in-lost-zone`: declare Take Control, let the Towers (which carried the
step-1 story offer) fall; the offer stays, `canRun` passes (step 0 needs level 0), and settling it advances
`z.story` to 1 with no control paid.

**Why.** `M.storyReady` refuses to *add* a story offer in a lost zone (`meta.js:577`) but nothing removes one, and
`M.canRun` only compares control against the step's need. The design says a lost zone "has to be taken back by
siege first".

**Fix.** The same filter as F-01; additionally `canRun` should refuse story steps where `z.lost`.

### F-04 · The tax dial drifts when a zone gains a pip (Medium, VERIFIED)

**Evidence.** `meta-checks.js` `tax-dial-drifts-on-level-up` and `tax-dial-stall`: Old Town at 1.9, tax 0 (every
pip on control). The next day it is level 3 with 6 pips and the policy reads `r0 m2 c4`: tax 2. Left alone from
1.0 with tax 0 set once, the zone sits at 2.73 after 20 days; re-set to 0 every day it is at 3.95.

**Why.** `M.fitPolicy` (`meta.js:303`) tops up a short policy with `P.m++`. The dial is presented as a *tax*
(`command.js:866`: `setDial(s, z, max - value)`), so the invariant the player expects is "tax stays where I put it"
and the code keeps "control pips stay where they were". While the squad is away for 3–8 days (policies frozen by
design) a climbing zone quietly starts paying tax, and the 2.5–2.9 wall becomes unclimbable without a re-dial.
The overseers (`meta.js:509`) paper over this only while the squad is away and only up to hold+1.

**Fix.** Store tax rather than control pips (or recompute `c = pips - tax` in `fitPolicy`), so a level change
moves the new pip onto control when tax is unchanged.

### F-05 · The level-0 shortcut through the wall; base-2 zones cannot climb it (Medium, VERIFIED)

**Evidence.** `meta-checks.js` `level0-control-jump` and `tools/review/control-dynamics.js`:

| Base-3 zone, every pip on control, dial re-set daily | days |
|---|---|
| 0.5 → 1 | 1 |
| 1 → 2 | 1 |
| 2 → 3 | 2 |
| 3 → 3.5 (plateau) | 2 |
| **0.99 → 3 (one day)** | **1** |
| 0.5 → 3.5 | 3 |

| Base-2 zone | days |
|---|---|
| 0.5 → 1 | 1 |
| 1 → 2 | 2 |
| **2 → 3** | **never (stalls at ~2.7)** |

Hold cost, pips needed of pips made, peace / at war (base 2): 2.7: 4/4 / 6/4 · 2.95: 5/4 / 6/4 · 3.1: 5/5 / 7/5.

**Why.** `M.N.GAIN = [1.0, 0.6, 0.35, 0.3]` is indexed by the level the zone *starts* the day on and applied to
the whole day's pips (`meta.js:266,286`). A base-3 zone at level 0 makes 3 pips × 1.0 = 3.0 control against 0.8
decay. The designed route (hold at 2, then "all 5 pips, 2 days" over the wall) is strictly worse than letting the
zone sink to 0.99 and buying the whole climb at the level-0 price. Base-2 zones (Lantern Row, Maple Heights,
Juniper Hills, the Ranch) make 4 pips at level 2: 4 × 0.35 = 1.4, which equals decay at about 2.7, so they can only
cross to level 3 on a mission's control reward or a $12,000 festival. Four of eight zones therefore cannot be
"pacified" by the board alone, and `docs/meta.md`'s climb table only describes base-3 zones.

**Suggested fix.** Integrate the gain across the levels crossed in a day (or cap one day's gain at, say, 1.0), and
either give base-2 zones a gain curve that lets 4 pips beat the wall or document that they need a mission.

### F-06 · Research overflow is wasted (Low, VERIFIED)

`M.feedResearch` (`meta.js:491`) splits the day evenly and does not carry a finished project's surplus to the
others: 20 RP into two projects needing 1 and 30 leaves the second at 20, not 11. With intel paying up to 12 RP a
day this is a few points per finish, but it also makes "run production under one other project" (the doc's advice)
cost more than it says.

### F-07 · Persuade reward repriced after the days away (Low, VERIFIED)

`M.settle` calls `M.reward` twice (`meta.js:901`, `:993`); the control reward for persuade and crackdown depends on
the zone's level, which has moved during the 3–8 days away. The briefing showed +0.5; the formula paid +0.6 (the
zone had fallen). Harmless in direction here, but the debrief line can disagree with the briefing.

### F-08 · The dossier forecast extrapolates a straight line (Low, VERIFIED)

`meta-checks.js` `forecast-accuracy`: 13 of 134 forecasts were off by more than a day; worst, the Towers at 2.9
with 3 pips: "Level 1 in 2 days", never reached (decay drops below the pips once the zone is off the wall and it
settles near 2.3). The forecast is the headline line of every dossier and the "Zones slipping" list uses it.

### F-09 · Docs: coasting (Low, VERIFIED)

`control-dynamics.js`: a full plateau base-3 zone with 0 pips on control reads 3.55, 3.06, 1.59, 0.64, lost.
`docs/meta.md` says "makes 9 a day for 3 days, then goes off the cliff and lands at level 1" and, with 1 pip,
"landing at level 2"; measured, 1 pip ends at 0.65 after 12 days. 2 pips hold 3.95 indefinitely. The Help text
("holds itself for a while") is fine.

### F-10 · No fail state (design, VERIFIED)

`meta-checks.js` `squad-wipe-free-recruit`, `broke-money-job-guarantee`; `tools/review/out/reports.txt`.
All 72 bot campaigns (baseline, raw, eager, turtle, mind control, 5 idle days a mission) were won, in 89 to 112
missions. With all four Watchers dead Casey sends a free recruit; with cash under $55,000 a T2 job is always on the
board; there is no clock. A player can therefore never lose, only bleed. The author asked for "a challenge, but
winnable"; this is winnable but the challenge has no teeth below "lose a Watcher". See the balance section.

### F-11 · Persuade missions carry an "Eliminate <subject>" objective (High, VERIFIED)

**Evidence.** Browser, campaign day 1, "Persuade in Maple Heights" (Pounceton College, T1). The HUD's objective
list reads: *Talk Biscuit Bramble round, and walk them out · Eliminate Biscuit Bramble · Bonus: …*. The debrief
of the won mission shows *✓ Eliminate Biscuit Bramble* beside *✓ Talk Biscuit Bramble round*. The briefing for the
same mission says "Nobody dies for this one" and "Not to be harmed".

**Why.** `W.populateMission` (`kit.js:629-638`) adds the persuade objective, then runs an `if … else if … else`
chain whose first branch is "subject but no Purrsuader". With a Purrsuader in the squad that branch is false,
every `else if` (terminal, stash, siege, sweep) is false too, and the final `else` adds
`{ type: "kill", unit: target, text: "Eliminate …" }` with `target === null`. It is marked done on any win by
`World.end`. The kill check in `checkMission` never dereferences `o.unit` for a persuade (it returns early while a
subject exists), so there is no crash, only a contradictory objective. `tools/sim.js --district` runs never see it
because the bot does not read objectives.

**Fix.** Make the chain exclusive: `if (world.subjectUnit) { … } else if (terminal && safe) … else { kill }`.
One-line restructure; see commit.

### F-12 · Shift+number does not add to the selection (Medium, VERIFIED)

**Evidence.** Browser, in a mission, synthetic `keydown` events as a US layout produces them: with LYNX selected,
Shift+2 (`key: "@", code: "Digit2", shiftKey: true`) leaves the selection `[LYNX]`; plain 3 selects SPHYNX;
Shift+1 (`key: "!"`) leaves `[SPHYNX]`. The Help table says "Shift adds or drops one".

**Why.** `main.js:823` lowercases `ev.key`; `:860` tests `k >= "1" && k <= "4"`. With Shift held, every common
layout reports a symbol, not a digit, so the branch is skipped; `:870` then explicitly returns on `Digit1` + Shift.
Shift-click on a card (`hud.js:164`) and Shift+drag work, so the keyboard path is the only broken one.

**Fix.** Test `ev.code` (`Digit1`–`Digit4`) for the number keys, as `:870` already half-does.

### F-13 · Reloading mid-mission is a free retry (Medium, exploit, VERIFIED)

**Evidence.** Browser: in a mission, kill two Watchers (`__PW.world.kill`), reload the page, resume the campaign:
roster 4, fallen none, the same 6 offers, day 1. The mission can be briefed again on the same seed.

**Why.** `W.M.save` runs after `W.M.settle` in `toDebrief` (`main.js:990-995`) and after every command-screen
change, never at mission start. An abort costs 0.3 control and a failed mission; a reload costs nothing. For a game
whose premise is "the dead stay dead" this is the one lever that makes every death optional.

**Fix options.** Mark the offer as `started` and save at `beginMission`; on resume, settle a started offer as lost
(or as "aborted") before showing the command screen. Or save the mission's seed and plan and refuse to re-brief a
started offer.

### F-14 · The camera scrolls away at mission start (Medium, VERIFIED)

**Evidence.** Browser, deterministic: rest the pointer over the map area of the command screen, press B then
Enter. Five seconds into the mission the camera is at `(657, -80)` and still moving, from the correct start
`(3258, 1857)`; the screen is black (the map's empty corner). `W.game.ui` reads `{ x: 0, y: 0, mouseIn: true }`.
With the pointer outside the view the camera stays put.

**Why.** `ui.x/ui.y` are initialised to 0 (`main.js:12`) and only set by `pointermove`; `pointerenter`
(`main.js:765`) sets `mouseIn` without coordinates. Chrome fires `pointerenter` when the view appears under a
resting pointer but no `pointermove`, so `scroll()` (`:428-432`) sees the pointer "at the top-left edge" and
scrolls up-left at 520 px/s until the clamp. "Begin mission" sits over the map area, so a player who clicks it and
then reaches for the keyboard sees exactly this.

**Fix.** Set `ui.x/ui.y` from the `pointerenter` event, and ignore edge scrolling until the first `pointermove`
of a mission.

### F-15 · The grade's time term (Low, VERIFIED)

`main.js:972`: `pts = 100 - lost*18 - max(0, civ-2)*4 + bonus*8 - max(0, time-240)/12`. A flawless run with no
bonuses grades A up to 300 s, B at 420 s, C at 600–780 s, D at 900 s (`tools/review/engine-checks.js`
`grade-by-time`). District missions are a long walk in (a third to three quarters of a 224-tile map) and a second
long walk out; the bots do them in 60–110 s only because they never stop. A careful human run is 5–10 minutes.
The grade was tuned for Market Plaza.

### F-16 · "Recruit 5 followers" on every mission (Low, VERIFIED)

`kit.js:641` adds the bonus unconditionally. A squad without a Purrsuader (any squad after LYNX dies, or any kit
the player chooses) sees a bonus it cannot attempt and a ✕ on every debrief.

### F-17 · About text is stale (Low, VERIFIED)

`main.js:135`: "One district so far: more are coming." The game ships five districts and the README says so.

### F-18 · Stealth dominates; the Purrsuader way is the weak one (Medium, balance, VERIFIED)

`tools/review/out/grid-n12.txt`, 12 fights a cell (three times the shipped table), intel and assassinate at
levels 1–2, threat at the tier and one over:

| Cell | assault | stealth | snipe | mob | banhammer |
|---|---|---|---|---|---|
| assassinate L1 t3 (+1) | 9/12 won, 1.33 lost | 12/12, 0.25 | 11/12, 0.42 | 10/12, 1.08 | — |
| assassinate L2 t4 (+1) | 10/12, 1.25 | 11/12, 1.00 | 12/12, 0.67 | **6/12, 2.00** | 11/12, 0.08 |
| intel L1 t3 (+1) | 7/12, 2.42 | 12/12, 0.08 | — | 11/12, 1.08 | — |
| intel L2 t4 (+1) | 5/12, 2.50 | 12/12, 0.25 | — | 11/12, 0.50 | — |
| assassinate L1 t2 (0) | 12/12, 0.00 | 12/12, 0.00 | 12/12, 0.00 | 10/12, 0.00 | — |

Stealth (holstered, Alt-click round what the scanner shows, loud only at the mark) wins every cell with the fewest
losses; assault one step over the tier loses 1.3–2.5 of 4 Watchers; the BanHammer at $250,000 a shot is the only
thing as safe as stealth. "Mob" (talk the crowd round on the way, go in with the following) is the worst way one
step over the tier on assassinations, which cuts against the author's wish for playstyle flexibility: the
Purrsuader is the game's signature tool and it is the one the numbers punish. Cal's "watch" answer (lookouts) is the
designed brake on stealth and it does fire (40% of baseline missions), but the bot's win rate barely moves.

### F-19 · Cal's first push cannot be answered by a new squad (Low, PX, VERIFIED)

Browser, day 1: "Cal moves on The Expo in 3 days. Bank control there." The Expo starts at 0.6 and the only mission
that ends a push is "Hit Cal's crew", base threat 3 + 1 for a level-0 zone = **T4**, listed under "Can't wait" as
"beyond the squad: within reach at squad tier 4". Dialling the Expo to invest does hold it (3 pips × 1.0 beats 0.8
decay + 0.7 push), so the tutorial line is right, but a player who reads "a mission against his crew ends it" on
the same screen is shown one they cannot take for sixty missions. The push took the Expo by day 7 in the test
campaign with the dial left alone.

### F-21 · Bodyguards are out of the MK1 Purrsuader's reach (Low, VERIFIED)

Headless: with the MK1 Purrsuader (following cap 6) a bodyguard needs 6; `canPersuade` is false with 5 followers
(short) and false with 6 (the following is full, so nobody else can be talked round). With 5 followers and a
Brain MK1 it is true. Help says "bodyguards in black at 6" without the catch. The new target rule (decision 2)
exempts the mark from the cap for this reason; bodyguards could get the same exemption, or the MK1 cap could be 7.

### F-20 · The bench table is 4 fights a cell (Medium, tooling, VERIFIED)

`tools/fights.json` `measured: 2026-10-12`: every cell is `n4`. A 4-sample win rate has a 95% interval of roughly
±40 points; 1.00 means "won 4 of 4". The campaign bot's "careful" odds take the best two of four or five tactics
by that 4-sample ranking, which systematically picks lucky cells. The balance section's numbers inherit this.

## Balance analysis

### Campaign bot, six strategies (`tools/campaign.js --report`, 12 seeds each, code as shipped)

| Strategy | Won | Take Control at mission | Won at mission (day) | Lost / mission | Cash at end |
|---|---|---|---|---|---|
| baseline (careful) | 12/12 | 57 | 89 (446) | 0.22 | $694k (one at $2.0M) |
| raw (`--harsh`) | 12/12 | 57 | 97 (480) | 0.22 | $609k |
| eager | 12/12 | 57 | 89 (446) | 0.22 | $694k |
| turtle | 12/12 | 47 | 90 (445) | 0.37 | $683k |
| mind control | 12/12 | 64 | 112 (597) | 0.63 | $436k |
| 5 idle days a mission | 12/12 | 46 | 103 (1036) | 0.19 | **$4.2M (most $10.3M)** |

By threat minus tier (baseline): 0: 443 taken, 97% won, 0.15 lost · +1: 75 taken, 87% won, 0.87 lost · +2: 11,
73%, 1.91 · +3: 20, 30%, 3.45. Watchers lost at or under the tier: 0.08 against the plan's 0.15–0.3 target.

### Can it be lost? (`tools/review/reckless.js`, 12 seeds, raw odds, 200 missions)

| Player | Won | Lost / mission | Fallen a campaign | Cash at end | Zones lost at end |
|---|---|---|---|---|---|
| the shipped bot, careful about losses | 12/12 at mission 126 | 0.27 | 35 | $600k | 0.0 |
| a Watcher worth nothing to it (takes whatever pays most) | **0/12** | 1.34 | **268** | $100k | 2.5 |
| the same, and never opens the Lab | **0/12** | 0.08 | 17 | $1.5M | **6.3 of 8** |

So the challenge is real: a player who takes missions by pay alone buries 268 Watchers in 200 missions and never
wins; one who never researches watches six zones fall to Cal while sitting on $1.5M. What is missing is an
*ending*: neither of those campaigns stops. Free recruits arrive, a T2 money job is always on the board, and the
siege to take anything back is T4 against a tier-1 squad. The careless player grinds in a hole rather than losing.
(F-10.)

### Observations

- **Waiting is the strongest play.** Five idle days a mission takes Take Control from mission 57 to 46 and ends with
  six times the cash. `docs/meta.md` "Decided 1" accepts this; it also means the city out-earns anything a mission
  pays once a few zones are at level 3 ($9,000 a day a base-3 zone, F-05 table), so missions become optional
  once the squad is tier 3. For "no grind" this cuts both ways: no grind is forced, but the fastest route to a safe
  campaign is to press W.
- **The "stretch" word undersells the cliff.** `command.js:472` calls threat = tier+1 "a stretch". The bench
  (12-fight grid, F-18) says a stretch costs 1.0–1.3 Watchers a mission by assault and 0.25–1.0 by stealth; two
  over costs 2–3.3. Help text: "One over is a stretch. Further is beyond the squad: expect to lose Watchers." One
  over is where the losses start.
- **Sweep is a dead option for the bot** (under 5% in 5 of 6 strategies) and crackdown in the raw run. The bot
  values a sweep at three side jobs; a human might like it more (it is the one job with a choice of how much to do).
- **The bot's numbers are sensitive to the board, not only the rules.** Rerunning the baseline after the stale-offer
  fix alone (`tools/review/out/report-pretax.txt`) moved Watchers lost a mission from 0.22 to 0.36 and the +3-gap
  missions taken from 20 to 44; after the tax fix (`reports-after-fixes.txt`) 0.59 and 146. The rules did not get
  deadlier: the bot values a story step at $500k–$3M against a Watcher at $60k–$800k, so whenever a lockdown
  becomes runnable it storms it at any tier, and the tax fix makes zones reach the lockdown's 2.5 sooner at war.
  A human waits. Treat `--report`'s death rate as a lower bound on the rules and an upper bound on the bot's
  judgement, and give the bot a risk cap before using it to tune again.

### Control model (`tools/review/out/control-dynamics.txt`)

See F-05. Also: Cal's push with 6 zones pacified is 1.30 a day; a base-2 zone at 3.7 with every pip on control
falls 3.29 → 1.09 in four days, while one at 1.5 falls to 0.7 and holds (level-0 gain 1.0 again). At war a base-3
zone at 3.0 under a push oscillates between 1.5 and 2.1 with every pip on control. A full plateau zone needs 2 of
its 6 pips to hold, 0 pips loses it in 5 days.

### Research and money pacing

With every zone at level 2 and half the city's pips on research the city makes 10 RP a day: MK1 in 3 days, MK2 8,
MK3 14, BanHammer 16, propaganda 40, mind control 70, zone works 38, requisition 58. The whole weapon/mod/gear tree
is 3,640 RP and $738,000 to start; the 30 points for Take Control are 48% of its 62. A Watcher at MK3 in everything
costs $835,000; four of them $3.34M plus a $380,000 scanner. The bot reaches tier 4 by mission 61 with ~$500k
banked, so the money sink works; the research sink is mostly spent before Take Control. Mission pay: a job at
threat 2 pays the dearest purchase open to you (×1), a T5 job ×3; a calm persuade or intel pays $5,000–$10,000.
A base-3 zone at level 3 makes $9,000 a day on money alone, so by mid-game one zone out-earns a T2 job every two
days without anyone leaving the clinic.

### Mission engine (`tools/fights.json`, `tools/review/out/grid-n12.txt`, `engine-checks.js`)

- At the squad's own tier every kind is won 93–100% with 0–0.25 Watchers lost, whatever the way in. The danger
  lives entirely in the threat-minus-tier gap; the kinds themselves are close in difficulty (sieges a little harder,
  persuades a little easier at the top).
- Stealth is the best way in everywhere measured (F-18); assault one over the tier loses 1.3–2.5 of 4.
- A siege fields 16–19 defenders at T4–5, all reachable on foot; no degenerate setups in 1,050 generated missions
  (sweeps always have contracts, sieges defenders, crackdowns an operation, persuades a subject, every mission a
  pickup at least 24 tiles from the drop).
- The Longwhisker's surprise shot killed an unaware T3 target in 26 of 40 tries at ~10 tiles (65%; the gun's
  accuracy after range fall-off predicts about 58%, so the one-shot rule adds little that a second shot would not),
  and every one of the 40 raised the mark's alarm through the bodyguards within 3 tiles. "Whoever a silenced round
  kills raises no alarm" holds for a lone lookout, never for a guarded target.
- Field loot upgrades in place: a Watcher who went out with an Uzi MK1 and walked over an Uzi MK3 comes home
  carrying the MK3, research or no research (`giveWeapon` merges marks). Consistent with the harvesting design, but
  it means a T4 crackdown hands out MK3 guns the Lab has not reached; worth knowing when reading the tier curve.
- A dead Watcher drops their guns (a Laser MK3 drops; the BanHammer and medikits do not), so a wiped squad's kit is
  recoverable by the survivors, and a lost mission's loot is gone with the squad.

## Player experience

Desktop, 1280×860 and 1024 wide, Chrome. Mobile not reviewed, by the author's rule.

**Onboarding.** The command screen is dense but reads: the NEXT MOVE panel, the B key, the "within reach / a
stretch / beyond the squad" words, HOLD on the dial and the Joyeuse log lines carry a newcomer through day 1
without the Syndicate reference. Two snags: the day-1 board lists three T4 "Can't wait" jobs a tier-1 squad cannot
touch (F-19), and the first push takes a zone by day 7 unless the player reads the dispatch and dials the Expo up;
losing a zone in the first week with the only counter-mission three tiers away is a hard welcome. The IDLE badge and
the "research points wasted" line are good; the Lab has no "recommended first project".

**In the field.** The briefing's plan (drop-off and getaway choices with armed-group counts) is the best screen in
the game. The mission start is fine once F-14 is fixed; before it, a keyboard-driven start could open on a black
corner. The objectives list is clear except for F-11 and F-16. The scanner, V view, hover labels and cursor modes
read well. The HUD's stim bars are small at 1024 wide. Edge scrolling plus a 14 px band is easy to trigger from the
HUD edge. Alt-click's quiet route is the single most important control and lives only in the hint line and Help.

**Pacing.** Missions are 60–110 s for the bots and several minutes for a person; the district maps make every job
a long walk in and out, which is the design, but the grade penalises it (F-15). Between missions the loop is
tight. The endgame (Take Control) is where the bot's deaths cluster and where a human's patience is tested by
lockdown steps that sit on the board "beyond the squad" for a long time.

**Feedback and clarity.** The debrief's payslip and the dispatch do the work. Three places say less than they could:
the forecast line on the dossier (F-08), the "a stretch" risk word (balance observations), and the abort dialog
("counts as a failed mission") not saying the days still pass.

**Accessibility (desktop scope).** Pause works (Space, and the menu pauses). Controls are not remappable; the left
hand's cluster (E/C/R/F/Q/X/Z/V) is sensible for QWERTY. Keyboard reaches every command-screen control; the
Armoury's drag has a keyboard path (Enter/Delete). Text at 1024 wide is small in the HUD and the ops list but not
below 11 px. Colour carries risk (T-dots orange/red) alongside the words, so it is not colour-only.

**Replayability.** Eight zones, five districts, generated missions on seeds, Cal's habit-reading and the plan
choices give variety; the dominant stealth line (F-18) and the wait-and-bank economy are the two things that make a
second campaign feel like the first.

## Code health (secondary)

The structure is sound for the size: one `W` namespace, plain data tables for every tunable (`M.N`, `M.COST`,
`M.PRICE`, `W.FOE`, `W.KINDS`, `W.ENCOUNTERS`), the campaign with no DOM, the engine headless-loadable, and real
tools. Things that will hurt:

- **`M.settle` (meta.js:895–1016) does everything**: rewards, loot, promotions, the days away, side-job control,
  habits, zone loss. Two review fixes touched it. Splitting it into reward / roster / days / aftermath would let
  each be unit-tested; today `tools/campaign.js`'s invariant checks are the only net.
- **Two sources of truth for a zone's policy.** `policy {r,m,c}` plus `s.balance` plus, after F-04, `z.tax`.
  Storing tax and balance only and deriving the pips would remove `fitPolicy`/`spread`'s reconciliation.
- **No rule-level tests.** Everything the review found in `meta.js` was found with 30-line scripts
  (`tools/review/meta-checks.js`); none of it is covered by `validate` in CI. Those checks could run there.
- **`tools/fights.json` goes stale silently.** It records the commit it was measured at (`commit`), but nothing
  compares that to HEAD; after an engine change the campaign report quietly uses old fights. Four fights a cell
  (F-20) also makes the table noisy. `tools/metasim.js` is already stale by its own docstring.
- **`docs/` lag the code** (F-09; `docs/missions.md` still says "the engine side is still to build"; About says one
  district). The author expects this; worth a pass before release.
- **Dead code:** `M.cyclePip` (meta.js:308) has no caller.
- **Magic numbers outside the tables:** the failed-mission penalty 0.3 (meta.js:936), retake 0.6 and amnesty 0.5,
  the 99-day "never expires" sentinel, the grade thresholds (main.js:972–973), `W.SUSPICION`'s 0.23/0.12 step
  constants (units.js:769).
- **The keyboard handler** (main.js:821–902) is one 80-line function across five modes; a per-mode map would
  make F-12-style slips rarer.

## Improvement suggestions, by impact over effort

1. **Give the campaign an ending** (high impact, low effort). Stop the free recruit at three wipes, or make the
   last recruit's death with no cash for another a loss; and/or lose when Cal holds every zone but the Towers.
   The reckless simulation shows players who deserve to lose currently grind instead. (F-10)
2. **Save at mission start and settle a started offer as failed on reload** (high, low). Closes the only way round
   "the dead stay dead". (F-13)
3. **Price control gain by the level crossed, not the level the day starts on** (high, low): integrate `GAIN`
   across the day or cap a day's gain at 1.0; and give base-2 zones a way over the wall by production. (F-05)
4. **Say what "a stretch" costs** (medium, trivial): "a stretch: expect to lose one" and keep "beyond the squad"
   for +2. (balance observations)
5. **Make the Purrsuader way viable one over the tier** (medium, medium): followers that carry picked-up guns are
   good, but a following of 6 unarmed civilians is cannon fodder; let the MK2/MK3 following start armed, or count
   a full following as squad power the way a hired crew does. (F-18)
6. **Shorten the first week** (medium, low): start the Expo and Starport at 1.2 rather than 0.6, or hold Cal's
   first push until day 10, so a new player is not shown a lost zone and a T4 counter before their third mission.
   (F-19)
7. **Grade by distance, not time** (low, trivial): start the time term at the mission's walk length / 2.5 tiles
   a second rather than 240 s. (F-15)
8. **Only offer the follower bonus when a Purrsuader is in the squad** (low, trivial). (F-16)
9. **Carry research overflow to the next project** (low, trivial). (F-06)
10. **Compute the forecast by stepping the real decay** (low, low): run `dayDelta` forward 30 days instead of
    dividing by today's rate. (F-08)
11. **Run the review's meta checks in CI** (medium, low): `node tools/review/meta-checks.js` fails loudly when
    a VERIFIED line reappears; add it to `validate`.

Bolder, optional:

- **Cal as a board opponent, not a decay term.** His push is a number today. Give him a visible agent (a lieutenant
  with a name per zone) whose assassination ends the push at any tier, so the early game has a counter the squad
  can take.
- **A clock, opt-in.** "Casey's patience": a hard campaign mode where Take Control must come by day N, since the
  author wants challenge and the wait-and-bank line is the safe play.
- **Make the city's income depend on the squad.** Tie a zone's money yield to the last mission run there (a
  freshness bonus that decays), so missions stay worth leaving the clinic for after tier 3.

## What changed

Branch `review/2026-10-12`, one commit per fix, each revertible on its own:

| Commit | Finding | File | Change |
|---|---|---|---|
| `02c8ddf` | F-11 | `js/districts/kit.js` | The objective chain is exclusive: no "Eliminate" on a persuade |
| `16d8663` | F-12 | `js/main.js` | Number keys read `ev.code`, so Shift+1–4 adds to the selection |
| `53b1815` | F-01/02/03 | `js/campaign/meta.js` | Offers follow their zone's lost/back state; amnesty drops its siege; `canRun` and the retake reward check it |
| `d6b5186` | F-14 | `js/main.js` | `pointerenter` records the pointer's place before edge scrolling can read it |
| `43aeaf4` | F-04 | `js/campaign/meta.js` | A zone keeps its tax across level changes (**rules change**: zones climb as dialled) |
| `912f9bd` | decision 2 | `js/core/weapons.js`, `units.js`, `world.js`, `main.js`, README, `docs/missions.md` | The mark of a hit can be persuaded (6; 3 with the II; cap-exempt); talked round, the kill objective is done and the squad exfils |
| `2b24503` | F-10 / decision 5 | `js/campaign/meta.js`, `js/ui/command.js`, `js/main.js`, `tools/campaign.js`, `docs/meta.md` | Every zone lost ends the campaign: `s.lost`, every offer refused, red banner, next-move panel, Casey's line, the title's resume entry, the bot stops |
| `fb5cd59` | — | `tools/review/` | Checks for both rules (`persuade-the-target`, `city-lost-ending`) |
| `7a5a6f1` | decision 5 | `js/campaign/meta.js`, `js/ui/command.js`, `js/main.js`, `docs/meta.md` | The stronghold: only the Towers held is a retreat with its own banner, panel and line, not the end |
| `1b1b9aa` | — | `tools/review/` | The `stronghold-retreat` check |

Verified after each: `node --check`, `tools/review/meta-checks.js` (the three stale-offer checks and both tax
checks read CLEAR), `node tools/campaign.js 200 --seed=1` (won at mission 97 → 112 with the tax change),
`node tools/sim.js 2 --quiet --district=suburbs`, and in the browser: Shift+2/3 builds `[LYNX, MANX, SPHYNX]`,
an intel mission's objectives carry no "Eliminate", the camera stays on the squad at mission start.

Not changed: F-05 (by design), F-13 (reload is a free retry), F-15/F-16 (grade and bonus), F-18 (stealth),
F-20 (bench sample size), F-21 (bodyguard cap).

**On the ending.** Cal never pushes the Towers (`M.planCal` leaves Benton's seat out), so the full loss needs the
player to let the Towers go too (taxed to nothing, or decay at war). The author's answer is the stronghold
(`7a5a6f1`): with only the Towers held, a red CASEY BENTON HAS RETREATED banner once, a panel on the City screen
saying how to rebuild, her line in the Office, "in the stronghold" on the title's resume entry, and a debrief line
if it happened while the squad was out. The Towers keep paying (6 pips at level 3) and the sieges stay open; the
flag lifts when any other zone is held again. Verified headless (`stronghold-retreat`: set, lifted by an amnesty,
then `s.lost` when the Towers go too) and in the browser.

## Final re-verification pass

Run on the branch's head (`tools/review/out/final-pass.txt`):

- The CI `validate` steps (`check-assets`, `node --check` on every script, `sim.js 3`, `sim.js 2 --district=ranch`,
  `campaign.js 200 --seed=1`): all green.
- `meta-checks.js`: the three stale-offer checks (F-01/02/03) and both tax checks (F-04) read CLEAR after the
  fixes; the level-0 jump (F-05), research overflow (F-06), repriced reward (F-07) and free recruit (F-10) still
  read VERIFIED, as they are unfixed by design. The money-job check first read CLEAR on the final pass because the
  test let the city's cash accumulate past the $55,000 trigger; it now zeroes cash daily and reads VERIFIED again.
- `engine-checks.js`: no degenerate setups in 1,050 missions; loot-mark upgrade still VERIFIED (design note).
- Browser, after the fixes: Shift+2/3 adds Watchers; an intel mission lists no "Eliminate"; the camera stays on the
  squad at mission start; a forced-win persuade debrief, the abort flow, the Lab, the Office (festival), Until…,
  the Map Room, a fly-over and a skirmish with a fight all ran with no console errors.
- Re-checked the two High findings: F-01 by script (CLEAR after `53b1815`); F-11 by building a persuade mission
  headless (objectives carry no "Eliminate") and in the browser.

Dropped from the report after re-verification: a suspected "bench runs every kind as an assassination" tooling bug
(my shell passed the flags as one argument; the tool is fine) and a suspected sweep softlock with no contracts
(1,050 generated missions, none).

## Second pass (2026-10-13), after the author's decisions

- `persuade-the-target` (engine-checks): the mark needs 6, cannot be persuaded with none, can with six shoppers;
  the kill objective reads done, the phase is exfil, walking out wins with "The Alley Duchess is with you, and the
  squad is out." and the target alive. `sim.js 2 --quiet` still 2/2. Browser, Market Plaza: with six shoppers
  talked round the hover label on Vesper Sly reads "Persuade", `canPersuade` is true at a following of 7 over a cap
  of 6, and the debrief reads "Mission complete: Vesper Sly is with you, and the squad is out." with ✓ Eliminate
  Vesper Sly. (His own crew shot him once the squad was gone; the result stands either way.)
- `city-lost-ending` (meta-checks): all eight zones lost → `s.lost` true, a siege on the board refused with
  "the city is lost: the campaign is over". Browser: Wait a day shows the red PUMACITY IS LOST banner, the next-move
  panel says how to leave, the title's resume entry reads "the city is lost".
- CI validate steps green; `campaign.js 200 --seed=1` won at mission 112; `reckless.js 4` unchanged (0 of 4 for
  the reckless bots, none of them lost the Towers).

## Where to pick up

- Decide F-10 (an ending), F-13 (reload), F-05 (gain pricing) and F-18 (stealth / the Purrsuader): these are the
  design calls; everything else is small.
- `43aeaf4` (the tax dial) is the one commit that changes rules; cherry-pick the others freely.
- The campaign bot needs a risk cap before `--report` is used to re-tune (see Balance → Observations), and
  `tools/fights.json` should be regenerated at 12+ fights a cell.
- Not reviewed: `js/core/render.js`, `js/core/sprites.js`, `js/ui/citymap.js`, `js/ui/art.js`, `js/ui/pixfont.js`
  and `js/core/audio.js` beyond a skim for crash paths; the Armoury's drag-and-drop by mouse (keyboard path tested);
  saves older than `v2`.
- Local only, not committed: `.claude/launch.json` in the main checkout points the Browser pane's dev server at this
  worktree on port 8766 (`python3 tools/serve.py 8766`); delete it when the worktree goes.

## Design pass (2026-10-13), from `/critique`

The critique of the command screens scored 28/40 (Good) with three P1s: the mission list had no height at the
1024 floor, day 1 led with three missions the squad could not take, and the first viewport failed five of the
eight cognitive-load checks. The author chose density first, a Today panel, and every other issue. Seven commits,
one a step:

| Commit | Step | What changed |
|---|---|---|
| `f4aab05` | /distill | Cal, Zones slipping and the dispatch fold into one **Today** panel, a line each, opened on click (a wait opens the dispatch itself); the list's mission card is two lines; the legend strip goes, its meanings on the zone buttons' tooltips and the map's aria-label |
| `b956521` | /adapt | Under 1180px the right-hand side is one scrolling stack (next move or dossier, Today, missions), so the list exists at 1024×700; a dossier opens at its top |
| `785b88c` | /arrange | Every list sorted by reach (within reach, a stretch, beyond), zones by their best mission; the beyond-the-squad ones fold into one counted line per list with Show them; the City badge, map chips and zone readings count missions within reach (`M.inReach`); the zone filter heads the list |
| `6bea2c1` | /normalize | The Lab's tree is purchase rows (name, what it does, mark chips, the next mark's price button, the reason once); the Armoury's dealer rows get Buy, the racks Give, the card the moves open to what is picked |
| `18b1c44` | /clarify | Help is a section a screen, the open one first; "0/30 points"; "Kept for control" in pips; days left only at four or fewer; the tier glossed |
| `5389d5c` | /harden | U opens Until; a pause on the PVN ticker; the stronghold and lost panels framed red; checked that W works with a dial focused and the map Tabs north to south |
| `90ad744` | /polish | The Office splits evenly; Lab rows keep three cells; the card's second line wraps; new text at 5:1 or better |

Checked after: the CI validate steps, `tools/review/meta-checks.js` (unchanged results), no console errors on any
screen at 1440×900 and 1024×700. Re-run `/critique` to re-score.
