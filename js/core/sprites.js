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
  // the districts' own: each draws itself with a painter below
  crop:      { wall: "#1d4a2a", roof: "#235a30", trim: "#3a7d45", scan: "#1f5a2a", paint: "crop" },
  container: { wall: "#7a3a2a", roof: "#8a4a3a", trim: "#000000", scan: "#5a4a3a", paint: "container" },
  metal:     { wall: "#3a4150", roof: "#454c5c", trim: "#ffb000", scan: "#3e4554", paint: "metal" },
  hull:      { wall: "#4a5262", roof: "#566070", trim: "#54f2ff", scan: "#56607a", paint: "metal", ports: true },
  hall:      { wall: "#173048", roof: "#3d4352", trim: "#54f2ff", scan: "#2f4a66", paint: "hall" },
  greenhouse:{ wall: "#123824", roof: "#7fb8a0", trim: "#9fd8c0", scan: "#2f5a44", paint: "greenhouse" },
  barn:      { wall: "#6a2424", roof: "#2a2a30", trim: "#e8e4dc", scan: "#5a2a2a", paint: "barn" },
  arena:     { wall: "#3a3f4c", roof: "#2e3340", trim: "#54f2ff", scan: "#3e4452", paint: "arena" },
  parkade:   { wall: "#4a4e58", roof: "#3e424c", trim: "#ffb000", scan: "#3e424c", paint: "parkade" },
  hedge:     { wall: "#1d4a2a", roof: "#235a30", trim: "#3a7d45", scan: "#1f4a2a", paint: "crop", plain: true },
  house:     { wall: "#6a6458", roof: "#3a2e2a", trim: "#e8e4dc", scan: "#5a4a40", paint: "house" },
  church:    { wall: "#4a4a52", roof: "#2a2a34", trim: "#ffcf6b", win: ["#ffb35c", "#ff8fd8", "#7ff3ff"], lit: 0.7, wins: 1, dark: "#15121c" },
  canopy:    { wall: "#3a4458", roof: "#3a4458", trim: "#9fd8ff", scan: "#2a3448" },
  interior:  { wall: "#3a3f4e", roof: "#3a3f4e", trim: "#5a6070", win: ["#3a3f4e"], lit: 0, wins: 0, dark: "#3a3f4e", scan: "#3a3f4e" },
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
  const H = W.signHost(m, b);
  const signHere = (H.signs || []).some(s => s.face === "s" ? (cy === H.y + H.d - 1) : (cx === H.x + H.w - 1));
  // some looks depend on where in the building the cell is: a house's roof slope, a barn's door
  const st0 = W.STYLES[b.style];
  const where = st0 && (st0.paint === "house" || st0.paint === "barn") ? `|${cx - b.x},${cy - b.y},${b.w},${b.d},${b.roofColor || ""},${b.garage ? "g" : ""},${b.door ?? ""}` : "";
  const key = signHere ? `u${cx},${cy}` : `${b.style}|${b.floors}|${edges}|${variant}|${b.awning || ""}|${b.color || ""}|${b.door || ""}${where}|${b.roofKit || ""}|${(edges & 15) === 0 ? W.hash2(cx, cy, 7) < 0.12 ? "ac" : "" : ""}`;
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
  if (st.paint) {
    W.PAINTERS[st.paint]({ c, P, quad, b, st, cx, cy, edges, variant, hpx, rnd, ZH });
    W.drawSigns(c, W.signHost(m, b), cx, cy, H0, MX, hpx, P);
    return { cv, ox: W.HTW + MX, oy: H0 };
  }

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

  W.drawSigns(c, W.signHost(m, b), cx, cy, H0, MX, hpx, P);

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

/* ---- painters for the districts' special buildings ----
 * Each gets the cell's projector P(u, v, z) (u along x, v along y, both 0..1
 * across the cell; z up in pixels) and draws both visible faces and the roof. */
W.PAINTERS = (() => {
  const faces = (o, colS, colE) => {
    const { quad, P, hpx } = o;
    quad([P(0, 1, 0), P(1, 1, 0), P(1, 1, hpx), P(0, 1, hpx)], colS);
    quad([P(1, 0, 0), P(1, 1, 0), P(1, 1, hpx), P(1, 0, hpx)], colE);
  };
  // a quad on a face: face "s" is the +y face (u runs along it), "e" the +x face
  const onFace = (o, face, u0, u1, z0, z1, col) => {
    const { quad, P } = o;
    quad(face === "s" ? [P(u0, 1, z0), P(u1, 1, z0), P(u1, 1, z1), P(u0, 1, z1)] : [P(1, 1 - u0, z0), P(1, 1 - u1, z0), P(1, 1 - u1, z1), P(1, 1 - u0, z1)], col);
  };
  const roof = (o, col, lipCol) => {
    const { quad, P, hpx, edges } = o;
    quad([P(0, 0, hpx), P(1, 0, hpx), P(1, 1, hpx), P(0, 1, hpx)], col);
    if (lipCol) {
      const lip = 0.1;
      if (edges & 1) quad([P(0, 0, hpx + 1), P(1, 0, hpx + 1), P(1, lip, hpx + 1), P(0, lip, hpx + 1)], lipCol);
      if (edges & 8) quad([P(0, 0, hpx + 1), P(lip, 0, hpx + 1), P(lip, 1, hpx + 1), P(0, 1, hpx + 1)], lipCol);
      if (edges & 2) quad([P(1 - lip, 0, hpx + 1), P(1, 0, hpx + 1), P(1, 1, hpx + 1), P(1 - lip, 1, hpx + 1)], lipCol);
      if (edges & 4) quad([P(0, 1 - lip, hpx + 1), P(1, 1 - lip, hpx + 1), P(1, 1, hpx + 1), P(0, 1, hpx + 1)], lipCol);
    }
  };
  const speck = (o, face, n, cols, size = 1.5) => {
    const { c, P, hpx, rnd } = o;
    for (let i = 0; i < n; i++) {
      const u = rnd(), z = rnd() * hpx;
      const [x, y] = face === "s" ? P(u, 1, z) : P(1, 1 - u, z);
      c.fillStyle = cols[Math.floor(rnd() * cols.length)];
      c.fillRect(x, y, size, size);
    }
  };
  return {
    /* catnip: a hedge of leaves, with lavender-white flowers on top */
    crop(o) {
      const { c, P, hpx, rnd } = o;
      faces(o, "#1f4d2c", "#163a21");
      speck(o, "s", 26, ["#2a6a3a", "#14361f", "#357a44"], 2);
      speck(o, "e", 20, ["#1f5530", "#0f2a17", "#28603a"], 2);
      roof(o, "#245c32");
      for (let i = 0; i < 9; i++) {
        const [x, y] = P(rnd(), rnd(), hpx + 1);
        c.fillStyle = ["#2f7040", "#3a8a4c", "#1c4a28"][i % 3];
        c.beginPath(); c.ellipse(x, y, 3 + rnd() * 2, 1.6 + rnd(), 0, 0, Math.PI * 2); c.fill();
      }
      if (!o.st.plain) for (let i = 0; i < 4; i++) { const [x, y] = P(rnd(), rnd(), hpx + 2); c.fillStyle = rnd() < 0.5 ? "#d8c8ff" : "#f2eefa"; c.fillRect(x, y, 1, 1); }
    },
    /* a shipping container stack: ribbed steel, a band between boxes */
    container(o) {
      const { c, P, hpx, b, ZH } = o;
      const col = b.color || "#7a3a2a";
      faces(o, col, W.shade(col, 0.68));
      c.strokeStyle = "rgba(0,0,0,.28)"; c.lineWidth = 1;
      c.beginPath();
      for (let i = 1; i < 8; i++) { const u = i / 8; let a = P(u, 1, 1), z = P(u, 1, hpx - 1); c.moveTo(a[0], a[1]); c.lineTo(z[0], z[1]); a = P(1, 1 - u, 1); z = P(1, 1 - u, hpx - 1); c.moveTo(a[0], a[1]); c.lineTo(z[0], z[1]); }
      c.stroke();
      for (let f = 1; f < b.floors; f++) { onFace(o, "s", 0, 1, f * ZH - 1, f * ZH + 1, "rgba(0,0,0,.45)"); onFace(o, "e", 0, 1, f * ZH - 1, f * ZH + 1, "rgba(0,0,0,.45)"); }
      roof(o, W.shade(col, 1.15), W.shade(col, 0.8));
      if (b.label && o.cx === b.x && o.cy === b.y + b.d - 1) {
        onFace(o, "s", 0.1, 0.9, hpx - 7, hpx - 3, "rgba(255,255,255,.25)");
      }
    },
    /* hangars, tanks, the ship: steel plate, rivets, a door, portholes */
    metal(o) {
      const { c, P, hpx, b, st, rnd, ZH, cy, cx } = o;
      faces(o, st.wall, W.shade(st.wall, 0.68));
      c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1; c.beginPath();
      for (let z = 7; z < hpx; z += 7) { let a = P(0, 1, z), e = P(1, 1, z); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); a = P(1, 0, z); e = P(1, 1, z); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); }
      c.stroke();
      speck(o, "s", 6, ["rgba(255,255,255,.18)"], 1);
      // a hangar door on the face that has one: dark, with a hazard band at its foot
      const dz = Math.min(hpx - 5, ZH * 3);
      if (b.door === "s" && cy === b.y + b.d - 1 && cx > b.x && cx < b.x + b.w - 1) {
        onFace(o, "s", 0, 1, 0, dz, "#14171d");
        for (let i = 0; i < 4; i++) onFace(o, "s", i / 4, i / 4 + 0.125, 0, 2, "#ffb000");
        onFace(o, "s", 0, 1, dz - 1, dz, "#ffb000");
      }
      if (b.door === "e" && cx === b.x + b.w - 1 && cy > b.y && cy < b.y + b.d - 1) {
        onFace(o, "e", 0, 1, 0, dz, "#101318");
        for (let i = 0; i < 4; i++) onFace(o, "e", i / 4, i / 4 + 0.125, 0, 2, "#ffb000");
        onFace(o, "e", 0, 1, dz - 1, dz, "#ffb000");
      }
      if (st.ports) for (let z = 10; z < hpx - 4; z += 14) for (const face of ["s", "e"]) if (rnd() < 0.6) onFace(o, face, 0.35, 0.65, z, z + 3, rnd() < 0.7 ? (face === "s" ? "#7ff3ff" : "#4fb8c4") : "#0a0c14");
      roof(o, st.roof, W.shade(st.roof, 1.3));
      if (st.ports && rnd() < 0.08) { const [x, y] = P(0.5, 0.5, hpx); c.fillStyle = "#ff3048"; c.fillRect(x, y - 3, 2, 2); }
    },
    /* the Convention Center's halls: a glass curtain wall, lit inside */
    hall(o) {
      const { c, P, hpx, rnd, ZH } = o;
      faces(o, "#132a40", "#0d1e30");
      for (const face of ["s", "e"]) for (let z = 0; z < hpx; z += 7) for (let i = 0; i < 4; i++) {
        if (rnd() < 0.55) onFace(o, face, i / 4 + 0.02, (i + 1) / 4 - 0.02, z + 1, z + 6, face === "s" ? "rgba(159,216,255,.45)" : "rgba(120,180,230,.3)");
      }
      c.strokeStyle = "rgba(200,230,255,.25)"; c.lineWidth = 1; c.beginPath();
      for (let i = 0; i <= 4; i++) { const u = i / 4; let a = P(u, 1, 0), e = P(u, 1, hpx); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); }
      c.stroke();
      onFace(o, "s", 0, 1, ZH - 2, ZH, "rgba(84,242,255,.6)");
      roof(o, "#394050", "#4c5466");
      const [x0, y0] = P(0.2, 0.45, hpx), [x1, y1] = P(0.8, 0.45, hpx);
      c.strokeStyle = "rgba(84,242,255,.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    },
    /* greenhouses: plants behind fogged glass, a pale ridge roof */
    greenhouse(o) {
      const { c, P, hpx, rnd } = o;
      faces(o, "#10301e", "#0b2215");
      speck(o, "s", 18, ["#2f8040", "#3a9a50", "#d8c8ff"], 2);
      speck(o, "e", 12, ["#256a34", "#2f7a40"], 2);
      faces(o, "rgba(170,220,200,.16)", "rgba(140,190,170,.12)");
      c.strokeStyle = "rgba(200,240,220,.3)"; c.lineWidth = 1; c.beginPath();
      for (let i = 0; i <= 3; i++) { const u = i / 3; let a = P(u, 1, 0), e = P(u, 1, hpx); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); }
      c.stroke();
      roof(o, "rgba(140,200,180,.55)");
      const [a0, a1] = P(0, 0.5, hpx + 3), [b0, b1] = P(1, 0.5, hpx + 3);
      c.strokeStyle = "rgba(220,250,235,.6)"; c.beginPath(); c.moveTo(a0, a1); c.lineTo(b0, b1); c.stroke();
      if (rnd() < 0.3) { const [x, y] = P(0.5, 0.5, hpx); c.fillStyle = "rgba(255,240,180,.5)"; c.fillRect(x, y, 2, 1); }
    },
    /* a red barn: planks, white trim, a cross-braced door */
    barn(o) {
      const { c, P, hpx, b, cx, cy, ZH } = o;
      faces(o, "#6a2424", "#4a1818");
      c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1; c.beginPath();
      for (let i = 1; i < 6; i++) { const u = i / 6; let a = P(u, 1, 0), e = P(u, 1, hpx); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); a = P(1, 1 - u, 0); e = P(1, 1 - u, hpx); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); }
      c.stroke();
      onFace(o, "s", 0, 1, hpx - 2, hpx, "#e8e4dc"); onFace(o, "e", 0, 1, hpx - 2, hpx, "#b8b4ac");
      if (cy === b.y + b.d - 1 && cx === b.x + (b.w >> 1)) {
        onFace(o, "s", 0.1, 0.9, 0, ZH * 1.6, "#3a1010");
        const [a, e] = [P(0.1, 1, 0), P(0.9, 1, ZH * 1.6)], [f, g] = [P(0.9, 1, 0), P(0.1, 1, ZH * 1.6)];
        c.strokeStyle = "#e8e4dc"; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.moveTo(f[0], f[1]); c.lineTo(g[0], g[1]); c.stroke();
      }
      roof(o, "#2a2a30", "#3a3a42");
    },
    /* a suburban house: siding, a door and windows, and a pitched roof
     * whose ridge runs along x through the middle of the house's depth */
    house(o) {
      const { c, P, quad, b, cx, cy, rnd, ZH } = o;
      const col = b.color || "#6a6458";
      const wallH = b.floors * ZH, ridge = b.garage ? Math.min(6, b.d * 2) : Math.min(14, b.d * 4);
      const zAt0 = v => wallH + ridge * (1 - Math.abs(2 * (cy - b.y + v) / b.d - 1));
      const vR0 = W.clamp(b.y + b.d / 2 - cy, 0, 1);
      // walls that rise to the roof line, so the tile in front closes every gap
      quad([P(0, 1, 0), P(1, 1, 0), P(1, 1, zAt0(1)), P(0, 1, zAt0(1))], col);
      quad([P(1, 0, 0), P(1, 1, 0), P(1, 1, zAt0(1)), P(1, vR0, zAt0(vR0)), P(1, 0, zAt0(0))], W.shade(col, 0.68));
      // siding lines
      c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 1; c.beginPath();
      for (let z = 3; z < wallH; z += 3) { let a = P(0, 1, z), e = P(1, 1, z); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); }
      c.stroke();
      if (!b.garage) for (let f = 0; f < b.floors; f++) {
        if (rnd() < 0.7) onFace(o, "s", 0.3, 0.7, f * ZH + 4, f * ZH + 10, rnd() < 0.6 ? "#ffcf6b" : "#151a26");
        if (rnd() < 0.5) onFace(o, "e", 0.3, 0.7, f * ZH + 4, f * ZH + 10, rnd() < 0.5 ? "#c89a4a" : "#10141e");
      }
      if (b.garage) {
        // a garage: one wide door on the front, a light over it
        if (cy === b.y + b.d - 1) { onFace(o, "s", 0.04, 0.96, 0, 10, "#b8b4a8"); for (let z = 2; z < 10; z += 2.5) onFace(o, "s", 0.04, 0.96, z, z + 0.6, "rgba(0,0,0,.18)"); }
        if (cy === b.y + b.d - 1 && cx === b.x) onFace(o, "s", 0.45, 0.6, 11, 12.5, "#ffe2a0");
      } else if (cy === b.y + b.d - 1 && cx === b.x + (b.door ?? (b.w >> 1))) onFace(o, "s", 0.35, 0.65, 0, 9, "#3a2418");
      // the roof: two slopes meeting at the ridge, shaded by which way they face
      const zAt = v => wallH + ridge * (1 - Math.abs(2 * (cy - b.y + v) / b.d - 1));
      const vR = W.clamp(b.y + b.d / 2 - cy, 0, 1);
      const rc = b.roofColor || "#3a2e2a";
      const slope = (v0, v1, front) => quad([P(0, v0, zAt(v0)), P(1, v0, zAt(v0)), P(1, v1, zAt(v1)), P(0, v1, zAt(v1))], front ? W.shade(rc, 1.25) : rc);
      if (vR > 0) slope(0, vR, false);
      if (vR < 1) slope(vR, 1, true);
      // the gable at the east end
      if (cx === b.x + b.w - 1) quad([P(1, 0, wallH), P(1, 1, wallH), P(1, 1, zAt(1)), P(1, vR, zAt(vR)), P(1, 0, zAt(0))], W.shade(col, 0.6));
      // eaves along the front
      if (cy === b.y + b.d - 1) quad([P(0, 1, wallH), P(1, 1, wallH), P(1, 1.12, wallH - 2), P(0, 1.12, wallH - 2)], W.shade(rc, 0.8));
    },
    /* a parking garage: concrete decks, an open band on every level with a
     * rail across it, a car showing here and there, no windows */
    parkade(o) {
      const { c, P, hpx, rnd, ZH, b } = o;
      faces(o, "#4a4e58", "#363a44");
      for (let f = 0; f < b.floors; f++) {
        const z0 = f * ZH + 3, z1 = f * ZH + ZH - 2;
        onFace(o, "s", 0, 1, z0, z1, "#14161c"); onFace(o, "e", 0, 1, z0, z1, "#101218");
        if (rnd() < 0.45) onFace(o, "s", 0.2, 0.7, z0, z0 + 4, ["#7a2a36", "#4a5a7a", "#8a8a96", "#2a6a5a", "#c8b040"][Math.floor(rnd() * 5)]);
        if (rnd() < 0.3) onFace(o, "e", 0.3, 0.8, z0, z0 + 4, "#3a4256");
        onFace(o, "s", 0, 1, z0 + 5, z0 + 6, "rgba(200,205,215,.35)"); onFace(o, "e", 0, 1, z0 + 5, z0 + 6, "rgba(200,205,215,.25)");
      }
      roof(o, "#3e424c", "#4e525c");
      c.strokeStyle = "rgba(255,255,255,.08)"; c.lineWidth = 1; c.beginPath();
      const a = P(0.5, 0, hpx), e = P(0.5, 1, hpx); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke();
    },
    /* the arena: concrete tiers and a lit ring at the top */
    arena(o) {
      const { c, P, hpx, rnd, ZH } = o;
      faces(o, "#3a3f4c", "#282c36");
      for (let z = ZH; z < hpx - 4; z += ZH) { onFace(o, "s", 0, 1, z, z + 1, "rgba(0,0,0,.3)"); onFace(o, "e", 0, 1, z, z + 1, "rgba(0,0,0,.3)"); }
      for (const face of ["s", "e"]) for (let i = 0; i < 2; i++) if (rnd() < 0.6) onFace(o, face, i / 2 + 0.15, i / 2 + 0.35, 4, ZH - 3, face === "s" ? "#ffcf6b" : "#c89a4a");
      onFace(o, "s", 0, 1, hpx - 4, hpx - 1, "rgba(84,242,255,.75)"); onFace(o, "e", 0, 1, hpx - 4, hpx - 1, "rgba(84,242,255,.45)");
      roof(o, "#2e3340", "#454c5c");
    },
  };
})();

/* Whose signs a wall carries: an enterable building's outer walls carry the
 * building's, laid out along the whole facade. */
W.signHost = (m, b) => b.struct !== undefined && !b.inner && m.structures[b.struct] ? m.structures[b.struct] : b;
/* The part of each of host's facade signs that passes over cell (cx, cy),
 * clipped to the cell's face. P is the cell's projector, H0 its ground line. */
W.drawSigns = (c, host, cx, cy, H0, MX, hpx, P) => {
  for (const s of host.signs || []) {
    const onS = s.face === "s" && cy === host.y + host.d - 1, onE = s.face === "e" && cx === host.x + host.w - 1;
    if (!onS && !onE) continue;
    c.save();
    c.beginPath();
    const p = onS ? [P(0, 1, 0), P(1, 1, 0), P(1, 1, hpx + 4), P(0, 1, hpx + 4)] : [P(1, 0, 0), P(1, 1, 0), P(1, 1, hpx + 4), P(1, 0, hpx + 4)];
    p.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath(); c.clip();
    if (onS) c.setTransform(1, 0.5, 0, 1, MX - (cx - host.x) * W.HTW, H0 + W.HTH - (cx - host.x) * W.HTH);
    else { const k = host.y + host.d - cy; c.setTransform(1, -0.5, 0, 1, MX + W.HTW * (2 - k), H0 + W.HTH + W.HTH * k); }
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
};
/* The wall over a doorway: the same wall as its neighbours from head height
 * up, the opening below, and the building's signs running on across it. */
W.lintelSprite = (m, cx, cy, S) => {
  const key = `lintel|${S.id}|${cx},${cy}|${m.district || ""}`;
  let s = W.cellSprites.get(key);
  if (!s) {
    const st = W.STYLES[S.style] || W.STYLES.office;
    const hpx = S.floors * W.ZH, DOOR = 17, H0 = 26 + hpx, MX = 8;
    const cv = W.canvas(W.TW + MX * 2, H0 + W.TH + 4), c = cv.getContext("2d");
    const P = (u, v, z) => [MX + W.HTW + (u - v) * W.HTW, H0 + (u + v) * W.HTH - z];
    const q = (pts, f) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = f; c.fill(); };
    const wall = st.wall || "#3a3f4e";
    q([P(0, 1, DOOR), P(1, 1, DOOR), P(1, 1, hpx), P(0, 1, hpx)], wall);
    q([P(1, 0, DOOR), P(1, 1, DOOR), P(1, 1, hpx), P(1, 0, hpx)], W.shade(wall, 0.68));
    // the head of the doorway
    q([P(0, 1, DOOR), P(1, 1, DOOR), P(1, 1, DOOR + 1.5), P(0, 1, DOOR + 1.5)], W.shade(wall, 0.5));
    q([P(0, 0, hpx), P(1, 0, hpx), P(1, 1, hpx), P(0, 1, hpx)], S.roof || st.roof);
    W.drawSigns(c, S, cx, cy, H0, MX, hpx, P);
    s = { cv, ox: W.HTW + MX, oy: H0 };
    W.cellSprites.set(key, s);
  }
  return s;
};

/* ---- enterable buildings: the roof, and the walls cut down ---- */
W.roofSprite = (m, cx, cy, S) => {
  const st = W.STYLES[S.style] || W.STYLES.office;
  const same = (x, y) => m.inb(x, y) && (m.roofOf[m.i(x, y)] === S.id || (m.bid[m.i(x, y)] >= 0 && m.buildings[m.bid[m.i(x, y)]].inner && m.buildings[m.bid[m.i(x, y)]].struct === S.id));
  const edges = (same(cx, cy - 1) ? 0 : 1) | (same(cx + 1, cy) ? 0 : 2) | (same(cx, cy + 1) ? 0 : 4) | (same(cx - 1, cy) ? 0 : 8);
  const kit = W.hash2(cx, cy, 11) < 0.04 ? "ac" : "";
  // a big roof can carry skylights in rows, and plant between them
  const sky = S.skylights && (cy - S.y) % 7 >= 2 && (cy - S.y) % 7 <= 3 && (cx - S.x) % 9 >= 2 && (cx - S.x) % 9 <= 6 ? "sky" : "";
  const plant = S.skylights && !sky && W.hash2(cx, cy, 13) < 0.05 ? "plant" : "";
  const key = `roof|${S.style}|${S.floors}|${edges}|${S.roof || ""}|${kit}${sky}${plant}`;
  let s = W.cellSprites.get(key);
  if (!s) {
    const hpx = S.floors * W.ZH, H0 = 26 + hpx, MX = 8;
    const cv = W.canvas(W.TW + MX * 2, H0 + W.TH + 4), c = cv.getContext("2d");
    const P = (u, v, z) => [MX + W.HTW + (u - v) * W.HTW, H0 + (u + v) * W.HTH - z];
    const q = (pts, f) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = f; c.fill(); };
    q([P(0, 0, hpx), P(1, 0, hpx), P(1, 1, hpx), P(0, 1, hpx)], S.roof || st.roof);
    if (S.canopy) {
      // glass down the middle, steel ribs across, a lip on the edges
      q([P(0, 0.3, hpx), P(1, 0.3, hpx), P(1, 0.7, hpx), P(0, 0.7, hpx)], "rgba(159,216,255,.28)");
      c.strokeStyle = "rgba(200,210,230,.35)"; c.lineWidth = 1; c.beginPath();
      const r0 = P(0.5, 0, hpx), r1 = P(0.5, 1, hpx); c.moveTo(r0[0], r0[1]); c.lineTo(r1[0], r1[1]); c.stroke();
      if (edges & 4) q([P(0, 0.88, hpx), P(1, 0.88, hpx), P(1, 1, hpx - 2), P(0, 1, hpx - 2)], "#2a3040");
      if (edges & 2) q([P(0.88, 0, hpx), P(1, 0, hpx - 2), P(1, 1, hpx - 2), P(0.88, 1, hpx)], "#222838");
    }
    c.strokeStyle = "rgba(255,255,255,.04)"; c.lineWidth = 1; c.beginPath();
    const a = P(0, 0, hpx), e = P(1, 0, hpx); c.moveTo(a[0], a[1]); c.lineTo(e[0], e[1]); c.stroke();
    if (kit) W.boxLocal(c, P, 0.25, 0.25, 0.75, 0.6, hpx, hpx + 6, "#5a6278", "#454c60", "#363c4c");
    if (sky) { W.boxLocal(c, P, 0, 0.05, 1, 0.95, hpx, hpx + 2, "rgba(120,220,240,.55)", "#2a4a5a", "#1a3444"); c.fillStyle = "rgba(255,255,255,.18)"; const g = P(0.3, 0.3, hpx + 2); c.fillRect(g[0], g[1], 3, 1); }
    if (plant) { W.boxLocal(c, P, 0.15, 0.2, 0.85, 0.8, hpx, hpx + 8, "#6a7288", "#565e74", "#454c60"); const f = P(0.5, 0.5, hpx + 8); c.fillStyle = "#3a4052"; c.beginPath(); c.ellipse(f[0], f[1], 6, 3, 0, 0, Math.PI * 2); c.fill(); }
    s = { cv, ox: W.HTW + MX, oy: H0 };
    W.cellSprites.set(key, s);
  }
  return s;
};
/* A footbridge's deck over one cell: a slab, sloping where the walkway is a
 * ramp, with a steel leg under it where it stands on ground that is not
 * track. Railings run along an edge only where that edge is up in the air
 * and nothing walkable joins it: never across the ends you walk on from. */
W.deckSprite = (m, cx, cy) => {
  const k = m.i(cx, cy), ax = m.deckAxis[k], lo = m.deckLo[k], hi = m.deckHi[k], flat = m.deck[k];
  const zAt = (u, v) => ax === 1 ? lo + (hi - lo) * u : ax === 2 ? lo + (hi - lo) * v : flat;
  const on = (x, y) => m.inb(x, y) && (m.deck[m.i(x, y)] > 0 || m.deckHi[m.i(x, y)] > 0);
  // an edge gets a railing when nothing walkable joins it and it is well off the ground
  const railN = !on(cx, cy - 1) && Math.max(zAt(0, 0), zAt(1, 0)) > 5;
  const railS = !on(cx, cy + 1) && Math.max(zAt(0, 1), zAt(1, 1)) > 5;
  const railW = !on(cx - 1, cy) && Math.max(zAt(0, 0), zAt(0, 1)) > 5;
  const railE = !on(cx + 1, cy) && Math.max(zAt(1, 0), zAt(1, 1)) > 5;
  const leg = m.ground[k] !== W.G.RAIL && (cx + cy) % 3 === 0 && zAt(0.5, 0.5) > 8;
  const key = `deck2|${ax}|${lo}|${hi}|${flat}|${+railN}${+railS}${+railW}${+railE}|${+leg}`;
  let s = W.cellSprites.get(key);
  if (!s) {
    const top = Math.max(lo, hi, flat), H0 = 30 + top, MX = 8;
    const cv = W.canvas(W.TW + MX * 2, H0 + W.TH + 4), c = cv.getContext("2d");
    const P = (u, v, h) => [MX + W.HTW + (u - v) * W.HTW, H0 + (u + v) * W.HTH - h];
    const q = (pts, f) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = f; c.fill(); };
    const T = 3;
    if (leg) W.boxLocal(c, P, 0.42, 0.42, 0.58, 0.58, 0, zAt(0.5, 0.5) - T, "#5a6070", "#4a5060", "#3a4050");
    // the slab: its two visible sides, then its top
    q([P(0, 1, Math.max(0, zAt(0, 1) - T)), P(1, 1, Math.max(0, zAt(1, 1) - T)), P(1, 1, zAt(1, 1)), P(0, 1, zAt(0, 1))], "#3a4256");
    q([P(1, 0, Math.max(0, zAt(1, 0) - T)), P(1, 1, Math.max(0, zAt(1, 1) - T)), P(1, 1, zAt(1, 1)), P(1, 0, zAt(1, 0))], "#2a3044");
    q([P(0, 0, zAt(0, 0)), P(1, 0, zAt(1, 0)), P(1, 1, zAt(1, 1)), P(0, 1, zAt(0, 1))], ax ? "#525a70" : "#4a5266");
    // tread lines across a ramp
    if (ax) {
      c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 1; c.beginPath();
      for (const t of [0.25, 0.5, 0.75]) {
        const [a0, a1] = ax === 2 ? [P(0, t, zAt(0, t)), P(1, t, zAt(1, t))] : [P(t, 0, zAt(t, 0)), P(t, 1, zAt(t, 1))];
        c.moveTo(a0[0], a0[1]); c.lineTo(a1[0], a1[1]);
      }
      c.stroke();
    }
    // railings
    c.strokeStyle = "#8a90a0"; c.lineWidth = 1; c.beginPath();
    const rail = (u0, v0, u1, v1) => {
      const z0 = zAt(u0, v0), z1 = zAt(u1, v1);
      const p0 = P(u0, v0, z0 + 7), p1 = P(u1, v1, z1 + 7), q0 = P(u0, v0, z0), q1 = P(u1, v1, z1);
      c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]);
      c.moveTo(q0[0], q0[1] - 0.5); c.lineTo(p0[0], p0[1]); c.moveTo(q1[0], q1[1] - 0.5); c.lineTo(p1[0], p1[1]);
    };
    if (railN) rail(0, 0, 1, 0);
    if (railW) rail(0, 0, 0, 1);
    if (railE) rail(1, 0, 1, 1);
    if (railS) rail(0, 1, 1, 1);
    c.stroke();
    s = { cv, ox: W.HTW + MX, oy: H0 };
    W.cellSprites.set(key, s);
  }
  return s;
};

/* a wall of an open building, cut down to a stub so the rooms show */
W.cutSprite = (m, cx, cy) => {
  const b = m.buildings[m.bid[m.i(cx, cy)]];
  const st = W.STYLES[b.style] || W.STYLES.office;
  const key = `cut|${b.style}|${b.color || ""}`;
  let s = W.cellSprites.get(key);
  if (!s) {
    const hpx = 9, H0 = 10 + hpx, MX = 8;
    const cv = W.canvas(W.TW + MX * 2, H0 + W.TH + 4), c = cv.getContext("2d");
    const P = (u, v, z) => [MX + W.HTW + (u - v) * W.HTW, H0 + (u + v) * W.HTH - z];
    const wall = b.color || st.wall;
    W.boxLocal(c, P, 0, 0, 1, 1, 0, hpx, W.shade(wall, 1.5), wall, W.shade(wall, 0.68));
    s = { cv, ox: W.HTW + MX, oy: H0 };
    W.cellSprites.set(key, s);
  }
  return s;
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
    case "fence": {
      // rails along the cell's edge, on its axis
      c.strokeStyle = "#5a4a3a"; c.lineWidth = 1;
      const a = p.axis === "y" ? [P(0, -0.5, 0), P(0, 0.5, 0)] : [P(-0.5, 0, 0), P(0.5, 0, 0)];
      c.beginPath();
      for (const z of [3, 6]) { c.moveTo(a[0][0], a[0][1] - z); c.lineTo(a[1][0], a[1][1] - z); }
      c.stroke();
      c.fillStyle = "#4a3c30"; c.fillRect(a[0][0], a[0][1] - 7, 1, 7); c.fillRect(sx, sy - 7, 1, 7);
      break;
    }
    case "hay":
      c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(sx, sy, 7, 3.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#a8883a"; c.beginPath(); c.ellipse(sx, sy - 4, 6, 4.5, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#7a6028"; c.beginPath(); c.ellipse(sx + 2, sy - 4, 2.5, 3.5, 0, 0, Math.PI * 2); c.stroke();
      break;
    case "windmill": {
      c.strokeStyle = "#3a3f4c"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(sx - 5, sy); c.lineTo(sx, sy - 48); c.lineTo(sx + 5, sy); c.moveTo(sx - 3, sy - 16); c.lineTo(sx + 3, sy - 16); c.moveTo(sx - 2, sy - 32); c.lineTo(sx + 2, sy - 32); c.stroke();
      const hx = sx, hy = sy - 50;
      c.strokeStyle = "#8a90a0"; c.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { const a = t * 1.4 + i * Math.PI / 3; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(a) * 12, hy + Math.sin(a) * 12 * 0.9); c.stroke(); }
      c.fillStyle = "#5a6070"; c.fillRect(hx - 2, hy - 2, 4, 4);
      c.fillStyle = "#5a6070"; c.fillRect(hx + 2, hy - 1, 7, 2);
      break;
    }
    case "crane": {
      // a gantry crane over a container aisle, its trolley creeping back and forth
      const col = "#c89a2a";
      c.strokeStyle = col; c.lineWidth = 2;
      const L0 = P(-1.5, 0, 0), L1 = P(1.5, 0, 0);
      c.beginPath(); c.moveTo(L0[0], L0[1]); c.lineTo(L0[0], L0[1] - 70); c.moveTo(L1[0], L1[1]); c.lineTo(L1[0], L1[1] - 70); c.stroke();
      c.lineWidth = 3; c.beginPath(); c.moveTo(L0[0] - 4, L0[1] - 70); c.lineTo(L1[0] + 4, L1[1] - 70); c.stroke();
      c.lineWidth = 1; c.beginPath(); c.moveTo(L0[0], L0[1] - 60); c.lineTo(L1[0], L1[1] - 60); c.stroke();
      const k = (Math.sin(t * 0.3 + p.x) + 1) / 2, tx = L0[0] + (L1[0] - L0[0]) * k, ty = L0[1] + (L1[1] - L0[1]) * k - 70;
      c.fillStyle = "#3a3f4c"; c.fillRect(tx - 3, ty - 2, 6, 5);
      c.strokeStyle = "#8a90a0"; c.beginPath(); c.moveTo(tx, ty + 3); c.lineTo(tx, ty + 30); c.stroke();
      c.fillStyle = "#ff3048"; c.fillRect(L0[0] - 1, L0[1] - 73, 2, 2);
      break;
    }
    case "flood":
      c.fillStyle = "#1a1e2a"; c.fillRect(sx - 1, sy - 44, 2, 44);
      c.fillStyle = "#2a2f3c"; c.fillRect(sx - 6, sy - 48, 12, 5);
      c.fillStyle = "#fffbe8"; for (let i = 0; i < 4; i++) c.fillRect(sx - 5 + i * 3, sy - 47, 2, 2);
      break;
    case "banner": {
      const col = p.color || "#54f2ff";
      c.fillStyle = "#1a1e2a"; c.fillRect(sx, sy - 30, 1, 30);
      const wave = Math.sin(t * 2 + p.x) * 1;
      c.fillStyle = col; c.beginPath(); c.moveTo(sx + 1, sy - 29); c.lineTo(sx + 7, sy - 28 + wave); c.lineTo(sx + 7, sy - 14 + wave); c.lineTo(sx + 1, sy - 15); c.closePath(); c.fill();
      c.fillStyle = "rgba(0,0,0,.3)"; c.fillRect(sx + 3, sy - 25 + wave, 3, 1); c.fillRect(sx + 3, sy - 22 + wave, 2, 1);
      break;
    }
    case "truck": {
      const col = p.color || "#c8b040";
      const ax = p.axis === "y";
      if (ax) W.box(c, sx, sy, -0.35, -0.8, 0.35, 0.8, 1, 16, W.shade(col, 1.1), col, W.shade(col, 0.7));
      else W.box(c, sx, sy, -0.8, -0.35, 0.8, 0.35, 1, 16, W.shade(col, 1.1), col, W.shade(col, 0.7));
      const q = (pts, f) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = f; c.fill(); };
      if (ax) q([P(0.35, -0.5, 6), P(0.35, 0.4, 6), P(0.35, 0.4, 12), P(0.35, -0.5, 12)], "#ffe2a0");
      else q([P(-0.5, 0.35, 6), P(0.4, 0.35, 6), P(0.4, 0.35, 12), P(-0.5, 0.35, 12)], "#ffe2a0");
      break;
    }
    case "barrel":
      c.fillStyle = p.color || "#3a5a7a"; c.fillRect(sx - 3, sy - 8, 6, 8);
      c.fillStyle = "rgba(0,0,0,.3)"; c.fillRect(sx - 3, sy - 6, 6, 1); c.fillRect(sx - 3, sy - 3, 6, 1);
      c.fillStyle = W.shade(p.color || "#3a5a7a", 1.3); c.beginPath(); c.ellipse(sx, sy - 8, 3, 1.5, 0, 0, Math.PI * 2); c.fill();
      break;
    case "cone":
      c.fillStyle = "#ff7a1a"; c.beginPath(); c.moveTo(sx - 2.5, sy); c.lineTo(sx, sy - 6); c.lineTo(sx + 2.5, sy); c.closePath(); c.fill();
      c.fillStyle = "#f2eefa"; c.fillRect(sx - 1, sy - 3, 2, 1);
      break;
    case "tractor":
      W.box(c, sx, sy, -0.45, -0.3, 0.3, 0.3, 3, 9, "#2a6a3a", "#24603a", "#1a4a2a");
      W.box(c, sx, sy, -0.45, -0.25, -0.1, 0.25, 9, 15, "#2f3a48", "#1d3346", "#122232");
      c.fillStyle = "#1a1a1e"; c.beginPath(); c.arc(sx - 5, sy - 3, 4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(sx + 6, sy + 1, 2.5, 0, Math.PI * 2); c.fill();
      break;
    case "statue":
      W.box(c, sx, sy, -0.45, -0.45, 0.45, 0.45, 0, 8, "#5a6070", "#454c5c", "#363c4c");
      // a bronze puma, sitting up
      c.fillStyle = "#8a6a3a";
      c.beginPath(); c.ellipse(sx, sy - 16, 4, 7, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(sx, sy - 25, 3.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(sx - 3.5, sy - 26); c.lineTo(sx - 3, sy - 31); c.lineTo(sx - 1, sy - 28); c.fill();
      c.beginPath(); c.moveTo(sx + 3.5, sy - 26); c.lineTo(sx + 3, sy - 31); c.lineTo(sx + 1, sy - 28); c.fill();
      c.strokeStyle = "#8a6a3a"; c.lineWidth = 2; c.beginPath(); c.moveTo(sx + 3, sy - 10); c.quadraticCurveTo(sx + 9, sy - 9, sx + 7, sy - 16); c.stroke();
      break;
    case "trough":
      W.box(c, sx, sy, -0.45, -0.2, 0.45, 0.2, 0, 4, "#2a5a6a", "#4a3c30", "#3a2f26");
      break;
    case "box": {
      // furniture and fittings: desks, shelves, counters, pews, booths
      const w = (p.w || 0.8) / 2, d = (p.d || 0.8) / 2, h = p.h || 8, side = p.side || "#3a4258";
      W.box(c, sx, sy, -w, -d, w, d, p.z || 0, (p.z || 0) + h, p.top || W.shade(side, 1.3), side, W.shade(side, 0.68));
      if (p.screen) { const [x, y] = P(0, -d + 0.05, h + 3); c.fillStyle = p.screen; c.fillRect(x - 2, y - 3, 5, 3); }
      break;
    }
    case "grave": {
      c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(sx, sy, 5, 2.5, 0, 0, Math.PI * 2); c.fill();
      const col = p.color || "#6a6e78";
      if (p.cross) { c.fillStyle = col; c.fillRect(sx - 1, sy - 11, 2, 11); c.fillRect(sx - 4, sy - 8, 8, 2); }
      else { c.fillStyle = col; c.beginPath(); c.moveTo(sx - 3, sy); c.lineTo(sx - 3, sy - 7); c.arc(sx, sy - 7, 3, Math.PI, 0); c.lineTo(sx + 3, sy); c.closePath(); c.fill(); c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(sx + 1, sy - 8, 2, 8); }
      break;
    }
    case "watertower": {
      c.strokeStyle = "#4a5060"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(sx - 12, sy); c.lineTo(sx - 8, sy - 64); c.moveTo(sx + 12, sy); c.lineTo(sx + 8, sy - 64); c.moveTo(sx - 3, sy + 5); c.lineTo(sx - 2, sy - 64); c.moveTo(sx + 4, sy - 5); c.lineTo(sx + 3, sy - 64); c.stroke();
      c.lineWidth = 1; c.beginPath(); c.moveTo(sx - 11, sy - 20); c.lineTo(sx + 11, sy - 40); c.moveTo(sx + 11, sy - 20); c.lineTo(sx - 11, sy - 40); c.stroke();
      const tank = p.color || "#8a9aa8";
      c.fillStyle = W.shade(tank, 0.75); c.beginPath(); c.ellipse(sx, sy - 64, 16, 6, 0, 0, Math.PI); c.fill();
      c.fillStyle = tank; c.fillRect(sx - 16, sy - 86, 32, 22);
      c.fillStyle = W.shade(tank, 0.75); c.fillRect(sx + 4, sy - 86, 12, 22);
      c.fillStyle = W.shade(tank, 1.2); c.beginPath(); c.ellipse(sx, sy - 86, 16, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = W.shade(tank, 0.9); c.beginPath(); c.moveTo(sx - 16, sy - 86); c.lineTo(sx, sy - 98); c.lineTo(sx + 16, sy - 86); c.closePath(); c.fill();
      if (p.text) { c.font = "bold 7px ui-monospace,Menlo,Consolas,monospace"; c.textAlign = "center"; c.fillStyle = "#1a2a4a"; c.fillText(p.text, sx - 2, sy - 73); c.textAlign = "start"; }
      c.fillStyle = "#ff3048"; c.fillRect(sx - 1, sy - 100, 2, 2);
      break;
    }
    case "bars": {
      c.strokeStyle = "#8a90a0"; c.lineWidth = 1; c.beginPath();
      for (let i = 0; i <= 5; i++) { const t2 = i / 5 - 0.5; const [x, y] = p.axis === "y" ? P(0, t2, 0) : P(t2, 0, 0); c.moveTo(x, y); c.lineTo(x, y - 16); }
      const [a1, b1] = p.axis === "y" ? [P(0, -0.5, 16), P(0, 0.5, 16)] : [P(-0.5, 0, 16), P(0.5, 0, 16)];
      c.moveTo(a1[0], a1[1]); c.lineTo(b1[0], b1[1]); c.stroke();
      break;
    }
    case "shelter":
      c.fillStyle = "#1a1e2a"; c.fillRect(sx - 9, sy - 18, 1, 18); c.fillRect(sx + 8, sy - 14, 1, 14);
      W.box(c, sx, sy, -0.6, -0.3, 0.6, 0.3, 16, 18, "#3a4258", "#2b3144", "#20263a");
      c.fillStyle = "rgba(159,216,255,.18)"; c.fillRect(sx - 8, sy - 15, 16, 12);
      break;
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
      if (p.pole) { c.fillStyle = "#1a1e2a"; c.fillRect(sx, sy - z0, 1, z0); }
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
  if (car.train) {
    // a tram carriage: a long box with a lit window band
    const col = car.color || "#9aa4b8";
    W.box(c, ox, oy, x0, y0, x1, y1, 2, 16, W.shade(col, 0.6), col, W.shade(col, 0.7));
    const P2 = (u, v, z) => [ox + (u - v) * W.HTW, oy + (u + v) * W.HTH - z];
    const q = (pts, f) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = f; c.fill(); };
    if (ax) q([P2(x0 + 0.2, y1, 8), P2(x1 - 0.2, y1, 8), P2(x1 - 0.2, y1, 13), P2(x0 + 0.2, y1, 13)], "#9ff7ff");
    else q([P2(x1, y0 + 0.2, 8), P2(x1, y1 - 0.2, 8), P2(x1, y1 - 0.2, 13), P2(x1, y0 + 0.2, 13)], "#7fd8e0");
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
  // lights: on while driving, dark when parked
  const head = car.parked ? "#5a5a50" : "#fff3c4", tail = car.parked ? "#4a1a20" : "#ff3048";
  if (ax) { dot(fx, y0 + 0.12, head); dot(fx, y1 - 0.12, head); dot(bx, y0 + 0.12, tail); dot(bx, y1 - 0.12, tail); }
  else { dot(x0 + 0.12, fy, head); dot(x1 - 0.12, fy, head); dot(x0 + 0.12, by, tail); dot(x1 - 0.12, by, tail); }
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
