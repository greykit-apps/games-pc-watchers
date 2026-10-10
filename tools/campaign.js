#!/usr/bin/env node
/* Headless campaign: a bot takes the Market Plaza contract again and again,
 * keeps both labs funded, and buys what research unlocks. Checks the
 * campaign's invariants after every contract and prints the economy's pace.
 *
 *   node tools/campaign.js [contracts=12] [--quiet]
 */
"use strict";
const { load, run } = require("./sim.js");
const W = load();
const args = process.argv.slice(2);
const N = +(args.find(a => /^\d+$/.test(a)) || 12);
const quiet = args.includes("--quiet");
const s = W.C.fresh();
const fail = m => { console.error("FAIL: " + m); process.exit(1); };
const check = () => {
  if (!Number.isFinite(s.cash) || s.cash < 0) fail(`cash went to ${s.cash}`);
  if (!s.roster.length) fail("no Watchers left");
  if (W.C.squad(s).length < 1 || W.C.squad(s).length > W.C.SQUAD) fail("squad size");
  for (const a of s.roster) if (a.items.length > 8) fail(`${a.name} carries ${a.items.length} items`);
  for (const id of s.done) if (s.done.indexOf(id) !== s.done.lastIndexOf(id)) fail(`${id} researched twice`);
};
const WANT = ["uzi", "longrange", "minigun", "laser", "gauss"];
for (let i = 0; i < N; i++) {
  // keep the labs busy: weapons first in this order, mods round-robin
  for (const lab of ["weapons", "mods"]) {
    const L = s.labs[lab];
    if (!L.active) {
      const next = W.C.RESEARCH.find(r => r.lab === lab && W.C.available(s, r.id) && (lab === "mods" || WANT.includes(r.id)));
      if (next) { W.C.setActive(s, lab, next.id); W.C.setFunding(s, lab, s.cash > 30000 ? 2000 : 1000); }
    }
  }
  // shop: the best gun each Watcher lacks, then a chest mod
  for (const a of W.C.squad(s)) {
    for (const t of [...WANT].reverse()) if (!W.C.canBuy(s, a, t) && s.cash > W.C.PRICE[t] + 8000) { W.C.buy(s, a, t); break; }
    if (!W.C.canBuy(s, a, "medikit") && !a.items.some(x => x.type === "medikit")) W.C.buy(s, a, "medikit");
    for (const m of ["chest", "legs", "eyes"]) if (!W.C.canInstall(s, a, m) && s.cash > 15000) W.C.install(s, a, m);
  }
  while (W.C.squad(s).length < W.C.SQUAD && !W.C.canHire(s)) W.C.hire(s);
  const roster = W.C.missionRoster(s);
  const r = run(W, i, false, quiet, true, roster);
  const w = r.world;
  const bonus = w.objectives.filter(o => o.optional && o.state === "done").length;
  const grade = r.status === "won" ? (r.stats.lost ? "B" : "A") : "";
  const slip = W.C.settle(s, { contract: "plaza", won: r.status === "won", grade, bonuses: bonus,
    agents: w.agents.map(a => ({ id: a.rosterId, alive: a.alive, kills: a.kills || 0, items: a.weapons.map(x => ({ type: x.type, ammo: x.ammo })) })) });
  check();
  console.log(`day ${String(s.day).padStart(3)}  ${r.status.padEnd(4)}  pay ${W.money(slip.pay).padStart(8)}  cash ${W.money(s.cash).padStart(9)}  lost ${r.stats.lost}  roster ${s.roster.length}  done: ${s.done.filter(d => !W.C.START_DONE.includes(d)).join(" ")}`);
}
console.log(`${N} contracts; ${s.done.length - W.C.START_DONE.length} projects researched; ${s.fallen ? s.fallen.length : 0} Watchers fallen`);
