/* Art for the command screens, drawn in the page.
 *
 *   W.drawWatcherFigure(ctx, look, w, h, mods)  a Watcher, head to boots, for
 *     the Clinic: the coat, the visor, and each fitted mod lit in cyan. Returns
 *     each body part's anchor, in canvas pixels, for the slots' leader lines.
 *   W.drawOffice(ctx, w, h)  Casey Benton's penthouse at the top of PVN Tower:
 *     the window, PumaCity at dusk below it, and the Boss in her chair with
 *     her back to you. */
"use strict";

W.drawWatcherFigure = (c, look, w, h, mods = {}) => {
  const k = Math.min(w / 200, h / 300), ox = (w - 200 * k) / 2, oy = (h - 300 * k) / 2;
  const P = (x, y) => [ox + x * k, oy + y * k];
  c.clearRect(0, 0, w, h);
  c.save();
  c.translate(ox, oy); c.scale(k, k);
  const CY = "#5ff0ff", lit = v => v > 0;
  const poly = (pts, f) => { c.fillStyle = f; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
  // the floor and its shadow
  c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(100, 288, 54, 7, 0, 0, Math.PI * 2); c.fill();
  // the tail, behind
  c.strokeStyle = W.shade(look.fur, 0.85); c.lineWidth = 9; c.lineCap = "round";
  c.beginPath(); c.moveTo(128, 236); c.bezierCurveTo(168, 246, 178, 214, 166, 190); c.stroke();
  // legs and boots
  c.fillStyle = look.legs; c.fillRect(78, 222, 17, 56); c.fillRect(105, 222, 17, 56);
  c.fillStyle = "#07090f"; c.fillRect(74, 272, 23, 12); c.fillRect(103, 272, 23, 12);
  if (lit(mods.legs)) { c.fillStyle = CY; for (const x of [80, 107]) { c.fillRect(x, 244, 13, 2); if (mods.legs > 1) c.fillRect(x, 252, 13, 2); if (mods.legs > 2) c.fillRect(x, 260, 13, 2); } }
  // the long coat
  poly([[62, 112], [138, 112], [152, 252], [104, 252], [100, 170], [96, 252], [48, 252]], look.coat);
  poly([[100, 120], [104, 252], [96, 252]], W.shade(look.coat, 0.7));
  c.strokeStyle = look.trim || CY; c.lineWidth = 1.5; c.globalAlpha = 0.7;
  c.beginPath(); c.moveTo(48, 252); c.lineTo(96, 252); c.moveTo(104, 252); c.lineTo(152, 252); c.stroke(); c.globalAlpha = 1;
  // chest plate and heart core under the open collar
  if (lit(mods.chest)) { c.fillStyle = "#1a2a3a"; c.fillRect(82, 122, 36, 30); c.strokeStyle = CY; c.lineWidth = 1.2; c.strokeRect(82, 122, 36, 30); for (let i = 1; i < mods.chest + 1; i++) c.fillStyle = CY, c.fillRect(86, 124 + i * 7, 28, 1.5); }
  if (lit(mods.heart)) { c.fillStyle = CY; c.globalAlpha = 0.35 + 0.2 * mods.heart; c.beginPath(); c.arc(110, 140, 5 + mods.heart, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; c.fillStyle = "#e9ffff"; c.beginPath(); c.arc(110, 140, 2.5, 0, Math.PI * 2); c.fill(); }
  // sleeves and paws
  poly([[62, 112], [48, 120], [40, 214], [56, 216], [66, 140]], W.shade(look.coat, 1.15));
  poly([[138, 112], [152, 120], [160, 214], [144, 216], [134, 140]], W.shade(look.coat, 1.15));
  c.fillStyle = look.fur; c.beginPath(); c.arc(48, 222, 8, 0, Math.PI * 2); c.arc(152, 222, 8, 0, Math.PI * 2); c.fill();
  if (lit(mods.arms)) { c.fillStyle = CY; for (const x of [42, 146]) { for (let i = 0; i < mods.arms; i++) c.fillRect(x, 180 + i * 8, 12, 2); } }
  // the high collar
  poly([[66, 112], [84, 92], [100, 118], [116, 92], [134, 112], [100, 128]], W.shade(look.coat, 1.35));
  // the head: the portrait's, larger
  c.save(); c.translate(100, 76); c.scale(2.1, 2.1);
  c.fillStyle = look.fur;
  c.beginPath(); c.ellipse(0, -4, 13, 12, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(-12, -9); c.lineTo(-11, -25); c.lineTo(-2, -15); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(12, -9); c.lineTo(11, -25); c.lineTo(2, -15); c.closePath(); c.fill();
  c.fillStyle = W.shade(look.fur, 0.6);
  c.beginPath(); c.moveTo(-10, -11); c.lineTo(-10, -20); c.lineTo(-5, -14); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(10, -11); c.lineTo(10, -20); c.lineTo(5, -14); c.closePath(); c.fill();
  if (look.patch) { c.fillStyle = look.patch; c.beginPath(); c.ellipse(-6, -8, 6, 5, 0.4, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = W.shade(look.fur, 1.25); c.beginPath(); c.ellipse(0, 2, 6, 4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#2a1a1e"; c.fillRect(-1, 0, 2, 2);
  c.fillStyle = "#0a0c14"; c.fillRect(-12, -8, 24, 5);
  c.fillStyle = look.visor || CY; c.fillRect(-11, -7, 22, lit(mods.eyes) ? 3 : 2);
  if (mods.eyes > 1) { c.fillStyle = "#e9ffff"; c.fillRect(-7, -7, 2, 2); c.fillRect(5, -7, 2, 2); }
  if (lit(mods.brain)) { c.strokeStyle = CY; c.lineWidth = 0.6; c.beginPath(); for (let i = 0; i < mods.brain + 1; i++) { c.moveTo(-6 + i * 4, -15); c.lineTo(-6 + i * 4, -11); c.lineTo(-4 + i * 4, -11); } c.stroke(); }
  c.strokeStyle = "rgba(220,230,255,.5)"; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(-5, 2); c.lineTo(-16, 0); c.moveTo(-5, 3); c.lineTo(-16, 4); c.moveTo(5, 2); c.lineTo(16, 0); c.moveTo(5, 3); c.lineTo(16, 4); c.stroke();
  c.restore();
  c.restore();
  // the left-hand slots point at the left of the figure, the right-hand ones at the right
  return { brain: P(90, 44), eyes: P(84, 64), arms: P(46, 192), heart: P(110, 140), chest: P(120, 126), legs: P(120, 256) };
};

W.drawOffice = (c, w, h) => {
  c.clearRect(0, 0, w, h);
  // the sky over PumaCity at dusk: late-90s California, not neon
  const sky = c.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, "#1b2340"); sky.addColorStop(0.55, "#4a3a5a"); sky.addColorStop(0.85, "#c8743c"); sky.addColorStop(1, "#e8a24a");
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // the city below the window: office parks, the Starport's ship far off, lit windows
  let r = 7;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const base = h * 0.72;
  c.fillStyle = "#2a2438"; for (let x = 0; x < w; x += 18) { const bh = 20 + rnd() * 40; c.fillRect(x, base - bh, 16, bh); }
  c.fillStyle = "#1a1626"; for (let x = 6; x < w; x += 26) { const bh = 30 + rnd() * 70; c.fillRect(x, base - bh, 22, bh); for (let y = base - bh + 6; y < base - 4; y += 8) for (let xx = x + 3; xx < x + 20; xx += 6) if (rnd() < 0.35) { c.fillStyle = "#f2c26a"; c.fillRect(xx, y, 2, 3); c.fillStyle = "#1a1626"; } }
  c.fillStyle = "#3a3450"; c.beginPath(); c.moveTo(w * 0.08, base - 34); c.lineTo(w * 0.24, base - 40); c.lineTo(w * 0.27, base - 34); c.lineTo(w * 0.08, base - 30); c.closePath(); c.fill();
  c.fillStyle = "#0e0c16"; c.fillRect(0, base, w, h - base);
  // the window's frame and mullions
  c.fillStyle = "#07060c";
  c.fillRect(0, 0, w, 10); c.fillRect(0, 0, 10, h); c.fillRect(w - 10, 0, 10, h);
  for (let i = 1; i < 4; i++) c.fillRect(Math.round(w * i / 4) - 3, 0, 6, base);
  c.fillRect(0, base - 2, w, 6);
  // the desk lamp's pool, and the desk
  const lamp = c.createRadialGradient(w * 0.78, h * 0.86, 4, w * 0.78, h * 0.86, w * 0.35);
  lamp.addColorStop(0, "rgba(255,190,110,.55)"); lamp.addColorStop(1, "rgba(255,190,110,0)");
  c.fillStyle = lamp; c.fillRect(0, 0, w, h);
  c.fillStyle = "#0b0a10"; c.fillRect(w * 0.12, h * 0.86, w * 0.76, h * 0.14);
  c.fillStyle = "#2a2018"; c.fillRect(w * 0.12, h * 0.86, w * 0.76, 3);
  c.fillStyle = "#14110c"; c.fillRect(w * 0.76, h * 0.74, 4, h * 0.12); c.fillRect(w * 0.72, h * 0.72, w * 0.1, 6);
  // the Boss: a high-backed chair, and her outline against the window
  const cx = w * 0.46, cy = h * 0.62;
  c.fillStyle = "#06050a";
  c.beginPath(); c.moveTo(cx - 46, h * 0.86); c.lineTo(cx - 40, cy - 70); c.quadraticCurveTo(cx, cy - 90, cx + 40, cy - 70); c.lineTo(cx + 46, h * 0.86); c.closePath(); c.fill();
  c.fillStyle = "#0c0a12";
  c.beginPath(); c.ellipse(cx, cy - 74, 17, 15, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(cx - 13, cy - 88, 6, 8, -0.4, 0, Math.PI * 2); c.ellipse(cx + 13, cy - 88, 6, 8, 0.4, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "rgba(232,162,74,.55)"; c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(cx, cy - 74, 17, 15, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  // a thin curl of smoke from the ashtray
  c.strokeStyle = "rgba(220,220,230,.25)"; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(w * 0.6, h * 0.85); c.bezierCurveTo(w * 0.58, h * 0.78, w * 0.63, h * 0.74, w * 0.6, h * 0.66); c.stroke();
};
