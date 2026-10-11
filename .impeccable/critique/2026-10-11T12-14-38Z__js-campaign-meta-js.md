---
target: the campaign meta-game after the balance pass
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\shand\\Claude\\Gitlab\\greykit-app\\games\\pc-watchers\\js\\campaign\\meta.js"
target_fingerprint: "sha256:b7d38f375cf1d934e29f69c9eb0d6c32acb1e3cb04ffaecb26d74eae7a72beb9"
target_path: "C:\\Users\\shand\\Claude\\Gitlab\\greykit-app\\games\\pc-watchers\\js\\campaign\\meta.js"
timestamp: 2026-10-11T12-14-38Z
slug: js-campaign-meta-js
---
Method: dual-agent (A: game-design review · B: detector + 32-seed re-measurement). Target: the campaign meta-game after commit 54fa1ca.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility | 3 | squad power and threat step never shown |
| 2 | Fiction/mechanics | 3 | lieutenants easiest at war; Cal not stronger at war |
| 3 | Control/freedom | 3 | war fires automatically; intel can't be aimed |
| 4 | Board vs field | 2 | hired/BanHammer/mind/marks not read by the engine yet (engine work pending merge) |
| 5 | No dead ends | 2 | war with a weak economy is an inescapable trap |
| 6 | Recognition | 2 | threat frozen at offer, tier at launch; step invisible |
| 7 | Viable strategies | 2 | research slowly + pacify first dominates (32/32) |
| 8 | No busywork | 2 | weapon MK2/3 dead; overseers worthless; festival overpriced |
| 9 | Recover | 3 | early wipe recovers in 4 missions; amnesty too easy |
| 10 | Help | 2 | threat step unexplained; doc drift |
| Total | | 24/40 | Acceptable (was 21) |

## Evidence
Research split decides the campaign: 0.3-0.4 wins 32/32, 0.5 18/32, 0.6 7/32, 0.7 1/32. Losers sit at war at tier 1.3 on $4.5k/day. Prepared war 29 +/-2 missions vs floor 24. Cal pressure 1.41 -> 0.48 as zones lock. Mind control now dominated (longer war). Intel stacking day 168-224 (was 66). Real deaths 2-3x the rolled model. BanHammer bought 0 of 96 runs (slots full). Money piles to $2.6M-12.5M for prepared players.

## Priority Issues
- [P0] War is automatic and can be an inescapable trap. Fix: war becomes available at 30 points and is declared by the player; locked zones produce at level 3; optional war chest.
- [P1] Prepared war is a checklist; Cal fades. Fix: story threat relative to squad (1+step+threatStep+1, cap 5); lockdown at C 2.5; no amnesty at war; Cal escalates at war and is cornered by lockdowns; last zone is Cal's last stand (T5).
- [P1] Power treadmill + sandbag exploit (threat step at spawn vs tier at launch). Fix: apply step at launch for the squad sent; widen steps to ~18/27; show it; exclude hired guns.
- [P1] Purchases without field effect; price trap. Fix: merge engine work then re-count marks; sell every researched mark; BanHammer outside the 8 slots; ask engine for BanHammer strike and Purr MK3.
- [P2] Rolled deaths 2-3x too low; late money pile; overseers/festival/requisition dead. Fix: recalibrate ROLL; overseers climb the wall daily at half price; repeatable Watcher training.

## Persona Red Flags
Alex: sandbags deployment; parks at power 19-20; turtles to tier 5 then flips to war; amnesty over siege. Jordan: mod makes missions harder; eager research -> war with pistols, loses; hired guns don't show. Veteran: gear never makes streets easier; marks/BanHammer absent in field. Turtle: 32/32 at 30-40% research, war a formality, banks millions.

## Minor Observations
Stale header/intel text/bot comment; docs war timing, scanner prices, war table, open question 2; siege threat frozen 99 days; control wasted at cap; Towers count for Cal but never targeted.

## Questions
What may the player feel strong against? Declared war? What can Cal lose besides zones?
