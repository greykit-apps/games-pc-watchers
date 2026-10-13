#!/usr/bin/env node
/* The control model, measured with the real rules (M.dayDelta, M.advanceDay)
 * rather than metasim's copy of the first model. For each zone base (2 and 3):
 * how many days each level takes to climb with every pip on control (the dial
 * re-set each day, as a player at the keyboard would), what it costs to hold
 * each level in peace and at war, how far a plateau zone coasts, and what a
 * push from Cal does at each stage of the campaign.
 *
 *   node tools/review/control-dynamics.js
 */
"use strict";
const { load } = require("../sim.js");
const W = load(), M = W.M;

const s = M.fresh(1); s.cash = 1e9;
for (const z of s.zones) { z.lost = false; z.C = 3.9; }
s.cal.zone = null; s.cal.rest = 9999; s.cal.next = null;     // Cal sits this one out unless asked
const base2 = M.zone(s, "lantern"), base3 = M.zone(s, "oldtown");

const climb = (z, from, to, dial) => { z.C = from; let d = 0; while (z.C < to && d < 200) { M.setDial(s, z, dial); M.advanceDay(s); d++; } return d >= 200 ? "never" : d; };
const coast = (z, from, dial) => { z.C = from; const path = []; for (let d = 0; d < 12; d++) { M.setDial(s, z, dial); M.advanceDay(s); path.push(z.lost ? "lost" : z.C.toFixed(2)); if (z.lost) { z.lost = false; break; } } return path.join(" "); };

console.log("== climbing with every pip on control (dial re-set daily)");
for (const [name, z] of [["base 2", base2], ["base 3", base3]]) {
  console.log(`${name}: 0.5->1: ${climb(z, 0.5, 1, 99)}d · 1->2: ${climb(z, 1, 2, 99)}d · 2->3: ${climb(z, 2, 3, 99)}d · 3->3.5 (plateau): ${climb(z, 3, 3.5, 99)}d · 0.99->3: ${climb(z, 0.99, 3, 99)}d · 0.5->3.5: ${climb(z, 0.5, 3.5, 99)}d`);
}
console.log("\n== pips needed to hold, of pips made (peace / at war), by control");
for (const [name, z] of [["base 2", base2], ["base 3", base3]]) {
  const row = [];
  for (const C of [0.5, 1.5, 2.2, 2.7, 2.95, 3.1, 3.4, 3.6, 3.9]) {
    z.C = C; s.war = false; const a = `${M.holdPips(s, z)}/${M.pips(s, z)}`; s.war = true; const b = `${M.holdPips(s, z)}/${M.pips(s, z)}`; s.war = false;
    row.push(`${C}: ${a} / ${b}`);
  }
  console.log(`${name}: ${row.join(" · ")}`);
}
console.log("\n== a full plateau zone (3.95) left with 0, 1, 2 pips on control, 12 days (base 3)");
for (const c of [0, 1, 2]) console.log(`${c} pip(s): ${coast(base3, 3.95, c)}`);
console.log("\n== Cal's push on a base-2 zone, by how much of the city is pacified (peace), with every pip on control");
for (const n of [0, 3, 6]) {
  for (const z of s.zones) z.C = 3.9;
  s.zones.filter(z => z !== base2).forEach((z, i) => { z.C = i < n ? 3.9 : 1.5; });
  s.cal.zone = base2.id; s.cal.left = 99;
  for (const C0 of [1.5, 2.2, 3.7]) {
    base2.C = C0; const path = [];
    for (let d = 0; d < 4; d++) { s.zones.filter(z => z !== base2).forEach((z, i) => { z.C = i < n ? 3.9 : 1.5; }); M.setDial(s, base2, 99); M.advanceDay(s); path.push(base2.lost ? "LOST" : base2.C.toFixed(2)); if (base2.lost) { base2.lost = false; break; } }
    console.log(`${n} zones pacified, push ${M.calPressure(s, base2).toFixed(2)}/day, from ${C0}: ${path.join(" ")} (hold needs ${M.holdPips(s, base2)} of ${M.pips(s, base2)})`);
  }
  s.cal.zone = null;
}
console.log("\n== at war: the same push (base 0.6) on a base-3 zone, every pip on control");
s.war = true;
for (const z of s.zones) z.C = 2.5;
s.cal.zone = base3.id; s.cal.left = 99;
for (const C0 of [2.5, 3.0, 3.7]) { base3.C = C0; const path = []; for (let d = 0; d < 5; d++) { M.setDial(s, base3, 99); M.advanceDay(s); path.push(base3.lost ? "LOST" : base3.C.toFixed(2)); if (base3.lost) { base3.lost = false; break; } } console.log(`push ${M.calPressure(s, base3).toFixed(2)}/day from ${C0}: ${path.join(" ")}`); }
s.cal.zone = null; s.war = false;

console.log("\n== what a day's production is worth at each level (base 3 zone, every pip to money)");
for (const C of [0.5, 1.5, 2.5, 3.2, 3.9]) { base3.C = C; const p = M.pips(s, base3), y = M.moneyYield(base3); console.log(`control ${C} (level ${M.level(C)}): ${p} pips x ${y} = ${W.money(p * y * M.N.PIP_MONEY)} a day, or ${(p * M.yieldOf(base3)).toFixed(1)} RP; holding costs ${M.holdPips(s, base3)} pips, so net ${W.money(Math.max(0, p - M.holdPips(s, base3)) * y * M.N.PIP_MONEY)}`); }

console.log("\n== research: days to each mark on the city's research alone (half the city's pips to research, all zones level 2)");
for (const z of s.zones) z.C = 2.5;
M.setBalance(s, 0.5);
let rp = 0; for (const z of s.zones) rp += M.fitPolicy(s, z).r * M.yieldOf(z);
console.log(`${rp.toFixed(1)} RP a day. MK1 ${Math.ceil(30 / rp)}d, MK2 ${Math.ceil(72 / rp)}d, MK3 ${Math.ceil(136 / rp)}d, BanHammer ${Math.ceil(160 / rp)}d, overseers ${Math.ceil(150 / rp)}d, propaganda ${Math.ceil(400 / rp)}d, mind control ${Math.ceil(700 / rp)}d, zone works ${Math.ceil(380 / rp)}d, requisition ${Math.ceil(580 / rp)}d`);
const treeRP = M.CATALOGUE.filter(r => r.kind !== "city").reduce((t, r) => t + r.cost[1], 0) - M.START_DONE.length * 30;
const tree$ = M.CATALOGUE.filter(r => r.kind !== "city").reduce((t, r) => t + r.cost[0], 0) - M.START_DONE.length * 4000;
console.log(`the whole weapon/mod/gear tree: ${treeRP} RP and ${W.money(tree$)} to start; 30 upgrade points is ${Math.round(100 * 30 / M.CATALOGUE.filter(r => r.kind !== "city").reduce((t, r) => t + r.points, 0))}% of the tree's ${M.CATALOGUE.filter(r => r.kind !== "city").reduce((t, r) => t + r.points, 0)} points`);
const kit$ = M.PRICE.recruit + 6 * (M.PRICE.mod[1] + M.PRICE.mod[2] + M.PRICE.mod[3]) + M.PRICE.weapon[3] + M.PRICE.purrsuader[3];
console.log(`a Watcher at MK3 in everything: ${W.money(kit$)}; four of them ${W.money(4 * kit$)}; plus the MK3 scanner ${W.money(M.PRICE.scanner[1] + M.PRICE.scanner[2] + M.PRICE.scanner[3])}`);
