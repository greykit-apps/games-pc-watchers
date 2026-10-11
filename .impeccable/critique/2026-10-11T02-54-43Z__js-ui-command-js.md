---
target: the metagame UI (command screen)
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\shand\\Claude\\Gitlab\\greykit-app\\games\\pc-watchers\\js\\ui\\command.js"
target_fingerprint: "sha256:1f4ec709609f26aa6c036480f0d56544a73f5f0642aab1a73996fbed8ddf567a"
target_path: "C:\\Users\\shand\\Claude\\Gitlab\\greykit-app\\games\\pc-watchers\\js\\ui\\command.js"
timestamp: 2026-10-11T02-54-43Z
slug: js-ui-command-js
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Wait a day redraws silently; idle-research warning only on Research tab |
| 2 | Match System / Real World | 3 | Strong voice; "Upgrades 1/30" is the war clock; rp/L0/threat undefined |
| 3 | User Control and Freedom | 1 | Autosave on every click, no undo; one-way pip ring; Esc goes straight to Title |
| 4 | Consistency and Standards | 2 | Squad/Reserve show state not action; 18 equal primary Brief buttons |
| 5 | Error Prevention | 1 | Stop research burns paid money (tooltip warning only); $60-150k one-click buys |
| 6 | Recognition Rather Than Recall | 2 | All disabled reasons in title tooltips; Events need a board zone selected |
| 7 | Flexibility and Efficiency | 2 | 1-4/W/Esc only; no zone/pip/offer keys; focus lost after every action |
| 8 | Aesthetic and Minimalist Design | 2 | 3 paragraphs + 18 flat offers; 8/10 log lines the same red alarm |
| 9 | Error Recovery | 2 | Deny sound; reasons only on hover |
| 10 | Help and Documentation | 2 | Good inline notes; no onboarding/glossary |
| Total | | 19/40 | Poor |

## Design Specificity Verdict
Authored in data, not in presentation: Syndicate-shaped model, greykit Tactical terminal look (monospace, navy, cyan, hairlines, 9-10px labels). Board is a 3x3 card grid with an empty cell, no geography. ~80% category-interchangeable against the "graphical Syndicate GUI" brief; copy carries the identity.
Detector: CLI 1 warning (dark-glow, debrief grade, watchers.css:132, off-screen) + 1 advisory (repeating-stripes, .ow-map grid, watchers.css:158/271). In page: Missions 84 (62 undersized-ui-text, 19 tiny-text, 1 first-viewport-column-overflow), Research 67, Squad 55 (2 low-contrast 3.3/4.2:1 faded roster), Events 47. False positives: .zone.cal inset glow (meaningful), grid texture, monospace.

## Priority Issues
- [P1] Board is a card grid, not a city -> canvas top-down PumaCity from district code, zones filled by control, Cal front, offer pins, zone dossier, bevelled chrome. /impeccable shape then bolder
- [P1] Missions is an undifferentiated 18-item feed (Cal hit 17th of 18 by threat sort, command.js:109) -> pin urgent, group by zone, one recommended primary, filter by selected zone, one-line squad strip. /impeccable distill
- [P1] Keyboard + legibility fail: innerHTML redraw drops focus (command.js:40); zones are divs; pips 15px colour-only (money/control 1.03:1); data at 9-10px. /impeccable audit, typeset
- [P2] Pip ring opaque and one-way (cyclePip; re-sort moves the clicked pip) -> per-zone split with +/-, presets, forecast. /impeccable clarify
- [P2] No ceremony, no guard on high-stakes moments (wait, zone loss, war, win, stop research, big buys) -> daily dispatch, banners, inline confirms, war meter. /impeccable animate, delight

## Persona Red Flags
Alex: focus reset per action; no hotkeys; Cal hit buried; Esc to Title. Sam: colour-only pips; 9-10px; zones not focusable; title-only reasons; no live region. Jordan: no first step; undefined jargon; who is Cal; 18 unranked offers; red log wall. Syndicate veteran: cards not a territory map; pips not a tax dial; table not a cryo-room figure; dev dashboard not bevelled chrome.

## Minor Observations
Empty grid cell; truncated zone names at 1280/1024; 40% empty at 1920; whole page scrolls so board leaves view; Martial law copy cut off; "+$14,000 +3.0rp" crammed; "+0.00/day 0.0rp $0" looks broken; tabs pick up aria-pressed style; log not grouped by day.

## Questions
Map from mission district code replacing cards? Running clock instead of Wait a day? Dial + presets instead of 28 pips?
