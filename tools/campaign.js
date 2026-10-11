#!/usr/bin/env node
/* A headless campaign: a bot plays the meta-game (js/campaign/meta.js) from a
 * fresh start. It keeps research running (a weapon, mod or gear project on top,
 * production underneath), kits out the squad, and takes the mission that
 * matters most: a siege, Cal's crew, a story step, then whatever the weakest
 * zone offers. Checks the campaign's invariants after every mission.
 *
 *   node tools/campaign.js [missions=60] [--fight] [--quiet] [--seed=N]
 *
 * By default a mission's outcome is rolled (won 80% of the time, a Watcher
 * lost 15% of the time); --fight plays each one out in the mission engine. */
"use strict";
const { load, run } = require("./sim.js");
const W = load();
const M = W.M;
const args = process.argv.slice(2);
const N = +(args.find(a => /^\d+$/.test(a)) || 60);
const quiet = args.includes("--quiet"), fight = args.includes("--fight");
const seedArg = args.find(a => a.startsWith("--seed=")), seed = seedArg ? +seedArg.split("=")[1] : 1;
let r = seed * 9301 + 49297;
const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
const s = M.fresh(seed);
const fail = m => { console.error(`FAIL day ${s.day}: ${m}`); process.exit(1); };
const check = () => {
  if (!Number.isFinite(s.cash) || s.cash < 0) fail(`cash went to ${s.cash}`);
  if (!s.roster.length) fail("no Watchers left");
  if (M.squad(s).length < 1 || M.squad(s).length > M.SQUAD) fail("squad size");
  if (s.roster.length > M.ROSTER_MAX) fail("too many Watchers");
  for (const a of s.roster) if (a.items.length > 8) fail(`${a.name} carries ${a.items.length} items`);
  for (const id of s.research.done) if (s.research.done.indexOf(id) !== s.research.done.lastIndexOf(id)) fail(`${id} researched twice`);
  for (const z of s.zones) {
    if (!(z.C >= 0 && z.C <= M.N.CAP + 1e-9)) fail(`${z.id} control ${z.C}`);
    const P = M.fitPolicy(s, z);
    if (P.r + P.m + P.c !== M.pips(s, z)) fail(`${z.id} policy doesn't sum to its pips`);
  }
  for (const o of s.offers) if (!M.zone(s, o.zone)) fail("an offer for no zone");
};
const ORDER = ["uzi:1", "chest:1", "scanner:1", "legs:1", "longrange:1", "eyes:1", "purrsuader:2", "arms:1", "minigun:1", "uzi:2", "chest:2", "laser:1", "heart:1", "brain:1"];
for (let i = 0; i < N && !s.won; i++) {
  // research: one weapon, mod or gear project on top; production (or the overseers) underneath
  const avail = M.available(s);
  const running = s.research.running;
  if (!running.some(p => !["works", "requisition", "overseers"].includes(p.id))) {
    const counter = avail.find(a => a.kind === "counter");
    const next = counter || ORDER.map(id => avail.find(a => a.id === id)).find(Boolean) || avail.find(a => a.kind !== "city" && a.kind !== "counter");
    if (next && !M.canStart(s, next)) M.start(s, next);
  }
  if (!running.some(p => ["works", "requisition", "overseers"].includes(p.id)) && s.cash > 150000) {
    const prod = avail.find(a => a.id === "overseers") || avail.find(a => a.id === "works");
    if (prod && s.cash - prod.cost[0] > 60000) M.start(s, prod);
  }
  // the squad: fill it, arm it, mod it
  while (M.squad(s).length < M.SQUAD && !M.canHire(s) && s.cash > 120000) M.hire(s);
  for (const a of M.squad(s)) {
    for (const it of M.shop(s, a)) if (it.type !== "banhammer" && it.type !== "medikit" && !M.canBuy(s, a, it) && s.cash - it.price > 40000) M.buy(s, a, it);
    const med = M.shop(s, a).find(x => x.type === "medikit");
    if (!a.items.some(x => x.type === "medikit") && !M.canBuy(s, a, med)) M.buy(s, a, med);
    for (const part of ["chest", "legs", "eyes", "arms"]) if (!M.canInstall(s, a, part) && s.cash > 80000) M.install(s, a, part);
  }
  // policy: hold every zone, climb the weak ones a little, the rest half research half money
  for (const z of s.zones) {
    if (z.lost) continue;
    const p = M.pips(s, z), hold = z.locked ? 0 : Math.min(p, M.holdPips(s, z) + (M.level(z.C) < 2 ? 1 : 0));
    const rest = p - hold;
    z.policy = { c: hold, r: Math.ceil(rest / 2), m: Math.floor(rest / 2) };
  }
  // the mission
  const pri = o => (o.kind === "siege" ? 0 : o.kind === "cal" ? 1 : o.kind === "story" ? 2 : 3) * 10 + Math.max(0, M.level(M.zone(s, o.zone).C));
  const offer = s.offers.filter(o => !M.canRun(s, o)).sort((a, b) => pri(a) - pri(b))[0];
  if (!offer) { M.advanceDay(s); check(); continue; }
  let res;
  if (fight) {
    const L = M.missionFor(s, offer);
    const out = run(W, i, false, true, false, M.missionRoster(s), L);
    res = { won: out.status === "won", agents: out.world.agents.map(a => ({ id: a.rosterId, alive: a.alive, kills: a.kills || 0, items: a.weapons.map(x => ({ type: x.type, ammo: x.ammo, mk: x.mk })) })) };
  } else {
    const won = rand() < 0.8, dies = rand() < 0.15 ? Math.floor(rand() * M.squad(s).length) : -1;
    res = { won, agents: M.squad(s).map((a, k) => ({ id: a.id, alive: k !== dies, kills: 3, items: a.items.map(x => ({ type: x.type, mk: x.mk, ammo: x.count })) })) };
  }
  const slip = M.settle(s, offer, res);
  check();
  if (!quiet) console.log(`day ${String(s.day).padStart(3)}  ${(res.won ? "won " : "LOST")} ${M.KINDS[offer.kind].name.padEnd(14)} ${M.zoneDef(offer.zone).name.padEnd(24)} cash ${W.money(s.cash).padStart(10)}  pts ${String(s.research.points).padStart(2)}${s.war ? " WAR" : "    "}  levels ${s.zones.map(z => z.locked ? "X" : z.lost ? "-" : M.level(z.C)).join("")}  roster ${s.roster.length}`);
}
console.log(`${s.stats.missions} missions, ${s.stats.won} won, day ${s.day}; research: ${s.research.done.length - M.START_DONE.length} done, ${s.research.points} points${s.war ? ", at war" : ""}; zones ${s.zones.map(z => `${z.id}:${z.locked ? "locked" : z.lost ? "lost" : M.level(z.C)}`).join(" ")}; fallen ${s.fallen.length}${s.won ? "; WON" : ""}`);
