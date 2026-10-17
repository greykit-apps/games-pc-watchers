/* PumaCity: Watchers -- the screens and the controls. Boot (the greykit.games
 * canon), title over a live plaza, the overworld (campaign), the briefing,
 * the mission, the debrief. */
"use strict";

/* One element's text decoding out of noise, after a delay, the canon's
 * decodeTitle one line at a time: by the clock, so a throttled tab still ends
 * on time, and to the plain text the moment the signal aborts. */
function decodeText(el, text, ms, delay = 0, signal) {
  const glyphs = "▚▞▖▗▘▝#/\\<>=+", t0 = performance.now() + delay;
  const done = () => { clearInterval(t); el.textContent = text; };
  const t = setInterval(() => {
    const p = (performance.now() - t0) / ms;
    if (!el.isConnected || p >= 1 || (signal && signal.aborted)) return done();
    const n = Math.max(0, Math.floor(text.length * p));
    el.textContent = text.slice(0, n) + [...text.slice(n)].map(c => c === " " ? " " : glyphs[Math.random() * glyphs.length | 0]).join("");
  }, 28);
}

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
    const opening = this.introTitle();
    boot.finish(["four agents on standby", "Casey Benton is waiting"]).then(opening);
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      this.tick(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  toTitle(reveal = true) {
    if (this.intro) this.intro.cancel();
    this.mode = "title";
    this.closeSheets();
    if (this.ow) { this.ow.close(); this.ow = null; }
    document.getElementById("game").hidden = true;
    W.audio.ambience(false);
    const host = document.getElementById("title-host");
    host.hidden = false;
    if (this.titleUI) this.titleUI.unmount();
    this.titleUI = mountTitle(host, {
      name: "PumaCity: Watchers",
      lines: ["PumaCity", "Watchers"],
      primary: W.M.load() ? "resume" : "new",
      items: [
        (c => c && { act: "resume", label: "Resume campaign", key: "R", meta: `Day ${c.day} · ${W.money(c.cash)}${c.lost ? " · the city is lost" : c.won ? " · won" : c.stronghold ? " · in the stronghold" : c.war ? " · taking control" : ""}` })(W.M.load()),
        { act: "new", label: "New campaign", key: "N" },
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
      },
    });
    if (reveal) this.titleUI.reveal();
  },
  /* The opening, the first time the title shows, timed like Puma Express's:
   * the plaza alone, then the name a line at a time, each fading in as it
   * decodes -- PumaCity, then Watchers -- a hold, then the menu printing in
   * and decoding as the shade comes up down the left. A key or a click skips
   * to the end. Hidden from the moment it is called, behind the boot; the
   * function it returns starts it once the boot is done. */
  introTitle() {
    const INTRO = { lines: [1500, 2900], menu: 5800, done: 7000 };
    const t = document.querySelector("#title-host .gk-title");
    if (!t || reduced()) return () => this.titleUI && this.titleUI.reveal();
    const lines = [...t.querySelectorAll("h1 span[data-t]")], later = [...t.querySelectorAll(".gk-menu, footer")];
    const timers = [], ctl = new AbortController();
    for (const n of later) n.inert = true;
    t.classList.add("w-intro");
    const end = () => {
      timers.forEach(clearTimeout); ctl.abort(); this.intro = null;
      for (const n of later) n.inert = false;
    };
    const focus = () => { const b = t.querySelector(".gk-primary") || t.querySelector(".gk-menu button"); if (b) b.focus({ preventScroll: true }); };
    const menu = () => {
      end();
      t.classList.add("w-menu", "gk-rise");
      t.querySelectorAll(".gk-menu .gk-lbl").forEach((l, i) => decodeText(l, l.textContent, 420, i * 45));
      focus();
      timers.push(setTimeout(() => t.classList.remove("w-intro", "w-menu"), INTRO.done - INTRO.menu));
    };
    const intro = this.intro = {
      cancel: end,
      skip: () => {
        end();
        for (const l of lines) l.textContent = l.dataset.t;
        t.classList.remove("w-intro", "w-menu");
        lines.forEach(l => l.classList.remove("w-in"));
        focus();
      },
    };
    // any key or click during the opening only ends it; it reaches nothing else
    const skip = ev => {
      if (this.intro !== intro || ["Shift", "Control", "Alt", "Meta"].includes(ev.key)) return;
      ev.preventDefault(); ev.stopImmediatePropagation(); intro.skip();
    };
    window.addEventListener("keydown", skip, { capture: true, signal: ctl.signal });
    window.addEventListener("pointerdown", skip, { capture: true, signal: ctl.signal });
    return () => {
      if (this.intro !== intro) return;
      lines.forEach((l, i) => timers.push(setTimeout(() => { l.classList.add("w-in"); decodeText(l, l.dataset.t, 1100, 0, ctl.signal); }, INTRO.lines[i])));
      timers.push(setTimeout(menu, INTRO.menu));
    };
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
    // rows of [key, what it does]; a lone string is a heading, so one table
    // keeps the key column one width down the whole tab
    const keys = rows => `<table class="keys">${rows.map(r => typeof r === "string" ? `<tr><th colspan="2">${r}</th></tr>` : `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table>`;
    return [
      ["Controls", keys([
          "The squad",
          ["<kbd>1</kbd>–<kbd>4</kbd>", "select a Watcher; <kbd>Shift</kbd> adds or drops one"],
          ["<kbd>\`</kbd> <kbd>0</kbd>", "select the whole squad"],
          ["<kbd>Tab</kbd>", "the next Watcher"],
          ["Left click", "move there, or select a Watcher; drag a box to select several"],
          ["<kbd>Alt</kbd> + left click", "move there the quiet way, round the crew"],
          ["Right click", "fire at someone, a car, or a spot on the ground"],
          ["Weapon panel", "click a weapon to draw it"],
          "Orders",
          ["<kbd>E</kbd>", "go: stims full, guns out, the crew shot on sight"],
          ["<kbd>C</kbd>", "calm: stims off, guns away, nobody shoots first; again, stims to the middle"],
          ["<kbd>R</kbd>", "guns out or away; <kbd>H</kbd> holsters"],
          ["<kbd>F</kbd>", "first aid for anyone at half health or worse"],
          ["<kbd>Q</kbd>", "the Purrsuader, out or away; then right click someone to talk them round"],
          ["<kbd>Z</kbd>", "followers hold where they stand, or come again"],
          ["<kbd>X</kbd>", "the BanHammer: click a spot a Watcher can see; <kbd>Esc</kbd> stands it down"],
          ["<kbd>V</kbd>", "the scanner view"],
          "Cars",
          ["Left click a car", "take it, with a Watcher close by"],
          ["Left click", "drive there, by the roads"],
          ["Click the car, <kbd>G</kbd>", "get out"],
          "The view",
          ["<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, arrows", "scroll; or push the pointer to an edge, or drag with the middle button"],
          ["Double-tap <kbd>1</kbd>–<kbd>4</kbd>", "look at that Watcher (or double-click their card); <kbd>\`</kbd> or <kbd>0</kbd> the squad"],
          ["Scanner", "click to look there; <kbd>Shift</kbd>-click to send the selection"],
          ["<kbd>Space</kbd>", "pause"],
          ["<kbd>Esc</kbd>", "menu"],
          ["<kbd>M</kbd>", "sound on or off"],
        ])],
      ["Tactics", `<h3>Local security</h3>
        <p>Plaza Security, Port Authority and ranch hands do not know who you are. A gun in plain view earns one warning; keep it out and they open fire, and call their friends. Holster before you walk past them.</p>
        <h3>The crew</h3>
        <p>Cal's crew, in red, spot an armed Watcher from far off and an unarmed one only up close. Walk in with your hands empty, and draw at the last moment.</p>
        <h3>The target</h3>
        <p>Once they make you, the target <b>runs</b>: for a car, or for a way out on foot (watch the scanner). If they get away, the mission is lost.</p>
        <h3>Cars</h3>
        <p>The driver stops for a Watcher close by, gets out and runs. Inside, the squad is out of sight, unless the crew or the police saw them get in; then the car is a target. A car takes a few rounds and then goes up, taking anyone beside it. It kills a Watcher inside with the stock body; a <b>Chest</b> mod gets them out alive.</p>
        <h3>The Purrsuader</h3>
        <p>Talks people into following you. Who it works on depends on how many already follow:</p>
        ${keys([["Civilians", "at once"], ["Security", "2 followers"], ["The crew in red", "4 followers"], ["Bodyguards in black", "6 followers"], ["The mark of a hit", "6 followers; talked round, the job is done"]])}
        <p>Followers pick up guns the dead drop, and fight for you. The <b>Purrsuader II</b> reaches twice as far, works twice as fast, and talks round anyone not already shooting at you, crowd or no crowd; those who are need half the crowd.</p>
        <h3>The BanHammer</h3>
        <p>A few seconds after you mark the spot, the orbital platform clears it. Everything in the circle dies.</p>
        <h3>The scanner</h3>
        <p>The better the scanner, the more ground it covers and the more it shows. <kbd>Alt</kbd>-click routes round the armed crew it shows, through the warrens if need be.</p>
        <h3>Weapons</h3>
        <p>Watchers pick up any weapon they walk over. Ammunition is finite; the pistol never runs dry.</p>`],
      ["Stims", `<p>Every Watcher carries three stims, on the bars under the portrait. Click or drag a bar to set the dose; with several Watchers selected, the dose goes to them all.</p>
        ${keys([["<b>Zoomers</b>", "speed and rate of fire"],
          ["<b>Red Dot</b>", "aim, and how far a Watcher looks for trouble"],
          ["<b>Silvervine</b>", "reflexes and initiative. Too little and a Watcher will not fire unless ordered; a heavy dose uses a medikit by itself when badly hurt"]])}
        <h3>Dependency</h3>
        <p>Above the white midpoint a dose burns off slowly and builds a <b>dependency</b> (the red hatching), which eats into the effect until it fades. <kbd>C</kbd> sets every stim to nothing and lets it wear off. Dose for the fight, not the walk.</p>`],
      ["Campaign", `<h3>The city</h3>
        <p>Casey Benton has given the Watchers her city to hold: <b>eight zones</b>, each making whole <b>pips</b> a day.</p>
        <h3>Tax</h3>
        <p>On the <b>City</b> map, pick a zone and set its tax, as in Syndicate: what it hands the city, the rest kept for control. The <b>HOLD</b> mark keeps control where it is. Tax under it to <b>invest</b> and control climbs; over it to <b>milk</b>, and the city takes more while control slips. The <b>city split</b> in the top bar shares the take between research and money.</p>
        <h3>Control</h3>
        <p>Control decays every day. Each level adds a pip, and a calm zone's pips are worth more. Level 3 is hard to reach and, once there, holds itself for a while. If control runs out, the zone is <b>lost</b> until a siege takes it back.</p>
        <h3>Cal</h3>
        <p>Cal pushes one zone at a time, harder the better you are doing. Intel missions show where he goes next. Fight his crew where he is pushing to end it.</p>
        <h3>Missions</h3>
        <p>Missions take days, and the pips stand as you set them while the squad is away. They pay research, money or control. Each has a <b>threat</b>, T1 to T5; the squad's <b>tier</b> comes from its guns and mods. Above the squad's tier, expect to lose Watchers. <b>Quiet</b> missions can be done without a shot fired.</p>
        <h3>Research</h3>
        <p>Research costs money to start and research points to finish. Points can't be banked, and are split between the projects running. Finished research goes on sale: weapons in the <b>Armoury</b>, mods in the <b>Clinic</b>.</p>
        <h3>The squad</h3>
        <p>Ammunition is topped up free before every mission; medikits are not. Watchers who die are gone, with whatever they carried: hire replacements in the Clinic. Weapons picked up in the field come home, researched or not, to keep or sell in the Armoury.</p>
        <h3>Taking control</h3>
        <p>After 30 upgrade points Casey Benton can <b>take control</b> of the city on your order. Each zone then has a story to finish, and the last step locks it down. Lock down every zone to win.</p>
        <h3>Keys</h3>${keys([
          ["<kbd>1</kbd>–<kbd>5</kbd>", "the City, Casey's Office, the Armoury, the Clinic, the Lab"],
          ["<kbd>W</kbd> / <kbd>U</kbd>", "wait a day / wait until…"],
          ["<kbd>B</kbd>", "brief the mission marked B"],
          ["Arrows", "walk the map from zone to zone"],
          ["<kbd>?</kbd>", "how it works, over any screen"],
          ["<kbd>Esc</kbd>", "step back; twice from the City leaves for the title"],
        ])}`],
      ["About", this.aboutHTML()],
    ];
  },
  aboutHTML() {
    return `<p><b>PumaCity:Watchers</b>. An alternate-universe Casey Benton runs a dawn-of-cyberpunk sprawl with an iron paw. Manage the city while building an elite team of enforcers to push out a new rival.</p>
      <p>A squad tactics game heavily inspired by Bullfrog's <i>Syndicate</i> (1993). It was a pioneer in isometric real time strategy. I spent many hours just staring at the city in wonderment.</p>
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
        <p class="gk-note">Clears what Watchers keeps in this browser: your campaign, your settings and your best mission results.</p>`,
      onClick: async (b, sheet) => {
        if (b.hasAttribute("data-forget")) {
          if (await confirmSheet("Forget everything PumaCity: Watchers has saved in this browser: the campaign, settings and best results? This cannot be undone.", "Forget everything")) { W.store.forget(); location.reload(); }
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

  /* ---------------- the briefing ----------------
   * offerId: a mission on offer in the campaign. Every mission is the
   * campaign's: there is no skirmish. */
  toBriefing(offerId) {
    const c = this.campaign && this.campaign.offers.find(x => x.id === offerId);
    if (!c) return;
    this.run = { contract: c, opts: { roster: W.M.missionRoster(this.campaign) } };
    this.level = W.M.missionFor(this.campaign, c);
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
    // three columns that share the screen's height: the briefing; the ground and the plan; the terms, the intel and the squad
    const plan = L.options && (L.options.spawn.length > 1 || L.options.pickup.length > 1);
    el.innerHTML = `<div class="wrap">
      <div class="col">
        <div class="tag">Day ${this.campaign.day} · ${W.esc(L.district)}</div>
        <h1>${W.esc(L.name)}</h1>
        <div class="code">OPERATION ${W.esc(L.codename)}</div>
        <div class="from">From: ${W.esc(L.briefing.from)}</div>
        <div class="text" data-text>${L.briefing.text.map(p => `<p>${W.esc(p)}</p>`).join("")}</div>
        <div class="panel squad-panel"><h3>Your squad</h3><div class="squad">${w.agents.map(a => `<div class="agent"><canvas width="40" height="40" data-agent="${a.slot}"></canvas><div><b>${W.esc(a.name)}</b>${a.weapons.map(x => W.WEAPONS[x.type].name).join(", ")}</div></div>`).join("")}</div></div>
      </div>
      <div class="col">
        <div class="panel ground"><h3>The ground</h3><div class="map-box"><canvas class="map" data-map width="340" height="340" role="img" aria-label="Map of the district: where the squad goes in, the job, and the getaway car"></canvas></div>
          <div class="legend" data-legend></div></div>
        ${plan ? `<div class="panel plan"><h3>The plan: where you go in, and where the car waits</h3><div data-plan></div></div>` : ""}
      </div>
      <div class="col">
        ${(z => `<div class="panel"><h3>${W.esc(W.M.KINDS[c.kind].name)} in ${W.esc(W.M.zoneDef(c.zone).name)}</h3><table>
          <tr><td>Reward</td><td>${W.esc(W.M.describeReward(this.campaign, c))}</td></tr>
          <tr><td>The streets</td><td>${z.lost ? "lost to Cal: the enemy is dug in" : `control level ${W.M.level(z.C)}`}</td></tr>
          <tr><td>Time</td><td>${c.days} days away; the zones' pips stand as set</td></tr>
          <tr><td>Losses</td><td>the dead are gone for good, with all spent on them</td></tr>
          ${this.campaign.cal.reads ? `<tr><td>Cal's answer</td><td>He has heard about ${W.esc(W.M.CAL_ANSWER[this.campaign.cal.reads].heard)}: ${W.esc(W.M.CAL_ANSWER[this.campaign.cal.reads].answer)}</td></tr>` : ""}</table></div>`)(W.M.zone(this.campaign, c.zone))}
        <div class="panel"><h3>Intel</h3><table data-intel>${this.intelRows(L)}</table></div>
      </div>
      <div class="acts"><button class="primary" data-go><kbd>Enter</kbd>Begin mission</button><button data-back><kbd>Esc</kbd>Back</button></div>
    </div>`;
    document.body.appendChild(el);
    this.briefEl = el;
    this.drawPlan();
    this.resize();
    el.querySelectorAll("[data-agent]").forEach(c => W.drawPortrait(c.getContext("2d"), w.agents[+c.dataset.agent].look, 40, 40));
    el.querySelector("[data-go]").addEventListener("click", () => this.beginMission());
    el.querySelector("[data-back]").addEventListener("click", () => this.backFromBrief());
    el.querySelector("[data-go]").focus();
  },

  /* The plan: where the squad is dropped and where the getaway car waits,
   * from the two or three the briefing offers (L.options). A change builds the
   * mission again on the same seed, so the streets are the same each time a
   * choice is picked; what's armed across the way in and out is counted. */
  drawPlan() {
    const el = this.briefEl, L = this.level, w = this.world;
    if (!el) return;
    this.drawBriefMap();
    el.querySelector("[data-text]").innerHTML = L.briefing.text.map(p => `<p>${W.esc(p)}</p>`).join("");
    el.querySelector("[data-intel]").innerHTML = this.intelRows(L);
    const slot = el.querySelector("[data-plan]");
    if (!slot) return;
    const sp = L.picks.spawn, tg = L.picks.target, car = w.pickupAt ? { x: w.pickupAt[0], y: w.pickupAt[1] } : L.picks.pickup;
    // armed trouble within reach of the straight line in, and the one out
    const armed = e => e.hostile && e.crew.some(u => u.alive && W.hasGun(u));
    const near = (a, b) => (w.encounters || []).filter(e => armed(e) && W.segDist(e.x, e.y, a, b) < W.WAY_WIDTH / 2).length;
    const walk = (a, b) => Math.round(W.dist(a.x, a.y, b.x, b.y));
    const row = (kind, label, list, cur) => list.length > 1 ? `<div class="plan-row"><span>${label}</span>${list.map((p, i) => `<button type="button" data-plan-${kind}="${i}" aria-pressed="${p === cur}">${W.esc(p.name)}</button>`).join("")}</div>` : "";
    slot.innerHTML = `${row("spawn", "Drop-off", L.options.spawn, sp)}${row("pickup", "Getaway car", L.options.pickup, L.picks.pickup)}
      <p class="plan-note">In: ${walk(sp, tg)} tiles, ${near(sp, tg) || "no"} armed group${near(sp, tg) === 1 ? "" : "s"} near the way. Out: ${walk(tg, car)} tiles, ${near(tg, car) || "no"} armed group${near(tg, car) === 1 ? "" : "s"}.</p>`;
    slot.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      const kind = b.dataset.planSpawn != null ? "spawn" : "pickup", p = L.options[kind][+(b.dataset.planSpawn ?? b.dataset.planPickup)];
      if (L.picks[kind] === p) return;
      L.picks[kind] = p;
      this.world = new W.World(L, this.run.opts);
      this.drawPlan();
      const again = this.briefEl.querySelector(`[data-plan-${kind}="${L.options[kind].indexOf(p)}"]`);
      if (again) again.focus();
    }));
  },

  /* The briefing's map: the district as the scanner sees it, drawn once into
   * a cache, and over it the marks (W.briefMarks), moving, every frame the
   * briefing is up. The legend under it names the marks there are. */
  drawBriefMap() {
    const el = this.briefEl, w = this.world;
    const cv = el && el.querySelector("[data-map]");
    if (!cv) return;
    // the map as big as its box allows, square, at one canvas pixel to a screen pixel
    const box = cv.parentElement.getBoundingClientRect(), side = Math.max(200, Math.floor(Math.min(box.width, box.height)));
    if (cv.width !== side) { cv.width = side; cv.height = side; }
    cv.style.width = cv.style.height = `${side}px`;
    const base = this.briefBase || (this.briefBase = document.createElement("canvas"));
    base.width = cv.width; base.height = cv.height;
    this.renderer.scanner(base.getContext("2d"), w, { full: true, noCiv: true, noView: true });
    this.briefScan = Object.assign({}, this.renderer.scan);
    this.briefMarks = W.briefMarks(w);
    const kinds = Object.keys(W.MARK_STYLE).filter(k => this.briefMarks.some(m => m.kind === k));
    const name = { target: (this.briefMarks.find(m => m.kind === "target") || {}).label };
    el.querySelector("[data-legend]").innerHTML = kinds.map(k => `<span><i class="mk mk-${k}" style="--c:${W.MARK_STYLE[k].color}"></i>${W.esc(k === "target" && name.target ? name.target[0] + name.target.slice(1).toLowerCase() : W.MARK_STYLE[k].name)}</span>`).join("")
      + `<span class="dots"><i style="background:#54f2ff"></i>Watchers <i style="background:#ff5266"></i>crew <i style="background:#4c6fd0"></i>police</span>`;
    if (this.briefRaf) return;
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches, t0 = performance.now();
    const frame = () => {
      const cv2 = this.briefEl && this.mode === "brief" && this.briefEl.querySelector("[data-map]");
      if (!cv2) { this.briefRaf = null; return; }
      const c = cv2.getContext("2d");
      c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this.briefBase, 0, 0);
      // the marks go where the cache's scanner put the ground
      this.renderer.scan = this.briefScan;
      this.renderer.briefMarks(c, this.briefMarks, (performance.now() - t0) / 1000, still);
      this.briefRaf = still ? null : requestAnimationFrame(frame);
    };
    frame();
  },

  // the intel table; the pickup's row only where there's no plan to show it
  intelRows(L) {
    const plan = L.options && L.options.pickup.length > 1;
    return L.briefing.intel.filter(([a]) => !(plan && a === "Pickup")).map(([a, b]) => `<tr><td>${W.esc(a)}</td><td>${W.esc(b)}</td></tr>`).join("");
  },

  backFromBrief() { this.toOverworld(); },

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
    W.audio.ambience(true, `${this.level.name}|${this.level.codename}`);
    for (const [t, col] of this.level.intro ? this.level.intro(w) : [["JOYEUSE: You're on, Watchers. Sly's at the cafe, north-east corner. Keep it quiet.", "#54f2ff"], ["Weapons are holstered. Plaza Security will warn anyone with a gun out.", "#94a0c4"]]) w.msg(t, col);
    // the title card names the job: the first objective, which follows the kind
    const job = w.objectives[0] ? w.objectives[0].text : `Eliminate ${w.names.target}`;
    this.banner(this.level.name.toUpperCase(), job, "#54f2ff");
    this.hint(true);
    this.view.focus && this.view.focus();
  },
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
    h.innerHTML = "<b>Left</b> move (<b>Alt</b>: the quiet way) · <b>Right</b> fire / persuade · <b>` 1–4</b> select · <b>E</b> go · <b>C</b> calm · <b>R</b> guns · <b>F</b> first aid · <b>Q</b> Purrsuader · <b>X</b> BanHammer · <b>Z</b> hold · <b>V</b> scanner · <b>Space</b> pause";
    clearTimeout(this.hintT);
    if (show) this.hintT = setTimeout(() => { h.hidden = true; }, 15000);
  },

  resize() {
    // the briefing's map follows the room its column leaves it
    if (this.mode === "brief" && this.briefEl && this.briefBase) this.drawBriefMap();
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
    // the score's mood: trouble while the crew or security are after the squad close by
    this.moodT = (this.moodT || 0) - dt;
    if (this.moodT <= 0) {
      this.moodT = 0.5;
      const squad = w.agents.filter(a => a.alive);
      W.audio.trouble(w.units.some(o => o.alive && !o.isAgent && !o.follower &&
        (o.faction === "crew" ? o.hostile : o.kind === "sec" && o.angryAt && o.angryAt.player) &&
        squad.some(a => W.dist(a.x, a.y, o.x, o.y) < 18)));
    }
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
        if (purr) {
          h.mode = "persuade";
          const ok = W.canPersuade(this.world, sel[0], u), mind = this.world.level.mission && this.world.level.mission.mindControl;
          const full = !u.subject && W.squadFollowers(this.world) >= W.followingCap(this.world);
          h.label = ok ? "Persuade " + lbl.toLowerCase() : mind ? lbl + ": mind-controlled, deaf to the Purrsuader" : full ? `${lbl}: your following is full (${W.followingCap(this.world)})` : lbl + ": need more followers";
          h.labelColor = ok ? "#54f2ff" : "#ffb000";
        } else { h.mode = "fire"; h.label = lbl; h.labelColor = col; }
      }
    } else {
      const c = this.carAt(ui.x, ui.y);
      const mine = c && sel.some(a => a.car === c), take = c && !mine && sel.some(a => !a.car) && W.canBoard(c);
      if (mine || take) { h.mode = "select"; h.label = mine ? "Get out" : c.player ? "Get in" : "Take the car"; h.labelColor = c.spotted ? "#ff5266" : "#54f2ff"; }
      else if (c) { h.mode = "fire"; h.label = c.stash ? "The stash" : c.escapeCar ? `${this.world.names.target}'s car` : "Car"; h.labelColor = c.stash ? "#7dffb0" : c.escapeCar ? "#ffb000" : "#94a0c4"; }
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
  /* quiet: the way round the crew the scanner shows (Alt-click), not the shortest */
  orderMove(x, y, quiet = false) {
    const w = this.world, sel = this.selectedAgents();
    if (!sel.length) return;
    const field = quiet ? W.dangerField(w) : null;
    const offs = [[0, 0], [0.9, 0], [0, 0.9], [0.9, 0.9]];
    sel.forEach((a, i) => {
      const o = sel.length === 1 ? [0, 0] : offs[i];
      const cx = sel.length === 1 ? 0 : 0.45;
      let tx = x + o[0] - cx, ty = y + o[1] - cx;
      if (!w.map.walkable(tx, ty)) { const p = w.map.nearestWalkable(tx, ty, 3); if (p) { tx = p[0]; ty = p[1]; } }
      a.manual = null;
      if (quiet) W.sneakTo(w, a, tx, ty, field); else W.goTo(w, a, tx, ty);
    });
    w.ping(x, y);
    W.audio.play("order");
  },
  /* A car, left-clicked: the selected Watchers in it get out; or the ones on
   * foot go and get in (a car in traffic, or a seat in one of ours). */
  orderCar(c) {
    const w = this.world, sel = this.selectedAgents();
    if (!sel.length) return false;
    const inside = sel.filter(a => a.car === c);
    if (inside.length) { W.leaveCar(w, c, inside); W.audio.play("order"); return true; }
    const foot = sel.filter(a => !a.car);
    if (!foot.length || !W.canBoard(c)) return false;
    for (const a of foot) { a.board = c; a.boardMax = null; a.manual = null; a.target = null; a.shootAt = null; W.stop(a); }
    w.ping(c.x, c.y); W.audio.play("order");
    return true;
  },
  /* A click on the ground: whoever is in a car drives it there, by the roads.
   * True if that was everyone selected; the rest walk (orderMove). */
  driveCars(px, py) {
    const w = this.world, sel = this.selectedAgents(), riders = sel.filter(a => a.car);
    for (const a of sel) a.board = null;
    if (!riders.length) return false;
    const [x, y] = this.renderer.toWorld(w, px, py);
    for (const c of new Set(riders.map(a => a.car))) if (!W.driveTo(w, c, x, y)) { w.msg("No road goes there.", "#ffb000"); W.audio.play("deny"); }
    if (riders.length < sel.length) return false;
    w.ping(x, y); W.audio.play("order");
    return true;
  },
  /* G: the selected Watchers in a car get out. */
  getOut() {
    const w = this.world, sel = this.selectedAgents().filter(a => a.car);
    for (const c of new Set(sel.map(a => a.car))) W.leaveCar(w, c, sel.filter(a => a.car === c));
    if (sel.length) W.audio.play("order");
  },
  orderAttack(t) {
    const w = this.world, sel = this.selectedAgents();
    let any = false;
    for (const a of sel) {
      if (a.car) continue;
      a.board = null;
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
   * dependency wear off. Again, once they are at nothing: stims to the
   * midpoint, where a dose neither builds a dependency nor burns off. */
  calmDown() {
    const sel = this.selectedAgents();
    if (!sel.length) return;
    const lvl = sel.every(a => W.STIMS.every(s => a.ipa[s.id].lvl === 0)) ? 0.5 : 0;
    for (const a of sel) {
      for (const s of W.STIMS) a.ipa[s.id].lvl = lvl;
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
    // the pointer's place comes with the enter event: a view that appears under a resting pointer must not read it as "at the top-left edge"
    v.addEventListener("pointerenter", ev => { ui.mouseIn = true; [ui.x, ui.y] = pos(ev); });
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
      if (ev.button === 0) { ui.drag = { x0: ui.x, y0: ui.y, x1: ui.x, y1: ui.y, box: false, shift: ev.shiftKey || ev.ctrlKey, quiet: ev.altKey }; return; }
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
      const c = this.carAt(d.x0, d.y0);
      if (c && this.orderCar(c)) return;
      if (this.driveCars(d.x0, d.y0)) return;
      const [x, y] = this.renderer.toWorld(w, d.x0, d.y0);
      this.orderMove(x, y, d.quiet);
    });

    window.addEventListener("keydown", ev => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key.toLowerCase();
      if (k === "m" && (this.mode === "play" || this.mode === "title" || this.mode === "brief" || this.mode === "world")) {
        if (document.querySelector(".gk-sheet")) return;
        this.toggleSound(); return;
      }
      if (this.mode === "world") {
        if (document.querySelector(".gk-sheet")) return;
        if (this.ow && this.ow.onKey(k, ev)) ev.preventDefault();
        return;
      }
      if (this.mode === "brief") {
        // Enter on one of the plan's choices picks it; anywhere else, it begins
        if (k === "enter" && document.activeElement && document.activeElement.closest && document.activeElement.closest(".plan")) return;
        if (k === "enter") { ev.preventDefault(); this.beginMission(); }
        if (k === "escape") { ev.preventDefault(); this.backFromBrief(); }
        return;
      }
      if (this.mode === "debrief") {
        if (k === "enter" || k === "escape") { ev.preventDefault(); this.toOverworld(); }
        return;
      }
      if (this.mode !== "play") return;
      if (document.querySelector(".gk-sheet")) return;
      if (this.menuEl) {
        if (k === "escape") { ev.preventDefault(); this.closeMenu(); }
        return;
      }
      if (["w", "a", "s", "d", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(k)) { this.keys.add(k); ev.preventDefault(); return; }
      const w = this.world;
      // the number keys by their physical key (ev.code): with Shift held, ev.key is "!", "@" and so on
      const num = /^Digit([1-4])$/.exec(ev.code || "") || (k >= "1" && k <= "4" ? [k, k] : null);
      if (num) {
        const a = w.agents.find(x => x.slot === +num[1] - 1);
        if (a) {
          const now = performance.now();
          if (this.lastNum === num[1] && now - this.lastNumT < 350) this.centerOn(a);
          this.lastNum = num[1]; this.lastNumT = now;
          this.selectAgent(a, ev.shiftKey);
        }
        return;
      }
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
        case "g": this.getOut(); break;
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
        <button data-a="help"><kbd>?</kbd>Controls</button>
        <button data-a="sound" aria-label="Sound" aria-pressed="${!W.prefs.muted}"><kbd>M</kbd>Sound ${W.prefs.muted ? "off" : "on"}</button>
        <button data-a="rain" aria-pressed="${W.prefs.rain}">Rain ${W.prefs.rain ? "on" : "off"}</button>
        <button class="danger" data-a="abort">Abort mission</button>
      </div>
      <div data-help hidden><h3>Controls</h3>${this.helpTabs()[0][1]}</div></div>`;
    el.addEventListener("click", async ev => {
      if (ev.target === el) return this.closeMenu();
      const b = ev.target.closest("button"); if (!b) return;
      const a = b.dataset.a;
      if (a === "resume") this.closeMenu();
      if (a === "help") el.querySelector("[data-help]").hidden = !el.querySelector("[data-help]").hidden;
      if (a === "sound") { this.toggleSound(); b.setAttribute("aria-pressed", String(!W.prefs.muted)); b.innerHTML = `<kbd>M</kbd>Sound ${W.prefs.muted ? "off" : "on"}`; }
      if (a === "rain") { W.prefs.rain = !W.prefs.rain; W.savePrefs(); W.audio.setRain(W.prefs.rain); b.setAttribute("aria-pressed", String(W.prefs.rain)); b.textContent = `Rain ${W.prefs.rain ? "on" : "off"}`; }
      if (a === "abort") {
        if (!(await confirmSheet("Abort the mission? It counts as a failed mission: no reward, the zone loses control, and anyone already down stays down.", "Abort mission"))) return;
        this.closeMenu();
        this.world.end("lost", "Mission aborted."); this.toDebrief();
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
        won, persuaded: s.persuaded || 0, turned: s.turned || 0, civKilled: s.civ || 0, strikes: s.strikes || 0, quiet: !!s.quiet,
        contracts: (w.contracts || []).map(c => ({ id: c.id, weight: c.weight, done: c.done })),
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
        ${s.turned ? `<tr><td>Crew and police turned</td><td>${s.turned}</td></tr>` : ""}
        ${(w.contracts || []).length ? `<tr><td>${w.sweep ? "Operations broken" : "Side jobs done"}</td><td>${w.contracts.filter(c => c.done).length} of ${w.contracts.length}</td></tr>` : ""}
        ${s.civAcc ? `<tr><td>Traffic accidents (not on you)</td><td>${s.civAcc}</td></tr>` : ""}
        <tr><td>Recruited</td><td>${s.recruited}</td></tr>
        <tr><td>Rounds fired</td><td>${s.shots}</td></tr>
      </table>
      ${slip ? `<h3>Back at command</h3><table class="payslip">${slip.lines.map(([k, v]) => `<tr><td>${W.esc(k)}</td><td>${W.esc(typeof v === "number" ? W.money(v) : v)}</td></tr>`).join("")}
        <tr class="total"><td>Cash now</td><td>${W.money(this.campaign.cash)}</td></tr></table>` : ""}
      <p class="quote">${W.esc(quote)}</p>
      <div class="acts"><button class="primary" data-a="world"><kbd>Enter</kbd>Back to command</button></div>
    </div>`;
    el.addEventListener("click", ev => {
      const b = ev.target.closest("button"); if (!b) return;
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
