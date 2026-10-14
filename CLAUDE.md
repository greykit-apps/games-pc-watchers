# Notes for Claude

PumaCity: Watchers. `README.md` is for players. Start with
`docs/development.md` (how it's built, the checks), then `docs/gameplay.md`
(the rules in full), `docs/meta.md` (campaign rules) and `docs/missions.md`
(mission engine). `PRODUCT.md` and `DESIGN.md` hold the
product and visual direction.

## Running it

- No build step: plain `<script>` tags. Serve the folder with
  `python tools/serve.py 8765` (or `python -m http.server`) and open
  `http://localhost:8765`.
- Headless tools in `tools/` (run with `node`): `sim.js` and `campaign.js` play
  missions and campaigns with a bot, `metasim.js` tunes the meta-game numbers,
  `maps.js` and `check-assets.js` check the maps and assets.
- Browser storage is per origin/port, so each port has its own campaign save
  (`pcwatchers_campaign_v2`).

## Working rules

- **Desktop only.** Watchers is a mouse-and-keyboard game. Don't build, test or
  review phone or tablet layouts; about 1024px wide is the floor. Skip mobile
  screenshots even when a skill asks for them, and say so in one line.
- **Parallel sessions.** Several Claude sessions often work on this repo at
  once. Check `git branch` / `git worktree list` before editing. If another
  session owns the checkout, propose a worktree under `.claude/worktrees/`
  with its own dev-server port (8765 belongs to the main checkout).

## Remotes

GitLab (`origin`, gitlab.com/greykit-app/games/pc-watchers) is the main remote.
GitHub (`github`, github.com/shandower-421/watchers) is a copy for Claude cloud
sessions. Work done in the cloud lands on GitHub; bring it back to GitLab.
