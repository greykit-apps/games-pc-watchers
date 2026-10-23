---
target: command screens (js/ui/command.js)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:js/ui/command.js"
target_fingerprint: "sha256:1ed558332e6d561523157790032d2e1584b6a47cda7d9283e9fa542b8748480b"
target_path: js/ui/command.js
timestamp: 2026-10-12T22-11-30Z
slug: js-ui-command-js
---
Method: dual-agent (A: design review · B: detector + browser evidence). Desktop only (1440×900, 1180×760, 1024×700); mobile skipped per project rule.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Dispatch flash/tags/LCD count-up work; Dispatch falls below fold with a dossier open; running research shows "72 of 72 RP · 18 days" over an empty bar (command.js:421) |
| 2 | Match System / Real World | 2 | Dense unexplained shorthand: pips, HOLD, milk, RP, T3, "counts 2", `L2 ▲3D` |
| 3 | User Control and Freedom | 3 | W advances with no undo; Office buys <$100k unconfirmed; Until menu stays open on tab-out |
| 4 | Consistency and Standards | 2 | Generic button hover/press overrides map labels; orange on non-pressable text; tab arrows assume 4 screens; title/briefing in another system |
| 5 | Error Prevention | 3 | Office zone picker defaults to The Towers (already L3) (command.js:690) |
| 6 | Recognition Rather Than Recall | 2 | Legend omits badges, ▲3D tags, dispatch tags; meanings in mouse-only title= tooltips |
| 7 | Flexibility and Efficiency | 3 | No key for Until or Brief recommended; arrows can't reach Armoury |
| 8 | Aesthetic and Minimalist Design | 3 | Cards name zone 3×; Lab is a ~45-cell wall; ticker always moving |
| 9 | Error Recovery | 3 | Amnesty on a non-lost zone reports "$70,000 short" (meta.js:853) |
| 10 | Help and Documentation | 2 | Campaign help only on title; no ? on the board |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict
Authored for this product: Syndicate's tax slider (dial), cyborg mod screen (Clinic), territory map; bevels, 0px, pixel face, LCD ghost 8s, gold ramp, Cal stripes cohere. Only half refuses card grid (mission cards, map can't brief, Lab spreadsheet). Biggest leak: title/briefing still in cyan monospace (known, out of scope).
Detector: CLI 4 findings via index.html CSS — dark-glow ×2 (watchers.css:28,40; FP, mission HUD), repeating-stripes (command.css:132-133,152; FP, encodes state), marquee (command.css:412-417; real, mitigated). Overlay (headless, 5 views, not user-visible): IDLE badge 3.4:1, inactive tab kbd 3.8:1, LOST chip, L0 chip 4.2:1. Detector-only catch: disabled buttons ~2.0:1 via global button:disabled{opacity:.45} (watchers.css:10).

## Priority Issues
- [P0] Map zone labels break on hover/press: `.cx button:hover/:active:not(:disabled)` (command.css:39-40) outrank `.cx .zb` (121-122); hover paints #46546f box, press replaces centring transform, 1 in 5 label clicks land. Fix: zb-specific hover/active overrides or margin centring. /impeccable harden
- [P1] Dispatch buried below fold with dossier open, lost after briefing (not persisted). Fix: fixed home + persist. /impeccable layout
- [P1] Unreadable without Syndicate; day 1 valley (5 alarm signals, ~13 Lab Starts); legend gaps; "holding it steady" vs "Level 3 in 3 days" (command.js:296); no board help. Fix: legend, reword hold, ? key, scripted Joyeuse days 1-3, quieter day 1. /impeccable onboard, /impeccable clarify
- [P2] Contrast + keyboard: disabled ~2:1, IDLE 3.4, kbd 3.8, LOST/▼ ~3.0, L0 4.2, .mkb 2.8; tab arrows hard-coded 4 (command.js:815); timed stacking banners; Until focusout; identical "Brief" names; Armoury Delete unconfirmed. /impeccable audit, /impeccable harden
- [P2] One Meaning leaks: orange .why reasons (command.css:51), red lockdown meter, red IDLE, gold on news/loot. /impeccable colorize

## Persona Red Flags
Alex: no Until/Brief keys; arrows skip Armoury; 4/5 label clicks miss; stacked banners; Dispatch scroll.
Sam: disabled 2:1; timed banners; tooltip-only meanings; "Control 2.70 of 3.95"; tab names with badge digits; six "Brief"; focus ring overlaps label at 1024.
Syndicate veteran: can't brief from territory; dial direction opposite to tax slider; fixed-price research; briefing breaks console.
greykit visitor: day 1 reads lost; jargon; labels vanish on hover.

## Minor Observations
Top bar shrinks ~22px at war; CAL MOVES banner named an already-lost zone; fallen Watcher is a plain chip; "Start · $4,000 · 30 RP"; Ranch siege duplicated; "Money 5" overlaps Wait at 1024; .cx kbd border-radius:2px (command.css:50); DESIGN.md says four tabs, build has five.

## Questions to Consider
Brief from the map? Dial in Syndicate's direction? Five screens or fewer? A quiet day 1 with Cal on day 3?
