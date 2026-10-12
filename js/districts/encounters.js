/* Encounters: what else is going on in the district when the squad arrives.
 *
 * A district's places of interest are found on its map: inside its
 * buildings (the bars and clubs above all), its open spaces (plazas, parks,
 * lawns), its big back alleys, and its two-way streets. Each mission picks a
 * handful of them, by its seed, and puts something there: a gang drinking in
 * a bar, a deal going down in an alley, the police round a body in the road
 * with their cars across the street, a crowd. Some of the crew just roam the
 * streets among everyone else.
 *
 * How much is going on follows the district's size and the mission's threat:
 * a quiet district at threat 1, a city at war at threat 5, and the hostile
 * share of it (L.mod) grows with the threat too. A good part of it sits
 * across the ways between the drop point, the mark and the getaway car, so
 * the walk out is never the walk in; none of it is right on top of the drop
 * point, the mark or the car. Going round is often the answer. */
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
 * a district of Downtown's size can have at threat 3 (more on bigger maps and
 * at higher threats); hostile: shrinks and swells with the threat; police:
 * the police are out in force only where there is trouble, so fewer of these
 * at the low threats (W.POLICE_OUT). */
W.ENCOUNTERS = [
  { id: "gang", where: ["indoor", "alley", "open"], weight: 3, most: 5, hostile: true },
  { id: "deal", where: ["alley", "open"], weight: 2, most: 3, hostile: true },
  { id: "pack", where: ["street", "open", "alley"], weight: 2, most: 4, hostile: true },
  { id: "roadblock", where: ["street"], weight: 1.2, most: 2, hostile: true },
  { id: "lookouts", where: ["alley", "street", "open"], weight: 1.5, most: 4, hostile: true },
  { id: "mugging", where: ["alley"], weight: 1, most: 2, hostile: true },
  { id: "mob", where: ["open", "street"], weight: 1, most: 2, hostile: true },
  { id: "accident", where: ["street"], weight: 1, most: 2, police: true },
  { id: "checkpoint", where: ["street"], weight: 1.2, most: 3, police: true },
  { id: "patrol", where: ["open", "street"], weight: 1.2, most: 3, police: true },
  { id: "rally", where: ["open"], weight: 0.8, most: 2 },
  { id: "crowd", where: ["open", "indoor"], weight: 2, most: 4 },
];
/* how often the police encounters come up, by threat */
W.POLICE_OUT = { 1: 0.5, 2: 0.7, 3: 0.9, 4: 1, 5: 1.1 };
/* encounters per 1000 tiles of district, by threat */
W.ENCOUNTER_DENSITY = { 1: 0.28, 2: 0.36, 3: 0.44, 4: 0.52, 5: 0.6 };
/* the share of encounters put across the ways in and out, and how far from them counts */
W.ON_THE_WAY = 0.55;
W.WAY_WIDTH = 26;

/* how far (x, y) is from the segment a-b */
W.segDist = (x, y, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L2)) : 0;
  return W.dist(x, y, a.x + t * dx, a.y + t * dy);
};

/* Cal's answers to how the squad plays (the campaign's M.noteHabits picks
 * one, L.mission.counter). Each sets his people out to blunt it:
 *   spread     against the BanHammer: nobody bunches up. Bodyguards stand
 *              two and a half times as far out, the crew further off, and
 *              every other siege defender holds the streets round the building.
 *   watch      against sneaking through: more lookouts across the ways in and
 *              out (two, and one more every two threat), a ring of them round
 *              the mark 14 to 22 tiles out and facing outward (as many
 *              again), a long way sighted; everyone round the mark sees 1.5
 *              tiles further.
 *   dig        against going in shooting: a third more bodyguards, a quarter
 *              tougher.
 *   enforcers  against talking people round: more of the crew walking the
 *              streets in packs, a following two smaller, and every citizen
 *              wants one more in the crowd before they listen. */
W.CAL_COUNTERS = {
  spread: { spread: 2.5 },
  watch: { sight: 1.5, extra: { id: "lookouts", n: 2 }, ring: { n: 2, r: [14, 22], sight: 2.5 } },
  dig: { guards: 1.35, tough: 1.25 },
  enforcers: { extra: { id: "pack", n: 1 }, following: -2, need: 1 },
};
W.populateEncounters = (world, L, d, opts) => {
  if (opts.attract) return;
  const m = world.map, T = d.theme, mod = L.mod, rng = W.rng((L.seed || 1) * 31 + 23), R = () => rng();
  const pick = arr => arr[Math.floor(R() * arr.length)];
  const sp = L.picks.spawn, tg = L.picks.target, pu = L.picks.pickup || sp;
  const car = world.pickupAt ? { x: world.pickupAt[0], y: world.pickupAt[1] } : pu;
  const threat = L.mission ? L.mission.threat : 3;
  const sites = W.encounterSites(m).filter(s => W.dist(s.x, s.y, sp.x, sp.y) > 18 && W.dist(s.x, s.y, tg.x, tg.y) > 10 && W.dist(s.x, s.y, car.x, car.y) > 14);
  const hostileScale = mod ? (mod.crew ?? 1) : 1;
  const level = W.foeLevel(L), armedShare = W.FOE[level].armed;
  // plain clothes, by the threat; roamers in the crowd twice as often
  const undercover = W.UNDERCOVER[threat] || 0;
  const plain = (u, k = 1) => { if (R() < undercover * k) W.disguise(u, T.civLook ? T.civLook() : undefined); return u; };
  const reach = W.reachable(m), reached = p => p && reach[m.i(Math.floor(p[0]), Math.floor(p[1]))];
  const spot = (x, y, r) => { for (let k = 0; k < 12; k++) { const a = R() * Math.PI * 2, dd = R() * r; const p = m.nearestWalkable(x + Math.cos(a) * dd, y + Math.sin(a) * dd, 2); if (reached(p)) return p; } const q = m.nearestWalkable(x, y, 4); return reached(q) ? q : null; };
  const facing = (p, x, y) => Math.atan2(y - p[1], x - p[0]);
  const crew = (x, y, r, armed, o = {}, lvl = level) => {
    const p = spot(x, y, r); if (!p) return null;
    return plain(W.kitFoe(world.add(W.makeUnit("crew", p[0], p[1], Object.assign({ post: [p[0], p[1], facing(p, x, y)], dir: facing(p, x, y) }, o))), lvl, armed, R));
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
  // a street closed: a car across each lane, upstream of the spot for its traffic
  const block = (s, o) => {
    const L1 = s.lane, L2 = s.back, ax = L1.axis === "x";
    world.cars = world.cars.filter(c => c.parked || !(c.lane === L1 || c.lane === L2) || Math.abs((ax ? c.x : c.y) - s.s) >= 8);
    world.addCar(L1, s.s - L1.dir * 3.2, Object.assign({ parked: true }, o));
    world.addCar(L2, s.s - L2.dir * 3.2, Object.assign({ parked: true }, o));
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
    // a few of the crew walking the streets together, a leader and the rest on their heels
    pack(s) {
      const n = Math.max(2, count((2 + R() * 3) * hostileScale));
      const stroll = (x, y, g) => W.STROLL.has(g) && reach[m.i(Math.floor(x), Math.floor(y))] && W.dist(x, y, sp.x, sp.y) > 18 && W.dist(x, y, car.x, car.y) > 12;
      const route = [spot(s.x, s.y, 2)]; if (!route[0]) return false;
      for (let k = 0; k < 3; k++) { const last = route[route.length - 1]; const b = m.randomCell((x, y, g) => stroll(x, y, g) && W.dist(x, y, last[0], last[1]) > 12 && W.dist(x, y, last[0], last[1]) < 30); if (b) route.push(b); }
      if (route.length < 2) return false;
      const lead = crew(route[0][0], route[0][1], 0.5, R() < Math.max(armedShare, 0.5), { patrol: route, speedMul: 0.8, post: null });
      if (!lead) return false;
      for (let i = 1; i < n; i++) {
        const u = crew(lead.x, lead.y, 1.5, R() < armedShare, { post: null });
        if (u) { u.pack = lead; u.packAt = [((i % 2) ? 1 : -1) * (0.7 + 0.4 * (i >> 1)), -0.8 * Math.ceil(i / 2)]; }
      }
      return true;
    },
    // a mob: a crowd of the crew's lowest, few of them armed, moving as one. Dangerous by numbers,
    // and the same at every threat: the bottom of the gang turns out whoever is running it
    mob(s) {
      const n = 10 + Math.floor(R() * 7);
      const stroll = (x, y, g) => W.STROLL.has(g) && reach[m.i(Math.floor(x), Math.floor(y))] && W.dist(x, y, sp.x, sp.y) > 18 && W.dist(x, y, car.x, car.y) > 14;
      const route = [spot(s.x, s.y, 2)]; if (!route[0]) return false;
      for (let k = 0; k < 2; k++) { const last = route[route.length - 1]; const b = m.randomCell((x, y, g) => stroll(x, y, g) && W.dist(x, y, last[0], last[1]) > 8 && W.dist(x, y, last[0], last[1]) < 20); if (b) route.push(b); }
      const lead = crew(route[0][0], route[0][1], 0.5, R() < 0.5, { patrol: route.length > 1 ? route : null, speedMul: 0.7, post: route.length > 1 ? null : [route[0][0], route[0][1], 0] }, 0);
      if (!lead) return false;
      for (let i = 1; i < n; i++) {
        const u = crew(lead.x, lead.y, 2.5, R() < W.FOE[0].armed, { post: null }, 0);
        if (u) { u.pack = lead; u.packAt = [W.rand(-2.2, 2.2), W.rand(-2.2, 2.2)]; u.mob = true; }
      }
      lead.mob = true;
      return true;
    },
    // the crew's own roadblock: their car across the street, and them round it
    roadblock(s) {
      const n = Math.max(2, count((2 + R() * 3) * hostileScale));
      block(s, { color: "#3a1a22", hp: 14, maxHp: 14 });
      for (let i = 0; i < n; i++) crew(s.x, s.y, 3, i === 0 || R() < armedShare);
      return true;
    },
    // a pair watching a corner: whatever they see, everyone hears about
    lookouts(s) {
      const n = 1 + (R() < 0.5 + 0.1 * threat ? 1 : 0);
      for (let i = 0; i < n; i++) { const u = crew(s.x, s.y, 1.5, i === 0 && R() < armedShare); if (u) { u.sight += 2; u.lookout = true; } }
      return true;
    },
    mugging(s) {
      const n = Math.max(1, count((1 + R() * 2) * hostileScale));
      for (let i = 0; i < n; i++) crew(s.x, s.y, 1.2, R() < armedShare);
      civ(s.x, s.y, 0.8, false);
      return true;
    },
    accident(s) {
      const L1 = s.lane, ax = L1.axis === "x";
      // the body, in the road, and a squad car across each lane, lights going
      const bx = ax ? s.s : L1.at + (R() - 0.5), by = ax ? L1.at + (R() - 0.5) : s.s;
      block(s, { police: true, color: "#e6e8ef", hp: 14, maxHp: 14 });
      const body = world.add(W.makeUnit("civ", bx, by, { look: T.civLook ? T.civLook() : undefined }));
      body.alive = false; body.hp = 0; body.deadSide = R() < 0.5 ? -1 : 1; body.scene = true;
      for (let i = 0, k = 2 + Math.floor(R() * 2); i < k; i++) police(bx, by, 2.5, false);
      for (let i = 0, k = 3 + Math.floor(R() * 4); i < k; i++) civ(bx, by, 5, true);
      return true;
    },
    // the police stopping the street: anyone with a gun out gets a warning, then worse
    checkpoint(s) {
      block(s, { police: true, color: "#e6e8ef", hp: 14, maxHp: 14 });
      for (let i = 0, k = 3 + Math.floor(R() * 2); i < k; i++) police(s.x, s.y, 3, false);
      for (let i = 0, k = Math.floor(R() * 3); i < k; i++) civ(s.x, s.y, 3, true);
      return true;
    },
    patrol(s) {
      for (let i = 0, k = 2 + Math.floor(R() * 2); i < k; i++) police(s.x, s.y, 2.5, R() < 0.5);
      return true;
    },
    // a crowd round something (a speech, a busker, a fight), and the police watching it
    rally(s) {
      for (let i = 0, k = 12 + Math.floor(R() * 9); i < k; i++) civ(s.x, s.y, 4.5, true);
      for (let i = 0, k = 1 + Math.floor(R() * 2); i < k; i++) police(s.x, s.y, 6, false);
      return true;
    },
    crowd(s) {
      const c = s.cells ? pick(s.cells) : [s.x, s.y];
      for (let i = 0, k = 6 + Math.floor(R() * 7); i < k; i++) civ(c[0], c[1], 3.5, true);
      return true;
    },
  };
  // how many: by the district's size and the threat. First what happens (by
  // weight, the hostile ones by the threat), then a place it fits: more than
  // half of them across the ways in and out, the rest anywhere
  const area = m.w * m.h, scale = area / (224 * 224) * (0.6 + 0.2 * threat);
  const want = Math.max(3, Math.round(area / 1000 * (W.ENCOUNTER_DENSITY[threat] || 0.44)));
  const ways = [[sp, tg], [tg, car]];
  const onWay = s => ways.some(([a, b]) => W.segDist(s.x, s.y, a, b) < W.WAY_WIDTH);
  const used = [], tally = {};
  const fits = (e, s) => e.where.includes(s.kind) && !(e.id === "gang" && s.noGang) && !used.some(u => W.dist(u.x, u.y, s.x, s.y) < 12);
  for (let tries = 0; used.length < want && tries < want * 6; tries++) {
    const open = W.ENCOUNTERS.filter(e => (tally[e.id] || 0) < Math.max(1, Math.round(e.most * scale)));
    if (!open.length) break;
    let total = 0; const ws = open.map(e => { const w = e.weight * (e.hostile ? Math.min(1.5, Math.max(0.3, hostileScale)) : e.police ? (W.POLICE_OUT[threat] ?? 1) : 1); total += w; return w; });
    let r = R() * total, e = open[0];
    for (let i = 0; i < open.length; i++) { r -= ws[i]; if (r <= 0) { e = open[i]; break; } }
    let places = sites.filter(s => fits(e, s));
    // a gang would rather be in a bar or a club, if the district has one free
    if (e.id === "gang" && places.some(s => s.hangout) && R() < 0.75) places = places.filter(s => s.hangout);
    else if (R() < W.ON_THE_WAY && places.some(onWay)) places = places.filter(onWay);
    if (!places.length) continue;
    const s = pick(places), before = world.units.length;
    if (make[e.id](s)) {
      used.push(s); tally[e.id] = (tally[e.id] || 0) + 1;
      // who it is: the crew it put down, for a side job on them
      const crewOf = world.units.slice(before).filter(u => u.faction === "crew");
      (world.encounters || (world.encounters = [])).push({ id: e.id, kind: s.kind, x: s.x, y: s.y, name: s.name, onWay: onWay(s), hostile: !!e.hostile, crew: crewOf });
    }
  }
  // Cal's answer (W.CAL_COUNTERS): more of one kind of trouble across the ways in and out
  const CC = W.CAL_COUNTERS[L.mission && L.mission.counter];
  if (CC && CC.extra) for (let k = 0, n = CC.extra.n + Math.floor(threat / 2); k < n; k++) {
    const e = W.ENCOUNTERS.find(x => x.id === CC.extra.id), places = sites.filter(s => fits(e, s) && onWay(s));
    if (!places.length) break;
    const s = pick(places), before = world.units.length;
    if (make[e.id](s)) {
      used.push(s);
      (world.encounters || (world.encounters = [])).push({ id: e.id, kind: s.kind, x: s.x, y: s.y, name: s.name, onWay: true, hostile: true, crew: world.units.slice(before).filter(u => u.faction === "crew"), cal: true });
    }
  }
  W.makeContracts(world, L, R);
  // and some of the crew just walk the streets alone, in among everyone else
  const stroll = (x, y, g) => W.STROLL.has(g) && W.dist(x, y, sp.x, sp.y) > 18 && W.dist(x, y, car.x, car.y) > 12 && reach[m.i(Math.floor(x), Math.floor(y))];
  for (let i = 0, n = count((1 + R() * 3) * hostileScale * Math.max(1, scale)); i < n; i++) {
    const a = m.randomCell(stroll); if (!a) continue;
    const route = [a];
    // each next stop 15 to 40 tiles from the last one found (a search can come up empty)
    for (let k = 0; k < 3; k++) { const last = route[route.length - 1]; const b = m.randomCell((x, y, g) => stroll(x, y, g) && W.dist(x, y, last[0], last[1]) < 40 && W.dist(x, y, last[0], last[1]) > 15); if (b) route.push(b); }
    plain(W.kitFoe(world.add(W.makeUnit("crew", a[0], a[1], { patrol: route, roamer: true })), level, R() < armedShare, R), 2);
  }
};

/* Side jobs: some of the trouble on the map is on Casey Benton's list as well,
 * paid on top of the job if the squad breaks it up (everyone in it down, run
 * off or talked round) before it leaves. weight: how much it pays, against
 * the campaign's rate for one (L.mission.pay); a sweep's whole job is these.
 * Ordinary jobs get two (three from threat 3), picked among the trouble on
 * the ways in and out, so going for one is a detour, not a trek; a sweep gets
 * four near the mark, and the crew's own hangout there. */
W.CONTRACTS = {
  gang: { weight: 1, text: "Clear out the gang" },
  roadblock: { weight: 1, text: "Clear the crew's roadblock" },
  mob: { weight: 1, text: "Break up the mob" },
  pack: { weight: 0.8, text: "Put down the crew walking the streets" },
  deal: { weight: 0.8, text: "Break up the deal" },
  mugging: { weight: 0.5, text: "Stop the mugging" },
  lookouts: { weight: 0.4, text: "Take out the lookouts" },
  hangout: { weight: 1.5, text: "Break their hangout" },
};
W.makeContracts = (world, L, R) => {
  const kind = W.jobKind(L), threat = L.mission ? L.mission.threat : 3, mk = world.markAt;
  const sweep = kind === "sweep", pay = L.mission && L.mission.pay;
  const near = e => mk ? W.dist(e.x, e.y, mk[0], mk[1]) : 0;
  let pool = (world.encounters || []).filter(e => e.hostile && W.CONTRACTS[e.id] && e.crew.length && (sweep || near(e) > 12));
  const want = sweep ? 4 : threat <= 2 ? 2 : 3;
  if (sweep) pool = pool.sort((a, b) => near(a) - near(b)).slice(0, want + 3);
  else if (pool.some(e => e.onWay)) pool = pool.filter(e => e.onWay);
  const picked = [];
  // different kinds of trouble where the map has them
  while (picked.length < want && pool.length) {
    const fresh = pool.filter(e => !picked.some(p => p.id === e.id)), from = fresh.length ? fresh : pool;
    const e = from[Math.floor(R() * from.length)];
    picked.push(e); pool.splice(pool.indexOf(e), 1);
  }
  const list = picked.map(e => ({ id: e.id, crew: e.crew, x: e.x, y: e.y, name: e.name }));
  if (sweep) { const op = world.units.filter(u => u.op && u.faction === "crew"); if (op.length) list.unshift({ id: "hangout", crew: op, x: mk[0], y: mk[1], name: L.picks.target.name }); }
  world.contracts = list.map(c => Object.assign(c, { weight: W.CONTRACTS[c.id].weight, done: false }));
  for (const c of world.contracts) {
    const money = pay && pay.money ? ` (${W.money(Math.round(pay.money * c.weight / 1000) * 1000)})` : "";
    c.text = `${W.CONTRACTS[c.id].text}${c.name ? ` at ${c.name}` : ""}${money}`;
  }
};
