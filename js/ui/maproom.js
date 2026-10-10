/* The Map Room: every district of PumaCity, each one map, with the mission a
 * seed would make there. Pick a landmark to put the target in it, or leave
 * it to chance. Shuffle for another; fly over the place with its crowd and
 * traffic; or brief and play it as a skirmish. The whole district is always
 * the playing field. */
"use strict";

W.MapRoom = class {
  constructor(game) {
    this.game = game;
    const last = W.store.get("maproom_v1", {});
    this.district = last.district && W.DISTRICTS[last.district] ? last.district : Object.keys(W.DISTRICTS)[0];
    this.landmark = last.landmark || null;
    this.seed = Math.floor(Math.random() * 1e6);
  }
  open() {
    this.el = document.createElement("div");
    this.el.className = "mr";
    this.el.setAttribute("role", "main"); this.el.setAttribute("aria-label", "Map room");
    this.el.addEventListener("click", ev => this.onClick(ev));
    document.body.appendChild(this.el);
    this.draw();
  }
  close() { this.stopFly(); if (this.el) { this.el.remove(); this.el = null; } }

  level() {
    try { return W.missionLevel({ district: this.district, landmark: this.landmark, seed: this.seed }); }
    catch (e) { return null; }
  }

  draw() {
    const d = W.DISTRICTS[this.district];
    const marks = W.landmarks(d.id);
    if (this.landmark && !marks.includes(this.landmark)) this.landmark = null;
    W.store.set("maproom_v1", { district: this.district, landmark: this.landmark });
    const L = this.level();
    const m = W.districtMap(d.id);
    this.el.innerHTML = `
      <header class="ow-head">
        <div class="ow-brand"><span class="tag">PumaCity</span><h1>Map room</h1></div>
        <div class="ow-acts" style="margin-left:auto">
          <button data-a="plaza"><kbd>P</kbd>Market Plaza</button>
          <button data-a="title"><kbd>Esc</kbd>Title</button>
        </div>
      </header>
      <div class="mr-body">
        <nav class="mr-list" aria-label="Districts">${Object.values(W.DISTRICTS).map(D => `
          <div class="mr-d${D.id === this.district ? " on" : ""}"><button data-a="district" data-d="${D.id}" aria-pressed="${D.id === this.district}"><b>${W.esc(D.name)}</b><small>${D.w}×${D.h} tiles</small></button>
          ${D.id === this.district ? `<button class="sec" data-a="landmark" data-l="" aria-pressed="${!this.landmark}">Anywhere<small>target at any landmark</small></button>` + marks.map(n => `<button class="sec" data-a="landmark" data-l="${W.esc(n)}" aria-pressed="${n === this.landmark}">${W.esc(n)}</button>`).join("") : ""}</div>`).join("")}
        </nav>
        <section class="mr-map">
          <canvas data-map width="560" height="560"></canvas>
          <div class="legend"><span><i style="background:#54f2ff"></i>squad drops in</span><span><i style="background:#ffb000"></i>target</span><span><i style="background:#ff5266"></i>target runs for</span><span>faint dots: every other spot</span></div>
        </section>
        <aside class="mr-info">
          <h2>${W.esc(d.name)}</h2>
          <p>${W.esc(d.blurb)}</p>
          <table>
            <tr><td>Size</td><td>${m.w} × ${m.h} tiles</td></tr>
            <tr><td>Points</td><td>${m.points.spawn.length} drop points, ${m.points.target.length} target spots in ${marks.length} landmarks, ${m.points.exit.length} ways out</td></tr>
            <tr><td>Security</td><td>${W.esc(d.names.sec)}</td></tr>
            <tr><td>Crew</td><td>${W.esc(d.names.crew)}</td></tr>
          </table>
          ${L ? `<h3>Mission ${this.seed}</h3>
          <table>
            <tr><td>Operation</td><td>${W.esc(L.codename)}</td></tr>
            <tr><td>Target</td><td>${W.esc(L.names.target)}, at ${W.esc(L.picks.target.name)}</td></tr>
            <tr><td>Drop</td><td>${W.esc(L.picks.spawn.name)}</td></tr>
            <tr><td>Escape</td><td>${L.picks.exit ? W.esc(L.picks.exit.name) : "nowhere to run"}</td></tr>
            <tr><td>Distance</td><td>${Math.round(W.dist(L.picks.spawn.x, L.picks.spawn.y, L.picks.target.x, L.picks.target.y))} tiles to the target</td></tr>
          </table>` : `<p class="note">No mission can be made here.</p>`}
          <div class="col">
            <button class="primary" data-a="play" ${L ? "" : "disabled"}><kbd>Enter</kbd>Brief &amp; play</button>
            <button data-a="shuffle"><kbd>S</kbd>Shuffle the mission</button>
            <button data-a="fly"><kbd>F</kbd>Fly over</button>
          </div>
        </aside>
      </div>`;
    this.drawMap(d, L);
  }

  /* the whole district, top-down, with the mission on it */
  drawMap(d, L) {
    const cv = this.el.querySelector("[data-map]"), c = cv.getContext("2d");
    const full = W.districtMap(d.id);
    const stub = { map: full, units: [], cars: [], items: [], selected: new Set(), time: 0, cam: { x: 0, y: 0 } };
    const R = this.game.renderer;
    R.scanner(c, stub, { full: true, noView: true });
    const P = (x, y) => R.scanPoint(x, y);
    const dot = (p, col, r) => { const [x, y] = P(p.x, p.y); c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
    for (const p of full.points.spawn) dot(p, "rgba(84,242,255,.35)", 2);
    for (const p of full.points.target) dot(p, this.landmark && W.areaOf(d.id, p) === this.landmark ? "rgba(255,176,0,.8)" : "rgba(255,176,0,.3)", 2);
    for (const p of full.points.exit) dot(p, "rgba(255,82,102,.35)", 2);
    if (!L) return;
    const { spawn, target, exit } = L.picks;
    const [sx, sy] = P(spawn.x, spawn.y), [tx, ty] = P(target.x, target.y);
    c.strokeStyle = "rgba(84,242,255,.5)"; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(sx, sy); c.lineTo(tx, ty); c.stroke();
    if (exit) { const [ex, ey] = P(exit.x, exit.y); c.strokeStyle = "rgba(255,82,102,.5)"; c.beginPath(); c.moveTo(tx, ty); c.lineTo(ex, ey); c.stroke(); }
    c.setLineDash([]);
    dot(spawn, "#54f2ff", 5);
    c.fillStyle = "#ffb000"; c.beginPath(); c.moveTo(tx, ty - 7); c.lineTo(tx + 7, ty); c.lineTo(tx, ty + 7); c.lineTo(tx - 7, ty); c.closePath(); c.fill();
    if (exit) { const [ex, ey] = P(exit.x, exit.y); c.strokeStyle = "#ff5266"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(ex - 5, ey - 5); c.lineTo(ex + 5, ey + 5); c.moveTo(ex + 5, ey - 5); c.lineTo(ex - 5, ey + 5); c.stroke(); }
  }

  onClick(ev) {
    const b = ev.target.closest("button");
    if (!b || b.disabled) return;
    const a = b.dataset.a;
    W.audio.play("click");
    if (a === "district") { this.district = b.dataset.d; this.landmark = null; this.draw(); }
    if (a === "landmark") { this.landmark = b.dataset.l || null; this.draw(); }
    if (a === "shuffle") { this.seed = Math.floor(Math.random() * 1e6); this.draw(); }
    if (a === "play") this.play();
    if (a === "fly") this.fly();
    if (a === "plaza") { this.game.fromMapRoom = true; this.game.toBriefing(null, W.LEVELS.plaza); }
    if (a === "title") this.game.toTitle();
    if (a === "back") this.stopFly();
  }
  play() { const L = this.level(); if (L) { this.game.fromMapRoom = true; this.game.toBriefing(null, L); } }
  onKey(k, ev) {
    if (this.flyEl) {
      if (k === "escape") { this.stopFly(); return true; }
      if (k === "r") { this.openAll = !this.openAll; return true; }
      if (["w", "a", "s", "d", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(k)) { this.keys.add(k); return true; }
      return false;
    }
    if (k === "escape") { this.game.toTitle(); return true; }
    if (k === "enter") { this.play(); return true; }
    if (k === "s") { this.seed = Math.floor(Math.random() * 1e6); this.draw(); return true; }
    if (k === "f") { this.fly(); return true; }
    if (k === "p") { this.game.fromMapRoom = true; this.game.toBriefing(null, W.LEVELS.plaza); return true; }
    return false;
  }

  /* ---- fly over: the district live, with nobody to shoot ---- */
  fly() {
    const L = this.level();
    if (!L) return;
    const el = this.flyEl = document.createElement("div");
    el.className = "fly";
    el.innerHTML = `<canvas data-v></canvas><canvas class="fly-scan" data-s width="220" height="220"></canvas>
      <div class="fly-bar"><b>${W.esc(W.DISTRICTS[this.district].name)}</b><span>WASD or drag to look around · wheel for pixel size · click the scanner to jump · <kbd>R</kbd> roofs off</span><button data-a="back"><kbd>Esc</kbd>Back</button></div>`;
    el.addEventListener("click", ev => { const b = ev.target.closest("button"); if (b) this.stopFly(); });
    document.body.appendChild(el);
    const world = this.flyWorld = new W.World(L, { attract: true });
    this.openAll = false;
    const R = this.flyR = new W.Renderer(el.querySelector("[data-v]"), null);
    let scale = 2;
    const size = () => R.resize(window.innerWidth, window.innerHeight, scale);
    size();
    this.onResize = size; window.addEventListener("resize", size);
    R.centerOn(world, L.picks.target.x, L.picks.target.y);
    this.keys = new Set();
    this.onKeyUp = ev => this.keys.delete(ev.key.toLowerCase());
    window.addEventListener("keyup", this.onKeyUp);
    const v = el.querySelector("[data-v]");
    let drag = null;
    v.addEventListener("pointerdown", ev => { drag = { x: ev.clientX, y: ev.clientY, cx: world.cam.x, cy: world.cam.y }; v.setPointerCapture(ev.pointerId); });
    v.addEventListener("pointermove", ev => { if (drag) { world.cam.x = drag.cx - (ev.clientX - drag.x) / scale; world.cam.y = drag.cy - (ev.clientY - drag.y) / scale; R.clamp(world); } });
    v.addEventListener("pointerup", () => { drag = null; });
    v.addEventListener("wheel", ev => { ev.preventDefault(); const c = R.viewCenter(world); scale = W.clamp(scale + (ev.deltaY < 0 ? 1 : -1), 1, 4); size(); R.centerOn(world, c[0], c[1]); }, { passive: false });
    const sc = el.querySelector("[data-s]");
    sc.addEventListener("click", ev => { const r = sc.getBoundingClientRect(); const [x, y] = R.scanToWorld((ev.clientX - r.left) * sc.width / r.width, (ev.clientY - r.top) * sc.height / r.height); R.centerOn(world, x, y); });
    let last = performance.now();
    const loop = now => {
      if (!this.flyEl) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const sp = 500 * dt / scale;
      let dx = 0, dy = 0;
      if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= sp;
      if (this.keys.has("d") || this.keys.has("arrowright")) dx += sp;
      if (this.keys.has("w") || this.keys.has("arrowup")) dy -= sp;
      if (this.keys.has("s") || this.keys.has("arrowdown")) dy += sp;
      if (dx || dy) { world.cam.x += dx; world.cam.y += dy; R.clamp(world); }
      world.update(dt);
      R.frame(world, dt, { openAll: this.openAll });
      R.scanner(sc.getContext("2d"), world, { full: true, noCiv: false });
      this.flyRAF = requestAnimationFrame(loop);
    };
    this.flyRAF = requestAnimationFrame(loop);
  }
  stopFly() {
    if (!this.flyEl) return;
    cancelAnimationFrame(this.flyRAF);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keyup", this.onKeyUp);
    this.flyEl.remove(); this.flyEl = null; this.flyWorld = null;
  }
};
