/* Districts: PumaCity's landmarks as large maps, and missions cut from them.
 *
 * A district is { id, name, w, h, seed, names, theme, build(map), sections }.
 * build() lays the whole place out and marks mission points on it:
 *   map.point("spawn", x, y, name)    where the squad can be dropped
 *   map.point("target", x, y, name)   where a target can be holding court
 *   map.point("exit", x, y, name)     where a target can run to
 * A section is a named rectangle of the district. A mission is a district,
 * optionally a section, and a seed: the seed picks which target spot, which
 * drop point and which way out, so one map gives many missions. */
"use strict";

W.DISTRICTS = {};
W.district = d => { W.DISTRICTS[d.id] = d; return d; };

const mapCache = new Map();
W.districtMap = id => {
  if (!mapCache.has(id)) {
    const d = W.DISTRICTS[id];
    const m = new W.Map(d.w, d.h);
    m.seed = d.seed; m.district = id;
    d.build(m, W.rng(d.seed));
    m.finish();
    // a point that landed in a wall moves to the nearest open ground
    for (const k of Object.keys(m.points)) for (const p of m.points[k]) {
      if (m.walkable(p.x, p.y)) continue;
      const n = m.nearestWalkable(p.x, p.y, 6);
      if (n) { p.x = n[0]; p.y = n[1]; }
    }
    mapCache.set(id, m);
  }
  return mapCache.get(id);
};
W.sectionMap = (id, secId) => {
  const key = id + ":" + secId;
  if (!mapCache.has(key)) {
    const s = W.DISTRICTS[id].sections.find(x => x.id === secId);
    mapCache.set(key, W.districtMap(id).crop(s.x, s.y, s.w, s.h));
  }
  return mapCache.get(key);
};

/* ---- building kit ---- */
W.K = {
  /* A maze of hedges: a recursive-backtracker maze on a grid of cells,
   * each `pitch` tiles (walls one tile thick), with some dead ends knocked
   * through (braid) so there are loops to flank around. rooms: cell
   * rectangles [c, r, w, h] cleared inside; doors: [side, index] gaps in
   * the outer wall (side "n" "s" "w" "e"). Returns the wall grid. */
  maze(rng, cols, rows, { pitch = 3, braid = 0.2, rooms = [], doors = [] } = {}) {
    const W2 = cols * pitch + 1, H2 = rows * pitch + 1;
    const wall = new Uint8Array(W2 * H2).fill(1);
    const open = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) wall[j * W2 + i] = 0; };
    const cell = (c, r) => open(c * pitch + 1, r * pitch + 1, pitch - 1, pitch - 1);
    const seen = new Uint8Array(cols * rows);
    const stack = [[Math.floor(rng() * cols), Math.floor(rng() * rows)]];
    seen[stack[0][1] * cols + stack[0][0]] = 1; cell(...stack[0]);
    const link = (c, r, dc, dr) => {
      if (dc) open(c * pitch + (dc > 0 ? pitch : 0), r * pitch + 1, 1, pitch - 1);
      else open(c * pitch + 1, r * pitch + (dr > 0 ? pitch : 0), pitch - 1, 1);
    };
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (stack.length) {
      const [c, r] = stack[stack.length - 1];
      const next = DIRS.map(([dc, dr]) => [c + dc, r + dr, dc, dr]).filter(([nc, nr]) => nc >= 0 && nr >= 0 && nc < cols && nr < rows && !seen[nr * cols + nc]);
      if (!next.length) { stack.pop(); continue; }
      const [nc, nr, dc, dr] = next[Math.floor(rng() * next.length)];
      link(c, r, dc, dr); cell(nc, nr);
      seen[nr * cols + nc] = 1; stack.push([nc, nr]);
    }
    // braid: knock a wall out of some dead ends
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const exits = DIRS.filter(([dc, dr]) => {
        const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) return false;
        const x = dc ? c * pitch + (dc > 0 ? pitch : 0) : c * pitch + 1, y = dr ? r * pitch + (dr > 0 ? pitch : 0) : r * pitch + 1;
        return !wall[y * W2 + x];
      });
      if (exits.length === 1 && rng() < braid) {
        const opts = DIRS.filter(([dc, dr]) => { const nc = c + dc, nr = r + dr; return nc >= 0 && nr >= 0 && nc < cols && nr < rows; });
        const [dc, dr] = opts[Math.floor(rng() * opts.length)];
        link(c, r, dc, dr);
      }
    }
    for (const [c, r, w, h] of rooms) open(c * pitch + 1, r * pitch + 1, w * pitch - 1, h * pitch - 1);
    for (const [side, i] of doors) {
      if (side === "w") open(0, i * pitch + 1, 1, pitch - 1);
      if (side === "e") open(W2 - 1, i * pitch + 1, 1, pitch - 1);
      if (side === "n") open(i * pitch + 1, 0, pitch - 1, 1);
      if (side === "s") open(i * pitch + 1, H2 - 1, pitch - 1, 1);
    }
    return { wall, w: W2, h: H2 };
  },

  /* Walls of a boolean grid as as few rectangular buildings as possible:
   * runs along each row, stacked where the next row has the same run. */
  walls(m, grid, x0, y0, spec) {
    const { wall, w, h } = grid;
    let active = new Map();
    const done = [];
    for (let y = 0; y <= h; y++) {
      const runs = new Map();
      if (y < h) for (let x = 0; x < w;) {
        if (!wall[y * w + x]) { x++; continue; }
        let e = x; while (e < w && wall[y * w + e]) e++;
        runs.set(x + ":" + e, [x, e]); x = e;
      }
      const next = new Map();
      for (const [k, r] of runs) {
        if (active.has(k)) { const a = active.get(k); a.d++; next.set(k, a); active.delete(k); }
        else next.set(k, { x: r[0], y, w: r[1] - r[0], d: 1 });
      }
      for (const a of active.values()) done.push(a);
      active = next;
    }
    for (const a of done) m.building(Object.assign({ x: x0 + a.x, y: y0 + a.y, w: a.w, d: a.d }, spec));
    return done.length;
  },

  /* the same map, shifted: for a builder written in its own coordinates */
  offset(m, ox, oy) {
    return {
      fill: (x, y, w, h, g) => m.fill(x + ox, y + oy, w, h, g),
      building: b => m.building(Object.assign({}, b, { x: b.x + ox, y: b.y + oy })),
      prop: (t, x, y, o) => m.prop(t, x + ox, y + oy, o),
      light: (x, y, r, c, a) => m.light(x + ox, y + oy, r, c, a),
    };
  },
  /* A city block as a warren: the ground inside its pavements split again
   * and again by alleys, one or two tiles wide, until what is left is lots
   * small enough for one building each. Every alley runs the full length of
   * the piece it splits, so the whole network joins up and reaches the
   * street; narrow ones are common, so a squad has to go single file. Some
   * lots stay open as yards and courtyards; the wider alleys collect bins
   * and crates against one wall.
   * x, y, w, d: the ground inside the block's pavements. o: styles, floors
   * [min, max], maxLot (split anything bigger), signs (neon on street
   * faces), colors, yards (share left open), noAlley (a thin strip: only
   * passages between its buildings). */
  lots(m, rng, x, y, w, d, o = {}) {
    const styles = o.styles || ["office", "concrete", "brick"];
    const [f0, f1] = o.floors || [2, 6];
    const maxLot = o.maxLot || 11;
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const pick = a => a[Math.floor(rng() * a.length)];
    const made = [];
    const alley = (ax, ay, aw, ad) => m.fill(ax, ay, aw, ad, W.G.ALLEY);
    const clutter = (ax, ay, aw, ad, wide) => {
      // bins and crates against one side
      const along = aw >= ad, len = along ? aw : ad;
      for (let t = 1; t < len - 1; t++) {
        const cx = along ? ax + t : ax, cy = along ? ay : ay + t;
        // against one side of a wide alley only: a narrow one is never sealed, so nobody is ever walled in
        if (wide && rng() < 0.1) m.prop(rng() < 0.5 ? "bin" : "crate", cx + 0.5, cy + 0.5);
      }
    };
    const leaf = (lx, ly, lw, ld) => {
      if (lw < 2 || ld < 2) { alley(lx, ly, lw, ld); return; }
      // a yard or a courtyard, now and then
      if (rng() < (o.yards ?? 0.1)) {
        alley(lx, ly, lw, ld);
        if (rng() < 0.6) m.prop("crate", lx + 0.5 + Math.floor(rng() * lw), ly + 0.5 + Math.floor(rng() * ld));
        if (rng() < 0.4) m.prop("box", lx + lw / 2, ly + ld / 2, { w: 1.6, d: 0.9, h: 7, side: "#2a4a3a", top: "#3a5a4a" });   // a dumpster
        return;
      }
      const b = m.building({ x: lx, y: ly, w: lw, d: ld, floors: ri(f0, f1), style: pick(styles), color: o.colors ? pick(o.colors) : undefined });
      made.push(b);
      // a neon sign on a face that looks onto the street
      if (o.signs && rng() < 0.4) {
        const text = pick(o.signs), col = pick(["#ff5266", "#54f2ff", "#ffb000", "#ff8fd8", "#4ade6a", "#b47dff"]);
        if (ly + ld === y + d && lw > 2) m.prop("blade", lx + 1 + rng() * (lw - 2), ly + ld + 0.06, { text, color: col, z: 14 + ri(0, 12) });
        else if (lx + lw === x + w && ld > 2) m.prop("blade", lx + lw + 0.06, ly + 1 + rng() * (ld - 2), { text, color: col, z: 14 + ri(0, 12) });
      }
    };
    const split = (sx, sy, sw, sd, depth) => {
      const long = Math.max(sw, sd);
      if (long <= maxLot && (depth > 0 || o.noAlley) && (long <= 7 || rng() < 0.5)) return leaf(sx, sy, sw, sd);
      if (long < 7) return leaf(sx, sy, sw, sd);
      // split across the longer side, off-centre, with an alley one or two wide
      const aw = o.noAlley || rng() < 0.6 ? 1 : 2;
      const alongX = sw >= sd;
      const L = alongX ? sw : sd;
      const at = Math.max(3, Math.min(L - 3 - aw, Math.floor(L * (0.3 + rng() * 0.4))));
      if (alongX) {
        alley(sx + at, sy, aw, sd); clutter(sx + at, sy, aw, sd, aw > 1);
        split(sx, sy, at, sd, depth + 1); split(sx + at + aw, sy, sw - at - aw, sd, depth + 1);
      } else {
        alley(sx, sy + at, sw, aw); clutter(sx, sy + at, sw, aw, aw > 1);
        split(sx, sy, sw, at, depth + 1); split(sx, sy + at + aw, sw, sd - at - aw, depth + 1);
      }
    };
    split(x, y, w, d, 0);
    // a dim lamp or two down the alleys
    for (let k = 0; k < Math.floor(w * d / 300); k++) {
      const lx = x + Math.floor(rng() * w), ly = y + Math.floor(rng() * d);
      if (m.groundAt(lx, ly) === W.G.ALLEY && m.propAt[m.i(lx, ly)] < 0) { m.prop("lamp", lx + 0.5, ly + 0.5); m.light(lx + 0.7, ly + 0.9, 2, "#ffb35c", 0.16); }
    }
    return made;
  },
  /* the furniture of a block's pavements: lamps, hydrants, bins */
  dress(m, rng, x, y, w, d, step = 8, col = "#ffcf80") {
    for (let i = x + 2; i < x + w - 1; i += step) { m.prop("lamp", i + 0.5, y + 0.3); m.light(i + 0.7, y + 0.7, 2.4, col, 0.2); m.prop("lamp", i + 0.5, y + d - 0.3); m.light(i + 0.7, y + d + 0.1, 2.4, col, 0.2); }
    for (let j = y + 2 + step / 2; j < y + d - 1; j += step) { m.prop("lamp", x + 0.3, j + 0.5); m.light(x + 0.7, j + 0.7, 2.4, col, 0.2); m.prop("lamp", x + w - 0.3, j + 0.5); m.light(x + w + 0.1, j + 0.7, 2.4, col, 0.2); }
    if (rng() < 0.7) m.prop("hydrant", x + 3.5 + Math.floor(rng() * (w - 7)), y + 0.4);
    if (rng() < 0.7) m.prop("bin", x + w - 0.5, y + 3.5 + Math.floor(rng() * (d - 7)));
  },
  /* traffic lights at every junction of the map's streets */
  /* Traffic lights: one set per approach to each junction (a divided
   * road's crossing counts as one junction), each on the near-side corner,
   * all running off the same clock. */
  signals(m) {
    for (const j of m.junctionBoxes()) {
      m.prop("signal", j.x0 - 0.35, j.y0 - 0.35, { axis: "y" });   // southbound traffic arriving from the north
      m.prop("signal", j.x1 + 0.35, j.y1 + 0.35, { axis: "y" });   // northbound, from the south
      m.prop("signal", j.x1 + 0.35, j.y0 - 0.35, { axis: "x" });   // westbound, from the east
      m.prop("signal", j.x0 - 0.35, j.y1 + 0.35, { axis: "x" });   // eastbound, from the west
    }
  },
  /* fences either side of a railway, broken where streets cross it */
  railFence(m, axis, at, from, to) {
    for (let t = from; t < to; t++) {
      const [x1, y1, x2, y2] = axis === "x" ? [t, at - 1, t, at + 4] : [at - 1, t, at + 4, t];
      for (const [fx, fy] of [[x1, y1], [x2, y2]]) {
        if (!m.inb(fx, fy)) continue;
        const g = m.ground[m.i(fx, fy)];
        if (g === W.G.ROAD || g === W.G.PLAZA || m.height[m.i(fx, fy)] > 0 || m.roofOf[m.i(fx, fy)] >= 0 || m.propAt[m.i(fx, fy)] >= 0) continue;
        m.prop("fence", fx + 0.5, fy + 0.5, { axis });
      }
    }
  },
  /* a fence along a line of cells */
  fence(m, x0, y0, x1, y1) {
    if (y0 === y1) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) m.prop("fence", x + 0.5, y0 + 0.5, { axis: "x" });
    else for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) m.prop("fence", x0 + 0.5, y + 0.5, { axis: "y" });
  },
  /* lamps every `step` cells along a line, each with its pool of light */
  lamps(m, x0, y0, x1, y1, step, col = "#ffcf80", type = "lamp") {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      m.prop(type, x, y);
      m.light(x + 0.2, y + 0.4, type === "flood" ? 4.5 : 2.4, col, type === "flood" ? 0.22 : 0.2);
    }
  },
  /* A car park: a two-lane loop road round its edge, drive aisles between
   * double rows of bays, cars only in the bays, and gates from the loop out
   * to the street: o.gates [[side, offset, width]], side "n" "s" "e" "w".
   * Light masts on the islands. */
  parking(m, rng, x, y, w, h, o = {}) {
    const fill = o.fill ?? 0.6;
    m.fill(x, y, w, h, W.G.PARK);
    m.drive(x, y, w, 2); m.drive(x, y + h - 2, w, 2); m.drive(x, y, 2, h); m.drive(x + w - 2, y, 2, h);
    let yy = y + 2;
    while (yy + 6 <= y + h - 2) {
      m.drive(x + 2, yy + 2, w - 4, 2);                 // the aisle, joined to the loop at both ends
      for (let bx = x + 2; bx < x + w - 2; bx++) {
        m.setMark(bx, yy, 1, 2, W.MARK.BAY); m.setMark(bx, yy + 4, 1, 2, W.MARK.BAY);
        if (rng() < fill) m.park(bx + 0.5, yy + 1, "y", null, 1);
        if (rng() < fill) m.park(bx + 0.5, yy + 5, "y", null, -1);
      }
      yy += 6;
    }
    if (yy < y + h - 2) m.drive(x + 2, yy, w - 4, y + h - 2 - yy);
    for (const [side, off, gw] of o.gates || []) {
      const n = gw || 4;
      if (side === "n") m.driveway(x + off, y, n, 1, "n");
      if (side === "s") m.driveway(x + off, y + h - 1, n, 1, "s");
      if (side === "w") m.driveway(x, y + off, 1, n, "w");
      if (side === "e") m.driveway(x + w - 1, y + off, 1, n, "e");
    }
    for (const [cx, cy] of [[x + 1, y + 1], [x + w - 1, y + 1], [x + 1, y + h - 1], [x + w - 1, y + h - 1]]) { m.prop("lamp", cx, cy); m.light(cx + 0.2, cy + 0.4, 4, "#fff3c4", 0.14); }
  },
};

/* ---- missions from districts ---- */
W.CODENAMES = ["NIGHT SHIFT", "LONG GRASS", "SILENT PAW", "DEAD DROP", "COLD TRAIL", "RED THREAD", "LAST ORDERS", "LOW TIDE", "BLACK VELVET", "HIGH WIRE", "SOFT LANDING", "WHISKER", "GREY MARKET", "STRAY DOG", "MILK RUN"];

/* Build a level: { district, landmark?, seed? }.
 * Every mission is played on the whole district: the squad can walk
 * anywhere in it. What a mission chooses is where things are: a target spot
 * (in the landmark, if one is named), a drop point a long walk from it, the
 * way out the target runs for, away from the squad, and the pickup where the
 * getaway car waits. */
/* how far the drop point is from the target, as a share of the district's size */
W.DROP_NEAR = 0.35;
W.DROP_FAR = 0.75;
/* The pickup: one named spot on the map's edge (a road leaving the district)
 * where the squad gets out once the job is done. Far from the target, never
 * the way the target runs, and if it can be, nowhere near the drop point, so
 * the way out is a second long walk and not the first one again. */
W.pickupFor = (m, target, spawn, exit, rng, all = false) => {
  const size = Math.max(m.w, m.h), edge = p => Math.min(p.x, p.y, m.w - p.x, m.h - p.y);
  const pool = m.points.exit.concat(m.points.spawn).filter(p => p !== exit && edge(p) <= 12);
  const dT = p => W.dist(p.x, p.y, target.x, target.y), dS = p => W.dist(p.x, p.y, spawn.x, spawn.y);
  const tiers = [
    pool.filter(p => dT(p) >= 0.4 * size && dS(p) >= 0.3 * size),
    pool.filter(p => dT(p) >= 0.4 * size && dS(p) >= 24),
    pool.filter(p => dT(p) >= 0.3 * size),
  ];
  // all: every spot that would do, for the briefing's plan (W.planOptions)
  if (all) return pool.filter(p => dT(p) >= 0.3 * size);
  const list = tiers.find(t => t.length);
  if (!list) return spawn;   // nowhere better: back where the squad came in
  return list[Math.floor(rng() * list.length)];
};
/* The plan: what the briefing offers in place of the drop point and the
 * pickup the seed picked. Up to three of each, the seed's first, the others
 * at least 30 tiles from any already in, each with its own name: a short walk
 * in that leaves a long one out, a pickup on the far side of the trouble, a
 * drop near the target's way out. */
W.PLAN_APART = 30;
W.planOptions = (L, spawns, pickups) => {
  const pick = (first, list) => {
    const out = [first];
    // the furthest from the seed's own first, so the choices differ
    for (const p of list.slice().sort((a, b) => W.dist(first.x, first.y, b.x, b.y) - W.dist(first.x, first.y, a.x, a.y))) {
      if (out.length >= 3) break;
      if (out.some(o => o.name === p.name || W.dist(o.x, o.y, p.x, p.y) < W.PLAN_APART)) continue;
      out.push(p);
    }
    return out;
  };
  return { spawn: pick(L.picks.spawn, spawns), pickup: pick(L.picks.pickup, pickups) };
};
/* The getaway car: parked off the road (a sidewalk, a verge, a yard) a few
 * tiles in from the pickup's spot on the edge, side-on to that edge. It is
 * the way out: a Watcher who reaches it is out. Armoured: it does not burn. */
W.GETAWAY_ON = new Set([W.G.WALK, W.G.PLAZA, W.G.GRASS, W.G.DIRT, W.G.PARK, W.G.PAD, W.G.TARMAC, W.G.FIELD]);
W.placeGetaway = (world, p) => {
  const m = world.map, reach = W.reachable(m);
  const side = [p.x, m.w - p.x, p.y, m.h - p.y], e = side.indexOf(Math.min(...side));
  const axis = e < 2 ? "x" : "y";
  // where it would rather be: about five tiles in from the edge, level with the spot
  const ix = e === 0 ? 5.5 : e === 1 ? m.w - 5.5 : p.x, iy = e === 2 ? 5.5 : e === 3 ? m.h - 5.5 : p.y;
  const ok = (x, y) => m.inb(x, y) && m.walk[m.i(x, y)] && reach[m.i(x, y)] && m.roofOf[m.i(x, y)] < 0 && W.GETAWAY_ON.has(m.ground[m.i(x, y)]);
  let best = null, bd = Infinity;
  for (let y = Math.floor(iy) - 10; y <= iy + 10; y++) for (let x = Math.floor(ix) - 10; x <= ix + 10; x++) {
    if (!ok(x, y) || !(axis === "x" ? ok(x + 1, y) : ok(x, y + 1))) continue;
    const d = W.dist(x + 0.5, y + 0.5, ix, iy);
    if (d < bd) { bd = d; best = [x, y]; }
  }
  const at = best ? [best[0] + (axis === "x" ? 1 : 0.5), best[1] + (axis === "x" ? 0.5 : 1)] : (m.nearestWalkable(ix, iy, 8) || [p.x, p.y]);
  world.cars.push({ isCar: true, id: "getaway", getaway: true, parked: true, axis, dir: e === 1 || e === 3 ? 1 : -1, x: at[0], y: at[1], z: 0,
    len: 1.9, wid: 0.95, speed: 0, hp: 40, maxHp: 40, color: "#34405a", alive: true });
  world.pickupAt = at; world.pickupName = p.name;
};
const cropCache = new Map();
W.cropOf = (id, x, y, w, h) => {
  const key = `${id}@${x},${y},${w},${h}`;
  if (!cropCache.has(key)) { if (cropCache.size > 12) cropCache.delete(cropCache.keys().next().value); cropCache.set(key, W.districtMap(id).crop(x, y, w, h)); }
  return cropCache.get(key);
};
/* a district's landmarks: the areas its target spots belong to */
W.landmarks = id => {
  const m = W.districtMap(id), out = [];
  for (const p of m.points.target) { const a = W.areaOf(id, p); if (a && !out.includes(a)) out.push(a); }
  return out;
};
W.areaOf = (id, p) => {
  if (p.area) return p.area;
  const d = W.DISTRICTS[id];
  const s = (d.sections || []).find(s => p.x >= s.x && p.y >= s.y && p.x < s.x + s.w && p.y < s.y + s.h);
  return s ? s.name : null;
};
W.missionLevel = (o) => {
  const d = W.DISTRICTS[o.district];
  const sec = o.section ? d.sections.find(s => s.id === o.section) : null;
  const seed = o.seed ?? Math.floor(Math.random() * 1e9);
  const full = sec ? W.sectionMap(d.id, sec.id) : W.districtMap(d.id);
  const rng = W.rng(seed);
  const P = full.points;
  let targets = P.target;
  if (o.landmark) targets = targets.filter(p => W.areaOf(d.id, p) === o.landmark);
  if (!targets.length || !P.spawn.length) throw new Error(`${d.id}: no target or spawn points`);
  const target = targets[Math.floor(rng() * targets.length)];
  const byDist = (list, from) => list.map(p => [p, W.dist(p.x, p.y, from.x, from.y)]);
  // the drop point: a long walk from the target, across a good part of the district
  const size = Math.max(full.w, full.h);
  let spawns = byDist(P.spawn, target).filter(([, dd]) => dd >= W.DROP_NEAR * size && dd <= W.DROP_FAR * size);
  if (!spawns.length) spawns = byDist(P.spawn, target).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const spawn = spawns[Math.floor(rng() * spawns.length)][0];
  let exits = byDist(P.exit, target).filter(([, dd]) => dd >= 16 && dd <= 50);
  if (!exits.length) exits = byDist(P.exit, target).sort((a, b) => a[1] - b[1]).slice(0, 1);
  exits.sort((a, b) => W.dist(b[0].x, b[0].y, spawn.x, spawn.y) - W.dist(a[0].x, a[0].y, spawn.x, spawn.y));
  let exit = exits[0] ? exits[0][0] : null;
  const pickup = W.pickupFor(full, target, spawn, exit, rng);
  // the whole district is the mission: the squad can go anywhere in it
  const map = () => full, picks = { spawn, target, exit, pickup }, win = null;
  const options = W.planOptions({ picks }, spawns.map(([p]) => p), W.pickupFor(full, target, spawn, exit, rng, true));
  const names = Object.assign({}, d.names, { target: d.names.targets[Math.floor(rng() * d.names.targets.length)] });
  const codename = W.CODENAMES[Math.floor(rng() * W.CODENAMES.length)];
  const T = d.theme;
  const area = W.areaOf(d.id, target);
  return {
    id: `${d.id}/${sec ? sec.id : o.landmark || "any"}/${seed}`, district: d.name, name: area || (sec ? sec.name : d.name), codename, names, seed,
    w: win ? win.w : full.w, h: win ? win.h : full.h, window: win, districtId: d.id,
    picks, options,
    makeMap: map,
    // the briefing follows the kind of job the campaign attaches (L.mission.kind)
    get briefing() {
      const kind = W.jobKind(this), at = `${target.name}${area && !target.name.includes(area.toLowerCase()) ? `, ${area}` : ""}`;
      const common = [["Bodyguards", `${T.guards}, in black. They stay close.`], ["Crew", `${T.crew} of ${names.crew}, in red; at the higher threats, not all of them.`], [names.sec, `${T.sec} on patrol. Neutral until provoked.`], ["Ground", T.ground], ["Pickup", `The getaway car, at ${picks.pickup.name}: the only way out. Whatever is on the streets between is still there on the way back.`]];
      if (kind === "persuade") return {
        from: "Watch-Captain Joyeuse",
        text: [
          `${names.target} knows how ${T.racket} runs in ${d.name}, and Casey Benton wants them working for him. Nobody dies for this one.`,
          `They are at ${at}, with minders. You go in from ${picks.spawn.name}. Get close with the Purrsuader, talk them round, and walk them out to the getaway car at ${picks.pickup.name}.`,
          `${T.secNote}`,
          exit ? `If the alarm goes up, ${names.target} runs for ${exit.name}. If they make it, or die, the job is lost.` : `If they die, the job is lost.`,
        ],
        intel: [["Subject", `${names.target}, at ${target.name}: the red ring on the map. Not to be harmed.`]].concat(common),
      };
      const jk = W.jobKind(this);
      if (jk === "job") return {
        from: "Watch-Captain Joyeuse",
        text: [
          `${names.crew} keep something in a safe at ${at} that Casey Benton would rather have himself.`,
          `You go in from ${picks.spawn.name}. A Watcher has to stand at the safe while it opens, a few seconds; then the goods go out with whoever carries them, to the getaway car at ${picks.pickup.name}.`,
          `${T.secNote}`,
          `If the carrier goes down, the goods drop where they fall. Pick them up and keep going.`,
        ],
        intel: [["Safe", `At ${target.name}: the red ring on the map.`]].concat(common),
      };
      if (jk === "crackdown") return {
        from: "Watch-Captain Joyeuse",
        text: [
          `${this.mission && this.mission.cal ? "Cal's people are" : names.crew + " are"} running ${T.racket} out of ${at}, under Casey Benton's nose.`,
          `Break it up. Burn the stash, and put down or drive off most of the crew; when the stash goes, some of them will run. You go in from ${picks.spawn.name}.`,
          `${T.secNote}`,
          `Then get out: the getaway car waits at ${picks.pickup.name}. Nowhere else counts.`,
        ],
        intel: [["Stash", `At ${target.name}: the red ring on the map. It burns.`]].concat(common),
      };
      if (jk === "sweep") return {
        from: "Watch-Captain Joyeuse",
        text: [
          `${this.mission && this.mission.cal ? "Cal's people are" : names.crew + " are"} all over ${d.name}, from their hangout at ${at} out. Casey Benton wants them taught a lesson.`,
          `Their hangout, and the worst of what's on the streets near it, are marked. Break up one and they'll know you're there; every one you break pays. You go in from ${picks.spawn.name}.`,
          `${T.secNote}`,
          `Leave when you've had enough: the getaway car waits at ${picks.pickup.name}. Nowhere else counts, and nothing's paid if nobody gets there.`,
        ],
        intel: [["Hangout", `At ${target.name}: the red ring on the map. The trouble round it, their operations, in gold.`]].concat(common),
      };
      if (jk === "siege") return {
        from: "Watch-Captain Joyeuse",
        text: [
          `${this.mission && this.mission.cal ? "Cal's people have" : names.crew + " have"} dug in near ${at}, and they are not coming out.`,
          `Every one of them goes down. They will hold their posts and shoot from cover; the BanHammer was made for this. You go in from ${picks.spawn.name}.`,
          `${T.secNote}`,
          `Then get out: the getaway car waits at ${picks.pickup.name}. Nowhere else counts.`,
        ],
        intel: [["Defenders", `Inside the building nearest ${target.name}. Armed, all of them.`]].concat(common.slice(2)),
      };
      if (jk === "intel") return {
        from: "Watch-Captain Joyeuse",
        text: [
          `${names.crew} keep their books on a terminal at ${at}. Casey Benton wants a copy, and nobody needs to know.`,
          `You go in from ${picks.spawn.name}. A Watcher has to stand at the terminal while it copies, a few seconds, then carry the data out to the getaway car at ${picks.pickup.name}.`,
          `${T.secNote}`,
          `If whoever carries the data dies, it dies with them.`,
        ],
        intel: [["Terminal", `At ${target.name}: the red ring on the map.`]].concat(common),
      };
      return {
        from: "Watch-Captain Joyeuse",
        text: [
          `${names.target} is running ${T.racket} out of ${d.name}. Casey Benton wants it stopped, and ${names.target} with it.`,
          `Last seen at ${at}. You go in from ${picks.spawn.name}.`,
          `${T.secNote}`,
          exit ? `If ${names.target} spooks, expect a run for ${exit.name}. If they make it out, the contract is lost.` : `${names.target} has nowhere to run. Make it count.`,
          `Then get out: the getaway car waits at ${picks.pickup.name}. Nowhere else counts.`,
        ],
        intel: [["Target", `${names.target}, at ${target.name}: the red ring on the map. The amber one is where they'll run.`]].concat(common),
      };
    },
    intro() {
      const kind = W.jobKind(this);
      const first = kind === "persuade" ? `JOYEUSE: ${names.target} is at ${target.name}. Talk them round; nobody gets hurt.`
        : kind === "intel" ? `JOYEUSE: the terminal is at ${target.name}. In, copy, out.`
        : kind === "job" ? `JOYEUSE: the safe is at ${target.name}. Open it, take it, go.`
        : kind === "crackdown" ? `JOYEUSE: the stash is at ${target.name}. Burn it, and break them.`
        : kind === "siege" ? `JOYEUSE: they're dug in by ${target.name}. Nobody walks out of there but us.`
        : kind === "sweep" ? `JOYEUSE: their hangout's at ${target.name}, and they're all over the streets round it. Break what you can.`
        : `JOYEUSE: ${names.target} is at ${target.name}. Go quietly.`;
      return [[first, "#54f2ff"], [`The getaway car is at ${picks.pickup.name}. Plan the way back.`, "#54f2ff"], [`Weapons are holstered. ${names.sec} will warn anyone with a gun out.`, "#94a0c4"]];
    },
    populate(world, opts) { W.populateMission(world, this, d, opts); },
  };
};

/* The people of a district mission, from its theme. */
/* The kind of job on the ground, from the campaign's L.mission.kind: a hit on
 * Cal's crew is a crackdown; a story step is a hit on the lieutenant (step 1),
 * turning their network (step 2, quiet), then locking it down (step 3). */
W.jobKind = L => {
  const M = L.mission; if (!M) return "assassinate";
  if (M.kind === "story") return ["assassinate", "persuade", "siege"][M.step || 0] || "assassinate";
  if (M.kind === "cal") return "crackdown";
  return M.kind;
};
W.populateMission = (world, L, d, opts) => {
  const m = world.map, T = d.theme, rng = W.rng(L.seed + 7);
  const R = () => rng();
  // somewhere near (x, y) to stand: open ground a path reaches (never a walled-in pocket)
  const reachMap = W.reachable(m), reachable = p => p && reachMap[m.i(Math.floor(p[0]), Math.floor(p[1]))];
  const near = (x, y, r) => { for (let k = 0; k < 30; k++) { const a = R() * Math.PI * 2, dd = R() * r; const p = m.nearestWalkable(x + Math.cos(a) * dd, y + Math.sin(a) * dd, 4); if (p && W.STROLL.has(m.groundAt(p[0], p[1])) && reachable(p)) return p; } const q = m.nearestWalkable(x, y, 6); return reachable(q) ? q : null; };
  const stroll = (x, y, g) => W.STROLL.has(g);
  // the crowd
  let cells = 0; for (let k = 0; k < m.w * m.h; k++) if (m.walk[k] && W.STROLL.has(m.ground[k])) cells++;
  const nCiv = Math.min(T.civMax || 70, Math.round(cells * (T.civ || 0.01)));
  for (let i = 0; i < nCiv; i++) {
    const p = m.randomCell(stroll);
    if (p) world.add(W.makeUnit("civ", p[0] + W.rand(-0.3, 0.3), p[1] + W.rand(-0.3, 0.3), { look: T.civLook ? T.civLook() : undefined }));
  }
  // and where people gather: terraces, queues, markets
  for (const cr of m.crowds) for (let i = 0; i < cr.n; i++) {
    const a = R() * Math.PI * 2, d2 = R() * cr.r;
    const p = m.nearestWalkable(cr.x + Math.cos(a) * d2, cr.y + Math.sin(a) * d2, 3);
    if (p) world.add(W.makeUnit("civ", p[0] + W.rand(-0.3, 0.3), p[1] + W.rand(-0.3, 0.3), { look: T.civLook ? T.civLook() : undefined, home: p, crowd: true }));
  }
  // standing garrisons
  W.spawnGarrisons(world);
  // the enemy at the campaign's threat (L.mod, see docs/missions.md): how many, against the
  // district's usual numbers, and their level (W.FOE: what they carry, how tough); without
  // one, the district's usual strength at level 2
  const mod = L.mod, level = W.foeLevel(L), F = W.FOE[level];
  const count = (n, k) => mod ? Math.round(n * (mod[k] ?? 1)) : n;
  // a quiet job is watched, not held: fewer of the operation's people round the mark than a crackdown or a hit
  const kind = W.jobKind(L), threat = L.mission ? L.mission.threat : 3, quietJob = kind === "persuade" || kind === "intel" || kind === "job";
  // Cal's answer to how the squad has been playing (W.CAL_COUNTERS): set out differently round the mark
  const counter = L.mission && L.mission.counter, CC = W.CAL_COUNTERS[counter] || {};
  const nSec = count(T.sec, "sec"), nGuards = Math.round(count(T.guards, "guards") * (quietJob ? 0.5 : 1) * (CC.guards || 1)), nCrew = Math.round(count(T.crew, "crew") * (quietJob ? 0.6 : 1));
  // who carries anything: an exact share of crew and guards together, picked by the seed
  const nArmed = Math.round((nGuards + nCrew) * F.armed);
  const all = [...Array(nGuards + nCrew).keys()];
  const armedSlots = new Set(all.map(i => [R(), i]).sort((a, b) => a[0] - b[0]).slice(0, nArmed).map(([, i]) => i));
  // plain clothes: more of them the higher the threat (Math.random, so the seed's layout stands)
  const undercover = W.UNDERCOVER[L.mission ? L.mission.threat : 3] || 0;
  const plain = u => { if (Math.random() < undercover) W.disguise(u, T.civLook ? T.civLook() : undefined); return u; };
  // local security
  for (let i = 0; i < nSec; i++) {
    const base = m.randomCell(stroll) || [L.picks.target.x, L.picks.target.y];
    const route = [base, near(base[0], base[1], 9), near(base[0], base[1], 9)];
    const u = world.add(W.makeUnit("sec", base[0], base[1], { home: base, patrol: route, look: T.secLook ? T.secLook() : undefined }));
    W.giveWeapon(u, "pistol");
  }
  if (opts.attract) return;
  const tg = L.picks.target;
  const tp = m.nearestWalkable(tg.x, tg.y, 6);
  world.markAt = tp;
  let target = null, fort = null;
  if (kind === "persuade") {
    // the subject: someone to talk round and walk out, not to kill
    const s = world.add(W.makeUnit("civ", tp[0], tp[1], { subject: true, name: L.names.target, post: [tp[0], tp[1], R() * 6.28],
      look: { coat: "#d8c08a", trim: "#7dffb0", legs: "#3a3226", fur: W.pick(W.FURS), hat: "#8a6a3a", long: true }, need: Math.max(0, threat - 1), hp: 14, maxHp: 14 }));
    world.subjectUnit = s;
  } else if (kind === "intel") {
    world.terminal = { x: tp[0], y: tp[1], need: 6, t: 0, name: tg.name };
  } else if (kind === "job") {
    // a safe: crack it (a few seconds), take the goods
    world.terminal = { x: tp[0], y: tp[1], need: 3, t: 0, name: tg.name, safe: true };
  } else if (kind === "crackdown") {
    // the operation's stash: crates that burn, among the crew
    const st = { isCar: true, id: "stash", stash: true, parked: true, axis: "x", dir: 1, x: tp[0], y: tp[1], z: 0, len: 1.4, wid: 1.2, speed: 0, hp: 30, maxHp: 30, color: "#6a5236", alive: true };
    world.cars.push(st); world.stash = st;
  } else if (kind === "sweep") {
    // no one name: their hangout at the mark, and the trouble round it (the side jobs are the job)
    world.sweep = { x: tp[0], y: tp[1], name: tg.name };
  } else if (kind === "siege") {
    // dug in: the building nearest the mark, held from inside
    const inside = W.encounterSites(m).filter(s => s.kind === "indoor" && s.cells && s.cells.length >= 12).sort((a, b) => W.dist(a.x, a.y, tp[0], tp[1]) - W.dist(b.x, b.y, tp[0], tp[1]))[0];
    fort = inside && W.dist(inside.x, inside.y, tp[0], tp[1]) < 45 ? inside : { x: tp[0], y: tp[1], name: tg.name, cells: null };
    world.siege = { x: fort.x, y: fort.y, name: fort.name || tg.name };
  } else {
    target = world.add(W.makeUnit("target", tp[0], tp[1], { post: [tp[0], tp[1], R() * 6.28], name: L.names.target }));
    W.kitFoe(target, level, false, R);
    W.giveWeapon(target, "pistol", undefined, Math.min(3, level));
    world.targetUnit = target;
  }
  // bodyguards stand close round a target; on a quiet job they watch the approaches from further out
  const ring = (kind === "persuade" ? 7 : kind === "intel" || kind === "job" ? 5 : kind === "crackdown" || kind === "sweep" ? 2.4 : 1.6) * (CC.spread || 1);
  // a siege: every guard and crew member a defender, posted inside, holding
  const reach = W.reachable(m), reached = c => c && reach[m.i(Math.floor(c[0]), Math.floor(c[1]))];
  const defend = (u, i, n) => {
    let c = fort.cells ? fort.cells[Math.floor(i * fort.cells.length / Math.max(1, n))] : null;
    // spread out against the BanHammer: every other defender holds the streets round the building instead
    if (CC.spread && i % 2) c = near(fort.x, fort.y, 8 + 4 * CC.spread);
    // never somewhere nobody can get to
    for (let k = 0; !reached(c) && k < 24; k++) c = m.nearestWalkable(fort.x + R() * 8 - 4, fort.y + R() * 8 - 4, 3);
    if (!reached(c)) c = [fort.x, fort.y];
    if (c) { u.x = c[0]; u.y = c[1]; u.post = [c[0], c[1], R() * 6.28]; u.patrol = null; }
    u.defender = true; u.op = true;
  };
  for (let i = 0; i < nGuards; i++) {
    const a = i / nGuards * Math.PI * 2 + R();
    let p = m.nearestWalkable(tp[0] + Math.cos(a) * ring, tp[1] + Math.sin(a) * ring, 3);
    if (!reachable(p)) p = near(tp[0], tp[1], ring) || tp;
    const g = W.kitFoe(world.add(W.makeUnit("guard", p[0], p[1], { post: [p[0], p[1], a], dir: a, op: true })), level, armedSlots.has(i), R, "guard");
    if (CC.tough) { g.hp = g.maxHp = Math.round(g.maxHp * CC.tough); }
    if (fort) defend(g, i, nGuards + nCrew);
  }
  for (let i = 0; i < nCrew; i++) {
    const p = near(tp[0], tp[1], (i % 2 ? 9 : 16) * (CC.spread ? 1.6 : 1));
    if (!p) continue;
    const o = i % 3 === 2 ? { patrol: [p, near(p[0], p[1], 10), near(tp[0], tp[1], 12)] } : { post: [p[0], p[1], R() * 6.28] };
    const u = plain(W.kitFoe(world.add(W.makeUnit("crew", p[0], p[1], Object.assign(o, { op: true }))), level, armedSlots.has(nGuards + i), R));
    if (fort) defend(u, nGuards + i, nGuards + nCrew);
    if (fort && !W.hasGun(u)) W.giveWeapon(u, "pistol", undefined, Math.min(3, level || 1));   // a siege: nobody inside is unarmed
  }
  // what else is going on: gangs, deals, the police, crowds, roaming crew (encounters.js)
  W.populateEncounters(world, L, d, opts);
  if (L.picks.exit) world.escapePoint = m.nearestWalkable(L.picks.exit.x, L.picks.exit.y, 6);
  if (L.picks.pickup) W.placeGetaway(world, L.picks.pickup);
  // the squad
  const sp = L.picks.spawn;
  const spots = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => m.nearestWalkable(sp.x + a - 0.5, sp.y + b - 0.5, 5) || [sp.x, sp.y]);
  W.spawnSquad(world, opts.roster || W.defaultRoster(), spots);
  if (CC.sight) for (const u of world.units) if (u.op || u.lookout) u.sight += CC.sight;
  // a ring of lookouts round the mark, facing out: every way in passes one
  if (CC.ring) for (let k = 0, n = CC.ring.n + Math.floor(threat / 2); k < n; k++) {
    const a = (k + R()) / n * Math.PI * 2, r = CC.ring.r[0] + R() * (CC.ring.r[1] - CC.ring.r[0]);
    const p = m.nearestWalkable(tp[0] + Math.cos(a) * r, tp[1] + Math.sin(a) * r, 4);
    if (!reachable(p)) continue;
    const u = plain(W.kitFoe(world.add(W.makeUnit("crew", p[0], p[1], { post: [p[0], p[1], a], dir: a, op: true, lookout: true })), level, R() < F.armed, R));
    u.sight += CC.ring.sight;
  }
  world.startAt = [sp.x, sp.y];
  if (world.subjectUnit) world.objective({ type: "persuade", unit: world.subjectUnit, text: `Talk ${L.names.target} round, and walk them out` });
  // a persuade job with nobody carrying a Purrsuader cannot be done: say so at once, rather than let them find out
  if (world.subjectUnit && !world.agents.some(a => a.weapons.some(w => W.WEAPONS[w.type].persuade))) {
    world.noPurr = true;
    world.msg("JOYEUSE: nobody's carrying a Purrsuader. You can't talk anyone round like that; abort, and come back with one.", "#ffb000");
  }
  else if (world.terminal && world.terminal.safe) world.objective({ type: "job", text: `Crack the safe at ${tg.name} (${world.terminal.need} seconds), and get the goods out` });
  else if (world.terminal) world.objective({ type: "intel", text: `Copy the data at ${tg.name} (hold the terminal ${world.terminal.need} seconds)` });
  else if (world.stash) world.objective({ type: "crackdown", text: `Break up the operation at ${tg.name}: destroy the stash, and put down or drive off most of the crew` });
  else if (world.siege) world.objective({ type: "siege", text: `Take ${world.siege.name}: every defender down` });
  else if (world.sweep) world.objective({ type: "sweep", text: "Take out the opposition: break up at least one of them, more for more pay" });
  else world.objective({ type: "kill", unit: target, text: `Eliminate ${L.names.target}` });
  // the side jobs (a sweep's are the job itself)
  for (const c of world.contracts || []) world.objective({ type: "contract", optional: !world.sweep, contract: c, text: c.text });
  world.objective({ type: "recruit", n: 5, optional: true, text: "Recruit 5 followers with the Purrsuader" });
  world.objective({ type: "civcap", n: 4, optional: true, text: "Lose no more than 4 civilians" });
};
