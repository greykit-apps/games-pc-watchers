/* The renderer: the city at a low internal resolution, scaled up with hard
 * pixels, plus a full-resolution overlay for text and the cursor's marks.
 *
 * Painter's order: the ground is one prerendered image; then every building
 * cell, prop, person and car is drawn back to front by x + y. Buildings are
 * cut into one box per cell so that order is always right. */
"use strict";

W.GROUND_COL = {
  0: "#1c2131", 1: "#10131d", 2: "#20253a", 3: "#0f2019", 4: "#0a2534", 5: "#12151f", 6: "#15171f", 7: "#0a0c12",
  8: "#221c15", 9: "#1b1810", 10: "#242934", 11: "#13161e",
  12: "#22252e", 13: "#2a1d27", 14: "#2a2017", 15: "#1a1814"
};
/* the scanner's colours, top-down */
W.SCAN_COL = {
  0: "#141b2c", 1: "#0c1220", 2: "#182036", 3: "#0e2a1f", 4: "#0b3346", 5: "#10141f", 6: "#121620", 7: "#2c3a5c",
  8: "#261f16", 9: "#1f2512", 10: "#1e2430", 11: "#0e121a",
  12: "#3a3f4e", 13: "#4a3346", 14: "#4a3a28", 15: "#2a2620"
};
W.CHUNK = 512;

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

  /* ---- the static layers, built once per map ----
   * The ground is drawn lazily in 512px chunks as they come into view, so a
   * district of any size never needs one giant canvas. */
  prepare(m) {
    if (m._static) return;
    m._gox = m.h * W.HTW + 4;
    m._chunks = new Map();
    // every building cell and prop, sorted back to front
    const st = [];
    let maxH = 0;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const k = m.i(x, y);
      if (m.height[k] > 0) { st.push({ kind: "cell", x, y, d: x + y + 1 }); maxH = Math.max(maxH, m.height[k]); }
    }
    for (const p of m.props) if (!p.gone) st.push({ kind: "prop", p, d: p.x + p.y + (p.type === "blade" ? 0.6 : 0) });
    // footbridge decks, a slab per cell, drawn over whatever passes under
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const k = m.i(x, y);
      // a raised building's floor lies under all that stands on it; a walkway's deck over what passes beneath
      const zs = m.roofOf[k] >= 0 && m.structures[m.roofOf[k]].z0;
      if (m.deck[k] || m.deckHi[k]) st.push({ kind: "deck", x, y, d: x + y + (zs ? -0.9 : 1.6) });
    }
    // the wall over each doorway
    for (const l of m.lintels) st.push({ kind: "lintel", x: l.x, y: l.y, s: l.s, d: l.x + l.y + 1 });
    // the roofs of enterable buildings, drawn over whoever is inside
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const k = m.i(x, y);
      if (m.roofOf[k] >= 0 && m.height[k] === 0) st.push({ kind: "roof", x, y, s: m.roofOf[k], d: x + y + 1.98 });
    }
    st.sort((a, b) => a.d - b.d);
    m._static = st;
    m._maxZ = Math.max(maxH * W.ZH, 100) + 60;
    m._top = this.drawTop(m);
  }
  chunk(m, cx, cy) {
    const key = cx + "," + cy;
    let cv = m._chunks.get(key);
    if (!cv) {
      const CH = W.CHUNK;
      cv = W.canvas(CH, CH);
      const c = cv.getContext("2d");
      c.fillStyle = "#05070f"; c.fillRect(0, 0, CH, CH);
      c.translate(-cx * CH, -cy * CH);
      this.drawGround(m, c, { x0: cx * CH, y0: cy * CH, x1: (cx + 1) * CH, y1: (cy + 1) * CH });
      m._chunks.set(key, cv);
    }
    return cv;
  }

  /* The ground inside one region of the ground plane (pixels, world (0,0)
   * at (m._gox, 0)), into c. */
  drawGround(m, c, R) {
    const ox = m._gox, oy = 0;
    const P = (x, y) => [ox + (x - y) * W.HTW, oy + (x + y) * W.HTH];
    const dia = (x, y, w = 1, h = 1) => { const a = P(x, y), b = P(x + w, y), d = P(x + w, y + h), e = P(x, y + h); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.lineTo(...e); c.closePath(); };
    // the cells whose diamonds touch the region
    const cells = [];
    const s0 = Math.floor(R.y0 / W.HTH) - 2, s1 = Math.ceil(R.y1 / W.HTH) + 1;
    const d0 = Math.floor((R.x0 - ox) / W.HTW) - 2, d1 = Math.ceil((R.x1 - ox) / W.HTW) + 2;
    for (let sum = s0; sum <= s1; sum++) for (let d = d0; d <= d1; d++) {
      if (((sum + d) & 1) !== 0) continue;
      const x = (sum + d) / 2, y = (sum - d) / 2;
      if (m.inb(x, y)) cells.push(x, y);
    }
    for (let n = 0; n < cells.length; n += 2) {
      const x = cells[n], y = cells[n + 1];
      const g = m.ground[m.i(x, y)];
      let col = W.GROUND_COL[g] || "#1c2131";
      const h = W.hash2(x, y, 3);
      if (g === W.G.PLAZA && (x + y) % 2) col = "#23293f";
      if (g === W.G.WALK) col = h < 0.5 ? "#1c2131" : "#1e2335";
      if (g === W.G.GRASS) col = h < 0.5 ? "#0f2019" : "#11241c";
      if (g === W.G.DIRT) col = h < 0.5 ? "#221c15" : "#251e16";
      if (g === W.G.PAD && ((x >> 2) + (y >> 2)) % 2) col = "#262b37";
      if (g === W.G.INDOOR && (x + y) % 2) col = "#262a34";
      if (g === W.G.CARPET && h < 0.5) col = "#2d2029";
      dia(x, y); c.fillStyle = col; c.fill();
      if (g === W.G.WALK || g === W.G.PLAZA || g === W.G.PAD) { c.strokeStyle = g === W.G.PAD ? (x % 4 === 0 || y % 4 === 0 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,0)") : "rgba(255,255,255,.035)"; c.lineWidth = 1; c.stroke(); }
      if (g === W.G.WATER) {
        c.fillStyle = "rgba(84,242,255,.10)";
        const [px, py] = P(x + 0.5, y + 0.5);
        c.fillRect(px - 6 + h * 6, py - 1, 6, 1);
      }
      if (g === W.G.FIELD) {
        // furrows running along x
        c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 1; c.beginPath();
        for (const v of [0.2, 0.55, 0.85]) { c.moveTo(...P(x, y + v)); c.lineTo(...P(x + 1, y + v)); }
        c.stroke();
        if (h < 0.25) { const [px, py] = P(x + 0.5, y + 0.5); c.fillStyle = "rgba(90,140,60,.35)"; c.fillRect(px - 2, py - 1, 2, 1); }
      }
      if (g === W.G.DIRT && h < 0.3) { const [px, py] = P(x + h * 3, y + 0.5); c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(px, py, 2, 1); }
      if (g === W.G.WOOD) {
        c.strokeStyle = "rgba(0,0,0,.3)"; c.lineWidth = 1; c.beginPath();
        for (const v of [0.33, 0.66]) { c.moveTo(...P(x + v, y)); c.lineTo(...P(x + v, y + 1)); }
        c.stroke();
      }
      if (g === W.G.RAIL) {
        // sleepers across, two rails along
        const ax = m.mark[m.i(x, y)] === W.MARK.RAIL_X;
        c.strokeStyle = "#3a2e24"; c.lineWidth = 2; c.beginPath();
        for (const v of [0.2, 0.6]) { if (ax) { c.moveTo(...P(x + v, y + 0.1)); c.lineTo(...P(x + v, y + 0.9)); } else { c.moveTo(...P(x + 0.1, y + v)); c.lineTo(...P(x + 0.9, y + v)); } }
        c.stroke();
        const lane = ax ? (y % 2) : (x % 2);   // the rails sit where a train's wheels run
        c.strokeStyle = "#8a90a0"; c.lineWidth = 1; c.beginPath();
        const r = lane ? 0.25 : 0.75;
        if (ax) { c.moveTo(...P(x, y + r)); c.lineTo(...P(x + 1, y + r)); } else { c.moveTo(...P(x + r, y)); c.lineTo(...P(x + r, y + 1)); }
        c.stroke();
      }
    }
    // curbs: a lit edge wherever a pavement meets the road or water
    c.lineWidth = 1;
    const nb = (i, j) => m.inb(i, j) ? m.ground[m.i(i, j)] : -1;
    for (let n = 0; n < cells.length; n += 2) {
      const x = cells[n], y = cells[n + 1];
      const g = m.ground[m.i(x, y)];
      if (g === W.G.ROAD || g === W.G.PARK || g === W.G.ROOF || g === W.G.TARMAC || g === W.G.FIELD || g === W.G.DIRT || g === W.G.GRASS || W.FLOORS.has(g) || g === W.G.RAIL) continue;
      const edge = t => t === W.G.ROAD || t === W.G.PARK || t === W.G.TARMAC || (g !== W.G.WATER && t === W.G.WATER);
      c.strokeStyle = g === W.G.WATER ? "#3a5a6a" : "#3a4258";
      c.beginPath();
      if (edge(nb(x, y - 1))) { c.moveTo(...P(x, y)); c.lineTo(...P(x + 1, y)); }
      if (edge(nb(x + 1, y))) { c.moveTo(...P(x + 1, y)); c.lineTo(...P(x + 1, y + 1)); }
      if (edge(nb(x, y + 1))) { c.moveTo(...P(x, y + 1)); c.lineTo(...P(x + 1, y + 1)); }
      if (edge(nb(x - 1, y))) { c.moveTo(...P(x, y)); c.lineTo(...P(x, y + 1)); }
      c.stroke();
    }
    // is a world point anywhere near this region?
    const near = (x, y, pad = 2) => { const [px, py] = P(x, y); return px > R.x0 - pad * 32 && px < R.x1 + pad * 32 && py > R.y0 - pad * 16 && py < R.y1 + pad * 16; };
    // road markings
    const inJ = (x, y, pad = 0) => m.junctions.some(j => x >= j.x0 - pad && x < j.x1 + pad && y >= j.y0 - pad && y < j.y1 + pad);
    const seg = (x0, y0, x1, y1, col, w = 1) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(...P(x0, y0)); c.lineTo(...P(x1, y1)); c.stroke(); };
    for (const r of m.roads || []) {
      if (r.axis === "x") {
        const cy = r.y + r.h / 2;
        for (let x = r.x; x < r.x + r.w; x++) {
          if (!near(x, cy) || inJ(x + 0.5, cy, 1)) continue;
          seg(x + 0.15, cy, x + 0.6, cy, r.oneway ? "rgba(220,230,255,.4)" : "rgba(255,200,90,.55)");
          seg(x, r.y + 0.12, x + 1, r.y + 0.12, "rgba(220,230,255,.12)");
          seg(x, r.y + r.h - 0.12, x + 1, r.y + r.h - 0.12, "rgba(220,230,255,.12)");
        }
      } else {
        const cx = r.x + r.w / 2;
        for (let y = r.y; y < r.y + r.h; y++) {
          if (!near(cx, y) || inJ(cx, y + 0.5, 1)) continue;
          seg(cx, y + 0.15, cx, y + 0.6, r.oneway ? "rgba(220,230,255,.4)" : "rgba(255,200,90,.55)");
          seg(r.x + 0.12, y, r.x + 0.12, y + 1, "rgba(220,230,255,.12)");
          seg(r.x + r.w - 0.12, y, r.x + r.w - 0.12, y + 1, "rgba(220,230,255,.12)");
        }
      }
    }
    const zebra = (x0, y0, x1, y1, along) => {
      c.fillStyle = "rgba(220,230,255,.22)";
      if (along === "y") { for (let y = y0 + 0.1; y < y1; y += 0.4) { dia(x0 + 0.15, y, (x1 - x0) - 0.3, 0.2); c.fill(); } }
      else { for (let x = x0 + 0.1; x < x1; x += 0.4) { dia(x, y0 + 0.15, 0.2, (y1 - y0) - 0.3); c.fill(); } }
    };
    for (const j of m.junctions) {
      if (!near((j.x0 + j.x1) / 2, (j.y0 + j.y1) / 2, 4)) continue;
      zebra(j.x0 - 1, j.y0, j.x0, j.y1, "y"); zebra(j.x1, j.y0, j.x1 + 1, j.y1, "y");
      zebra(j.x0, j.y0 - 1, j.x1, j.y0, "x"); zebra(j.x0, j.y1, j.x1, j.y1 + 1, "x");
    }
    for (let n = 0; n < cells.length; n += 2) {
      const x = cells[n], y = cells[n + 1];
      if (m.ground[m.i(x, y)] === W.G.PARK && m.mark[m.i(x, y)] === W.MARK.BAY) seg(x, y, x, y + 1, "rgba(220,230,255,.25)");
      if (m.ground[m.i(x, y)] === W.G.PARK && m.mark[m.i(x, y)] === W.MARK.EDGE_X) seg(x, y, x + 1, y, "rgba(220,230,255,.25)");
    }
    // painted lines, pads and lettering
    for (const d of m.paint) {
      if (!near(d.x, d.y, (d.r || 0) + 30)) continue;
      c.strokeStyle = d.color || "rgba(255,200,90,.6)"; c.fillStyle = d.color || "rgba(255,200,90,.6)"; c.lineWidth = d.w || 1;
      if (d.type === "circle" || d.type === "disc") {
        const [px, py] = P(d.x, d.y);
        c.save(); c.translate(px, py); c.scale(1, 0.5); c.rotate(Math.PI / 4);
        c.beginPath(); c.arc(0, 0, d.r * W.HTW * Math.SQRT2, 0, Math.PI * 2);
        c.restore();
        if (d.type === "disc") c.fill(); else c.stroke();
      } else if (d.type === "rect") {
        dia(d.x, d.y, d.x2 - d.x, d.y2 - d.y); if (d.fill) c.fill(); else c.stroke();
      } else if (d.type === "rrect") {
        // a rectangle with rounded corners (radius d.r), traced in world space
        const pts = [], r = d.r || 2;
        for (const [cx0, cy0, a0] of [[d.x2 - r, d.y + r, -Math.PI / 2], [d.x2 - r, d.y2 - r, 0], [d.x + r, d.y2 - r, Math.PI / 2], [d.x + r, d.y + r, Math.PI]])
          for (let k = 0; k <= 6; k++) { const a = a0 + k / 6 * Math.PI / 2; pts.push(P(cx0 + Math.cos(a) * r, cy0 + Math.sin(a) * r)); }
        c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
        if (d.fill) c.fill(); else c.stroke();
      } else if (d.type === "line") {
        if (d.dash) c.setLineDash(d.dash);
        seg(d.x, d.y, d.x2, d.y2, d.color, d.w || 1);
        c.setLineDash([]);
      } else if (d.type === "text") {
        const [px, py] = P(d.x, d.y);
        c.save();
        if (d.axis === "y") c.setTransform(1, -0.5, 1, 0.5, px - R.x0, py - R.y0); else c.setTransform(1, 0.5, -1, 0.5, px - R.x0, py - R.y0);
        c.font = `bold ${d.size || 12}px ui-monospace,Menlo,Consolas,monospace`;
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(d.text, 0, 0);
        c.restore();
      }
    }
    // grime and puddles
    const Rn = W.rng(m.seed || 7);
    for (let i = 0; i < m.w * m.h / 6; i++) {
      const x = Rn() * m.w, y = Rn() * m.h, a = Rn(), b = Rn(), e = Rn(), f = Rn();
      if (!near(x, y, 1)) continue;
      const g = m.groundAt(x, y);
      if (g < 0 || g === W.G.ROOF || g === W.G.WATER) continue;
      const [px, py] = P(x, y);
      if (a < 0.15) { c.fillStyle = "rgba(90,120,170,.08)"; c.beginPath(); c.ellipse(px, py, 4 + b * 8, 2 + e * 3, 0, 0, Math.PI * 2); c.fill(); }
      else { c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(px, py, 1 + (f * 2 | 0), 1); }
    }
    // light pools, added
    c.globalCompositeOperation = "lighter";
    for (const L of m.lights) {
      if (!near(L.x, L.y, L.r + 2)) continue;
      const [px, py] = P(L.x, L.y);
      const r = L.r * W.HTW * 1.4;
      c.save(); c.translate(px, py); c.scale(1, 0.5);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, W.rgba(L.color, L.a)); g.addColorStop(1, W.rgba(L.color, 0));
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    c.globalCompositeOperation = "source-over";
  }

  /* The scanner's base: one pixel per tile, top-down. */
  drawTop(m) {
    const cv = W.canvas(m.w, m.h), c = cv.getContext("2d");
    const img = c.createImageData(m.w, m.h), d = img.data;
    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const cache = {};
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const k = m.i(x, y), g = m.ground[k], h = m.height[k];
      let col;
      if (h > 0) {
        const b = m.buildings[m.bid[k]], st = b && W.STYLES[b.style];
        col = st && st.scan ? st.scan : W.shade("#2c3a5c", 0.85 + Math.min(h, 12) * 0.06);
      } else col = W.SCAN_COL[g] || "#141b2c";
      const rgb = cache[col] || (cache[col] = hex(col));
      const o = k * 4;
      d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
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
    {
      const CH = W.CHUNK, gx0 = Math.round(cam.x) + m._gox, gy0 = Math.round(cam.y);
      for (let cy = Math.floor(gy0 / CH); cy <= Math.floor((gy0 + this.vh) / CH); cy++)
        for (let cx = Math.floor(gx0 / CH); cx <= Math.floor((gx0 + this.vw) / CH); cx++) {
          if (cx < 0 || cy < 0 || cx * CH > (m.w + m.h) * W.HTW + 8 || cy * CH > (m.w + m.h) * W.HTH + 8) continue;
          c.drawImage(this.chunk(m, cx, cy), cx * CH - gx0, cy * CH - gy0);
        }
    }

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
    // a BanHammer strike on its way: the painted circle, tightening, and the laser that paints it
    for (const s of world.strikes || []) {
      const [sx, sy] = W.proj(s.x, s.y), k = s.t / s.delay, on = Math.sin(t * (10 + 20 * k)) > 0;
      c.strokeStyle = W.rgba("#ff3048", on ? 0.95 : 0.5); c.lineWidth = 1;
      c.beginPath(); c.ellipse(Math.round(sx + ox), Math.round(sy + oy), s.r * W.HTW, s.r * W.HTH, 0, 0, Math.PI * 2); c.stroke();
      const r2 = s.r * (1 - k);
      c.strokeStyle = W.rgba("#ff3048", 0.6);
      c.beginPath(); c.ellipse(Math.round(sx + ox), Math.round(sy + oy), r2 * W.HTW, r2 * W.HTH, 0, 0, Math.PI * 2); c.stroke();
      if (s.by && s.by.alive && !s.by.out) {
        const [ax, ay] = W.proj(s.by.x, s.by.y, (s.by.z || 0) + 12);
        c.strokeStyle = W.rgba("#ff3048", on ? 0.9 : 0.55);
        c.beginPath(); c.moveTo(Math.round(ax + ox), Math.round(ay + oy)); c.lineTo(Math.round(sx + ox), Math.round(sy + oy)); c.stroke();
      }
    }
    // an intel job's terminal: a lit console, and a ring that fills as it copies
    const D = world.terminal;
    if (D) {
      const [sx, sy] = W.proj(D.x, D.y);
      if (D.safe) {
        // a safe: squat steel, its dial lit until it opens
        W.box(c, ox, oy, D.x - 0.32, D.y - 0.32, D.x + 0.32, D.y + 0.32, 0, 10, "#4a4f5a", "#3a3f48", "#2e323a");
        W.box(c, ox, oy, D.x - 0.08, D.y + 0.32, D.x + 0.08, D.y + 0.36, 4, 6, D.done ? "#2a6a4a" : (Math.sin(t * 6) > 0 ? "#7dffb0" : "#3aa070"), "#1d3346", "#1d3346");
      } else {
        W.box(c, ox, oy, D.x - 0.3, D.y - 0.2, D.x + 0.3, D.y + 0.2, 0, 9, "#1d3346", "#2a3a52", "#1a2638");
        W.box(c, ox, oy, D.x - 0.24, D.y - 0.14, D.x + 0.24, D.y + 0.14, 9, 10, D.done ? "#2a6a4a" : (Math.sin(t * 6) > 0 ? "#7dffb0" : "#3aa070"), "#1d3346", "#1d3346");
      }
      if (!D.done) {
        c.strokeStyle = W.rgba("#7dffb0", 0.5); c.lineWidth = 1;
        c.beginPath(); c.ellipse(Math.round(sx + ox), Math.round(sy + oy), 1.4 * W.HTW, 1.4 * W.HTH, 0, 0, Math.PI * 2); c.stroke();
        if (D.t > 0) { c.strokeStyle = "#7dffb0"; c.lineWidth = 2; c.beginPath(); c.ellipse(Math.round(sx + ox), Math.round(sy + oy), 1.4 * W.HTW, 1.4 * W.HTH, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, D.t / D.need)); c.stroke(); }
      }
    }
    // the ways out, once the job is done: a pulsing cyan pad
    if (world.phase === "exfil") for (const p of world.exfilPoints || []) {
      const [sx, sy] = W.proj(p.x, p.y), k = 0.5 + 0.5 * Math.sin(t * 4);
      for (const [r, a] of [[1.6, 0.9], [1.1 + 0.4 * k, 0.5]]) {
        c.strokeStyle = W.rgba("#54f2ff", a); c.lineWidth = 1;
        c.beginPath(); c.ellipse(Math.round(sx + ox), Math.round(sy + oy), r * W.HTW, r * W.HTH, 0, 0, Math.PI * 2); c.stroke();
      }
    }
    for (const u of world.units) {
      if (!u.alive || u.out) continue;
      const sel = world.selected && world.selected.has(u);
      const isT = u.kind === "target";
      if (!sel && !isT && !(u.isAgent)) continue;
      if ((u.z || 0) > 3) continue;            // rings for people up on a walkway are drawn with them
      const [sx, sy] = W.proj(u.x, u.y);
      c.strokeStyle = sel ? "#54f2ff" : isT ? (Math.sin(t * 6) > 0 ? "#ffb000" : "#7a5500") : "rgba(84,242,255,.35)";
      c.lineWidth = 1;
      c.beginPath(); c.ellipse(Math.round(sx + ox), Math.round(sy + oy), 6, 3, 0, 0, Math.PI * 2); c.stroke();
    }

    // buildings standing between the camera and a Watcher (or the target)
    // are drawn see-through, so nobody that matters is ever hidden
    const fade = this.occluders(world);
    // a building is open (roof off, walls cut down) while one of ours is inside
    const open = this.openNow = new Set();
    for (const u of world.units) {
      if (!u.alive || u.faction !== "player" || u.inCar) continue;
      const cx = Math.floor(u.x), cy = Math.floor(u.y);
      if (m.inb(cx, cy) && m.roofOf[m.i(cx, cy)] >= 0 && !m.structures[m.roofOf[m.i(cx, cy)]].canopy) open.add(m.roofOf[m.i(cx, cy)]);
      // out on a stadium's pitch, the stands are open to view too
      for (const S of m.structures) if (S.court && cx >= S.court.x && cy >= S.court.y && cx < S.court.x + S.court.w && cy < S.court.y + S.court.d) open.add(S.id);
    }
    if (opts.openAll) for (const s of m.structures) open.add(s.id);

    // everything that stands up, back to front
    const dyn = [];
    // people up on a walkway sort after its deck
    const raisedAt = (x, y) => { const cx = Math.floor(x), cy = Math.floor(y); if (!m.inb(cx, cy)) return 0; const r = m.roofOf[m.i(cx, cy)]; return r >= 0 ? m.structures[r].z0 || 0 : 0; };
    for (const u of world.units) dyn.push({ kind: "unit", u, d: u.x + u.y + (u.alive ? 0 : -0.4) + ((u.z || 0) > 0.3 && !raisedAt(u.x, u.y) ? 1.7 : 0) });
    for (const car of world.cars) dyn.push({ kind: "car", car, d: car.x + car.y + (car.z ? 1.7 : 0) });
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
        if (a.kind === "lintel") {
          if (open.has(a.s) || !vis(a.x + 0.5, a.y + 0.5)) continue;
          const s = W.lintelSprite(m, a.x, a.y, m.structures[a.s]);
          const [px, py] = W.proj(a.x, a.y, m.structures[a.s].z0 || 0);
          const f = fade.get("s" + a.s);
          if (f) c.globalAlpha = f;
          c.drawImage(s.cv, Math.round(px + ox - s.ox), Math.round(py + oy - s.oy));
          if (f) c.globalAlpha = 1;
        } else if (a.kind === "deck") {
          if (!vis(a.x + 0.5, a.y + 0.5)) continue;
          const s = W.deckSprite(m, a.x, a.y);
          const [px, py] = W.proj(a.x, a.y);
          c.drawImage(s.cv, Math.round(px + ox - s.ox), Math.round(py + oy - s.oy));
        } else if (a.kind === "roof") {
          if (open.has(a.s) || !vis(a.x + 0.5, a.y + 0.5)) continue;
          const s = W.roofSprite(m, a.x, a.y, m.structures[a.s]);
          const [px, py] = W.proj(a.x, a.y, m.structures[a.s].z0 || 0);
          const f = fade.get("s" + a.s);
          if (f) c.globalAlpha = f;
          c.drawImage(s.cv, Math.round(px + ox - s.ox), Math.round(py + oy - s.oy));
          if (f) c.globalAlpha = 1;
        } else if (a.kind === "cell") {
          if (!vis(a.x + 0.5, a.y + 0.5)) continue;
          const B = m.buildings[m.bid[m.i(a.x, a.y)]];
          const cut = B && B.struct !== undefined && open.has(B.struct);
          // an inside wall of a closed building is just more roof
          const s = cut ? W.cutSprite(m, a.x, a.y) : B && B.inner ? W.roofSprite(m, a.x, a.y, m.structures[B.struct]) : W.cellSprite(m, a.x, a.y);
          const [px, py] = W.proj(a.x, a.y, B && B.struct !== undefined ? m.structures[B.struct].z0 || 0 : 0);
          const f = cut ? 0 : fade.get(B && B.struct !== undefined ? "s" + B.struct : m.bid[m.i(a.x, a.y)]);
          if (f) c.globalAlpha = f;
          c.drawImage(s.cv, Math.round(px + ox - s.ox), Math.round(py + oy - s.oy));
          if (f) c.globalAlpha = 1;
        } else {
          const p = a.p;
          if (!vis(p.x, p.y)) continue;
          // what is inside a closed building is under its roof: not drawn at all, so nothing
          // big in there can show over the roof behind it, and nothing glows out of it
          const ro = m.roofOf[m.i(Math.floor(p.x), Math.floor(p.y))];
          if (ro >= 0 && !open.has(ro) && !m.structures[ro].canopy) continue;
          const [px, py] = W.proj(p.x, p.y, raisedAt(p.x, p.y));
          W.drawProp(c, p, Math.round(px + ox), Math.round(py + oy), t);
          if (p.type === "lamp") glows.push([px + ox + 4, py + oy - 28, "#ffd890", 22]);
          else if (p.type === "blade") glows.push([px + ox, py + oy - (p.z || 18) - 16, p.color || "#ff5266", 18]);
          else if (p.type === "vend" || p.type === "kiosk") glows.push([px + ox, py + oy - 9, p.color || "#54f2ff", 14]);
          else if (p.type === "billboard") glows.push([px + ox, py + oy - 42, p.color || "#54f2ff", 26]);
          else if (p.type === "flood") glows.push([px + ox, py + oy - 46, "#fffbe8", 30]);
          else if (p.type === "truck") glows.push([px + ox, py + oy - 10, "#ffe2a0", 14]);
          else if (p.type === "crane") glows.push([px + ox - 24, py + oy - 85, "#ff3048", 8]);
          else if (p.type === "box" && p.glow) glows.push([px + ox, py + oy - (p.h || 8) - 2, p.glow, p.glowR || 10]);
          else if (p.type === "watertower") glows.push([px + ox, py + oy - 100, "#ff3048", 8]);
        }
      } else {
        j++;
        if (b.kind === "unit") {
          const u = b.u;
          if (u.out || !vis(u.x, u.y)) continue;
          const [px, py] = W.proj(u.x, u.y, u.z || 0);
          if ((u.z || 0) > 3 && u.alive && (world.selected.has(u) || u.isAgent || u.kind === "target")) {
            c.strokeStyle = world.selected.has(u) ? "#54f2ff" : u.kind === "target" ? "#ffb000" : "rgba(84,242,255,.35)"; c.lineWidth = 1;
            c.beginPath(); c.ellipse(Math.round(px + ox), Math.round(py + oy), 6, 3, 0, 0, Math.PI * 2); c.stroke();
          }
          W.drawUnit(c, u, px + ox, py + oy, t);
          if (u.flash > 0) glows.push([px + ox, py + oy - 12, "#ffe9a8", 16]);
        } else if (b.kind === "car") {
          if (!vis(b.car.x, b.car.y)) continue;
          W.drawCar(c, b.car, ox, oy - (b.car.z || 0));
          if (!b.car.dead && !b.car.parked && !b.car.train) {
            const ax = b.car.axis === "x", f = b.car.dir;
            const hx = b.car.x + (ax ? f * (b.car.len / 2 + 0.6) : 0), hy = b.car.y + (ax ? 0 : f * (b.car.len / 2 + 0.6));
            const [qx, qy] = W.proj(hx, hy);
            glows.push([qx + ox, qy + oy - 2, "#fff0c0", 14]);
          }
        } else {
          const it = b.it, [px, py] = W.proj(it.x, it.y, raisedAt(it.x, it.y));
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
    // the BanHammer's beam, straight down from orbit
    for (const b of world.columns || []) {
      const [px, py] = W.proj(b.x, b.y), k = b.t / b.life, w = (b.r * W.HTW * 0.5) * (1 - k * 0.6);
      c.globalAlpha = 1 - k;
      c.fillStyle = "#e8fbff"; c.fillRect(Math.round(px + ox - w / 3), 0, Math.round(w * 2 / 3), Math.round(py + oy));
      c.fillStyle = "#54f2ff"; c.globalAlpha = (1 - k) * 0.45; c.fillRect(Math.round(px + ox - w), 0, Math.round(w * 2), Math.round(py + oy));
      const g = this.glow("#e8fbff", 80); c.globalAlpha = 1 - k; c.drawImage(g, px + ox - 80, py + oy - 60, 160, 120);
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
    const fadeOf = (key, hit) => {
      const prev = this.fadeState?.get(key) ?? 1;
      const next = hit ? Math.max(0.28, prev - 0.08) : Math.min(1, prev + 0.08);
      if (next < 1) now.set(key, next);
    };
    // an enterable building fades as one, walls and roof together
    for (const S of m.structures) {
      const L = ((S.z0 || 0) + S.floors * W.ZH + 4) / W.TH;
      let hit = false;
      for (const u of who) {
        const cx = Math.floor(u.x), cy = Math.floor(u.y);
        if (m.inb(cx, cy) && m.roofOf[m.i(cx, cy)] === S.id) { if (S.canopy) { hit = true; break; } continue; }
        const t0 = Math.max(0, S.x - u.x, S.y - u.y), t1 = Math.min(L, S.x + S.w - u.x, S.y + S.d - u.y);
        if (t1 > t0) { hit = true; break; }
      }
      fadeOf("s" + S.id, hit);
    }
    for (const b of m.buildings) {
      if (b.struct !== undefined) continue;
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
    if (world.terminal && !world.terminal.done) {
      const D = world.terminal, [sx, sy] = this.toScreen(world, D.x, D.y, 0);
      o.fillStyle = "#7dffb0"; o.fillText(D.t > 0 ? `${D.safe ? "CRACKING" : "COPYING"} ${Math.floor(100 * Math.min(1, D.t / D.need))}%` : D.safe ? "SAFE" : "TERMINAL", sx * k, sy * k - 24 * k);
    }
    if (world.stash && !world.stash.dead) {
      const [sx, sy] = this.toScreen(world, world.stash.x, world.stash.y, 0);
      o.fillStyle = "#7dffb0"; o.fillText("STASH", sx * k, sy * k - 20 * k);
    }
    if (world.siege && world.siege.left) {
      const [sx, sy] = this.toScreen(world, world.siege.x, world.siege.y, 0);
      o.fillStyle = "#ff5266"; o.fillText(`${world.siege.left} INSIDE`, sx * k, sy * k - 30 * k);
    }
    if (world.phase === "exfil") for (const p of world.exfilPoints || []) {
      const [sx, sy] = this.toScreen(world, p.x, p.y, 0);
      o.fillStyle = "#54f2ff"; o.fillText("EXFIL", sx * k, sy * k - 14);
    }
    for (const u of world.units) {
      if (!u.alive || u.out) continue;
      const [sx, sy] = this.toScreen(world, u.x, u.y, u.z || 0);
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
      // the scanner's mark on a gun under plain clothes
      if (u.undercover && !u.revealed && (W.scanArmed(world, u) || W.scanCal(world, u))) {
        const cal = W.scanCal(world, u), on = Math.sin(world.time * 8) > 0;
        o.fillStyle = cal ? (on ? "#ff5266" : "#8a2a36") : on ? "#ff8a3c" : "#a8541c";
        o.beginPath(); o.moveTo(X, Y - 25 * k); o.lineTo(X + 4, Y - 25 * k - 6); o.lineTo(X, Y - 25 * k - 12); o.lineTo(X - 4, Y - 25 * k - 6); o.closePath(); o.fill();
      }
      if (u.subject && !u.follower) {
        o.fillStyle = Math.sin(world.time * 6) > 0 ? "#7dffb0" : "#3aa070";
        o.beginPath(); o.moveTo(X, Y - 25 * k); o.lineTo(X + 6, Y - 25 * k - 8); o.lineTo(X - 6, Y - 25 * k - 8); o.closePath(); o.fill();
      }
      if (u.carries === "data" && !u.out) { o.fillStyle = "#7dffb0"; o.fillText("DATA", X, Y - 36 * k); }
      if (u.isAgent && !u.out && u.weapons.some(w => w.type === "goods")) { o.fillStyle = "#7dffb0"; o.fillText("GOODS", X, Y - 36 * k); }
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
    // aiming the BanHammer: the blast circle under the cursor, and the laser from the Watcher
    if (ui.aim && ui.mouseIn) {
      const r = W.WEAPONS.banhammer.strike.r * k, col = ui.aim.ok ? "#ff3048" : "#94a0c4";
      o.strokeStyle = col; o.lineWidth = 1.5; o.setLineDash(ui.aim.ok ? [] : [5, 4]);
      o.beginPath(); o.ellipse(ui.x, ui.y, r * W.HTW, r * W.HTH, 0, 0, Math.PI * 2); o.stroke();
      o.setLineDash([]);
      const a = ui.aim.agent;
      if (a && a.alive) { const [ax, ay] = this.toScreen(world, a.x, a.y, (a.z || 0) + 12); o.strokeStyle = col; o.globalAlpha = 0.7; o.beginPath(); o.moveTo(ax * k, ay * k); o.lineTo(ui.x, ui.y); o.stroke(); o.globalAlpha = 1; }
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

  /* ---- the scanner ----
   * Syndicate's: a top-down map turned 45 degrees so it faces the way the
   * view does, centred on the lead Watcher, with a radar ping sweeping out
   * every two seconds. Blips flare as the ring passes them; a target off the
   * edge gets an arrow on the rim.
   *   opts.center [x, y]   opts.k pixels per tile   opts.full fit the map
   *   opts.ping            opts.noCiv               opts.noView */
  scanner(c, world, opts = {}) {
    const m = world.map;
    this.prepare(m);
    const Wd = c.canvas.width, Ht = c.canvas.height;
    let k = opts.k || 3, cx, cy;
    if (opts.full) { k = Math.min(Wd, Ht) / ((m.w + m.h) / Math.SQRT2) * 0.98; cx = m.w / 2; cy = m.h / 2; }
    else [cx, cy] = opts.center || this.viewCenter(world);
    this.scan = { cx, cy, k, Wd, Ht };
    const P = (x, y) => [Wd / 2 + ((x - cx) - (y - cy)) * k / Math.SQRT2, Ht / 2 + ((x - cx) + (y - cy)) * k / Math.SQRT2];
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#03050b"; c.fillRect(0, 0, Wd, Ht);
    c.save();
    c.translate(Wd / 2, Ht / 2); c.rotate(Math.PI / 4); c.scale(k, k); c.translate(-cx, -cy);
    c.drawImage(m._top, 0, 0);
    // a faint grid every 8 tiles
    c.strokeStyle = "rgba(84,242,255,.05)"; c.lineWidth = 1 / k; c.beginPath();
    for (let x = 0; x <= m.w; x += 8) { c.moveTo(x, 0); c.lineTo(x, m.h); }
    for (let y = 0; y <= m.h; y += 8) { c.moveTo(0, y); c.lineTo(m.w, y); }
    c.stroke();
    c.restore();
    // the ping
    const t = world.time, PERIOD = 2.2, ph = (t % PERIOD) / PERIOD, R = 46 * ph;
    const pc = opts.center || [cx, cy];
    if (opts.ping) {
      const [px, py] = P(pc[0], pc[1]);
      c.strokeStyle = `rgba(84,242,255,${0.55 * (1 - ph)})`; c.lineWidth = 1.5;
      c.beginPath(); c.arc(px, py, R * k, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = `rgba(84,242,255,${0.15 * (1 - ph)})`; c.lineWidth = 4;
      c.beginPath(); c.arc(px, py, Math.max(0, R * k - 3), 0, Math.PI * 2); c.stroke();
    }
    const flare = (x, y) => opts.ping ? Math.max(0, 1 - Math.abs(W.dist(x, y, pc[0], pc[1]) - R) / 3) * (1 - ph) : 0;
    const blip = (x, y, col, s) => { const [px, py] = P(x, y); if (px < -4 || py < -4 || px > Wd + 4 || py > Ht + 4) return; const f = flare(x, y); c.fillStyle = col; const z = s + f * 2; c.fillRect(Math.round(px - z / 2), Math.round(py - z / 2), z, z); };
    for (const car of world.cars) blip(car.x, car.y, car.dead ? "#3a2a20" : car.escapeCar ? "#ffb000" : "#6a7590", 2);
    for (const it of world.items) blip(it.x, it.y, "#ffb000", 1);
    const blink = Math.sin(t * 8) > 0;
    let target = null;
    // the squad's scanner: below MK3 it cannot see in under a roof none of ours is under
    const mk = opts.full ? 3 : W.scanMk(world), walls = opts.full || (W.SCAN[mk] || {}).walls;
    const open = this.openNow || new Set();
    const hidden = u => { if (walls || u.faction === "player" || u.kind === "target") return false; const cx = Math.floor(u.x), cy = Math.floor(u.y); if (!m.inb(cx, cy)) return false; const r = m.roofOf[m.i(cx, cy)]; return r >= 0 && !open.has(r) && !m.structures[r].canopy; };
    for (const u of world.units) {
      if (!u.alive || u.inCar || hidden(u)) continue;
      let col, sz = 2;
      if (u.isAgent) { col = world.selected.has(u) ? "#ffffff" : "#54f2ff"; sz = 3; }
      else if (u.kind === "target") { target = u; col = blink ? "#ffb000" : "#7a5500"; sz = 4; }
      else if (u.faction === "player") col = "#2fb8c4";
      // plain clothes pass for the crowd, unless the scanner marks the gun
      // MK3, against Cal: his people show as what they are, plain clothes or not
      else if (u.faction === "crew" && u.undercover && !u.revealed && W.scanCal(world, u)) col = u.hostile ? "#ff5266" : "#b8424f";
      else if (u.faction === "crew" && u.undercover && !u.revealed) { if (W.scanArmed(world, u)) col = blink ? "#ff8a3c" : "#a8541c"; else { if (opts.noCiv) continue; col = "#56607a"; sz = 1; } }
      // MK2 and up: the armed apart from the unarmed
      else if (u.faction === "crew" && mk >= 2 && !W.hasGun(u)) col = u.hostile ? "#a8505c" : "#6e3a44";
      else if (u.faction === "crew") col = u.hostile ? "#ff5266" : "#b8424f";
      else if (u.faction === "sec") col = u.elite ? (u.angryAt.player ? "#ffe08a" : "#b8902a") : u.angryAt.player ? "#9ab8ff" : "#4c6fd0";
      else { if (opts.noCiv) continue; col = "#56607a"; sz = 1; }
      blip(u.x, u.y, col, sz);
    }
    if (!target && world.escapeCar && world.escapeCar.passenger && !world.escapeCar.dead) target = world.escapeCar;
    const S = world.subjectUnit;
    if (S && S.alive && !S.follower && !S.inCar) { blip(S.x, S.y, blink ? "#7dffb0" : "#2a6a4a", 4); if (!target) target = { x: S.x, y: S.y, mark: true }; }
    if (world.terminal && !world.terminal.done) { blip(world.terminal.x, world.terminal.y, blink ? "#7dffb0" : "#2a6a4a", 4); if (!target) target = { x: world.terminal.x, y: world.terminal.y, mark: true }; }
    if (world.stash && !world.stash.dead) { blip(world.stash.x, world.stash.y, blink ? "#7dffb0" : "#2a6a4a", 4); if (!target) target = { x: world.stash.x, y: world.stash.y, mark: true }; }
    if (world.siege && world.siege.left && world.phase !== "exfil" && !target) target = { x: world.siege.x, y: world.siege.y, mark: true };
    if (world.phase === "exfil") for (const p of world.exfilPoints || []) { blip(p.x, p.y, blink ? "#54f2ff" : "#1c6a74", 4); if (!target) target = { x: p.x, y: p.y, exfil: true }; }
    // the target off the edge: an arrow on the rim
    if (target && !opts.full) {
      const [px, py] = P(target.x, target.y);
      if (px < 6 || py < 6 || px > Wd - 6 || py > Ht - 6) {
        const a = Math.atan2(py - Ht / 2, px - Wd / 2);
        const rx = Wd / 2 - 9, ry = Ht / 2 - 9, f = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
        const ax = Wd / 2 + Math.cos(a) * f, ay = Ht / 2 + Math.sin(a) * f;
        c.save(); c.translate(ax, ay); c.rotate(a);
        c.fillStyle = target.exfil ? (blink ? "#54f2ff" : "#1c6a74") : target.mark ? (blink ? "#7dffb0" : "#2a6a4a") : blink ? "#ffb000" : "#a87400";
        c.beginPath(); c.moveTo(7, 0); c.lineTo(-4, -5); c.lineTo(-2, 0); c.lineTo(-4, 5); c.closePath(); c.fill();
        c.restore();
      }
    }
    // the view, as the ground it covers
    if (!opts.noView && this.vw) {
      const q = [[0, 0], [this.cssW, 0], [this.cssW, this.cssH], [0, this.cssH]].map(([x, y]) => P(...this.toWorld(world, x, y)));
      c.strokeStyle = "rgba(84,242,255,.45)"; c.lineWidth = 1;
      c.beginPath(); q.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.stroke();
    }
    // the frame
    c.strokeStyle = "rgba(84,242,255,.25)"; c.strokeRect(0.5, 0.5, Wd - 1, Ht - 1);
  }
  /* world -> scanner pixel, for the last scanner drawn */
  scanPoint(x, y) {
    const S = this.scan;
    return [S.Wd / 2 + ((x - S.cx) - (y - S.cy)) * S.k / Math.SQRT2, S.Ht / 2 + ((x - S.cx) + (y - S.cy)) * S.k / Math.SQRT2];
  }
  /* scanner pixel -> world, for the last scanner drawn */
  scanToWorld(mx, my) {
    const S = this.scan; if (!S) return [0, 0];
    const dx = (mx - S.Wd / 2) / S.k, dy = (my - S.Ht / 2) / S.k;
    return [S.cx + (dx + dy) / Math.SQRT2, S.cy + (dy - dx) / Math.SQRT2];
  }
};
