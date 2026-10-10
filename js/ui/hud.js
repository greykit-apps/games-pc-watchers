/* The left-hand panel, Syndicate-style: four Watcher cards with their stims,
 * the selected Watcher's weapons, the objectives, and the scanner. Built once
 * per mission, refreshed a few times a second. */
"use strict";

W.HUD = class {
  constructor(root, game) {
    this.root = root; this.game = game;
    root.innerHTML = `
      <div class="hud-head"><span class="hud-title">WATCHERS</span><span class="hud-clock" data-clock>00:00</span></div>
      <div class="hud-cards" data-cards></div>
      <div class="hud-team"><button data-team title="Select the whole squad (0 or \`)"><kbd>0</kbd>Squad</button><button data-holster title="Holster weapons (H)"><kbd>H</kbd>Holster</button></div>
      <div class="hud-sub">Weapons <span data-who></span></div>
      <div class="hud-weapons" data-weapons></div>
      <div class="hud-sub">Objectives</div>
      <ul class="hud-obj" data-obj></ul>
      <div class="hud-sub">Scanner</div>
      <canvas class="hud-mini" data-mini width="216" height="176" title="Scanner: click to look there, Shift-click to send the squad, wheel to zoom"></canvas>
      <div class="hud-foot"><button data-menu title="Menu (Esc)"><kbd>Esc</kbd>Menu</button><button data-sound aria-label="Sound" aria-pressed="${!W.prefs.muted}" title="Sound (M)"><kbd>M</kbd><span data-soundlbl>${W.prefs.muted ? "Sound off" : "Sound on"}</span></button></div>`;
    this.cardsEl = root.querySelector("[data-cards]");
    this.weapEl = root.querySelector("[data-weapons]");
    this.objEl = root.querySelector("[data-obj]");
    this.mini = root.querySelector("[data-mini]");
    this.miniC = this.mini.getContext("2d");
    this.clock = root.querySelector("[data-clock]");
    this.who = root.querySelector("[data-who]");
    this.cards = [];
    this.weapSig = "";
    this.objSig = "";
    root.addEventListener("click", ev => this.onClick(ev));
    root.addEventListener("pointerdown", ev => this.onDown(ev));
    window.addEventListener("pointermove", ev => this.onMove(ev));
    window.addEventListener("pointerup", () => { this.dragStim = null; this.miniDrag = false; });
    this.mini.addEventListener("pointerdown", ev => { this.miniDrag = true; this.onMini(ev); ev.preventDefault(); });
    this.mini.addEventListener("pointermove", ev => { if (this.miniDrag) this.onMini(ev); });
    this.mini.addEventListener("contextmenu", ev => ev.preventDefault());
    this.mini.addEventListener("wheel", ev => { ev.preventDefault(); this.zoom = W.clamp((this.zoom || 3) + (ev.deltaY < 0 ? 1 : -1), 1.5, 7); }, { passive: false });
  }

  build(world) {
    this.world = world;
    this.cardsEl.innerHTML = "";
    this.cards = [];
    const agents = world.agents.sort((a, b) => a.slot - b.slot);
    for (const a of agents) {
      const el = document.createElement("div");
      el.className = "card";
      el.dataset.slot = a.slot;
      el.innerHTML = `<canvas class="port" width="48" height="48"></canvas>
        <div class="card-r"><div class="card-name"><kbd>${a.slot + 1}</kbd>${W.esc(a.name)}</div>
        <div class="hp"><i></i></div>
        ${W.STIMS.map(s => `<div class="stim" data-stim="${s.id}" title="${s.name}: ${s.what}. Click or drag to dose; it wears off, and leaves a dependency."><span>${s.short}</span><b><i class="dep"></i><i class="eff"></i><i class="lvl"></i></b></div>`).join("")}
        </div>`;
      this.cardsEl.appendChild(el);
      const port = el.querySelector(".port");
      W.drawPortrait(port.getContext("2d"), a.look, 48, 48, false);
      this.cards.push({ a, el, port, dead: false, hp: el.querySelector(".hp i"), stims: W.STIMS.map(s => { const b = el.querySelector(`[data-stim="${s.id}"] b`); return { id: s.id, dep: b.querySelector(".dep"), eff: b.querySelector(".eff"), lvl: b.querySelector(".lvl") }; }) });
    }
    this.weapSig = ""; this.objSig = "";
    this.update(true);
  }

  /* the Watcher whose weapons the panel shows: the first selected, by slot */
  lead() {
    const sel = [...this.world.selected].filter(u => u.alive).sort((a, b) => a.slot - b.slot);
    return sel[0] || null;
  }

  update(force) {
    const w = this.world;
    if (!w) return;
    const t = Math.floor(w.stats.time);
    this.clock.textContent = String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
    for (const c of this.cards) {
      const a = c.a;
      c.el.classList.toggle("sel", w.selected.has(a));
      if (!a.alive && !c.dead) { c.dead = true; c.el.classList.add("dead"); W.drawPortrait(c.port.getContext("2d"), a.look, 48, 48, true); }
      c.hp.style.width = (100 * Math.max(0, a.hp) / a.maxHp) + "%";
      c.hp.className = a.hp / a.maxHp < 0.35 ? "low" : "";
      if (a.ipa) for (const s of c.stims) {
        const st = a.ipa[s.id];
        s.lvl.style.left = (st.lvl * 100) + "%";
        s.eff.style.width = (st.eff * 100) + "%";
        s.dep.style.width = (Math.min(1, st.dep * 0.6) * 100) + "%";
      }
    }
    // weapons of the lead Watcher
    const L = this.lead();
    const sig = L ? L.id + ":" + L.cur + ":" + L.weapons.map(x => x.type + (x.ammo ?? "")).join(",") : "none";
    if (sig !== this.weapSig || force) {
      this.weapSig = sig;
      this.who.textContent = L ? "· " + L.name : "";
      const slots = [];
      for (let i = 0; i < 8; i++) {
        const wp = L && L.weapons[i];
        if (!wp) { slots.push(`<button class="wslot empty" disabled aria-label="Empty slot"></button>`); continue; }
        const def = W.WEAPONS[wp.type];
        slots.push(`<button class="wslot${L.cur === i ? " on" : ""}${wp.ammo === 0 ? " dry" : ""}" data-w="${i}" title="${def.name}: ${def.desc}"><canvas width="44" height="22" data-icon="${wp.type}"></canvas><span>${def.short}</span><em>${wp.ammo == null ? "∞" : wp.ammo}</em></button>`);
      }
      this.weapEl.innerHTML = slots.join("");
      this.weapEl.querySelectorAll("canvas[data-icon]").forEach(cv => {
        const on = cv.parentElement.classList.contains("on");
        W.drawWeaponIcon(cv.getContext("2d"), cv.dataset.icon, 22, 11, on ? "#05070f" : "#dbe4fb");
      });
    }
    // objectives
    const os = w.objectives.map(o => o.state + o.text + (o.type === "recruit" ? w.stats.recruited : o.type === "civcap" ? w.stats.civ : "")).join("|");
    if (os !== this.objSig || force) {
      this.objSig = os;
      this.objEl.innerHTML = w.objectives.map(o => {
        let extra = "";
        if (o.type === "recruit") extra = ` <span class="n">${Math.min(w.stats.recruited, o.n)}/${o.n}</span>`;
        if (o.type === "civcap") extra = ` <span class="n">${w.stats.civ} lost</span>`;
        return `<li class="${o.state}${o.optional ? " opt" : ""}">${o.optional ? "Bonus: " : ""}${W.esc(o.text)}${extra}</li>`;
      }).join("");
    }
  }

  /* the scanner follows the lead Watcher (or the view, with nobody selected) */
  drawMini(renderer) {
    if (!this.world) return;
    const L = this.lead();
    renderer.scanner(this.miniC, this.world, { center: L ? [L.x, L.y] : renderer.viewCenter(this.world), k: this.zoom || 3, ping: true });
  }

  onClick(ev) {
    const b = ev.target.closest("button");
    if (!b) return;
    const g = this.game;
    if (b.dataset.w !== undefined) { g.drawWeapon(+b.dataset.w); return; }
    if (b.hasAttribute("data-team")) { g.selectAll(); return; }
    if (b.hasAttribute("data-holster")) { g.holster(); return; }
    if (b.hasAttribute("data-menu")) { g.openMenu(); return; }
    if (b.hasAttribute("data-sound")) { g.toggleSound(); return; }
  }
  syncSound() {
    const b = this.root.querySelector("[data-sound]");
    if (!b) return;
    b.setAttribute("aria-pressed", String(!W.prefs.muted));
    b.querySelector("[data-soundlbl]").textContent = W.prefs.muted ? "Sound off" : "Sound on";
  }
  onDown(ev) {
    const stim = ev.target.closest(".stim");
    const card = ev.target.closest(".card");
    if (stim && card) {
      ev.preventDefault();
      this.dragStim = { id: stim.dataset.stim, slot: +card.dataset.slot, bar: stim.querySelector("b") };
      this.setStim(ev);
      return;
    }
    if (card && !ev.target.closest("button")) {
      const a = this.cards.find(c => c.a.slot === +card.dataset.slot).a;
      this.game.selectAgent(a, ev.shiftKey || ev.ctrlKey);
      if (ev.detail === 2) this.game.centerOn(a);
    }
  }
  onMove(ev) { if (this.dragStim) this.setStim(ev); }
  /* Dosing: the bar's level follows the pointer. With the whole squad
   * selected, the dose goes to every selected Watcher, as in Syndicate. */
  setStim(ev) {
    const d = this.dragStim, r = d.bar.getBoundingClientRect();
    const v = W.clamp((ev.clientX - r.left) / r.width, 0, 1);
    const card = this.cards.find(c => c.a.slot === d.slot);
    const targets = this.world.selected.has(card.a) ? [...this.world.selected] : [card.a];
    for (const a of targets) if (a.alive && a.ipa) a.ipa[d.id].lvl = v;
    this.update();
  }
  onMini(ev) {
    const r = this.mini.getBoundingClientRect();
    const mx = (ev.clientX - r.left) * this.mini.width / r.width, my = (ev.clientY - r.top) * this.mini.height / r.height;
    const [x, y] = this.game.renderer.scanToWorld(mx, my);
    if (ev.button === 2 || ev.shiftKey) this.game.orderMove(x, y);
    else this.game.centerAt(x, y);
  }
};
