---
target: command screens UI (less blocky)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:js/ui/command.js"
target_fingerprint: "sha256:0d5a851520644ae35d7511603d222b4da4ef97d9ae0e24a5802c505e36b15cf3"
target_path: "js/ui/command.js"
timestamp: 2026-10-14T01-51-06Z
slug: js-ui-command-js
---
Method: dual-agent (A: design review · B: detector + browser). User steer: "It doesn't need to be as blocky as it is."

## Design Health Score: 28/40 (Good)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Dispatch squeezed to ~3 lines; missions column 0px below 1180px |
| 2 | Match System / Real World | 3 | pips, HOLD, milk, T3, L2 ▲13D assume knowledge |
| 3 | User Control and Freedom | 3 | Wait a day irreversible |
| 4 | Consistency and Standards | 2 | Two heading systems; duplicate Brief; sunk draggables; disabled plates look live |
| 5 | Error Prevention | 3 | Idle Lab wastes research silently |
| 6 | Recognition Rather Than Recall | 3 | Map tag codes learned from key |
| 7 | Flexibility and Efficiency | 3 | No Lab keyboard path, no Until key |
| 8 | Aesthetic and Minimalist Design | 2 | Box-on-box, duplicates, redundant chips |
| 9 | Error Recovery | 3 | Nothing recovers a wasted day |
| 10 | Help and Documentation | 3 | Help is a 13px wall over missions |

## Design Specificity Verdict
Authored for the product in its signature pieces (satellite map, LCDs, pixel face, Office). Everything else repeats one unit: bevelled plate + pixel heading + hint + list of more plates. Reads as tile dashboard with 1993 trim, not 1993 chrome. Detector: marquee (ticker, command.css:461, deliberate; check reduced-motion); dark-glow x2 false positive (mission CSS watchers.css:28); repeating-stripes advisory false positive (legend/gauge hatch). Metrics: Armoury 70 elements with >=2px borders; Clinic 3-deep large box nesting.

## Blockiness root cause
DESIGN.md "Do bevel every surface" + face2/face 1.14:1, divider 1.29:1 (tone can't separate), --hi edge 2.29:1 loudest non-text line.

## Priority Issues
- [P0] City missions column 0px below 1180px (confirmed 1024x768, rows "551px 0px"; command.css:484-492). Fix: cap .cx-mid, ops minmax(240px,1fr) or own row + scroll. /impeccable layout
- [P1] Bevel-everything + flat tonal steps. Tiers: chassis / controls / wells / flat content. Unplate .offer (reuse open variant css:243-245, orange left rule for rec), .dial, .slot, .roster li, .watch buttons, .tally, empty .tile. face2 ~#1c2230, divider ~1.8:1, dim inner --hi. Rewrite DESIGN.md rule. /impeccable distill then quieter
- [P1] Lab 51 identical boxes; locked unboxed, cross-line prereqs only, done = cyan text, collapse locked lines. /impeccable distill
- [P2] City duplicates: best mission twice w/ two orange Brief; merge CAL + ZONES SLIPPING; dispatch 5-6 lines min. /impeccable layout
- [P2] Two heading systems; kbd boxes + 50px tabs. /impeccable typeset
- [P3] Disabled plates look live; price as text + .why. /impeccable polish

## Persona Red Flags
Alex: Lab tabbing ~50 cells; no Until key / zone hotkeys. Sam: 9px tile numerals, 11px captions; hidden missions in tab order at 1024. Veteran: tiled density, Lab not Syndicate research list. Visitor: codes on map, LOST on day 1, beyond-the-squad Brief looks safe.

## Minor
Sunk draggable tiles; empty RACKS/RUNNING plates; Clinic 40% empty; banner covers dossier header; orange IDLE / orange bevels on non-buttons; SQUAD chip on every card.

## Questions
One chassis with compartments? Bevel = press or read only? Absence as absence? City built to Office rules?
