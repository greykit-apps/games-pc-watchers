---
target: command screens after chassis rework
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:js/ui/command.js"
target_fingerprint: "sha256:7fe6abee2471b0a1934bea96d1b9f1bd9f0c1274bd2f4aec555f0a6595ec7730"
target_path: "js/ui/command.js"
timestamp: 2026-10-14T02-21-28Z
slug: js-ui-command-js
---
Method: dual-agent (A: design review · B: detector + browser). Re-critique after the chassis rework (e164e13) and tab reorder (e318399).

## Design Health Score: 29/40 (Good)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Losses listed after gains in the dispatch; dispatch out of view at 1024 |
| 2 | Match System / Real World | 3 | pips, HOLD, milk, ▲3D, threat vs tier need Help |
| 3 | User Control and Freedom | 3 | Wait a day irreversible |
| 4 | Consistency and Standards | 3 | Five pressable styles; dealer locked marks differ from Lab |
| 5 | Error Prevention | 2 | Idle Lab wastes RP silently; beyond-squad Brief looks safe |
| 6 | Recognition Rather Than Recall | 3 | Map tag codes learned from key |
| 7 | Flexibility and Efficiency | 3 | No Until/zone keys; Lab tab-walk |
| 8 | Aesthetic and Minimalist Design | 3 | Empty compartments; Lab bronze slabs |
| 9 | Error Recovery | 3 | Nothing recovers a wasted day |
| 10 | Help and Documentation | 3 | Wall of text; covers dossier Brief |

## Design Specificity Verdict
Rework landed: one chassis cut into compartments. Content rows still generic (title/meta/sub/steel button). Detector: borders>=2px down everywhere (Armoury 70->10, Clinic 38->11, City 35->20, Lab 37->21, Office 25->16); Clinic nesting 3->2; ops at 1024 now 242px (was 0). Findings: low-contrast kbd in .go 4.1:1 (command.css:60 opacity .8) real; marquee deliberate; dark-glow x2, stripes, repeated "Brief" false positives.

## Priority Issues
- [P1] Dispatch hides bad news: .dispatch li (css:253) overrides .warn (grey "RP wasted"); losses after gains (js:990-994); 218px with dossier; out of view at 1024. Fix: li.warn orange, sort bad>warn>good, summary line, dispatch floor below 1180. /impeccable layout then clarify
- [P1] Idle Lab: Wait doesn't warn. Fix: reason under Wait or arm first press. /impeccable harden
- [P2] Beyond-squad Brief looks safe (js:486). Fix: risk in button or armed first press. /impeccable clarify
- [P2] Too-flat pressables (.og-h css:279, .watch css:242, .who css:348); missions column ~70% empty with dossier (js:460-464). Fix: resting affordance; dimmed "Elsewhere" list. /impeccable layout
- [P3] Lab bronze slabs (css:333); dealer locked dashed boxes (css:429). Fix: compact Start plate; quiet text. /impeccable distill

## Persona Red Flags
Alex: Lab key 2->5; no Until/zone keys. Sam: selected tab cyan-only (1.27:1 bg); row buttons no affordance; kbd 4.1:1. Veteran: flat screen bar feels web-app. Visitor: lost zone + T4 siege day 2; HOLD at edge; Help covers Brief.

## Minor
Groove ~1.24:1 invisible (doc overclaims); stale tab order in surface brief and DESIGN.md:176; equal mid-column headings; Office picker vs Casey's line; orange Send to reserve per row.

## Questions
Raised screen bar? Dispatch takeover after wait? Tab order by loop vs user choice (record why)? Armed brief for beyond-squad?
