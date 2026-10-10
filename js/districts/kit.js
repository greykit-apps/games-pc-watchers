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
 * (in the landmark, if one is named), a drop point 24 to 60 tiles from it,
 * and the way out that leads away from the squad. */
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
  let spawns = byDist(P.spawn, target).filter(([, dd]) => dd >= 24 && dd <= 60);
  if (!spawns.length) spawns = byDist(P.spawn, target).filter(([, dd]) => dd >= 12).sort((a, b) => a[1] - b[1]).slice(0, 2);
  if (!spawns.length) spawns = byDist(P.spawn, target).sort((a, b) => b[1] - a[1]).slice(0, 1);
  const spawn = spawns[Math.floor(rng() * spawns.length)][0];
  let exits = byDist(P.exit, target).filter(([, dd]) => dd >= 16 && dd <= 50);
  if (!exits.length) exits = byDist(P.exit, target).sort((a, b) => a[1] - b[1]).slice(0, 1);
  exits.sort((a, b) => W.dist(b[0].x, b[0].y, spawn.x, spawn.y) - W.dist(a[0].x, a[0].y, spawn.x, spawn.y));
  let exit = exits[0] ? exits[0][0] : null;
  // the whole district is the mission: the squad can go anywhere in it
  const map = () => full, picks = { spawn, target, exit }, win = null;
  const names = Object.assign({}, d.names, { target: d.names.targets[Math.floor(rng() * d.names.targets.length)] });
  const codename = W.CODENAMES[Math.floor(rng() * W.CODENAMES.length)];
  const T = d.theme;
  const area = W.areaOf(d.id, target);
  return {
    id: `${d.id}/${sec ? sec.id : o.landmark || "any"}/${seed}`, district: d.name, name: area || (sec ? sec.name : d.name), codename, names, seed,
    w: win ? win.w : full.w, h: win ? win.h : full.h, window: win, districtId: d.id,
    picks,
    makeMap: map,
    briefing: {
      from: "Watch-Captain Joyeuse",
      text: [
        `${names.target} is running ${T.racket} out of ${d.name}. Casey Benton wants it stopped, and ${names.target} with it.`,
        `Last seen at ${target.name}${area && !target.name.includes(area.toLowerCase()) ? `, ${area}` : ""}. You go in from ${spawn.name}.`,
        `${T.secNote}`,
        exit ? `If ${names.target} spooks, expect a run for ${exit.name}. If they make it out, the contract is lost.` : `${names.target} has nowhere to run. Make it count.`,
      ],
      intel: [
        ["Target", `${names.target}, marked in amber, at ${target.name}.`],
        ["Bodyguards", `${T.guards}, in black. They stay close.`],
        ["Crew", `${T.crew} of ${names.crew}, in red.`],
        [names.sec, `${T.sec} on patrol. Neutral until provoked.`],
        ["Ground", T.ground],
      ],
    },
    intro: () => [[`JOYEUSE: ${names.target} is at ${target.name}. Go quietly.`, "#54f2ff"], [`Weapons are holstered. ${names.sec} will warn anyone with a gun out.`, "#94a0c4"]],
    populate(world, opts) { W.populateMission(world, this, d, opts); },
  };
};

/* The people of a district mission, from its theme. */
W.populateMission = (world, L, d, opts) => {
  const m = world.map, T = d.theme, rng = W.rng(L.seed + 7);
  const R = () => rng();
  const near = (x, y, r) => { for (let k = 0; k < 30; k++) { const a = R() * Math.PI * 2, dd = R() * r; const p = m.nearestWalkable(x + Math.cos(a) * dd, y + Math.sin(a) * dd, 4); if (p && W.STROLL.has(m.groundAt(p[0], p[1]))) return p; } return m.nearestWalkable(x, y, 6); };
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
  // local security
  for (let i = 0; i < T.sec; i++) {
    const base = m.randomCell(stroll) || [L.picks.target.x, L.picks.target.y];
    const route = [base, near(base[0], base[1], 9), near(base[0], base[1], 9)];
    const u = world.add(W.makeUnit("sec", base[0], base[1], { home: base, patrol: route, look: T.secLook ? T.secLook() : undefined }));
    W.giveWeapon(u, "pistol");
  }
  if (opts.attract) return;
  const tg = L.picks.target;
  const tp = m.nearestWalkable(tg.x, tg.y, 6);
  const target = world.add(W.makeUnit("target", tp[0], tp[1], { post: [tp[0], tp[1], R() * 6.28], name: L.names.target }));
  W.giveWeapon(target, "pistol");
  world.targetUnit = target;
  for (let i = 0; i < T.guards; i++) {
    const a = i / T.guards * Math.PI * 2 + R();
    const p = m.nearestWalkable(tp[0] + Math.cos(a) * 1.6, tp[1] + Math.sin(a) * 1.6, 3) || tp;
    const g = world.add(W.makeUnit("guard", p[0], p[1], { post: [p[0], p[1], a], dir: a }));
    W.giveWeapon(g, T.guardGun || "shotgun", 40); W.giveWeapon(g, "pistol");
  }
  for (let i = 0; i < T.crew; i++) {
    const p = near(tp[0], tp[1], i % 2 ? 9 : 16);
    if (!p) continue;
    const o = i % 3 === 2 ? { patrol: [p, near(p[0], p[1], 10), near(tp[0], tp[1], 12)] } : { post: [p[0], p[1], R() * 6.28] };
    const u = world.add(W.makeUnit("crew", p[0], p[1], o));
    const gun = W.pick(T.crewGuns || ["pistol", "pistol", "uzi"]);
    W.giveWeapon(u, gun, gun === "uzi" ? 60 : undefined);
  }
  if (L.picks.exit) world.escapePoint = m.nearestWalkable(L.picks.exit.x, L.picks.exit.y, 6);
  // the squad
  const sp = L.picks.spawn;
  const spots = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => m.nearestWalkable(sp.x + a - 0.5, sp.y + b - 0.5, 5) || [sp.x, sp.y]);
  W.spawnSquad(world, opts.roster || W.defaultRoster(), spots);
  world.startAt = [sp.x, sp.y];
  world.objective({ type: "kill", unit: target, text: `Eliminate ${L.names.target}` });
  world.objective({ type: "recruit", n: 5, optional: true, text: "Recruit 5 followers with the Purrsuader" });
  world.objective({ type: "civcap", n: 4, optional: true, text: "Lose no more than 4 civilians" });
};
