#!/usr/bin/env node
/* Checks every district and every section of one: each mission point stands
 * on (or right next to) walkable ground, every drop point can reach every
 * target, and every target can reach an exit. Prints each map's size and
 * makeup, and how long it took to build.
 *
 *   node tools/maps.js [district]
 */
"use strict";
const { load } = require("./sim.js");
const W = load();
const only = process.argv[2];
let bad = 0;
const check = (label, m) => {
  const P = m.points, errs = [];
  for (const k of ["spawn", "target", "exit"]) for (const p of P[k]) {
    const n = m.nearestWalkable(p.x, p.y, 2);
    if (!n) errs.push(`${k} "${p.name}" at ${p.x},${p.y} is not near walkable ground`);
  }
  if (!P.spawn.length) errs.push("no spawn points");
  if (!P.target.length) errs.push("no target points");
  for (const t of P.target) {
    for (const s of P.spawn) if (!m.path(s.x, s.y, t.x, t.y)) errs.push(`no way from spawn "${s.name}" to target "${t.name}"`);
    if (P.exit.length && !P.exit.some(e => m.path(t.x, t.y, e.x, e.y))) errs.push(`target "${t.name}" has no way to any exit`);
  }
  let walk = 0, bld = 0; for (let k = 0; k < m.w * m.h; k++) { walk += m.walk[k]; bld += m.height[k] > 0; }
  console.log(`${errs.length ? "FAIL" : "ok  "} ${label.padEnd(28)} ${m.w}x${m.h}  ${m.buildings.length} buildings, ${m.props.length} props, ${Math.round(100 * walk / (m.w * m.h))}% walkable, ${P.spawn.length}/${P.target.length}/${P.exit.length} spawn/target/exit, ${m.lanes.length} lanes`);
  for (const e of errs) console.log("       " + e);
  bad += errs.length;
};
for (const d of Object.values(W.DISTRICTS)) {
  if (only && d.id !== only) continue;
  const t0 = Date.now();
  const m = W.districtMap(d.id);
  check(`${d.id} (built in ${Date.now() - t0}ms)`, m);
  for (const s of d.sections) check(`  ${d.id}/${s.id}`, W.sectionMap(d.id, s.id));
}
if (bad) { console.log(`${bad} problem${bad === 1 ? "" : "s"}`); process.exit(1); }
