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

/* The enemy by level, 0 to 4 (a mission's threat less one), matched to the
 * Watchers' levels: 0 the squad Casey hands over, 1 to 3 a full suite of MK1,
 * MK2 or MK3 kit, 4 the top of the tree. Enemies stay weaker one for one (the
 * Watchers have stims, chassis and reflexes) and make it up in numbers. What
 * they carry is what they drop: a higher level is more dangerous and pays
 * better to put down. guns: "type:mark", picked evenly; armed: the share
 * carrying anything; hp, acc, react: against their kind's numbers. */
W.FOE = [
  { guns: ["pistol:1"], armed: 0.3, hp: 1, acc: 1, react: 1 },
  { guns: ["pistol:1", "pistol:1", "shotgun:1", "uzi:1"], armed: 0.7, hp: 1.1, acc: 1, react: 1 },
  { guns: ["pistol:2", "shotgun:2", "uzi:2", "uzi:2", "longrange:1"], armed: 1, hp: 1.25, acc: 1.05, react: 0.95 },
  { guns: ["shotgun:3", "uzi:3", "longrange:2", "minigun:2", "laser:1"], armed: 1, hp: 1.45, acc: 1.1, react: 0.9 },
  { guns: ["uzi:3", "longrange:3", "minigun:3", "laser:2", "minigun:3", "longrange:3", "gauss:1"], armed: 1, hp: 1.5, acc: 1.1, react: 0.85 },
];
/* the enemy level a mission is fought at: the campaign's (L.mod.level), else
 * its threat less one, else the district's usual strength (level 2) */
W.foeLevel = L => W.clamp(L.mod && L.mod.level != null ? L.mod.level : L.mission ? L.mission.threat - 1 : 2, 0, W.FOE.length - 1);
/* Fit u out as an enemy of a level: body, aim, reflexes, and (if armed) a gun
 * from the level's racks; a bodyguard (role "guard") a level up, with a
 * sidearm. R: the seeded random to pick with. */
W.kitFoe = (u, level, armed, R, role) => {
  const F = W.FOE[W.clamp(level + (role === "guard" ? 1 : 0), 0, W.FOE.length - 1)];
  u.maxHp = u.hp = Math.round(u.maxHp * F.hp * 10) / 10;
  u.acc *= F.acc; u.react *= F.react; u.foeLevel = level;
  if (armed) {
    const [type, mk] = F.guns[Math.floor(R() * F.guns.length)].split(":");
    W.giveWeapon(u, type, undefined, +mk);
    if (role === "guard" && type !== "pistol") W.giveWeapon(u, "pistol", undefined, Math.min(3, +mk));
  }
  return u;
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
  if (!u.look.species) u.look = W.withSpecies(u.look, W.speciesFor(kind));
  return u;
};

/* Who the city is: cat-folk mostly, with wolves and horses among them. The
 * Watchers and the named targets are cats. Looks only: a species changes the
 * drawing, never the numbers. */
W.SPECIES_MIX = {
  civ:   { cat: 0.5, wolf: 0.3, horse: 0.2 },
  sec:   { cat: 0.4, wolf: 0.35, horse: 0.25 },
  crew:  { cat: 0.45, wolf: 0.35, horse: 0.2 },
  guard: { cat: 0.2, wolf: 0.35, horse: 0.45 },
};
W.WOLF_FURS = ["#7c7c84", "#9a948a", "#5a5a60", "#b8b2a6", "#3a3a3e", "#8a7a64", "#d9d3c7", "#6a5a4a"];
// a horse's coat and the mane and tail that go with it: bay, chestnut, black, grey, palomino, dun, white
W.HORSE_COATS = [["#6a3a22", "#1a1414"], ["#4a2c1e", "#141010"], ["#8a4a2a", "#5a2a16"], ["#2a2422", "#141010"],
  ["#9a9a9a", "#4a4a4e"], ["#d8b46a", "#f0ead8"], ["#b08a5a", "#2a2018"], ["#e2ddd2", "#b8b2a6"]];
W.speciesFor = kind => {
  const mix = W.SPECIES_MIX[kind];
  if (!mix) return "cat";
  let r = Math.random();
  for (const s in mix) if ((r -= mix[s]) < 0) return s;
  return "cat";
};
/* A look with a species' body on it: fur (and a horse's mane) to suit; clothes stay. */
W.withSpecies = (look, species) => {
  const L = Object.assign({}, look, { species });
  if (species === "wolf") L.fur = W.pick(W.WOLF_FURS);
  else if (species === "horse") { const [fur, mane] = W.pick(W.HORSE_COATS); L.fur = fur; L.mane = mane; }
  return L;
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

W.giveWeapon = (u, type, ammo, mk) => {
  const def = W.WEAPONS[type];
  const have = u.weapons.find(w => w.type === type);
  if (have) { if (have.ammo != null) have.ammo += ammo ?? def.ammo ?? 0; if (mk > (have.mk || 1)) have.mk = mk; return have; }
  const w = { type, ammo: ammo !== undefined ? ammo : def.ammo };
  if (mk > 1) w.mk = mk;
  u.weapons.push(w);
  return w;
};
W.curWeapon = u => u.cur >= 0 ? u.weapons[u.cur] : null;
W.curDef = u => { const w = W.curWeapon(u); return w ? W.WEAPONS[w.type] : null; };
/* A weapon's mark (the campaign's mk, 1 to 3): each over MK1 hits a quarter
 * harder and reaches a sixth further. */
W.MARK = { dmg: 0.25, range: 0.15 };
W.markOf = w => (w && w.mk) || 1;
W.rangeOf = u => { const d = W.curDef(u); return d ? d.range * (1 + W.MARK.range * (W.markOf(W.curWeapon(u)) - 1)) : 0; };
W.dmgOf = u => { const d = W.curDef(u); return d ? (d.dmg || 0) * (1 + W.MARK.dmg * (W.markOf(W.curWeapon(u)) - 1)) : 0; };
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
    if (st.lvl > 0.5) { st.dep += (st.lvl - 0.5) * 0.035 * (1 - 0.25 * W.mod(u, "heart")) * dt; st.lvl = Math.max(0.5, st.lvl - 0.012 * dt); }
    st.dep = Math.max(0, st.dep - 0.004 * dt);
    st.eff = W.clamp(st.lvl - st.dep * 0.6, 0, 1);
  }
};
W.eff = (u, id) => u.ipa ? u.ipa[id].eff : 0.5;

W.speedOf = u => {
  let s = u.baseSpeed;
  if (u.isAgent) {
    s *= (0.75 + 0.6 * W.eff(u, "zoom")) * (1 + 0.12 * W.mod(u, "legs"));
    const d = W.curDef(u);
    if (d && d.heavy && W.mod(u, "arms") < 1) s *= 0.8;
  }
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
      // a Watcher sent in with E (aggressive) shoots the crew on sight, made or not; plain
      // clothes fool them, unless the scanner has marked the gun or the crew member shows their hand
      if (b.faction === "crew") return b.hostile || (a.aggressive && !b.broken && (!b.undercover || b.revealed || W.scanArmed(world, b))) || (b.kind === "target" && world.markAlarm);
      if (b.faction === "sec") return b.angryAt.player;
      return false;
    // (a persuade job's subject, gone over to us, they want back alive: they go for the Watchers instead)
    case "crew": return (b.faction === "player" && a.hostile && !b.subject) || (b.faction === "sec" && a.angryAt.sec);
    // (nor do the police shoot at a persuade job's subject: to them it's a citizen caught up in it)
    case "sec": return (b.faction === "player" && a.angryAt.player && !b.subject) || (b.faction === "crew" && a.angryAt.crew);
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
  if (u.pushedT > 0) { u.pushedT -= dt; return; }   // a train's push field has them (World.trainPush)
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
  // nobody walks into traffic: wait at the kerb, or beside the train, until it is clear
  if ((W.inTrafficWay(world, u, nx, ny) && !W.inTrafficWay(world, u, u.x, u.y)) || W.mustWait(world, u, nx, ny)) {
    if (!u.facingLock) u.dir = Math.atan2(dy, dx);
    u.stuckT = 0; u.lastX = u.x; u.lastY = u.y;
    return;
  }
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

/* Is (x, y) inside a train or its push field? Nobody walks into a train (a
 * wrecked one is climbed over). Cars are another matter: walk into one's side
 * and you bounce off it (World.bump). */
W.inTrafficWay = (world, u, x, y) => {
  if ((u.z || 0) > 6) return false;   // on a bridge, over all of it
  for (const I of world.threats) {
    const off = Math.abs((I.ax ? y : x) - I.lat), a = I.ax ? x : y;
    if (I.delay !== Infinity && off < I.half + 0.3 && (a - I.tail) * I.dir > -0.3 && (I.nose - a) * I.dir > -0.3) return true;
    if (W.pushWidth(I, x, y)) return true;
  }
  return false;
};
/* At the edge of a railway (or, for a civilian, of a road) with the next
 * step onto it: walk the path across, and wait if anything that will not
 * stop could be there before we are over and clear. Trains for everyone;
 * a getaway car or a panicking driver too, for civilians. */
W.mustWait = (world, u, nx, ny) => {
  const m = world.map, civ = u.kind === "civ" && !u.follower;
  const threats = civ ? world.civThreats : world.threats;
  if (!threats || !threats.length || (u.z || 0) > 6) return false;
  const strip = (x, y) => { const g = m.groundAt(x, y); return (g === W.G.RAIL || (civ && g === W.G.ROAD)) && W.deckZ(m, x, y) <= 6; };
  if (!strip(nx, ny) || strip(u.x, u.y)) return false;
  // the crossing: points along the path from here until it leaves the strip
  const pts = [];
  let px = u.x, py = u.y, dist = 0, exitD = 0, on = false;
  walk: for (const [qx, qy] of u.path) {
    const seg = Math.hypot(qx - px, qy - py), n = Math.max(1, Math.ceil(seg / 0.4));
    for (let i = 1; i <= n; i++) {
      const x = px + (qx - px) * i / n, y = py + (qy - py) * i / n, dd = dist + seg * i / n;
      if (strip(x, y)) { on = true; pts.push(x, y); exitD = dd; }
      else if (on) break walk;
      if (dd > 18) break walk;
    }
    px = qx; py = qy; dist += seg;
  }
  const clearT = exitD / W.speedOf(u) + 1.5;
  for (const I of threats) for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i], y = pts[i + 1];
    if (Math.abs((I.ax ? y : x) - I.lat) > I.half + 0.6) continue;
    if (W.etaAt(I, I.ax ? x : y) < clearT) return true;
  }
  return false;
};

/* Bodies push each other apart a little, never into walls. */
W.separate = (world, dt) => {
  const us = world.units, m = world.map;
  // only neighbours can touch: bucket everyone by tile, then each looks at the 3x3 round them
  const grid = new Map(), key = (x, y) => y * 4096 + x;
  for (let i = 0; i < us.length; i++) {
    const a = us[i];
    if (!a.alive || a.inCar) continue;
    const k = key(Math.floor(a.x), Math.floor(a.y));
    const cell = grid.get(k); if (cell) cell.push(i); else grid.set(k, [i]);
  }
  for (let i = 0; i < us.length; i++) {
    const a = us[i];
    if (!a.alive || a.inCar) continue;
    const cx = Math.floor(a.x), cy = Math.floor(a.y);
    for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gx = cx - 1; gx <= cx + 1; gx++) {
      const cell = grid.get(key(gx, gy)); if (!cell) continue;
      for (const j of cell) {
        if (j <= i) continue;
        const b = us[j];
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
  }
};

/* ---- firing ---- */
// on guard: someone who'd see a rifle coming. Crew alerted or fighting or running, police called in, civilians panicking
W.onGuard = u => u.kind === "civ" ? u.state === "panic" || u.state === "flee"
  : u.kind === "sec" ? !!(u.angryAt && (u.angryAt.player || u.angryAt.crew))
  : !!(u.alert || u.hostile || u.state === "flee" || u.state === "alerted");
// the element of surprise (W.WEAPONS[..].surprise): nobody round the one hit, them included, on guard
W.surprised = (world, t) => !world.units.some(o => o.alive && !o.isAgent && !o.follower && !o.inCar && W.dist(o.x, o.y, t.x, t.y) < W.SURPRISE_R && W.onGuard(o));

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
  if (u.isAgent) cd *= (1.15 - 0.3 * W.eff(u, "zoom")) * (1 - 0.08 * W.mod(u, "arms"));
  u.cd = cd;
  u.dir = Math.atan2(ty - u.y, tx - u.x);
  u.flash = 0.07;
  world.stats.shots += u.isAgent ? 1 : 0;
  W.audio.at(def.sound, u.x, u.y);
  const d = W.dist(u.x, u.y, tx, ty);
  let acc = def.acc * u.acc;
  if (u.isAgent) acc *= (0.8 + 0.4 * W.eff(u, "dot")) * (1 + 0.06 * W.mod(u, "eyes"));
  const fall = 1 - (0.45 - 0.08 * W.mod(u, "eyes")) * W.clamp(d / W.rangeOf(u), 0, 1.4);
  const dmg = W.dmgOf(u), blastMul = 1 + W.MARK.dmg * (W.markOf(w) - 1);
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
    world.tracer(u.x + Math.cos(ang) * 0.3, u.y + Math.sin(ang) * 0.3, mz, ex, ey, ez, def.tracer, def.beam ? 2 : 1, def.beam ? 0.25 : 0.07);
    if (hit) {
      if (hit.isCar) world.damageCar(hit, dmg, u);
      // a Watcher's rifle on someone who doesn't see it coming: one shot (not the crew's on a Watcher)
      else if (def.surprise && u.isAgent && !hit.isAgent && W.surprised(world, hit)) world.damage(hit, hit.hp + 1, u, def.silenced);
      else world.damage(hit, dmg, u, def.silenced);
    }
    if (def.blast) world.explode(ex, ey, def.blast.r, def.blast.dmg * blastMul, u);
    // a silenced round is heard where it lands, close by, and nowhere else
    if (def.silenced) world.noise(ex, ey, W.SILENT_R, u);
  }
  world.noise(u.x, u.y, def.silenced ? W.SILENT_R : 9, u);
  return true;
};

/* ---- the Purrsuader ---- */
/* The following: everyone talked round and still with us. A persuade job's
 * subject and hired guns are not part of it. */
W.squadFollowers = world => world.units.filter(o => o.alive && o.follower && !o.isAgent && !o.merc && !o.subject).length;
/* How big a following the squad can hold: set by the best Purrsuader any
 * Watcher still in the field carries (MK1, the Purrsuader II as MK2, or its
 * mark when the campaign sends one). Nobody past it can be talked round. */
W.FOLLOWING = { 1: 6, 2: 10, 3: 16 };
W.followingCap = world => {
  let mk = 0;
  for (const a of world.agents) if (a.alive && !a.out) for (const w of a.weapons) {
    const d = W.WEAPONS[w.type];
    if (d && d.persuade) mk = Math.max(mk, Math.max(d.persuade, w.mk || 1));
  }
  // Cal's enforcers on the streets: fewer will follow
  const CC = W.CAL_COUNTERS[world.level.mission && world.level.mission.counter];
  return mk ? Math.max(1, W.FOLLOWING[Math.min(3, mk)] + (CC && CC.following || 0)) : 0;
};
/* how many followers it takes to talk t round (before the brain mods count) */
W.persuadeNeed = (world, agent, t) => {
  let need = t.kind === "target" ? Infinity : t.kind === "crew" ? (t.guard ? 6 : W.PERSUADE_NEED.crew) : W.PERSUADE_NEED[t.kind];
  if (need === undefined || need === Infinity) return need;
  // the Purrsuader II needs no crowd for anyone not already fighting us, and half the crowd for those who are
  const def = W.curDef(agent);
  if (def && def.persuade > 1) need = W.hostileTo(world, agent, t) ? Math.ceil(need / 2) : 0;
  // Cal's enforcers: a citizen wants one more in the crowd before they listen
  const CC = W.CAL_COUNTERS[world.level.mission && world.level.mission.counter];
  if (CC && CC.need && t.kind === "civ") need += CC.need;
  return need;
};
W.canPersuade = (world, agent, t) => {
  if (!t.alive || t.inCar || t.faction === "player" || t.isAgent) return false;
  // a persuade job's subject: their own price in followers (the threat less one; half with a better Purrsuader).
  // Mind control does not reach them: the job is to turn them.
  // (the subject never counts against the following's cap: a full crowd cannot lock the job out)
  if (t.subject) { const d = W.curDef(agent); let need = t.need || 0; if (d && d.persuade > 1) need = Math.ceil(need / 2); return W.squadFollowers(world) + W.mod(agent, "brain") >= need; }
  // a full following: nobody else
  if (W.squadFollowers(world) >= W.followingCap(world)) return false;
  // a zone under mind control: nobody there hears the Purrsuader
  if (world.level.mission && world.level.mission.mindControl) return false;
  const need = W.persuadeNeed(world, agent, t);
  // a better brain counts as followers
  return need !== undefined && W.squadFollowers(world) + W.mod(agent, "brain") >= need;
};
W.persuade = (world, agent, t) => {
  t.faction = "player"; t.follower = true; t.leader = agent;
  t.hostile = false; t.angryAt = { player: false, crew: false, sec: false };
  t.state = "follow"; t.target = null; t.manual = null; t.path = null;
  if (t.kind === "civ") { t.weaponOut = false; t.cur = -1; }
  W.say(t, W.pick(W.LINES.purr), "#54f2ff");
  W.audio.at("persuaded", t.x, t.y);
  world.stats.recruited++;
  if (t.kind === "civ" && !t.subject) t.persuadedCiv = true;
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
  // nobody on foot: a car they saw the squad get into
  if (!best && a.faction !== "player" && W.knownCar) best = W.knownCar(world, a, range);
  return best;
};

/* Fire at a target in range, or close in. Shared by everyone with a gun. */
W.engage = (world, u, foe, chase = true) => {
  const def = W.curDef(u);
  if (!def || !def.gun) return false;
  const d = W.dist(u.x, u.y, foe.x, foe.y);
  const see = world.map.los(u.x, u.y, foe.x, foe.y);
  const range = W.rangeOf(u);
  if (see && d <= range) {
    if (u.target !== foe) { u.target = foe; u.aimT = u.react * W.rand(0.8, 1.2); }
    u.seen = [foe.x, foe.y];
    if (!u.isAgent && d < range * 0.8) W.stop(u);
    return true;
  }
  if (chase && (!u.path || u.chaseT <= 0)) {
    W.goTo(world, u, foe.x, foe.y);
    u.chaseT = 1.2;
  }
  return false;
};

W.thinkAgent = (world, u) => {
  // on the way to a car, to get in
  if (u.board && W.boardThink(world, u)) return;
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
  if (def && def.persuade) {
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
          if (!u.denyT) { world.msg(!m.subject && W.squadFollowers(world) >= W.followingCap(world) ? `${u.name}: that's as many as we can keep. Lose some first.` : world.level.mission && world.level.mission.mindControl ? `${u.name}: they don't hear it. Nobody here does.` : `${u.name}: need ${W.persuadeNeed(world, u, m)} followers to work on that one.`, "#ffb000"); u.denyT = 3; W.audio.play("deny"); }
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
    if (d <= W.rangeOf(u) && world.map.los(u.x, u.y, m.x, m.y)) {
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
  const range = W.rangeOf(u) + W.eff(u, "dot") * 1.5 + 0.6 * W.mod(u, "eyes");
  const foe = W.nearestFoe(world, u, range);
  if (foe) {
    if (u.target !== foe) { u.target = foe; u.aimT = Math.max(0.1, (0.95 - 0.65 * vine - 0.2 * W.eff(u, "dot")) * (1 - 0.18 * W.mod(u, "brain")) * (1 - W.RANK.react * (u.rank || 0))); }
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
    const foe = W.nearestFoe(world, u, W.rangeOf(u));
    if (foe) { W.engage(world, u, foe, false); }
    else u.target = null;
  }
  // in the way of a car of ours: off its lane to the near side, a moment (on hold or not, fighting or not)
  if (u.giveWay) {
    const c = u.giveWay; u.giveWay = null;
    const p = !(u.wayUntil > world.time) && !c.dead && W.wayside(world, c, u, c.axis === "x" ? u.x : u.y);
    if (p) { u.wayTo = p; u.wayUntil = world.time + 2; }
  }
  if (u.wayUntil > world.time) {
    const p = u.wayTo;
    if (W.dist(u.x, u.y, p[0], p[1]) > 0.3 && (!u.path || W.dist(u.dest[0], u.dest[1], p[0], p[1]) > 0.3)) W.goTo(world, u, p[0], p[1], { avoidRoad: true });
    return;
  }
  // told to hold (Z): they stay put, firing on anyone in range, until told to come
  if (u.hold) { if (u.path) W.stop(u); return; }
  if (!W.armed(u)) {
    // unarmed: go for a gun lying nearby
    const it = world.items.filter(i => W.WEAPONS[i.type].gun && W.dist(u.x, u.y, i.x, i.y) < 7).sort((a, b) => W.dist(u.x, u.y, a.x, a.y) - W.dist(u.x, u.y, b.x, b.y))[0];
    if (it) { if (!u.path) W.goTo(world, u, it.x, it.y); return; }
  }
  const L = u.leader, d = W.dist(u.x, u.y, L.x, L.y);
  // the leader in a car: wait beside it off the road, not round it in the lane, and trail it when it goes
  if (L.inCar && L.car) {
    const c = L.car, ax = c.axis === "x";
    const inLane = Math.abs((ax ? u.y : u.x) - (ax ? c.y : c.x)) < c.wid / 2 + 0.5 && Math.abs((ax ? u.x : u.y) - (ax ? c.x : c.y)) < c.len / 2 + 3;
    const fine = u.path ? W.dist(u.dest[0], u.dest[1], c.x, c.y) < 4.5 : !inLane && W.dist(u.x, u.y, c.x, c.y) < 4.5;
    if (!fine) {
      const p = W.wayside(world, c, u, (ax ? c.x : c.y) + ((u.id % 5) - 2) * 0.8);
      if (p) W.goTo(world, u, p[0], p[1], { avoidRoad: true });
    }
    return;
  }
  if (d > 2.2 && (!u.path || (u.dest && W.dist(u.dest[0], u.dest[1], L.x, L.y) > 1.6))) {
    const a = (u.id * 2.4) % (Math.PI * 2);
    W.goTo(world, u, L.x + Math.cos(a) * 1.1, L.y + Math.sin(a) * 1.1);
  }
};

/* A persuade job's subject: they keep to their spot until the alarm goes up
 * (or someone hurts them), then run for the way out. Making it ends the job. */
W.thinkSubject = (world, u) => {
  if (world.markAlarm || u.hp < u.maxHp) {
    u.state = "flee";
    if (!u.fled) { u.fled = true; W.say(u, "I'm out of here!", "#7dffb0", 2.2); world.msg(`${u.name} is running!`, "#ffb000"); }
    const ex = world.escapePoint;
    if (ex) {
      if (W.dist(u.x, u.y, ex[0], ex[1]) < 1.2) { u.inCar = true; u.path = null; world.subjectGone = true; return; }
      if (!u.path || u.chaseT <= 0) { W.goTo(world, u, ex[0], ex[1]); u.chaseT = 1.5; }
    }
    return;
  }
  u.state = "idle";
  if (u.post && !u.path && W.dist(u.x, u.y, u.post[0], u.post[1]) > 0.5) W.goTo(world, u, u.post[0], u.post[1]);
  else if (!u.path && u.post) u.dir = u.post[2];
};
W.thinkCiv = (world, u) => {
  if (u.subject) return W.thinkSubject(world, u);
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
    // most people roam; a crowd member drifts about where the crowd is
    const R = u.crowd ? 3 : 12, ox = u.crowd ? u.home[0] : u.x, oy = u.crowd ? u.home[1] : u.y;
    for (let k = 0; k < 8; k++) {
      const x = ox + W.rand(-R, R), y = oy + W.rand(-R, R);
      const g = world.map.groundAt(x, y);
      if (W.STROLL.has(g)) {
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
  W.say(u, u.elite ? W.pick(["Contact! All posts!", "Protect the tower!", "Lock it down!"]) : W.pick(W.LINES.secAngry), u.elite ? "#d8b048" : "#7aa8ff");
  W.audio.at("whistle", u.x, u.y);
  // the radio: nearby officers join in
  for (const o of world.units) if (o.alive && o.kind === "sec" && !o.follower && o !== u && (W.dist(u.x, u.y, o.x, o.y) < 16 || (u.elite && o.elite)) && !o.angryAt[who]) {
    o.angryAt[who] = true; o.calmT = 20; W.drawBest(o);
  }
  if (who === "player") world.msg(`${world.names.sec.toUpperCase()}: Officer needs backup!`, "#7aa8ff");
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
    if (o.alive && o.faction === "player" && !o.inCar && W.armed(o) && W.canSee(world, u, o, 8)) { armed = o; break; }
  }
  if (armed) {
    u.dir = Math.atan2(armed.y - u.y, armed.x - u.x);
    if (u.warnT <= 0 && !u.warned) {
      u.warned = true; u.warnT = u.elite ? 1.4 : 3.2; W.stop(u);
      W.say(u, W.pick(W.LINES.warn), "#ffb000", 3);
      W.audio.at("whistle", u.x, u.y);
    } else if (u.warned && u.warnT <= 0) {
      W.secCall(world, u, "player");
    }
    return;
  }
  if (u.warned && u.warnT <= -2) u.warned = false;
  // a garrison holds its post
  if (u.elite) {
    if (!u.path && W.dist(u.x, u.y, u.post[0], u.post[1]) > 0.6) W.goTo(world, u, u.post[0], u.post[1]);
    else if (!u.path) u.dir = u.post[2];
    return;
  }
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
  // broken (their boss is dead): away from the Watchers, and no more of it unless shot at
  if (u.broken) {
    u.state = "flee";
    const ag = world.agents.filter(a => a.alive && !a.out);
    const near = ag.sort((a, b) => W.dist(u.x, u.y, a.x, a.y) - W.dist(u.x, u.y, b.x, b.y))[0];
    if (near && W.dist(u.x, u.y, near.x, near.y) < 20 && (!u.path || u.chaseT <= 0)) {
      const a = Math.atan2(u.y - near.y, u.x - near.x) + W.rand(-0.6, 0.6);
      W.goTo(world, u, u.x + Math.cos(a) * 12, u.y + Math.sin(a) * 12); u.chaseT = 2.5;
    }
    return;
  }
  if (u.hostile && u.undercover && !u.revealed) W.reveal(u);
  if (!u.hostile) {
    // who can they see? An armed Watcher at range, at once. Someone of ours with
    // empty hands up close only makes them wonder: linger about two seconds and
    // they work it out. Once an alarm near them has gone up, they know anyone on sight.
    let close = false;
    for (const o of world.units) {
      if (!o.alive || o.faction !== "player" || o.inCar) continue;
      const loud = u.alert || W.armed(o), r = u.alert ? u.sight + 2 : W.armed(o) ? u.sight : 3.2;
      if (!W.canSee(world, u, o, r)) continue;
      if (!loud) { close = true; if ((u.sus || 0) < W.SUSPICION) continue; }
      u.hostile = true; W.drawBest(u);
      W.say(u, W.pick(W.LINES.crewSpot), "#ff5266");
      world.raiseAlarm(u, o);
      break;
    }
    if (!u.hostile) {
      const was = u.sus || 0;
      u.sus = close ? was + 0.23 : Math.max(0, was - 0.12);
      if (close && was === 0) W.say(u, W.pick(["Hey. Who are you?", "You lost?", "Don't I know you?"]), "#ffb000", 1.6);
    }
    if (!u.hostile) {
      // one of a crew walking the streets together: keep up with whoever leads
      if (u.pack) {
        const P = u.pack;
        if (P.alive && !P.hostile && !P.broken) {
          const tx = P.x + u.packAt[0], ty = P.y + u.packAt[1];
          if (W.dist(u.x, u.y, tx, ty) > 1.4 && (!u.path || u.chaseT <= 0)) { const q = world.map.nearestWalkable(tx, ty, 2); if (q) W.goTo(world, u, q[0], q[1]); u.chaseT = 0.9; }
          else if (!u.path) u.dir = P.dir;
          return;
        }
        u.pack = null;
      }
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
  if (!W.hasGun(u)) return W.thinkUnarmed(world, u);
  if (!W.armed(u)) W.drawBest(u);
  const foe = W.nearestFoe(world, u, u.sight + 2);
  // a siege's defenders hold their posts: they fire from cover, and do not come out hunting
  if (u.defender) {
    if (foe) W.engage(world, u, foe, false); else u.target = null;
    if (!u.path && u.post && W.dist(u.x, u.y, u.post[0], u.post[1]) > 0.6) W.goTo(world, u, u.post[0], u.post[1]);
    return;
  }
  if (foe) { W.engage(world, u, foe, true); return; }
  u.target = null;
  // bodyguards stick with the boss
  if (u.guard && world.targetUnit && world.targetUnit.alive && !world.targetUnit.inCar) {
    const T = world.targetUnit;
    if (W.dist(u.x, u.y, T.x, T.y) > 2 && (!u.path || u.chaseT <= 0)) { W.goTo(world, u, T.x + W.rand(-1, 1), T.y + W.rand(-1, 1)); u.chaseT = 1; }
    return;
  }
  // hunt: the last place they saw one of us, or where the alarm came from
  const spot = u.seen || (world.alarmAt && W.dist(u.x, u.y, world.alarmAt[0], world.alarmAt[1]) < W.ALERT_R ? world.alarmAt : null);
  if (spot && (!u.path || u.chaseT <= 0) && W.dist(u.x, u.y, spot[0], spot[1]) > 1.5) {
    W.goTo(world, u, spot[0] + W.rand(-1.5, 1.5), spot[1] + W.rand(-1.5, 1.5)); u.chaseT = 2.5;
  } else if (spot && W.dist(u.x, u.y, spot[0], spot[1]) <= 1.5) { u.seen = null; }
};

/* A crew member with nothing to shoot with, once they have made you (the
 * alarm is already up): grab a gun off the ground if one is near, else run to
 * the nearest armed friend and set them on you, else just run. Corner one and
 * they will swing at you, and that is all. */
W.thinkUnarmed = (world, u) => {
  u.target = null; u.cur = -1; u.weaponOut = false; u.state = "flee";
  let foe = null, fd = Infinity;
  for (const b of world.units) {
    if (!W.hostileTo(world, u, b)) continue;
    const d = W.dist(u.x, u.y, b.x, b.y);
    if (d < fd) { fd = d; foe = b; }
  }
  // hand to hand
  if (foe && fd < 0.9) {
    W.stop(u); u.dir = Math.atan2(foe.y - u.y, foe.x - u.x);
    if (u.cd <= 0) { u.cd = 1.1; world.damage(foe, 1, u); if (Math.random() < 0.3) W.say(u, W.pick(["Hsss!", "Get off!", "Rrrah!"]), "#ff5266", 1.2); }
    return;
  }
  // a gun on the ground
  let it = null, id = 8;
  for (const i of world.items) { if (!W.WEAPONS[i.type].gun) continue; const d = W.dist(u.x, u.y, i.x, i.y); if (d < id) { id = d; it = i; } }
  if (it) { if (!u.path || u.chaseT <= 0) { W.goTo(world, u, it.x, it.y); u.chaseT = 1; } return; }
  // help: the nearest armed friend, if there is one near enough to run to
  let pal = null, pd = W.ALERT_R;
  for (const b of world.units) {
    if (!b.alive || b.inCar || b.follower || b.faction !== "crew" || b === u || !W.hasGun(b)) continue;
    const d = W.dist(u.x, u.y, b.x, b.y);
    if (d < pd) { pd = d; pal = b; }
  }
  if (pal) {
    if (pd <= 2.5) {
      if (!pal.hostile) { pal.hostile = true; W.drawBest(pal); W.say(u, W.pick(["They're here!", "Watchers!", "Over there!"]), "#ff5266", 1.6); }
      if (u.seen && !pal.seen) pal.seen = u.seen;
    } else if (!u.path || u.chaseT <= 0) { W.goTo(world, u, pal.x + W.rand(-1, 1), pal.y + W.rand(-1, 1)); u.chaseT = 1.5; }
    return;
  }
  // nobody to run to: away from the nearest of us
  if (foe && fd < 12 && (!u.path || u.chaseT <= 0)) {
    const a = Math.atan2(u.y - foe.y, u.x - foe.x) + W.rand(-0.7, 0.7);
    W.goTo(world, u, u.x + Math.cos(a) * 9, u.y + Math.sin(a) * 9); u.chaseT = 2;
  }
};

/* ---- plain clothes, and the scanner that sees through them ----
 * Some of the crew dress like everyone else, more of them the higher the
 * threat. Once they show their hand, a red trim gives them away. The squad's
 * scanner (its best mark among the Watchers still in the field) marks armed
 * people near a Watcher: MK1 not at all, MK2 close by, MK3 further and
 * through roofs and walls. */
/* how long (s) a crew member watches someone of ours with empty hands up close before they work it out */
W.SUSPICION = 2;
W.UNDERCOVER = { 1: 0, 2: 0, 3: 0.15, 4: 0.3, 5: 0.45 };
W.SCAN = { 1: { armed: 0 }, 2: { armed: 12 }, 3: { armed: 22, walls: true } };
// plain clothes over the same body: species, fur and mane stay
W.disguise = (u, look) => {
  const b = u.look || {};
  u.undercover = true;
  u.look = Object.assign({}, look || W.lookFor("civ"), { species: b.species, fur: b.fur || (look && look.fur), mane: b.mane, patch: b.patch });
  return u;
};
W.reveal = u => { u.revealed = true; u.look = Object.assign({}, u.look, { trim: "#ff5266" }); };
W.scanMk = world => {
  let mk = world.level.scannerMk || 1;
  for (const a of world.agents) if (a.alive && !a.out && a.scannerMk > mk) mk = a.scannerMk;
  return Math.min(3, mk);
};
/* Is this mission against Cal's people? The campaign says so (L.mission.cal),
 * or it follows from the kind: a hit on Cal's crew, a siege, a zone he holds. */
W.isCal = level => { const M = level.mission; return !!M && (M.cal ?? (M.kind === "cal" || M.kind === "siege" || M.zoneLevel === -1)); };
/* does the squad's MK3 scanner know u for one of Cal's, plain clothes or not? */
W.scanCal = (world, u) => {
  if (W.scanMk(world) < 3 || !W.isCal(world.level) || !u.alive || u.faction !== "crew") return false;
  return world.agents.some(a => a.alive && !a.out && W.dist(a.x, a.y, u.x, u.y) <= W.SCAN[3].armed);
};
/* does the squad's scanner mark u as armed? */
/* The quiet way (Alt-click): a price on every cell near the crew the squad
 * can know about, for the pathfinder to go round. Only what the scanner shows:
 * nobody under a roof without MK3, no plain clothes it hasn't marked, and,
 * where MK2 or better tells armed from unarmed, only the armed. */
W.dangerField = world => {
  const m = world.map, f = world.danger || (world.danger = new Float32Array(m.w * m.h));
  f.fill(0);
  const mk = W.scanMk(world), walls = (W.SCAN[mk] || {}).walls, reach = (W.SCAN[mk] || W.SCAN[1]).armed;
  const ags = world.agents.filter(a => a.alive && !a.out);
  for (const u of world.units) {
    if (!u.alive || u.inCar || u.faction !== "crew" || u.follower || u.broken) continue;
    if (u.undercover && !u.revealed && !W.scanArmed(world, u)) continue;
    const cx = Math.floor(u.x), cy = Math.floor(u.y);
    if (!walls && m.inb(cx, cy) && m.roofOf[m.i(cx, cy)] >= 0) continue;
    if (reach && !W.hasGun(u) && ags.some(a => W.dist(a.x, a.y, u.x, u.y) <= reach)) continue;
    for (let y = cy - 8; y <= cy + 8; y++) for (let x = cx - 8; x <= cx + 8; x++) {
      if (!m.inb(x, y)) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d <= 8) f[m.i(x, y)] += d <= 4.5 ? 12 : 4;
    }
  }
  return f;
};
/* go to (x, y) the quiet way: round the danger, if there's a way at all */
W.sneakTo = (world, u, x, y, field) => {
  const p = world.map.path(u.x, u.y, x, y, false, field || W.dangerField(world));
  if (!p) return W.goTo(world, u, x, y);
  u.path = p.length ? p : null; u.dest = u.path ? u.path[u.path.length - 1] : null; u.stuckT = 0;
  return !!u.path;
};
W.scanArmed = (world, u) => {
  const r = (W.SCAN[W.scanMk(world)] || W.SCAN[1]).armed;
  if (!r || !u.alive || !W.hasGun(u)) return false;
  return world.agents.some(a => a.alive && !a.out && W.dist(a.x, a.y, u.x, u.y) <= r);
};

W.thinkTarget = (world, u) => {
  const car = world.escapeCar;
  if (u.state === "flee") {
    if (car && !car.dead) {
      if (W.dist(u.x, u.y, car.door[0], car.door[1]) < 0.9) { world.boardEscape(u, car); return; }
      if (!u.path || u.chaseT <= 0) { W.goTo(world, u, car.door[0], car.door[1]); u.chaseT = 1.5; }
    } else if (world.escapePoint && !car) {
      // on foot, for the way out
      const [ex, ey] = world.escapePoint;
      if (W.dist(u.x, u.y, ex, ey) < 1.2) { u.inCar = true; u.path = null; world.escaped = true; return; }
      if (!u.path || u.chaseT <= 0) { W.goTo(world, u, ex, ey); u.chaseT = 1.5; }
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
      world.msg(`${world.names.target.toUpperCase()} is making a run for ${world.escapeCar ? "the car" : "it"}!`, "#ffb000");
    }
    return;
  }
  if (world.markAlarm || u.hp < u.maxHp) {
    u.state = "alerted"; u.hostile = true; u.stateT = u.hp < u.maxHp ? 0.6 : 2.2;
    W.say(u, "What was that?", "#ffb000", 1.8);
    return;
  }
  if (u.post && !u.path && W.dist(u.x, u.y, u.post[0], u.post[1]) > 0.4) W.goTo(world, u, u.post[0], u.post[1]);
  else if (!u.path && u.post) u.dir = u.post[2] ?? u.dir;
};

/* ---- the tick ---- */
W.deckZ = (m, x, y) => {
  const cx = Math.floor(x), cy = Math.floor(y);
  if (!m.inb(cx, cy)) return 0;
  const k = m.i(cx, cy);
  if (!m.deck[k] && !m.deckHi[k]) return 0;
  const ax = m.deckAxis[k];
  if (!ax) return m.deck[k];
  const f = ax === 1 ? x - cx : y - cy;
  return m.deckLo[k] + (m.deckHi[k] - m.deckLo[k]) * f;
};
W.updateUnit = (world, u, dt) => {
  // out, or a passenger; a Watcher riding in a car of ours still keeps time and heals (below)
  if (!u.alive || (u.inCar && !u.car)) return;
  // up on a walkway, or down on the ground: eased, so stairs read as stairs
  const zt = W.deckZ(world.map, u.x, u.y);
  u.z = (u.z || 0) + (zt - (u.z || 0)) * Math.min(1, dt * 20);
  u.cd -= dt; u.flash -= dt; u.stateT -= dt; u.warnT -= dt; u.calmT -= dt; u.chaseT = (u.chaseT || 0) - dt;
  if (u.dryT) u.dryT = Math.max(0, u.dryT - dt);
  if (u.denyT) u.denyT = Math.max(0, u.denyT - dt);
  if (u.say) { u.say.t -= dt; if (u.say.t <= 0) u.say = null; }
  // knocked down or dazed by a car: nothing but getting up again
  if (u.stunT > 0) { u.stunT -= dt; u.downT = (u.downT || 0) - dt; u.moving = false; return; }
  if (u.isAgent) {
    W.stimTick(u, dt);
    if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + (0.12 + 0.15 * W.mod(u, "heart")) * dt);
  }
  if (u.car) return;
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
      if (d <= W.rangeOf(u) + 0.5) {
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
  // (and an unarmed crew member who has made you grabs any gun lying about)
  if ((u.isAgent || u.follower || (u.faction === "crew" && u.hostile && !W.hasGun(u))) && world.items.length) {
    for (let i = world.items.length - 1; i >= 0; i--) {
      const it = world.items[i];
      if (W.dist(u.x, u.y, it.x, it.y) > 0.55) continue;
      if (u.faction === "crew" && !W.WEAPONS[it.type].gun) continue;
      if (it.type === "goods" && !u.isAgent) continue;   // only a Watcher carries the job's goods
      if (!u.isAgent && u.weapons.some(w => W.WEAPONS[w.type].gun)) continue;
      if (u.weapons.length >= 8 && !u.weapons.some(w => w.type === it.type)) continue;
      W.giveWeapon(u, it.type, it.ammo, it.mk);
      world.items.splice(i, 1);
      W.audio.at("pickup", u.x, u.y);
      if (u.isAgent) world.msg(`${u.name} picked up ${W.WEAPONS[it.type].name}${it.ammo != null ? ` (${it.ammo})` : ""}.`, "#dbe4fb");
      else W.drawBest(u);
    }
  }
};

/* ---- the squad ----
 * A roster entry is { id, name, fur, patch, mods, weapons: [{ type, ammo }] };
 * the campaign builds them, and W.defaultRoster stands in without one. */
/* Casey Benton's own guard: hardened, heavily armed, and they hold their
 * posts. They warn once, briefly; fire near them and every one of them comes. */
W.GARRISONS = {
  benton: { title: "Benton Guard", hp: 22, armor: 0.8, acc: 0.95, react: 0.35, sight: 11, guns: [["uzi", 120], ["shotgun", 40]],
    look: () => ({ coat: "#16161c", trim: "#d8b048", legs: "#0e0e12", fur: W.pick(["#3a3330", "#7c7c84", "#5a4a40", "#b08a5a"]), visor: "#d8b048", hat: "#16161c", hatKind: "cap", long: true }) },
};
W.spawnGarrisons = (world) => {
  for (const g of world.map.garrisons || []) {
    const G = W.GARRISONS[g.who];
    const p = world.map.nearestWalkable(g.x, g.y, 3);
    if (!p) continue;
    const u = world.add(W.makeUnit("sec", p[0], p[1], { elite: true, title: G.title, look: G.look(), post: [p[0], p[1], g.dir], home: p, dir: g.dir, hp: G.hp, maxHp: G.hp, armor: G.armor, acc: G.acc, react: G.react, sight: G.sight }));
    for (const [t, a] of G.guns) W.giveWeapon(u, t, a);
  }
};
/* Hired guns (L.mission.hired): a mercenary crew beside the squad for one
 * mission. They arrive as followers, armed, and fight as followers do. */
W.mercLook = () => ({ coat: "#2e3440", trim: "#7fd8e0", legs: "#1a1e26", fur: W.pick(W.FURS), visor: "#7fd8e0" });
W.spawnHired = (world, n) => {
  const ags = world.agents, at = world.dropAt || (ags[0] ? [ags[0].x, ags[0].y] : null);
  if (!n || !at || !ags.length) return;
  for (let i = 0; i < n; i++) {
    const p = world.map.nearestWalkable(at[0] + (i % 2 ? 1.2 : -1.2), at[1] + (i < 2 ? -1.2 : 1.2), 4) || at;
    const u = world.add(W.makeUnit("crew", p[0], p[1], { look: W.mercLook(), merc: true, hp: 14, maxHp: 14, armor: 0.85 }));
    u.faction = "player"; u.follower = true; u.leader = ags[i % ags.length]; u.state = "follow"; u.hostile = false;
    W.giveWeapon(u, i % 2 ? "shotgun" : "uzi", i % 2 ? 24 : 80); W.giveWeapon(u, "pistol"); W.drawBest(u);
  }
};
/* Veterancy: a Watcher who has come home from enough missions is quicker and
 * steadier. Ranks 0 to 3 (the campaign counts them: M.RANKS); each a little
 * more aim and a little less time to take it. */
W.RANK = { acc: 0.05, react: 0.07, names: ["Recruit", "Regular", "Veteran", "Elite"] };
W.agentLook = a => ({ coat: "#1b2130", trim: "#54f2ff", legs: "#10131c", fur: a.fur, patch: a.patch || null, visor: "#54f2ff", long: true });
W.spawnSquad = (world, roster, spots) => {
  world.dropAt = spots[0];   // where the squad came in: where the pickup waits when the job is done
  roster.slice(0, spots.length).forEach((a, i) => {
    const mods = Object.assign({}, a.mods || {});
    const u = world.add(W.makeUnit("agent", spots[i][0], spots[i][1], { name: a.name, slot: i, rosterId: a.id, look: W.agentLook(a), dir: -Math.PI / 2, mods, kills: 0, scannerMk: a.scannerMk || 0, rank: a.rank || 0 }));
    u.acc *= 1 + W.RANK.acc * u.rank;
    // a chest mod: more to hit, and harder to hurt
    u.maxHp = u.hp = 24 + 6 * (mods.chest || 0);
    u.armor = 0.75 * (1 - 0.1 * (mods.chest || 0));
    a.weapons.forEach(w => W.giveWeapon(u, w.type, w.ammo, w.mk));
    u.ipa = {};
    for (const s of W.STIMS) u.ipa[s.id] = { lvl: 0.5, dep: 0, eff: 0.5 };
    world.selected.add(u);
  });
};
W.defaultRoster = () => [
  { id: 1, name: "LYNX", fur: "#b08a5a", weapons: [{ type: "pistol" }, { type: "purrsuader" }, { type: "medikit", ammo: 1 }] },
  { id: 2, name: "MANX", fur: "#7c7c84", weapons: [{ type: "pistol" }, { type: "uzi", ammo: 80 }, { type: "medikit", ammo: 1 }] },
  { id: 3, name: "SPHYNX", fur: "#c9a49a", weapons: [{ type: "pistol" }, { type: "shotgun", ammo: 24 }, { type: "medikit", ammo: 1 }] },
  { id: 4, name: "CALICO", fur: "#e8e4dc", patch: "#c98a4a", weapons: [{ type: "pistol" }, { type: "uzi", ammo: 80 }, { type: "medikit", ammo: 1 }] },
];
