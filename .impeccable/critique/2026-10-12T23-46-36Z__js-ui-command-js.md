---
target: command screens (js/ui/command.js)
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:js/ui/command.js"
target_fingerprint: "sha256:6d86beba85da906e9977e9e2f1777c2e24e86b2f69686eb844bc2c363733ef40"
target_path: js/ui/command.js
timestamp: 2026-10-12T23-46-36Z
slug: js-ui-command-js
---
Method: dual-agent (A: design review · B: detector + browser evidence). Desktop only (1440×900, 1180×760, 1024×700).

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | B mission below the fold on day 1; Until stopping early only shown via banner |
| 2 | Match System / Real World | 2 | Dial speaks four units (Tax label, $ on control, Invest/Milk, pips); "at zero the zone is lost" vs live L0 |
| 3 | User Control and Freedom | 3 | Office buys <$100k unconfirmed; research Stop loses what was paid |
| 4 | Consistency and Standards | 3 | Map's red tag ignores story missions (citymap.js:437) unlike the list (command.js:425) |
| 5 | Error Prevention | 3 | Reasons under every disabled control; armed confirms |
| 6 | Recognition Rather Than Recall | 3 | HOLD/invest/milk meaning from help |
| 7 | Flexibility and Efficiency | 3 | No Until key; W dead while a slider has focus (command.js:1053); no all-to-HOLD |
| 8 | Aesthetic and Minimalist Design | 3 | Orange on ~20 elements; best mission shown twice |
| 9 | Error Recovery | 3 | "Beyond the squad" doesn't say how to get in reach |
| 10 | Help and Documentation | 3 | Help not contextual; nothing on Clinic/Office/Armoury |
| **Total** | | **29/40** | **Good** |

## Design Specificity Verdict
Authored: satellite map as hero, tax dial, LCD ghost 8s, Joyeuse's voice. Drifts generic in the missions card list, the Lab button grid, the Office shop list; missions can't be briefed from the map.
Detector: CLI 4 findings unchanged (dark-glow ×2 watchers.css:28 mission HUD; stripes command.css:158,159,184 state; marquee command.css:446 mitigated). Browser: contrast largely passes (lowest 4.99 in A's walk) but B measured: selected-tab orange pixel label on #45536e 3.65:1; Armoury hint kbd 3.84:1 (opacity .8, regression); kit card "Squad · 3 of 8" 4.24:1; CAL heading 4.49:1.

## Priority Issues
- [P1] The mission that matters isn't in the first viewport: top Can't-wait card is a T4 trap; B target at y=804/900 (1440), 1356/700 (1024). Fix: pinned Next move card; collapse beyond-squad urgent into one row. /impeccable layout
- [P1] Dial speaks four units; "zero" vs L0. Fix: lead with effect, demote control spend, reword help. /impeccable clarify
- [P1] Repeated controls lack context in names (Lab Start ×10, Clinic Fit ×6, Send to reserve ×4); help body focus ring invisible; map tab order not geographic; Enter on label leaves focus on map. /impeccable harden
- [P2] Banners cover the dispatch; TAKE CONTROL red (command.js:824,970); Until early stop unstated. /impeccable animate
- [P2] Orange overuse; four contrast pairs under 4.5. /impeccable quieter

## Persona Red Flags
Alex: B off-screen; no Until key; W dead after dial nudge; 8 dossier visits; dealer click only selects.
Sam: duplicate names; invisible help-body focus; map tab order; banners keyboard can't hold; ticker always moving.
Syndicate veteran: research purchase grid not funding slider; drag-first equipping; LCD digits shift 4px.
Visitor: first card a T4 siege; vocabulary flood; ▲3D needs key; 1024 missions below fold, 60px split slider.

## Minor Observations
Green money line with wasted RP; ▲L1 and ▼3D together; war Zones slipping includes 22-day zones; three "Find the lieutenant"; dossier scrolls 46px at 1440 hiding the Office link; fallen chip + "4 go out" with 3; 1024 Clinic leader lines; DISPATCH Day 1 vs LCD 002; Office default makes amnesty disabled while Ranch lost; Office scene 55% width.

## Questions to Consider
B mission as a map pin? Wait the only orange until a mission is in reach? Dial speaks only money? TAKE CONTROL in Benton gold?
