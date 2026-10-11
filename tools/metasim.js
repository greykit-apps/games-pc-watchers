/* The meta-game, run headless so its numbers can be tuned. See docs/meta.md.
 *
 *   node tools/metasim.js                    the control model, one zone
 *   node tools/metasim.js --board            a whole campaign, played by a simple policy
 *   node tools/metasim.js --board --days=300 --seed=7 --overseers=0 --research=0.5
 *   node tools/metasim.js --war              one zone on war footing (decay times META.WAR)
 *
 * A zone has base pips B and control C (0..CAP); its level is floor(C) (0..3)
 * and it makes B + level whole pips a day, split between research, money and
 * control. A pip on control buys GAIN[level] of control (people resist a
 * tightening grip); a pip produced yields YIELD[level] (a calm zone works
 * harder). Control loses decay(C) a day: a wall just under 3, so the last
 * level takes everything or a mission; then above 3 a cliff, and above 3.5 a
 * plateau where a contented zone holds on little. A zone at the top coasts
 * for a while if left alone, then falls off the cliff fast. At C <= 0 the zone
 * is lost until a siege takes it back. */
"use strict";

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(s => s.startsWith(`--${k}=`)); return a ? +a.split("=")[1] : d; };
const flag = k => args.includes(`--${k}`);

const META = {
  CAP: 3.95,
  GAIN: [1.0, 0.6, 0.35, 0.3],          // control bought by a pip, by level
  YIELD: [1.0, 1.0, 1.25, 1.5],         // money or research made by a pip, by level
  // decay(C), control a day, piecewise linear: the wall under 3, the cliff above it, the plateau
  DECAY: [[0, 0.8], [1, 0.95], [2, 0.95], [2.5, 1.2], [2.9, 1.55], [3, 1.5], [3.3, 1.35], [3.5, 0.5], [3.95, 0.4]],
  // Cal: rests, then pushes one zone; the push is extra decay, stronger the better you are doing
  CAL: { rest: [3, 6], push: 4, base: 0.4, perPacified: 0.15, tactic: 0.4 },
  MISSION_DAYS: [3, 8],
  // war footing: once everything is researched, decay everywhere is multiplied by this
  WAR: 1.5,
  // war comes once this many upgrade points are researched: an MK1 or MK2 is 1, an MK3 (or the
  // BanHammer) 2. Thirty is everything unlocked and taken to MK2
  WAR_AT: 30,
  // an intel mission completes this share of what is left on each running project
  INTEL: 0.5,
  war: false,
};
const decay = C => {
  const T = META.DECAY, w = META.war ? META.WAR : 1;
  if (C <= T[0][0]) return T[0][1] * w;
  for (let i = 1; i < T.length; i++) if (C <= T[i][0]) { const [x0, y0] = T[i - 1], [x1, y1] = T[i]; return (y0 + (y1 - y0) * (C - x0) / (x1 - x0)) * w; }
  return T[T.length - 1][1] * w;
};
const level = C => C <= 0 ? -1 : Math.min(3, Math.floor(C));
const pips = (B, C) => C <= 0 ? 0 : B + level(C);
const gain = C => META.GAIN[Math.max(0, level(C))];
// pips on control needed to keep C from falling, with extra decay on top
const holdPips = (C, extra = 0, mult = 1) => Math.ceil((decay(C) + extra) / (gain(C) * mult) - 1e-9);
// a day in a zone: k pips on control, the rest produced
const day = (B, C, k, extra = 0, mult = 1) => {
  const p = pips(B, C), c = Math.min(k, p);
  const next = Math.max(0, Math.min(META.CAP, C + c * gain(C) * mult - decay(C) - extra));
  return { C: next, produced: (p - c) * (C > 0 ? META.YIELD[level(C)] : 0) };
};

/* ---------------- one zone ---------------- */
function zoneReport(B) {
  const out = [], say = s => out.push(s);
  say(`A zone of base ${B}: ${B} pips at level 0, ${B + 1} at 1, ${B + 2} at 2, ${B + 3} at 3. Control caps at ${META.CAP}.`);
  say(`A pip on control buys ${META.GAIN.join(", ")} by level; a pip produced yields ${META.YIELD.join(", ")}.`);
  say(`decay at C = 0, 1, 2, 2.5, 2.9, 3, 3.3, 3.5, 3.95: ${[0, 1, 2, 2.5, 2.9, 3, 3.3, 3.5, 3.95].map(c => decay(c).toFixed(2)).join("  ")}`);
  say("");
  say("Days to climb, by pips a day on control (– = it stalls):");
  say("  from → to    " + [1, 2, 3, 4, 5, 6].map(k => `k=${k}`.padStart(6)).join(""));
  for (const [from, to] of [[0.01, 1], [1, 2], [2, 3], [3, 3.5]]) {
    let row = `  ${String(from).padEnd(4)}→ ${String(to).padEnd(4)}`;
    for (let k = 1; k <= 6; k++) {
      if (k > pips(B, from + 1e-9)) { row += "".padStart(6); continue; }
      let C = from, d = 0;
      while (C < to && d < 60 && C > 0) { C = day(B, C, k).C; d++; }
      row += (C >= to ? String(d) : "–").padStart(6);
    }
    say(row);
  }
  say("");
  say("Holding, and what is made a day while holding:");
  for (const C of [0.5, 1.5, 2.5, 3.2, 3.6, 3.95]) {
    const need = holdPips(C), p = pips(B, C);
    say(`  C=${String(C).padEnd(5)} level ${level(C)}: ${need} of ${p} pips hold it (decay ${decay(C).toFixed(2)}); the other ${Math.max(0, p - need)} make ${(Math.max(0, p - need) * META.YIELD[level(C)]).toFixed(1)}`);
  }
  say("");
  say(`Coasting: from a full bank (C=${META.CAP}), k pips on control, the rest produced, until it falls below 3:`);
  for (let k = 0; k <= 3; k++) {
    let C = META.CAP, d = 0, made = 0;
    while (C >= 3 && d < 40) { const r = day(B, C, k); made += r.produced; C = r.C; d++; }
    say(`  k=${k}: ${d >= 40 ? "holds" : `${d} days`}, making ${made.toFixed(1)} (${(made / d).toFixed(1)} a day); then C ${C.toFixed(2)}`);
  }
  say("");
  const S = META.CAL.base;
  say(`Cal pushing (${S} extra decay a day for ${META.CAL.push} days) a zone held steadily:`);
  for (const C0 of [0.5, 1.5, 2.5, 3.6, 3.95]) {
    let C = C0;
    for (let d = 0; d < META.CAL.push && C > 0; d++) C = day(B, C, holdPips(C), S).C;
    const need = holdPips(C0, S), p = pips(B, C0);
    say(`  level ${level(C0)} (C ${C0}): ignored → ${C <= 0 ? "LOST" : `level ${level(C)} (C ${C.toFixed(2)})`};  held → ${need > p ? `more than its ${p} pips` : `${need} of ${p} pips (${need - holdPips(C0)} more)`}`);
  }
  return out.join("\n");
}

/* ---------------- a whole campaign ---------------- */
// the research there is: weapons and mods and gear in marks, production repeatable,
// countermeasures to Cal's tactics as he uses them
const COST = { banhammer: [60000, 160], MK1: [4000, 30], MK2: [12000, 72], MK3: [30000, 136], works: [100000, 380], requisition: [160000, 580], counter: [5000, 45], overseers: [80000, 290] };
function catalogue() {
  const items = [];
  for (const w of ["pistol", "uzi", "shotgun", "longwhisker", "minigun", "laser", "gauss"]) for (const k of [1, 2, 3]) items.push({ id: `${w} MK${k}`, kind: `MK${k}`, needs: k > 1 ? `${w} MK${k - 1}` : null });
  for (const b of ["legs", "arms", "chest", "heart", "eyes", "brain"]) for (const k of [1, 2, 3]) items.push({ id: `${b} MK${k}`, kind: `MK${k}`, needs: k > 1 ? `${b} MK${k - 1}` : null });
  for (const e of ["scanner", "purrsuader"]) for (const k of [1, 2, 3]) items.push({ id: `${e} MK${k}`, kind: `MK${k}`, needs: k > 1 ? `${e} MK${k - 1}` : null });
  items.push({ id: "BanHammer", kind: "banhammer", needs: "scanner MK2" });
  for (const it of items) { [it.money, it.rp] = COST[it.kind]; it.points = it.kind === "MK3" || it.kind === "banhammer" ? 2 : 1; }
  return items;
}
const ZONES = [
  ["The Towers", 3, 3.95], ["Old Town and the Market", 3, 1.5], ["Lantern Row", 2, 1.5], ["Maple Heights", 2, 2.5],
  ["Juniper Hills", 2, 1.5], ["The Expo", 3, 0.6], ["The Starport", 3, 0.6], ["The Ranch", 2, 0],
];

function board({ days = 240, seed = 1, overseers = true, research = 0.5, production = true, verbose = false } = {}) {
  META.war = false;
  let points = 0, warDay = null, warMission = null;
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const zones = ZONES.map(([name, B, C]) => ({ name, B, C, mult: 1, tactic: false, policy: null }));
  const items = catalogue(), done = new Set();
  let works = 0, requisition = 0, haveOverseers = !overseers, money = 20000, rpWaste = 0, rpMade = 0;
  const running = [];                      // projects: { id, rp, left, money, prod? }
  let cal = { rest: ri(...META.CAL.rest), zone: null, left: 0 }, lastCal = null;
  const log = [], stat = { missions: 0, upgrades: 0, lost: 0, sieges: 0, pushes: 0, levels: [0, 0, 0, 0, 0] };
  let freePip = 0;

  // the policy: hold a zone's level; climb toward a target when it has the pips; produce the rest
  const target = z => z.B >= 3 ? 3 : 2;
  const plan = (z, extra) => {
    if (z.C <= 0) return 0;
    const climb = level(z.C) < target(z) || (level(z.C) === 3 && z.C < 3.6);
    const want = climb ? pips(z.B, z.C) : holdPips(z.C, extra, z.mult);
    return Math.min(pips(z.B, z.C), want);
  };
  const pressure = z => cal.zone === z ? META.CAL.base + META.CAL.perPacified * zones.filter(q => level(q.C) >= 2).length : 0;

  const startResearch = () => {
    // keep two projects: production grinding underneath, and one other on top (a countermeasure first)
    const has = k => running.some(p => p.prod === k);
    if (production && !running.some(p => p.prod) && money > 60000) {
      const kind = works <= requisition ? "works" : "requisition", n = kind === "works" ? works : requisition;
      const [m, r] = COST[kind].map(x => x * 1.5 ** n);
      if (money >= m) { money -= m; running.push({ id: kind, left: r, prod: kind }); }
    }
    if (!haveOverseers && !has("overseers") && running.length < 2 && money >= COST.overseers[0]) { money -= COST.overseers[0]; running.push({ id: "overseers", left: COST.overseers[1], prod: "overseers" }); }
    while (running.filter(p => !p.prod || p.prod === "counter").length < 1) {
      const tz = zones.find(z => z.tactic && !running.some(p => p.zone === z));
      if (tz && money >= COST.counter[0]) { money -= COST.counter[0]; running.push({ id: `counter (${tz.name})`, left: COST.counter[1], prod: "counter", zone: tz }); continue; }
      const next = items.find(it => !done.has(it.id) && !running.some(p => p.id === it.id) && (!it.needs || done.has(it.needs)) && money >= it.money);
      if (!next) break;
      money -= next.money; running.push({ id: next.id, left: next.rp });
    }
  };
  const tick = (onMission) => {
    // Cal
    if (cal.zone) { if (--cal.left <= 0) { lastCal = cal.zone; if (rnd() < META.CAL.tactic) cal.zone.tactic = true, cal.zone.mult = 0.75; cal = { rest: ri(...META.CAL.rest), zone: null }; } }
    else if (--cal.rest <= 0) {
      const w = zones.filter(z => z !== lastCal).map(z => [z, (z.C <= 0 ? 0.2 : 1) * (4.5 - z.C) * z.B]);
      let r = rnd() * w.reduce((a, [, x]) => a + x, 0); for (const [z, x] of w) { if ((r -= x) <= 0) { cal = { zone: z, left: META.CAL.push }; break; } }
      stat.pushes++;
    }
    let rp = 0;
    for (const z of zones) {
      if (z.C <= 0) continue;
      const extra = pressure(z);
      // away on a mission the policy stands as it was set, unless an overseer adjusts it
      let k = onMission && z.policy !== null && !haveOverseers ? z.policy : plan(z, extra);
      if (onMission && haveOverseers) k = Math.max(k, Math.min(pips(z.B, z.C), holdPips(z.C, 0, z.mult)));
      if (!onMission) z.policy = k;
      const r = day(z.B, z.C, k + (freePip && z === zones[0] ? 0 : 0), extra, z.mult);
      const was = z.C; z.C = r.C;
      if (was > 0 && z.C <= 0) { stat.lost++; log.push(`day ${d}: ${z.name} is lost`); }
      rp += r.produced * research; money += r.produced * (1 - research) * 1000;
    }
    // requisitioned pips go wherever control is weakest
    for (let q = 0; q < requisition; q++) { const z = zones.filter(z => z.C > 0).sort((a, b) => a.C - b.C)[0]; if (z) z.C = Math.min(META.CAP, z.C + gain(z.C) * z.mult); }
    rpMade += rp;
    if (!running.length) rpWaste += rp;
    else { const share = rp / running.length; for (const p of running) p.left -= share; }
    for (const p of running.filter(p => p.left <= 0)) {
      running.splice(running.indexOf(p), 1);
      if (p.prod === "works") { works++; const z = zones.filter(z => z.C > 0).sort((a, b) => a.B - b.B)[0]; z.B++; }
      else if (p.prod === "requisition") requisition++;
      else if (p.prod === "overseers") haveOverseers = true;
      else if (p.prod === "counter") { p.zone.tactic = false; p.zone.mult = 1; }
      else { done.add(p.id); points += items.find(it => it.id === p.id).points; if (!META.war && points >= META.WAR_AT) { META.war = true; warDay = d; warMission = stat.missions; } }
      stat.upgrades++;
      if (verbose) log.push(`day ${d}: ${p.id} researched`);
    }
    for (const z of zones) stat.levels[level(z.C) + 1]++;
  };
  let d = 0;
  while (d < days) {
    startResearch();
    // a mission: siege a lost zone, or fight Cal where he is pushing, or shore up the weakest zone
    const lostZ = zones.find(z => z.C <= 0);
    const len = ri(...META.MISSION_DAYS);
    for (const z of zones) z.policy = null;
    tick(false);          // the day the squad sets out: policies set
    for (let i = 1; i < len && d < days; i++) { d++; tick(true); }
    d++;
    stat.missions++;
    if (lostZ) { lostZ.C = 0.6; stat.sieges++; }
    else if (cal.zone) { cal.zone.C = Math.min(META.CAP, cal.zone.C + 0.5); cal.left = 0; }
    else {
      const r = rnd();
      if (r < 0.35) money += ri(8, 15) * 1000;
      // intel: half of whatever is left on each project running (nothing, if nothing is)
      else if (r < 0.7) { for (const p of running) { const g = p.left * META.INTEL; p.left -= g; rpMade += g; } }
      else { const z = zones.filter(z => z.C > 0).sort((a, b) => a.C - b.C)[0]; z.C = Math.min(META.CAP, z.C + 0.6); }
    }
  }
  const total = stat.levels.reduce((a, b) => a + b, 0);
  return {
    days, missions: stat.missions, upgrades: stat.upgrades, points, warDay, warMission, perUpgrade: stat.missions / Math.max(1, stat.upgrades), researched: done.size,
    works, requisition, overseers: haveOverseers, rpMade, rpWaste, money, lost: stat.lost, sieges: stat.sieges, pushes: stat.pushes,
    levels: stat.levels.map(n => (100 * n / total).toFixed(0) + "%"), end: zones.map(z => `${z.name} L${level(z.C)}${z.tactic ? "*" : ""} (B${z.B})`), log,
  };
}

function boardReport() {
  const days = arg("days", 240), research = arg("research", 0.5), overseers = arg("overseers", 1) === 1;
  const runs = [];
  for (let sd = 1; sd <= 8; sd++) runs.push(board({ days, seed: sd + arg("seed", 0), overseers, research, production: arg("production", 1) === 1 }));
  const avg = k => (runs.reduce((a, r) => a + r[k], 0) / runs.length);
  const out = [];
  out.push(`${runs.length} campaigns of ${days} days; ${Math.round(research * 100)}% of produced pips to research; overseers ${overseers ? "researchable" : "never"}`);
  const real = avg("researched") + avg("works") + avg("requisition");
  out.push(`  missions ${avg("missions").toFixed(1)}; upgrades ${real.toFixed(1)}, one every ${(avg("missions") / real).toFixed(1)} missions: weapons/mods/gear ${avg("researched").toFixed(1)} of 46, zone works ${avg("works").toFixed(1)}, requisitions ${avg("requisition").toFixed(1)}`);
  out.push(`  and ${(avg("upgrades") - real - (overseers ? 1 : 0)).toFixed(1)} countermeasures to Cal's tactics${overseers ? ", and the overseers" : ""}`);
  out.push(`  research points made ${avg("rpMade").toFixed(0)}, wasted ${avg("rpWaste").toFixed(0)}; money left $${Math.round(avg("money")).toLocaleString()}`);
  const wars = runs.filter(r => r.warDay !== null);
  out.push(`  war (at ${META.WAR_AT} upgrade points): ${wars.length} of ${runs.length} campaigns reached it${wars.length ? `, on day ${Math.round(wars.reduce((a, r) => a + r.warDay, 0) / wars.length)} (mission ${Math.round(wars.reduce((a, r) => a + r.warMission, 0) / wars.length)})` : ""}; upgrade points ${avg("points").toFixed(1)}`);
  out.push(`  Cal pushed ${avg("pushes").toFixed(1)} times; zones lost ${avg("lost").toFixed(1)}, sieges ${avg("sieges").toFixed(1)}`);
  out.push(`  time zones spent at lost/L0/L1/L2/L3: ${runs[0].levels.join(" / ")} (first campaign)`);
  out.push(`  the board at the end of the first: ${runs[0].end.join(", ")}`);
  return out.join("\n");
}

if (flag("war")) META.war = true;
if (require.main === module) console.log(flag("board") ? boardReport() : zoneReport(arg("base", 3)));
module.exports = { META, COST, decay, level, pips, day, holdPips, zoneReport, board, boardReport };
