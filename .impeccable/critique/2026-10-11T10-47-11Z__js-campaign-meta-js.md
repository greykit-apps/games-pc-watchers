---
target: "the campaign meta-game: play and balance"
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:C:\\Users\\shand\\Claude\\Gitlab\\greykit-app\\games\\pc-watchers\\js\\campaign\\meta.js"
target_fingerprint: "sha256:cf04cfdea49ab5c963cdb6415020f34970ef99accbd8563614490463a4f0c33a"
target_path: "C:\\Users\\shand\\Claude\\Gitlab\\greykit-app\\games\\pc-watchers\\js\\campaign\\meta.js"
timestamp: 2026-10-11T10-47-11Z
slug: js-campaign-meta-js
---
Method: dual-agent (A: game-design review · B: detector + balance measurements). Target: the campaign meta-game (js/campaign/meta.js), play and balance.

## Design Health Score (heuristics read for gameplay)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | no preview of zones while away; research raises threat invisibly |
| 2 | Match fiction/mechanics | 2 | mind control free; locked zones strengthen Cal; overseers stop Cal |
| 3 | User Control and Freedom | 3 | zone works can't be aimed |
| 4 | Consistency (rules vs field) | 1 | marks inflate tier, no field effect; Purr MK3 = MK2; Cal repeats zones |
| 5 | Error Prevention (no dead ends) | 2 | at war one Cal push demotes a zone for good |
| 6 | Recognition vs Recall | 2 | hidden threat step per 12 points; cliff thresholds |
| 7 | Flexibility (viable strategies) | 2 | four dominant moves |
| 8 | Minimalism (no busywork) | 2 | counters busywork; festival/martial never worth it; 16 offers day 1 |
| 9 | Diagnose and Recover | 2 | debrief control gain eaten by mission days |
| 10 | Help | 2 | threat scaling, war levels, intel maths unexplained |
| Total | | 21/40 | Acceptable |

## Evidence
War on schedule (mission 68 +/-8) but 0/10 baseline wins within 150 missions, 0/5 within 300. Story missions all threat 5 (6,500+ offers); tier-4 squads 0/6 story wins, 4 deaths each. Mind control + story-first wins 8/8. Real fights 0.71 deaths/mission vs rolled 0.15. Intel x parallel projects -> war by ~mission 15; intel alone never finishes a project. No late sink: $3.1M by mission 150 without deaths.

## Priority Issues
- [P0] The war can't be won: story T5 always (threat from points + war + step); L3 unreachable at war; control reward applied before mission days; locked zones count toward Cal. Fix: story T3/4/5 by step without points step (meta.js:145); reward after days (:634 -> after :685); exclude locked from Cal count (:213).
- [P0] Tier/threat not tied to the field: marks count in agentPower (:166) but engine ignores mk (units.js:829); Purr MK3 -> purr2 (:567); threat from research points; rolled deaths 5x too low. Fix: engine applies mk; drop mark multiplier meanwhile; threat from fielded squad power; recalibrate TIERS on real fights.
- [P1] Intel research reward halves every running project (:628): stacking exploit and Zeno never-finish. Fix: first project only, capped 12 x days, finishes when little left.
- [P1] Mind control dominant and free (floor clamps decay :220); overseers counter Cal (:377); Cal scaling saturates; same zone twice (:306); first push hidden. Fix: clamp result; yield cost; overseers vs natural decay only; Cal scales with fielded squad; fix planCal; reveal first push.
- [P2] No late money sink; tree runs out (~2,600 RP wasted); festival/martial mispriced; Hired guns missing. Fix: hired guns, aimable/repeatable works, BanHammer for sieges/lockdowns, reprice events.

## Persona Red Flags
Alex: parallel research + intel to war by ~mission 15; Gauss beeline to tier 4; dodges threat steps. Jordan: loses Lantern Row to an unannounced push; debrief control vanishes; research silently hardens missions. Syndicate veteran: marks do nothing in the field; no veterancy; persuasion never recruits. Turtle: plateau + overseers + city research makes Cal irrelevant; nothing to buy; mind control trivialises war.

## Minor Observations
Level-3 control rewards land in capped zones; tactics busywork; amnesty 150-day payback; doc/code drift (scanner prices, hired guns, intel horizon, overseers vs Cal, Towers never targeted, story chain shape, 100-mission length); wipe brings war ~8 missions sooner.

## Questions
Research only from the field? Cal scaling with fielded squad, lockdowns weakening him? What does Casey lose when a zone stops wanting anything?
