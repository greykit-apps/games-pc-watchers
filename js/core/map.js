/* The city grid: ground, buildings, props, walkability, line of sight and
 * pathfinding. A level's build() fills one of these with the helpers below. */
"use strict";

W.G = { WALK: 0, ROAD: 1, PLAZA: 2, GRASS: 3, WATER: 4, PARK: 5, ALLEY: 6, ROOF: 7 };
W.MARK = { NONE: 0, DASH_X: 1, DASH_Y: 2, ZEBRA_X: 3, ZEBRA_Y: 4, BAY: 5, EDGE_X: 6, EDGE_Y: 7 };

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
  building(b) {
    b = Object.assign({ floors: 3, style: "office", name: "" }, b);
    b.id = this.buildings.length;
    this.buildings.push(b);
    for (let j = b.y; j < b.y + b.d; j++) for (let i = b.x; i < b.x + b.w; i++) {
      if (!this.inb(i, j)) continue;
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
      if (p >= 0) {
        const def = W.PROPS[this.props[p].type];
        if (def && !def.walk) walk = false;
        if (def && !def.los) los = true;
      }
      this.walk[k] = walk ? 1 : 0;
      this.losBlock[k] = los ? 1 : 0;
    }
    // junctions: every overlap of an x-road with a y-road
    const rs = this.roads || [];
    for (const a of rs) if (a.axis === "x") for (const b of rs) if (b.axis === "y") {
      const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w);
      const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
      if (x0 < x1 && y0 < y1) this.junctions.push({ x0, y0, x1, y1 });
    }
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
    while (heap.length && n++ < 9000) {
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
        if (avoidRoad && this.ground[nk] === W.G.ROAD) c *= 3;
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
