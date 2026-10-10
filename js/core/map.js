/* The city grid: ground, buildings, props, walkability, line of sight and
 * pathfinding. A level's build() fills one of these with the helpers below. */
"use strict";

W.G = { WALK: 0, ROAD: 1, PLAZA: 2, GRASS: 3, WATER: 4, PARK: 5, ALLEY: 6, ROOF: 7, DIRT: 8, FIELD: 9, PAD: 10, TARMAC: 11,
  INDOOR: 12, CARPET: 13, WOOD: 14, RAIL: 15 };
/* ground people walk on by choice: civilians wander these, and avoid the rest */
W.STROLL = new Set([0, 2, 3, 6, 8, 10, 12, 13, 14]);
/* inside a structure */
W.FLOORS = new Set([12, 13, 14]);
W.MARK = { NONE: 0, DASH_X: 1, DASH_Y: 2, ZEBRA_X: 3, ZEBRA_Y: 4, BAY: 5, EDGE_X: 6, EDGE_Y: 7, RAIL_X: 8, RAIL_Y: 9 };

/* What each prop is: does it stop feet, does it stop bullets, how tall. */
W.PROPS = {
  lamp:    { walk: true,  los: true,  h: 30 },
  tree:    { walk: false, los: true,  h: 26 },
  bench:   { walk: false, los: true,  h: 5 },
  planter: { walk: false, los: true,  h: 7 },
  kiosk:   { walk: false, los: false, h: 22 },
  vend:    { walk: false, los: false, h: 18 },
  bin:     { walk: false, los: true,  h: 7 },
  table:   { walk: false, los: true,  h: 7 },
  bollard: { walk: true,  los: true,  h: 6 },
  spout:   { walk: false, los: true,  h: 16 },
  blade:   { walk: true,  los: true,  h: 0 },   // a neon blade sign hung on a wall
  hydrant: { walk: true,  los: true,  h: 5 },
  billboard: { walk: false, los: false, h: 34 },
  awning:  { walk: true,  los: true,  h: 0 },
  crate:   { walk: false, los: false, h: 10 },
  signal:  { walk: true,  los: true,  h: 30 },
  fence:   { walk: false, los: true,  h: 7 },    // p.axis "x" or "y": the rail runs along that axis
  hay:     { walk: false, los: true,  h: 8 },
  windmill:{ walk: false, los: true,  h: 64 },
  crane:   { walk: false, los: true,  h: 90 },
  flood:   { walk: true,  los: true,  h: 46 },   // a floodlight mast
  banner:  { walk: true,  los: true,  h: 30 },
  truck:   { walk: false, los: false, h: 20 },   // a food truck, or a farm truck
  barrel:  { walk: false, los: true,  h: 8 },
  cone:    { walk: true,  los: true,  h: 5 },
  tractor: { walk: false, los: true,  h: 14 },
  statue:  { walk: false, los: true,  h: 34 },
  trough:  { walk: false, los: true,  h: 5 },
  box:     { walk: false, los: true,  h: 8 },    // furniture: p.w, p.d, p.h, p.top, p.side, p.glow; tall ones block sight (p.blocks)
  grave:   { walk: false, los: true,  h: 8 },
  watertower: { walk: false, los: true, h: 96 },
  bars:    { walk: false, los: true,  h: 16 },   // cell bars, p.axis
  shelter: { walk: false, los: false, h: 18 },   // a bus or tram shelter
};

W.Map = class {
  constructor(w, h) {
    this.w = w; this.h = h;
    const n = w * h;
    this.ground = new Uint8Array(n);
    this.mark = new Uint8Array(n);
    this.height = new Uint8Array(n);      // storeys
    this.bid = new Int16Array(n).fill(-1);
    this.walk = new Uint8Array(n);
    this.losBlock = new Uint8Array(n);
    this.propAt = new Int16Array(n).fill(-1);
    this.buildings = [];
    this.props = [];
    this.lanes = [];
    this.junctions = [];
    this.lights = [];     // ground light pools: {x,y,r,color,a}
    this.paint = [];      // ground paint: pads, lines, lettering
    this.parked = [];     // parked cars: {x, y, axis, dir, color}
    this.points = { spawn: [], target: [], exit: [] };   // where missions can start, where targets can be, where they run to
    this.loot = [];       // weapons lying about: { type, ammo, x, y }
    this.deck = new Uint8Array(n);   // height (px) of a walkway over this cell (its top); 0 for the ground
    // a walkway cell slopes: along x (1) or y (2), from deckLo at its low edge to deckHi at its high edge
    this.deckAxis = new Uint8Array(n); this.deckLo = new Uint8Array(n); this.deckHi = new Uint8Array(n);
    this.crowds = [];     // where people gather: { x, y, r, n }
    this.crossing = new Uint8Array(n);  // a level crossing: a street over a railway, open to feet
    this.lintels = [];    // the wall over each doorway of an enterable building: { x, y, s }
    this.roofOf = new Int16Array(n).fill(-1);   // the structure whose roof covers this cell
    this.structures = [];
  }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  i(x, y) { return y * this.w + x; }

  /* ---- authoring ---- */
  fill(x, y, w, h, g) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.inb(i, j)) this.ground[this.i(i, j)] = g;
  }
  setMark(x, y, w, h, m) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.inb(i, j)) this.mark[this.i(i, j)] = m;
  }
  /* A road band. axis 'x' runs along x (rows y..y+h-1); a centre dash is
   * painted on the middle row. Lanes are added for traffic either side. */
  road(x, y, w, h, axis) {
    this.fill(x, y, w, h, W.G.ROAD);
    const r = { x, y, w, h, axis };
    (this.roads || (this.roads = [])).push(r);
    return r;
  }
  /* A four-lane street from one map edge to the other, with traffic both
   * ways. axis "x" runs along x at rows at..at+3. */
  street(axis, at, cars = 2, from = 0, len, oneway = 0) {
    len = len ?? (axis === "x" ? this.w : this.h) - from;
    const r = axis === "x" ? this.road(from, at, len, 4, "x") : this.road(at, from, 4, len, "y");
    r.oneway = oneway;
    if (cars !== null) {
      // two lanes: opposite ways, keeping to the right; or, one side of a
      // divided road, both lanes the same way
      const d1 = oneway || (axis === "x" ? -1 : 1), d2 = oneway || (axis === "x" ? 1 : -1);
      this.lanes.push({ axis, at: at + 1, dir: d1, from: from - 3, to: from + len + 3, cars });
      this.lanes.push({ axis, at: at + 3, dir: d2, from: from - 3, to: from + len + 3, cars });
    }
    return r;
  }
  /* A divided road: two one-way carriageways with a median between, traffic
   * keeping to the right. Takes 10 tiles: 4, a 2-tile median, 4. */
  divided(axis, at, cars = 2) {
    // heading +x, the right is +y; heading +y, the right is -x
    if (axis === "x") { this.street("x", at, cars, 0, undefined, -1); this.street("x", at + 6, cars, 0, undefined, 1); }
    else { this.street("y", at, cars, 0, undefined, 1); this.street("y", at + 6, cars, 0, undefined, -1); }
  }
  /* a driveway or service road: tarmac, no traffic, no markings */
  drive(x, y, w, h) { this.fill(x, y, w, h, W.G.TARMAC); this.clearProps(x, y, w, h); }
  /* A driveway that is sure to reach a road: the rectangle, then on in
   * direction dir ("n" "s" "e" "w") across whatever pavement or verge lies
   * between it and the road, clearing any lamp or bin in the way. */
  driveway(x, y, w, h, dir) {
    this.drive(x, y, w, h);
    const [dx, dy] = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[dir];
    const across = dx ? h : w;
    for (let k = 0; k < across; k++) {
      let cx = dx ? (dx > 0 ? x + w : x - 1) : x + k, cy = dy ? (dy > 0 ? y + h : y - 1) : y + k;
      for (let step = 0; step < 10 && this.inb(cx, cy); step++, cx += dx, cy += dy) {
        const i = this.i(cx, cy), g = this.ground[i];
        if (g === W.G.ROAD || g === W.G.RAIL || this.height[i] > 0) break;
        this.ground[i] = W.G.TARMAC;
        this.clearProps(cx, cy, 1, 1);
      }
    }
  }
  /* take away whatever prop stands on these cells */
  clearProps(x, y, w, h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (!this.inb(i, j)) continue;
      const p = this.propAt[this.i(i, j)];
      if (p >= 0) { this.props[p].gone = true; this.propAt[this.i(i, j)] = -1; }
    }
  }
  /* The junctions: every overlap of a road along x with a road along y,
   * and junctions closer than `gap` tiles (the halves of a divided road
   * crossing) merged into one, so one set of lights governs the lot. */
  junctionBoxes(gap = 3) {
    const rs = this.roads || [], boxes = [];
    for (const a of rs) if (a.axis === "x") for (const b of rs) if (b.axis === "y") {
      const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w);
      const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
      if (x0 < x1 && y0 < y1) boxes.push({ x0, y0, x1, y1 });
    }
    for (let merged = true; merged;) {
      merged = false;
      for (let i = 0; i < boxes.length && !merged; i++) for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i], B = boxes[j];
        if (A.x0 - gap <= B.x1 && B.x0 - gap <= A.x1 && A.y0 - gap <= B.y1 && B.y0 - gap <= A.y1) {
          boxes[i] = { x0: Math.min(A.x0, B.x0), y0: Math.min(A.y0, B.y0), x1: Math.max(A.x1, B.x1), y1: Math.max(A.y1, B.y1) };
          boxes.splice(j, 1); merged = true; break;
        }
      }
    }
    return boxes;
  }
  /* A road with no traffic of its own: service roads, dirt tracks. */
  lane(x, y, w, h, g = W.G.ROAD) { this.fill(x, y, w, h, g); }
  park(x, y, axis, color, dir = 1) { this.parked.push({ x, y, axis, color, dir }); }
  point(kind, x, y, name, area) { this.points[kind].push({ x, y, name, area }); }
  /* A railway: two tracks side by side (at..at+1 one way, at+2..at+3 the
   * other), with trains that stop at each of `stops` (positions along the
   * track) and run off the map at the ends. */
  rail(axis, at, from, to, stops = [], trains = 1, open = false) {
    const len = to - from;
    // an open line has no fences: every sleeper is a crossing, and the trams do not stop for anyone
    if (open) for (let t = from; t < to; t++) for (let k = 0; k < 4; k++) { const [cx, cy] = axis === "x" ? [t, at + k] : [at + k, t]; if (this.inb(cx, cy)) this.crossing[this.i(cx, cy)] = 1; }
    // where a street already crosses, it stays a crossing
    for (let t = from; t < to; t++) for (let k = 0; k < 4; k++) {
      const [cx, cy] = axis === "x" ? [t, at + k] : [at + k, t];
      if (this.inb(cx, cy) && this.ground[this.i(cx, cy)] === W.G.ROAD) this.crossing[this.i(cx, cy)] = 1;
    }
    if (axis === "x") { this.fill(from, at, len, 4, W.G.RAIL); this.setMark(from, at, len, 4, W.MARK.RAIL_X); }
    else { this.fill(at, from, 4, len, W.G.RAIL); this.setMark(at, from, 4, len, W.MARK.RAIL_Y); }
    this.lanes.push({ axis, at: at + 1, dir: 1, from: from - 12, to: to + 12, cars: trains, train: true, stops });
    this.lanes.push({ axis, at: at + 3, dir: -1, from: from - 12, to: to + 12, cars: trains, train: true, stops });
  }

  /* An enterable building. Outer walls one tile thick, a floor inside, a
   * roof over it that comes off whenever a Watcher is in. doors: [side,
   * offset, width] gaps in the outer wall (side "n" "s" "w" "e"; offset from
   * the wall's start). Rooms are added with partition(). */
  structure(o) {
    const s = Object.assign({ floors: 2, style: "office", floor: W.G.INDOOR, doors: [], name: "" }, o);
    s.id = this.structures.length;
    this.structures.push(s);
    const { x, y, w, d } = s;
    this.fill(x + 1, y + 1, w - 2, d - 2, s.floor);
    for (let j = y; j < y + d; j++) for (let i = x; i < x + w; i++) if (this.inb(i, j)) this.roofOf[this.i(i, j)] = s.id;
    // the outer walls, broken where the doors are
    const gaps = { n: [], s: [], w: [], e: [] };
    for (const [side, at, wd] of s.doors) gaps[side].push([at, at + (wd || 2)]);
    const run = (side, len, mk) => {
      let a = 0;
      const cuts = gaps[side].slice().sort((p, q) => p[0] - q[0]);
      for (const [g0, g1] of cuts.concat([[len, len]])) { if (g0 > a) mk(a, g0 - a); a = Math.max(a, g1); }
    };
    // the walls' signs belong to the whole structure, so they run unbroken over the doorways
    const wall = (wx, wy, ww, wd2) => this.building({ x: wx, y: wy, w: ww, d: wd2, floors: s.floors, style: s.style, struct: s.id });
    run("n", w, (a, l) => wall(x + a, y, l, 1));
    run("s", w, (a, l) => wall(x + a, y + d - 1, l, 1));
    run("w", d - 2, (a, l) => wall(x, y + 1 + a, 1, l));
    run("e", d - 2, (a, l) => wall(x + w - 1, y + 1 + a, 1, l));
    // door cells are floor too, with the wall carried on over them as a lintel
    for (const [side, at, wd] of s.doors) {
      const n = wd || 2;
      for (let k = 0; k < n; k++) {
        const [cx, cy] = side === "n" ? [x + at + k, y] : side === "s" ? [x + at + k, y + d - 1] : side === "w" ? [x, y + 1 + at + k] : [x + w - 1, y + 1 + at + k];
        if (!this.inb(cx, cy)) continue;
        this.ground[this.i(cx, cy)] = s.floor;
        if (!this.lintels.some(l => l.x === cx && l.y === cy)) this.lintels.push({ x: cx, y: cy, s: s.id });
      }
    }
    return s;
  }
  /* A canopy: a station roof on pillars, over platforms and tracks alike.
   * No walls; it fades, like any building, when it hides one of ours, and
   * when one of ours stands under it. Pillars go along its edges every
   * `every` tiles, wherever the ground is not track. */
  canopy(o) {
    const s = Object.assign({ floors: 2, style: "canopy", canopy: true, doors: [], name: "Station canopy", every: 6 }, o);
    s.id = this.structures.length;
    this.structures.push(s);
    for (let j = s.y; j < s.y + s.d; j++) for (let i = s.x; i < s.x + s.w; i++) if (this.inb(i, j) && this.roofOf[this.i(i, j)] < 0) this.roofOf[this.i(i, j)] = s.id;
    const h = s.floors * W.ZH;
    for (let i = s.x; i < s.x + s.w; i += s.every) for (const j of [s.y, s.y + s.d - 1]) {
      if (!this.inb(i, j) || this.ground[this.i(i, j)] === W.G.RAIL || this.height[this.i(i, j)] > 0 || this.propAt[this.i(i, j)] >= 0) continue;
      this.prop("box", i + 0.5, j + 0.5, { w: 0.25, d: 0.25, h, side: "#5a6070", top: "#7a8090" });
    }
    return s;
  }
  /* A footbridge over a railway, Syndicate-style, in a Z: stairs climb
   * beside the tracks on one side, a platform crosses over them, and a ramp
   * comes down beside the tracks on the other side, running on the way the
   * stairs came. Everything is two tiles wide and h px up at the top.
   *   tracks "y" (running along y): the bridge crosses along x, from x to
   *     x + span - 1, its platform at rows y + stair .. y + stair + 1; the
   *     stairs climb along x..x+1, the ramp descends along the far 2 columns.
   *   tracks "x": the same, turned. People on it are drawn up there, and
   *   trains pass underneath them; fences under it are taken away. */
  footbridge(tracks, x, y, span, stair = 4, h = 24) {
    // u across the tracks, v along them; lo and hi are the heights at the cell's low-v and high-v edges
    const set = (u, v, lo, hi) => {
      const X = tracks === "y" ? x + u : x + v, Y = tracks === "y" ? y + v : y + u;
      if (!this.inb(X, Y)) return;
      const k = this.i(X, Y);
      this.deck[k] = Math.round(Math.max(lo, hi));
      this.deckAxis[k] = lo === hi ? 0 : tracks === "y" ? 2 : 1;
      this.deckLo[k] = Math.round(lo); this.deckHi[k] = Math.round(hi);
      this.clearProps(X, Y, 1, 1);
    };
    for (let v = 0; v < stair; v++) for (const u of [0, 1]) set(u, v, h * v / stair, h * (v + 1) / stair);                   // the ramp up
    for (let u = 0; u < span; u++) for (const v of [stair, stair + 1]) set(u, v, h, h);                                     // over the tracks
    for (let v = 0; v < stair; v++) for (const u of [span - 2, span - 1]) set(u, stair + 2 + v, h * (stair - v) / stair, h * (stair - v - 1) / stair);   // the ramp down
    (this.bridges || (this.bridges = [])).push({ tracks, x, y, span, stair, h });
  }
  crowd(x, y, r, n) { this.crowds.push({ x, y, r, n }); }
  /* a post for a member of a standing garrison: { x, y, dir, who } */
  garrison(x, y, dir, who = "benton") { (this.garrisons || (this.garrisons = [])).push({ x, y, dir, who }); }
  /* an inside wall of structure s, with doorways: gaps [offset, width] along its length */
  partition(s, x, y, w, d, gaps = []) {
    const horiz = w >= d, len = horiz ? w : d;
    let a = 0;
    for (const [g0, gw] of gaps.slice().sort((p, q) => p[0] - q[0]).concat([[len, 0]])) {
      if (g0 > a) this.building(horiz ? { x: x + a, y, w: g0 - a, d: 1, floors: s.floors, style: s.inner || s.style, struct: s.id, inner: true }
                                      : { x, y: y + a, w: 1, d: g0 - a, floors: s.floors, style: s.inner || s.style, struct: s.id, inner: true });
      a = Math.max(a, g0 + gw);
    }
  }
  /* a room's floor, painted another way: carpet, wood, tile */
  floorIn(x, y, w, d, g) { this.fill(x, y, w, d, g); }

  /* Ground paint: { type: "circle"|"rect"|"line"|"text", ... } in world units */
  daub(o) { this.paint.push(o); }
  building(b) {
    b = Object.assign({ floors: 3, style: "office", name: "" }, b);
    b.id = this.buildings.length;
    this.buildings.push(b);
    for (let j = b.y; j < b.y + b.d; j++) for (let i = b.x; i < b.x + b.w; i++) {
      if (!this.inb(i, j) || (b.mask && !b.mask(i, j))) continue;
      const k = this.i(i, j);
      this.height[k] = b.floors; this.bid[k] = b.id; this.ground[k] = W.G.ROOF;
    }
    return b;
  }
  prop(type, x, y, o = {}) {
    const p = Object.assign({ type, x, y }, o);
    p.id = this.props.length;
    this.props.push(p);
    const cx = Math.floor(x), cy = Math.floor(y);
    if (this.inb(cx, cy) && type !== "blade" && type !== "awning") this.propAt[this.i(cx, cy)] = p.id;
    return p;
  }
  light(x, y, r, color, a = 0.35) { this.lights.push({ x, y, r, color, a }); }

  /* After authoring: work out where feet and bullets can go, and where the
   * roads cross (traffic lights). */
  finish() {
    for (let k = 0; k < this.w * this.h; k++) {
      const g = this.ground[k];
      let walk = this.height[k] === 0 && g !== W.G.WATER;
      let los = this.height[k] > 0;
      const p = this.propAt[k];
      if (p >= 0 && !this.props[p].gone) {
        const P = this.props[p], def = W.PROPS[P.type];
        if (def && !def.walk && P.walk !== true) walk = false;
        if ((def && !def.los) || P.blocks) los = true;
      }
      // nobody walks along or across the tracks, except at a level crossing
      if (g === W.G.RAIL && !this.crossing[k]) walk = false;
      if ((this.deck[k] || this.deckHi[k]) && this.height[k] === 0) walk = true;
      this.walk[k] = walk ? 1 : 0;
      this.losBlock[k] = los ? 1 : 0;
    }
    // junctions, with the halves of a divided road's crossing merged into one
    this.junctions = this.junctionBoxes();
  }

  /* A rectangle of this map as a map of its own, for a level that only
   * needs part of a district. Buildings, props, lights, paint, parked cars
   * and mission points are clipped and shifted; traffic lanes that cross the
   * whole rectangle are kept. Call on a finished map; returns a finished one. */
  crop(x0, y0, w, h) {
    const m = new W.Map(w, h);
    m.seed = this.seed;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = x + x0, sy = y + y0;
      if (!this.inb(sx, sy)) continue;
      const a = this.i(sx, sy), b = m.i(x, y);
      m.ground[b] = this.ground[a]; m.mark[b] = this.mark[a]; m.height[b] = this.height[a]; m.deck[b] = this.deck[a];
      m.deckAxis[b] = this.deckAxis[a]; m.deckLo[b] = this.deckLo[a]; m.deckHi[b] = this.deckHi[a]; m.crossing[b] = this.crossing[a];
    }
    const ids = new Map();
    for (const B of this.buildings) {
      const bx = Math.max(B.x, x0), by = Math.max(B.y, y0), ex = Math.min(B.x + B.w, x0 + w), ey = Math.min(B.y + B.d, y0 + h);
      if (bx >= ex || by >= ey) continue;
      const nb = Object.assign({}, B, { x: bx - x0, y: by - y0, w: ex - bx, d: ey - by, mask: null });
      // signs measure from the face's start: x for an "s" face, the far end of y for an "e" face
      nb.signs = (B.signs || []).map(sg => sg.face === "s" ? Object.assign({}, sg, { at: sg.at - (bx - B.x) }) : Object.assign({}, sg, { at: sg.at - (B.y + B.d - ey) }))
        .filter(sg => (sg.face === "s" && ey === B.y + B.d) || (sg.face === "e" && ex === B.x + B.w));
      nb.id = m.buildings.length;
      ids.set(B.id, nb.id);
      m.buildings.push(nb);
    }
    const sids = new Map();
    for (const S of this.structures) {
      if (S.x + S.w <= x0 || S.y + S.d <= y0 || S.x >= x0 + w || S.y >= y0 + h) continue;
      const n = Object.assign({}, S, { x: S.x - x0, y: S.y - y0, id: m.structures.length });
      sids.set(S.id, n.id); m.structures.push(n);
    }
    for (const B of m.buildings) if (B.struct !== undefined) B.struct = sids.has(B.struct) ? sids.get(B.struct) : undefined;
    for (const l of this.lintels) if (sids.has(l.s) && inside(l.x, l.y)) m.lintels.push({ x: l.x - x0, y: l.y - y0, s: sids.get(l.s) });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = x + x0, sy = y + y0;
      if (!this.inb(sx, sy)) continue;
      const id = this.bid[this.i(sx, sy)];
      if (id >= 0 && ids.has(id)) m.bid[m.i(x, y)] = ids.get(id);
      const r = this.roofOf[this.i(sx, sy)];
      if (r >= 0 && sids.has(r)) m.roofOf[m.i(x, y)] = sids.get(r);
    }
    const inside = (x, y, pad = 0) => x >= x0 - pad && y >= y0 - pad && x < x0 + w + pad && y < y0 + h + pad;
    for (const P of this.props) if (!P.gone && inside(P.x, P.y)) m.prop(P.type, P.x - x0, P.y - y0, Object.assign({}, P, { id: undefined, type: P.type, x: P.x - x0, y: P.y - y0 }));
    for (const L of this.lights) if (inside(L.x, L.y, L.r)) m.lights.push(Object.assign({}, L, { x: L.x - x0, y: L.y - y0 }));
    for (const P of this.paint) {
      const n = Object.assign({}, P, { x: P.x - x0, y: P.y - y0 });
      if (P.x2 !== undefined) { n.x2 = P.x2 - x0; n.y2 = P.y2 - y0; }
      m.paint.push(n);
    }
    for (const c of this.parked) if (inside(c.x, c.y)) m.parked.push(Object.assign({}, c, { x: c.x - x0, y: c.y - y0 }));
    for (const l of this.loot) if (inside(l.x, l.y)) m.loot.push(Object.assign({}, l, { x: l.x - x0, y: l.y - y0 }));
    for (const k of Object.keys(this.points)) for (const p of this.points[k]) if (inside(p.x, p.y)) m.points[k].push(Object.assign({}, p, { x: p.x - x0, y: p.y - y0 }));
    for (const r of this.roads || []) {
      const rx = Math.max(r.x, x0), ry = Math.max(r.y, y0), ex = Math.min(r.x + r.w, x0 + w), ey = Math.min(r.y + r.h, y0 + h);
      if (rx < ex && ry < ey) (m.roads || (m.roads = [])).push({ x: rx - x0, y: ry - y0, w: ex - rx, h: ey - ry, axis: r.axis, oneway: r.oneway });
    }
    for (const L of this.lanes) {
      const across = L.axis === "x" ? L.at >= y0 && L.at < y0 + h && L.from <= x0 && L.to >= x0 + w : L.at >= x0 && L.at < x0 + w && L.from <= y0 && L.to >= y0 + h;
      if (!across) continue;
      const len = L.axis === "x" ? w : h;
      m.lanes.push(Object.assign({}, L, { at: L.at - (L.axis === "x" ? y0 : x0), from: -3, to: len + 3, cars: Math.max(1, Math.round((L.cars || 0) * len / ((L.to - L.from) || len))) * (L.cars ? 1 : 0) }));
    }
    m.district = this.district; m.cropAt = [x0, y0];
    m.finish();
    // wherever a road or track runs off the edge of the cut, a target can run
    // that way: each run of route cells along each edge becomes an exit
    const route = g => g === W.G.ROAD || g === W.G.DIRT || g === W.G.TARMAC || g === W.G.ALLEY;
    const edges = [["north", (t) => [t, 0], w], ["south", (t) => [t, h - 1], w], ["west", (t) => [0, t], h], ["east", (t) => [w - 1, t], h]];
    for (const [dir, at, n] of edges) {
      let run = null;
      for (let t = 0; t <= n; t++) {
        const [x, y] = t < n ? at(t) : [-1, -1];
        const ok = t < n && m.walk[m.i(x, y)] && route(m.ground[m.i(x, y)]);
        if (ok) { if (!run) run = [t, t]; else run[1] = t; continue; }
        if (run && run[1] - run[0] >= 1) {
          const [ex, ey] = at((run[0] + run[1]) >> 1);
          const kind = m.ground[m.i(ex, ey)] === W.G.ROAD ? "the road" : "the track";
          if (!m.points.exit.some(e => W.dist(e.x, e.y, ex + 0.5, ey + 0.5) < 6)) m.points.exit.push({ x: ex + 0.5, y: ey + 0.5, name: `${kind} out to the ${dir}` });
        }
        run = null;
      }
    }
    return m;
  }

  /* ---- queries ---- */
  walkable(x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    return this.inb(cx, cy) && this.walk[this.i(cx, cy)] === 1;
  }
  solid(cx, cy) { return !this.inb(cx, cy) || this.losBlock[this.i(cx, cy)] === 1; }
  groundAt(x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    return this.inb(cx, cy) ? this.ground[this.i(cx, cy)] : -1;
  }

  /* Line of sight between two points: a grid walk (Amanatides & Woo) that
   * stops at any cell that blocks it. The end cells never block. */
  los(x0, y0, x1, y1) {
    let cx = Math.floor(x0), cy = Math.floor(y0);
    const ex = Math.floor(x1), ey = Math.floor(y1);
    const dx = x1 - x0, dy = y1 - y0;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    let tmx = dx !== 0 ? ((sx > 0 ? cx + 1 - x0 : x0 - cx) * tdx) : Infinity;
    let tmy = dy !== 0 ? ((sy > 0 ? cy + 1 - y0 : y0 - cy) * tdy) : Infinity;
    for (let n = 0; n < 400; n++) {
      if (cx === ex && cy === ey) return true;
      if (tmx < tmy) { tmx += tdx; cx += sx; } else { tmy += tdy; cy += sy; }
      if (cx === ex && cy === ey) return true;
      if (this.solid(cx, cy)) return false;
    }
    return true;
  }
  /* The first solid point along a ray, or null: where a stray round lands. */
  rayHit(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(d / 0.2);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (this.solid(Math.floor(x), Math.floor(y)) && !(Math.floor(x) === Math.floor(x0) && Math.floor(y) === Math.floor(y0))) return [x, y];
    }
    return null;
  }
  /* Can a body of radius r walk the straight line? Samples along the line
   * and either side of it. */
  walkLine(x0, y0, x1, y1, r = 0.28) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (d < 1e-6) return true;
    const nx = -(y1 - y0) / d * r, ny = (x1 - x0) / d * r;
    const steps = Math.ceil(d / 0.25);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (!this.walkable(x + nx, y + ny) || !this.walkable(x - nx, y - ny) || !this.walkable(x, y)) return false;
    }
    return true;
  }
  nearestWalkable(x, y, maxR = 8) {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (this.inb(cx, cy) && this.walk[this.i(cx, cy)]) return [cx + 0.5, cy + 0.5];
    for (let r = 1; r <= maxR; r++) {
      let best = null, bd = Infinity;
      for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) {
        if (Math.max(Math.abs(i - cx), Math.abs(j - cy)) !== r) continue;
        if (!this.inb(i, j) || !this.walk[this.i(i, j)]) continue;
        const d = (i + 0.5 - x) ** 2 + (j + 0.5 - y) ** 2;
        if (d < bd) { bd = d; best = [i + 0.5, j + 0.5]; }
      }
      if (best) return best;
    }
    return null;
  }
  randomCell(test, tries = 400) {
    for (let t = 0; t < tries; t++) {
      const x = Math.floor(Math.random() * this.w), y = Math.floor(Math.random() * this.h);
      const k = this.i(x, y);
      if (this.walk[k] && (!test || test(x, y, this.ground[k]))) return [x + 0.5, y + 0.5];
    }
    return null;
  }

  /* A* over the cell grid, eight ways, never cutting a corner. Returns a list
   * of points (cell centres, smoothed), the goal last; null if no way. */
  path(sx, sy, tx, ty, avoidRoad = false) {
    const w = this.w, h = this.h;
    const goal = this.nearestWalkable(tx, ty);
    if (!goal) return null;
    const scx = Math.floor(sx), scy = Math.floor(sy);
    const gcx = Math.floor(goal[0]), gcy = Math.floor(goal[1]);
    if (scx === gcx && scy === gcy) return [[tx === goal[0] ? tx : goal[0], ty === goal[1] ? ty : goal[1]]];
    const start = this.i(scx, scy), end = this.i(gcx, gcy);
    const N = w * h;
    if (!this._g || this._g.length !== N) {
      this._g = new Float32Array(N); this._from = new Int32Array(N); this._seen = new Uint32Array(N); this._closed = new Uint32Array(N); this._stamp = 0;
    }
    const g = this._g, from = this._from, seen = this._seen, closed = this._closed;
    const stamp = ++this._stamp;
    const heap = [], hf = [];
    const push = (k, f) => {
      heap.push(k); hf.push(f);
      let i = heap.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= hf[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [hf[p], hf[i]] = [hf[i], hf[p]]; i = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop(), lf = hf.pop();
      if (heap.length) {
        heap[0] = last; hf[0] = lf;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < heap.length && hf[l] < hf[m]) m = l;
          if (r < heap.length && hf[r] < hf[m]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]]; [hf[m], hf[i]] = [hf[i], hf[m]]; i = m;
        }
      }
      return top;
    };
    const H = (x, y) => { const dx = Math.abs(x - gcx), dy = Math.abs(y - gcy); return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy); };
    g[start] = 0; seen[start] = stamp; from[start] = -1;
    push(start, H(scx, scy));
    let found = false, n = 0;
    const limit = Math.max(9000, w * h);
    while (heap.length && n++ < limit) {
      const k = pop();
      if (closed[k] === stamp) continue;
      closed[k] = stamp;
      if (k === end) { found = true; break; }
      const x = k % w, y = (k / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = ny * w + nx;
        if (!this.walk[nk] || closed[nk] === stamp) continue;
        if (dx && dy && (!this.walk[y * w + nx] || !this.walk[ny * w + x])) continue;
        let c = dx && dy ? 1.4142 : 1;
        if (avoidRoad && (this.ground[nk] === W.G.ROAD || this.ground[nk] === W.G.RAIL)) c *= 3;
        const ng = g[k] + c;
        if (seen[nk] !== stamp || ng < g[nk]) {
          seen[nk] = stamp; g[nk] = ng; from[nk] = k;
          push(nk, ng + H(nx, ny));
        }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let k = end; k !== -1 && k !== start; k = from[k]) cells.push([(k % w) + 0.5, ((k / w) | 0) + 0.5]);
    cells.reverse();
    // the goal itself if it is walkable, else its cell's centre
    if (this.walkable(tx, ty) && Math.floor(tx) === gcx && Math.floor(ty) === gcy) cells[cells.length - 1] = [tx, ty];
    // string-pull: skip every point the body can walk straight past
    const out = [];
    let ax = sx, ay = sy, i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !this.walkLine(ax, ay, cells[j][0], cells[j][1])) j--;
      out.push(cells[j]);
      ax = cells[j][0]; ay = cells[j][1];
      i = j + 1;
    }
    return out;
  }
};
