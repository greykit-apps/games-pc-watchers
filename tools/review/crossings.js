#!/usr/bin/env node
/* Cars at level crossings: how many are smashed by trains in N seconds of
 * traffic, per district, and where they were standing when it happened
 * (on a track while braking, or moving through). The report the author's
 * bug came from: a car stops for a train on the far track of a two-track
 * crossing and sits on the near one.
 *
 *   node tools/review/crossings.js [seconds=600] [seeds=3]
 */
"use strict";
const { load } = require("../sim.js");
const W = load();
const SECS = +(process.argv[2] || 600), SEEDS = +(process.argv[3] || 3);

for (const district of Object.keys(W.DISTRICTS)) {
  const d = W.DISTRICTS[district];
  const m = W.districtMap(district);
  const tracks = m.lanes.filter(l => l.train);
  if (!tracks.length) { console.log(`${district}: no railway`); continue; }
  let smashed = 0, braking = 0, moving = 0, cars = 0, speedSum = 0, speedN = 0, stuck = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const L = W.missionLevel({ district, seed: seed * 101 });
    const w = new W.World(L, { attract: true });
    cars += w.cars.filter(c => !c.train && !c.parked).length;
    const dc = w.damageCar.bind(w);
    w.damageCar = (car, dmg, src) => {
      if (src && src.accident && dmg > car.hp && !car.train && !car.dead) { smashed++; if (car.speed < 0.5) braking++; else moving++; }
      return dc(car, dmg, src);
    };
    const still = new Map();
    for (let t = 0, k = 0; t < SECS; t += 1 / 30, k++) {
      w.update(1 / 30);
      if (k % 30) continue;
      for (const c of w.cars) if (!c.train && !c.parked && !c.dead) {
        speedSum += c.speed; speedN++;
        const n = c.speed < 0.05 ? (still.get(c) || 0) + 1 : 0; still.set(c, n); if (n === 60) stuck++;
      }
    }
  }
  console.log(`${district.padEnd(11)} ${tracks.length} tracks, ${cars} cars over ${SEEDS} x ${SECS}s: ${smashed} smashed by trains (${braking} standing still, ${moving} moving); traffic averages ${(speedSum / speedN).toFixed(2)} tiles/s; ${stuck} cars stood still a full minute`);
}
