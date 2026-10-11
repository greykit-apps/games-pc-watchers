/* The command screens' pixel type: a 5x7 bitmap font, drawn in the page.
 * Capitals only (lower case is drawn as capitals), proportional: each glyph
 * is as wide as its ink. Used for headings, the screen bar and the LCD
 * readouts; the data stays in the system face.
 *
 *   W.pix.draw(ctx, text, x, y, { scale, color, shadow, ghost })
 *   W.pix.width(text, scale)
 *   W.pix.html(text, cls)   a heading: real text for readers, a canvas for eyes
 *   W.pix.paint(root)       fills every canvas W.pix.html made under root
 *
 * Icons for the screen bar are 9x9 bitmaps in the same spirit (W.pix.icon). */
"use strict";

(() => {
  const G = {};
  const def = (chars, rows) => { const list = rows.trim().split(/\s+/); [...chars].forEach((ch, i) => { G[ch] = list.slice(i * 7, i * 7 + 7); }); };
  def("ABCDEFGH", `
    01110 10001 10001 11111 10001 10001 10001   11110 10001 10001 11110 10001 10001 11110
    01110 10001 10000 10000 10000 10001 01110   11110 10001 10001 10001 10001 10001 11110
    11111 10000 10000 11110 10000 10000 11111   11111 10000 10000 11110 10000 10000 10000
    01110 10001 10000 10111 10001 10001 01111   10001 10001 10001 11111 10001 10001 10001`);
  def("IJKLMNOP", `
    01110 00100 00100 00100 00100 00100 01110   00111 00010 00010 00010 00010 10010 01100
    10001 10010 10100 11000 10100 10010 10001   10000 10000 10000 10000 10000 10000 11111
    10001 11011 10101 10101 10001 10001 10001   10001 10001 11001 10101 10011 10001 10001
    01110 10001 10001 10001 10001 10001 01110   11110 10001 10001 11110 10000 10000 10000`);
  def("QRSTUVWX", `
    01110 10001 10001 10001 10101 10010 01101   11110 10001 10001 11110 10100 10010 10001
    01111 10000 10000 01110 00001 00001 11110   11111 00100 00100 00100 00100 00100 00100
    10001 10001 10001 10001 10001 10001 01110   10001 10001 10001 10001 10001 01010 00100
    10001 10001 10001 10101 10101 10101 01010   10001 10001 01010 00100 01010 10001 10001`);
  def("YZ012345", `
    10001 10001 01010 00100 00100 00100 00100   11111 00001 00010 00100 01000 10000 11111
    01110 10001 10011 10101 11001 10001 01110   00100 01100 00100 00100 00100 00100 01110
    01110 10001 00001 00010 00100 01000 11111   11111 00010 00100 00010 00001 10001 01110
    00010 00110 01010 10010 11111 00010 00010   11111 10000 11110 00001 00001 10001 01110`);
  def("6789.,:'", `
    00110 01000 10000 11110 10001 10001 01110   11111 00001 00010 00100 01000 01000 01000
    01110 10001 10001 01110 10001 10001 01110   01110 10001 10001 01111 00001 00010 01100
    00000 00000 00000 00000 00000 01100 01100   00000 00000 00000 00000 01100 00100 01000
    00000 01100 01100 00000 01100 01100 00000   00100 00100 01000 00000 00000 00000 00000`);
  def("!?/-+$%(", `
    00100 00100 00100 00100 00100 00000 00100   01110 10001 00001 00010 00100 00000 00100
    00001 00010 00010 00100 01000 01000 10000   00000 00000 00000 01110 00000 00000 00000
    00000 00100 00100 11111 00100 00100 00000   00100 01111 10100 01110 00101 11110 00100
    11001 11010 00010 00100 01000 01011 10011   00010 00100 01000 01000 01000 00100 00010`);
  def(")&#×<>=·", `
    01000 00100 00010 00010 00010 00100 01000   01100 10010 10100 01000 10101 10010 01101
    01010 01010 11111 01010 11111 01010 01010   00000 10001 01010 00100 01010 10001 00000
    00010 00100 01000 10000 01000 00100 00010   01000 00100 00010 00001 00010 00100 01000
    00000 00000 11111 00000 11111 00000 00000   00000 00000 00000 01100 01100 00000 00000`);
  def("→▲▼", `
    00000 00100 00010 11111 00010 00100 00000   00000 00100 01110 11111 00000 00000 00000
    00000 00000 11111 01110 00100 00000 00000`);
  def("■◂▸", `
    00000 00000 01110 01110 01110 00000 00000   00000 00010 00110 01110 00110 00010 00000
    00000 01000 01100 01110 01100 01000 00000`);

  // each glyph's ink columns, so the face is proportional; a space is three wide
  const span = {};
  for (const [ch, rows] of Object.entries(G)) {
    let lo = 5, hi = -1;
    for (const r of rows) for (let x = 0; x < 5; x++) if (r[x] === "1") { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    span[ch] = hi < 0 ? [0, 2] : [lo, hi];
  }
  const glyph = ch => G[ch] ? ch : G[ch.toUpperCase()] ? ch.toUpperCase() : null;
  const adv = ch => { const g = glyph(ch); if (!g) return ch === " " ? 3 : 4; const [lo, hi] = span[g]; return hi - lo + 2; };

  const width = (text, scale = 1) => Math.max(0, [...String(text)].reduce((t, ch) => t + adv(ch), 0) - 1) * scale;

  const draw = (c, text, x, y, o = {}) => {
    const k = o.scale || 2, col = o.color || "#eef2f8";
    const ink = (dx, dy, fill) => {
      let cx = x;
      c.fillStyle = fill;
      for (const ch of String(text)) {
        const g = glyph(ch);
        if (g) {
          const [lo] = span[g], rows = o.ghost && /[0-9]/.test(ch) ? null : G[g];
          if (rows) rows.forEach((r, ry) => { for (let rx = 0; rx < 5; rx++) if (r[rx] === "1") c.fillRect(cx + (rx - lo + dx) * k, y + (ry + dy) * k, k, k); });
        }
        cx += adv(ch) * k;
      }
    };
    // an LCD's unlit segments: an 8 behind every digit
    if (o.ghost) {
      let cx = x;
      c.fillStyle = o.ghost;
      for (const ch of String(text)) {
        if (/[0-9]/.test(ch)) { const [lo] = span["8"]; G["8"].forEach((r, ry) => { for (let rx = 0; rx < 5; rx++) if (r[rx] === "1") c.fillRect(cx + (rx - lo) * k, y + ry * k, k, k); }); }
        cx += adv(ch) * k;
      }
      // then the lit digits over them, and everything else as usual
      let dx = x;
      c.fillStyle = col;
      for (const ch of String(text)) {
        const g = glyph(ch);
        if (g) { const [lo] = span[g]; G[g].forEach((r, ry) => { for (let rx = 0; rx < 5; rx++) if (r[rx] === "1") c.fillRect(dx + (rx - lo) * k, y + ry * k, k, k); }); }
        dx += adv(ch) * k;
      }
      return;
    }
    if (o.shadow) ink(1, 1, o.shadow);
    ink(0, 0, col);
  };

  // a heading: the words for screen readers and copying, a canvas drawn over them for the eye
  const html = (text, cls = "", scale = 2) =>
    `<span class="px ${cls}" data-px="${W.esc(text)}" data-pxk="${scale}"><span class="sr">${W.esc(text)}</span><canvas aria-hidden="true"></canvas></span>`;

  const paint = root => {
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    root.querySelectorAll(".px[data-px]").forEach(el => {
      const cv = el.querySelector("canvas"), text = el.dataset.px, k = +el.dataset.pxk || 2;
      const cs = getComputedStyle(el), col = cs.color, sh = cs.getPropertyValue("--px-shadow").trim();
      const ghost = cs.getPropertyValue("--px-ghost").trim();
      const w = width(text, k) + (sh ? k : 0), h = 7 * k + (sh ? k : 0);
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
      const c = cv.getContext("2d");
      c.scale(dpr, dpr);
      draw(c, text, 0, 0, { scale: k, color: col, shadow: ghost ? null : sh || null, ghost: ghost || null });
    });
  };

  /* 9x9 icons for the screen bar */
  const ICONS = {
    city: ["111101111", "100101001", "100101001", "111111111", "001010100", "001010100", "111111111", "100101001", "111101111"],
    lab: ["001111100", "000101000", "000101000", "000101000", "001000100", "010000010", "011111110", "111111111", "011111110"],
    clinic: ["100000001", "110000011", "111111111", "101111101", "111111111", "110111011", "011111110", "001111100", "000111000"],
    office: ["000111000", "000101000", "000111000", "001111100", "001010100", "001111100", "001010100", "011111110", "111111111"],
  };
  const icon = (c, id, x, y, k, col) => {
    c.fillStyle = col;
    (ICONS[id] || []).forEach((r, ry) => { for (let rx = 0; rx < 9; rx++) if (r[rx] === "1") c.fillRect(x + rx * k, y + ry * k, k, k); });
  };

  W.pix = { draw, width, html, paint, icon };
})();
