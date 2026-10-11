/* Watchers command: the campaign's screens, in Syndicate's manner.
 *
 *   The City     the map of PumaCity (js/ui/citymap.js) with a button over
 *                each zone; the zone's dossier (its control, its tax dial,
 *                where it's heading, its missions) or, with no zone picked,
 *                Cal and the zones to watch; the day's dispatch; the missions,
 *                the ones that can't wait first.
 *   The Lab      research as a tree of marks, and the war meter.
 *   The Clinic   the roster, a Watcher's body and its mods, and the Armoury.
 *   The Office   Casey Benton's penthouse: what money buys from the Boss.
 *
 * The top bar carries the readouts, the city split between research and
 * money, and Wait a day. Waiting plays the dispatch on the map. Every change
 * saves the campaign and redraws; focus comes back to where it was. */
"use strict";

W.Command = class {
  constructor(game) {
    this.game = game;
    this.screen = W.store.get("cmdscreen_v1", "city");
    if (!["city", "lab", "clinic", "office"].includes(this.screen)) this.screen = "city";
    this.zoneId = null;
    this.agentId = null;
    this.officeZone = null;
    this.allOffers = false;
    this.showLog = false;
    this.dispatchData = null;
    this.banners = [];
    this.armed = null;          // a button waiting for its second click
  }
  get s() { return this.game.campaign; }

  open() {
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "cx";
      this.el.setAttribute("role", "main");
      this.el.setAttribute("aria-label", "Watchers command");
      this.el.addEventListener("click", ev => this.onClick(ev));
      this.el.addEventListener("input", ev => this.onInput(ev));
      this.el.addEventListener("change", ev => this.onChange(ev));
      this.el.addEventListener("keydown", ev => this.onZoneKey(ev));
      this.el.addEventListener("pointerover", ev => this.onHover(ev, true));
      this.el.addEventListener("pointerout", ev => this.onHover(ev, false));
      document.body.appendChild(this.el);
      // what must survive a redraw: the toast, the banner, and the region that announces each day
      this.layer = document.createElement("div");
      this.layer.className = "cx-layer";
      this.layer.innerHTML = `<div class="cx-toast" role="status"></div><div class="cx-banner" hidden></div><div class="sr" aria-live="polite" data-live></div>`;
      this.layer.addEventListener("click", ev => { if (ev.target.closest(".cx-banner")) this.hideBanner(); });
      document.body.appendChild(this.layer);
      this.mapCv = document.createElement("canvas");
      this.mapCv.className = "cx-map";
      this.mapCv.setAttribute("aria-hidden", "true");
      this.mapCv.addEventListener("click", ev => { const id = this.map.hit(ev.clientX, ev.clientY); if (id) this.pickZone(id); });
      this.mapCv.addEventListener("pointermove", ev => { const id = this.map.hit(ev.clientX, ev.clientY); this.mapCv.style.cursor = id ? "pointer" : ""; if (id !== this.map.ui.hover) this.map.set(this.s, { hover: id }); });
      this.mapCv.addEventListener("pointerleave", () => this.map.set(this.s, { hover: null }));
      this.map = new W.CityMap(this.mapCv);
      this.onResize = () => { if (this.map) this.map.set(this.s, {}); };
      window.addEventListener("resize", this.onResize);
    }
    // a save from before the city split keeps its policies until the player touches the balance
    if (this.s.balance == null) {
      let r = 0, rest = 0;
      for (const z of this.s.zones) if (!z.lost) { const P = W.M.fitPolicy(this.s, z); r += P.r; rest += P.r + P.m; }
      this.s.balance = rest ? r / rest : 0.5;
    }
    this.el.hidden = false;
    this.draw();
  }
  close() {
    if (this.map) this.map.stop();
    window.removeEventListener("resize", this.onResize);
    clearTimeout(this.bannerT); clearTimeout(this.toastT);
    if (this.el) { this.el.remove(); this.el = null; }
    if (this.layer) { this.layer.remove(); this.layer = null; }
  }
  // any change but a wait clears the dispatch's tags off the map
  commit() { W.M.save(this.s); if (this.map) this.map.clearChanges(); this.draw(); }

  /* ---------------- drawing ---------------- */
  draw() {
    const s = this.s, M = W.M;
    if (!this.agentId || !M.agentById(s, this.agentId)) this.agentId = s.roster[0] && s.roster[0].id;
    M.liveThreats(s);
    const fk = this.focusTo || (document.activeElement && this.el.contains(document.activeElement) ? document.activeElement.dataset.fk : null);
    const hadFocus = !!fk;
    this.focusTo = null;
    const scroll = [...this.el.querySelectorAll("[data-scroll]")].map(e => [e.dataset.scroll, e.scrollTop]);
    this.el.innerHTML = `${this.topHTML()}${this.barHTML()}
      <div class="cx-screen cx-${this.screen}" id="cx-screen" role="tabpanel" aria-labelledby="tab-${this.screen}">${this[this.screen + "HTML"]()}</div>`;
    for (const [k, t] of scroll) { const e = this.el.querySelector(`[data-scroll="${k}"]`); if (e) e.scrollTop = t; }
    // the map keeps its canvas between draws, so its easing and Cal's pulse carry on
    const slot = this.el.querySelector("[data-mapslot]");
    if (slot) { slot.prepend(this.mapCv); this.map.set(s, { sel: this.zoneId, hover: null }); } else this.map.stop();
    W.pix.paint(this.el);
    this.el.querySelectorAll("canvas[data-port]").forEach(c => { const a = M.agentById(s, +c.dataset.port); if (a) W.drawPortrait(c.getContext("2d"), W.agentLook(a), c.width, c.height); });
    this.el.querySelectorAll("canvas[data-icon]").forEach(c => W.drawWeaponIcon(c.getContext("2d"), c.dataset.icon, c.width / 2, c.height / 2, "#eef2f8"));
    this.el.querySelectorAll("canvas[data-bar]").forEach(c => { const k = 2; c.width = 18 * k; c.height = 18 * k; const x = c.getContext("2d"); W.pix.icon(x, c.dataset.bar, 0, 0, 2 * k, getComputedStyle(c).color); });
    this.drawFigure();
    const office = this.el.querySelector("canvas[data-office]");
    if (office) { const r = office.getBoundingClientRect(); office.width = Math.round(r.width); office.height = Math.round(r.height); W.drawOffice(office.getContext("2d"), office.width, office.height); }
    // focus goes back where it was; failing that, to a stand-in for what vanished; failing that, to the screen's tab
    if (hadFocus) {
      const find = k => { const e = k && this.el.querySelector(`[data-fk="${CSS.escape(k)}"]`); return e && !e.disabled ? e : null; };
      const alt = fk.replace(/^(close|w|og)-/, "zone-").replace(/^start-(.*)$/, "cancel-$1").replace(/^sell-\d+$/, "sell-0").replace(/^buy-.*$/, "scanner");
      const back = find(fk) || find(alt) || find(`dial-${this.zoneId}`) || find(`screen-${this.screen}`);
      if (back) back.focus({ preventScroll: true });
    }
    if (this.banners.length && !this.bannerOn) this.nextBanner();
  }

  px(text, cls = "", k = 2) { return W.pix.html(text, cls, k); }
  // a pixel title that is also a heading
  hx(text, cls = "", k = 2, level = 2) { return `<h${level} class="hx">${this.px(text, cls, k)}</h${level}>`; }

  /* ---- the top bar: readouts, the city split, waiting ---- */
  topHTML() {
    const s = this.s, M = W.M, take = this.take();
    const pts = s.research.points, war = M.N.WAR_AT;
    const was = this.fresh ? this.fresh.points : pts;
    const cells = Array.from({ length: war }, (_, i) => `<i class="${i < pts ? "on" : ""} ${i >= was && i < pts ? "new" : ""}"></i>`).join("");
    const bal = this.balanceParts();
    const running = s.research.running.length;
    return `<header class="cx-top">
      <div class="cx-brand">${this.hx("WATCHERS", "brand", 3, 1)}</div>
      <div class="cx-read">
        <div class="lcd"><small>Day</small>${this.px(String(s.day).padStart(3, "0"), "lcd-t", 2)}</div>
        <div class="lcd"><small>Cash</small>${this.px(W.money(s.cash), "lcd-t", 2)}</div>
        <div class="lcd take" title="What the city makes a day: money, and research points (RP)"><small>A day<span class="sr">, money and research points (RP)</span></small><span class="v">${this.takeLCD(take)}</span></div>
        <div class="warm ${s.war ? "at" : s.warReady ? "ready" : ""}"><small>${s.war ? "At war" : s.warReady ? "War: ready, your order" : "War footing"}</small>
          ${s.war ? this.px("AT WAR", "war-t", 2) : `<span class="cells" role="meter" aria-label="Upgrade points toward war" aria-valuemin="0" aria-valuemax="${war}" aria-valuenow="${Math.min(pts, war)}">${cells}</span><b>${pts}/${war}</b>`}</div>
      </div>
      <div class="cx-split">
        <label for="cx-bal" title="What the zones don't spend on control, split between research and money">City split</label>
        <div class="split-row"><span class="c-r">Research <b>${bal.r}</b></span>
          <input id="cx-bal" type="range" min="0" max="${bal.rest}" step="1" value="${bal.r}" data-a="balance" data-fk="balance" ${bal.rest ? "" : "disabled"} aria-valuetext="${bal.r} pips to research, ${bal.rest - bal.r} to money">
          <span class="c-m">Money <b>${bal.rest - bal.r}</b></span></div>
      </div>
      <div class="cx-wait">
        <button class="go" data-a="wait" data-fk="wait"><kbd>W</kbd>Wait a day</button>
        <div class="until">
          <button data-a="until" data-fk="until" aria-expanded="${!!this.untilOpen}" aria-haspopup="true">Until…</button>
          ${this.untilOpen ? `<div class="until-menu" role="menu" aria-label="Wait until"><small class="mh">Wait until</small>
            <button role="menuitem" data-a="waituntil" data-u="research" data-fk="u-research" ${running ? "" : "disabled"}>Research finishes${running ? "" : `<small>nothing running</small>`}</button>
            <button role="menuitem" data-a="waituntil" data-u="cal" data-fk="u-cal">Cal moves</button>
            <button role="menuitem" data-a="waituntil" data-u="week" data-fk="u-week">A week has passed</button>
            <small>It stops early if a zone is lost or Cal moves in.</small></div>` : ""}
        </div>
      </div>
    </header>`;
  }
  takeLCD(take) { return `${this.px("+" + W.money(take.money), "lcd-t m", 2)}${this.px("+" + take.rp.toFixed(1) + " RP", "lcd-t r", 2)}`; }
  take() {
    const s = this.s, M = W.M;
    let rp = 0, money = 0;
    for (const z of s.zones) { if (z.lost) continue; const P = M.fitPolicy(s, z); rp += P.r * M.yieldOf(z); money += P.m * M.moneyYield(z) * M.N.PIP_MONEY; }
    return { rp, money };
  }
  balanceParts() {
    const s = this.s, M = W.M;
    let r = 0, rest = 0;
    for (const z of s.zones) if (!z.lost) { const P = M.fitPolicy(s, z); r += P.r; rest += P.r + P.m; }
    return { r, rest };
  }

  /* ---- the screen bar ---- */
  barHTML() {
    const s = this.s, M = W.M;
    const idle = !s.research.running.length;
    const tabs = [
      ["city", "CITY", "1", "Map, zones, missions", s.offers.length ? `<i class="n">${s.offers.length}</i>` : ""],
      ["lab", "LAB", "2", "Research and war", idle ? `<i class="n warn">IDLE</i>` : ""],
      ["clinic", "CLINIC", "3", "Squad, mods, armoury", `<i class="n soft">${M.squad(s).length}/${M.SQUAD}</i>`],
      ["office", "OFFICE", "4", "What the Boss can buy", ""],
    ];
    return `<nav class="cx-bar" role="tablist" aria-label="Screens">${tabs.map(([id, label, key, sub, badge]) =>
      `<button role="tab" id="tab-${id}" title="${sub}" tabindex="${this.screen === id ? 0 : -1}" data-a="screen" data-screen="${id}" data-fk="screen-${id}" aria-selected="${this.screen === id}" aria-controls="cx-screen">
        <canvas data-bar="${id}" aria-hidden="true"></canvas><span class="bl">${this.px(label, "bar-t", 2)}<span class="sr">: ${sub}</span></span>${badge}<kbd>${key}</kbd></button>`).join("")}</nav>`;
  }

  /* ---------------- the City ---------------- */
  cityHTML() {
    const s = this.s;
    const zb = s.zones.map(z => {
      const [x, y] = W.CityMap.place(z.id);
      return `<button class="zb" data-a="zone" data-z="${z.id}" data-fk="zone-${z.id}" aria-pressed="${this.zoneId === z.id}" aria-label="${W.esc(this.zoneSay(z))}"
        style="left:${x}%;top:${y}%"></button>`;
    }).join("");
    return `<section class="cx-mapbox" aria-label="Map of PumaCity">
        <div class="cx-slot" data-mapslot>${zb}</div>
        <ul class="cx-legend" aria-label="Key">
          <li><i class="sw l0"></i>L0</li><li><i class="sw l1"></i>L1</li><li><i class="sw l2"></i>L2</li><li><i class="sw l3"></i>L3</li>
          <li><i class="sw lk"></i>Locked</li><li><i class="sw ls"></i>Lost</li><li><i class="sw cal"></i>Cal</li></ul>
      </section>
      <section class="cx-mid" data-scroll="mid">${this.zoneId ? this.dossierHTML(W.M.zone(s, this.zoneId)) : this.overviewHTML()}${this.dispatchHTML()}</section>
      <section class="cx-ops" data-scroll="ops" aria-label="Missions">${this.opsHTML()}</section>`;
  }
  zoneSay(z) {
    const M = W.M, D = M.zoneDef(z.id), s = this.s;
    if (z.lost) return `${D.name}: lost to Cal`;
    if (z.locked) return `${D.name}: locked down`;
    const f = M.forecast(s, z), n = s.offers.filter(o => o.zone === z.id).length;
    return `${D.name}: level ${M.level(z.C)}, ${this.fcText(f).toLowerCase()}${s.cal.zone === z.id ? ", Cal is pushing here" : ""}${n ? `, ${n} mission${n > 1 ? "s" : ""}` : ""}`;
  }
  fcText(f) {
    if (!f) return "";
    if (f.steady) return f.top ? "Holding at the top" : "Holding steady";
    if (f.lost) return `Lost in ${f.days} day${f.days > 1 ? "s" : ""}`;
    return `Level ${f.to} in ${f.days} day${f.days > 1 ? "s" : ""}`;
  }
  fcCls(f, z) { return !f || f.steady ? "steady" : f.lost || f.to < W.M.level(z.C) ? "down" : "up"; }

  dossierHTML(z) {
    const s = this.s, M = W.M, D = M.zoneDef(z.id), L = M.level(z.C);
    const DIST = { downtown: "Downtown", suburbs: "The Suburbs", convention: "The Convention Center", starport: "The Starport", ranch: "The Ranch" };
    const pct = v => `${(100 * Math.max(0, Math.min(M.N.CAP, v)) / M.N.CAP).toFixed(1)}%`;
    const head = `<header class="dz-head">
        <div>${this.hx(D.name.toUpperCase().replace(" AND THE MARKET", ""), "dz-t", 2)}<small>${DIST[D.district]} · held by ${W.esc(D.held)}</small></div>
        <span class="lvl ${z.lost ? "ls" : z.locked ? "lk" : "l" + L}">${z.lost ? "LOST" : z.locked ? "LOCKED" : `LEVEL ${L}`}</span>
        <button class="x" data-a="zone" data-z="${z.id}" data-fk="close-${z.id}" aria-label="Close the dossier">Close</button>
      </header><p class="blurb">${W.esc(D.blurb)}</p>`;
    // the mission that matters most here, ready to brief; the rest are in the list beside, which narrows to this zone
    const here = s.offers.filter(o => o.zone === z.id), over = o => (o.threat || 1) > M.squadTier(s, o);
    const top = here.find(o => o.kind === "cal" || o.kind === "siege") || here.slice().sort((a, b) => over(a) - over(b) || (a.threat || 1) - (b.threat || 1))[0];
    const missions = top ? `<h3 class="sub">Best here <span>${here.length > 1 ? `${here.length - 1} more in the list` : "the only one"}</span></h3>${this.offerHTML(top, false, "dz-")}`
      : `<p class="hint">No missions here today.</p>`;
    const ready = s.research.worksReady || 0;
    const office = `${ready && !z.lost ? `<button data-a="works" data-z="${z.id}" data-fk="works-${z.id}">Build zone works here · ${ready} ready</button><small class="hint">A pip more here, for good.</small>` : ""}
      <button class="link" data-a="office" data-z="${z.id}" data-fk="office-${z.id}">Buy for ${W.esc(D.name)} in Casey's Office</button>`;
    if (z.lost) return `<article class="panel dossier lost">${head}<p class="state bad">Lost to Cal. Nothing comes out of it until a siege takes it back, or an amnesty from the Office.</p>${missions}${office}</article>`;
    if (z.locked) return `<article class="panel dossier locked">${head}<p class="state good">Locked down. It doesn't decay, and every pip it makes comes to the city.</p>${missions}</article>`;
    const f = M.forecast(s, z), net = M.netControl(s, z), P = M.fitPolicy(s, z), p = M.pips(s, z), hold = Math.min(p, M.holdPips(s, z)), y = M.yieldOf(z);
    const flags = [
      s.cal.zone === z.id ? `<li class="bad"><b>Cal is pushing here</b>, ${s.cal.left} more day${s.cal.left === 1 ? "" : "s"}. A mission against his crew ends it.</li>` : "",
      s.cal.revealed && s.cal.next === z.id && !s.cal.zone ? `<li class="warn"><b>Cal comes here next</b>, in ${s.cal.nextIn} day${s.cal.nextIn === 1 ? "" : "s"}. Bank control now.</li>` : "",
      z.tactic ? `<li class="warn"><b>${W.esc(z.tactic)}</b>: control pips buy less until it's countered in the Lab.</li>` : "",
      z.floor ? `<li class="dark"><b>${z.floor === 2 ? "Mind control" : "Propaganda"}</b>: it settles back to level ${z.floor} by itself.</li>` : "",
      z.martial > 0 ? `<li><b>Martial law</b>: control can't fall for ${z.martial} more day${z.martial === 1 ? "" : "s"}.</li>` : z.martial < 0 ? `<li class="warn"><b>After martial law</b>: decay at double for ${-z.martial} day${z.martial === -1 ? "" : "s"}.</li>` : "",
      z.festival > 0 ? `<li class="good"><b>A festival</b>: control rising for ${z.festival} more day${z.festival === 1 ? "" : "s"}.</li>` : "",
    ].join("");
    const ticks = Array.from({ length: p + 1 }, (_, i) => `<i style="left:${p ? (100 * i / p) : 0}%"></i>`).join("");
    return `<article class="panel dossier">${head}
      <div class="gauge" role="img" aria-label="Control ${z.C.toFixed(2)} of ${M.N.CAP}">
        <div class="g-track"><div class="g-fill" style="width:${pct(z.C)}"></div>
          <s style="left:${pct(3.5)}" title="from 3.5 the zone settles: decay is slow"></s>
          ${[1, 2, 3].map(l => `<u style="left:${pct(l)}"></u>`).join("")}
          ${z.floor ? `<b class="floor" style="left:${pct(z.floor)}" title="the floor: it settles back to here"></b>` : ""}</div>
        <div class="g-lab"><span style="left:0">0</span>${[1, 2, 3].map(l => `<span style="left:${pct(l)}">L${l}</span>`).join("")}<span class="pl" style="left:${pct(3.72)}">steady</span></div>
      </div>
      <p class="fc ${this.fcCls(f, z)}" data-live="fc">${this.fcLine(z, f, net)}</p>
      <div class="dial">
        <div class="dial-head"><label for="dial-${z.id}">Spend on control</label><b data-live="dialc">${this.dialHead(z, P, p, hold, y)}</b></div>
        <div class="dial-track" style="--hold:${p ? 100 * hold / p : 0}%">${ticks}
          <input id="dial-${z.id}" type="range" min="0" max="${p}" step="1" value="${P.c}" data-a="dial" data-z="${z.id}" data-fk="dial-${z.id}" aria-valuetext="${P.c} of ${p} pips on control, ${this.dialHead(z, P, p, hold, y)}">
          <span class="hold ${p && hold / p > 0.8 ? "end" : p && hold / p < 0.2 ? "start" : ""}" title="the pips on control that hold the level where it is">HOLD ${hold}</span></div>
        <div class="dial-ends"><span>${this.px("◂", "glyph", 2)} Milk</span><span>Invest ${this.px("▸", "glyph", 2)}</span></div>
        <p class="dial-out" data-live="out">${this.dialOut(z, P, y)}</p>
      </div>
      ${flags ? `<ul class="flags">${flags}</ul>` : ""}
      ${missions}${office}</article>`;
  }
  fcLine(z, f, net) { return `<b>${this.px(f && !f.steady ? (f.lost || f.to < W.M.level(z.C) ? "▼" : "▲") : "■", "glyph", 2)} ${this.fcText(f)}</b> <span>${net >= 0 ? "+" : ""}${net.toFixed(2)} control a day</span>`; }
  dialHead(z, P, p, hold, y) {
    const d = P.c - hold, cost = P.c * y * W.M.N.PIP_MONEY;
    return `${W.money(cost)} a day · ${d > 0 ? `investing: ${d} pip${d > 1 ? "s" : ""} over what holds it` : d < 0 ? `milking: ${-d} pip${-d > 1 ? "s" : ""} under what holds it` : "holding it steady"}`;
  }
  dialOut(z, P, y) { return `To the city: <span class="c-m">${W.money(P.m * W.M.moneyYield(z) * W.M.N.PIP_MONEY)}</span> and <span class="c-r">${(P.r * y).toFixed(1)} RP</span> a day`; }

  overviewHTML() {
    const s = this.s, M = W.M, c = s.cal;
    const calOffer = s.offers.some(o => o.kind === "cal");
    const cal = c.zone
      ? `<p><b class="bad">Cal is pushing ${W.esc(M.zoneDef(c.zone).name)}</b>, ${c.left} more day${c.left === 1 ? "" : "s"}${c.bribed ? " (half-hearted: City Hall was paid)" : ""}. ${calOffer ? "Hitting his crew there ends it: first under Can't wait." : "A mission against his crew there would end it."}</p>`
      : c.revealed && c.next ? `<p>Cal is resting. <b class="warn">Next: ${W.esc(M.zoneDef(c.next).name)}, in ${c.nextIn} day${c.nextIn === 1 ? "" : "s"}.</b> Bank control there now.</p>`
      : `<p>Cal is resting. Where he goes next is anyone's guess: intel missions, or informants from the Office, would tell you.</p>`;
    const watch = s.zones.filter(z => !z.locked).map(z => ({ z, f: M.forecast(s, z) }))
      .filter(({ z, f }) => z.lost || (f && (f.lost || (f.to != null && f.to < M.level(z.C)))))
      .sort((a, b) => (b.z.lost - a.z.lost) || ((a.f && a.f.days) || 0) - ((b.f && b.f.days) || 0));
    return `<article class="panel cal ${c.zone ? "on" : ""}">${this.hx("CAL", "cal-t", 2)}${cal}</article>
      <article class="panel watch"><h3 class="sub">Zones slipping <span>${watch.length || "none"}</span></h3>
        ${watch.length ? `<ul>${watch.map(({ z, f }) => `<li><button data-a="zone" data-z="${z.id}" data-fk="w-${z.id}"><b>${W.esc(M.zoneDef(z.id).name)}</b><span class="${z.lost ? "bad" : "down"}">${z.lost ? "Lost: siege to retake" : this.fcText(f)}</span></button></li>`).join("")}</ul>`
          : `<p class="quiet">Every zone is holding or climbing. Pick one on the map to set what it spends on control.</p>`}
      </article>`;
  }

  /* ---- the dispatch: what the last wait did; earlier days on request ---- */
  dispatchHTML() {
    const s = this.s, d = this.dispatchData;
    const lines = d ? d.lines : this.logDay(s.log[0] ? s.log[0].day : s.day).map(l => ({ cls: l.kind, text: l.text }));
    const title = d ? (d.days > 1 ? `DAYS ${d.from}-${d.to - 1}` : `DAY ${d.from}`) : `DAY ${s.log[0] ? s.log[0].day : s.day}`;
    const days = [...new Set(s.log.map(l => l.day))].slice(d ? 0 : 1, 8);
    return `<section class="panel dispatch" aria-live="polite" aria-label="Dispatch">
      <header>${this.hx("DISPATCH", "sub-t", 2)}<small>${title.toLowerCase().replace("day", "Day").replace("days", "Days")}</small></header>
      <ul>${lines.map(l => `<li class="${l.cls || ""}">${W.esc(l.text)}</li>`).join("") || `<li class="quiet">A quiet day. Nothing changed.</li>`}</ul>
      ${days.length ? `<button class="link" data-a="log" data-fk="log" aria-expanded="${this.showLog}">${this.showLog ? "Hide" : "Show"} earlier days</button>` : ""}
      ${this.showLog ? days.map(day => `<h4>Day ${day}</h4><ul class="old">${this.logDay(day).map(l => `<li class="${l.kind}">${W.esc(l.text)}</li>`).join("")}</ul>`).join("") : ""}
    </section>`;
  }
  // a day's log, with the same line said twice said once
  logDay(day) {
    const seen = new Set();
    return this.s.log.filter(l => l.day === day && !seen.has(l.text) && seen.add(l.text));
  }

  /* ---- the missions ---- */
  opsHTML() {
    const s = this.s, M = W.M, tier = M.squadTier(s), squad = M.squad(s);
    const urgentOf = o => o.kind === "cal" || o.kind === "siege" || o.kind === "story" || o.expires <= s.day;
    const pool = this.zoneId && !this.allOffers ? s.offers.filter(o => o.zone === this.zoneId) : s.offers;
    const urgent = s.offers.filter(urgentOf).sort((a, b) => (a.threat || 1) - (b.threat || 1));
    const rest = pool.filter(o => !urgentOf(o));
    // one offer is the one to take: the first urgent one in reach, else the easiest in the weakest zone
    const reach = o => (o.threat || 1) <= M.squadTier(s, o) && !M.canRun(s, o);
    const rec = urgent.find(reach) || rest.filter(reach).sort((a, b) => M.zone(s, a.zone).C - M.zone(s, b.zone).C || (a.threat || 1) - (b.threat || 1))[0];
    this.rec = rec && rec.id;
    const byZone = {};
    for (const o of rest) (byZone[o.zone] = byZone[o.zone] || []).push(o);
    const order = Object.keys(byZone).sort((a, b) => M.zone(s, a).C - M.zone(s, b).C);
    return `<header class="ops-head">${this.hx("MISSIONS", "sub-t", 2)}
        <p class="squadline"><span title="Missions above the squad's tier cost Watchers. Quiet ones can be done without a shot fired.">Squad tier <b>${tier}</b><span class="sr">: missions above it cost Watchers; quiet ones can be done without a shot fired</span></span> <span class="dots t-ok" aria-hidden="true">${this.dots(tier, tier)}</span> · ${squad.map(a => W.esc(a.name)).join(", ")}
          <button class="link" data-a="screen" data-screen="clinic" data-fk="to-clinic">Clinic</button></p>
        ${M.threatStep(s) ? `<p class="hint">Cal arms his people to match: missions +${M.threatStep(s)} threat for this squad.</p>` : ""}</header>
      ${urgent.length ? `<section class="urgent"><h3 class="sub">Can't wait <span>${urgent.length}</span></h3>${urgent.map(o => this.offerHTML(o, true)).join("")}</section>` : ""}
      ${this.zoneId && !this.allOffers ? `<button class="link" data-a="alloffers" data-fk="alloffers">Show missions in every zone (${s.offers.length - urgent.length})</button>` : this.zoneId ? `<button class="link" data-a="alloffers" data-fk="alloffers">Only ${W.esc(M.zoneDef(this.zoneId).name)}</button>` : ""}
      ${order.map(id => { const z = M.zone(s, id), L = M.level(z.C);
        return `<section class="og"><h3 class="og-h"><button data-a="zone" data-z="${id}" data-fk="og-${id}">${W.esc(M.zoneDef(id).name)}</button><span class="lvl ${z.lost ? "ls" : "l" + Math.max(0, L)}">${z.lost ? "LOST" : "L" + L}</span></h3>
          ${byZone[id].sort((a, b) => (a.threat || 1) - (b.threat || 1)).map(o => this.offerHTML(o)).join("")}</section>`; }).join("")}
      ${!s.offers.length ? `<p class="quiet">Nothing on offer. Wait a day.</p>` : ""}`;
  }
  dots(threat) {
    return Array.from({ length: 5 }, (_, i) => `<i class="${i < threat ? "on" : ""}"></i>`).join("");
  }
  offerHTML(o, urgent, fkp = "") {
    const s = this.s, M = W.M, D = M.zoneDef(o.zone), K = M.KINDS[o.kind], why = M.canRun(s, o), tier = M.squadTier(s, o), th = o.threat || 1;
    const risk = th <= tier ? "ok" : th === tier + 1 ? "hard" : "deadly";
    const title = o.kind === "story" ? (M.lastStand(s, M.zone(s, o.zone), o.step) ? "Cal's last stand" : M.STORY[o.step].name) : (o.landmark && o.landmark !== D.name ? o.landmark : D.name);
    const left = o.expires - s.day;
    const exp = o.expires >= s.day + 90 ? "" : left <= 0 ? `<b class="bad">last day</b>` : `${left} day${left === 1 ? "" : "s"} left`;
    const riskWord = { ok: "within reach", hard: "a stretch", deadly: "beyond the squad" }[risk];
    return `<div class="offer k-${o.kind} ${urgent ? "urgent" : ""} ${this.rec === o.id ? "rec" : ""}">
      <div class="o-main">
        <b class="o-name">${W.esc(title)}</b>
        <p class="o-meta"><span class="threat t-${risk}" title="Threat ${th}: ${riskWord}"><span class="dots" aria-hidden="true">${this.dots(th, tier)}</span><b>T${th}</b></span>
          <span class="kind">${W.esc(K.name)}</span>${K.quiet ? `<span class="quiet-word">quiet</span>` : ""}</p>
        <small>${urgent || this.zoneId !== o.zone ? `${W.esc(D.name)} · ` : ""}${o.days} days away${exp ? ` · ${exp}` : ""} · <span class="t-${risk}">${riskWord}</span></small>
        <p class="o-pay">${W.esc(M.describeReward(s, o))}</p>
        ${M.bigGun(o) ? `<p class="o-gun">${M.carriesBanhammer(s) ? "A BanHammer strike goes with the squad: it counts here, and it's spent." : "A BanHammer strike would count here, if the squad carried one."}</p>` : ""}
        ${why ? `<p class="why">${W.esc(why)}</p>` : ""}
      </div>
      <button class="${this.rec === o.id || (fkp && risk === "ok") ? "go" : ""}" data-a="deploy" data-o="${o.id}" data-fk="${fkp}deploy-${o.id}" ${why ? "disabled" : ""}>Brief</button>
    </div>`;
  }

  /* ---------------- the Lab ---------------- */
  labHTML() {
    const s = this.s, M = W.M, R = s.research, run = R.running, rate = this.take().rp;
    const pts = R.points, war = M.N.WAR_AT;
    const cells = Array.from({ length: war }, (_, i) => `<i class="${i < pts ? "on" : ""}"></i>`).join("");
    const node = r => {
      if (!r) return `<span class="node none"></span>`;
      const done = M.isDone(s, r.id), p = run.find(x => x.id === r.id);
      if (done) return `<span class="node done"><b>MK${r.mk || 1}</b><small>done</small></span>`;
      if (p) { const pc = Math.round(100 * (1 - p.left / p.total)); return `<span class="node run"><b>MK${r.mk || 1}</b><span class="bar"><i style="width:${pc}%"></i></span><small>${pc}%${rate ? ` · ${Math.ceil(p.left / (rate / run.length))}d` : ""}</small></span>`; }
      const open = r.needs.every(n => M.isDone(s, n));
      if (!open) return `<span class="node locked"><b>MK${r.mk || 1}</b><small>needs ${W.esc(r.needs.filter(n => !M.isDone(s, n)).map(n => M.item(n).name).join(", "))}</small></span>`;
      const why = M.canStart(s, r);
      return `<span class="node open"><button data-a="start" data-r="${r.id}" data-fk="start-${r.id}" ${why ? "disabled" : ""} title="${W.esc(this.what(r))}"><b>MK${r.mk || 1}</b><small>Start · ${W.money(r.cost[0])} · ${r.cost[1]} RP${r.points === 2 ? " · counts 2 to war" : ""}</small></button>${why ? `<small class="why">${W.esc(why)}</small>` : ""}</span>`;
    };
    const lineRow = (lineId, name, what) => {
      const marks = [1, 2, 3].map(k => M.item(`${lineId}:${k}`));
      return `<li><span class="ln"><b>${W.esc(name)}</b><small>${W.esc(what)}</small></span>${marks.map(node).join("")}</li>`;
    };
    const avail = M.available(s);
    const single = r => { const a = avail.find(x => x.id === r.id) || r; return `<li><span class="ln"><b>${W.esc(r.name)}</b><small>${W.esc(this.what(r))}</small></span>${node(a)}</li>`; };
    const repeat = id => { const a = avail.find(x => x.id === id), p = run.find(x => x.id === id);
      const name = id === "works" ? "Zone works" : "Requisition", n = s.research[id];
      return `<li><span class="ln"><b>${name}${n ? ` <small>×${n} done</small>` : ""}</b><small>${W.esc(this.what({ id }))}</small></span>${p ? node({ id, mk: n + 1, needs: [] }) : a ? `<span class="node open"><button data-a="start" data-r="${id}" data-fk="start-${id}" ${M.canStart(s, a) ? "disabled" : ""}><b>#${n + 1}</b><small>Start · ${W.money(a.cost[0])} · ${a.cost[1]} RP</small></button>${M.canStart(s, a) ? `<small class="why">${W.esc(M.canStart(s, a))}</small>` : ""}</span>` : ""}</li>`; };
    const counters = avail.filter(r => r.kind === "counter");
    const runCounters = run.filter(p => p.id.startsWith("counter:"));
    return `<section class="panel lab-war">
        <div>${this.hx(s.war ? "AT WAR" : "WAR FOOTING", "sub-t", 2)}<p>${s.war ? "Cal has committed. Decay runs faster everywhere, and he pushes harder. Finish each zone's story and lock it down; the last is his last stand." : pts >= war ? "Casey Benton is ready when you are. War is yours to declare: decay runs faster, Cal commits, and every zone's story opens. Take your time; there's no clock." : `${pts} of ${war} upgrade points. An MK3, or the BanHammer, counts 2. At ${war}, war is yours to declare.`}</p>
          ${!s.war && pts >= war ? `<button class="${this.armed === "war" ? "armed" : "go"}" data-a="declare" data-fk="declare">${this.armed === "war" ? "Confirm: go to war with Cal" : "Declare war"}</button>` : ""}</div>
        ${s.war ? "" : `<span class="cells big" role="meter" aria-label="Upgrade points toward war" aria-valuemin="0" aria-valuemax="${war}" aria-valuenow="${Math.min(pts, war)}">${cells}</span>`}
      </section>
      <section class="panel lab-run">
        <header>${this.hx("RUNNING", "sub-t", 2)}<small>${rate.toFixed(1)} research points a day${run.length > 1 ? `, ${(rate / run.length).toFixed(1)} to each` : ""} · points can't be banked</small></header>
        ${run.length ? `<ul>${run.map(p => { const pc = Math.round(100 * (1 - p.left / p.total)); return `<li><b>${W.esc(p.name)}</b><span class="bar"><i style="width:${pc}%"></i></span><small>${Math.ceil(p.left)} of ${p.total} RP${rate ? ` · ${Math.ceil(p.left / (rate / run.length))} days` : ""}</small>
          <button data-a="cancel" data-r="${p.id}" data-fk="cancel-${p.id}" class="${this.armed === "cancel-" + p.id ? "armed" : ""}">${this.armed === "cancel-" + p.id ? "Confirm: stop, and lose what was paid" : "Stop"}</button></li>`; }).join("")}</ul>`
          : `<p class="bad idle">Nothing running. Today's research points are wasted. Start something below.</p>`}
      </section>
      <div class="lab-tree" data-scroll="lab">
        <section class="panel"><h3 class="sub">Weapons <span>MK1 · MK2 · MK3</span></h3><ul class="tree">${M.WEAPON_LINES.map(l => lineRow(l.id, l.name, l.id === "gauss" ? "explosive rounds" : this.what({ kind: "weapon", line: l.id, mk: 1 }))).join("")}</ul></section>
        <section class="panel"><h3 class="sub">Mods <span>fitted at the Clinic</span></h3><ul class="tree">${W.MODS.map(m => lineRow(m.id, m.name, m.what)).join("")}</ul></section>
        <section class="panel"><h3 class="sub">Gear</h3><ul class="tree">${M.GEAR_LINES.map(g => lineRow(g.id, g.name, g.what[0])).join("")}${single(M.item("banhammer"))}</ul></section>
        ${counters.length || runCounters.length ? `<section class="panel"><h3 class="sub">Countermeasures <span>Cal's tactics</span></h3><ul class="tree">${counters.map(r => `<li><span class="ln"><b>${W.esc(r.name)}</b><small>control pips there buy full value again</small></span>${node({ ...r, mk: 1, needs: [] })}</li>`).join("")}${runCounters.map(p => `<li><span class="ln"><b>${W.esc(p.name)}</b></span>${node({ id: p.id, mk: 1, needs: [] })}</li>`).join("")}</ul></section>` : ""}
        <section class="panel"><h3 class="sub">The city</h3><ul class="tree">${single(M.item("overseers"))}${repeat("works")}${repeat("requisition")}</ul></section>
        <section class="panel dark"><h3 class="sub">The dark corner <span>it works; that is the worst of it</span></h3><ul class="tree">${single(M.item("propaganda"))}${single(M.item("mindcontrol"))}</ul></section>
      </div>`;
  }
  what(r) {
    const M = W.M;
    if (r.kind === "weapon") return r.mk === 1 ? (W.WEAPONS[r.line] || {}).desc || "" : r.mk === 2 ? "hits harder, reaches further" : "hits hardest";
    if (r.kind === "mod") return (W.MODS.find(m => m.id === r.line) || {}).what || "";
    if (r.line === "scanner" || r.line === "purrsuader") return M.GEAR_LINES.find(g => g.id === r.line).what[r.mk - 1];
    if (r.id === "banhammer") return "an orbital strike: mark a spot, and everything near it dies";
    if (r.id === "overseers") return "while the squad is out, zones hold against decay; Cal is still yours to answer";
    if (r.id === "propaganda") return "a zone it's rolled out in won't decay below level 1; it makes 15% less money";
    if (r.id === "mindcontrol") return "a zone it's rolled out in won't decay below level 2; it makes 30% less money, and nobody there can be talked round";
    if (r.id === "works") return "+1 pip, for good, in a zone you choose";
    if (r.id === "requisition") return "a free pip of control a day, wherever control is weakest";
    if (r.kind === "counter") return "control pips there buy full value again";
    return "";
  }

  /* ---------------- the Clinic and the Armoury ---------------- */
  clinicHTML() {
    const s = this.s, M = W.M, a = M.agentById(s, this.agentId), why = M.canHire(s);
    const roster = `<section class="panel roster" data-scroll="roster">${this.hx("ROSTER", "sub-t", 2)}
      <p class="hint">${s.roster.length} of ${M.ROSTER_MAX} Watchers. ${M.SQUAD} go out; the rest wait in reserve.</p>
      <ul>${s.roster.map(x => `<li class="${x.id === this.agentId ? "sel" : ""} ${x.deployed ? "on" : ""}">
          <button class="who" data-a="agent" data-id="${x.id}" data-fk="agent-${x.id}" aria-pressed="${x.id === this.agentId}"><canvas width="44" height="44" data-port="${x.id}"></canvas>
            <span><b>${W.esc(x.name)}</b><small>${x.missions} mission${x.missions === 1 ? "" : "s"} · ${x.kills} down</small><small>worth ${W.money(M.worth(x))}</small></span>
            <span class="st ${x.deployed ? "in" : ""}">${x.deployed ? "Squad" : "Reserve"}</span></button>
          <button class="mini" data-a="deploytoggle" data-id="${x.id}" data-fk="dt-${x.id}">${x.deployed ? "Send to reserve" : "Put in the squad"}</button></li>`).join("")}</ul>
      <button data-a="hire" data-fk="hire" ${why ? "disabled" : ""}>Recruit · ${W.money(M.PRICE.recruit)}</button>${why ? `<small class="why">${W.esc(why)}</small>` : ""}
      ${s.fallen.length ? `<div class="fallen"><h4>Fallen</h4><p>${s.fallen.map(W.esc).join(" · ")}</p></div>` : ""}
    </section>`;
    if (!a) return roster;
    const slot = m => {
      const v = a.mods[m.id] || 0, why3 = M.canInstall(s, a, m.id);
      return `<div class="slot" data-part="${m.id}"><header><b>${m.name}</b><span class="mk">${[1, 2, 3].map(k => `<i class="${k <= v ? "on" : M.isDone(s, `${m.id}:${k}`) ? "ready" : ""}" title="MK${k}${k <= v ? " fitted" : M.isDone(s, `${m.id}:${k}`) ? " researched" : ""}"></i>`).join("")}</span></header>
        <small>${W.esc(m.what)}</small>
        ${v < 3 ? `<button data-a="install" data-part="${m.id}" data-fk="install-${m.id}" ${why3 ? "disabled" : ""}>Fit MK${v + 1} · ${W.money(M.PRICE.mod[v + 1])}</button>${why3 ? `<small class="why">${W.esc(why3)}</small>` : ""}` : `<span class="max">MK3 fitted</span>`}</div>`;
    };
    const shop = M.shop(s, a), scan = M.canUpgradeScanner(s);
    const left = ["brain", "eyes", "arms"], right = ["heart", "chest", "legs"];
    const body = `<section class="panel body">
      <header>${this.hx(a.name, "sub-t", 3)}<small>${a.deployed ? "In the squad" : "In reserve"} · ${a.missions} mission${a.missions === 1 ? "" : "s"}</small></header>
      <div class="figure"><div class="slots">${left.map(id => slot(W.MODS.find(m => m.id === id))).join("")}</div>
        <canvas data-figure="${a.id}"></canvas>
        <div class="slots">${right.map(id => slot(W.MODS.find(m => m.id === id))).join("")}</div></div>
    </section>`;
    const armoury = `<section class="panel armoury" data-scroll="arm">${this.hx("ARMOURY", "sub-t", 2)}
      <h3 class="sub">${W.esc(a.name)} carries <span>${M.slots(a)} of 8 · ammunition topped up free</span></h3>
      <ul class="inv">${a.items.map((it, i) => `<li><canvas width="44" height="22" data-icon="${it.type === "banhammer" ? "laser" : it.type}"></canvas><span>${W.esc(it.type === "banhammer" ? "BanHammer strike" : (W.WEAPONS[it.type] || {}).name || it.type)}${it.mk ? ` MK${it.mk}` : ""}${it.count > 1 ? ` ×${it.count}` : ""}</span>
        <button class="mini ${this.armed === "sell-" + i ? "armed" : ""}" data-a="sell" data-i="${i}" data-fk="sell-${i}">${this.armed === "sell-" + i ? `Confirm: sell for ${W.money(M.sellPrice(it))}` : "Sell for half"}</button></li>`).join("") || `<li class="quiet">Nothing.</li>`}</ul>
      <h3 class="sub">On the racks</h3>
      <ul class="inv shop">${shop.map(it => { const why2 = M.canBuy(s, a, it); return `<li><canvas width="44" height="22" data-icon="${it.type === "banhammer" ? "laser" : it.type}"></canvas><span>${W.esc(it.name)}${it.upgrade ? "<small>replaces the one carried</small>" : ""}${why2 ? `<small class="why">${W.esc(why2)}</small>` : ""}</span>
        <button data-a="buy" data-k="${it.key}" data-fk="buy-${it.key}" ${why2 ? "disabled" : ""} class="${this.armed === "buy-" + it.key ? "armed" : ""}">${this.armed === "buy-" + it.key ? `Confirm: pay ${W.money(it.price)}` : `Buy · ${W.money(it.price)}`}</button></li>`; }).join("")}</ul>
      <h3 class="sub">The squad's scanner <span>${s.scannerMk ? `MK${s.scannerMk}` : "standard issue"}</span></h3>
      ${s.scannerMk < 3 ? `<button data-a="scanner" data-fk="scanner" ${scan ? "disabled" : ""}>Fit MK${s.scannerMk + 1} · ${W.money(M.PRICE.scanner[s.scannerMk + 1])}</button>${scan ? `<small class="why">${W.esc(scan)}</small>` : ""}` : `<p class="quiet">The best there is.</p>`}
    </section>`;
    return roster + body + armoury;
  }
  drawFigure() {
    const cv = this.el.querySelector("canvas[data-figure]");
    if (!cv) return;
    const a = W.M.agentById(this.s, +cv.dataset.figure), r = cv.getBoundingClientRect(), dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    if (!a || !r.width) return;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const c = cv.getContext("2d");
    const at = W.drawWatcherFigure(c, W.agentLook(a), cv.width, cv.height, a.mods);
    // leader lines from each slot to its part
    c.strokeStyle = "rgba(95,240,255,.55)"; c.lineWidth = dpr;
    for (const sl of this.el.querySelectorAll(".slot[data-part]")) {
      const b = sl.getBoundingClientRect(), p = at[sl.dataset.part];
      if (!p) continue;
      const leftSide = b.right <= r.left + 4, sx = ((leftSide ? b.right : b.left) - r.left) * dpr, sy = (b.top + Math.min(18, b.height / 2) - r.top) * dpr;
      c.beginPath(); c.moveTo(Math.max(0, Math.min(cv.width, sx)), sy); c.lineTo(p[0], p[1]); c.stroke();
      c.fillStyle = "#5ff0ff"; c.fillRect(p[0] - 2 * dpr, p[1] - 2 * dpr, 4 * dpr, 4 * dpr);
    }
  }

  /* ---------------- Casey's Office ---------------- */
  officeHTML() {
    const s = this.s, M = W.M;
    const zid = this.officeZone || this.zoneId || (s.zones.find(z => !z.locked) || s.zones[0]).id, z = M.zone(s, zid);
    this.officeZone = zid;
    return `<section class="scene"><canvas data-office aria-hidden="true"></canvas>
        <blockquote><p>${W.esc(this.caseySays())}</p><cite>Casey Benton</cite></blockquote></section>
      <section class="panel desk" data-scroll="desk">${this.hx("THE BOSS'S DESK", "sub-t", 2)}
        <p class="hint">Money buys what production can't.</p>
        <label class="zpick">For the zone <select data-a="ozone" data-fk="ozone">${s.zones.map(q => `<option value="${q.id}" ${q.id === zid ? "selected" : ""}>${W.esc(M.zoneDef(q.id).name)}${q.lost ? " (lost)" : q.locked ? " (locked)" : ` (L${M.level(q.C)})`}</option>`).join("")}</select></label>
        <ul class="events">${M.EVENTS.map(e => { const why = M.canEvent(s, e, z), key = "event-" + e.id;
          return `<li class="${e.floor ? "dark" : ""}"><span><b>${W.esc(e.name)}</b>${e.zone ? `<small class="for">in ${W.esc(M.zoneDef(zid).name)}</small>` : `<small class="for">city-wide</small>`}<small>${W.esc(e.what)}</small>${why ? `<small class="why">${W.esc(why)}</small>` : ""}</span>
            <button data-a="event" data-e="${e.id}" data-fk="${key}" ${why ? "disabled" : ""} class="${this.armed === key ? "armed" : ""}">${this.armed === key ? `Confirm: pay ${W.money(e.price)}` : `Buy · ${W.money(e.price)}`}</button></li>`; }).join("")}</ul>
        <h3 class="sub">On Cal</h3>
        <p>${s.cal.zone ? `Pushing ${W.esc(M.zoneDef(s.cal.zone).name)}, ${s.cal.left} more day${s.cal.left === 1 ? "" : "s"}.` : s.cal.revealed && s.cal.next ? `Resting. Next: ${W.esc(M.zoneDef(s.cal.next).name)}, in ${s.cal.nextIn} day${s.cal.nextIn === 1 ? "" : "s"}.` : "Resting. Nobody knows where he goes next."}</p>
      </section>`;
  }
  caseySays() {
    const s = this.s, M = W.M;
    if (s.won) return "It's done. The city is quiet. Don't get used to it.";
    if (s.war) return "He's stopped pretending. So have I. Lock it down, zone by zone.";
    const lost = s.zones.find(z => z.lost);
    if (lost) return `I don't lose streets. Get ${M.zoneDef(lost.id).name} back.`;
    if (s.cal.zone) return `Cal is in ${M.zoneDef(s.cal.zone).name}. I'd like him out of it.`;
    if (!s.research.running.length) return "The lab is sitting on its hands. I pay for those hands.";
    if (s.cash < 20000) return "You're spending my money faster than my city makes it.";
    return "The city is mine. You're how I keep it.";
  }

  /* ---------------- input ---------------- */
  onClick(ev) {
    const b = ev.target.closest("[data-a]");
    if (this.untilOpen && !ev.target.closest(".until")) { this.untilOpen = false; this.draw(); if (!b) return; }
    if (!b || b.disabled || b.tagName === "INPUT" || b.tagName === "SELECT") return;
    const s = this.s, M = W.M, d = b.dataset, a = M.agentById(s, this.agentId);
    // a second click confirms what loses money; any other click disarms
    const armKey = d.a === "declare" ? "war" : d.a === "cancel" ? "cancel-" + d.r : d.a === "sell" ? "sell-" + d.i : d.a === "buy" ? "buy-" + d.k : d.a === "event" ? "event-" + d.e : null;
    const needsArm = armKey && (d.a === "declare" || d.a === "cancel" || d.a === "sell" || (d.a === "buy" && (M.shop(s, a).find(x => x.key === d.k) || {}).price >= 100000) || (d.a === "event" && (M.EVENTS.find(x => x.id === d.e) || {}).price >= 100000));
    if (needsArm && this.armed !== armKey) { this.armed = armKey; W.audio.play("click"); return this.draw(); }
    this.armed = null;
    switch (d.a) {
      case "screen": return this.go(d.screen);
      case "wait": return this.wait(1);
      case "until": {
        this.untilOpen = !this.untilOpen; W.audio.play("click"); this.draw();
        const first = this.untilOpen && this.el.querySelector('.until-menu [role="menuitem"]:not(:disabled)');
        if (first) first.focus(); else if (!this.untilOpen) this.el.querySelector('[data-fk="until"]').focus();
        return;
      }
      case "waituntil": this.untilOpen = false; return this.wait(d.u);
      case "zone": return this.pickZone(d.z, !b.classList.contains("zb"));
      case "alloffers": this.allOffers = !this.allOffers; return this.draw();
      case "log": this.showLog = !this.showLog; return this.draw();
      case "office": this.officeZone = d.z; return this.go("office");
      case "declare": if (!M.declareWar(s)) return W.audio.play("deny"); this.banners.push({ tone: "red", big: "WAR", sub: "Casey Benton gives the order. Cal commits. Lock the city down, zone by zone.", sound: "alarm" }); break;
      case "works": if (!M.placeWorks(s, M.zone(s, d.z))) return W.audio.play("deny"); W.audio.play("heal"); break;
      case "deploy": return this.game.toBriefing(d.o);
      case "start": { const r = M.available(s).find(x => x.id === d.r); if (!r || !M.start(s, r)) return W.audio.play("deny"); W.audio.play("select"); this.focusTo = `cancel-${r.id}`; break; }
      case "cancel": M.cancel(s, d.r); W.audio.play("deny"); break;
      case "agent": this.agentId = +d.id; W.audio.play("click"); return this.draw();
      case "deploytoggle": M.toggleDeploy(s, M.agentById(s, +d.id)); W.audio.play("click"); break;
      case "hire": { const n = M.hire(s); if (n) { M.note(s, `${n.name} joins the Watchers.`); this.agentId = n.id; W.audio.play("select"); } break; }
      case "buy": { const it = M.shop(s, a).find(x => x.key === d.k); if (!it || !M.buy(s, a, it)) return W.audio.play("deny"); W.audio.play("pickup"); break; }
      case "sell": M.sell(s, a, +d.i); W.audio.play("click"); break;
      case "install": if (!M.install(s, a, d.part)) return W.audio.play("deny"); W.audio.play("heal"); break;
      case "scanner": if (!M.upgradeScanner(s)) return W.audio.play("deny"); W.audio.play("pickup"); break;
      case "event": { const e = M.EVENTS.find(x => x.id === d.e), z = e.zone ? M.zone(s, this.officeZone) : null; if (!M.event(s, e, z)) return W.audio.play("deny"); W.audio.play("select"); break; }
      default: return;
    }
    this.commit();
  }
  // the dial and the city split move live; letting go saves
  onInput(ev) {
    const t = ev.target, s = this.s, M = W.M;
    if (t.dataset.a === "dial") {
      const z = M.zone(s, t.dataset.z);
      M.setDial(s, z, +t.value);
      const P = M.fitPolicy(s, z), p = M.pips(s, z), f = M.forecast(s, z), box = t.closest(".dossier");
      t.setAttribute("aria-valuetext", `${P.c} of ${p} pips on control, ${this.dialHead(z, P, p, Math.min(p, M.holdPips(s, z)), M.yieldOf(z))}`);
      box.querySelector('[data-live="dialc"]').textContent = this.dialHead(z, P, p, Math.min(p, M.holdPips(s, z)), M.yieldOf(z));
      box.querySelector('[data-live="out"]').innerHTML = this.dialOut(z, P, M.yieldOf(z));
      const fc = box.querySelector('[data-live="fc"]'); fc.className = `fc ${this.fcCls(f, z)}`; fc.innerHTML = this.fcLine(z, f, M.netControl(s, z));
      this.map.set(s, {});
      this.refreshTop();
    } else if (t.dataset.a === "balance") {
      const { rest } = this.balanceParts();
      M.setBalance(s, rest ? +t.value / rest : 0.5);
      t.setAttribute("aria-valuetext", `${t.value} pips to research, ${rest - t.value} to money`);
      this.refreshTop();
      const dz = this.zoneId && this.el.querySelector('[data-live="out"]');
      if (dz) { const z = M.zone(s, this.zoneId); dz.innerHTML = this.dialOut(z, M.fitPolicy(s, z), M.yieldOf(z)); }
    }
  }
  onChange(ev) {
    const t = ev.target;
    if (t.dataset.a === "dial" || t.dataset.a === "balance") { W.audio.play("click"); return this.commit(); }
    if (t.dataset.a === "ozone") { this.officeZone = t.value; this.armed = null; return this.draw(); }
  }
  // the readouts in the top bar, without redrawing the slider being dragged
  refreshTop() {
    const take = this.take(), bal = this.balanceParts(), top = this.el.querySelector(".cx-top");
    const tv = top.querySelector(".take .v"); tv.innerHTML = this.takeLCD(take); W.pix.paint(tv);
    const row = top.querySelector(".split-row");
    row.querySelector(".c-r b").textContent = bal.r; row.querySelector(".c-m b").textContent = bal.rest - bal.r;
    const inp = row.querySelector("input");
    if (document.activeElement !== inp) { inp.max = bal.rest; inp.value = bal.r; }
  }
  onHover(ev, on) {
    const b = ev.target.closest && ev.target.closest(".zb");
    if (!b || !this.map) return;
    this.map.set(this.s, { hover: on ? b.dataset.z : null });
  }
  // arrow keys walk the map from zone to zone
  onZoneKey(ev) {
    const t = ev.target;
    // the Until menu: up and down, Home and End
    const mi = t.closest && t.closest('.until-menu [role="menuitem"]');
    if (mi && /^(ArrowUp|ArrowDown|Home|End)$/.test(ev.key)) {
      const items = [...this.el.querySelectorAll('.until-menu [role="menuitem"]:not(:disabled)')], i = items.indexOf(mi);
      const next = ev.key === "Home" ? 0 : ev.key === "End" ? items.length - 1 : (i + (ev.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      ev.preventDefault(); items[next].focus(); return;
    }
    // the screen tabs: left and right move along them and open the screen
    const tab = t.closest && t.closest('[role="tab"]');
    if (tab && /^(ArrowLeft|ArrowRight|Home|End)$/.test(ev.key)) {
      const ids = ["city", "lab", "clinic", "office"], i = ids.indexOf(tab.dataset.screen);
      const next = ev.key === "Home" ? 0 : ev.key === "End" ? 3 : (i + (ev.key === "ArrowRight" ? 1 : -1) + 4) % 4;
      ev.preventDefault(); return this.go(ids[next]);
    }
    const b = t.closest && t.closest(".zb");
    if (!b || !/^Arrow/.test(ev.key)) return;
    const AT = W.CityMap.AT, [cx, cy] = AT[b.dataset.z];
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    let best = null, bd = Infinity;
    for (const z of this.s.zones) {
      if (z.id === b.dataset.z) continue;
      const [x2, y2] = AT[z.id], dx = x2 - cx, dy = y2 - cy;
      const along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1] - dy * dir[0]);
      if (along <= 0) continue;
      const d = along + across * 2;
      if (d < bd) { bd = d; best = z.id; }
    }
    ev.preventDefault();
    const nb = best && this.el.querySelector(`.zb[data-z="${best}"]`);
    if (nb) { nb.focus(); this.map.set(this.s, { hover: best }); }
  }
  // open a zone's dossier, or close it if it's open
  pickZone(id, moveFocus) {
    const open = this.zoneId !== id;
    this.zoneId = open ? id : null; this.allOffers = false; W.audio.play("click");
    if (moveFocus) this.focusTo = open ? `close-${id}` : `zone-${id}`;
    this.draw();
  }
  go(screen) {
    this.screen = screen; W.store.set("cmdscreen_v1", screen); this.armed = null; this.untilOpen = false;
    W.audio.play("click"); this.draw();
    const tab = this.el.querySelector(`#tab-${screen}`); if (tab) tab.focus({ preventScroll: true });
  }

  /* ---------------- waiting, and the dispatch ---------------- */
  snap() {
    const s = this.s;
    return { day: s.day, cash: s.cash, points: s.research.points, war: s.war, won: s.won, cal: s.cal.zone, log: s.log.length,
      zones: Object.fromEntries(s.zones.map(z => [z.id, { C: z.C, lost: z.lost, locked: z.locked, L: W.M.level(z.C) }])) };
  }
  wait(mode) {
    const s = this.s, M = W.M, before = this.snap();
    let rp = 0, wasted0 = s.research.wasted || 0, days = 0;
    const runIds = s.research.running.map(p => p.id).join(",");
    for (;;) {
      M.advanceDay(s); days++;
      rp += (s.today && s.today.rp) || 0;
      const lostNow = s.zones.some(z => z.lost && !before.zones[z.id].lost);
      const calNew = s.cal.zone && s.cal.zone !== before.cal;
      if (mode === 1 || lostNow || calNew || s.war !== before.war || s.won || days >= 30) break;
      if (mode === "research" && s.research.running.map(p => p.id).join(",") !== runIds) break;
      if (mode === "cal" && (s.cal.zone || null) !== (before.cal || null)) break;
      if (mode === "week" && days >= 7) break;
    }
    const after = this.snap(), wasted = (s.research.wasted || 0) - wasted0;
    // the lines: money and research, each zone that changed level, then what the log said, once each
    const lines = [];
    lines.push({ cls: "good", text: `${W.money(after.cash - before.cash)} into the treasury, ${rp.toFixed(1)} research points${wasted > 0.05 ? ` (${wasted.toFixed(1)} wasted: nothing running)` : ""}.` });
    for (const z of s.zones) {
      const b = before.zones[z.id], D = M.zoneDef(z.id), L = M.level(z.C);
      if (z.lost && !b.lost) continue;      // the log says it
      if (!z.lost && !z.locked && L !== b.L) lines.push({ cls: L > b.L ? "good" : "bad", text: `${D.name}: level ${b.L} to ${L}.` });
    }
    const said = new Set();
    for (const l of s.log.slice(0, s.log.length - before.log).reverse()) {
      if (/falls to level 0|is pacified|slips from level 3/.test(l.text) || said.has(l.text)) continue;
      said.add(l.text); lines.push({ cls: l.kind, text: l.text });
    }
    this.dispatchData = { from: before.day, to: s.day, days, lines };
    // the banners: what nobody should miss
    for (const z of s.zones) if (z.lost && !before.zones[z.id].lost) this.banners.push({ tone: "red", big: "ZONE LOST", sub: `${M.zoneDef(z.id).name} has fallen to Cal. A siege takes it back.`, sound: "lose" });
    if (s.cal.zone && s.cal.zone !== before.cal) this.banners.push({ tone: "red", big: "CAL MOVES", sub: `He's pushing ${M.zoneDef(s.cal.zone).name}. A mission against his crew ends it.`, sound: "alarm" });
    if (s.war && !before.war) this.banners.push({ tone: "red", big: "WAR FOOTING", sub: "Cal has committed. Decay runs faster everywhere.", sound: "alarm" });
    if (s.won && !before.won) this.banners.push({ tone: "gold", big: "PUMACITY IS HERS", sub: "Every zone is locked down. You win.", sound: "win" });
    W.audio.play("order");
    W.M.save(s);
    this.fresh = { points: before.points };
    this.draw();
    this.fresh = null;
    if (this.map) this.map.dispatch(before.zones, s.cal.zone && s.cal.zone !== before.cal ? s.cal.zone : null);
    // the day and the cash count up to their new figures
    this.countUp(0, before.day, s.day, v => String(Math.round(v)).padStart(3, "0"));
    this.countUp(1, before.cash, s.cash, v => W.money(v));
    // and the day is said out loud, for anyone not watching the map
    const live = this.layer.querySelector("[data-live]");
    live.textContent = "";
    setTimeout(() => { live.textContent = `${days > 1 ? `Days ${before.day} to ${s.day - 1}` : `Day ${before.day}`}. ${lines.map(l => l.text).join(" ")}`; }, 60);
  }
  // an LCD in the top bar counts from one figure to another
  countUp(i, from, to, fmt) {
    const el = this.el.querySelectorAll(".cx-read .lcd .px")[i];
    if (!el || from === to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now(), ms = 700;
    const step = now => {
      if (!el.isConnected) return;
      const a = Math.min(1, (now - t0) / ms), v = from + (to - from) * (1 - (1 - a) ** 3);
      el.dataset.px = fmt(v); W.pix.paint(el.parentNode);
      if (a < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  nextBanner() {
    const b = this.banners.shift(), el = this.layer && this.layer.querySelector(".cx-banner");
    if (!b || !el) { this.bannerOn = false; return; }
    this.bannerOn = true;
    el.className = `cx-banner ${b.tone}`;
    el.innerHTML = `<div role="alert">${this.px(b.big, "ban-t", 4)}<p>${W.esc(b.sub)}</p><small>Click to dismiss</small></div>`;
    el.hidden = false;
    W.pix.paint(el);
    W.audio.play(b.sound);
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => this.hideBanner(), 3200);
  }
  hideBanner() {
    clearTimeout(this.bannerT);
    const el = this.layer && this.layer.querySelector(".cx-banner");
    if (el) el.hidden = true;
    this.bannerOn = false;
    if (this.banners.length) this.nextBanner();
  }
  toast(text) {
    const el = this.layer.querySelector(".cx-toast");
    el.textContent = text; el.classList.add("on");
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => { el.classList.remove("on"); this.escArmed = false; }, 2200);
  }

  onKey(k, ev) {
    const tag = ev && ev.target && ev.target.tagName;
    // the Konami code: up up down down left right left right B A
    const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
    this.konami = (this.konami || 0);
    this.konami = k === KONAMI[this.konami] ? this.konami + 1 : k === KONAMI[0] ? 1 : 0;
    if (this.konami === KONAMI.length) {
      this.konami = 0;
      const n = W.M.cheat(this.s);
      W.audio.play("win");
      this.commit();
      this.toast(`Konami: $500,000${n ? `, ${n} project${n > 1 ? "s" : ""} finished` : ""}.`);
      return true;
    }
    if (k === "escape") {
      if (this.bannerOn) { this.hideBanner(); return true; }
      if (this.untilOpen) { this.untilOpen = false; this.focusTo = "until"; this.draw(); return true; }
      if (this.armed) { this.armed = null; this.draw(); return true; }
      if (this.zoneId) { this.zoneId = null; this.draw(); return true; }
      if (this.screen !== "city") { this.go("city"); return true; }
      if (this.escArmed) { this.game.toTitle(); return true; }
      this.escArmed = true; this.toast("Press Esc again to leave for the title."); return true;
    }
    if (tag === "INPUT" || tag === "SELECT") return false;
    if (k >= "1" && k <= "4") { this.go(["city", "lab", "clinic", "office"][+k - 1]); return true; }
    if (k === "w") { this.wait(1); return true; }
    return false;
  }
};
