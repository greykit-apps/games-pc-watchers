#!/usr/bin/env node
/* The tactics bench: does a mission at a threat play for a squad at a level,
 * whichever way it's played? Kits for the Watchers' levels 0 to 4 (the squad
 * Casey hands over, then a full suite of MK1, MK2, MK3 kit, then the top of
 * the tree), and a bot for each way in:
 *
 *   assault   guns out and stims up from the drop, straight at the mark
 *   stealth   holstered, round the armed crew through the warrens, loud only at the mark
 *   snipe     stealth to a spot in rifle range of the mark, then rifles
 *   mob       stealth, talking citizens round on the way, then in loud with the following
 *   banhammer stealth to a spot in sight of the mark, call the strike, clear out, finish it
 *
 * Every bot comes home the same way as it went in (assault guns out, the rest
 * holstered unless there's trouble close by).
 *
 *   node tools/bench.js --kind=assassinate --threat=3 --level=2 --tactic=stealth [--n=4] [--district=downtown] [--seed=3000]
 *   node tools/bench.js --grid [--kinds=assassinate,crackdown] [--tactics=...] [--levels=0-4] [--gaps=-1,0,1] [--n=4] [--jobs=4]
 *   --greedy: go after the side jobs before heading home (a sweep always does)
 *   --out=file.jsonl: each cell's results as it finishes; --dt=0.0167 to step at the game's rate
 *
 * --grid runs every cell (threat = level + 1 + gap) in parallel and prints a
 * table: won, Watchers lost a mission, time, crew down, loot carried home. */
"use strict";
const path = require("path");
const { load } = require("./sim.js");

const KITS = [
  { mods: 0, scanner: 0, guns: null, rifle: null, purr: 1, medi: 1 },
  { mods: 1, scanner: 1, guns: [["uzi", 1], ["shotgun", 1], ["uzi", 1], ["longrange", 1]], rifle: 1, purr: 1, medi: 2 },
  { mods: 2, scanner: 2, guns: [["minigun", 1], ["uzi", 2], ["laser", 1], ["longrange", 2]], rifle: 2, purr: 2, medi: 2 },
  { mods: 3, scanner: 3, guns: [["minigun", 3], ["laser", 2], ["minigun", 3], ["longrange", 3]], rifle: 3, purr: 3, medi: 3 },
  { mods: 3, scanner: 3, guns: [["gauss", 3], ["laser", 3], ["minigun", 3], ["laser", 3]], rifle: 3, purr: 3, medi: 4 },
];
const NAMES = ["LYNX", "MANX", "SPHYNX", "CALICO"];
const PARTS = ["legs", "arms", "chest", "heart", "eyes", "brain"];
/* the four Watchers at a level, kitted for a tactic */
function roster(level, tactic) {
  const K = KITS[level];
  return NAMES.map((name, i) => {
    const w = [];
    const gun = (type, mk) => w.push({ type, mk, ammo: undefined });
    if (!K.guns) {
      // the squad a new campaign starts with
      gun("pistol", 1);
      if (i === 1 || i === 2) gun("shotgun", 1);
    } else {
      gun("pistol", Math.min(3, level));
      if (tactic === "snipe") gun("longrange", K.rifle);
      else gun(...K.guns[i]);
    }
    if (i === 0) w.push({ type: K.purr >= 2 ? "purr2" : "purrsuader", mk: K.purr });
    w.push({ type: "medikit", ammo: K.medi });
    if (tactic === "banhammer" && i === 0) w.push({ type: "banhammer", ammo: 1 });
    return { id: i + 1, name, fur: "#b08a5a", mods: Object.fromEntries(PARTS.map(p => [p, K.mods])), weapons: w, scannerMk: K.scanner };
  });
}

/* one mission, played by one tactic */
/* dt: the bench steps the world at 30 a second, not the game's 60: half the cost, and the same fights */
function fight(W, L, level, tactic, maxT = 900, greedy = false, dt = 1 / 30) {
  const world = new W.World(L, { roster: roster(level, tactic) });
  const m = world.map;
  const start = new Map(world.agents.map(a => [a, new Set(a.weapons.map(w => `${w.type}:${w.mk || 1}`))]));
  let t = 0, orderT = 0;
  const live = () => world.agents.filter(a => a.alive && !a.out);
  const fail = msg => { throw new Error(`${L.id} ${tactic} t=${t.toFixed(1)}: ${msg}`); };
  // the quiet way, as a player gets it with Alt-click: round what the scanner shows (W.dangerField)
  let danger = null;
  const buildDanger = () => { danger = W.dangerField(world); };
  const sneak = tactic !== "assault";
  const go = (a, x, y) => sneak ? W.sneakTo(world, a, x, y, danger) : W.goTo(world, a, x, y);
  const loud = a => { for (const s of W.STIMS) a.ipa[s.id].lvl = 1; a.aggressive = true; if (!W.armed(a) || W.curDef(a).persuade) W.drawBest(a); };
  const holster = a => { a.aggressive = false; if (W.armed(a)) { a.cur = -1; a.weaponOut = false; a.target = null; a.manual = null; } };
  const trouble = (a, r = 10) => world.units.some(u => u.alive && !u.inCar && (u.faction === "crew" && u.hostile && !u.follower || u.faction === "sec" && u.angryAt.player) && W.dist(a.x, a.y, u.x, u.y) < r);
  // the mark: who has to die, or where to stand, by the kind of job
  const S = world.subjectUnit;
  const mark = () => {
    if (world.targetUnit) { const T = world.targetUnit; return T.alive ? (T.inCar && world.escapeCar ? world.escapeCar : T) : null; }
    if (world.stash && !world.stash.dead) return world.stash;
    if (world.stash || world.siege) {
      const left = world.units.filter(u => u.alive && u.faction === "crew" && (world.siege ? u.defender : u.op && !u.broken));
      const c = live()[0]; if (!c) return null;
      return left.sort((p, q) => W.dist(c.x, c.y, p.x, p.y) - W.dist(c.x, c.y, q.x, q.y))[0] || null;
    }
    if (world.terminal && !world.terminal.done) return { x: world.terminal.x, y: world.terminal.y, terminal: true };
    if (S && !S.follower && S.alive) return S;
    return null;
  };
  const st = { loud: tactic === "assault", spot: null, struck: false, strikeAt: null };
  for (const a of world.agents) st.loud ? loud(a) : holster(a);
  const talker = () => live().find(a => a.weapons.some(w => W.WEAPONS[w.type].persuade));
  while (t < maxT) {
    world.update(dt); t += dt;
    for (const u of world.units) {
      if (!u.alive || u.inCar) continue;
      if (!Number.isFinite(u.x) || !Number.isFinite(u.y)) fail(`${u.kind} ${u.id} has a NaN position`);
      if (!m.walkable(u.x, u.y)) fail(`${u.kind} ${u.id} stands in a wall at ${u.x.toFixed(2)},${u.y.toFixed(2)}`);
    }
    if (world.status !== "play") break;
    orderT -= dt;
    if (orderT > 0) continue;
    orderT = 1;
    if (sneak) buildDanger();
    const ags = live();
    if (!ags.length) continue;
    // side jobs: greedy (and a sweep, always) goes after them before heading home, while the squad's in shape
    const todo = (world.contracts || []).filter(c => !c.done);
    const fit = ags.length >= 2 && ags.reduce((t, a) => t + a.hp / a.maxHp, 0) / ags.length > 0.45;
    if ((greedy || world.sweep) && todo.length && fit && (world.phase === "exfil" || world.sweep)) {
      const c0 = ags[0], c = todo.map(c => [c, world.contractAt(c)]).sort((p, q) => W.dist(c0.x, c0.y, p[1].x, p[1].y) - W.dist(c0.x, c0.y, q[1].x, q[1].y))[0];
      const P = c[1], foe = c[0].crew.filter(u => u.alive && !u.broken && u.faction === "crew").sort((p, q) => W.dist(c0.x, c0.y, p.x, p.y) - W.dist(c0.x, c0.y, q.x, q.y))[0];
      const dP = W.dist(c0.x, c0.y, P.x, P.y);
      for (const a of ags) {
        if (dP < 9 || tactic === "assault" || trouble(a)) { loud(a); if (foe) a.manual = foe; } else holster(a);
        if (!a.path || Math.random() < 0.3) go(a, P.x + (a.slot % 2), P.y + (a.slot >> 1));
      }
      continue;
    }
    // ---- the way home ----
    if (world.phase === "exfil") {
      for (const a of ags) {
        if (tactic === "assault" || trouble(a)) loud(a); else holster(a);
        a.manual = null;
        if (!a.path) { const p = world.exitFor(a); if (p) go(a, p[0], p[1]); }
      }
      continue;
    }
    const M = mark();
    if (!M) continue;
    const lead = ags.reduce((p, q) => W.dist(p.x, p.y, M.x, M.y) < W.dist(q.x, q.y, M.x, M.y) ? p : q);
    const dM = W.dist(lead.x, lead.y, M.x, M.y);
    // trouble on the way: whoever is in it fights
    if (!st.loud) for (const a of ags) { if (trouble(a, 8)) loud(a); else if (!(tactic === "mob" && a === talker())) holster(a); }
    // the mob, armed: with a following but few guns in it, hit something small on the way (lookouts, a
    // mugging, a deal) and let them pick up what drops; twice at most
    if (tactic === "mob" && !st.loud) {
      const fol = world.units.filter(u => u.alive && u.follower && !u.isAgent && !u.subject);
      const armedF = fol.filter(u => W.hasGun(u)).length;
      if (st.raid && st.raid.crew.every(u => !u.alive || u.broken || u.faction === "player")) { st.raid = null; st.raids = (st.raids || 0) + 1; }
      if (!st.raid && (st.raids || 0) < 2 && fol.length >= 3 && armedF < fol.length / 2) {
        const c0 = ags[0];
        st.raid = (world.encounters || []).filter(e => e.hostile && e.crew.some(u => u.alive && !u.broken && u.faction === "crew") && e.crew.filter(u => u.alive).length <= 3 && W.dist(c0.x, c0.y, e.x, e.y) < 45 && (!world.markAt || W.dist(e.x, e.y, world.markAt[0], world.markAt[1]) > W.ALARM_REACH + 5))
          .sort((p, q) => W.dist(c0.x, c0.y, p.x, p.y) - W.dist(c0.x, c0.y, q.x, q.y))[0] || null;
        if (!st.raid) st.raids = 2;
      }
      if (st.raid) {
        const foe = st.raid.crew.filter(u => u.alive && !u.broken && u.faction === "crew")[0];
        if (foe) {
          for (const a of ags) { if (W.dist(a.x, a.y, foe.x, foe.y) < 9) { loud(a); a.manual = foe; } if (!a.path || Math.random() < 0.3) go(a, foe.x, foe.y); }
          continue;
        }
      }
    }
    // the mob: talk round whoever is near (a short detour), until the following is full
    if (tactic === "mob" && !st.loud) {
      const tk = talker();
      if (tk) {
        const cap = W.followingCap(world), have = W.squadFollowers(world);
        const k = tk.weapons.findIndex(w => W.WEAPONS[w.type].persuade); tk.cur = k; tk.weaponOut = true;
        if (have < cap) {
          const c = world.units.filter(u => u.alive && !u.inCar && (u.kind === "civ" && !u.subject || u.faction === "sec") && !u.follower && W.canPersuade(world, tk, u) && W.dist(tk.x, tk.y, u.x, u.y) < 9).sort((p, q) => W.dist(tk.x, tk.y, p.x, p.y) - W.dist(tk.x, tk.y, q.x, q.y))[0];
          if (c) { tk.manual = c; W.goTo(world, tk, c.x, c.y); continue; }
        }
      }
    }
    // a persuade job: whoever talks walks up to the subject once the following is big enough
    if (S && M === S) {
      const tk = talker();
      for (const a of ags) {
        if (a === tk) {
          const k = a.weapons.findIndex(w => W.WEAPONS[w.type].persuade); a.cur = k; a.weaponOut = true;
          let mk = S;
          if (!W.canPersuade(world, a, S)) mk = world.units.filter(c => c.kind === "civ" && !c.subject && !c.follower && c.alive && !c.inCar && W.canPersuade(world, a, c)).sort((p, q) => W.dist(a.x, a.y, p.x, p.y) - W.dist(a.x, a.y, q.x, q.y))[0] || S;
          a.manual = mk; if (!a.path || a.chaseT <= 0) { go(a, mk.x, mk.y); a.chaseT = 2; }
        } else if (W.dist(a.x, a.y, S.x, S.y) > 9 && !a.path) go(a, S.x + W.rand(-3, 3), S.y + W.rand(-3, 3));
      }
      continue;
    }
    // a terminal or a safe: everyone to it, loud only if it comes to that
    if (M.terminal) {
      for (const a of ags) if (!a.path && W.dist(a.x, a.y, M.x, M.y) > 1) go(a, M.x + (a.slot % 2) * 0.4, M.y + (a.slot >> 1) * 0.4);
      continue;
    }
    // ---- the strike ----
    if (tactic === "banhammer" && !st.struck) {
      const caller = ags.find(a => a.weapons.some(w => w.type === "banhammer" && (w.ammo == null || w.ammo > 0)));
      if (caller) {
        const d = W.dist(caller.x, caller.y, M.x, M.y);
        if (d < 14 && d > 8.5 && !world.canStrike(caller, M.x, M.y) && ags.every(a => W.dist(a.x, a.y, M.x, M.y) > 8)) {
          world.callStrike(caller, M.x, M.y); st.struck = true; st.strikeAt = t; st.strikeX = M.x; st.strikeY = M.y;
          for (const a of ags) { const ang = Math.atan2(a.y - M.y, a.x - M.x); go(a, M.x + Math.cos(ang) * 12, M.y + Math.sin(ang) * 12); }
          continue;
        }
        // to a spot 10 to 12 tiles off, in sight of the mark
        if (!st.spot || orderT <= 0 && !caller.path) st.spot = W.benchSpot(world, M, 10, 12.5, caller);
        if (st.spot) { for (const a of ags) if (!a.path || W.dist(a.dest ? a.dest[0] : 0, a.dest ? a.dest[1] : 0, st.spot[0], st.spot[1]) > 2) go(a, st.spot[0] + (a.slot % 2), st.spot[1] + (a.slot >> 1)); continue; }
      }
    }
    if (tactic === "banhammer" && st.struck && t - st.strikeAt < 6) continue;
    // ---- the rifles ----
    if (tactic === "snipe" && !st.loud) {
      const rng = W.rangeOf(Object.assign({}, lead, { cur: lead.weapons.findIndex(w => w.type === "longrange") })) || 11;
      if (!st.spot || W.dist(st.spot[0], st.spot[1], M.x, M.y) > rng * 0.95) st.spot = W.benchSpot(world, M, rng * 0.7, rng * 0.92, lead);
      if (st.spot && W.dist(lead.x, lead.y, st.spot[0], st.spot[1]) > 1.5) {
        for (const a of ags) if (!a.path || W.dist(a.dest ? a.dest[0] : 0, a.dest ? a.dest[1] : 0, st.spot[0], st.spot[1]) > 2) go(a, st.spot[0] + (a.slot % 2) * 0.6, st.spot[1] + (a.slot >> 1) * 0.6);
        continue;
      }
      st.loud = true;
    }
    // ---- in close: loud from here ----
    const close = tactic === "assault" || tactic === "snipe" && st.loud || dM < (tactic === "mob" ? 7 : 6) || world.markAlarm && dM < 14;
    if (close) {
      st.loud = true;
      for (const a of ags) {
        loud(a);
        a.manual = M.alive || M.isCar ? M : null;
        if (tactic === "snipe") { const k = a.weapons.findIndex(w => w.type === "longrange" && (w.ammo == null || w.ammo > 0)); if (k >= 0) { a.cur = k; a.weaponOut = true; } }
        if (!a.path) W.goTo(world, a, M.x + (a.slot % 2), M.y + (a.slot >> 1));
      }
      continue;
    }
    for (const a of ags) if (!a.path || orderT <= 0 && Math.random() < 0.25) go(a, M.x + (a.slot % 2), M.y + (a.slot >> 1));
  }
  if (world.status === "play") world.end("lost", "Out of time.");
  // loot: anything brought home that the Watcher didn't go out with, at what it sells for
  let loot = 0, items = 0;
  for (const a of world.agents) {
    if (!a.alive || !a.out) continue;
    for (const w of a.weapons) {
      if (!W.WEAPONS[w.type].gun || start.get(a).has(`${w.type}:${w.mk || 1}`)) continue;
      items++; loot += W.M.sellPrice({ type: w.type, mk: w.mk || 1 });
    }
  }
  const cs = world.contracts || [];
  return { won: world.status === "won", reason: world.endReason, t, lost: world.stats.lost, crew: world.stats.crew, sec: world.stats.sec, civ: world.stats.civ, followers: W.squadFollowers(world), loot, items,
    contracts: cs.length, done: cs.filter(c => c.done).length, weight: cs.filter(c => c.done).reduce((t, c) => t + c.weight, 0) };
}

module.exports = { roster, fight, KITS };

/* a spot between rmin and rmax tiles from the mark, in sight of it, that a path reaches; nearest the squad */
function installSpot(W) {
  W.benchSpot = (world, M, rmin, rmax, from) => {
    const m = world.map, reach = W.reachable(m);
    let best = null, bd = Infinity;
    for (let k = 0; k < 160; k++) {
      const a = Math.random() * Math.PI * 2, r = rmin + Math.random() * (rmax - rmin);
      const p = m.nearestWalkable(M.x + Math.cos(a) * r, M.y + Math.sin(a) * r, 1.5);
      if (!p || !reach[m.i(Math.floor(p[0]), Math.floor(p[1]))]) continue;
      const d = W.dist(p[0], p[1], M.x, M.y);
      if (d < rmin || d > rmax || !m.los(p[0], p[1], M.x, M.y)) continue;
      const c = W.dist(p[0], p[1], from.x, from.y);
      if (c < bd) { bd = c; best = p; }
    }
    return best;
  };
}

if (require.main !== module) return;
const args = process.argv.slice(2);
const val = (k, d) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const DISTRICTS = ["downtown", "suburbs", "convention", "starport", "ranch"];

function cell(kind, threat, level, tactic, n, seed0, district, greedy) {
  const W = load(); installSpot(W);
  const out = [];
  for (let i = 0; i < n; i++) {
    const L = W.missionLevel({ district: district || DISTRICTS[i % DISTRICTS.length], seed: seed0 + i });
    L.mission = { kind, threat, quiet: !!(W.M.KINDS[kind] || {}).quiet };
    L.mod = Object.assign({}, W.M.THREAT[threat]);
    L.scannerMk = KITS[level].scanner;
    const t0 = Date.now();
    out.push(Object.assign(fight(W, L, level, tactic, 900, greedy, +val("dt", 1 / 30)), { wall: (Date.now() - t0) / 1000, seed: seed0 + i, district: L.districtId }));
  }
  return out;
}

if (args.includes("--worker")) {
  const job = JSON.parse(val("job"));
  try { process.stdout.write(JSON.stringify({ job, res: cell(job.kind, job.threat, job.level, job.tactic, job.n, job.seed, job.district, job.greedy) }) + "\n"); }
  catch (e) { process.stdout.write(JSON.stringify({ job, error: e.message }) + "\n"); }
  return;
}

const summary = res => {
  const n = res.length, s = k => res.reduce((t, r) => t + (r[k] || 0), 0);
  return { n, won: res.filter(r => r.won).length, lost: s("lost") / n, t: s("t") / n, crew: s("crew") / n, loot: s("loot") / n, civ: s("civ") / n, done: s("done") / n, contracts: s("contracts") / n };
};

if (args.includes("--grid")) {
  const { spawn } = require("child_process");
  const kinds = val("kinds", "assassinate").split(","), tactics = val("tactics", "assault,stealth,snipe,mob,banhammer").split(",");
  const [l0, l1] = val("levels", "0-4").split("-").map(Number), gaps = val("gaps", "-1,0,1").split(",").map(Number);
  const n = +val("n", 4), jobs = +val("jobs", 4), seed = +val("seed", 3000), district = val("district", "");
  const queue = [];
  for (const kind of kinds) for (let level = l0; level <= (l1 ?? l0); level++) for (const gap of gaps) for (const tactic of tactics) {
    const threat = level + 1 + gap;
    if (threat < 1 || threat > 5) continue;
    if (tactic === "snipe" && level === 0) continue;   // no rifles yet
    if (tactic === "banhammer" && level < 2) continue; // needs the scanner at MK2
    queue.push({ kind, threat, level, tactic, n, seed: seed + threat * 100, district, greedy: args.includes("--greedy") });
  }
  const results = [];
  let running = 0;
  const next = () => {
    if (!queue.length) { if (!running) report(); return; }
    const job = queue.shift(); running++;
    const p = spawn(process.execPath, [__filename, "--worker", `--job=${JSON.stringify(job)}`]);
    let buf = "";
    p.stdout.on("data", d => buf += d);
    p.stderr.on("data", d => process.stderr.write(d));
    p.on("close", () => {
      running--;
      try { const r = JSON.parse(buf.trim().split("\n").pop()); results.push(r); if (val("out")) require("fs").appendFileSync(val("out"), JSON.stringify(r) + "\n"); process.stderr.write(r.error ? `ERROR ${JSON.stringify(job)}: ${r.error}\n` : `done ${job.kind} L${job.level} t${job.threat} ${job.tactic}\n`); }
      catch (e) { process.stderr.write(`bad output from ${JSON.stringify(job)}\n`); }
      next();
    });
  };
  const report = () => {
    results.sort((a, b) => a.job.kind.localeCompare(b.job.kind) || a.job.level - b.job.level || a.job.threat - b.job.threat || tactics.indexOf(a.job.tactic) - tactics.indexOf(b.job.tactic));
    console.log("kind        | lvl | threat | tactic    | won  | lost/mission | time | crew down | loot $ | civ | side jobs");
    for (const r of results) {
      if (r.error) { console.log(`${r.job.kind.padEnd(11)} | L${r.job.level}  | t${r.job.threat}     | ${r.job.tactic.padEnd(9)} | ERROR ${r.error}`); continue; }
      const S = summary(r.res);
      console.log(`${r.job.kind.padEnd(11)} | L${r.job.level}  | t${r.job.threat}     | ${r.job.tactic.padEnd(9)} | ${S.won}/${S.n}  | ${S.lost.toFixed(2).padStart(4)}         | ${String(Math.round(S.t)).padStart(4)} | ${S.crew.toFixed(1).padStart(5)}     | ${String(Math.round(S.loot)).padStart(6)} | ${S.civ.toFixed(1)} | ${S.done.toFixed(1)}/${S.contracts.toFixed(1)}`);
    }
    if (args.includes("--json")) console.log(JSON.stringify(results));
  };
  for (let k = 0; k < jobs; k++) next();
} else {
  const kind = val("kind", "assassinate"), threat = +val("threat", 3), level = +val("level", 2), tactic = val("tactic", "assault");
  const res = cell(kind, threat, level, tactic, +val("n", 4), +val("seed", 3000), val("district", ""), args.includes("--greedy"));
  for (const r of res) console.log(`${r.won ? "won " : "LOST"} ${r.reason} -- ${Math.round(r.t)}s, lost ${r.lost}, crew ${r.crew}, sec ${r.sec}, civ ${r.civ}, followers ${r.followers}, loot ${r.items} items $${r.loot}, side jobs ${r.done}/${r.contracts}`);
  const S = summary(res);
  console.log(`${S.won}/${S.n} won; ${S.lost.toFixed(2)} Watchers lost a mission`);
}
