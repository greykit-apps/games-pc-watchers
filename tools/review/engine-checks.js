#!/usr/bin/env node
/* Review checks against the mission engine, headless: degenerate mission
 * setups (a sweep with nothing to break, a siege with nobody in it), the
 * Longwhisker's one-shot on an unaware target, and what comes home.
 *
 *   node tools/review/engine-checks.js [seeds=40]
 */
"use strict";
const { load } = require("../sim.js");
const W = load(), M = W.M;
const SEEDS = +(process.argv[2] || 40);

const say = (id, verdict, text) => console.log(`${verdict.padEnd(9)} ${id}: ${text}`);
const roster = () => M.missionRoster(M.fresh(1));

/* 1. Degenerate setups, over every district, kind and threat. */
{
  const bad = { sweepNoContracts: [], siegeNoDefenders: [], crackdownNoOp: [], persuadeNoSubject: [], noPickup: [], pickupIsDrop: [] };
  let n = 0;
  for (const district of Object.keys(W.DISTRICTS)) for (const kind of ["sweep", "siege", "crackdown", "persuade", "intel", "job", "assassinate"]) for (const threat of [1, 3, 5]) for (let seed = 1; seed <= SEEDS / 4; seed++) {
    const L = W.missionLevel({ district, seed: seed * 977 + threat });
    L.mission = { kind, threat, quiet: !!M.KINDS[kind].quiet, zoneLevel: 1, cal: false, hired: 0, mindControl: false, pay: { money: 10000, control: 0.05 }, counter: null };
    L.mod = Object.assign({}, M.THREAT[threat]); L.scannerMk = 1;
    const w = new W.World(L, { roster: roster() });
    n++;
    const tag = `${district}/${kind}/T${threat}/s${seed}`;
    if (kind === "sweep" && !(w.contracts || []).length) bad.sweepNoContracts.push(tag);
    if (kind === "siege" && !w.units.some(u => u.defender && u.alive)) bad.siegeNoDefenders.push(tag);
    if (kind === "crackdown" && !w.units.some(u => u.op && u.faction === "crew")) bad.crackdownNoOp.push(tag);
    if (kind === "persuade" && !w.subjectUnit) bad.persuadeNoSubject.push(tag);
    if (!w.pickupAt) bad.noPickup.push(tag);
    else if (W.dist(w.pickupAt[0], w.pickupAt[1], L.picks.spawn.x, L.picks.spawn.y) < 24) bad.pickupIsDrop.push(tag);
  }
  for (const [k, v] of Object.entries(bad)) say(`setup-${k}`, v.length ? "VERIFIED" : "CLEAR", `${v.length} of ${n} missions${v.length ? `: ${v.slice(0, 6).join(", ")}${v.length > 6 ? "…" : ""}` : ""}`);
}

/* 2. Siege: how many defenders, and how many are reachable on foot from the squad's drop? */
{
  const rows = [];
  for (const district of Object.keys(W.DISTRICTS)) for (const threat of [4, 5]) {
    let total = 0, unreachable = 0, missions = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const L = W.missionLevel({ district, seed: seed * 31 + threat });
      L.mission = { kind: "siege", threat, cal: true, pay: {} }; L.mod = Object.assign({}, M.THREAT[threat]);
      const w = new W.World(L, { roster: roster() });
      const a = w.agents[0];
      for (const u of w.units) if (u.defender) { total++; if (!w.map.path(a.x, a.y, u.x, u.y)) unreachable++; }
      missions++;
    }
    rows.push(`${district} T${threat}: ${(total / missions).toFixed(1)} defenders a siege, ${unreachable} unreachable`);
  }
  say("siege-defenders", "INFO", rows.join(" · "));
}

/* 3. The Longwhisker on an unaware assassination target: one shot, and does anyone notice? */
{
  let shots = 0, kills = 0, alarms = 0, tries = 0, dist = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const L = W.missionLevel({ district: "downtown", seed: seed * 13 });
    L.mission = { kind: "assassinate", threat: 3, cal: false, pay: {} }; L.mod = Object.assign({}, M.THREAT[3]); L.scannerMk = 2;
    const R = roster(); R[0].weapons = [{ type: "longrange", mk: 1, ammo: 30 }];
    const w = new W.World(L, { roster: R });
    const T = w.targetUnit, a = w.agents[0];
    // stand the sniper 10 tiles from the target with a line of sight, where the map allows it
    let spot = null;
    for (let k = 0; k < 200 && !spot; k++) { const ang = Math.random() * Math.PI * 2, d = 9 + Math.random() * 2; const x = T.x + Math.cos(ang) * d, y = T.y + Math.sin(ang) * d; if (w.map.walkable(x, y) && w.map.los(x, y, T.x, T.y)) spot = [x, y]; }
    if (!spot) continue;
    a.x = spot[0]; a.y = spot[1]; a.cur = 0; a.weaponOut = true; a.cd = 0;
    // let the world settle a tick so nobody is mid-think, then fire once at the target
    tries++; dist += W.dist(a.x, a.y, T.x, T.y);
    const surprised = W.surprised(w, T);
    W.tryFire(w, a, T.x, T.y, T); shots++;
    if (!T.alive) kills++;
    for (let i = 0; i < 60; i++) w.update(1 / 60);
    if (w.markAlarm || w.alarm) alarms++;
    if (!surprised) shots += 0;
  }
  say("longwhisker-surprise", "INFO", `${tries} set-ups at ~${(dist / tries).toFixed(1)} tiles, threat 3: one MK1 rifle shot killed the target ${kills} times (${Math.round(100 * kills / tries)}%; the pistol's 0.78 x 0.95 rifle accuracy at that range would predict about ${Math.round(100 * 0.95 * (1 - 0.45 * 10 / 11.5))}%); an alarm (mark or street) followed in ${alarms}`);
}

/* 4. Loot marks: a Watcher who went out with an Uzi MK1 and picked up an MK3 comes home with the MK3, and the racks get nothing. */
{
  const s = M.fresh(1);
  const a = M.squad(s)[1]; a.items = [{ type: "uzi", mk: 1 }, { type: "pistol", mk: 1 }];
  const o = s.offers[0];
  M.settle(s, o, { won: true, contracts: [], agents: M.squad(s).map(x => ({ id: x.id, alive: true, kills: 0, items: x === a ? [{ type: "uzi", mk: 3, ammo: 100 }, { type: "pistol", ammo: null }] : x.items.map(i => ({ type: i.type, mk: i.mk })) })) });
  const uzi = a.items.find(i => i.type === "uzi");
  say("loot-mark-upgrade", uzi && uzi.mk === 3 ? "VERIFIED" : "CLEAR", `went out with Uzi MK1, picked up an MK3 in the field: carries Uzi MK${uzi && uzi.mk} now; racks: ${JSON.stringify(s.armoury)}; Uzi research done: ${M.isDone(s, "uzi:1")}`);
}

/* 5. A dead Watcher's guns drop in the field: what the survivors can bring home. */
{
  const L = W.missionLevel({ district: "ranch", seed: 5 });
  L.mission = { kind: "intel", threat: 1, pay: {} }; L.mod = Object.assign({}, M.THREAT[1]);
  const R = roster(); R[1].weapons = [{ type: "laser", mk: 3, ammo: 12 }, { type: "pistol" }, { type: "banhammer", ammo: 1 }, { type: "medikit", ammo: 3 }];
  const w = new W.World(L, { roster: R });
  const b = w.agents[1];
  w.kill(b, null);
  say("dead-watcher-drops", "INFO", `a Watcher carrying a Laser MK3, a pistol, a BanHammer strike and 3 medikits dies: on the ground now: ${w.items.filter(i => W.dist(i.x, i.y, b.x, b.y) < 1).map(i => `${i.type}${i.mk ? " MK" + i.mk : ""}`).join(", ") || "nothing"}`);
}

/* 6. Grade: the time term. A winning run of each mission kind and how the formula would grade a clean one. */
{
  const grade = (time, lost = 0, civ = 0, bonus = 0) => { const pts = 100 - lost * 18 - Math.max(0, civ - 2) * 4 + bonus * 8 - Math.max(0, time - 240) / 12; return pts >= 105 ? "S" : pts >= 90 ? "A" : pts >= 72 ? "B" : pts >= 55 ? "C" : "D"; };
  say("grade-by-time", "INFO", `a flawless mission (no losses, no civilians, no bonus) grades ${[180, 300, 420, 600, 780, 900].map(t => `${t}s: ${grade(t)}`).join(", ")}; with both bonuses: ${[300, 600, 900].map(t => `${t}s: ${grade(t, 0, 0, 2)}`).join(", ")}`);
}

/* 7. The mark of a hit talked round: the kill objective is done, the squad goes to exfil, and walking out wins. */
{
  const L = W.missionLevel({ district: "downtown", seed: 77 });
  L.mission = { kind: "assassinate", threat: 2, cal: false, pay: {} }; L.mod = Object.assign({}, M.THREAT[2]);
  const R = roster(); const w = new W.World(L, { roster: R });
  const a = w.agents[0], T = w.targetUnit;
  a.cur = a.weapons.findIndex(x => x.type === "purrsuader"); a.weaponOut = true;
  const needCold = W.persuadeNeed(w, a, T), canCold = W.canPersuade(w, a, T);
  // six followers behind the squad: six shoppers talked round
  const civs = w.units.filter(u => u.kind === "civ" && !u.subject).slice(0, 6); for (const c of civs) W.persuade(w, a, c);
  const canWithCrowd = W.canPersuade(w, a, T);
  if (canWithCrowd) W.persuade(w, a, T);
  for (let i = 0; i < 30; i++) w.update(1 / 60);
  const kill = w.objectives.find(o => o.type === "kill");
  // and out: everyone at the pickup
  for (const u of w.agents) { u.x = w.pickupAt[0]; u.y = w.pickupAt[1]; u.path = null; }
  for (let i = 0; i < 120 && w.status === "play"; i++) w.update(1 / 60);
  say("persuade-the-target", canWithCrowd && kill.state === "done" && w.status === "won" && T.alive ? "VERIFIED" : "CLEAR",
    `target needs ${needCold} followers (can with none: ${canCold}); with 6: ${canWithCrowd}; objective "${kill.text}" ${kill.state}; phase ${w.phase}; mission ${w.status}: ${w.endReason}; target alive ${T.alive}`);
}
