/* Encounters: what else is going on in the district when the squad arrives.
 *
 * A district's places of interest are found on its map: inside its
 * buildings (the bars and clubs above all), its open spaces (plazas, parks,
 * lawns), its big back alleys, and its two-way streets. Each mission picks a
 * handful of them, by its seed, and puts something there: a gang drinking in
 * a bar, a deal going down in an alley, the police round a body in the road
 * with their cars across the street, a crowd. Some of the crew just roam the
 * streets among everyone else. The hostile ones scale with the mission's
 * threat (L.mod), and none of it is near where the squad comes in. */
"use strict";

/* bars, clubs and dives: where a gang drinks; and where no gang would */
W.NO_GANG = /precinct|police|hospital|cathedral|church|chapel|mausoleum|city hall|port authority|customs|control/i;
W.HANGOUT = /club|bar\b|karaoke|lantern|litter|purrcade|diner|union|bunkhouse|saloon|lounge|kaboodle|imports|freight|warehouse|storage|shed/i;

/* The places of interest on a map, found once and kept with it. */
/* Where on a map can be walked to from the street: a flood fill from a drop
 * point over the walkable grid, kept with the map. A room nobody can reach
 * (walled in, no door) is no place to put anyone. */
W.reachable = m => {
  if (m._reach) return m._reach;
  const r = new Uint8Array(m.w * m.h), q = [];
  const sp = (m.points && m.points.spawn && m.points.spawn[0]) || null;
  const start = sp ? m.nearestWalkable(sp.x, sp.y, 6) : null;
  if (start) { const k = m.i(Math.floor(start[0]), Math.floor(start[1])); r[k] = 1; q.push(k); }
  while (q.length) {
    const k = q.pop(), x = k % m.w, y = (k / m.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const nk = ny * m.w + nx;
      if (!r[nk] && m.walk[nk]) { r[nk] = 1; q.push(nk); }
    }
  }
  return (m._reach = r);
};
W.encounterSites = m => {
  if (m._sites) return m._sites;
  const G = W.G, sites = [], reach = W.reachable(m);
  const open = g => g === G.PLAZA || g === G.PARK || g === G.GRASS || g === G.DIRT;
  const at = (x, y) => m.inb(x, y) ? m.ground[m.i(x, y)] : -1;
  const outside = (x, y) => m.roofOf[m.i(x, y)] < 0;
  // inside: every structure big enough to stand a group in
  for (const s of m.structures) {
    const cells = [];
    for (let y = s.y + 1; y < s.y + s.d - 1; y++) for (let x = s.x + 1; x < s.x + s.w - 1; x++)
      if (m.inb(x, y) && m.walk[m.i(x, y)] && reach[m.i(x, y)] && W.FLOORS.has(m.ground[m.i(x, y)]) && m.roofOf[m.i(x, y)] === s.id) cells.push([x + 0.5, y + 0.5]);
    if (cells.length < 24) continue;
    const cx = s.x + s.w / 2, cy = s.y + s.d / 2;
    cells.sort((a, b) => W.dist(a[0], a[1], cx, cy) - W.dist(b[0], b[1], cx, cy));
    sites.push({ kind: "indoor", x: cells[0][0], y: cells[0][1], name: s.name, hangout: W.HANGOUT.test(s.name || ""), noGang: W.NO_GANG.test(s.name || ""), cells: cells.slice(0, 40) });
  }
  // open spaces and big back alleys: a grid of samples, kept where there is room
  const roomy = (x, y, r, test) => { let n = 0; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const X = x + i, Y = y + j; if (m.inb(X, Y) && m.walk[m.i(X, Y)] && outside(X, Y) && test(at(X, Y))) n++; } return n; };
  for (let y = 4; y < m.h - 4; y += 7) for (let x = 4; x < m.w - 4; x += 7) {
    if (!m.walk[m.i(x, y)] || !reach[m.i(x, y)] || !outside(x, y)) continue;
    const g = at(x, y);
    if (open(g) && roomy(x, y, 3, open) >= 34) sites.push({ kind: "open", x: x + 0.5, y: y + 0.5 });
    else if (g === G.ALLEY && roomy(x, y, 3, h => h === G.ALLEY) >= 16) sites.push({ kind: "alley", x: x + 0.5, y: y + 0.5 });
  }
  // two-way streets, clear of junctions: where an accident can close the road
  const lanes = m.lanes.filter(l => !l.train);
  for (const L of lanes) {
    const O = lanes.find(o => o !== L && o.axis === L.axis && o.dir === -L.dir && Math.abs(o.at - L.at) <= 2.5 && o.from <= L.from + 1 && o.to >= L.to - 1);
    if (!O || L.dir < 0) continue;   // each street once, from its +dir lane
    const lo = Math.max(L.from, 0) + 10, hi = Math.min(L.to, L.axis === "x" ? m.w : m.h) - 10;
    for (let s = lo; s < hi; s += 9) {
      const clear = !m.junctions.some(j => { const a0 = L.axis === "x" ? j.x0 : j.y0, a1 = L.axis === "x" ? j.x1 : j.y1, b0 = L.axis === "x" ? j.y0 : j.x0, b1 = L.axis === "x" ? j.y1 : j.x1;
        return s > a0 - 7 && s < a1 + 7 && Math.max(L.at, O.at) > b0 - 1 && Math.min(L.at, O.at) < b1 + 1; });
      const mid = (L.at + O.at) / 2, [x, y] = L.axis === "x" ? [s, mid] : [mid, s];
      if (clear && at(Math.floor(x), Math.floor(y)) === G.ROAD) sites.push({ kind: "street", x, y, lane: L, back: O, s });
    }
  }
  return (m._sites = sites);
};

/* police: local law, not Casey's people. They behave as local security do. */
W.policeLook = () => ({ coat: "#1d2b4f", trim: "#cfe0ff", legs: "#121a2e", fur: W.pick(W.FURS), hat: "#1d2b4f" });

/* What can happen, and where. weight: how often it comes up; most: how many
 * a map can have; hostile: shrinks and swells with the threat. */
W.ENCOUNTERS = [
  { id: "gang", where: ["indoor", "alley"], weight: 3, most: 3, hostile: true },
  { id: "deal", where: ["alley", "open"], weight: 2, most: 2, hostile: true },
  { id: "accident", where: ["street"], weight: 1.2, most: 2 },
  { id: "patrol", where: ["open", "street"], weight: 1.2, most: 2 },
  { id: "crowd", where: ["open", "indoor"], weight: 2, most: 3 },
];

W.populateEncounters = (world, L, d, opts) => {
  if (opts.attract) return;
  const m = world.map, T = d.theme, mod = L.mod, rng = W.rng((L.seed || 1) * 31 + 23), R = () => rng();
  const pick = arr => arr[Math.floor(R() * arr.length)];
  const sp = L.picks.spawn, tg = L.picks.target;
  const sites = W.encounterSites(m).filter(s => W.dist(s.x, s.y, sp.x, sp.y) > 18 && W.dist(s.x, s.y, tg.x, tg.y) > 10);
  const hostileScale = mod ? (mod.crew ?? 1) : 1;
  const armedShare = mod ? (mod.armed ?? 1) : 1;
  const crewGun = () => mod ? pick(mod.guns) : pick(T.crewGuns || ["pistol", "pistol", "uzi"]);
  const toughen = u => { if (mod && mod.armour) u.maxHp = u.hp = Math.round(u.maxHp * mod.armour * 10) / 10; return u; };
  // plain clothes, by the threat; roamers in the crowd twice as often
  const undercover = W.UNDERCOVER[L.mission ? L.mission.threat : 3] || 0;
  const plain = (u, k = 1) => { if (R() < undercover * k) W.disguise(u, T.civLook ? T.civLook() : undefined); return u; };
  const spot = (x, y, r) => { for (let k = 0; k < 12; k++) { const a = R() * Math.PI * 2, dd = R() * r; const p = m.nearestWalkable(x + Math.cos(a) * dd, y + Math.sin(a) * dd, 2); if (p) return p; } return m.nearestWalkable(x, y, 4); };
  const facing = (p, x, y) => Math.atan2(y - p[1], x - p[0]);
  const crew = (x, y, r, armed) => {
    const p = spot(x, y, r); if (!p) return null;
    const u = plain(toughen(world.add(W.makeUnit("crew", p[0], p[1], { post: [p[0], p[1], facing(p, x, y)], dir: facing(p, x, y) }))));
    if (armed) { const g = crewGun(); W.giveWeapon(u, g, g === "uzi" ? 60 : undefined); }
    return u;
  };
  const civ = (x, y, r, crowd) => {
    const p = spot(x, y, r); if (!p) return null;
    return world.add(W.makeUnit("civ", p[0], p[1], crowd ? { home: p, crowd: true, look: T.civLook ? T.civLook() : undefined } : { dir: facing(p, x, y), look: T.civLook ? T.civLook() : undefined }));
  };
  const police = (x, y, r, patrol) => {
    const p = spot(x, y, r); if (!p) return null;
    const o = { home: p, look: W.policeLook(), title: "Police", dir: facing(p, x, y) };
    o.patrol = patrol ? [p, spot(p[0], p[1], 6) || p, spot(p[0], p[1], 6) || p] : [p, spot(x, y, r) || p];
    const u = world.add(W.makeUnit("sec", p[0], p[1], o));
    W.giveWeapon(u, "pistol");
    return u;
  };
  // how many of each: hostile groups shrink and swell with the threat
  const count = n => Math.max(0, Math.round(n));
  const make = {
    gang(s) {
      const n = count((3 + R() * 3) * hostileScale);
      if (!n) return false;
      const room = s.cells ? pick(s.cells) : [s.x, s.y];
      for (let i = 0; i < n; i++) crew(room[0], room[1], 2.2, R() < armedShare);
      if (s.kind === "indoor") for (let i = 0, k = 1 + Math.floor(R() * 3); i < k; i++) civ(room[0], room[1], 3.5, true);
      return true;
    },
    deal(s) {
      const n = count(2 * hostileScale) || 1;
      for (let i = 0; i < n; i++) crew(s.x, s.y, 1.2, R() < armedShare);
      for (let i = 0, k = 2 + Math.floor(R() * 2); i < k; i++) civ(s.x, s.y, 1.8, false);
      return true;
    },
    accident(s) {
      const L1 = s.lane, L2 = s.back, ax = L1.axis === "x";
      if (world.cars.some(c => !c.parked && (c.lane === L1 || c.lane === L2) && Math.abs((ax ? c.x : c.y) - s.s) < 8)) {
        world.cars = world.cars.filter(c => !(c.lane === L1 || c.lane === L2) || Math.abs((ax ? c.x : c.y) - s.s) >= 8);
      }
      // the body, in the road
      const bx = ax ? s.s : L1.at + (R() - 0.5), by = ax ? L1.at + (R() - 0.5) : s.s;
      const body = world.add(W.makeUnit("civ", bx, by, { look: T.civLook ? T.civLook() : undefined }));
      body.alive = false; body.hp = 0; body.deadSide = R() < 0.5 ? -1 : 1; body.scene = true;
      // a squad car across each lane, upstream of the body for its traffic, lights going
      const cop = { parked: true, police: true, color: "#e6e8ef", hp: 14, maxHp: 14 };
      world.addCar(L1, s.s - L1.dir * 3.2, Object.assign({}, cop));
      world.addCar(L2, s.s - L2.dir * 3.2, Object.assign({}, cop));
      for (let i = 0, k = 2 + Math.floor(R() * 2); i < k; i++) police(bx, by, 2.5, false);
      for (let i = 0, k = 3 + Math.floor(R() * 4); i < k; i++) civ(bx, by, 5, true);
      return true;
    },
    patrol(s) {
      for (let i = 0, k = 2 + Math.floor(R() * 2); i < k; i++) police(s.x, s.y, 2.5, R() < 0.5);
      return true;
    },
    crowd(s) {
      const c = s.cells ? pick(s.cells) : [s.x, s.y];
      for (let i = 0, k = 6 + Math.floor(R() * 7); i < k; i++) civ(c[0], c[1], 3.5, true);
      return true;
    },
  };
  // a handful of places, spread out, each with something going on: first what
  // happens (by weight, the hostile ones by the threat), then a place it fits
  const want = Math.min(8, Math.max(3, Math.round(sites.length / 12)));
  const used = [], tally = {};
  const fits = (e, s) => e.where.includes(s.kind) && !(e.id === "gang" && s.noGang) && !used.some(u => W.dist(u.x, u.y, s.x, s.y) < 16);
  for (let tries = 0; used.length < want && tries < want * 6; tries++) {
    const open = W.ENCOUNTERS.filter(e => (tally[e.id] || 0) < e.most);
    if (!open.length) break;
    let total = 0; const ws = open.map(e => { const w = e.weight * (e.hostile ? Math.min(1.5, Math.max(0.3, hostileScale)) : 1); total += w; return w; });
    let r = R() * total, e = open[0];
    for (let i = 0; i < open.length; i++) { r -= ws[i]; if (r <= 0) { e = open[i]; break; } }
    let places = sites.filter(s => fits(e, s));
    // a gang would rather be in a bar or a club, if the district has one free
    if (e.id === "gang" && places.some(s => s.hangout) && R() < 0.75) places = places.filter(s => s.hangout);
    if (!places.length) continue;
    const s = pick(places);
    if (make[e.id](s)) {
      used.push(s); tally[e.id] = (tally[e.id] || 0) + 1;
      (world.encounters || (world.encounters = [])).push({ id: e.id, kind: s.kind, x: s.x, y: s.y, name: s.name });
    }
  }
  // and some of the crew just walk the streets, in among everyone else
  const stroll = (x, y, g) => W.STROLL.has(g) && W.dist(x, y, sp.x, sp.y) > 18;
  for (let i = 0, n = count((1 + R() * 3) * hostileScale); i < n; i++) {
    const a = m.randomCell(stroll); if (!a) continue;
    const route = [a];
    for (let k = 0; k < 3; k++) { const b = m.randomCell((x, y, g) => stroll(x, y, g) && W.dist(x, y, route[k][0], route[k][1]) < 40 && W.dist(x, y, route[k][0], route[k][1]) > 15); if (b) route.push(b); }
    const u = plain(toughen(world.add(W.makeUnit("crew", a[0], a[1], { patrol: route, roamer: true }))), 2);
    if (R() < armedShare) { const g = crewGun(); W.giveWeapon(u, g, g === "uzi" ? 60 : undefined); }
  }
};
