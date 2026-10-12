/* PumaCity: Watchers -- the screens and the controls. Boot (the greykit.games
 * canon), title over a live plaza, the overworld (campaign), the briefing,
 * the mission, the debrief. */
"use strict";

const Game = W.game = {
  mode: "boot",
  world: null,
  level: W.LEVELS.plaza,
  paused: false,
  keys: new Set(),
  ui: { mouseIn: false, x: 0, y: 0, drag: null, hover: null, rightHeld: false, pan: null },

  /* ---------------- boot and title ---------------- */
  start() {
    injectTitleCSS();
    this.view = document.getElementById("view");
    this.renderer = new W.Renderer(document.getElementById("cv"), document.getElementById("ov"));
    this.hud = new W.HUD(document.getElementById("hud"), this);
    this.bindInput();
    window.addEventListener("resize", () => this.resize());
    const boot = runBoot({ lines: [bootReloadLine(), "plotting Market Plaza", "waking the Watchers"] });
    this.toTitle(false);
    boot.finish(["four agents on standby", "Casey Benton is waiting"]).then(() => this.titleUI && this.titleUI.reveal());
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      this.tick(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  toTitle(reveal = true) {
    this.mode = "title";
    this.closeSheets();
    if (this.mr) { this.mr.close(); this.mr = null; }
    this.fromMapRoom = false;
    if (this.ow) { this.ow.close(); this.ow = null; }
    document.getElementById("game").hidden = true;
    W.audio.ambience(false);
    const host = document.getElementById("title-host");
    host.hidden = false;
    if (this.titleUI) this.titleUI.unmount();
    this.titleUI = mountTitle(host, {
      name: "Watchers",
      primary: W.M.load() ? "resume" : "new",
      items: [
        (c => c && { act: "resume", label: "Resume campaign", key: "R", meta: `Day ${c.day} · ${W.money(c.cash)}${c.war ? " · at war" : ""}` })(W.M.load()),
        { act: "new", label: "New campaign", key: "N", meta: "four Watchers, eight zones, one Cal" },
        { act: "skirmish", label: "Skirmish", key: "K", meta: "any district, nothing saved" },
        "gap",
        { act: "settings", label: "Settings", key: "S" },
        { act: "help", label: "Help", key: "?" },
        { act: "about", label: "About", key: "A" },
      ],
      scene: el => this.mountScene(el),
      help: this.helpTabs(),
      about: this.aboutHTML(),
      settings: this.settingsSheet(),
      onAct: async (act, ui) => {
        if (act === "resume") { this.campaign = W.M.load(); this.toOverworld(); }
        if (act === "new") {
          if (W.M.load() && !(await ui.confirm("Start a new campaign? The one in progress, its squad, its city and its research, is lost.", "Start a new campaign"))) return;
          this.campaign = W.M.fresh(); W.M.save(this.campaign); this.toOverworld();
        }
        if (act === "skirmish") { this.campaign = null; this.toMapRoom(); }
      },
    });
    // a line under the name: whose city this is
    const nm = host.querySelector(".gk-name");
    if (nm && !nm.querySelector(".gk-tag")) nm.insertAdjacentHTML("afterbegin", '<div class="gk-tag">PumaCity</div>');
    if (reveal) this.titleUI.reveal();
  },
  /* The title's backdrop is the real thing: Market Plaza at night, with its
   * crowd and its traffic, the camera drifting over it. */
  mountScene(el) {
    const cv = document.createElement("canvas");
    el.appendChild(cv);
    this.attract = new W.World(this.level, { attract: true });
    this.attractR = new W.Renderer(cv, null);
    this.attractR.resize(window.innerWidth, window.innerHeight, window.innerWidth > 1500 ? 3 : 2);
    this.attractR.centerOn(this.attract, 74, 118);
    this.attractT = 0;
  },
  helpTabs() {
    return [
      ["Controls", `<h3>The squad</h3><table>
        <tr><td><kbd>1</kbd>–<kbd>4</kbd></td><td>select a Watcher; <kbd>Shift</kbd> adds or drops one</td></tr>
        <tr><td><kbd>\`</kbd> or <kbd>0</kbd></td><td>select the whole squad; tap twice to look at them</td></tr>
        <tr><td>Left click</td><td>move there (or select a Watcher); drag a box to select several</td></tr>
        <tr><td>Right click</td><td>fire at someone or a car; at the ground, fire at that spot. With the Purrsuader out, right click someone to talk them round</td></tr>
        <tr><td><kbd>E</kbd></td><td>go: every stim to full, guns out, and the crew shot on sight</td></tr>
        <tr><td><kbd>C</kbd></td><td>calm: stims to nothing, guns away, nobody shoots first. Lets the dependency wear off</td></tr>
        <tr><td><kbd>R</kbd></td><td>guns out (the one each last had) or away; <kbd>H</kbd> also holsters</td></tr>
        <tr><td><kbd>F</kbd></td><td>first aid: a medikit for each Watcher at half health or worse</td></tr>
        <tr><td><kbd>Q</kbd></td><td>the Purrsuader, out or away</td></tr>
        <tr><td><kbd>Z</kbd></td><td>followers of the selected Watchers hold where they stand (still firing), or come again</td></tr>
        <tr><td><kbd>V</kbd></td><td>the scanner view, over the city: the better the scanner, the more ground it covers and the more it shows</td></tr>
        <tr><td><kbd>X</kbd></td><td>the BanHammer: click a spot a Watcher can see, and a few seconds later the orbital platform clears it. Everything in the circle dies. <kbd>Esc</kbd> stands it down</td></tr>
        <tr><td>Weapon panel</td><td>click a weapon to draw it</td></tr>
        </table><h3>The view</h3><table>
        <tr><td><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, arrows</td><td>scroll; or push the pointer to an edge, or drag with the middle button</td></tr>
        <tr><td>Double-tap <kbd>1</kbd>–<kbd>4</kbd></td><td>look at that Watcher; or double-click their card</td></tr>
        <tr><td>Scanner</td><td>click to look there; <kbd>Shift</kbd>-click to send the selection</td></tr>
        <tr><td><kbd>Space</kbd></td><td>pause</td></tr>
        <tr><td><kbd>Esc</kbd></td><td>menu</td></tr>
        <tr><td><kbd>M</kbd></td><td>sound on and off</td></tr></table>`],
      ["Tactics", `<p><b>Local security</b> (Plaza Security, Port Authority, ranch hands) do not know who you are. A gun in plain view earns one warning; keep it out and they open fire, and call their friends. Holster before you walk past them.</p>
        <p><b>The crew</b> in red spot an armed Watcher from far off, an unarmed one only up close. Walk in with your hands empty, and draw at the last moment.</p>
        <p>Once they make you, <b>the target runs</b>: for a car, or for a way out on foot (watch the scanner). If they get away, the mission is lost. A car takes a few rounds and then goes up, taking anyone beside it.</p>
        <p><b>The Purrsuader</b> talks people into following you. Civilians come at once; security once you have 2 followers; the crew in red at 4, bodyguards in black at 6. Followers pick up guns the dead drop, and fight for you. The <b>Purrsuader II</b> reaches twice as far, works twice as fast, and talks round anyone who isn't already shooting at you, crowd or no crowd; those who are need half the crowd.</p>
        <p>Watchers <b>pick up</b> any weapon they walk over. Ammunition is finite; the pistol never runs dry.</p>`],
      ["Stims", `<p>Every Watcher carries three stims, on the bars under the portrait. Click or drag a bar to set the dose. With several Watchers selected, the dose goes to them all.</p>
        <table><tr><td><b>Zoomers</b></td><td>speed and rate of fire</td></tr>
        <tr><td><b>Red Dot</b></td><td>aim, and how far a Watcher looks for trouble</td></tr>
        <tr><td><b>Silvervine</b></td><td>reflexes and initiative. Too little and a Watcher will not fire unless ordered; a heavy dose also uses a medikit by itself when badly hurt</td></tr></table>
        <p>Above the white midpoint a dose burns off slowly and builds a <b>dependency</b> (the red hatching), which eats into the effect until it fades. Dose for the fight, not the walk.</p>`],
      ["Campaign", `<p>Casey Benton has given the Watchers her city to hold: <b>eight zones</b>. Each makes whole <b>pips</b> a day. On the <b>City</b> map, pick a zone and set what it <b>spends on control</b>. The HOLD mark is what keeps it where it is: <b>invest</b> above it and control climbs; <b>milk</b> it below and the city takes more while control slips. The <b>city split</b> in the top bar shares what the zones don't spend on control between <b>research</b> and <b>money</b>.</p>
        <p><b>Control</b> decays every day and must be kept up. Each level of it adds a pip, and a calm zone's pips are worth more; level 3 is hard to reach and, once there, holds itself for a while. At zero the zone is <b>lost</b> until a siege takes it back.</p>
        <p><b>Cal</b> pushes one zone at a time, and his push is harder the better you are doing. Intel missions show where he goes next. Fight his crew where he is pushing to end it.</p>
        <p><b>Research</b> costs money to start and research points to finish. Points can't be banked, and split between the projects running. After 30 upgrade points the city goes to <b>war</b>: each zone then has a story to finish, and the last step locks it down. Lock down every zone to win.</p>
        <p><b>Missions</b> take days, and the pips stand as you set them while the squad is away. They pay research, money or control. Each has a <b>threat</b>, T1 to T5; the squad has a <b>tier</b> from its guns and mods. Above the squad's tier, expect to lose Watchers. <b>Quiet</b> missions can be done without a shot fired.</p>
        <p>Finished research goes on sale: weapons in the <b>Armoury</b>, mods in the <b>Clinic</b>. Ammunition is topped up free before every mission; medikits are not.</p>
        <p>Watchers who die on a mission are gone, with whatever they carried. Hire replacements from the <b>Roster</b>. Weapons a Watcher picks up in the field come home with them, researched or not: keep them or sell them in the Armoury.</p>
        <p>On the command screens: <kbd>1</kbd>–<kbd>4</kbd> the City, the Lab, the Clinic and Casey's Office; <kbd>W</kbd> wait a day (or <b>Until…</b> for longer); arrow keys walk the map from zone to zone; <kbd>Esc</kbd> steps back, and twice from the City leaves for the title.</p>`],
      ["About", this.aboutHTML()],
    ];
  },
  aboutHTML() {
    return `<p><b>PumaCity: Watchers</b>. Casey Benton owns PumaCity, and the Watchers are how she keeps it. Four cyber-cats in long coats, a city of rival crews, and the Boss's orders.</p>
      <p>A squad tactics game in the spirit of <i>Syndicate</i> (Bullfrog Productions, 1993). Everything here is original: code, maps, art and sound are drawn and synthesised in the page.</p>
      <p>Contracts pay for research; research puts new weapons and cyber-mods in the squad's hands, as in <i>Syndicate Wars</i>. One district so far: more are coming.</p>
      <p class="gk-credit">Built by <a href="https://greykit.com/" target="_blank" rel="noopener">greykit.com</a></p>`;
  },
  settingsSheet() {
    const onOff = (key, val) => `<div class="gk-row"><button data-set="${key}" data-v="1" aria-pressed="${!!val}">On</button><button data-set="${key}" data-v="0" aria-pressed="${!val}">Off</button></div>`;
    return {
      html: () => `<h3>Sound</h3>${onOff("sound", !W.prefs.muted)}
        <h3>Rain</h3>${onOff("rain", W.prefs.rain)}
        <h3>Edge scrolling</h3>${onOff("edge", W.prefs.edge)}
        <h3>Pixel size</h3><div class="gk-row">${[[0, "Auto"], [2, "2×"], [3, "3×"], [4, "4×"]].map(([v, l]) => `<button data-set="scale" data-v="${v}" aria-pressed="${W.prefs.scale === v}">${l}</button>`).join("")}</div>
        <h3>This browser</h3><div class="gk-row"><button data-forget>Forget everything</button></div>
        <p class="gk-note">Clears what Watchers keeps in this browser: your settings and your best mission results.</p>`,
      onClick: async (b, sheet) => {
        if (b.hasAttribute("data-forget")) {
          if (await confirmSheet("Forget everything PumaCity: Watchers has saved in this browser: settings and best results? This cannot be undone.", "Forget everything")) { W.store.forget(); location.reload(); }
          return;
        }
        const k = b.dataset.set, v = +b.dataset.v;
        if (!k) return;
        if (k === "sound") W.audio.setMuted(!v);
        if (k === "rain") { W.prefs.rain = !!v; W.audio.setRain(!!v); }
        if (k === "edge") W.prefs.edge = !!v;
        if (k === "scale") { W.prefs.scale = v; this.resize(); }
        W.savePrefs();
        this.hud.syncSound();
        sheet.refresh();
      },
    };
  },

  /* ---------------- the overworld ---------------- */
  toOverworld() {
    this.closeSheets();
    if (this.titleUI) { this.titleUI.unmount(); this.titleUI = null; }
    const host = document.getElementById("title-host");
    host.hidden = true; host.innerHTML = ""; this.attract = null;
    document.getElementById("game").hidden = true;
    W.audio.ambience(false);
    this.mode = "world";
    if (!this.ow) this.ow = new W.Command(this);
    this.ow.open();
  },

  /* ---------------- the map room: skirmishes in any district ---------------- */
  toMapRoom() {
    this.closeSheets();
    if (this.titleUI) { this.titleUI.unmount(); this.titleUI = null; }
    const host = document.getElementById("title-host");
    host.hidden = true; host.innerHTML = ""; this.attract = null;
    document.getElementById("game").hidden = true;
    W.audio.ambience(false);
    this.mode = "maproom";
    if (this.mr) this.mr.close();
    this.mr = new W.MapRoom(this);
    this.mr.open();
  },

  /* ---------------- the briefing ----------------
   * offerId: a mission on offer in the campaign, or null for a skirmish
   * with the standard kit. */
  toBriefing(offerId, level) {
    const c = offerId && this.campaign && this.campaign.offers.find(x => x.id === offerId);
    this.run = { contract: c || null, opts: { roster: c ? W.M.missionRoster(this.campaign) : undefined } };
    this.level = level || (c ? W.M.missionFor(this.campaign, c) : W.LEVELS.plaza);
    if (this.mr) { this.mr.close(); this.mr = null; }
    const L = this.level;
    this.world = new W.World(L, this.run.opts);
    if (this.ow) { this.ow.close(); this.ow = null; }
    this.mode = "brief";
    // the title goes away entirely, so its menu keys cannot fire under the dossier
    if (this.titleUI) { this.titleUI.unmount(); this.titleUI = null; }
    const host = document.getElementById("title-host");
    host.hidden = true; host.innerHTML = ""; this.attract = null;
    const el = document.createElement("div");
    el.className = "brief";
    el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Mission briefing");
    const w = this.world, sly = w.targetUnit;
    el.innerHTML = `<div class="wrap">
      <div>
        <div class="tag">${c ? `Day ${this.campaign.day} · ` : "Skirmish · "}${W.esc(L.district)}</div>
        <h1>${W.esc(L.name)}</h1>
        <div class="code">OPERATION ${W.esc(L.codename)}</div>
        <div class="from">From: ${W.esc(L.briefing.from)}</div>
        <div class="text">${L.briefing.text.map(p => `<p>${W.esc(p)}</p>`).join("")}</div>
        ${c ? (z => `<div class="panel"><h3>${W.esc(W.M.KINDS[c.kind].name)} in ${W.esc(W.M.zoneDef(c.zone).name)}</h3><table>
          <tr><td>Reward</td><td>${W.esc(W.M.describeReward(this.campaign, c))}</td></tr>
          <tr><td>The streets</td><td>${z.lost ? "lost to Cal: the enemy is dug in" : `control level ${W.M.level(z.C)}`}</td></tr>
          <tr><td>Time</td><td>${c.days} days: the zones' pips stand as they are set while you are out</td></tr>
          <tr><td>Losses</td><td>Watchers killed are gone for good, with everything spent on them</td></tr></table></div>`)(W.M.zone(this.campaign, c.zone)) : ""}
      </div>
      <div>
        <div class="panel"><h3>The ground</h3><canvas class="map" data-map width="300" height="300"></canvas>
          <div class="legend"><span><i style="background:#54f2ff"></i>Watchers</span><span><i style="background:#ffb000"></i>${W.esc(w.names.target)}</span><span><i style="background:#ff5266"></i>crew</span><span><i style="background:#4c6fd0"></i>security</span></div></div>
        <div class="panel"><h3>Intel</h3><table>${L.briefing.intel.map(([a, b]) => `<tr><td>${W.esc(a)}</td><td>${W.esc(b)}</td></tr>`).join("")}</table></div>
        <div class="panel"><h3>Your squad</h3><div class="squad">${w.agents.map(a => `<div class="agent"><canvas width="40" height="40" data-agent="${a.slot}"></canvas><div><b>${W.esc(a.name)}</b>${a.weapons.map(x => W.WEAPONS[x.type].name).join(", ")}</div></div>`).join("")}</div></div>
      </div>
      <div class="acts"><button class="primary" data-go><kbd>Enter</kbd>Begin mission</button><button data-back><kbd>Esc</kbd>Back</button></div>
    </div>`;
    document.body.appendChild(el);
    this.briefEl = el;
    const mc = el.querySelector("[data-map]");
    this.renderer.scanner(mc.getContext("2d"), w, { full: true, noCiv: true, noView: true });
    this.resize();
    el.querySelectorAll("[data-agent]").forEach(c => W.drawPortrait(c.getContext("2d"), w.agents[+c.dataset.agent].look, 40, 40));
    el.querySelector("[data-go]").addEventListener("click", () => this.beginMission());
    el.querySelector("[data-back]").addEventListener("click", () => this.backFromBrief());
    el.querySelector("[data-go]").focus();
  },

  backFromBrief() { if (this.run && this.run.contract) this.toOverworld(); else if (this.fromMapRoom) this.toMapRoom(); else this.toTitle(); },

  /* ---------------- the mission ---------------- */
  beginMission() {
    this.closeSheets();
    if (this.titleUI) { this.titleUI.unmount(); this.titleUI = null; }
    document.getElementById("title-host").hidden = true;
    document.getElementById("title-host").innerHTML = "";
    this.attract = null;
    document.getElementById("game").hidden = false;
    this.mode = "play"; this.paused = false;
    if (!this.world || this.world.time > 0 || this.world.status !== "play") this.world = new W.World(this.level, (this.run && this.run.opts) || {});
    this.resize();
    const w = this.world;
    const st = w.startAt || this.level.start;
    this.renderer.centerOn(w, st[0], st[1]);
    this.hud.build(w);
    this.cursorMode = null; this.ui.aim = null; this.setCursor("move");
    this.bigScan = false; { const c = document.getElementById("bigscan"); if (c) c.hidden = true; }
    W.audio.ambience(true);
    for (const [t, col] of this.level.intro ? this.level.intro(w) : [["JOYEUSE: You're on, Watchers. Sly's at the cafe, north-east corner. Keep it quiet.", "#54f2ff"], ["Weapons are holstered. Plaza Security will warn anyone with a gun out.", "#94a0c4"]]) w.msg(t, col);
    // the title card names the job: the first objective, which follows the kind
    const job = w.objectives[0] ? w.objectives[0].text : `Eliminate ${w.names.target}`;
    this.banner(this.level.name.toUpperCase(), job, "#54f2ff");
    this.hint(true);
    this.view.focus && this.view.focus();
  },
  /* a skirmish can be replayed at once; a contract cannot (the dead stay dead) */
  restartMission() { if (this.run && this.run.contract) return; this.world = null; this.beginMission(); },

  banner(text, sub, color) {
    const b = document.getElementById("banner");
    b.style.color = color;
    b.innerHTML = W.esc(text) + (sub ? `<small>${W.esc(sub)}</small>` : "");
    b.hidden = false;
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => { b.hidden = true; }, 2600);
  },
  hint(show) {
    const h = document.getElementById("hint");
    h.hidden = !show;
    h.innerHTML = "<b>Left</b> move · <b>Right</b> fire / persuade · <b>` 1–4</b> select · <b>E</b> go · <b>C</b> calm · <b>R</b> guns · <b>F</b> first aid · <b>Q</b> Purrsuader · <b>X</b> BanHammer · <b>Z</b> hold · <b>V</b> scanner · <b>Space</b> pause";
    clearTimeout(this.hintT);
    if (show) this.hintT = setTimeout(() => { h.hidden = true; }, 15000);
  },

  resize() {
    const s = W.prefs.scale || (window.innerWidth >= 1800 ? 3 : 2);
    if (this.mode === "play" || this.mode === "brief" || this.mode === "debrief") {
      const r = this.view.getBoundingClientRect();
      const w = r.width || window.innerWidth - 232, h = r.height || window.innerHeight;
      this.renderer.resize(w, h, s);
      if (this.world) this.renderer.clamp(this.world);
    }
    if (this.attractR) this.attractR.resize(window.innerWidth, window.innerHeight, s);
  },

  /* ---------------- the loop ---------------- */
  tick(dt) {
    if (this.mode === "title" || this.mode === "brief") {
      if (this.attract && this.attractR) {
        const a = this.attract;
        this.attractT += dt;
        a.update(dt);
        // a slow figure-of-eight over the plaza
        const t = this.attractT * 0.05;
        this.attractR.centerOn(a, 74 + Math.sin(t) * 14, 118 + Math.sin(t * 2) * 8);
        this.attractR.frame(a, dt);
      }
      return;
    }
    if (this.mode !== "play" && this.mode !== "debrief") return;
    const w = this.world;
    if (!w) return;
    this.scroll(dt);
    if (!this.paused && this.mode === "play") {
      // a fixed step, so the sim plays the same at any frame rate
      this.acc = (this.acc || 0) + dt;
      while (this.acc >= 1 / 60) { w.update(1 / 60); this.acc -= 1 / 60; }
      if (this.ui.rightHeld && this.ui.rightGround) this.fireAtGround(this.ui.rightGround[0], this.ui.rightGround[1], true);
    }
    const [cx, cy] = this.renderer.viewCenter(w);
    W.audio.listen(cx, cy);
    this.updateHover();
    this.renderer.frame(w, this.paused ? 0 : dt);
    this.renderer.overlay(w, this.ui);
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) { this.hud.update(); this.hudT = 0.1; this.ticker(); }
    this.hud.drawMini(this.renderer);
    if (w.status !== "play" && this.mode === "play" && w.endT > 2.6) this.toDebrief();
  },
  ticker() {
    const el = document.getElementById("ticker"), w = this.world;
    const live = w.msgs.filter(m => m.t > 0).slice(-4);
    el.innerHTML = live.map(m => `<div style="color:${m.color};opacity:${Math.min(1, m.t / 1.2)}">${W.esc(m.text)}</div>`).join("");
  },
  scroll(dt) {
    const w = this.world, k = this.keys, sp = 520 * dt / this.renderer.scale * 2;
    let dx = 0, dy = 0;
    if (k.has("a") || k.has("arrowleft")) dx -= sp;
    if (k.has("d") || k.has("arrowright")) dx += sp;
    if (k.has("w") || k.has("arrowup")) dy -= sp;
    if (k.has("s") || k.has("arrowdown")) dy += sp;
    const u = this.ui;
    if (W.prefs.edge && u.mouseIn && !u.drag && !this.paused && document.hasFocus()) {
      const r = this.renderer, E = 14;
      if (u.x < E) dx -= sp; else if (u.x > r.cssW - E) dx += sp;
      if (u.y < E) dy -= sp; else if (u.y > r.cssH - E) dy += sp;
    }
    if (dx || dy) { w.cam.x += dx; w.cam.y += dy; this.renderer.clamp(w); }
  },

  /* ---------------- picking ---------------- */
  unitAt(px, py) {
    const w = this.world, r = this.renderer, k = r.scale;
    let best = null, bd = -Infinity;
    for (const u of w.units) {
      if (!u.alive || u.inCar) continue;
      const [sx, sy] = r.toScreen(w, u.x, u.y, u.z || 0);
      const X = sx * k, Y = sy * k;
      if (px > X - 7 * k && px < X + 7 * k && py > Y - W.unitTop(u) * k && py < Y + 3 * k) {
        const d = u.x + u.y;
        if (d > bd) { bd = d; best = u; }
      }
    }
    return best;
  },
  carAt(px, py) {
    const w = this.world, r = this.renderer, k = r.scale;
    for (const c of w.cars) {
      if (c.dead) continue;
      const [sx, sy] = r.toScreen(w, c.x, c.y);
      if (Math.abs(px - sx * k) < 22 * k && py > (sy - 14) * k && py < (sy + 10) * k) return c;
    }
    return null;
  },
  itemAt(px, py) {
    const w = this.world, r = this.renderer, k = r.scale;
    for (const it of w.items) {
      const [sx, sy] = r.toScreen(w, it.x, it.y);
      if (Math.abs(px - sx * k) < 8 * k && Math.abs(py - sy * k) < 6 * k) return it;
    }
    return null;
  },
  selectedAgents() { return [...this.world.selected].filter(u => u.alive).sort((a, b) => a.slot - b.slot); },
  describe(u) {
    const N = this.world.names;
    if (u.kind === "target") return [N.target, "#ffb000"];
    if (u.subject) return [u.name, "#7dffb0"];
    if (u.follower) return ["Follower", "#54f2ff"];
    if (u.kind === "crew" && u.undercover && !u.revealed && W.scanCal(this.world, u)) return ["One of Cal's", "#ff5266"];
    if (u.kind === "crew" && u.undercover && !u.revealed) return W.scanArmed(this.world, u) ? ["Armed civilian?", "#ff8a3c"] : [N.civ, "#94a0c4"];
    if (u.kind === "crew") return [u.guard ? N.guard : N.henchman, "#ff5266"];
    if (u.kind === "sec") { const t = u.title || N.sec; return [u.angryAt.player ? `${t} (hostile)` : t, u.elite ? "#d8b048" : "#7aa8ff"]; }
    return [N.civ, "#94a0c4"];
  },
  updateHover() {
    const ui = this.ui;
    if (!ui.mouseIn || !this.world) { ui.hover = null; return; }
    const u = this.unitAt(ui.x, ui.y);
    const sel = this.selectedAgents();
    const purr = sel.some(a => W.curDef(a) && W.curDef(a).persuade);
    const h = { x: ui.x, y: ui.y, mode: "move" };
    if (ui.aim) {
      const [x, y] = this.renderer.toWorld(this.world, ui.x, ui.y), why = this.world.canStrike(ui.aim.agent, x, y);
      ui.aim.ok = !why;
      h.mode = "fire"; h.label = why ? `BanHammer: ${why}` : "BanHammer: strike here"; h.labelColor = why ? "#94a0c4" : "#ff3048";
      ui.hover = h; this.setCursor(h.mode); return;
    }
    if (u) {
      if (u.isAgent) { h.mode = "select"; h.label = u.name; h.labelColor = "#54f2ff"; }
      else if (u.faction === "player") { h.mode = "move"; h.label = "Follower"; h.labelColor = "#54f2ff"; }
      else {
        const [lbl, col] = this.describe(u);
        if (purr && u.kind !== "target") {
          h.mode = "persuade";
          const ok = W.canPersuade(this.world, sel[0], u), mind = this.world.level.mission && this.world.level.mission.mindControl;
          const full = !u.subject && W.squadFollowers(this.world) >= W.followingCap(this.world);
          h.label = ok ? "Persuade " + lbl.toLowerCase() : mind ? lbl + ": mind-controlled, deaf to the Purrsuader" : full ? `${lbl}: your following is full (${W.followingCap(this.world)})` : lbl + ": need more followers";
          h.labelColor = ok ? "#54f2ff" : "#ffb000";
        } else { h.mode = "fire"; h.label = lbl; h.labelColor = col; }
      }
    } else {
      const c = this.carAt(ui.x, ui.y);
      if (c) { h.mode = "fire"; h.label = c.stash ? "The stash" : c.escapeCar ? `${this.world.names.target}'s car` : "Car"; h.labelColor = c.stash ? "#7dffb0" : c.escapeCar ? "#ffb000" : "#94a0c4"; }
      else {
        const it = this.itemAt(ui.x, ui.y);
        if (it) { h.label = W.WEAPONS[it.type].name + (it.ammo != null ? ` (${it.ammo})` : ""); h.labelColor = "#ffb000"; }
      }
    }
    ui.hover = h;
    this.setCursor(h.mode);
  },
  /* Real cursors, not drawn ones: they never lag a frame behind the mouse.
   * Lime green with a dark rim, so they read on any part of the city. */
  setCursor(mode) {
    if (this.cursorMode === mode) return;
    this.cursorMode = mode;
    const L = "#a6ff3c", D = "#05070f";
    const svg = (body, x, y, fb) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>${body}</svg>`)}") ${x} ${y}, ${fb}`;
    const C = {
      move: svg(`<path d='M3 2 L3 22 L8.5 17 L12.5 26 L16 24.5 L12 15.5 L19 15.5 Z' fill='${L}' stroke='${D}' stroke-width='1.6' stroke-linejoin='round'/>`, 3, 2, "default"),
      select: svg(`<path d='M3 2 L3 22 L8.5 17 L12.5 26 L16 24.5 L12 15.5 L19 15.5 Z' fill='${L}' stroke='${D}' stroke-width='1.6' stroke-linejoin='round'/><rect x='18' y='18' width='11' height='11' fill='none' stroke='${L}' stroke-width='2'/>`, 3, 2, "pointer"),
      fire: svg(`<g fill='none' stroke='${D}' stroke-width='4'><circle cx='16' cy='16' r='8'/><path d='M16 2v8M16 22v8M2 16h8M22 16h8'/></g><g fill='none' stroke='#ff5266' stroke-width='2'><circle cx='16' cy='16' r='8'/><path d='M16 2v8M16 22v8M2 16h8M22 16h8'/></g><circle cx='16' cy='16' r='1.5' fill='#ff5266'/>`, 16, 16, "crosshair"),
      persuade: svg(`<g fill='none' stroke='${D}' stroke-width='4'><circle cx='16' cy='16' r='7'/><path d='M5 9a14 14 0 0 0 0 14M27 9a14 14 0 0 1 0 14'/></g><g fill='none' stroke='${L}' stroke-width='2'><circle cx='16' cy='16' r='7'/><path d='M5 9a14 14 0 0 0 0 14M27 9a14 14 0 0 1 0 14'/></g>`, 16, 16, "crosshair"),
    };
    this.view.style.cursor = C[mode] || C.move;
  },

  /* ---------------- orders ---------------- */
  selectAgent(a, add) {
    const w = this.world;
    if (!a || !a.alive || a.out) return;
    if (add) { if (w.selected.has(a)) w.selected.delete(a); else w.selected.add(a); }
    else { w.selected.clear(); w.selected.add(a); }
    W.audio.play("select");
    this.hud.update(true);
  },
  selectAll() {
    const w = this.world;
    w.selected.clear();
    for (const a of w.agents) if (a.alive && !a.out) w.selected.add(a);
    W.audio.play("select");
    this.hud.update(true);
  },
  centerOn(a) { this.renderer.centerOn(this.world, a.x, a.y); },
  centerAt(x, y) { this.renderer.centerOn(this.world, x, y); },
  centerOnSelection() { const s = this.selectedAgents(); if (s.length) this.centerAt(s.reduce((a, b) => a + b.x, 0) / s.length, s.reduce((a, b) => a + b.y, 0) / s.length); },
  orderMove(x, y) {
    const w = this.world, sel = this.selectedAgents();
    if (!sel.length) return;
    const offs = [[0, 0], [0.9, 0], [0, 0.9], [0.9, 0.9]];
    sel.forEach((a, i) => {
      const o = sel.length === 1 ? [0, 0] : offs[i];
      const cx = sel.length === 1 ? 0 : 0.45;
      let tx = x + o[0] - cx, ty = y + o[1] - cx;
      if (!w.map.walkable(tx, ty)) { const p = w.map.nearestWalkable(tx, ty, 3); if (p) { tx = p[0]; ty = p[1]; } }
      a.manual = null;
      W.goTo(w, a, tx, ty);
    });
    w.ping(x, y);
    W.audio.play("order");
  },
  orderAttack(t) {
    const w = this.world, sel = this.selectedAgents();
    let any = false;
    for (const a of sel) {
      const cur = W.curWeapon(a);
      if (cur && W.WEAPONS[cur.type].persuade && !t.isCar) { a.manual = t; any = true; continue; }
      if (!W.armed(a)) {
        // reach for the best loaded gun
        let best = -1, sc = -1;
        a.weapons.forEach((x, i) => { const d = W.WEAPONS[x.type]; if (d.gun && (x.ammo == null || x.ammo > 0)) { const s = d.dmg * (d.pellets || 1) / d.cd; if (s > sc) { sc = s; best = i; } } });
        if (best < 0) continue;
        a.cur = best; a.weaponOut = true; a.lastGun = a.weapons[best].type;
      }
      a.manual = t; a.target = null; any = true;
    }
    if (any) { w.ping(t.x, t.y, "#ff5266"); W.audio.play("order"); this.hud.update(true); }
  },
  fireAtGround(x, y, held) {
    for (const a of this.selectedAgents()) if (W.armed(a)) { a.shootAt = [x, y]; if (!held) a.manual = null; }
  },
  drawWeapon(i) {
    const sel = this.selectedAgents(), lead = sel[0];
    if (!lead || !lead.weapons[i]) return;
    const type = lead.weapons[i].type;
    if (type === "banhammer") return this.armStrike();
    const holster = lead.cur === i && type !== "medikit";
    for (const a of sel) {
      const k = a.weapons.findIndex(x => x.type === type);
      if (holster) { a.cur = -1; a.weaponOut = false; a.manual = null; a.target = null; continue; }
      if (k < 0) continue;
      if (type === "medikit") { if (a.hp >= a.maxHp) continue; a.prevCur = a.cur; }
      a.cur = k; a.weaponOut = type !== "medikit"; a.target = null;
      if (W.WEAPONS[type].gun) a.lastGun = type;
    }
    W.audio.play("click");
    this.hud.update(true);
  },
  /* The gun a Watcher last had out, if they still carry it loaded; else
   * their best loaded gun. -1 if they have none. */
  gunFor(a) {
    const ok = x => { const d = W.WEAPONS[x.type]; return d.gun && (x.ammo == null || x.ammo > 0); };
    let k = a.lastGun ? a.weapons.findIndex(x => x.type === a.lastGun && ok(x)) : -1;
    if (k < 0) {
      let sc = -1;
      a.weapons.forEach((x, i) => { if (!ok(x)) return; const d = W.WEAPONS[x.type], v = d.dmg * (d.pellets || 1) / d.cd; if (v > sc) { sc = v; k = i; } });
    }
    return k;
  },
  drawGun(a) {
    const k = this.gunFor(a);
    if (k < 0) return false;
    a.cur = k; a.weaponOut = true; a.target = null; a.lastGun = a.weapons[k].type;
    return true;
  },
  /* E: go. Every stim to the top, guns out, and the crew shot on sight. */
  goLoud() {
    const sel = this.selectedAgents();
    if (!sel.length) return;
    for (const a of sel) {
      for (const s of W.STIMS) a.ipa[s.id].lvl = 1;
      this.drawGun(a);
      a.aggressive = true;
    }
    W.audio.play("order");
    this.hud.update(true);
  },
  /* C: calm. Stims to nothing, guns away, nobody shoots first: time to let the
   * dependency wear off. */
  calmDown() {
    const sel = this.selectedAgents();
    if (!sel.length) return;
    for (const a of sel) {
      for (const s of W.STIMS) a.ipa[s.id].lvl = 0;
      a.aggressive = false;
      a.cur = -1; a.weaponOut = false; a.manual = null; a.target = null; a.shootAt = null;
    }
    W.audio.play("click");
    this.hud.update(true);
  },
  /* R: guns away if any are out; otherwise each draws the gun they last had. */
  toggleGuns() {
    const sel = this.selectedAgents();
    if (!sel.length) return;
    if (sel.some(a => W.armed(a))) return this.holster();
    for (const a of sel) this.drawGun(a);
    W.audio.play("click");
    this.hud.update(true);
  },
  /* Q: the Purrsuader, out or away. */
  togglePurr() {
    const sel = this.selectedAgents();
    if (!sel.length) return;
    const out = sel.some(a => { const d = W.curDef(a); return d && d.persuade; });
    for (const a of sel) {
      const d = W.curDef(a);
      if (out) { if (d && d.persuade) { a.cur = -1; a.weaponOut = false; a.manual = null; a.target = null; } continue; }
      const k = a.weapons.findIndex(x => W.WEAPONS[x.type].persuade);
      if (k >= 0) { a.cur = k; a.weaponOut = true; a.manual = null; a.target = null; a.shootAt = null; }
    }
    W.audio.play("click");
    this.hud.update(true);
  },
  /* Z: the selected Watchers' followers hold where they stand, or come again. */
  toggleHold() {
    const sel = new Set(this.selectedAgents());
    const mine = this.world.units.filter(u => u.alive && u.follower && !u.isAgent && sel.has(u.leader));
    if (!mine.length) { W.audio.play("deny"); this.world.msg("No followers to give orders to.", "#ffb000"); return; }
    const hold = mine.some(u => !u.hold);
    for (const u of mine) { u.hold = hold; if (hold) W.stop(u); }
    W.audio.play("click");
    this.world.msg(hold ? `${mine.length} follower${mine.length > 1 ? "s" : ""}: holding here.` : `${mine.length} follower${mine.length > 1 ? "s" : ""}: with you again.`, "#54f2ff");
  },
  /* V: the scanner view, big, over the city. Its reach is the scanner's mark. */
  toggleScan() {
    this.bigScan = !this.bigScan;
    const c = document.getElementById("bigscan");
    if (c) c.hidden = !this.bigScan;
    W.audio.play("click");
  },
  /* X: the BanHammer. The first selected Watcher carrying a strike paints the
   * target; X again, Esc or a right click stands it down. */
  armStrike() {
    const ui = this.ui;
    if (ui.aim) return this.standDownStrike();
    const a = this.selectedAgents().find(x => x.weapons.some(w => w.type === "banhammer" && (w.ammo == null || w.ammo > 0)))
      || this.world.agents.find(x => x.alive && !x.out && x.weapons.some(w => w.type === "banhammer" && (w.ammo == null || w.ammo > 0)));
    if (!a) { W.audio.play("deny"); this.world.msg("No BanHammer strike to call.", "#ffb000"); return; }
    ui.aim = { kind: "banhammer", agent: a, ok: false };
    W.audio.play("click");
    this.world.msg(`${a.name}: laser up. Click a spot they can see; Esc to stand down.`, "#ff5266");
    this.updateHover();
  },
  standDownStrike() { this.ui.aim = null; W.audio.play("click"); this.updateHover(); },
  /* F: a medikit for each Watcher at half health or worse; the rest keep theirs. */
  patchUp() {
    let any = false;
    for (const a of this.selectedAgents()) {
      const d = W.curDef(a);
      if (a.hp > a.maxHp * 0.5 || (d && d.heal)) continue;
      const k = a.weapons.findIndex(x => x.type === "medikit");
      if (k < 0) continue;
      a.prevCur = a.cur; a.cur = k; any = true;
    }
    W.audio.play(any ? "click" : "deny");
    this.hud.update(true);
  },
  holster() {
    for (const a of this.selectedAgents()) { a.cur = -1; a.weaponOut = false; a.manual = null; a.target = null; a.shootAt = null; }
    W.audio.play("click");
    this.hud.update(true);
  },
  toggleSound() {
    W.audio.setMuted(!W.prefs.muted);
    this.hud.syncSound();
  },

  /* ---------------- input ---------------- */
  bindInput() {
    const v = this.view, ui = this.ui;
    const pos = ev => { const r = v.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
    v.addEventListener("contextmenu", ev => ev.preventDefault());
    v.addEventListener("pointerenter", () => { ui.mouseIn = true; });
    v.addEventListener("pointerleave", () => { ui.mouseIn = false; });
    v.addEventListener("pointermove", ev => {
      [ui.x, ui.y] = pos(ev); ui.mouseIn = true;
      if (ui.pan) { const k = this.renderer.scale; this.world.cam.x = ui.pan.cx - (ui.x - ui.pan.x) / k; this.world.cam.y = ui.pan.cy - (ui.y - ui.pan.y) / k; this.renderer.clamp(this.world); }
      if (ui.drag) { ui.drag.x1 = ui.x; ui.drag.y1 = ui.y; if (Math.hypot(ui.drag.x1 - ui.drag.x0, ui.drag.y1 - ui.drag.y0) > 8) ui.drag.box = true; }
      if (ui.rightHeld && ui.rightGround) ui.rightGround = this.renderer.toWorld(this.world, ui.x, ui.y);
    });
    v.addEventListener("pointerdown", ev => {
      if (this.mode !== "play" || !this.world) return;
      [ui.x, ui.y] = pos(ev);
      v.setPointerCapture(ev.pointerId);
      if (ev.button === 1) { ui.pan = { x: ui.x, y: ui.y, cx: this.world.cam.x, cy: this.world.cam.y }; ev.preventDefault(); return; }
      if (this.paused) return;
      if (ui.aim) {
        if (ev.button === 2) { this.standDownStrike(); return; }
        if (ev.button === 0) {
          const [x, y] = this.renderer.toWorld(this.world, ui.x, ui.y), why = this.world.canStrike(ui.aim.agent, x, y);
          if (why) { W.audio.play("deny"); this.world.msg(`${ui.aim.agent.name}: ${why}.`, "#ffb000"); return; }
          this.world.callStrike(ui.aim.agent, x, y); ui.aim = null; this.hud.update(true); return;
        }
      }
      if (ev.button === 0) { ui.drag = { x0: ui.x, y0: ui.y, x1: ui.x, y1: ui.y, box: false, shift: ev.shiftKey || ev.ctrlKey }; return; }
      if (ev.button === 2) {
        const u = this.unitAt(ui.x, ui.y);
        if (u && !u.isAgent && u.faction !== "player") { this.orderAttack(u); return; }
        const c = this.carAt(ui.x, ui.y);
        if (c) { this.orderAttack(c); return; }
        const [x, y] = this.renderer.toWorld(this.world, ui.x, ui.y);
        ui.rightHeld = true; ui.rightGround = [x, y];
        this.fireAtGround(x, y, false);
      }
    });
    v.addEventListener("pointerup", ev => {
      if (ev.button === 1) { ui.pan = null; return; }
      if (ev.button === 2) { ui.rightHeld = false; ui.rightGround = null; return; }
      if (ev.button !== 0 || !ui.drag || this.mode !== "play") { ui.drag = null; return; }
      const d = ui.drag; ui.drag = null;
      if (this.paused) return;
      const w = this.world;
      if (d.box) {
        const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
        const k = this.renderer.scale;
        const hit = w.agents.filter(a => { if (!a.alive) return false; const [sx, sy] = this.renderer.toScreen(w, a.x, a.y); const X = sx * k, Y = (sy - 10) * k; return X >= x0 && X <= x1 && Y >= y0 && Y <= y1; });
        if (hit.length) { if (!d.shift) w.selected.clear(); hit.forEach(a => w.selected.add(a)); W.audio.play("select"); this.hud.update(true); }
        return;
      }
      const u = this.unitAt(d.x0, d.y0);
      if (u && u.isAgent) { this.selectAgent(u, d.shift); return; }
      const [x, y] = this.renderer.toWorld(w, d.x0, d.y0);
      this.orderMove(x, y);
    });

    window.addEventListener("keydown", ev => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key.toLowerCase();
      if (k === "m" && (this.mode === "play" || this.mode === "title" || this.mode === "brief" || this.mode === "world")) {
        if (document.querySelector(".gk-sheet")) return;
        this.toggleSound(); return;
      }
      if (this.mode === "maproom") {
        if (document.querySelector(".gk-sheet")) return;
        if (this.mr && this.mr.onKey(k, ev)) ev.preventDefault();
        return;
      }
      if (this.mode === "world") {
        if (document.querySelector(".gk-sheet")) return;
        if (this.ow && this.ow.onKey(k, ev)) ev.preventDefault();
        return;
      }
      if (this.mode === "brief") {
        if (k === "enter") { ev.preventDefault(); this.beginMission(); }
        if (k === "escape") { ev.preventDefault(); this.backFromBrief(); }
        return;
      }
      if (this.mode === "debrief") {
        if (this.run && this.run.contract) { if (k === "enter" || k === "escape") { ev.preventDefault(); this.toOverworld(); } return; }
        if (k === "r" || k === "enter") { ev.preventDefault(); this.restartMission(); }
        if (k === "escape" || k === "t") { ev.preventDefault(); this.backFromBrief(); }
        return;
      }
      if (this.mode !== "play") return;
      if (document.querySelector(".gk-sheet")) return;
      if (this.menuEl) {
        if (k === "escape") { ev.preventDefault(); this.closeMenu(); }
        if (k === "r" && !(this.run && this.run.contract)) { ev.preventDefault(); this.closeMenu(); this.restartMission(); }
        return;
      }
      if (["w", "a", "s", "d", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(k)) { this.keys.add(k); ev.preventDefault(); return; }
      const w = this.world;
      if (k >= "1" && k <= "4") {
        const a = w.agents.find(x => x.slot === +k - 1);
        if (a) {
          const now = performance.now();
          if (this.lastNum === k && now - this.lastNumT < 350) this.centerOn(a);
          this.lastNum = k; this.lastNumT = now;
          this.selectAgent(a, ev.shiftKey);
        }
        return;
      }
      if (ev.code === "Digit1" && ev.shiftKey) return;
      switch (k) {
        case "0": case "`": {
          // double-tap: look at the whole squad
          const now = performance.now();
          if (this.lastNum === "`" && now - this.lastNumT < 350) this.centerOnSelection();
          this.lastNum = "`"; this.lastNumT = now;
          this.selectAll(); break;
        }
        case "tab": {
          ev.preventDefault();
          const live = w.agents.filter(a => a.alive).sort((a, b) => a.slot - b.slot);
          if (!live.length) break;
          const cur = this.selectedAgents()[0];
          const nx = live[(live.indexOf(cur) + 1) % live.length];
          this.selectAgent(nx, false); this.centerOn(nx); break;
        }
        // the left hand's keys, beside WASD: go, calm, guns, first aid, Purrsuader
        case "e": this.goLoud(); break;
        case "c": this.calmDown(); break;
        case "r": this.toggleGuns(); break;
        case "f": this.patchUp(); break;
        case "q": this.togglePurr(); break;
        case "x": this.armStrike(); break;
        case "z": this.toggleHold(); break;
        case "v": this.toggleScan(); break;
        case "h": this.holster(); break;
        case " ": case "p": ev.preventDefault(); this.paused = !this.paused; this.showPause(); break;
        case "escape": ev.preventDefault(); if (this.ui.aim) this.standDownStrike(); else if (this.bigScan) this.toggleScan(); else this.openMenu(); break;
        case "?": case "/": this.openMenu(); break;
      }
    });
    window.addEventListener("keyup", ev => { this.keys.delete(ev.key.toLowerCase()); });
    window.addEventListener("blur", () => { this.keys.clear(); ui.rightHeld = false; });
  },

  /* ---------------- pause and menu ---------------- */
  showPause() {
    const b = document.getElementById("banner");
    if (this.paused) { b.style.color = "#ffb000"; b.innerHTML = "PAUSED<small>Space to carry on</small>"; b.hidden = false; clearTimeout(this.bannerT); }
    else b.hidden = true;
  },
  openMenu() {
    if (this.menuEl || this.mode !== "play") return;
    this.wasPaused = this.paused; this.paused = true;
    const el = document.createElement("div");
    el.className = "sheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Menu");
    const w = this.world;
    el.innerHTML = `<div class="box"><h2>Operation ${W.esc(this.level.codename)}</h2>
      <p class="note">${W.esc(this.level.name)} · ${this.hud.clock.textContent} on the clock · ${w.agents.filter(a => a.alive).length} of ${w.agents.length} Watchers standing</p>
      <div class="col">
        <button class="primary" data-a="resume"><kbd>Esc</kbd>Resume</button>
        ${this.run && this.run.contract ? "" : `<button data-a="restart"><kbd>R</kbd>Restart mission</button>`}
        <button data-a="help"><kbd>?</kbd>Controls</button>
        <button data-a="sound" aria-label="Sound" aria-pressed="${!W.prefs.muted}"><kbd>M</kbd>Sound ${W.prefs.muted ? "off" : "on"}</button>
        <button data-a="rain" aria-pressed="${W.prefs.rain}">Rain ${W.prefs.rain ? "on" : "off"}</button>
        <button class="danger" data-a="abort">${this.run && this.run.contract ? "Abort mission" : "Abort to title"}</button>
      </div>
      <div data-help hidden><h3>Controls</h3>${this.helpTabs()[0][1]}</div></div>`;
    el.addEventListener("click", async ev => {
      if (ev.target === el) return this.closeMenu();
      const b = ev.target.closest("button"); if (!b) return;
      const a = b.dataset.a;
      if (a === "resume") this.closeMenu();
      if (a === "restart") { this.closeMenu(); this.restartMission(); }
      if (a === "help") el.querySelector("[data-help]").hidden = !el.querySelector("[data-help]").hidden;
      if (a === "sound") { this.toggleSound(); b.setAttribute("aria-pressed", String(!W.prefs.muted)); b.innerHTML = `<kbd>M</kbd>Sound ${W.prefs.muted ? "off" : "on"}`; }
      if (a === "rain") { W.prefs.rain = !W.prefs.rain; W.savePrefs(); W.audio.setRain(W.prefs.rain); b.setAttribute("aria-pressed", String(W.prefs.rain)); b.textContent = `Rain ${W.prefs.rain ? "on" : "off"}`; }
      if (a === "abort") {
        const contract = this.run && this.run.contract;
        const q = contract ? "Abort the mission? It counts as a failed mission: no reward, the zone loses control, and anyone already down stays down." : "Abort the mission and go back to the title?";
        if (!(await confirmSheet(q, "Abort mission"))) return;
        this.closeMenu();
        if (contract) { this.world.end("lost", "Mission aborted."); this.toDebrief(); }
        else this.toTitle();
      }
    });
    document.body.appendChild(el);
    this.menuEl = el;
    el.querySelector("[data-a=resume]").focus();
  },
  closeMenu() {
    if (!this.menuEl) return;
    this.menuEl.remove(); this.menuEl = null;
    this.paused = this.wasPaused; this.showPause();
  },
  closeSheets() {
    if (this.briefEl) { this.briefEl.remove(); this.briefEl = null; }
    if (this.debriefEl) { this.debriefEl.remove(); this.debriefEl = null; }
    if (this.menuEl) { this.menuEl.remove(); this.menuEl = null; }
    document.getElementById("banner").hidden = true;
  },

  /* ---------------- the debrief ---------------- */
  toDebrief() {
    this.mode = "debrief";
    this.ui.rightHeld = false;
    const w = this.world, won = w.status === "won", s = w.stats;
    const bonus = w.objectives.filter(o => o.optional && o.state === "done").length;
    let grade = "";
    if (won) {
      let pts = 100 - s.lost * 18 - Math.max(0, s.civ - 2) * 4 + bonus * 8 - Math.max(0, s.time - 240) / 12;
      grade = pts >= 105 ? "S" : pts >= 90 ? "A" : pts >= 72 ? "B" : pts >= 55 ? "C" : "D";
      const best = W.store.get("best_v1", {});
      const prev = best[this.level.id];
      const rank = g => "SABCD".indexOf(g);
      if (!prev || rank(grade) < rank(prev.grade) || (grade === prev.grade && s.time < prev.time)) {
        best[this.level.id] = { grade, time: Math.round(s.time), at: new Date().toISOString().slice(0, 10) };
        W.store.set("best_v1", best);
      }
    }
    const mmss = t => String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(Math.floor(t % 60)).padStart(2, "0");
    const quote = won
      ? (s.civ > 4 ? `"That's done. The tourists are not coming back this week, and that's coming out of your budget." -- Casey Benton` : `"Done, and quietly. That's how I like it." -- Casey Benton`)
      : (w.endReason.includes("away") ? `"He walked. You let him walk." -- Casey Benton` : `"I'll need new Watchers. Try not to break these ones." -- Casey Benton`);
    // a campaign mission settles up: the reward, the dead, the days that passed
    const camp = this.run && this.run.contract && this.campaign;
    let slip = null;
    if (camp) {
      slip = W.M.settle(this.campaign, this.run.contract, {
        won, persuaded: s.persuaded || 0, civKilled: s.civ || 0,
        agents: w.agents.map(a => ({ id: a.rosterId, alive: a.alive, kills: a.kills || 0, items: a.weapons.map(x => ({ type: x.type, ammo: x.ammo, mk: x.mk })) })),
      });
      W.M.save(this.campaign);
    }
    const el = document.createElement("div");
    el.className = "sheet debrief"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Debrief");
    el.innerHTML = `<div class="box">
      ${won ? `<div class="grade" title="Mission grade">${grade}</div>` : ""}
      <div class="result ${won ? "won" : "lost"}">${won ? "Mission complete" : "Mission failed"}</div>
      <p class="note">${W.esc(w.endReason)}</p>
      <h3>Objectives</h3><ul>${w.objectives.map(o => `<li class="${o.state}">${o.state === "done" ? "✓" : "✕"} ${o.optional ? "Bonus: " : ""}${W.esc(o.text)}</li>`).join("")}</ul>
      <h3>Report</h3><table>
        <tr><td>Time</td><td>${mmss(s.time)}</td></tr>
        <tr><td>Watchers lost</td><td>${s.lost} of ${w.agents.length}</td></tr>
        <tr><td>${W.esc(w.names.crew)} down</td><td>${s.crew}</td></tr>
        <tr><td>${W.esc(w.names.sec)} down</td><td>${s.sec}</td></tr>
        <tr><td>Civilians lost</td><td>${s.civ}</td></tr>
        <tr><td>Citizens talked round</td><td>${s.persuaded || 0}</td></tr>
        ${s.civAcc ? `<tr><td>Traffic accidents (not on you)</td><td>${s.civAcc}</td></tr>` : ""}
        <tr><td>Recruited</td><td>${s.recruited}</td></tr>
        <tr><td>Rounds fired</td><td>${s.shots}</td></tr>
      </table>
      ${slip ? `<h3>Back at command</h3><table class="payslip">${slip.lines.map(([k, v]) => `<tr><td>${W.esc(k)}</td><td>${W.esc(typeof v === "number" ? W.money(v) : v)}</td></tr>`).join("")}
        <tr class="total"><td>Cash now</td><td>${W.money(this.campaign.cash)}</td></tr></table>` : ""}
      <p class="quote">${W.esc(quote)}</p>
      <div class="acts">${camp ? `<button class="primary" data-a="world"><kbd>Enter</kbd>Back to command</button>`
        : `<button class="primary" data-a="again"><kbd>R</kbd>${won ? "Play it again" : "Try again"}</button><button data-a="title"><kbd>Esc</kbd>${this.fromMapRoom ? "Back to the map room" : "Back to title"}</button>`}</div>
    </div>`;
    el.addEventListener("click", ev => {
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.a === "again") this.restartMission();
      if (b.dataset.a === "title") this.backFromBrief();
      if (b.dataset.a === "world") this.toOverworld();
    });
    document.body.appendChild(el);
    this.debriefEl = el;
    el.querySelector(".acts button").focus();
  },
};

/* Debug hook: W.game, plus a few shortcuts for poking at a mission. */
window.__PW = {
  get world() { return Game.world; },
  alarm() { const w = Game.world; w.raiseAlarm(w.targetUnit, w.agents[0]); },
  win() { const w = Game.world; w.kill(w.targetUnit, w.agents[0]); },
  god() { for (const a of Game.world.agents) { a.maxHp = 999; a.hp = 999; } },
};

Game.start();
