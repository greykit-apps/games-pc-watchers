/* The city map on the command screen: PumaCity from above, as a satellite
 * would see it. Ocean to the west; dry gold hills all round; the city in
 * between, cut by the creek, the highway and the main roads. The zones are
 * drawn as lines along those roads, the creek and the coast, each loosely
 * taking in a district, in the canon arrangement:
 *
 *   the Expo (Convention Center), north-west   the Ranch, north-east
 *   the Vault, in the western hills (sealed)   the Suburbs: Maple Heights, Juniper Hills
 *   the Starport, on the bay to the south-west Downtown: Lantern Row, the Towers, Old Town
 *
 * The mission maps are small samples of these areas, not the whole of them.
 *
 * The ground (terrain, streets, roofs, landmarks) is painted once into a
 * plate; every frame lays the zones over it: tinted Benton gold as control
 * rises, red stripes where a zone is lost, a gold crosshatch where it's locked
 * down, Cal's push as a red front, and the dispatch's tags. The plan is
 * 400x500 units; hit() turns a point on the canvas into a zone. */
"use strict";

(() => {
  // the zones are planned on 400x500; the view takes in the country round them, the sea and the hills
  const VX = -90, VY = -40, VW = 640, VH = 650;
  // the zones, along the roads, the creek and the coast
  const ZP = {
    expo: [[110, 30], [170, 22], [222, 30], [234, 70], [232, 106], [200, 115], [170, 120], [150, 130], [118, 133], [98, 122], [90, 98], [96, 62]],
    ranch: [[236, 22], [300, 12], [360, 18], [386, 42], [390, 90], [378, 126], [330, 132], [300, 128], [280, 112], [240, 112], [232, 106], [234, 70]],
    vault: [[102, 142], [150, 132], [168, 150], [176, 200], [188, 258], [196, 302], [160, 312], [128, 306], [110, 296], [98, 268], [86, 236], [84, 200], [90, 166]],
    maple: [[170, 124], [240, 114], [280, 114], [298, 130], [298, 180], [300, 250], [302, 298], [262, 300], [230, 310], [198, 304], [190, 258], [178, 200], [170, 150]],
    juniper: [[300, 130], [330, 134], [378, 130], [390, 170], [394, 230], [390, 294], [360, 298], [330, 290], [302, 298], [300, 250], [298, 180]],
    starport: [[112, 302], [128, 310], [160, 316], [196, 308], [198, 332], [192, 400], [196, 470], [160, 482], [124, 474], [110, 446], [88, 420], [76, 392], [88, 360], [102, 332]],
    lantern: [[198, 310], [230, 312], [262, 302], [270, 340], [262, 380], [240, 420], [210, 440], [196, 470], [192, 400], [198, 332]],
    towers: [[262, 302], [302, 304], [330, 292], [360, 300], [390, 298], [388, 348], [350, 368], [320, 390], [290, 398], [262, 380], [270, 340]],
    oldtown: [[262, 380], [290, 398], [320, 390], [350, 368], [388, 348], [392, 420], [380, 468], [330, 488], [270, 486], [222, 478], [196, 470], [210, 440], [240, 420]],
  };
  const LABEL = {
    expo: ["THE EXPO"], ranch: ["THE RANCH"], vault: ["THE VAULT"], maple: ["MAPLE", "HEIGHTS"], juniper: ["JUNIPER", "HILLS"],
    starport: ["STARPORT"], towers: ["THE TOWERS"], lantern: ["LANTERN", "ROW"], oldtown: ["OLD TOWN"],
  };
  // each zone's pin, and where its name goes: on it, or out in the hills or the bay on a leader line where it's too small
  const AT = { expo: [162, 74], ranch: [318, 66], vault: [136, 222], maple: [240, 206], juniper: [348, 214], starport: [140, 398], lantern: [228, 372], towers: [326, 334], oldtown: [316, 440] };
  const TAG = Object.assign({}, AT, { vault: [10, 238], maple: [228, 210], juniper: [356, 214], starport: [12, 398], lantern: [226, 560], towers: [436, 318] });
  LABEL.towers = ["THE", "TOWERS"];

  // the coast, north to south, and the creek, east to west
  const COAST = [[150, -60], [136, -30], [124, 0], [106, 30], [88, 62], [80, 98], [92, 126], [86, 160], [74, 200], [80, 240], [96, 270], [108, 300], [98, 330], [84, 360], [68, 392], [82, 420], [106, 442], [114, 470], [104, 500], [92, 540], [86, 580], [96, 620], [108, 680]];
  const CREEK = [[400, 292], [362, 298], [330, 290], [300, 302], [262, 299], [230, 310], [196, 305], [160, 314], [128, 308], [104, 300]];
  const coastX = y => { for (let i = 1; i < COAST.length; i++) if (y <= COAST[i][1]) { const [x0, y0] = COAST[i - 1], [x1, y1] = COAST[i]; return x0 + (x1 - x0) * (y - y0) / (y1 - y0); } return COAST[COAST.length - 1][0]; };

  // control, in Benton gold: dim ochre at 0, bright at 3
  const STOPS = ["#5c4426", "#8f6a22", "#c7921c", "#f2c230", "#ffd95a"];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };
  const gold = C => { const c = Math.max(0, Math.min(3.95, C)), i = Math.min(3, Math.floor(c)); return mix(STOPS[i], STOPS[i + 1], c - i); };
  const RED = "#ff4552", CYAN = "#5ff0ff";
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // a seeded value noise, for the terrain
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.25 + vnoise(x * 4.3, y * 4.3) * 0.15 + vnoise(x * 8.7, y * 8.7) * 0.1;
  const inPoly = (pts, x, y) => { let n = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) n = !n; } return n; };

  class CityMap {
    constructor(canvas) {
      this.cv = canvas;
      this.c = canvas.getContext("2d");
      this.disp = {};          // the control each zone is drawn at, which eases toward the real one
      this.changes = {};       // the dispatch's level changes, tagged on their zones until the next action
      this.flashT = 0;         // when the changed zones last flashed
      this.calIn = null;       // Cal's front sweeping into a new zone: { id, t }
      this.ui = { sel: null, hover: null };
      this.t0 = performance.now();
      this.loop = this.loop.bind(this);
    }
    static get AT() { return AT; }
    // where a zone's name sits on the frame, in percent: for the buttons laid over the names
    static place(id) { const [x, y] = TAG[id]; return [100 * (x - VX) / VW, 100 * (y - VY) / VH]; }
    static get POLYS() { return ZP; }

    set(s, ui) {
      this.s = s; Object.assign(this.ui, ui);
      for (const z of s.zones) if (this.disp[z.id] == null || reduced()) this.disp[z.id] = z.C;
      this.dirty = true;
      if (!this.raf) this.raf = requestAnimationFrame(this.loop);
    }
    /* The dispatch: ease from the day before's control to today's; flash the
     * zones whose level moved and tag them with the move until the player's
     * next action; sweep Cal's front into a zone he's just reached. */
    dispatch(before, calNew) {
      const rm = reduced(), M = W.M;
      this.changes = {};
      for (const z of this.s.zones) {
        const b = before[z.id];
        if (!b) continue;
        this.disp[z.id] = rm ? z.C : b.C;
        const L = M.level(z.C);
        if (z.lost && !b.lost) this.changes[z.id] = { text: "LOST", up: false };
        else if (!z.lost && b.lost) this.changes[z.id] = { text: "RETAKEN", up: true };
        else if (!z.lost && !z.locked && L !== b.L) this.changes[z.id] = { text: `${L > b.L ? "▲" : "▼"}L${L}`, up: L > b.L };
      }
      this.flashT = rm ? 0 : performance.now();
      this.calIn = calNew && !rm ? { id: calNew, t: performance.now() } : null;
      this.dirty = true;
    }
    clearChanges() { if (Object.keys(this.changes).length) { this.changes = {}; this.dirty = true; } }
    stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
    // which zone is under a point on the page
    hit(clientX, clientY) {
      const r = this.cv.getBoundingClientRect();
      const x = VX + (clientX - r.left) / r.width * VW, y = VY + (clientY - r.top) / r.height * VH;
      return Object.keys(ZP).find(id => id !== "vault" && inPoly(ZP[id], x, y)) || null;
    }

    resize() {
      const r = this.cv.getBoundingClientRect(), dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (!w || !h) return false;
      if (w !== this.cv.width || h !== this.cv.height) { this.cv.width = w; this.cv.height = h; this.plate = null; }
      this.kx = w / VW; this.ky = h / VH; this.k = Math.min(this.kx, this.ky); this.dpr = dpr;
      return true;
    }

    loop(now) {
      this.raf = 0;
      if (!this.s || !this.cv.isConnected) return;
      if (!this.resize()) { this.raf = requestAnimationFrame(this.loop); return; }
      let moving = false;
      for (const z of this.s.zones) {
        const d = this.disp[z.id], t = z.C;
        if (Math.abs(d - t) > 0.002) { this.disp[z.id] = d + (t - d) * 0.08; moving = true; } else this.disp[z.id] = t;
      }
      const fresh = now - this.flashT < 1400 || (this.calIn && now - this.calIn.t < 1000);
      const live = !reduced() && (this.s.cal.zone || (this.s.cal.revealed && this.s.cal.next));
      if (moving || fresh || live || this.dirty) { this.draw(now); this.dirty = false; }
      if (moving || fresh || live) this.raf = requestAnimationFrame(this.loop);
    }

    /* ---- the plate: PumaCity from above, painted once per size ---- */
    buildPlate() {
      const p = document.createElement("canvas");
      p.width = this.cv.width; p.height = this.cv.height;
      const c = p.getContext("2d");
      // the ground: hills, scrub and sea, worked out a pixel at a time at half the plan's size, then laid on soft
      const GW = 232, GH = 290, g = document.createElement("canvas");
      g.width = GW; g.height = GH;
      const gc = g.getContext("2d"), img = gc.createImageData(GW, GH), D = img.data;
      const height = (x, y) => { const d = Math.hypot(x - 250, (y - 290) * 0.9); return fbm(x * 0.018, y * 0.018) * 0.7 + Math.max(0, d - 150) / 160; };
      for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
        const x = VX + gx * VW / GW, y = VY + gy * VH / GH, i = (gy * GW + gx) * 4, cx = coastX(y);
        let r, gg, b;
        if (x < cx) {
          // the sea: shallow and green by the shore, deep and blue out
          const d = Math.min(1, (cx - x) / 70), n = vnoise(x * 0.08, y * 0.08) * 0.08;
          r = 18 + (44 - 18) * (1 - d) + n * 40; gg = 52 + (118 - 52) * (1 - d) + n * 40; b = 74 + (128 - 74) * (1 - d) + n * 30;
          if (cx - x < 3) { r = 190; gg = 200; b = 190; }
        } else if (x - cx < 4) { r = 196; gg = 182; b = 140; }     // the beach
        else {
          const h = height(x, y), shade = Math.max(0.55, Math.min(1.35, 1 + (height(x - 2, y - 2) - height(x + 2, y + 2)) * 9));
          const scrub = fbm(x * 0.05 + 40, y * 0.05), t = Math.min(1, h);
          // dry gold grass low down, chaparral higher up, dark oak where the noise gathers
          r = 168 - 70 * t; gg = 152 - 50 * t; b = 96 - 40 * t;
          if (scrub > 0.62) { r = 78; gg = 92; b = 52; }
          r *= shade; gg *= shade; b *= shade;
        }
        D[i] = r; D[i + 1] = gg; D[i + 2] = b; D[i + 3] = 255;
      }
      gc.putImageData(img, 0, 0);
      c.imageSmoothingEnabled = true;
      c.drawImage(g, 0, 0, p.width, p.height);
      c.scale(this.kx, this.ky); c.translate(-VX, -VY);

      const R = (x, y, w, h, f) => { c.fillStyle = f; c.fillRect(x, y, w, h); };
      const poly = (pts, f) => { c.fillStyle = f; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
      const line = (pts, w, col, dash) => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = "round"; c.lineCap = "round"; c.setLineDash(dash || []); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]); };
      const clip = (pts, f) => { c.save(); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.clip(); f(); c.restore(); };
      let seed = 11;
      const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      const pick = a => a[Math.floor(rnd() * a.length)];
      // blocks of roofs on a street grid, at an angle, inside a shape
      const grid = (pts, o) => clip(pts, () => {
        const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
        const x0 = Math.min(...xs) - 30, x1 = Math.max(...xs) + 30, y0 = Math.min(...ys) - 30, y1 = Math.max(...ys) + 30;
        poly(pts, o.base);
        c.save();
        c.translate((x0 + x1) / 2, (y0 + y1) / 2); c.rotate(o.ang || 0); c.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
        for (let y = y0; y < y1; y += o.step) for (let x = x0; x < x1; x += o.step) {
          const bw = o.step - o.street;
          if (o.park && rnd() < o.park) { R(x, y, bw, bw, "#4a6038"); continue; }
          // a block: a few roofs, sometimes one big one
          if (rnd() < (o.big || 0)) { R(x, y, bw, bw, pick(o.roofs)); if (o.tall) { R(x + bw, y + 1.5, 2.5, bw, "rgba(0,0,0,.35)"); R(x + 1.5, y + bw, bw, 2.5, "rgba(0,0,0,.35)"); } continue; }
          const n = o.lots || 2;
          for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { const sw = bw / n; if (rnd() < (o.fill || 0.85)) R(x + a * sw + 0.4, y + b * sw + 0.4, sw - 0.8, sw - 0.8, pick(o.roofs)); }
        }
        c.restore();
      });

      // the creek, with green along its banks
      line(CREEK, 9, "rgba(70,96,56,.85)");
      line(CREEK, 2.6, "#3f6f78");

      // Downtown: dense blocks, towers casting shadows in the core, the park and the station in Lantern Row, the cathedral in Old Town
      grid(ZP.towers, { base: "#6d6c6a", step: 11, street: 2, ang: 0.08, roofs: ["#8e8c88", "#a3a19b", "#5f6670", "#7c838c", "#b5b0a4"], big: 0.55, tall: true });
      grid(ZP.oldtown, { base: "#73695e", step: 8, street: 1.6, ang: 0.08, roofs: ["#9a7a62", "#a88a6e", "#8c8a84", "#b29a7a", "#7a6656"], lots: 2, fill: 0.9 });
      grid(ZP.lantern, { base: "#6e6a62", step: 9, street: 1.8, ang: 0.08, roofs: ["#8e877a", "#a39a88", "#7c7a76", "#96806a"], park: 0.08 });
      poly([[214, 352], [240, 344], [248, 366], [222, 374]], "#4f6a3a");          // Pounce Park
      line([[200, 336], [240, 330], [280, 342], [330, 338], [392, 346]], 1.4, "#3b3a3e");
      line([[200, 336], [240, 330], [280, 342], [330, 338], [392, 346]], 0.6, "#9a948a", [1.2, 1.4]);   // the rail line
      R(250, 336, 16, 6, "#b8b2a6");                                              // Central Station
      R(318, 322, 8, 8, "#3d4450"); R(326, 330, 3, 8, "rgba(0,0,0,.4)"); R(318, 330, 8, 3, "rgba(0,0,0,.4)");   // PVN Tower
      poly([[338, 446], [352, 446], [352, 440], [356, 440], [356, 446], [370, 446], [370, 450], [356, 450], [356, 462], [352, 462], [352, 450], [338, 450]], "#c9bfa8");  // St. Felis
      R(300, 448, 22, 16, "#b9ad92"); for (let x = 302; x < 322; x += 4) for (let y = 450; y < 464; y += 4) R(x, y, 2, 2, "#a0563c");      // Market Plaza's awnings

      // the Suburbs: curving streets, red-tile roofs, the water tower, the college, the cemetery
      const house = (x, y) => { if (rnd() < 0.86) { c.fillStyle = pick(["#a8664a", "#b4735a", "#9a5a40", "#c9c2b2", "#8a8682", "#b8846a"]); c.fillRect(x - 1.5, y - 1.5, 3, 3); } if (rnd() < 0.12) { c.fillStyle = "#4f9cb0"; c.fillRect(x + 1.4, y + 1.2, 1.6, 1.3); } };
      const street = pts => {
        line(pts, 1.5, "#aaa491");
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
          for (let d = 0; d < L; d += 4) { const x = x0 + (x1 - x0) * d / L, y = y0 + (y1 - y0) * d / L; house(x + nx * 3.6, y + ny * 3.6); house(x - nx * 3.6, y - ny * 3.6); }
        }
      };
      for (const id of ["maple", "juniper"]) clip(ZP[id], () => {
        poly(ZP[id], "#7d7862");
        const [x0, x1] = id === "maple" ? [168, 302] : [298, 396], ph = rnd() * 6;
        // long winding streets across, a few running down, and dead ends with a turning circle
        for (let y = 122; y < 304; y += 13) {
          const pts = [];
          for (let x = x0; x <= x1; x += 5) pts.push([x, y + Math.sin(x * 0.045 + y * 0.09 + ph) * 4.5]);
          street(pts);
        }
        for (let k = 0; k < 4; k++) {
          const x = x0 + 18 + k * (x1 - x0 - 30) / 3, pts = [];
          for (let y = 118; y < 306; y += 6) pts.push([x + Math.sin(y * 0.05 + k) * 6, y]);
          line(pts, 1.8, "#b4ae9a");
        }
        for (let k = 0; k < 10; k++) {
          const x = x0 + 8 + rnd() * (x1 - x0 - 16), y = 128 + rnd() * 166, a = rnd() * Math.PI * 2;
          const ex = x + Math.cos(a) * 9, ey = y + Math.sin(a) * 9;
          line([[x, y], [ex, ey]], 1.4, "#aaa491");
          c.fillStyle = "#aaa491"; c.beginPath(); c.arc(ex, ey, 2.6, 0, Math.PI * 2); c.fill();
          for (let h = 0; h < 6; h++) { const b = h * Math.PI / 3; house(ex + Math.cos(b) * 5, ey + Math.sin(b) * 5); }
        }
      });
      c.fillStyle = "#d8d4c8"; c.beginPath(); c.arc(214, 152, 4, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.arc(216, 155, 4, 0, Math.PI * 2); c.fill();   // the water tower
      R(252, 254, 26, 18, "#5a7044"); R(254, 256, 9, 6, "#b7ab92"); R(266, 262, 10, 8, "#b7ab92");                       // Pounceton College
      R(356, 250, 26, 20, "#55693e"); for (let x = 358; x < 380; x += 3) for (let y = 252; y < 268; y += 3) R(x, y, 1, 1.4, "#c9c6bc");   // Whisker Hill Cemetery

      // the Expo: the arena, the halls, the parking lots, the roundabout
      clip(ZP.expo, () => {
        poly(ZP.expo, "#7c7a72");
        for (const [x, y, w, h] of [[110, 92, 46, 26], [196, 70, 30, 30]]) { R(x, y, w, h, "#5e5e5c"); for (let yy = y + 2; yy < y + h; yy += 3) line([[x + 1, yy], [x + w - 1, yy]], 0.4, "#8a8a84"); }
        c.fillStyle = "#d9d6cc"; c.beginPath(); c.ellipse(140, 58, 24, 18, -0.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#4e7a3a"; c.beginPath(); c.ellipse(140, 58, 13, 8, -0.2, 0, Math.PI * 2); c.fill();
        R(174, 30, 44, 30, "#e2e0d8"); for (let x = 178; x < 216; x += 6) R(x, 32, 1, 26, "#bdbab0");
        R(170, 36, 4, 18, "rgba(0,0,0,.25)");
      });

      // the Ranch: fields in a patchwork, the barn, the silos, the freight sheds
      clip(ZP.ranch, () => {
        poly(ZP.ranch, "#8a7c4e");
        for (let i = 0; i < 26; i++) {
          const x = 236 + rnd() * 150, y = 16 + rnd() * 112, w = 18 + rnd() * 26, h = 12 + rnd() * 22, a = (rnd() - 0.5) * 0.3;
          c.save(); c.translate(x, y); c.rotate(a);
          c.fillStyle = pick(["#5d7a3a", "#71883e", "#a49450", "#6a5a38", "#4e6a34", "#8a9a4a"]); c.fillRect(0, 0, w, h);
          c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 0.5; for (let k = 2; k < w; k += 2.5) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, h); c.stroke(); }
          c.restore();
        }
        R(300, 20, 50, 9, "#cfcac0"); R(300, 29, 50, 2, "rgba(0,0,0,.35)");       // Thornback Freight
        R(316, 70, 10, 7, "#8a3a2a"); R(316, 77, 10, 1.5, "rgba(0,0,0,.4)");     // the barn
        for (const x of [330, 335]) { c.fillStyle = "#c8c4ba"; c.beginPath(); c.arc(x, 74, 2.3, 0, Math.PI * 2); c.fill(); }
        line([[300, 128], [300, 80], [320, 76]], 1.2, "#b4a07a");
      });

      // the Vault: the hills keep it; a fence, a road to the door, and the door in the hillside
      clip(ZP.vault, () => { c.fillStyle = "rgba(20,24,30,.18)"; c.fillRect(VX, VY, VW, VH); });
      line(ZP.vault.concat([ZP.vault[0]]), 0.8, "rgba(220,220,210,.5)", [2, 2]);
      line([[176, 214], [150, 220], [124, 214]], 1.1, "#b4a690");
      c.fillStyle = "#5a6070"; c.beginPath(); c.arc(120, 213, 5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#c8ccd4"; c.lineWidth = 0.8; c.beginPath(); c.arc(120, 213, 5, 0, Math.PI * 2); c.stroke();
      for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; R(120 + Math.cos(t) * 5 - 0.8, 213 + Math.sin(t) * 5 - 0.8, 1.6, 1.6, "#c8ccd4"); }

      // the Starport: tarmac to the bay, the pads, the Moonsugar in her cradle, the hangars, a pier
      clip(ZP.starport, () => {
        poly(ZP.starport, "#68686a");
        for (const [x, y] of [[118, 350], [112, 392], [126, 432]]) { c.fillStyle = "#8a8a86"; c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#d8c870"; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.stroke(); line([[x - 4, y], [x + 4, y]], 1, "#d8c870"); }
        R(140, 330, 50, 10, "#55565a");
        c.fillStyle = "#e8e6e0"; c.beginPath(); c.moveTo(142, 335); c.lineTo(178, 331); c.lineTo(186, 335); c.lineTo(178, 339); c.closePath(); c.fill();   // the Moonsugar
        R(180, 332, 5, 6, "#9aa0aa");
        for (let y = 350; y < 470; y += 16) for (let x = 146; x < 190; x += 14) { R(x, y, 10, 11, "#9a9a96"); R(x, y + 11, 10, 2, "rgba(0,0,0,.3)"); }
      });
      R(80, 370, 14, 3, "#8a8070");                                               // a pier into the bay

      // the country round it: a few farms in the hills, and tracks out to them
      for (const [fx, fy, n] of [[430, 30, 6], [420, 560, 5], [250, 590, 4], [-10, -30, 0], [440, 200, 4]]) {
        for (let i = 0; i < n; i++) {
          c.save(); c.translate(fx + (rnd() - 0.5) * 70, fy + (rnd() - 0.5) * 60); c.rotate((rnd() - 0.5) * 0.5);
          c.fillStyle = pick(["#6a7a3e", "#8a8a4a", "#a49452", "#5a6a36"]); c.globalAlpha = 0.85; c.fillRect(0, 0, 14 + rnd() * 18, 10 + rnd() * 14); c.globalAlpha = 1;
          c.restore();
        }
      }
      line([[392, 120], [430, 90], [470, 40]], 0.9, "#b4a07a", [2, 1.5]);
      line([[330, 488], [380, 540], [430, 570]], 0.9, "#b4a07a", [2, 1.5]);

      // the roads over it all: the coast road, the highway, the main road, Downtown's loop, and out of town
      const road = (pts, w) => { line(pts, w + 1.4, "rgba(30,30,32,.75)"); line(pts, w, "#c9c4b6"); };
      road(COAST.map(([x, y]) => [x + 14, y]), 1.6);
      road([[358, 396], [420, 388], [500, 372]], 2.2);
      road([[300, 488], [306, 560], [318, 670]], 2.2);
      road([[196, 670], [196, 500], [196, 470], [192, 400], [198, 332], [196, 304], [188, 258], [178, 200], [170, 150], [170, 122]], 3.2);   // the highway
      road([[192, 398], [300, 396]], 2.2);                                                                                       // west to the Starport
      road([[300, 396], [302, 330], [302, 298], [300, 250], [298, 180], [300, 130], [282, 113], [240, 113], [176, 119]], 2.6); // the Suburbs' main road
      c.strokeStyle = "rgba(30,30,32,.75)"; c.lineWidth = 3.8; c.beginPath(); c.ellipse(300, 396, 58, 44, 0, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = "#c9c4b6"; c.lineWidth = 2.4; c.stroke();
      for (const [x, y] of [[300, 396], [170, 120]]) { c.fillStyle = "#c9c4b6"; c.beginPath(); c.arc(x, y, 4.5, 0, Math.PI * 2); c.fill(); c.fillStyle = "#4f6a3a"; c.beginPath(); c.arc(x, y, 2.2, 0, Math.PI * 2); c.fill(); }

      // the intelligence photograph: a cool cast over the colour, so the zones read on top of it
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = "rgba(12,20,34,.38)"; c.fillRect(0, 0, p.width, p.height);
      return p;
    }

    /* ---- a frame ---- */
    draw(now) {
      const c = this.c, k = this.k, kx = this.kx, ky = this.ky, s = this.s, M = W.M;
      if (!this.plate) this.plate = this.buildPlate();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.cv.width, this.cv.height);
      c.drawImage(this.plate, 0, 0);
      c.setTransform(kx, 0, 0, ky, -VX * kx, -VY * ky);
      const t = (now - this.t0) / 1000, rm = reduced();
      const path = pts => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
      const box = pts => { const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };

      // the Vault: sealed, and not ours to hold yet
      path(ZP.vault); c.fillStyle = "rgba(8,12,20,.35)"; c.fill();

      for (const z of s.zones) {
        const pts = ZP[z.id], C = this.disp[z.id], [x0, y0, x1, y1] = box(pts);
        c.save();
        path(pts); c.clip();
        if (z.lost) {
          c.fillStyle = "rgba(120,16,24,.42)"; c.fillRect(x0, y0, x1 - x0, y1 - y0);
          c.strokeStyle = "rgba(255,69,82,.45)"; c.lineWidth = 3;
          for (let i = x0 - (y1 - y0); i < x1; i += 10) { c.beginPath(); c.moveTo(i, y1); c.lineTo(i + (y1 - y0), y0); c.stroke(); }
        } else {
          c.globalAlpha = z.locked ? 0.4 : 0.16 + 0.08 * Math.min(3, C);
          c.fillStyle = z.locked ? STOPS[4] : gold(C); c.fillRect(x0, y0, x1 - x0, y1 - y0);
          c.globalAlpha = 1;
          if (z.locked) {
            c.strokeStyle = "rgba(255,217,90,.4)"; c.lineWidth = 0.8;
            for (let i = x0 - (y1 - y0); i < x1; i += 7) { c.beginPath(); c.moveTo(i, y1); c.lineTo(i + (y1 - y0), y0); c.moveTo(i, y0); c.lineTo(i + (y1 - y0), y1); c.stroke(); }
          }
        }
        // Cal's front: red over the zone, its edge marching; arriving, it sweeps in from the west
        if (s.cal.zone === z.id) {
          if (this.calIn && this.calIn.id === z.id) { const a = Math.min(1, (now - this.calIn.t) / 900); c.beginPath(); c.rect(x0, y0, (x1 - x0) * (1 - (1 - a) ** 3), y1 - y0); c.clip(); }
          const pulse = rm ? 0.6 : 0.45 + 0.35 * Math.sin(t * 4);
          c.fillStyle = `rgba(255,69,82,${0.16 * pulse + 0.08})`; c.fillRect(x0, y0, x1 - x0, y1 - y0);
          path(pts); c.strokeStyle = `rgba(255,69,82,${0.5 + 0.5 * pulse})`; c.lineWidth = 7; c.setLineDash([4, 4]); c.lineDashOffset = rm ? 0 : -t * 12; c.stroke(); c.setLineDash([]);
        }
        c.restore();

        // the boundary: dark under, the zone's level in gold over; red where it's lost
        const L = M.level(z.C);
        path(pts); c.lineJoin = "round";
        c.strokeStyle = "rgba(6,8,14,.8)"; c.lineWidth = 3.2; c.stroke();
        c.strokeStyle = z.lost ? RED : z.locked ? STOPS[4] : gold(Math.max(0.2, L + 0.5)); c.lineWidth = 1.5; c.stroke();
        if (s.cal.revealed && s.cal.next === z.id && !s.cal.zone) { c.setLineDash([3, 3]); c.strokeStyle = RED; c.lineWidth = 2; c.stroke(); c.setLineDash([]); }
        if (this.ui.hover === z.id && this.ui.sel !== z.id) { c.strokeStyle = "rgba(238,242,248,.9)"; c.lineWidth = 2; c.stroke(); }
        const ch = this.changes[z.id], fa = (now - this.flashT) / 1400;
        if (ch && fa < 1) { c.strokeStyle = ch.up ? `rgba(155,227,106,${1 - fa})` : `rgba(255,69,82,${1 - fa})`; c.lineWidth = 4; c.stroke(); }
      }
      // the selection: the zone's line in Watcher cyan, and Syndicate's brackets round it
      if (this.ui.sel && ZP[this.ui.sel]) {
        const pts = ZP[this.ui.sel], [x0, y0, x1, y1] = box(pts), a = 10, m = 3;
        path(pts); c.strokeStyle = CYAN; c.lineWidth = 2.4; c.stroke();
        c.beginPath();
        for (const [cx, cy, dx, dy] of [[x0 - m, y0 - m, 1, 1], [x1 + m, y0 - m, -1, 1], [x0 - m, y1 + m, 1, -1], [x1 + m, y1 + m, -1, -1]]) { c.moveTo(cx, cy + dy * a); c.lineTo(cx, cy); c.lineTo(cx + dx * a, cy); }
        c.lineWidth = 2.6; c.stroke();
      }

      // leader lines from a zone's pin to its name, where the name sits off the zone
      for (const id of Object.keys(TAG)) {
        const [ax, ay] = AT[id], [tx, ty] = TAG[id];
        if (ax === tx && ay === ty) continue;
        c.strokeStyle = "rgba(6,8,14,.85)"; c.lineWidth = 2.6; c.beginPath(); c.moveTo(ax, ay); c.lineTo(tx, ty); c.stroke();
        c.strokeStyle = "rgba(240,236,224,.9)"; c.lineWidth = 1; c.stroke();
        c.fillStyle = "#f0ece0"; c.fillRect(ax - 2.2, ay - 2.2, 4.4, 4.4);
      }

      // names, levels, what's on offer and what moved, in pixel type on dark tags
      c.setTransform(1, 0, 0, 1, 0, 0);
      // the tags' type: two screen pixels a dot at the least, a little more on a big map
      const pk = Math.max(2 * this.dpr, Math.round(this.dpr * 2 * Math.min(1.4, Math.max(1, k / this.dpr))));
      for (const id of Object.keys(ZP)) {
        const z = s.zones.find(q => q.id === id), ax = TAG[id][0] - VX, ay = TAG[id][1] - VY;
        let sub = null, subCol = "#c3cbdb";
        if (!z) { sub = "SEALED"; subCol = "#8e9ab0"; }
        else if (z.lost) { sub = "LOST"; subCol = RED; }
        else if (z.locked) { sub = "LOCKED"; subCol = STOPS[4]; }
        else {
          const f = M.forecast(s, z), L = M.level(z.C);
          sub = `L${L}` + (f && !f.steady ? (f.lost ? ` ▼${f.days}D` : f.to > L ? ` ▲${f.days}D` : ` ▼${f.days}D`) : "");
          subCol = f && (f.lost || (f.to != null && f.to < L)) ? "#ff8a8f" : f && f.to > L ? "#9be36a" : "#e9d9a8";
        }
        const rows = LABEL[id].map(l => [l, z ? "#f4f1e8" : "#9aa6bd"]).concat([[sub, subCol]]);
        const lh = 9 * pk, bw = Math.max(...rows.map(([l]) => W.pix.width(l, pk))) + 6 * pk, bh = rows.length * lh + 3 * pk;
        const bx = Math.round(ax * kx - bw / 2), by = Math.round(ay * ky - bh / 2);
        c.fillStyle = "rgba(8,11,18,.82)"; c.fillRect(bx, by, bw, bh);
        rows.forEach(([l, col], i) => W.pix.draw(c, l, Math.round(ax * kx - W.pix.width(l, pk) / 2), by + 2 * pk + i * lh, { scale: pk, color: col }));
        if (!z) continue;
        // offers: a count on the tag's top-right corner, red when one can't wait
        const offers = s.offers.filter(o => o.zone === id), n = offers.length;
        if (n) {
          const urgent = offers.some(o => o.kind === "cal" || o.kind === "siege" || o.expires <= s.day);
          const txt = String(n), tw = W.pix.width(txt, pk) + 6 * pk, th = 11 * pk, rx = bx + bw - pk, ry = by - Math.round(th / 2);
          c.fillStyle = urgent ? RED : "#ff9a2e"; c.fillRect(rx, ry, tw, th);
          W.pix.draw(c, txt, rx + 3 * pk, ry + 2 * pk, { scale: pk, color: "#140a04" });
        }
        // what the dispatch moved: a tag over the name, until the next action
        const ch = this.changes[id];
        if (ch) {
          const tw = W.pix.width(ch.text, pk) + 6 * pk, th = 11 * pk, rx = bx - Math.round(tw / 3), ry = by - th - pk;
          c.fillStyle = ch.up ? "#9be36a" : "#ff4552"; c.fillRect(rx, ry, tw, th);
          W.pix.draw(c, ch.text, rx + 3 * pk, ry + 2 * pk, { scale: pk, color: ch.up ? "#0d1f06" : "#ffffff" });
        }
      }
    }
  }
  CityMap.gold = gold;
  CityMap.STOPS = STOPS;
  W.CityMap = CityMap;
})();
