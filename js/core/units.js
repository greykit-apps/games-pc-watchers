/* People: the four Watchers, their followers, Plaza Security, the rival crew,
 * the target, and the crowd. Each kind is a row of numbers plus a think()
 * that runs a few times a second; movement and firing run every tick. */
"use strict";

W.FURS = ["#b08a5a", "#7c7c84", "#d9d3c7", "#3a3330", "#c98a4a", "#8a6a4a", "#e8e4dc", "#5a4a40", "#a89a8a"];
W.CIV_COATS = ["#5a6a8a", "#8a5a6a", "#4a7a6a", "#7a6a4a", "#6a4a7a", "#3a5a7a", "#8a7a5a", "#5a5a5a", "#7a3a3a", "#3a6a5a", "#9a8a6a", "#4a4a6a"];

W.KINDS = {
  agent:  { hp: 24, speed: 2.5, acc: 1.0, react: 0.6, sight: 9, armor: 0.75 },
  civ:    { hp: 3,  speed: 1.1, acc: 0.4, react: 1.0, sight: 6 },
  sec:    { hp: 8,  speed: 1.9, acc: 0.85, react: 0.7, sight: 8.5 },
  crew:   { hp: 9,  speed: 2.1, acc: 0.8, react: 0.65, sight: 8 },
  guard:  { hp: 13, speed: 2.1, acc: 0.9, react: 0.5, sight: 8.5 },
  target: { hp: 10, speed: 1.9, acc: 0.6, react: 0.8, sight: 7 },
};

W.LINES = {
  warn: ["Holster that weapon!", "Weapons down. Now!", "Put it away, pal!", "Not in my plaza!"],
  secAngry: ["Officer needs backup!", "Shots fired!", "Take them down!"],
  secCalm: ["...and stay out of trouble.", "Plaza's quiet again."],
  crewSpot: ["Watchers!", "It's the Watch!", "Tell Vesper!", "Benton's cats!"],
  flee: ["Get the car!", "Not today, Benton!", "Cover me!"],
  purr: ["Purrrr...", "Whatever you say.", "Lead the way.", "Mrrrp."],
  panic: ["Eek!", "Run!", "Mrrrow!", "Hsss!"],
};

let unitId = 1;
W.makeUnit = (kind, x, y, o = {}) => {
  const K = W.KINDS[kind === "guard" ? "guard" : kind];
  const faction = { agent: "player", civ: "civ", sec: "sec", crew: "crew", guard: "crew", target: "crew" }[kind];
  const u = Object.assign({
    id: unitId++, kind: kind === "guard" ? "crew" : kind, guard: kind === "guard", faction,
    isAgent: kind === "agent",
    x, y, dir: o.dir ?? Math.random() * Math.PI * 2,
    hp: K.hp, maxHp: K.hp, alive: true,
    weapons: [], cur: -1, cd: 0, flash: 0,
    path: null, moving: false, anim: Math.random() * 6, stuckT: 0, lastX: x, lastY: y,
    state: "idle", stateT: 0, thinkT: Math.random() * 0.3,
    target: null, manual: null, aimT: 0, seen: null,
    say: null, follower: false, leader: null,
    hostile: false, angryAt: { player: false, crew: false }, warnT: 0, calmT: 0,
    react: K.react, sight: K.sight, baseSpeed: K.speed * (o.speedMul || 1), acc: K.acc, armor: K.armor || 1,
  }, o);
  if (!u.look) u.look = W.lookFor(kind);
  return u;
};

W.lookFor = kind => {
  const fur = W.pick(W.FURS);
  switch (kind) {
    case "civ": { const coat = W.pick(W.CIV_COATS); return { coat, trim: W.shade(coat, 1.3), legs: W.pick(["#22252e", "#3a3a48", "#2a3040", "#4a3a30"]), fur, patch: W.chance(0.3) ? W.pick(W.FURS) : null }; }
    case "sec": return { coat: "#28469a", trim: "#ffd04a", legs: "#1a2a5a", fur, hat: "#16285c", hatKind: "cap" };
    case "crew": { const coat = W.pick(["#6b1f2e", "#5a1a28", "#7a2436", "#4a1622"]); return { coat, trim: "#ff5266", legs: "#1a1416", fur, eyes: "#ffd04a" }; }
    case "guard": return { coat: "#14141a", trim: "#ff3048", legs: "#0d0d10", fur: W.pick(["#3a3330", "#5a4a40", "#7c7c84"]), visor: "#ff3048", long: true };
    case "target": return { coat: "#d8d4c8", trim: "#ffb000", legs: "#bcb6a8", fur: "#1a1a1e", hat: "#e8e4dc", eyes: "#ffd04a", long: true };
  }
  return { coat: "#1b2130", trim: "#54f2ff", legs: "#10131c", fur, visor: "#54f2ff", long: true };
};

W.giveWeapon = (u, type, ammo) => {
  const def = W.WEAPONS[type];
  const have = u.weapons.find(w => w.type === type);
  if (have) { if (have.ammo != null) have.ammo += ammo ?? def.ammo ?? 0; return have; }
  const w = { type, ammo: ammo !== undefined ? ammo : def.ammo };
  u.weapons.push(w);
  return w;
};
W.curWeapon = u => u.cur >= 0 ? u.weapons[u.cur] : null;
W.curDef = u => { const w = W.curWeapon(u); return w ? W.WEAPONS[w.type] : null; };
W.armed = u => { const d = W.curDef(u); return !!(d && d.gun); };
W.hasGun = u => u.weapons.some(w => W.WEAPONS[w.type].gun && (w.ammo == null || w.ammo > 0));
W.drawBest = u => {
  // NPCs draw their best loaded gun
  let best = -1, score = -1;
  u.weapons.forEach((w, i) => { const d = W.WEAPONS[w.type]; if (d.gun && (w.ammo == null || w.ammo > 0)) { const s = d.dmg * (d.pellets || 1) / d.cd; if (s > score) { score = s; best = i; } } });
  u.cur = best; u.weaponOut = best >= 0;
};

W.say = (u, text, color, t = 2.2) => { u.say = { text, color, t }; };

/* ---- the stims: Zoomers, Red Dot, Silvervine ----
 * Each Watcher has a level per stim, set by the player. Above the midpoint a
 * dose burns off slowly and builds a dependency that eats into the effect. */
W.STIMS = [
  { id: "zoom", name: "Zoomers", short: "ZOOM", what: "speed and rate of fire" },
  { id: "dot", name: "Red Dot", short: "DOT", what: "aim and sight" },
  { id: "vine", name: "Silvervine", short: "VINE", what: "reflexes and initiative" },
];
W.stimTick = (u, dt) => {
  for (const s of W.STIMS) {
    const st = u.ipa[s.id];
    if (st.lvl > 0.5) { st.dep += (st.lvl - 0.5) * 0.035 * dt; st.lvl = Math.max(0.5, st.lvl - 0.012 * dt); }
    st.dep = Math.max(0, st.dep - 0.004 * dt);
    st.eff = W.clamp(st.lvl - st.dep * 0.6, 0, 1);
  }
};
W.eff = (u, id) => u.ipa ? u.ipa[id].eff : 0.5;

W.speedOf = u => {
  let s = u.baseSpeed;
  if (u.isAgent) s *= 0.75 + 0.6 * W.eff(u, "zoom");
  if (u.state === "panic") s = 2.5;
  if (u.state === "flee") s *= 1.25;
  if (u.follower && !u.isAgent && u.leader) s = Math.max(s, u.leader.alive ? Math.min(W.speedOf(u.leader), 2.6) : s);
  if (u.hp < u.maxHp * 0.3) s *= 0.8;
  return s;
};

/* ---- hostility ---- */
/* Does a want to shoot b? */
W.hostileTo = (world, a, b) => {
  if (!b.alive || a === b || b.inCar || a.faction === b.faction) return false;
  switch (a.faction) {
    case "player":
      if (b.faction === "crew") return b.hostile || (b.kind === "target" && world.alarm);
      if (b.faction === "sec") return b.angryAt.player;
      return false;
    case "crew": return (b.faction === "player" && a.hostile) || (b.faction === "sec" && a.angryAt.sec);
    case "sec": return (b.faction === "player" && a.angryAt.player) || (b.faction === "crew" && a.angryAt.crew);
  }
  return false;
};

W.canSee = (world, a, b, range) => {
  const d = W.dist(a.x, a.y, b.x, b.y);
  return d <= range && world.map.los(a.x, a.y, b.x, b.y);
};

/* ---- orders ---- */
W.goTo = (world, u, x, y, opts = {}) => {
  const p = world.map.path(u.x, u.y, x, y, opts.avoidRoad);
  u.path = p && p.length ? p : null;
  u.dest = u.path ? u.path[u.path.length - 1] : null;
  u.stuckT = 0;
  return !!u.path;
};
W.stop = u => { u.path = null; u.dest = null; };

/* ---- movement, every tick ---- */
W.moveUnit = (world, u, dt) => {
  u.moving = false;
  if (!u.path) return;
  const m = world.map;
  const [tx, ty] = u.path[0];
  const dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy);
  if (d < 0.06) {
    u.path.shift();
    if (!u.path.length) { u.path = null; u.dest = null; }
    return;
  }
  const sp = W.speedOf(u), step = Math.min(d, sp * dt);
  const nx = u.x + dx / d * step, ny = u.y + dy / d * step;
  if (m.walkable(nx, ny)) { u.x = nx; u.y = ny; }
  else if (m.walkable(nx, u.y)) u.x = nx;
  else if (m.walkable(u.x, ny)) u.y = ny;
  if (!u.facingLock) u.dir = Math.atan2(dy, dx);
  u.moving = true;
  u.anim += dt * sp * 7;
  // stuck? try again from here
  u.stuckT += dt;
  if (u.stuckT > 0.8) {
    if (W.dist(u.x, u.y, u.lastX, u.lastY) < 0.15 && u.dest) W.goTo(world, u, u.dest[0], u.dest[1]);
    u.stuckT = 0; u.lastX = u.x; u.lastY = u.y;
  }
};

/* Bodies push each other apart a little, never into walls. */
W.separate = (world, dt) => {
  const us = world.units, m = world.map;
  for (let i = 0; i < us.length; i++) {
    const a = us[i];
    if (!a.alive || a.inCar) continue;
    for (let j = i + 1; j < us.length; j++) {
      const b = us[j];
      if (!b.alive || b.inCar) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) > 0.45 || Math.abs(dy) > 0.45) continue;
      const d = Math.hypot(dx, dy) || 0.01;
      if (d >= 0.42) continue;
      const push = (0.42 - d) * 0.5, ux = dx / d * push, uy = dy / d * push;
      // the one standing still gives way more
      const wa = a.moving && !b.moving ? 0.3 : !a.moving && b.moving ? 0.7 : 0.5;
      const ax = a.x - ux * wa * 2, ay = a.y - uy * wa * 2, bx = b.x + ux * (1 - wa) * 2, by = b.y + uy * (1 - wa) * 2;
      if (m.walkable(ax, ay)) { a.x = ax; a.y = ay; }
      if (m.walkable(bx, by)) { b.x = bx; b.y = by; }
    }
  }
};

/* ---- firing ---- */
W.tryFire = (world, u, tx, ty, victim) => {
  const w = W.curWeapon(u), def = W.curDef(u);
  if (!def || !def.gun || u.cd > 0) return false;
  if (w.ammo != null && w.ammo <= 0) {
    // dry: NPCs switch, Watchers say so once
    if (!u.isAgent) W.drawBest(u);
    else if (!u.dryT) { world.msg(`${u.name}: ${def.name} is empty.`, "#ffb000"); u.dryT = 3; W.audio.play("deny"); }
    return false;
  }
  if (w.ammo != null) w.ammo--;
  let cd = def.cd;
  if (u.isAgent) cd *= 1.15 - 0.3 * W.eff(u, "zoom");
  u.cd = cd;
  u.dir = Math.atan2(ty - u.y, tx - u.x);
  u.flash = 0.07;
  world.stats.shots += u.isAgent ? 1 : 0;
  W.audio.at(def.sound, u.x, u.y);
  const d = W.dist(u.x, u.y, tx, ty);
  let acc = def.acc * u.acc;
  if (u.isAgent) acc *= 0.8 + 0.4 * W.eff(u, "dot");
  const fall = 1 - 0.45 * W.clamp(d / def.range, 0, 1.4);
  const mz = 12; // muzzle height
  for (let p = 0; p < (def.pellets || 1); p++) {
    let ang = Math.atan2(ty - u.y, tx - u.x);
    if (def.spread) ang += W.rand(-def.spread, def.spread) * 0.5;
    let chance = acc * fall * (u.moving ? 0.8 : 1) * (victim && victim.moving ? 0.85 : 1);
    if (victim && victim.isCar) chance = 0.9;
    chance = W.clamp(chance, 0.05, 0.95);
    let ex, ey, ez = 8, hit = null;
    if (victim && Math.random() < chance) {
      hit = victim;
      ex = victim.x + W.rand(-0.12, 0.12); ey = victim.y + W.rand(-0.12, 0.12); ez = victim.isCar ? 5 : W.rand(6, 14);
    } else {
      // a miss: off to one side and on past the aim point
      const r = Math.max(d, 1.5) + W.rand(0.5, 3);
      const off = W.rand(-0.35, 0.35) * (victim ? 1 : 0.5);
      ex = u.x + Math.cos(ang + off) * r; ey = u.y + Math.sin(ang + off) * r; ez = W.rand(0, 10);
      // anyone near the line of the stray round may catch it
      const sx = u.x, sy = u.y, lx = ex - sx, ly = ey - sy, L2 = lx * lx + ly * ly;
      let best = null, bt = 2;
      for (const o of world.units) {
        if (!o.alive || o === u || o === victim || o.inCar) continue;
        const t = ((o.x - sx) * lx + (o.y - sy) * ly) / L2;
        if (t <= 0.05 || t >= 1) continue;
        const px = sx + lx * t, py = sy + ly * t;
        if ((o.x - px) ** 2 + (o.y - py) ** 2 < 0.06 && t < bt) { bt = t; best = o; }
      }
      if (best && Math.random() < 0.55) { hit = best; ex = best.x; ey = best.y; ez = 10; }
      // walls stop it
      const wall = world.map.rayHit(u.x, u.y, ex, ey);
      if (wall && (!hit || W.dist(u.x, u.y, wall[0], wall[1]) < W.dist(u.x, u.y, ex, ey))) {
        hit = null; ex = wall[0]; ey = wall[1];
        world.spark(ex, ey, ez, "#ffd27a", 3);
        if (Math.random() < 0.3) W.audio.at("ric", ex, ey, 0.6);
      }
    }
    world.tracer(u.x + Math.cos(ang) * 0.3, u.y + Math.sin(ang) * 0.3, mz, ex, ey, ez, def.tracer);
    if (hit) {
      if (hit.isCar) world.damageCar(hit, def.dmg, u);
      else world.damage(hit, def.dmg, u);
    }
  }
  world.noise(u.x, u.y, 9, u);
  return true;
};

/* ---- the Purrsuader ---- */
W.squadFollowers = world => world.units.filter(o => o.alive && o.follower && !o.isAgent).length;
W.canPersuade = (world, agent, t) => {
  if (!t.alive || t.inCar || t.faction === "player" || t.isAgent) return false;
  const need = t.kind === "target" ? Infinity : t.kind === "crew" ? (t.guard ? 6 : W.PERSUADE_NEED.crew) : W.PERSUADE_NEED[t.kind];
  return need !== undefined && W.squadFollowers(world) >= need;
};
W.persuade = (world, agent, t) => {
  t.faction = "player"; t.follower = true; t.leader = agent;
  t.hostile = false; t.angryAt = { player: false, crew: false, sec: false };
  t.state = "follow"; t.target = null; t.manual = null; t.path = null;
  if (t.kind === "civ") { t.weaponOut = false; t.cur = -1; }
  W.say(t, W.pick(W.LINES.purr), "#54f2ff");
  W.audio.at("persuaded", t.x, t.y);
  world.stats.recruited++;
  world.spark(t.x, t.y, 18, "#54f2ff", 6);
};

/* ---- thinking ---- */
W.think = (world, u, dt) => {
  if (u.isAgent) return W.thinkAgent(world, u);
  if (u.follower) return W.thinkFollower(world, u);
  switch (u.kind) {
    case "civ": return W.thinkCiv(world, u);
    case "sec": return W.thinkSec(world, u);
    case "crew": return W.thinkCrew(world, u);
    case "target": return W.thinkTarget(world, u);
  }
};

/* the nearest unit a wants to shoot, that a can see */
W.nearestFoe = (world, a, range) => {
  let best = null, bd = Infinity;
  for (const b of world.units) {
    if (!W.hostileTo(world, a, b)) continue;
    const d = W.dist(a.x, a.y, b.x, b.y);
    if (d < bd && d <= range && world.map.los(a.x, a.y, b.x, b.y)) { bd = d; best = b; }
  }
  return best;
};

/* Fire at a target in range, or close in. Shared by everyone with a gun. */
W.engage = (world, u, foe, chase = true) => {
  const def = W.curDef(u);
  if (!def || !def.gun) return false;
  const d = W.dist(u.x, u.y, foe.x, foe.y);
  const see = world.map.los(u.x, u.y, foe.x, foe.y);
  if (see && d <= def.range) {
    if (u.target !== foe) { u.target = foe; u.aimT = u.react * W.rand(0.8, 1.2); }
    u.seen = [foe.x, foe.y];
    if (!u.isAgent && d < def.range * 0.8) W.stop(u);
    return true;
  }
  if (chase && (!u.path || u.chaseT <= 0)) {
    W.goTo(world, u, foe.x, foe.y);
    u.chaseT = 1.2;
  }
  return false;
};

W.thinkAgent = (world, u) => {
  const def = W.curDef(u);
  // medikit: use it now, then put the gun back
  if (def && def.heal) {
    const w = W.curWeapon(u);
    u.hp = u.maxHp; w.ammo--;
    W.audio.play("heal");
    world.msg(`${u.name} patched up.`, "#4ade6a");
    world.spark(u.x, u.y, 14, "#4ade6a", 8);
    let prev = u.prevCur != null && u.prevCur !== u.cur ? u.prevCur : -1;
    if (w.ammo <= 0) { u.weapons.splice(u.cur, 1); if (prev > u.cur) prev--; }
    u.cur = prev < u.weapons.length ? prev : -1;
    u.prevCur = null;
    u.weaponOut = u.cur >= 0;
    return;
  }
  // auto-medikit on a high Silvervine dose
  if (u.hp < u.maxHp * 0.3 && W.eff(u, "vine") > 0.7) {
    const k = u.weapons.findIndex(w => w.type === "medikit");
    if (k >= 0) { u.prevCur = u.cur; u.cur = k; return; }
  }
  // the Purrsuader works on whoever wanders into range
  if (def && W.curWeapon(u).type === "purrsuader") {
    if (u.cd <= 0) {
      const m = u.manual && u.manual.alive && u.manual.faction !== "player" ? u.manual : null;
      let pick = null, bd = Infinity;
      for (const t of m ? [m] : world.units) {
        if (!W.canPersuade(world, u, t)) continue;
        const d = W.dist(u.x, u.y, t.x, t.y);
        if (d <= def.range && d < bd && world.map.los(u.x, u.y, t.x, t.y)) { bd = d; pick = t; }
      }
      if (pick) {
        u.cd = def.cd; u.dir = Math.atan2(pick.y - u.y, pick.x - u.x);
        W.audio.at("purr", u.x, u.y, 0.8);
        W.persuade(world, u, pick);
        if (u.manual === pick) u.manual = null;
      } else if (m) {
        if (!W.canPersuade(world, u, m)) {
          if (!u.denyT) { world.msg(`${u.name}: need ${m.kind === "sec" ? W.PERSUADE_NEED.sec : m.guard ? 6 : W.PERSUADE_NEED.crew} followers to work on that one.`, "#ffb000"); u.denyT = 3; W.audio.play("deny"); }
          u.manual = null;
        } else if (!u.path || u.chaseT <= 0) { W.goTo(world, u, m.x, m.y); u.chaseT = 1; }
      }
    }
    return;
  }
  if (!def || !def.gun) { u.target = null; return; }
  // an ordered target: fire when it is in range and in sight, close in when not
  let m = u.manual;
  if (m && (m.isCar ? m.dead : !m.alive || m.faction === "player")) { u.manual = m = null; u.target = null; }
  if (m) {
    const d = W.dist(u.x, u.y, m.x, m.y);
    if (d <= def.range && world.map.los(u.x, u.y, m.x, m.y)) {
      if (u.target !== m) { u.target = m; u.aimT = 0.15; }
      W.stop(u);
      return;
    }
    if (!u.path || u.chaseT <= 0) { W.goTo(world, u, m.x, m.y); u.chaseT = 1; }
  }
  // on the way, or with no orders: anyone shooting at us, if Silvervine lets
  // them think for themselves
  const vine = W.eff(u, "vine");
  if (vine < 0.15) { u.target = null; return; }
  const range = def.range + W.eff(u, "dot") * 1.5;
  const foe = W.nearestFoe(world, u, range);
  if (foe) {
    if (u.target !== foe) { u.target = foe; u.aimT = Math.max(0.12, 0.95 - 0.65 * vine - 0.2 * W.eff(u, "dot")); }
  } else u.target = null;
};

W.thinkFollower = (world, u) => {
  if (!u.leader || !u.leader.alive) {
    const ags = world.units.filter(a => a.isAgent && a.alive);
    u.leader = ags.length ? ags.reduce((a, b) => W.dist(u.x, u.y, a.x, a.y) < W.dist(u.x, u.y, b.x, b.y) ? a : b) : null;
    if (!u.leader) { u.follower = false; u.state = "idle"; return; }
  }
  // armed followers fight
  if (!W.armed(u) && W.hasGun(u)) W.drawBest(u);
  if (W.armed(u)) {
    const foe = W.nearestFoe(world, u, W.curDef(u).range);
    if (foe) { W.engage(world, u, foe, false); }
    else u.target = null;
  } else {
    // unarmed: go for a gun lying nearby
    const it = world.items.filter(i => W.WEAPONS[i.type].gun && W.dist(u.x, u.y, i.x, i.y) < 7).sort((a, b) => W.dist(u.x, u.y, a.x, a.y) - W.dist(u.x, u.y, b.x, b.y))[0];
    if (it) { if (!u.path) W.goTo(world, u, it.x, it.y); return; }
  }
  const L = u.leader, d = W.dist(u.x, u.y, L.x, L.y);
  if (d > 2.2 && (!u.path || (u.dest && W.dist(u.dest[0], u.dest[1], L.x, L.y) > 1.6))) {
    const a = (u.id * 2.4) % (Math.PI * 2);
    W.goTo(world, u, L.x + Math.cos(a) * 1.1, L.y + Math.sin(a) * 1.1);
  }
};

W.thinkCiv = (world, u) => {
  if (u.state === "panic") {
    if (u.stateT <= 0) { u.state = "idle"; u.stateT = W.rand(1, 3); W.stop(u); }
    else if (!u.path && u.fear) {
      const a = Math.atan2(u.y - u.fear[1], u.x - u.fear[0]) + W.rand(-0.7, 0.7);
      W.goTo(world, u, u.x + Math.cos(a) * 9, u.y + Math.sin(a) * 9);
    }
    return;
  }
  if (u.path) return;
  if (u.state === "idle") {
    if (u.stateT > 0) return;
    // somewhere to be: mostly pavement, crossing roads where they must
    const R = 12;
    for (let k = 0; k < 8; k++) {
      const x = u.x + W.rand(-R, R), y = u.y + W.rand(-R, R);
      const g = world.map.groundAt(x, y);
      if (g === W.G.WALK || g === W.G.PLAZA || (u.roam === "any" && g === W.G.ALLEY)) {
        if (W.goTo(world, u, x, y, { avoidRoad: true })) { u.state = "walk"; break; }
      }
    }
    u.stateT = W.rand(1.5, 6);
  } else if (u.state === "walk") {
    u.state = "idle"; u.stateT = W.rand(1, 5);
  }
};

W.secCall = (world, u, who) => {
  if (u.angryAt[who]) return;
  u.angryAt[who] = true; u.calmT = 20;
  if (!W.armed(u)) W.drawBest(u);
  W.say(u, W.pick(W.LINES.secAngry), "#7aa8ff");
  W.audio.at("whistle", u.x, u.y);
  // the radio: nearby officers join in
  for (const o of world.units) if (o.alive && o.kind === "sec" && !o.follower && o !== u && W.dist(u.x, u.y, o.x, o.y) < 16 && !o.angryAt[who]) {
    o.angryAt[who] = true; o.calmT = 20; W.drawBest(o);
  }
  if (who === "player") world.msg("PLAZA SECURITY: Officer needs backup!", "#7aa8ff");
};

W.thinkSec = (world, u) => {
  const angry = u.angryAt.player || u.angryAt.crew;
  if (angry) {
    const foe = W.nearestFoe(world, u, u.sight);
    if (foe) { u.calmT = 20; W.engage(world, u, foe, true); return; }
    u.target = null;
    if (u.calmT <= 0) {
      u.angryAt.player = false; u.angryAt.crew = false; u.weaponOut = false; u.cur = -1;
      W.say(u, W.pick(W.LINES.secCalm), "#94a0c4");
    } else if (u.seen && !u.path) { W.goTo(world, u, u.seen[0], u.seen[1]); u.seen = null; }
    return;
  }
  // a Watcher with a gun out, in plain view: a warning, then trouble
  let armed = null;
  for (const o of world.units) {
    if (o.alive && o.faction === "player" && W.armed(o) && W.canSee(world, u, o, 8)) { armed = o; break; }
  }
  if (armed) {
    u.dir = Math.atan2(armed.y - u.y, armed.x - u.x);
    if (u.warnT <= 0 && !u.warned) {
      u.warned = true; u.warnT = 3.2; W.stop(u);
      W.say(u, W.pick(W.LINES.warn), "#ffb000", 3);
      W.audio.at("whistle", u.x, u.y);
    } else if (u.warned && u.warnT <= 0) {
      W.secCall(world, u, "player");
    }
    return;
  }
  if (u.warned && u.warnT <= -2) u.warned = false;
  // patrol
  if (!u.path && u.stateT <= 0) {
    const route = u.patrol;
    if (route && route.length) {
      u.patrolI = ((u.patrolI ?? -1) + 1) % route.length;
      W.goTo(world, u, route[u.patrolI][0], route[u.patrolI][1]);
    } else {
      const p = world.map.randomCell((x, y, g) => g === W.G.PLAZA || g === W.G.WALK);
      if (p && W.dist(p[0], p[1], u.home[0], u.home[1]) < 10) W.goTo(world, u, p[0], p[1], { avoidRoad: true });
    }
    u.stateT = W.rand(2, 5);
  }
};

W.thinkCrew = (world, u) => {
  if (!u.hostile) {
    // who can they see? An armed Watcher at range, anyone of ours up close
    for (const o of world.units) {
      if (!o.alive || o.faction !== "player" || o.inCar) continue;
      const r = world.alarm ? u.sight + 2 : W.armed(o) ? u.sight : 3.2;
      if (W.canSee(world, u, o, r)) {
        u.hostile = true; W.drawBest(u);
        W.say(u, W.pick(W.LINES.crewSpot), "#ff5266");
        world.raiseAlarm(u, o);
        break;
      }
    }
    if (!u.hostile) {
      if (u.patrol && !u.path && u.stateT <= 0) {
        u.patrolI = ((u.patrolI ?? -1) + 1) % u.patrol.length;
        W.goTo(world, u, u.patrol[u.patrolI][0], u.patrol[u.patrolI][1]);
        u.stateT = W.rand(2, 4);
      } else if (!u.patrol && u.post && !u.path && W.dist(u.x, u.y, u.post[0], u.post[1]) > 0.5) {
        W.goTo(world, u, u.post[0], u.post[1]);
      } else if (!u.path && u.post && u.post[2] != null) u.dir = u.post[2];
      return;
    }
  }
  if (!W.armed(u)) W.drawBest(u);
  const foe = W.nearestFoe(world, u, u.sight + 2);
  if (foe) { W.engage(world, u, foe, true); return; }
  u.target = null;
  // bodyguards stick with the boss
  if (u.guard && world.targetUnit && world.targetUnit.alive && !world.targetUnit.inCar) {
    const T = world.targetUnit;
    if (W.dist(u.x, u.y, T.x, T.y) > 2 && (!u.path || u.chaseT <= 0)) { W.goTo(world, u, T.x + W.rand(-1, 1), T.y + W.rand(-1, 1)); u.chaseT = 1; }
    return;
  }
  // hunt: the last place they saw one of us, or where the alarm came from
  const spot = u.seen || world.alarmAt;
  if (spot && (!u.path || u.chaseT <= 0) && W.dist(u.x, u.y, spot[0], spot[1]) > 1.5) {
    W.goTo(world, u, spot[0] + W.rand(-1.5, 1.5), spot[1] + W.rand(-1.5, 1.5)); u.chaseT = 2.5;
  } else if (spot && W.dist(u.x, u.y, spot[0], spot[1]) <= 1.5) { u.seen = null; }
};

W.thinkTarget = (world, u) => {
  const car = world.escapeCar;
  if (u.state === "flee") {
    if (car && !car.dead) {
      if (W.dist(u.x, u.y, car.door[0], car.door[1]) < 0.9) { world.boardEscape(u, car); return; }
      if (!u.path || u.chaseT <= 0) { W.goTo(world, u, car.door[0], car.door[1]); u.chaseT = 1.5; }
    } else if (!u.path) {
      // no car: run from the nearest Watcher
      const ag = world.units.filter(a => a.isAgent && a.alive);
      const near = ag.sort((a, b) => W.dist(u.x, u.y, a.x, a.y) - W.dist(u.x, u.y, b.x, b.y))[0];
      if (near) { const a = Math.atan2(u.y - near.y, u.x - near.x) + W.rand(-0.8, 0.8); W.goTo(world, u, u.x + Math.cos(a) * 10, u.y + Math.sin(a) * 10); }
    }
    // he shoots back if cornered
    if (W.hasGun(u)) { if (!W.armed(u)) W.drawBest(u); const foe = W.nearestFoe(world, u, 5); if (foe) W.engage(world, u, foe, false); }
    return;
  }
  // the alarm: a moment to take it in, then he runs
  if (u.state === "alerted") {
    if (u.stateT <= 0) {
      u.state = "flee";
      W.say(u, W.pick(W.LINES.flee), "#ffb000", 2.5);
      world.msg("VESPER SLY is making a run for his car!", "#ffb000");
    }
    return;
  }
  if (world.alarm || u.hp < u.maxHp) {
    u.state = "alerted"; u.hostile = true; u.stateT = u.hp < u.maxHp ? 0.6 : 2.2;
    W.say(u, "What was that?", "#ffb000", 1.8);
    return;
  }
  if (u.post && !u.path && W.dist(u.x, u.y, u.post[0], u.post[1]) > 0.4) W.goTo(world, u, u.post[0], u.post[1]);
  else if (!u.path && u.post) u.dir = u.post[2] ?? u.dir;
};

/* ---- the tick ---- */
W.updateUnit = (world, u, dt) => {
  if (!u.alive || u.inCar) return;
  u.cd -= dt; u.flash -= dt; u.stateT -= dt; u.warnT -= dt; u.calmT -= dt; u.chaseT = (u.chaseT || 0) - dt;
  if (u.dryT) u.dryT = Math.max(0, u.dryT - dt);
  if (u.denyT) u.denyT = Math.max(0, u.denyT - dt);
  if (u.say) { u.say.t -= dt; if (u.say.t <= 0) u.say = null; }
  if (u.isAgent) {
    W.stimTick(u, dt);
    if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + 0.12 * dt);
  }
  u.thinkT -= dt;
  if (u.thinkT <= 0) { u.thinkT = 0.18 + Math.random() * 0.1; W.think(world, u, dt); }
  // aim, then fire while there is a target in range
  u.facingLock = false;
  const T = u.target;
  if (T && (T.isCar ? !T.dead : T.alive && !T.inCar)) {
    const def = W.curDef(u);
    if (def && def.gun) {
      const d = W.dist(u.x, u.y, T.x, T.y);
      u.aimT -= dt;
      if (d <= def.range + 0.5) {
        u.facingLock = true;
        u.dir = Math.atan2(T.y - u.y, T.x - u.x);
        if (u.aimT <= 0 && world.map.los(u.x, u.y, T.x, T.y)) W.tryFire(world, u, T.x, T.y, T);
      }
    }
  } else if (T) { u.target = null; if (u.manual === T) u.manual = null; }
  // an order to shoot at a spot on the ground
  if (u.shootAt && u.isAgent) {
    if (W.armed(u)) { u.facingLock = true; if (W.tryFire(world, u, u.shootAt[0], u.shootAt[1], null)) u.shootAt = null; }
    else u.shootAt = null;
  }
  W.moveUnit(world, u, dt);
  // walking over a dropped weapon picks it up
  if ((u.isAgent || u.follower) && world.items.length) {
    for (let i = world.items.length - 1; i >= 0; i--) {
      const it = world.items[i];
      if (W.dist(u.x, u.y, it.x, it.y) > 0.55) continue;
      if (!u.isAgent && u.weapons.some(w => W.WEAPONS[w.type].gun)) continue;
      if (u.weapons.length >= 8 && !u.weapons.some(w => w.type === it.type)) continue;
      W.giveWeapon(u, it.type, it.ammo);
      world.items.splice(i, 1);
      W.audio.at("pickup", u.x, u.y);
      if (u.isAgent) world.msg(`${u.name} picked up ${W.WEAPONS[it.type].name}${it.ammo != null ? ` (${it.ammo})` : ""}.`, "#dbe4fb");
      else W.drawBest(u);
    }
  }
};
