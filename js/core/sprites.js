/* Everything on screen is drawn here with canvas paths: buildings, props,
 * people, cars and portraits. No image files. Drawing is at the game's low
 * internal resolution; the screen scales it up with hard pixels. */
"use strict";

W.STYLES = {
  office:   { wall: "#27314a", roof: "#2e3850", trim: "#3a4766", win: ["#ffcf6b", "#ffe2a0", "#9fd8ff"], lit: 0.38, wins: 2, dark: "#0d1322" },
  glass:    { wall: "#112237", roof: "#1a2b44", trim: "#2a4a6e", win: ["#54f2ff", "#9ff7ff", "#4c8dff"], lit: 0.5, band: true, dark: "#0a1626" },
  brick:    { wall: "#3a2a2c", roof: "#3a3236", trim: "#4d3a3a", win: ["#ffb35c", "#ffd08a"], lit: 0.45, wins: 2, dark: "#150d10" },
  concrete: { wall: "#33373f", roof: "#3a3e48", trim: "#474c58", win: ["#ffdf9e", "#c8d4ff"], lit: 0.3, wins: 3, dark: "#12141a" },
  mall:     { wall: "#2b3550", roof: "#323d5a", trim: "#54f2ff", win: ["#7ff3ff", "#ffcf6b", "#ff8fd8"], lit: 0.6, wins: 2, store: true, dark: "#0e1528" },
  dept:     { wall: "#2f2640", roof: "#382e4a", trim: "#b47dff", win: ["#ff8fd8", "#b47dff", "#ffe2a0"], lit: 0.55, wins: 2, store: true, stripes: true, dark: "#120c1c" },
  tower:    { wall: "#1a1e2c", roof: "#232838", trim: "#ffb000", win: ["#ffcf6b", "#54f2ff"], lit: 0.25, wins: 3, dark: "#0a0c14", tall: true },
  kiosk:    { wall: "#3a4258", roof: "#47507a", trim: "#ffb000", win: ["#ffe2a0"], lit: 1, wins: 1, store: true, dark: "#141824" },
};

/* ---- building cells ----
 * One sprite per distinct look, cached. A cell knows its building's style and
 * height, which of its four sides are the building's edge (for the parapet),
 * a variant for its windows, and any facade sign passing over it. */
W.cellSprites = new Map();
W.cellSprite = (m, cx, cy) => {
  const k = m.i(cx, cy), b = m.buildings[m.bid[k]];
  const same = (x, y) => m.inb(x, y) && m.bid[m.i(x, y)] === b.id;
  const edges = (same(cx, cy - 1) ? 0 : 1) | (same(cx + 1, cy) ? 0 : 2) | (same(cx, cy + 1) ? 0 : 4) | (same(cx - 1, cy) ? 0 : 8);
  const variant = Math.floor(W.hash2(cx, cy, b.id) * 6);
  const signHere = (b.signs || []).some(s => s.face === "s" ? (cy === b.y + b.d - 1) : (cx === b.x + b.w - 1));
  const key = signHere ? `u${cx},${cy}` : `${b.style}|${b.floors}|${edges}|${variant}|${b.awning || ""}|${b.roofKit || ""}|${(edges & 15) === 0 ? W.hash2(cx, cy, 7) < 0.12 ? "ac" : "" : ""}`;
  let s = W.cellSprites.get(key);
  if (!s) { s = W.drawCell(m, b, cx, cy, edges, variant); W.cellSprites.set(key, s); }
  return s;
};

W.drawCell = (m, b, cx, cy, edges, variant) => {
  const st = W.STYLES[b.style] || W.STYLES.office;
  const ZH = W.ZH, hpx = b.floors * ZH, pad = 26;
  const H0 = pad + hpx, MX = 8;
  const cv = W.canvas(W.TW + MX * 2, H0 + W.TH + 4);
  const c = cv.getContext("2d");
  const P = (u, v, z) => [MX + W.HTW + (u - v) * W.HTW, H0 + (u + v) * W.HTH - z];
  const quad = (pts, fill) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = fill; c.fill(); };
  const rnd = W.rng((cx * 73856093) ^ (cy * 19349663) ^ (b.id * 83492791));

  // faces: +y (left, lit by the street) and +x (right, in shadow)
  const L = W.shade(st.wall, 1.0), R = W.shade(st.wall, 0.68);
  quad([P(0, 1, 0), P(1, 1, 0), P(1, 1, hpx), P(0, 1, hpx)], L);
  quad([P(1, 0, 0), P(1, 1, 0), P(1, 1, hpx), P(1, 0, hpx)], R);

  // windows, floor by floor
  const faceWin = (face, u0, u1, z0, z1, col) => {
    const pts = face === "s" ? [P(u0, 1, z0), P(u1, 1, z0), P(u1, 1, z1), P(u0, 1, z1)]
                             : [P(1, 1 - u0, z0), P(1, 1 - u1, z0), P(1, 1 - u1, z1), P(1, 1 - u0, z1)];
    quad(pts, col);
  };
  const winCol = (face, f) => {
    if (rnd() < st.lit) {
      const col = st.win[Math.floor(rnd() * st.win.length)];
      return face === "s" ? col : W.shade(col, 0.72);
    }
    return face === "s" ? st.dark : W.shade(st.dark, 0.8);
  };
  for (const face of ["s", "e"]) {
    for (let f = 0; f < b.floors; f++) {
      const z = f * ZH;
      if (f === 0 && st.store) {
        // shopfront: one long lit window, a door, and the awning above
        const lit = rnd() < 0.85;
        const col = lit ? (b.glow || st.win[variant % st.win.length]) : st.dark;
        faceWin(face, 0.08, 0.92, 2, ZH - 4, face === "s" ? W.shade(col, lit ? 0.85 : 1) : W.shade(col, lit ? 0.6 : 0.8));
        faceWin(face, 0.08, 0.92, ZH - 4, ZH - 3, W.shade(st.wall, 0.5));
        if (b.awning) {
          const aw = face === "s" ? [P(0, 1, ZH - 1), P(1, 1, ZH - 1), P(1, 1.28, ZH - 5), P(0, 1.28, ZH - 5)]
                                  : [P(1, 0, ZH - 1), P(1, 1, ZH - 1), P(1.28, 1, ZH - 5), P(1.28, 0, ZH - 5)];
          quad(aw, face === "s" ? b.awning : W.shade(b.awning, 0.75));
          // stripes
          for (let s = 0; s < 4; s++) {
            const u0 = s / 4 + 0.03, u1 = s / 4 + 0.13;
            const st2 = face === "s" ? [P(u0, 1, ZH - 1), P(u1, 1, ZH - 1), P(u1, 1.28, ZH - 5), P(u0, 1.28, ZH - 5)]
                                     : [P(1, u0, ZH - 1), P(1, u1, ZH - 1), P(1.28, u1, ZH - 5), P(1.28, u0, ZH - 5)];
            quad(st2, "rgba(255,255,255,.18)");
          }
        }
        continue;
      }
      if (st.band) {
        // glass towers: a lit band per floor, broken here and there
        const on = rnd() < st.lit;
        faceWin(face, 0, 1, z + 4, z + ZH - 3, on ? (face === "s" ? W.rgba(st.win[f % st.win.length], 0.55) : W.rgba(st.win[f % st.win.length], 0.32)) : (face === "s" ? st.dark : W.shade(st.dark, .8)));
        continue;
      }
      const n = st.wins || 2;
      for (let w = 0; w < n; w++) {
        const u0 = (w + 0.22) / n, u1 = (w + 0.78) / n;
        faceWin(face, u0, u1, z + 4, z + ZH - 3, winCol(face, f));
      }
    }
    if (st.stripes) {
      // neon pilasters at the cell edges
      const col = st.trim;
      if (face === "s") quad([P(0, 1, ZH), P(0.05, 1, ZH), P(0.05, 1, hpx), P(0, 1, hpx)], W.rgba(col, 0.8));
      else quad([P(1, 0.95, ZH), P(1, 1, ZH), P(1, 1, hpx), P(1, 0.95, hpx)], W.rgba(col, 0.5));
    }
  }
  // a faint seam where one cell's wall meets the next
  c.fillStyle = "rgba(0,0,0,.18)";
  c.fillRect(P(0, 1, 0)[0], P(0, 1, hpx)[1], 1, hpx);

  // facade signs that pass over this cell
  for (const s of b.signs || []) {
    const onS = s.face === "s" && cy === b.y + b.d - 1, onE = s.face === "e" && cx === b.x + b.w - 1;
    if (!onS && !onE) continue;
    c.save();
    c.beginPath();
    if (onS) { const p = [P(0, 1, 0), P(1, 1, 0), P(1, 1, hpx + 4), P(0, 1, hpx + 4)]; p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); }
    else { const p = [P(1, 0, 0), P(1, 1, 0), P(1, 1, hpx + 4), P(1, 0, hpx + 4)]; p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); }
    c.closePath(); c.clip();
    if (onS) c.setTransform(1, 0.5, 0, 1, MX - (cx - b.x) * W.HTW, H0 + W.HTH - (cx - b.x) * W.HTH);
    else { const k = b.y + b.d - cy; c.setTransform(1, -0.5, 0, 1, MX + W.HTW * (2 - k), H0 + W.HTH + W.HTH * k); }
    c.font = `bold ${s.size || 9}px ui-monospace,Menlo,Consolas,monospace`;
    c.textBaseline = "middle";
    c.fillStyle = "rgba(5,7,15,.75)";
    const tw = c.measureText(s.text).width;
    const px = s.at * W.HTW, pz = s.z;
    c.fillRect(px - 2, -pz - 6, tw + 4, 12);
    c.shadowColor = s.color; c.shadowBlur = 4;
    c.fillStyle = s.color;
    c.fillText(s.text, px, -pz);
    c.restore();
  }

  // the roof, with a parapet on the building's edges
  const roof = st.roof;
  quad([P(0, 0, hpx), P(1, 0, hpx), P(1, 1, hpx), P(0, 1, hpx)], roof);
  const lip = 0.12, par = W.shade(roof, 1.35);
  if (edges & 1) quad([P(0, 0, hpx + 2), P(1, 0, hpx + 2), P(1, lip, hpx + 2), P(0, lip, hpx + 2)], par);
  if (edges & 8) quad([P(0, 0, hpx + 2), P(lip, 0, hpx + 2), P(lip, 1, hpx + 2), P(0, 1, hpx + 2)], par);
  if (edges & 2) { quad([P(1 - lip, 0, hpx + 2), P(1, 0, hpx + 2), P(1, 1, hpx + 2), P(1 - lip, 1, hpx + 2)], W.shade(par, 0.85)); quad([P(1, 0, hpx), P(1, 1, hpx), P(1, 1, hpx + 2), P(1, 0, hpx + 2)], R); }
  if (edges & 4) { quad([P(0, 1 - lip, hpx + 2), P(1, 1 - lip, hpx + 2), P(1, 1, hpx + 2), P(0, 1, hpx + 2)], par); quad([P(0, 1, hpx), P(1, 1, hpx), P(1, 1, hpx + 2), P(0, 1, hpx + 2)], L); }
  // a trim line along the top of the walls
  c.strokeStyle = W.rgba(st.trim, st.tall ? 0.9 : 0.55); c.lineWidth = 1;
  c.beginPath();
  if (edges & 4) { const a = P(0, 1, hpx), z = P(1, 1, hpx); c.moveTo(a[0], a[1] + 0.5); c.lineTo(z[0], z[1] + 0.5); }
  if (edges & 2) { const a = P(1, 0, hpx), z = P(1, 1, hpx); c.moveTo(a[0], a[1] + 0.5); c.lineTo(z[0], z[1] + 0.5); }
  c.stroke();

  // roof kit: AC units and vents on the inside of big roofs, a beacon on towers
  if ((edges & 15) === 0 && W.hash2(cx, cy, 7) < 0.12) {
    W.boxLocal(c, P, 0.3, 0.3, 0.7, 0.62, hpx, hpx + 6, "#5a6278", "#454c60", "#363c4c");
  }
  if (b.roofKit === "beacon" && cx === b.x + (b.w >> 1) && cy === b.y + (b.d >> 1)) {
    const [x, y] = P(0.5, 0.5, hpx);
    c.fillStyle = "#3b4256"; c.fillRect(x - 0.5, y - 16, 1, 16);
  }
  return { cv, ox: W.HTW + MX, oy: H0 };
};

/* A box inside a local projector P(u, v, z): top and both visible sides. */
W.boxLocal = (c, P, u0, v0, u1, v1, z0, z1, top, left, right) => {
  const q = (pts, f) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = f; c.fill(); };
  q([P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)], left);
  q([P(u1, v0, z0), P(u1, v1, z0), P(u1, v1, z1), P(u1, v0, z1)], right);
  q([P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], top);
};
/* The same in world space, for the live frame: (ox, oy) is where world (0,0)
 * lands on the screen. */
W.box = (c, ox, oy, x0, y0, x1, y1, z0, z1, top, left, right) => {
  const P = (u, v, z) => [ox + (u - v) * W.HTW, oy + (u + v) * W.HTH - z];
  W.boxLocal(c, P, x0, y0, x1, y1, z0, z1, top, left, right);
};

/* ---- props ----
 * Drawn live each frame (they are few, and some flicker). (sx, sy) is the
 * screen point of the prop's ground position. */
W.drawProp = (c, p, sx, sy, t) => {
  const P = (u, v, z) => [sx + (u - v) * W.HTW, sy + (u + v) * W.HTH - z];
  switch (p.type) {
    case "lamp": {
      c.fillStyle = "#151a26"; c.fillRect(sx - 1, sy - 30, 2, 30);
      c.fillRect(sx - 1, sy - 30, 6, 2);
      c.fillStyle = "#ffe2a0"; c.fillRect(sx + 3, sy - 29, 3, 2);
      break;
    }
    case "tree": {
      c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(sx, sy, 9, 4.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#2a1f1a"; c.fillRect(sx - 1, sy - 12, 3, 12);
      const g = ["#0f2a22", "#14382c", "#1b4a38"];
      [[0, -16, 9], [-4, -20, 6], [4, -21, 6], [0, -25, 5]].forEach(([dx, dy, r], i) => {
        c.fillStyle = g[Math.min(2, i)]; c.beginPath(); c.arc(sx + dx, sy + dy, r, 0, Math.PI * 2); c.fill();
      });
      c.fillStyle = "rgba(84,242,255,.12)"; c.beginPath(); c.arc(sx - 3, sy - 24, 3, 0, Math.PI * 2); c.fill();
      break;
    }
    case "bench":
      W.box(c, sx, sy, -0.4, -0.15, 0.4, 0.15, 3, 5, "#5a4a3a", "#4a3c30", "#3a2f26");
      c.fillStyle = "#2a2a30"; c.fillRect(sx - 6, sy - 1, 1, 3); c.fillRect(sx + 5, sy - 1, 1, 3);
      break;
    case "planter":
      W.box(c, sx, sy, -0.42, -0.42, 0.42, 0.42, 0, 5, "#3c4456", "#30374a", "#252b3a");
      c.fillStyle = "#1b4a38"; c.beginPath(); c.ellipse(sx, sy - 7, 9, 4, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#256a4e"; c.beginPath(); c.ellipse(sx - 2, sy - 9, 5, 2.5, 0, 0, Math.PI * 2); c.fill();
      break;
    case "kiosk": {
      const col = p.color || "#ffb000";
      W.box(c, sx, sy, -0.42, -0.42, 0.42, 0.42, 0, 14, "#47507a", "#3a4258", "#2b3144");
      // lit counter on the two faces we see
      const q = (pts, f) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = f; c.fill(); };
      q([P(-0.36, 0.42, 6), P(0.36, 0.42, 6), P(0.36, 0.42, 12), P(-0.36, 0.42, 12)], W.rgba(col, 0.85));
      q([P(0.42, -0.36, 6), P(0.42, 0.36, 6), P(0.42, 0.36, 12), P(0.42, -0.36, 12)], W.rgba(col, 0.55));
      // striped roof
      W.box(c, sx, sy, -0.55, -0.55, 0.55, 0.55, 14, 17, W.shade(col, 0.9), W.shade(col, 0.7), W.shade(col, 0.5));
      c.fillStyle = "rgba(255,255,255,.25)";
      for (let i = 0; i < 3; i++) { const a = P(-0.55 + i * 0.4, -0.55, 17), b = P(-0.55 + i * 0.4 + 0.15, -0.55, 17), d = P(-0.55 + i * 0.4 + 0.15, 0.55, 17), e = P(-0.55 + i * 0.4, 0.55, 17); q([a, b, d, e], "rgba(255,255,255,.22)"); }
      break;
    }
    case "vend": {
      const col = p.color || "#54f2ff";
      W.box(c, sx, sy, -0.3, -0.25, 0.3, 0.25, 0, 18, "#3a4258", "#2b3144", "#20263a");
      const q = (pts, f) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = f; c.fill(); };
      q([P(-0.24, 0.25, 4), P(0.2, 0.25, 4), P(0.2, 0.25, 16), P(-0.24, 0.25, 16)], W.rgba(col, 0.8));
      break;
    }
    case "bin":
      W.box(c, sx, sy, -0.18, -0.18, 0.18, 0.18, 0, 7, "#3a4256", "#2c3344", "#222838");
      break;
    case "table":
      c.fillStyle = "#2a2a30"; c.fillRect(sx, sy - 6, 1, 6);
      c.fillStyle = "#5c6680"; c.beginPath(); c.ellipse(sx, sy - 6, 6, 3, 0, 0, Math.PI * 2); c.fill();
      if (p.umbrella) {
        c.fillStyle = "#2a2a30"; c.fillRect(sx, sy - 18, 1, 12);
        c.fillStyle = p.umbrella; c.beginPath(); c.moveTo(sx - 10, sy - 15); c.lineTo(sx, sy - 21); c.lineTo(sx + 11, sy - 15); c.closePath(); c.fill();
        c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.moveTo(sx, sy - 21); c.lineTo(sx + 11, sy - 15); c.lineTo(sx, sy - 15); c.closePath(); c.fill();
      }
      break;
    case "bollard":
      c.fillStyle = "#4a5266"; c.fillRect(sx - 1, sy - 6, 3, 6); c.fillStyle = "#ffb000"; c.fillRect(sx - 1, sy - 5, 3, 1);
      break;
    case "hydrant":
      c.fillStyle = "#a8323e"; c.fillRect(sx - 2, sy - 6, 4, 6); c.fillRect(sx - 3, sy - 4, 6, 2);
      break;
    case "signal": {
      // a traffic light for one axis: red or green from the world's phase
      const go = W.lightPhase ? W.lightPhase[p.axis] : true;
      c.fillStyle = "#151a26"; c.fillRect(sx, sy - 22, 1, 22);
      c.fillStyle = "#0a0c14"; c.fillRect(sx - 2, sy - 30, 5, 9);
      c.fillStyle = go ? "#3a1015" : "#ff3048"; c.fillRect(sx - 1, sy - 29, 3, 3);
      c.fillStyle = go ? "#4ade6a" : "#0f2a14"; c.fillRect(sx - 1, sy - 25, 3, 3);
      break;
    }
    case "crate":
      W.box(c, sx, sy, -0.4, -0.4, 0.4, 0.4, 0, 10, "#6a5a3a", "#55482e", "#433924");
      break;
    case "spout": {
      // the fountain's jet: a column of falling droplets, live
      c.fillStyle = "#3c4456"; c.fillRect(sx - 2, sy - 6, 5, 6);
      for (let i = 0; i < 14; i++) {
        const ph = ((t * 0.9 + i / 14) % 1);
        const ang = i * 2.39996;
        const r = ph * 10, h = 24 * (1 - (2 * ph - 1) ** 2) + 4;
        c.fillStyle = `rgba(160,235,255,${0.75 - ph * 0.5})`;
        c.fillRect(sx + Math.cos(ang) * r, sy - h + Math.sin(ang) * r * 0.5, 1.5, 2);
      }
      c.fillStyle = "rgba(160,235,255,.5)"; c.fillRect(sx, sy - 28, 1, 22);
      break;
    }
    case "blade": {
      // a vertical neon sign: a dark panel, glowing letters, now and then a flicker
      const col = p.color || "#ff5266";
      const z0 = p.z || 18, letters = (p.text || "BAR").split("");
      const hgt = letters.length * 8 + 4;
      const flick = W.hash2(Math.floor(t * 8), p.id) < 0.03;
      c.fillStyle = "#0a0c14"; c.fillRect(sx - 4, sy - z0 - hgt, 9, hgt);
      c.strokeStyle = flick ? W.rgba(col, 0.2) : col; c.lineWidth = 1;
      c.strokeRect(sx - 3.5, sy - z0 - hgt + 0.5, 8, hgt - 1);
      c.font = "bold 7px ui-monospace,Menlo,Consolas,monospace"; c.textAlign = "center"; c.textBaseline = "top";
      c.fillStyle = flick ? W.rgba(col, 0.25) : col;
      letters.forEach((ch, i) => c.fillText(ch, sx + 0.5, sy - z0 - hgt + 3 + i * 8));
      c.textAlign = "start";
      break;
    }
    case "billboard": {
      const col = p.color || "#54f2ff";
      c.fillStyle = "#1a1e2a"; c.fillRect(sx - 1, sy - 34, 2, 34);
      c.fillStyle = "#0a0c14"; c.fillRect(sx - 18, sy - 52, 36, 20);
      c.strokeStyle = col; c.strokeRect(sx - 17.5, sy - 51.5, 35, 19);
      c.font = "bold 7px ui-monospace,Menlo,Consolas,monospace"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = col;
      (p.text || "").split("\n").forEach((l, i, a) => c.fillText(l, sx, sy - 42 + (i - (a.length - 1) / 2) * 8));
      c.textAlign = "start";
      break;
    }
  }
};

/* ---- people ----
 * Cat-folk in coats. (sx, sy) is the point between the feet. Looks come from
 * the unit's `look`: coat, trim, fur, legs, hat, visor. */
W.drawUnit = (c, u, sx, sy, t) => {
  const L = u.look;
  sx = Math.round(sx); sy = Math.round(sy);
  if (!u.alive) return W.drawCorpse(c, u, sx, sy);
  // which way the body faces on screen
  const dx = Math.cos(u.dir), dy = Math.sin(u.dir);
  const scx = dx - dy, scy = (dx + dy) * 0.5;
  const right = scx >= 0, toward = scy > -0.05;
  const s = right ? 1 : -1;
  const moving = u.moving;
  const ph = moving ? Math.sin(u.anim) : 0;

  // shadow
  c.fillStyle = "rgba(0,0,0,.4)"; c.beginPath(); c.ellipse(sx, sy, 5, 2.5, 0, 0, Math.PI * 2); c.fill();

  const drawArm = () => {
    if (u.weaponOut) {
      // arm and gun out toward the facing direction
      const ax = sx + s * 2, ay = sy - 13;
      const ex = ax + scx * 5, ey = ay + scy * 5 + 1;
      c.strokeStyle = L.coat; c.lineWidth = 2; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = "#0a0a0e"; c.lineWidth = 2; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + scx * 3.5, ey + scy * 3.5); c.stroke();
      if (u.flash > 0) { c.fillStyle = "#fff4c2"; c.beginPath(); c.arc(ex + scx * 5, ey + scy * 5, 2.2, 0, Math.PI * 2); c.fill(); }
    } else {
      c.fillStyle = W.shade(L.coat, 0.8); c.fillRect(sx + s * 3 - (s < 0 ? 1 : 0), sy - 13 + Math.round(ph), 2, 6);
    }
  };

  // legs
  c.fillStyle = L.legs;
  c.fillRect(sx - 3, sy - 6 + Math.max(0, Math.round(ph * 1.5)), 2, 6 - Math.max(0, Math.round(ph * 1.5)));
  c.fillRect(sx + 1, sy - 6 + Math.max(0, Math.round(-ph * 1.5)), 2, 6 - Math.max(0, Math.round(-ph * 1.5)));
  // tail, behind when facing us
  if (toward) { c.strokeStyle = L.fur; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx - s * 2, sy - 7); c.quadraticCurveTo(sx - s * 7, sy - 8 + ph, sx - s * 6, sy - 13); c.stroke(); }

  if (!toward) drawArm();
  // coat: a trapezoid, longer for agents
  const hem = L.long ? -4 : -6;
  c.fillStyle = L.coat;
  c.beginPath(); c.moveTo(sx - 4, sy - 15); c.lineTo(sx + 4, sy - 15); c.lineTo(sx + 4.5 + (L.long ? 0.5 : 0), sy + hem); c.lineTo(sx - 4.5 - (L.long ? 0.5 : 0), sy + hem); c.closePath(); c.fill();
  // lapel / trim line down the front
  c.fillStyle = L.trim; c.fillRect(sx + (toward ? 0 : s * 2), sy - 15, 1, 15 + hem);
  // shoulders
  c.fillStyle = W.shade(L.coat, 1.2); c.fillRect(sx - 4, sy - 15, 8, 1);
  if (toward) drawArm();
  if (!toward) { c.strokeStyle = L.fur; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx - s * 2, sy - 7); c.quadraticCurveTo(sx - s * 7, sy - 8 + ph, sx - s * 6, sy - 13); c.stroke(); }

  // head and ears
  const hy = sy - 18;
  c.fillStyle = L.fur;
  c.beginPath(); c.arc(sx, hy, 3.2, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(sx - 3.2, hy - 1); c.lineTo(sx - 2.6, hy - 5.5); c.lineTo(sx - 0.6, hy - 2.6); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(sx + 3.2, hy - 1); c.lineTo(sx + 2.6, hy - 5.5); c.lineTo(sx + 0.6, hy - 2.6); c.closePath(); c.fill();
  if (L.patch) { c.fillStyle = L.patch; c.beginPath(); c.arc(sx - s * 1.3, hy - 1, 1.8, 0, Math.PI * 2); c.fill(); }
  if (L.hat) {
    c.fillStyle = L.hat;
    if (L.hatKind === "cap") { c.fillRect(sx - 3, hy - 4, 6, 2); c.fillRect(sx + (s > 0 ? 0 : -5), hy - 2.5, 5, 1); }
    else { c.fillRect(sx - 4, hy - 3, 8, 1); c.fillRect(sx - 2.5, hy - 6, 5, 3); }
  }
  // eyes or visor, only when facing us
  if (toward) {
    if (L.visor) { c.fillStyle = L.visor; c.fillRect(sx - 2 + s, hy - 1, 4, 1); }
    else { c.fillStyle = L.eyes || "#e8f070"; c.fillRect(sx - 2 + s, hy - 1, 1, 1); c.fillRect(sx + 1 + s, hy - 1, 1, 1); }
  }
  // a little glyph over followers
  if (u.follower && !u.isAgent) { c.fillStyle = "#54f2ff"; c.fillRect(sx - 1, hy - 9, 2, 2); }
};

W.drawCorpse = (c, u, sx, sy) => {
  const L = u.look;
  if (!u.pool) u.pool = { r: 0, rx: W.rand(-2, 2) };
  u.pool.r = Math.min(7, u.pool.r + 0.05);
  c.fillStyle = u.isAgent ? "rgba(20,60,70,.85)" : "rgba(95,10,22,.85)";
  c.beginPath(); c.ellipse(sx + u.pool.rx, sy, u.pool.r + 2, (u.pool.r + 2) * 0.5, 0, 0, Math.PI * 2); c.fill();
  const s = u.deadSide || 1;
  c.fillStyle = L.coat; c.fillRect(sx - 6 * s - (s < 0 ? 0 : 0), sy - 3, 10, 4);
  c.fillStyle = L.legs; c.fillRect(sx + (s > 0 ? 4 : -8), sy - 2, 4, 2);
  c.fillStyle = L.fur; c.beginPath(); c.arc(sx - 7 * s, sy - 2, 2.6, 0, Math.PI * 2); c.fill();
};

/* ---- cars ----
 * Axis-aligned along their lane. (ox, oy): screen point of world (0, 0). */
W.drawCar = (c, car, ox, oy) => {
  const half = car.len / 2, hw = car.wid / 2;
  const ax = car.axis === "x";
  const x0 = car.x - (ax ? half : hw), x1 = car.x + (ax ? half : hw);
  const y0 = car.y - (ax ? hw : half), y1 = car.y + (ax ? hw : half);
  const P = (u, v, z) => [ox + (u - v) * W.HTW, oy + (u + v) * W.HTH - z];
  if (car.dead) {
    W.box(c, ox, oy, x0, y0, x1, y1, 0, 5, "#141414", "#1c1a18", "#100f0e");
    return;
  }
  // shadow
  c.fillStyle = "rgba(0,0,0,.45)";
  const sh = [P(x0 - 0.1, y0 - 0.1, 0), P(x1 + 0.1, y0 - 0.1, 0), P(x1 + 0.1, y1 + 0.1, 0), P(x0 - 0.1, y1 + 0.1, 0)];
  c.beginPath(); sh.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill();
  const col = car.color;
  W.box(c, ox, oy, x0, y0, x1, y1, 1, 6, W.shade(col, 1.15), col, W.shade(col, 0.7));
  // cabin, set toward the back
  const f = car.dir, cut = car.len * 0.22;
  let cx0 = x0, cx1 = x1, cy0 = y0, cy1 = y1;
  if (ax) { if (f > 0) { cx0 = x0 + cut * 0.6; cx1 = x1 - cut * 1.6; } else { cx0 = x0 + cut * 1.6; cx1 = x1 - cut * 0.6; } cy0 += 0.08; cy1 -= 0.08; }
  else { if (f > 0) { cy0 = y0 + cut * 0.6; cy1 = y1 - cut * 1.6; } else { cy0 = y0 + cut * 1.6; cy1 = y1 - cut * 0.6; } cx0 += 0.08; cx1 -= 0.08; }
  W.box(c, ox, oy, cx0, cy0, cx1, cy1, 6, 10, W.shade(col, 0.95), "#1d3346", "#122232");
  if (car.taxi) W.box(c, ox, oy, (cx0 + cx1) / 2 - 0.12, (cy0 + cy1) / 2 - 0.12, (cx0 + cx1) / 2 + 0.12, (cy0 + cy1) / 2 + 0.12, 10, 12, "#ffe08a", "#d9b85a", "#b8973c");
  // lights: front white-yellow, back red
  const fx = ax ? (f > 0 ? x1 : x0) : null, fy = ax ? null : (f > 0 ? y1 : y0);
  const bx = ax ? (f > 0 ? x0 : x1) : null, by = ax ? null : (f > 0 ? y0 : y1);
  const dot = (x, y, col) => { const [px, py] = P(x, y, 3.5); c.fillStyle = col; c.fillRect(px - 1, py - 1, 2, 2); };
  if (ax) { dot(fx, y0 + 0.12, "#fff3c4"); dot(fx, y1 - 0.12, "#fff3c4"); dot(bx, y0 + 0.12, "#ff3048"); dot(bx, y1 - 0.12, "#ff3048"); }
  else { dot(x0 + 0.12, fy, "#fff3c4"); dot(x1 - 0.12, fy, "#fff3c4"); dot(x0 + 0.12, by, "#ff3048"); dot(x1 - 0.12, by, "#ff3048"); }
};

/* ---- portraits for the HUD ---- */
W.drawPortrait = (c, look, w, h, dead) => {
  c.clearRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0d1424"); g.addColorStop(1, "#05070f");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.save();
  c.translate(w / 2, h * 0.58);
  const k = w / 48;
  c.scale(k, k);
  // coat collar
  c.fillStyle = look.coat;
  c.beginPath(); c.moveTo(-22, 26); c.lineTo(-14, 6); c.lineTo(0, 12); c.lineTo(14, 6); c.lineTo(22, 26); c.closePath(); c.fill();
  c.fillStyle = W.shade(look.coat, 1.4);
  c.beginPath(); c.moveTo(-14, 6); c.lineTo(-6, 22); c.lineTo(0, 12); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(14, 6); c.lineTo(6, 22); c.lineTo(0, 12); c.closePath(); c.fill();
  // head
  c.fillStyle = look.fur;
  c.beginPath(); c.ellipse(0, -4, 13, 12, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(-12, -9); c.lineTo(-11, -25); c.lineTo(-2, -15); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(12, -9); c.lineTo(11, -25); c.lineTo(2, -15); c.closePath(); c.fill();
  c.fillStyle = W.shade(look.fur, 0.6);
  c.beginPath(); c.moveTo(-10, -11); c.lineTo(-10, -20); c.lineTo(-5, -14); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(10, -11); c.lineTo(10, -20); c.lineTo(5, -14); c.closePath(); c.fill();
  if (look.patch) { c.fillStyle = look.patch; c.beginPath(); c.ellipse(-6, -8, 6, 5, 0.4, 0, Math.PI * 2); c.fill(); }
  // muzzle
  c.fillStyle = W.shade(look.fur, 1.25); c.beginPath(); c.ellipse(0, 2, 6, 4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#2a1a1e"; c.fillRect(-1, 0, 2, 2);
  // visor
  c.fillStyle = "#0a0c14"; c.fillRect(-12, -8, 24, 5);
  c.fillStyle = look.visor || "#54f2ff"; c.fillRect(-11, -7, 22, 2);
  c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(-9, -7, 4, 1);
  // whiskers
  c.strokeStyle = "rgba(220,230,255,.5)"; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(-5, 2); c.lineTo(-16, 0); c.moveTo(-5, 3); c.lineTo(-16, 4); c.moveTo(5, 2); c.lineTo(16, 0); c.moveTo(5, 3); c.lineTo(16, 4); c.stroke();
  c.restore();
  if (dead) {
    c.fillStyle = "rgba(5,7,15,.7)"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#ff5266"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(6, 6); c.lineTo(w - 6, h - 6); c.moveTo(w - 6, 6); c.lineTo(6, h - 6); c.stroke();
  }
  // scanlines, for the Syndicate monitor feel
  c.fillStyle = "rgba(0,0,0,.18)";
  for (let y = 0; y < h; y += 2) c.fillRect(0, y, w, 1);
};
