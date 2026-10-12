#!/usr/bin/env node
/* Headless check of the simulation: loads the engine's scripts into a bare
 * context (no DOM, no canvas, no sound), then plays Market Plaza with a bot
 * that walks the squad at Vesper Sly with guns out. Fails on a crash, a unit
 * standing somewhere it cannot, NaN positions, or a mission that never ends.
 *
 *   node tools/sim.js [runs=5] [--quiet] [--attract]
 *   --quiet: the bot walks in holstered and draws late; the default bot goes in loud
 *   --campaign: the squad a new campaign starts with (pistols and shotguns)
 *   --district=ranch[/maze]: generated missions in a district (seeds 1000+)
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const FILES = ["js/core/util.js", "js/core/map.js", "js/core/weapons.js", "js/core/units.js", "js/core/world.js", "js/levels/plaza.js", "js/campaign/meta.js"];

function load() {
  const store = {};
  const ctx = {
    console, Math, JSON, Date, performance: { now: () => Date.now() },
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, key: () => null, length: 0 },
    document: { createElement: () => ({ getContext: () => ({}) }) },
    setInterval: () => 0, clearInterval: () => {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const districts = ["js/districts/kit.js", ...fs.readdirSync(path.join(ROOT, "js/districts")).filter(f => f !== "kit.js" && f.endsWith(".js")).sort().map(f => "js/districts/" + f)];
  for (const f of FILES.concat(districts)) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  ctx.W.audio = { play() {}, at() {}, ambience() {}, setRain() {}, setMuted() {}, listen() {} };
  return ctx.W;
}

function run(W, seed, attract, quiet, camp, roster, level) {
  const world = new W.World(level || W.LEVELS.plaza, { attract, roster: roster || (camp ? W.M.missionRoster(W.M.fresh()) : undefined) });
  const m = world.map, dt = 1 / 60;
  let t = 0, orderT = 0;
  // alarms are local: the bot draws for trouble within a few tiles of a Watcher, not for a fight across town
  const trouble = a => world.units.some(u => u.alive && !u.inCar && (u.faction === "crew" && u.hostile || u.faction === "sec" && u.angryAt.player) && W.dist(a.x, a.y, u.x, u.y) < 12);
  const fail = msg => { throw new Error(`run ${seed} t=${t.toFixed(1)}: ${msg}`); };
  while (t < 900) {
    world.update(dt); t += dt;
    for (const u of world.units) {
      if (!u.alive || u.inCar) continue;
      if (!Number.isFinite(u.x) || !Number.isFinite(u.y)) fail(`${u.kind} ${u.id} has a NaN position`);
      if (!m.walkable(u.x, u.y)) fail(`${u.kind} ${u.id} stands in a wall at ${u.x.toFixed(2)},${u.y.toFixed(2)}`);
    }
    if (attract) { if (t > 60) return { status: "attract", t }; continue; }
    // the bot. Loud: every two seconds, guns out and walk at Sly. Quiet: walk
    // in holstered to the fountain's east side, then draw and go for him.
    orderT -= dt;
    if (orderT <= 0) {
      orderT = 2;
      // the job done: everyone out by the nearest way
      // (guns out, returning fire as they go; on a quiet job, only with trouble close by,
      // holstered again once it is behind them, so the police on the way are left alone)
      if (world.phase === "exfil") {
        const quiet = world.subjectUnit || world.terminal;
        for (const a of world.agents) {
          if (!a.alive || a.out) continue;
          if (!W.armed(a) && (!quiet || trouble(a))) W.drawBest(a);
          else if (quiet && !trouble(a) && W.armed(a)) { a.cur = -1; a.weaponOut = false; }
          a.manual = null;
          if (!a.path) { const p = world.exitFor(a); if (p) W.goTo(world, a, p[0], p[1]); }
        }
        continue;
      }
      // a sweep: guns out, at the nearest of their operations still standing; the first one broken opens the way home
      if (world.sweep) {
        const ags = world.agents.filter(a => a.alive), c0 = ags[0], todo = (world.contracts || []).filter(c => !c.done);
        const c = c0 && todo.map(c => [c, world.contractAt(c)]).sort((p, q) => W.dist(c0.x, c0.y, p[1].x, p[1].y) - W.dist(c0.x, c0.y, q[1].x, q[1].y))[0];
        if (c) for (const a of ags) {
          if (!W.armed(a)) W.drawBest(a);
          a.manual = c[0].crew.filter(u => u.alive && !u.broken && u.faction === "crew").sort((p, q) => W.dist(a.x, a.y, p.x, p.y) - W.dist(a.x, a.y, q.x, q.y))[0] || null;
          if (!a.path) W.goTo(world, a, c[1].x + (a.slot % 2), c[1].y + (a.slot >> 1));
        }
        continue;
      }
      // a persuade job: whoever has the Purrsuader talks the subject round, the rest stay close
      const S = world.subjectUnit;
      // nobody to do the talking: a player would abort
      if (S && world.noPurr) { world.end("lost", "Mission aborted."); continue; }
      if (S) {
        const talker = world.agents.find(a => a.alive && a.weapons.some(w => W.WEAPONS[w.type].persuade));
        for (const a of world.agents) {
          if (!a.alive) continue;
          if (a === talker && !S.follower) {
            const k = a.weapons.findIndex(w => W.WEAPONS[w.type].persuade); a.cur = k; a.weaponOut = true;
            // short of the crowd the subject needs: talk round a passer-by first
            let mark = S;
            if (!W.canPersuade(world, a, S)) mark = world.units.filter(c => c.kind === "civ" && !c.subject && !c.follower && c.alive && !c.inCar && W.canPersuade(world, a, c)).sort((p, q) => W.dist(a.x, a.y, p.x, p.y) - W.dist(a.x, a.y, q.x, q.y))[0] || S;
            a.manual = mark; if (!a.path || a.chaseT <= 0) W.goTo(world, a, mark.x, mark.y);
          }
          // the rest hang back, out of the minders' way, until the subject is with us
          else { if (trouble(a) && !W.armed(a)) W.drawBest(a); if (!a.path && talker && W.dist(a.x, a.y, S.x, S.y) < 8) { const ang = Math.atan2(a.y - S.y, a.x - S.x); const p = world.map.nearestWalkable(S.x + Math.cos(ang) * 10, S.y + Math.sin(ang) * 10, 4); if (p) W.goTo(world, a, p[0], p[1]); } }
        }
        continue;
      }
      // a crackdown: guns out, burn the stash, shoot back
      if (world.stash && !world.stash.dead) {
        for (const a of world.agents) { if (!a.alive) continue; if (!W.armed(a)) W.drawBest(a); a.manual = world.stash; if (!a.path) W.goTo(world, a, world.stash.x + (a.slot % 2) * 2 - 1, world.stash.y + (a.slot >> 1) * 2 - 1); }
        continue;
      }
      // after the stash, or a siege: the nearest of the operation still standing
      if (world.stash || world.siege) {
        for (const a of world.agents) {
          if (!a.alive) continue;
          if (!W.armed(a)) W.drawBest(a);
          const left = world.units.filter(u => u.alive && u.faction === "crew" && (world.siege ? u.defender : u.op && !u.broken)).sort((p, q) => W.dist(a.x, a.y, p.x, p.y) - W.dist(a.x, a.y, q.x, q.y))[0];
          if (left) { a.manual = left; if (!a.path) W.goTo(world, a, left.x, left.y); }
        }
        continue;
      }
      // an intel job, or a safe: everyone to it
      if (world.terminal) {
        for (const a of world.agents) {
          if (!a.alive) continue;
          if (trouble(a) && !W.armed(a)) W.drawBest(a);
          if (!a.path && W.dist(a.x, a.y, world.terminal.x, world.terminal.y) > 1) W.goTo(world, a, world.terminal.x + (a.slot % 2) * 0.4, world.terminal.y + (a.slot >> 1) * 0.4);
        }
        continue;
      }
      const T = world.targetUnit;
      const goal = T.inCar ? world.escapeCar : T;
      // the quiet bot's stopping point: the plaza's fountain, or 8 tiles short of a district target
      const stop = level ? null : [34.5 + 44, 27.5 + 88];
      const near = stop ? world.agents.some(a => a.alive && W.dist(a.x, a.y, stop[0], stop[1]) < 2.5) : world.agents.some(a => a.alive && W.dist(a.x, a.y, T.x, T.y) < 8);
      for (const a of world.agents) {
        if (!a.alive) continue;
        if (quiet && !near && !trouble(a)) { if (!a.path) W.goTo(world, a, (stop ? stop[0] : T.x) + (a.slot % 2) * 0.8, (stop ? stop[1] : T.y) + (a.slot >> 1) * 0.8); continue; }
        if (!W.armed(a)) W.drawBest(a);
        a.manual = goal.alive || goal.isCar ? goal : null;
        if (!a.path) W.goTo(world, a, goal.x + (a.slot % 2), goal.y + (a.slot >> 1));
      }
    }
    if (world.status !== "play") return { status: world.status, reason: world.endReason, t, stats: world.stats, world };
  }
  fail("the mission never ended");
}

module.exports = { load, run };
if (require.main !== module) return;

const args = process.argv.slice(2);
const runs = +(args.find(a => /^\d+$/.test(a)) || 5);
const attract = args.includes("--attract");
const quiet = args.includes("--quiet");
const camp = args.includes("--campaign");
const dArg = (args.find(a => a.startsWith("--district=")) || "").slice(11);
const W = load();
let won = 0;
for (let i = 0; i < runs; i++) {
  let level;
  if (dArg) { const [district, section] = dArg.split("/"); level = W.missionLevel({ district, section, seed: 1000 + i }); }
  const r = run(W, i, attract, quiet, camp, undefined, level);
  if (level) process.stdout.write(`${level.picks.spawn.name} -> ${level.picks.target.name}${level.picks.exit ? " (runs for " + level.picks.exit.name + ")" : ""}
  `);
  if (r.status === "won") won++;
  console.log(`run ${i}: ${r.status}${r.reason ? " -- " + r.reason : ""} at ${r.t.toFixed(1)}s` + (r.stats ? ` (lost ${r.stats.lost}, crew ${r.stats.crew}, sec ${r.stats.sec}, civ ${r.stats.civ}, shots ${r.stats.shots})` : ""));
}
if (!attract) console.log(`${won}/${runs} won`);
