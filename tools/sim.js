#!/usr/bin/env node
/* Headless check of the simulation: loads the engine's scripts into a bare
 * context (no DOM, no canvas, no sound), then plays Market Plaza with a bot
 * that walks the squad at Vesper Sly with guns out. Fails on a crash, a unit
 * standing somewhere it cannot, NaN positions, or a mission that never ends.
 *
 *   node tools/sim.js [runs=5] [--quiet] [--attract]
 *   --quiet: the bot walks in holstered and draws late; the default bot goes in loud
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const FILES = ["js/core/util.js", "js/core/map.js", "js/core/weapons.js", "js/core/units.js", "js/core/world.js", "js/levels/plaza.js"];

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
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  ctx.W.audio = { play() {}, at() {}, ambience() {}, setRain() {}, setMuted() {}, listen() {} };
  return ctx.W;
}

function run(W, seed, attract, quiet) {
  const world = new W.World(W.LEVELS.plaza, { attract });
  const m = world.map, dt = 1 / 60;
  let t = 0, orderT = 0;
  const fail = msg => { throw new Error(`run ${seed} t=${t.toFixed(1)}: ${msg}`); };
  while (t < 300) {
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
      const T = world.targetUnit;
      const goal = T.inCar ? world.escapeCar : T;
      const near = world.agents.some(a => a.alive && W.dist(a.x, a.y, 34.5, 27.5) < 2.5);
      for (const a of world.agents) {
        if (!a.alive) continue;
        if (quiet && !near && !world.alarm) { if (!a.path) W.goTo(world, a, 34 + (a.slot % 2) * 0.8, 27 + (a.slot >> 1) * 0.8); continue; }
        if (!W.armed(a)) W.drawBest(a);
        a.manual = goal.alive || goal.isCar ? goal : null;
        if (!a.path) W.goTo(world, a, goal.x + (a.slot % 2), goal.y + (a.slot >> 1));
      }
    }
    if (world.status !== "play") return { status: world.status, reason: world.endReason, t, stats: world.stats };
  }
  fail("the mission never ended");
}

const args = process.argv.slice(2);
const runs = +(args.find(a => /^\d+$/.test(a)) || 5);
const attract = args.includes("--attract");
const quiet = args.includes("--quiet");
const W = load();
let won = 0;
for (let i = 0; i < runs; i++) {
  const r = run(W, i, attract, quiet);
  if (r.status === "won") won++;
  console.log(`run ${i}: ${r.status}${r.reason ? " -- " + r.reason : ""} at ${r.t.toFixed(1)}s` + (r.stats ? ` (lost ${r.stats.lost}, crew ${r.stats.crew}, sec ${r.stats.sec}, civ ${r.stats.civ}, shots ${r.stats.shots})` : ""));
}
if (!attract) console.log(`${won}/${runs} won`);
