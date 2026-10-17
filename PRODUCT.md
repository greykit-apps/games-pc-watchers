# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Built first for **Syndicate veterans**: players who remember Bullfrog's *Syndicate* (1993) and want its feel back. They play long desktop sessions with a mouse and keyboard and are at home in dense tactical UI.

Second, **greykit.games visitors**: people browsing the portfolio who open the game in a browser tab and may never have heard of Syndicate. The game is tuned to the veterans' taste, but the title, briefings and early play must make sense without the reference.

## Product Purpose

*PumaCity: Watchers* is a squad tactics game in the spirit of Syndicate. The player runs the Watchers, four cyber-cats in long coats who serve as Casey Benton's covert enforcers, and holds her city zone by zone against Cal and the gangs he funds.

It has two layers:
- **Missions:** real-time isometric squad play on large district maps. Find and kill the target, with the Purrsuader, stims, weapons and civilians in play.
- **The campaign:** the meta-game laid out in `docs/meta.md`. Eight zones produce daily pips, which the player splits between research, money and control. Cal pushes one zone at a time. Research comes in marks, the squad has eight slots and the dead stay dead, and war and lockdowns lead to the win.

A good session leaves the player feeling they ran a covert war: the plan and the city mattered as much as the shooting.

## Positioning

It is Syndicate's mechanics rebuilt for the browser and set in PumaCity's shared world: Casey Benton, Cal, the Watchers and the districts that the other Puma games already use. Every map is code. Each district is one large hand-authored city with enterable buildings, warrens, traffic and fenced rail choke points, and every mission is generated on the whole map. All art and sound are drawn and synthesised in the page. Nothing is downloaded at play time.

## Operating Context

- Desktop browser, mouse and keyboard, and nothing else: no phone or tablet layout, by the author's decision (2026-10-10). Controls follow Syndicate: number keys select Watchers, left-click moves, right-click fires or persuades, the scanner sits top-down.
- Sessions alternate between the **command board** (zones, pips, research, squad, events), which is a read-and-decide screen, and **missions**, which are fast and real-time. The board is the operating screen. Missions are where the player is inside the work.
- There is no skirmish mode: every mission is the campaign's, briefed from the City (author's decision, 2026-10-13).
- Opened from disk or served statically. Nothing is fetched at play time.

## Capabilities and Constraints

- Plain `<script>` tags across many files, with no build step and no runtime dependencies. This is a deliberate exception to the portfolio's single-file rule, like PumaRally and PumaTycoon.
- The city renders as isometric pixel art at a low internal resolution (2× or 3×, adjustable in Settings), drawn in painter's order. A crisp full-resolution overlay carries the text, speech bubbles and labels.
- Procedural art and Web Audio synthesis only. No image or audio assets ship.
- The campaign saves to `localStorage` under the key `pcwatchers_campaign_v2`. Every storage key starts with `pcwatchers_`, and Settings has *Forget everything*.
- Terms to use as written: Watchers, Casey Benton (the Boss), Watch-Captain Joyeuse, Cal, zones, pips, control levels 0 to 3, siege, war, lockdown, the Purrsuader, stims (Zoomers, Red Dot, Silvervine), the scanner, the Clinic, the BanHammer.
- Districts: Downtown, the Suburbs, the Convention Center, the Ranch and the Starport.
- Headless checks in `tools/` (`sim.js`, `campaign.js`, `metasim.js`, `maps.js`) are part of the workflow.

## Brand Commitments

- Name: **PumaCity: Watchers**. Tagline: "Four cyber-cats in long coats, and Casey Benton's orders."
- greykit.games canon, binding: the boot logo and `@gk-title` block in `js/gk-title.js`, kept byte-identical with `games/meta/canon/gk-title.js`, and the §1 credit ("Built by greykit.com") on the title and in About.
- The Tactical palette (`css/gk-tokens.css`) and the title screen are borrowed, not binding. The game may move away from the STANDARD's §2–§10 Tactical rules.
- Shared PumaCity world: the characters, faction names and district names must stay consistent with the other Puma games.
- Credited as inspired by *Syndicate* (Bullfrog Productions, 1993). The original files in `Source/` are reference only. Nothing from them ships.
- The voice is terse, dry and specific, as in the briefings and the README: short declarative sentences and in-world names.

## Evidence on Hand

- Screenshots: `screenshots/convention-iso*.png`.
- Design documents: `docs/meta.md` (meta-game rules and numbers) and `docs/missions.md`.
- No player testimonials, reviews, play counts or press exist. Do not invent any.

## Product Principles

1. **Syndicate first.** When in doubt, do what Syndicate did. A veteran's muscle memory should work.
2. **The city is the game.** Big, walkable, authored districts where every mission uses the whole map. Space and sightlines decide fights.
3. **Strategy you can feel in the field.** Choices on the board (pips, research, squad) must visibly change what happens in a mission, and the other way round.
4. **Self-contained.** No network, no assets, no build. Everything is drawn and synthesised in the page.
5. **Readable without the reference.** A visitor who never played Syndicate can learn the game from the game itself.

## Accessibility & Inclusion

No product-specific requirements yet (undecided as of 2026-10-10).
