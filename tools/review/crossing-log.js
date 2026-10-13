#!/usr/bin/env node
/* Long Convention Center traffic runs, logging every car smashed by a train and every car that stands
 * still a full minute, with what was round it. node tools/review/crossing-log.js [runs=16] [seconds=900] */
"use strict";
const { load } = require("../sim.js"); const W = load();
const RUNS = +(process.argv[2] || 16), SECS = +(process.argv[3] || 900);
let smash = 0, stuck = 0;
for (let seed = 1; seed <= RUNS; seed++) {
  const L = W.missionLevel({ district: "convention", seed: seed * 101 + 7 }); const w = new W.World(L, { attract: true });
  const still = new Map(), dc = w.damageCar.bind(w);
  const where = c => { const ax = c.axis === "x", s = ax ? c.x : c.y, front = s + c.dir * c.len / 2;
    return w.trains.map(T => T.info).filter(I => I && I.ax !== ax).map(I => `near ${(((I.lat - c.dir * (I.half + 1)) - front) * c.dir).toFixed(1)}`).join(","); };
  w.damageCar = (car, dmg, src) => { if (src && src.accident && dmg > car.hp && !car.train && !car.dead) { smash++; console.log(`SMASH run ${seed} t=${w.time.toFixed(0)} ${car.axis}${car.dir > 0 ? "+" : "-"} spd ${car.speed.toFixed(2)} light ${w.light[car.axis]} tracks ${where(car)}`); } return dc(car, dmg, src); };
  for (let t = 0, k = 0; t < SECS; t += 1 / 30, k++) {
    w.update(1 / 30);
    if (k % 30) continue;
    for (const c of w.cars) if (!c.train && !c.parked && !c.dead) {
      const n = c.speed < 0.05 ? (still.get(c) || 0) + 1 : 0; still.set(c, n);
      if (n === 60) { stuck++; const ax = c.axis === "x", s = ax ? c.x : c.y;
        const ahead = w.cars.filter(o => o !== c && !o.train && o.lane === c.lane && (((ax ? o.x : o.y) - s) * c.dir) > 0).sort((a, b) => ((ax ? a.x : a.y) - (ax ? b.x : b.y)) * c.dir)[0];
        console.log(`STUCK run ${seed} t=${w.time.toFixed(0)} ${c.axis}${c.dir > 0 ? "+" : "-"} at ${c.x.toFixed(1)},${c.y.toFixed(1)} ahead ${ahead ? `gap ${(((ax ? ahead.x : ahead.y) - s) * c.dir - (c.len + ahead.len) / 2).toFixed(1)} spd ${ahead.speed.toFixed(2)} dead ${!!ahead.dead}` : "none"} tracks ${where(c)}`); }
    }
  }
}
console.log(`${RUNS} x ${SECS}s: ${smash} smashed by trains, ${stuck} stood still a full minute`);
