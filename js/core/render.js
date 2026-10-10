/* The renderer: the city at a low internal resolution, scaled up with hard
 * pixels, plus a full-resolution overlay for text and the cursor's marks.
 *
 * Painter's order: the ground is one prerendered image; then every building
 * cell, prop, person and car is drawn back to front by x + y. Buildings are
 * cut into one box per cell so that order is always right. */
"use strict";

W.GROUND_COL = {
  0: "#1c2131", 1: "#10131d", 2: "#20253a", 3: "#0f2019", 4: "#0a2534", 5: "#12151f", 6: "#15171f", 7: "#0a0c12"
};

W.Renderer = class {
  constructor(canvas, overlay) {
    this.cv = canvas; this.c = canvas.getContext("2d");
    this.ov = overlay; this.o = overlay ? overlay.getContext("2d") : null;
    this.scale = 2; this.vw = 320; this.vh = 200; this.cssW = 640; this.cssH = 400; this.dpr = 1;
    this.rain = [];
    this.glowCache = new Map();
  }
  resize(cssW, cssH, scale) {
    this.scale = scale; this.cssW = cssW; this.cssH = cssH;
    this.vw = Math.ceil(cssW / scale); this.vh = Math.ceil(cssH / scale);
    this.cv.width = this.vw; this.cv.height = this.vh;
    this.cv.style.width = this.vw * scale + "px"; this.cv.style.height = this.vh * scale + "px";
    this.c.imageSmoothingEnabled = false;
    if (this.ov) {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.ov.width = Math.round(cssW * this.dpr); this.ov.height = Math.round(cssH * this.dpr);
      this.ov.style.width = cssW + "px"; this.ov.style.height = cssH + "px";
    }
    this.vignette = null;
    this.rain = [];
    for (let i = 0; i < Math.round(this.vw * this.vh / 900); i++) this.rain.push({ x: Math.random() * this.vw, y: Math.random() * this.vh, s: W.rand(0.7, 1.3) });
  }

  /* ---- coordinates ---- */
  toScreen(world, x, y, z = 0) {
    const [px, py] = W.proj(x, y, z);
    return [px - world.cam.x, py - world.cam.y];
  }
  /* CSS pixels on the canvas -> world ground point */
  toWorld(world, cssX, cssY) {
    return W.unproj(cssX / this.scale + world.cam.x, cssY / this.scale + world.cam.y);
  }
  centerOn(world, x, y) {
    const [px, py] = W.proj(x, y);
    world.cam.x = px - this.vw / 2; world.cam.y = py - this.vh / 2;
    this.clamp(world);
  }
  clamp(world) {
    const m = world.map;
    world.cam.x = W.clamp(world.cam.x, -m.h * W.HTW - 40, m.w * W.HTW - this.vw + 40);
    world.cam.y = W.clamp(world.cam.y, -80, (m.w + m.h) * W.HTH - this.vh + 40);
  }
  viewCenter(world) { return this.toWorld(world, this.cssW / 2, this.cssH / 2); }

  /* ---- the static layers, built once per map ---- */
  prepare(m) {
    if (m._ground) return;
    m._gox = m.h * W.HTW + 4;
    m._ground = this.drawGround(m);
    // every building cell and prop, sorted back to front
    const st = [];
    let maxH = 0;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const k = m.i(x, y);
      if (m.height[k] > 0) { st.push({ kind: "cell", x, y, d: x + y + 1 }); maxH = Math.max(maxH, m.height[k]); }
    }
    for (const p of m.props) st.push({ kind: "prop", p, d: p.x + p.y + (p.type === "blade" ? 0.6 : 0) });
    st.sort((a, b) => a.d - b.d);
    m._static = st;
    m._maxZ = maxH * W.ZH + 60;
    m._mini = this.drawMiniBase(m);
  }

  drawGround(m) {
    const gw = (m.w + m.h) * W.HTW + 8, gh = (m.w + m.h) * W.HTH + 8;
    const cv = W.canvas(gw, gh), c = cv.getContext("2d");
    const ox = m._gox, oy = 0;
    const P = (x, y) => [ox + (x - y) * W.HTW, oy + (x + y) * W.HTH];
    const dia = (x, y, w = 1, h = 1) => { const a = P(x, y), b = P(x + w, y), d = P(x + w, y + h), e = P(x, y + h); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.lineTo(...e); c.closePath(); };
    c.fillStyle = "#05070f"; c.fillRect(0, 0, gw, gh);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const g = m.ground[m.i(x, y)];
      let col = W.GROUND_COL[g] || "#1c2131";
      const n = W.hash2(x, y, 3);
      if (g === W.G.PLAZA && (x + y) % 2) col = "#23293f";
      if (g === W.G.WALK) col = n < 0.5 ? "#1c2131" : "#1e2335";
      if (g === W.G.GRASS) col = n < 0.5 ? "#0f2019" : "#11241c";
      dia(x, y); c.fillStyle = col; c.fill();
      // paving seams
      if (g === W.G.WALK || g === W.G.PLAZA) { c.strokeStyle = "rgba(255,255,255,.035)"; c.lineWidth = 1; c.stroke(); }
      if (g === W.G.WATER) {
        c.fillStyle = "rgba(84,242,255,.10)";
        const [px, py] = P(x + 0.5, y + 0.5);
        c.fillRect(px - 6 + n * 6, py - 1, 6, 1);
      }
    }
    // curbs: a lit edge wherever a pavement meets the road or water
    c.lineWidth = 1;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const g = m.ground[m.i(x, y)];
      if (g === W.G.ROAD || g === W.G.PARK || g === W.G.ROOF) continue;
      const nb = (i, j) => m.inb(i, j) ? m.ground[m.i(i, j)] : -1;
      const edge = (t) => t === W.G.ROAD || t === W.G.PARK || (g !== W.G.WATER && t === W.G.WATER);
      c.strokeStyle = g === W.G.WATER ? "#3a5a6a" : "#3a4258";
      c.beginPath();
      if (edge(nb(x, y - 1))) { c.moveTo(...P(x, y)); c.lineTo(...P(x + 1, y)); }
      if (edge(nb(x + 1, y))) { c.moveTo(...P(x + 1, y)); c.lineTo(...P(x + 1, y + 1)); }
      if (edge(nb(x, y + 1))) { c.moveTo(...P(x, y + 1)); c.lineTo(...P(x + 1, y + 1)); }
      if (edge(nb(x - 1, y))) { c.moveTo(...P(x, y)); c.lineTo(...P(x, y + 1)); }
      c.stroke();
    }
    // road markings
    const inJ = (x, y, pad = 0) => m.junctions.some(j => x >= j.x0 - pad && x < j.x1 + pad && y >= j.y0 - pad && y < j.y1 + pad);
    const seg = (x0, y0, x1, y1, col, w = 1) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(...P(x0, y0)); c.lineTo(...P(x1, y1)); c.stroke(); };
    for (const r of m.roads || []) {
      if (r.axis === "x") {
        const cy = r.y + r.h / 2;
        for (let x = r.x; x < r.x + r.w; x++) {
          if (inJ(x + 0.5, cy, 1)) continue;
          seg(x + 0.15, cy, x + 0.6, cy, "rgba(255,200,90,.55)");
          seg(x, r.y + 0.12, x + 1, r.y + 0.12, "rgba(220,230,255,.12)");
          seg(x, r.y + r.h - 0.12, x + 1, r.y + r.h - 0.12, "rgba(220,230,255,.12)");
        }
      } else {
        const cx = r.x + r.w / 2;
        for (let y = r.y; y < r.y + r.h; y++) {
          if (inJ(cx, y + 0.5, 1)) continue;
          seg(cx, y + 0.15, cx, y + 0.6, "rgba(255,200,90,.55)");
          seg(r.x + 0.12, y, r.x + 0.12, y + 1, "rgba(220,230,255,.12)");
          seg(r.x + r.w - 0.12, y, r.x + r.w - 0.12, y + 1, "rgba(220,230,255,.12)");
        }
      }
    }
    // zebra crossings on every arm of every junction
    const zebra = (x0, y0, x1, y1, along) => {
      c.fillStyle = "rgba(220,230,255,.22)";
      if (along === "y") { for (let y = y0 + 0.1; y < y1; y += 0.4) { dia(x0 + 0.15, y, (x1 - x0) - 0.3, 0.2); c.fill(); } }
      else { for (let x = x0 + 0.1; x < x1; x += 0.4) { dia(x, y0 + 0.15, 0.2, (y1 - y0) - 0.3); c.fill(); } }
    };
    for (const j of m.junctions) {
      zebra(j.x0 - 1, j.y0, j.x0, j.y1, "y");
      zebra(j.x1, j.y0, j.x1 + 1, j.y1, "y");
      zebra(j.x0, j.y0 - 1, j.x1, j.y0, "x");
      zebra(j.x0, j.y1, j.x1, j.y1 + 1, "x");
    }
    // parking bays
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.ground[m.i(x, y)] !== W.G.PARK) continue;
      if (m.mark[m.i(x, y)] === W.MARK.BAY) seg(x, y, x, y + 1, "rgba(220,230,255,.25)");
    }
    // grime and puddles
    const R = W.rng(m.seed || 7);
    for (let i = 0; i < m.w * m.h / 6; i++) {
      const x = R() * m.w, y = R() * m.h, g = m.groundAt(x, y);
      if (g < 0 || g === W.G.ROOF || g === W.G.WATER) continue;
      const [px, py] = P(x, y);
      if (R() < 0.15) {
        c.fillStyle = "rgba(90,120,170,.08)"; c.beginPath(); c.ellipse(px, py, 4 + R() * 8, 2 + R() * 3, 0, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(px, py, 1 + (R() * 2 | 0), 1);
      }
    }
    // light pools, added
    c.globalCompositeOperation = "lighter";
    for (const L of m.lights) {
      const [px, py] = P(L.x, L.y);
      const r = L.r * W.HTW * 1.4;
      c.save(); c.translate(px, py); c.scale(1, 0.5);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, W.rgba(L.color, L.a)); g.addColorStop(1, W.rgba(L.color, 0));
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    c.globalCompositeOperation = "source-over";
    return cv;
  }

  /* the scanner's base: the whole map flattened into the same projection */
  drawMiniBase(m) {
    const MW = 216, k = MW / (m.w + m.h), MH = Math.ceil((m.w + m.h) * k / 2) + 2;
    const cv = W.canvas(MW, MH), c = cv.getContext("2d");
    c.fillStyle = "#03050b"; c.fillRect(0, 0, MW, MH);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const kk = m.i(x, y), g = m.ground[kk], h = m.height[kk];
      let col;
      if (h > 0) col = W.shade("#2c3a5c", 0.8 + Math.min(h, 10) * 0.07);
      else if (g === W.G.ROAD || g === W.G.PARK) col = "#0c1220";
      else if (g === W.G.WATER) col = "#0b3346";
      else if (g === W.G.GRASS) col = "#0e2a1f";
      else col = "#141b2c";
      const px = (x - y + m.h) * k / 1, py = (x + y) * k / 2;
      c.fillStyle = col; c.fillRect(Math.floor(px), Math.floor(py), Math.ceil(k) + 1, Math.ceil(k / 2) + 1);
    }
    m._miniK = k;
    return cv;
  }

  glow(color, r) {
    const key = color + r;
    let g = this.glowCache.get(key);
    if (!g) {
      g = W.canvas(r * 2, r * 2);
      const c = g.getContext("2d"), gr = c.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, W.rgba(color, 0.9)); gr.addColorStop(0.25, W.rgba(color, 0.35)); gr.addColorStop(1, W.rgba(color, 0));
      c.fillStyle = gr; c.fillRect(0, 0, r * 2, r * 2);
      this.glowCache.set(key, g);
    }
    return g;
  }

  /* ---- the frame ---- */
  frame(world, dt, opts = {}) {
    const c = this.c, m = world.map, cam = world.cam, t = world.time;
    this.prepare(m);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "#05070f"; c.fillRect(0, 0, this.vw, this.vh);
    const ox = -cam.x, oy = -cam.y; // screen position of world (0,0)
    c.drawImage(m._ground, Math.round(ox - m._gox), Math.round(oy));

    // ground decals: scorch, then rings under the people that matter
    for (const d of world.decals) {
      const [sx, sy] = W.proj(d.x, d.y);
      c.fillStyle = "rgba(0,0,0,.5)"; c.beginPath(); c.ellipse(sx + ox, sy + oy, d.r * W.HTW, d.r * W.HTH, 0, 0, Math.PI * 2); c.fill();
    }
    for (const p of world.pings) {
      const [sx, sy] = W.proj(p.x, p.y), k = 1 - p.t / p.life;
      c.strokeStyle = W.rgba(p.color, k); c.lineWidth = 1;
      const r = 3 + (1 - k) * 6;
      c.beginPath(); c.moveTo(sx + ox, sy + oy - r / 2); c.lineTo(sx + ox + r, sy + oy); c.lineTo(sx + ox, sy + oy + r / 2); c.lineTo(sx + ox - r, sy + oy); c.closePath(); c.stroke();
    }
    for (const u of world.units) {
      if (!u.alive) continue;
      const sel = world.selected && world.selected.has(u);
      const isT = u.kind === "target";
      if (!sel && !isT && !(u.isAgent)) continue;
      const [sx, sy] = W.proj(u.x, u.y);
      c.strokeStyle = sel ? "#54f2ff" : isT ? (Math.sin(t * 6) > 0 ? "#ffb000" : "#7a5500") : "rgba(84,242,255,.35)";
      c.lineWidth = 1;
      c.beginPath(); c.ellipse(Math.round(sx + ox), Math.round(sy + oy), 6, 3, 0, 0, Math.PI * 2); c.stroke();
    }

    // buildings standing between the camera and a Watcher (or the target)
    // are drawn see-through, so nobody that matters is ever hidden
    const fade = this.occluders(world);

    // everything that stands up, back to front
    const dyn = [];
    for (const u of world.units) dyn.push({ kind: "unit", u, d: u.x + u.y + (u.alive ? 0 : -0.4) });
    for (const car of world.cars) dyn.push({ kind: "car", car, d: car.x + car.y });
    for (const it of world.items) dyn.push({ kind: "item", it, d: it.x + it.y - 0.3 });
    dyn.sort((a, b) => a.d - b.d);
    const st = m._static;
    const top = -20, bottom = this.vh + m._maxZ, left = -60, right = this.vw + 60;
    const vis = (x, y) => { const sx = (x - y) * W.HTW + ox, sy = (x + y) * W.HTH + oy; return sx > left && sx < right && sy > top && sy < bottom; };
    let i = 0, j = 0;
    const glows = [];
    while (i < st.length || j < dyn.length) {
      const a = st[i], b = dyn[j];
      if (b === undefined || (a !== undefined && a.d <= b.d)) {
        i++;
        if (a.kind === "cell") {
          if (!vis(a.x + 0.5, a.y + 0.5)) continue;
          const s = W.cellSprite(m, a.x, a.y);
          const [px, py] = W.proj(a.x, a.y);
          const f = fade.get(m.bid[m.i(a.x, a.y)]);
          if (f) c.globalAlpha = f;
          c.drawImage(s.cv, Math.round(px + ox - s.ox), Math.round(py + oy - s.oy));
          if (f) c.globalAlpha = 1;
        } else {
          const p = a.p;
          if (!vis(p.x, p.y)) continue;
          const [px, py] = W.proj(p.x, p.y);
          W.drawProp(c, p, Math.round(px + ox), Math.round(py + oy), t);
          if (p.type === "lamp") glows.push([px + ox + 4, py + oy - 28, "#ffd890", 22]);
          else if (p.type === "blade") glows.push([px + ox, py + oy - (p.z || 18) - 16, p.color || "#ff5266", 18]);
          else if (p.type === "vend" || p.type === "kiosk") glows.push([px + ox, py + oy - 9, p.color || "#54f2ff", 14]);
          else if (p.type === "billboard") glows.push([px + ox, py + oy - 42, p.color || "#54f2ff", 26]);
        }
      } else {
        j++;
        if (b.kind === "unit") {
          const u = b.u;
          if (!vis(u.x, u.y)) continue;
          const [px, py] = W.proj(u.x, u.y);
          W.drawUnit(c, u, px + ox, py + oy, t);
          if (u.flash > 0) glows.push([px + ox, py + oy - 12, "#ffe9a8", 16]);
        } else if (b.kind === "car") {
          if (!vis(b.car.x, b.car.y)) continue;
          W.drawCar(c, b.car, ox, oy);
          if (!b.car.dead) {
            const ax = b.car.axis === "x", f = b.car.dir;
            const hx = b.car.x + (ax ? f * (b.car.len / 2 + 0.6) : 0), hy = b.car.y + (ax ? 0 : f * (b.car.len / 2 + 0.6));
            const [qx, qy] = W.proj(hx, hy);
            glows.push([qx + ox, qy + oy - 2, "#fff0c0", 14]);
          }
        } else {
          const it = b.it, [px, py] = W.proj(it.x, it.y);
          c.save(); c.translate(Math.round(px + ox), Math.round(py + oy)); c.scale(0.45, 0.45);
          W.drawWeaponIcon(c, it.type, 0, 0, Math.sin(t * 5 + it.x) > 0.6 ? "#ffffff" : "#ffb000");
          c.restore();
        }
      }
    }

    // fire and light
    c.globalCompositeOperation = "lighter";
    for (const tr of world.tracers) {
      const a = 1 - tr.t / tr.life;
      const [x0, y0] = W.proj(tr.x0, tr.y0, tr.z0), [x1, y1] = W.proj(tr.x1, tr.y1, tr.z1);
      c.strokeStyle = W.rgba(tr.color, a); c.lineWidth = tr.w || 1;
      c.beginPath(); c.moveTo(x0 + ox, y0 + oy); c.lineTo(x1 + ox, y1 + oy); c.stroke();
    }
    for (const p of world.particles) {
      const [px, py] = W.proj(p.x, p.y, p.z);
      const a = 1 - p.t / p.life;
      c.fillStyle = W.rgba(p.color, a);
      c.fillRect(Math.round(px + ox), Math.round(py + oy), p.size, p.size);
    }
    for (const e of world.booms) {
      const [px, py] = W.proj(e.x, e.y);
      const k = e.t / e.life, r = 10 + k * 34;
      const g = this.glow("#ff9a3c", 48);
      c.globalAlpha = 1 - k;
      c.drawImage(g, px + ox - r, py + oy - r * 0.9, r * 2, r * 2);
      c.globalAlpha = 1;
    }
    for (const [x, y, col, r] of glows) c.drawImage(this.glow(col, r), Math.round(x - r), Math.round(y - r));
    c.globalCompositeOperation = "source-over";

    // smoke from wrecks
    for (const s of world.smoke) {
      const [px, py] = W.proj(s.x, s.y, s.z);
      const a = (1 - s.t / s.life) * 0.35;
      c.fillStyle = `rgba(40,44,56,${a})`;
      c.beginPath(); c.arc(px + ox, py + oy, 2 + s.t * 5, 0, Math.PI * 2); c.fill();
    }

    // rain
    if (W.prefs.rain && !opts.noRain) {
      c.strokeStyle = "rgba(150,180,230,.28)"; c.lineWidth = 1; c.beginPath();
      for (const r of this.rain) {
        r.y += 260 * dt * r.s; r.x -= 60 * dt * r.s;
        if (r.y > this.vh) { r.y -= this.vh + 10; r.x = Math.random() * (this.vw + 40); }
        if (r.x < -10) r.x += this.vw + 20;
        c.moveTo(r.x, r.y); c.lineTo(r.x - 1.5 * r.s, r.y + 6 * r.s);
      }
      c.stroke();
      c.fillStyle = "rgba(170,200,240,.25)";
      for (let k = 0; k < this.vw * this.vh / 6000; k++) c.fillRect(Math.random() * this.vw, Math.random() * this.vh, 2, 1);
    }

    // a vignette for the mood
    if (!this.vignette) {
      this.vignette = W.canvas(this.vw, this.vh);
      const v = this.vignette.getContext("2d"), g = v.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.35, this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.75);
      g.addColorStop(0, "rgba(5,7,15,0)"); g.addColorStop(1, "rgba(5,7,15,.55)");
      v.fillStyle = g; v.fillRect(0, 0, this.vw, this.vh);
    }
    c.drawImage(this.vignette, 0, 0);
  }

  /* Which buildings hide someone who matters. A body at (x, y) is covered by
   * a building of height H when the screen column above its feet, walked
   * back into the world, passes through the building's footprint: that
   * column is the line (x + t, y + t) for t in [0, H / ZH-per-tile]. Faded
   * buildings ease in and out rather than pop. */
  occluders(world) {
    const m = world.map, now = new Map();
    const who = world.units.filter(u => u.alive && !u.inCar && (u.isAgent || u.kind === "target" || (u.follower && world.selected.size)));
    for (const b of m.buildings) {
      const L = (b.floors * W.ZH + 4) / W.TH;   // how far in front it can be and still cover the feet
      let hit = false;
      for (const u of who) {
        // slab test of the segment against the footprint rectangle
        const t0 = Math.max(0, b.x - u.x, b.y - u.y), t1 = Math.min(L, b.x + b.w - u.x, b.y + b.d - u.y);
        if (t1 > t0) { hit = true; break; }
      }
      const prev = this.fadeState?.get(b.id) ?? 1;
      const next = hit ? Math.max(0.28, prev - 0.08) : Math.min(1, prev + 0.08);
      if (next < 1) now.set(b.id, next);
    }
    this.fadeState = now;
    return now;
  }

  /* The overlay: crisp text over the pixels. Speech, agent numbers, the
   * selection box, the cursor. */
  overlay(world, ui) {
    const o = this.o; if (!o) return;
    const k = this.scale, d = this.dpr;
    o.setTransform(d, 0, 0, d, 0, 0);
    o.clearRect(0, 0, this.cssW, this.cssH);
    o.font = "11px ui-monospace,Menlo,Consolas,monospace";
    o.textAlign = "center"; o.textBaseline = "bottom";
    for (const u of world.units) {
      if (!u.alive) continue;
      const [sx, sy] = this.toScreen(world, u.x, u.y);
      const X = sx * k, Y = sy * k;
      if (X < -100 || X > this.cssW + 100 || Y < -60 || Y > this.cssH + 80) continue;
      if (u.isAgent) {
        const sel = world.selected.has(u);
        o.fillStyle = sel ? "#54f2ff" : "rgba(84,242,255,.55)";
        o.fillText(String(u.slot + 1), X, Y - 27 * k);
        // a hairline health bar under the number when hurt
        if (u.hp < u.maxHp) {
          o.fillStyle = "rgba(5,7,15,.8)"; o.fillRect(X - 10, Y - 26 * k, 20, 3);
          o.fillStyle = u.hp / u.maxHp > 0.4 ? "#4ade6a" : "#ff5266"; o.fillRect(X - 10, Y - 26 * k, 20 * u.hp / u.maxHp, 3);
        }
      }
      if (u.kind === "target") {
        const b = Math.sin(world.time * 6) > 0;
        o.fillStyle = b ? "#ffb000" : "#a87400";
        o.beginPath(); o.moveTo(X, Y - 25 * k); o.lineTo(X + 6, Y - 25 * k - 8); o.lineTo(X - 6, Y - 25 * k - 8); o.closePath(); o.fill();
      }
      if (u.say && u.say.t > 0) {
        const txt = u.say.text;
        const w = o.measureText(txt).width + 12;
        const by = Y - 30 * k;
        o.fillStyle = "rgba(5,7,15,.88)"; o.fillRect(X - w / 2, by - 18, w, 17);
        o.strokeStyle = u.say.color || "#94a0c4"; o.lineWidth = 1; o.strokeRect(X - w / 2 + 0.5, by - 17.5, w - 1, 16);
        o.fillStyle = u.say.color || "#dbe4fb"; o.fillText(txt, X, by - 4);
      }
    }
    // the box being dragged
    if (ui.drag && ui.drag.box) {
      const { x0, y0, x1, y1 } = ui.drag;
      o.strokeStyle = "#54f2ff"; o.setLineDash([4, 3]); o.lineWidth = 1;
      o.strokeRect(Math.min(x0, x1) + 0.5, Math.min(y0, y1) + 0.5, Math.abs(x1 - x0), Math.abs(y1 - y0));
      o.setLineDash([]);
    }
    // the cursor itself is CSS (see Game.setCursor); this is its label
    if (ui.hover && ui.mouseIn) {
      const { x, y } = ui.hover;
      if (ui.hover.label) {
        o.textAlign = "left"; o.textBaseline = "top";
        const w = o.measureText(ui.hover.label).width + 10;
        o.fillStyle = "rgba(5,7,15,.85)"; o.fillRect(x + 14, y + 10, w, 17);
        o.fillStyle = ui.hover.labelColor || "#dbe4fb"; o.fillText(ui.hover.label, x + 19, y + 13);
      }
    }
  }

  /* ---- the scanner ---- */
  mini(c, world, opts = {}) {
    const m = world.map, base = m._mini, k = m._miniK;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(base, 0, 0);
    const P = (x, y) => [(x - y + m.h) * k, (x + y) * k / 2];
    for (const car of world.cars) {
      const [x, y] = P(car.x, car.y);
      c.fillStyle = car.dead ? "#3a2a20" : car.escape ? "#ffb000" : "#8b96b8";
      c.fillRect(x - 1, y - 1, 2, 2);
    }
    const blink = Math.sin(world.time * 8) > 0;
    for (const u of world.units) {
      if (!u.alive) continue;
      const [x, y] = P(u.x, u.y);
      let col, s = 2;
      if (u.isAgent) { col = "#54f2ff"; s = 3; }
      else if (u.kind === "target") { col = blink ? "#ffb000" : "#05070f"; s = 4; }
      else if (u.faction === "player") col = "#2fb8c4";
      else if (u.faction === "crew") col = u.hostile ? "#ff5266" : "#b8424f";
      else if (u.faction === "sec") col = u.angry ? "#7aa8ff" : "#4c6fd0";
      else { if (opts.noCiv) continue; col = "#4a5470"; s = 1; }
      c.fillStyle = col; c.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
    }
    for (const it of world.items) { const [x, y] = P(it.x, it.y); c.fillStyle = "#ffb000"; c.fillRect(x, y, 1, 1); }
    // the view, as the same rectangle shrunk
    const f = k / W.HTW;
    const vx = (world.cam.x + m.h * W.HTW) * f, vy = world.cam.y * f;
    c.strokeStyle = "rgba(84,242,255,.6)"; c.lineWidth = 1;
    c.strokeRect(Math.round(vx) + 0.5, Math.round(vy) + 0.5, Math.round(this.vw * f), Math.round(this.vh * f));
  }
  /* scanner pixel -> world */
  miniToWorld(m, mx, my) {
    const k = m._miniK;
    const a = mx / k - m.h, b = my * 2 / k;
    return [(a + b) / 2, (b - a) / 2];
  }
};
