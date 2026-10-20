/* PumaCity: Watchers -- shared helpers. Everything hangs off one global, W,
 * so the game runs from classic <script> tags with no build step and opens
 * straight from disk. */
"use strict";
const W = window.W = {};

/* ---- the isometric projection ----
 * World units are tiles: x runs down-right on screen, y down-left, z is up in
 * screen pixels. One tile is TW x TH on the ground; a storey is ZH tall. */
W.TW = 32; W.TH = 16; W.ZH = 14;
W.HTW = W.TW / 2; W.HTH = W.TH / 2;
W.proj = (x, y, z = 0) => [(x - y) * W.HTW, (x + y) * W.HTH - z];
/* screen (already offset by the camera) -> ground-plane world */
W.unproj = (sx, sy) => {
  const a = sx / W.HTW, b = sy / W.HTH;
  return [(a + b) / 2, (b - a) / 2];
};

/* ---- maths ---- */
W.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
W.lerp = (a, b, t) => a + (b - a) * t;
W.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
W.angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

/* A small seeded PRNG (mulberry32) for anything that must look the same every
 * time -- window patterns, level dressing. Live play uses Math.random. */
W.rng = seed => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
W.hash2 = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
W.rand = (a, b) => a + Math.random() * (b - a);
W.randi = (a, b) => Math.floor(W.rand(a, b + 1));
W.pick = arr => arr[Math.floor(Math.random() * arr.length)];
W.chance = p => Math.random() < p;

W.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* colour helpers for shading faces */
W.shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const r = W.clamp(Math.round(((n >> 16) & 255) * f), 0, 255);
  const g = W.clamp(Math.round(((n >> 8) & 255) * f), 0, 255);
  const b = W.clamp(Math.round((n & 255) * f), 0, 255);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
};
W.rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

W.canvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
};

/* ---- storage: every key starts pcwatchers_ ---- */
W.store = {
  get(k, d) { try { const v = localStorage.getItem("pcwatchers_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("pcwatchers_" + k, JSON.stringify(v)); } catch (e) { /* no storage */ } },
  forget() {
    for (const area of ["localStorage", "sessionStorage"]) {
      try {
        const s = window[area];
        for (let i = s.length - 1; i >= 0; i--) { const k = s.key(i); if (k && k.startsWith("pcwatchers")) s.removeItem(k); }
      } catch (e) { /* no storage */ }
    }
  }
};

/* the player's preferences, read once */
W.prefs = Object.assign({ muted: false, rain: true, edge: true, scale: 0 }, W.store.get("prefs_v1", {}));
// Music on or off, apart from Sound (games-meta §14): its own key, "1" or "0"
W.prefs.music = W.store.get("music_v1", 1) !== 0;
W.savePrefs = () => { const { music, ...p } = W.prefs; W.store.set("prefs_v1", p); };
