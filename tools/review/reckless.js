#!/usr/bin/env node
/* Can the campaign be lost? tools/campaign.js's bot weighs every mission by
 * what it pays less the Watchers it expects to lose, at what they cost. This
 * runs the same bot with that brake off (a Watcher is worth nothing to it) and
 * the raw fight odds, so it takes whatever pays most a day, however hard: as
 * close to a careless player as the bot gets. Then the same with no research
 * ever started (a player who never opens the Lab).
 *
 *   node tools/review/reckless.js [seeds=12]
 */
"use strict";
const { load } = require("../sim.js");
const { play } = require("../campaign.js");
const SEEDS = +(process.argv[2] || 12);

function runs(label, patch) {
  const out = [];
  for (let k = 1; k <= SEEDS; k++) {
    const W = load(); patch(W);
    try { out.push(play({ W, seed: k * 7 + 1, missions: 200, harsh: true })); }
    catch (e) { out.push({ error: e.message }); }
  }
  const ok = out.filter(r => !r.error), won = ok.filter(r => r.win);
  const mean = a => a.length ? (a.reduce((s, x) => s + x, 0) / a.length) : NaN;
  console.log(`${label}: ${won.length} of ${ok.length} won${out.length - ok.length ? `, ${out.length - ok.length} crashed (${out.filter(r => r.error).map(r => r.error).join("; ")})` : ""}; won at mission ${mean(won.map(r => r.wonAt)).toFixed(0)} (day ${mean(won.map(r => r.wonDay)).toFixed(0)}); Watchers lost a mission ${mean(ok.map(r => r.fallen / r.missions)).toFixed(2)}; fallen a campaign ${mean(ok.map(r => r.fallen)).toFixed(0)}; cash at the end $${Math.round(mean(ok.map(r => r.s.cash)) / 1000)}k; lost zones at the end ${mean(ok.map(r => r.lostAtEnd)).toFixed(1)}`);
  const gaps = {}; for (const r of ok) for (const [g, v] of Object.entries(r.gaps)) { const G = gaps[g] = gaps[g] || [0, 0, 0]; v.forEach((x, i) => G[i] += x); }
  console.log("   by threat minus tier: " + Object.keys(gaps).map(Number).sort((a, b) => a - b).map(g => `${g > 0 ? "+" : ""}${g}: ${gaps[g][0]} taken, ${(gaps[g][2] / gaps[g][0] * 100).toFixed(0)}% won, ${(gaps[g][1] / gaps[g][0]).toFixed(2)} lost`).join(" · "));
}

runs("raw, careful about losses (the shipped --harsh bot)", W => {});
runs("raw, a Watcher worth nothing to it (takes whatever pays most)", W => { W.M.worth = () => 0; });
runs("raw, Watchers worth nothing, never researches", W => { W.M.worth = () => 0; W.M.start = () => false; });
