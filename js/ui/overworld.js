/* The overworld: PVN Tower's basement. The city and its contracts on the
 * left; the labs, the Armoury, the Clinic and the roster on the right. Every
 * button changes the campaign state, saves it, and redraws. */
"use strict";

W.Overworld = class {
  constructor(game) {
    this.game = game;
    this.tab = W.store.get("tab_v1", "research");
    this.agentId = null;
  }
  get s() { return this.game.campaign; }

  open() {
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "ow";
      this.el.setAttribute("role", "main");
      this.el.setAttribute("aria-label", "Watchers command");
      this.el.addEventListener("click", ev => this.onClick(ev));
      document.body.appendChild(this.el);
    }
    this.el.hidden = false;
    this.draw();
  }
  close() { if (this.el) { this.el.remove(); this.el = null; } }

  commit() { W.C.save(this.s); this.draw(); }

  draw() {
    const s = this.s;
    if (!this.agentId || !W.C.agentById(s, this.agentId)) this.agentId = s.roster[0] && s.roster[0].id;
    const spend = W.C.dailySpend(s);
    this.el.innerHTML = `
      <header class="ow-head">
        <div class="ow-brand"><span class="tag">PumaCity</span><h1>Watchers command</h1></div>
        <div class="ow-stats">
          <div><small>Day</small><b>${s.day}</b></div>
          <div><small>Cash</small><b class="${s.cash < spend * 3 ? "warn" : ""}">${W.money(s.cash)}</b></div>
          <div><small>Research</small><b>${W.money(spend)}<i>/day</i></b></div>
        </div>
        <div class="ow-acts">
          <button data-a="wait" title="Let a day pass: the labs spend their funding"><kbd>W</kbd>Wait a day</button>
          <button data-a="title"><kbd>Esc</kbd>Title</button>
        </div>
      </header>
      <div class="ow-body">
        <section class="ow-left">
          <h2>The city</h2>
          <div class="ow-map">${W.C.DISTRICTS.map(d => this.districtHTML(d)).join("")}</div>
          <h2>Contracts</h2>
          <div class="ow-contracts">${W.C.CONTRACTS.map(c => this.contractHTML(c)).join("")}
            <div class="ow-c dim"><div><b>Other districts</b><p>Watch-Captain Joyeuse is still gathering intel. More contracts are coming.</p></div></div></div>
          <h2>Log</h2>
          <ul class="ow-log">${s.log.slice(0, 8).map(l => `<li class="${l.kind}"><span>Day ${l.day}</span>${W.esc(l.text)}</li>`).join("")}</ul>
        </section>
        <section class="ow-right">
          <div class="ow-tabs" role="tablist">${[["research", "Research", "1"], ["armoury", "Armoury", "2"], ["clinic", "Clinic", "3"], ["roster", "Roster", "4"]].map(([id, n, k]) =>
            `<button role="tab" data-tab="${id}" aria-selected="${this.tab === id}" aria-pressed="${this.tab === id}"><kbd>${k}</kbd>${n}</button>`).join("")}</div>
          <div class="ow-panel">${this[this.tab + "HTML"]()}</div>
        </section>
      </div>`;
    this.el.querySelectorAll("canvas[data-port]").forEach(c => {
      const a = W.C.agentById(s, +c.dataset.port);
      if (a) W.drawPortrait(c.getContext("2d"), W.agentLook(a), c.width, c.height);
    });
    this.el.querySelectorAll("canvas[data-icon]").forEach(c => W.drawWeaponIcon(c.getContext("2d"), c.dataset.icon, c.width / 2, c.height / 2, "#dbe4fb"));
  }

  districtHTML(d) {
    const c = W.C.CONTRACTS.find(x => x.district === d.id);
    const rec = c && this.s.contracts[c.id];
    const state = c ? (rec && rec.wins ? "held" : "open") : "dark";
    return `<div class="ow-d ${state}" style="grid-column:${d.col + 1};grid-row:${d.row + 1}" title="${W.esc(d.blurb)}">
      <b>${W.esc(d.name)}</b>${d.hq ? '<span class="hq">PVN Tower · HQ</span>' : ""}
      <small>${c ? (rec && rec.wins ? `${W.esc(c.name)}: done, best ${rec.best}` : `Contract: ${W.esc(c.name)}`) : "no contract yet"}</small></div>`;
  }
  contractHTML(c) {
    const s = this.s, rec = s.contracts[c.id], repeat = rec && rec.wins;
    return `<div class="ow-c">
      <div><b>${W.esc(c.name)}</b> <span class="op">Operation ${W.esc(c.op)}</span>${rec && rec.best ? ` <span class="best">best ${rec.best}</span>` : ""}
      <p>${W.esc(repeat ? c.repeatSummary : c.summary)}</p>
      <small>Fee ${W.money(W.C.contractFee(s, c))} · ${W.money(c.bonusFee)} a bonus · ${c.days} days</small></div>
      <button class="primary" data-a="deploy" data-c="${c.id}"><kbd>Enter</kbd>Brief &amp; deploy</button></div>`;
  }

  /* ---- research ---- */
  researchHTML() {
    const s = this.s;
    return `<p class="note">Contracts pay cash. Cash funds research, a day at a time. Finished research goes on sale in the Armoury and the Clinic.</p>` +
      W.C.LABS.map(lab => {
        const L = s.labs[lab.id], act = L.active && W.C.byId(L.active);
        const days = W.C.daysLeft(s, lab.id);
        const list = W.C.RESEARCH.filter(r => r.lab === lab.id);
        const avail = list.filter(r => W.C.available(s, r.id));
        // the cyber lab's later versions are implied by the first; listing all twelve is noise
        const locked = list.filter(r => !W.C.isDone(s, r.id) && !W.C.available(s, r.id) && lab.id === "weapons");
        const done = list.filter(r => W.C.isDone(s, r.id));
        return `<div class="lab">
          <h3>${lab.name} <span>${W.esc(lab.who)}</span></h3>
          <div class="lab-now">${act ? `<b>${W.esc(act.name)}</b>
              <div class="bar"><i style="width:${Math.min(100, W.C.progress(s, act.id) * 100)}%"></i></div>
              <small>${W.money(s.spent[act.id] || 0)} of ${W.money(act.cost)} · ${days === Infinity ? "unfunded" : `${days} day${days === 1 ? "" : "s"} at this funding`}</small>`
            : `<b class="idle">Idle</b><small>Pick a project below.</small>`}</div>
          <div class="fund"><span>Funding a day</span>${W.C.FUNDING.map(f => `<button data-a="fund" data-lab="${lab.id}" data-f="${f}" aria-pressed="${L.funding === f}">${f ? W.money(f) : "None"}</button>`).join("")}</div>
          <ul class="proj">
            ${avail.map(r => `<li${L.active === r.id ? ' class="on"' : ""}><span>${W.esc(r.name)}</span><em>${this.researchWhat(r)}</em><small>${W.money(r.cost)}${s.spent[r.id] ? ` · ${Math.round(W.C.progress(s, r.id) * 100)}% done` : ""}</small>
              ${L.active === r.id ? `<button data-a="pause" data-lab="${lab.id}">Pause</button>` : `<button data-a="research" data-lab="${lab.id}" data-r="${r.id}">Research</button>`}</li>`).join("")}
            ${locked.map(r => `<li class="locked"><span>${W.esc(r.name)}</span><em>needs ${r.needs.map(n => W.esc(W.C.byId(n).name)).join(" and ")}</em><small>${W.money(r.cost)}</small></li>`).join("")}
          </ul>
          ${lab.id === "mods" ? `<p class="note">Each part has three versions; finishing one opens the next.</p>` : ""}
          ${done.length ? `<p class="done">Done: ${done.map(r => W.esc(r.name)).join(", ")}</p>` : ""}
        </div>`;
      }).join("");
  }
  researchWhat(r) {
    if (r.weapon) return W.esc(W.WEAPONS[r.weapon].desc);
    const m = W.MODS.find(x => x.id === r.mod);
    return W.esc(m.what);
  }

  /* ---- the agent picker shared by the Armoury and the Clinic ---- */
  pickerHTML() {
    return `<div class="picker">${this.s.roster.map(a => `<button data-a="agent" data-id="${a.id}" aria-pressed="${a.id === this.agentId}"><canvas width="28" height="28" data-port="${a.id}"></canvas>${W.esc(a.name)}</button>`).join("")}</div>`;
  }

  armouryHTML() {
    const s = this.s, a = W.C.agentById(s, this.agentId);
    if (!a) return "<p>No Watchers.</p>";
    const forSale = Object.keys(W.C.PRICE).filter(t => W.C.START_DONE.includes(t) || W.C.isDone(s, t));
    const soon = W.C.RESEARCH.filter(r => r.weapon && !W.C.isDone(s, r.id));
    return this.pickerHTML() + `
      <h3>${W.esc(a.name)} carries <span>${a.items.length}/8 slots · ammunition is topped up free before every mission</span></h3>
      <ul class="inv">${a.items.map((it, i) => `<li><canvas width="44" height="22" data-icon="${it.type}"></canvas><span>${W.esc(W.WEAPONS[it.type].name)}${it.count > 1 ? ` ×${it.count}` : ""}</span>
        <button data-a="sell" data-i="${i}" title="Sell for half price">Sell ${W.money(Math.floor(W.C.PRICE[it.type] / 2))}</button></li>`).join("") || "<li class='empty'>Nothing.</li>"}</ul>
      <h3>For sale</h3>
      <ul class="shop">${forSale.map(t => { const why = W.C.canBuy(s, a, t); return `<li><canvas width="44" height="22" data-icon="${t}"></canvas>
        <span>${W.esc(W.WEAPONS[t].name)}<em>${W.esc(W.WEAPONS[t].desc)}</em></span>
        <button data-a="buy" data-t="${t}" ${why ? `disabled title="${W.esc(why)}"` : ""}>Buy ${W.money(W.C.PRICE[t])}</button></li>`; }).join("")}
        ${soon.map(r => `<li class="locked"><canvas width="44" height="22" data-icon="${r.weapon}"></canvas><span>${W.esc(r.name)}<em>research it first</em></span></li>`).join("")}</ul>`;
  }

  clinicHTML() {
    const s = this.s, a = W.C.agentById(s, this.agentId);
    if (!a) return "<p>No Watchers.</p>";
    return this.pickerHTML() + `
      <h3>${W.esc(a.name)}'s body <span>each part has three versions; research a version before installing it</span></h3>
      <ul class="mods">${W.MODS.map(m => {
        const v = a.mods[m.id] || 0, why = W.C.canInstall(s, a, m.id);
        return `<li><span class="part">${m.name}</span><span class="pips">${[1, 2, 3].map(i => `<i class="${i <= v ? "on" : W.C.isDone(s, m.id + i) ? "ready" : ""}"></i>`).join("")}</span>
          <em>${W.esc(m.what)}</em>
          ${v < 3 ? `<button data-a="install" data-part="${m.id}" ${why ? `disabled title="${W.esc(why)}"` : ""}>v${v + 1} · ${W.money(W.C.MOD_PRICE[v + 1])}</button>` : `<b class="max">v3</b>`}</li>`;
      }).join("")}</ul>
      <p class="note">Filled pips are installed; outlined ones are researched and ready to install.</p>`;
  }

  rosterHTML() {
    const s = this.s, why = W.C.canHire(s);
    return `<p class="note">Up to ${W.C.SQUAD} Watchers deploy on a contract. Watchers killed on a mission are gone for good, along with what they carried.</p>
      <ul class="roster">${s.roster.map(a => `<li class="${a.deployed ? "on" : ""}">
        <canvas width="40" height="40" data-port="${a.id}"></canvas>
        <div><b>${W.esc(a.name)}</b><small>${a.missions} mission${a.missions === 1 ? "" : "s"} · ${a.kills} down · ${a.items.map(i => W.WEAPONS[i.type].short).join(" ") || "unarmed"}</small>
        <small class="m">${W.MODS.filter(m => a.mods[m.id]).map(m => `${m.name} v${a.mods[m.id]}`).join(" · ") || "no mods"}</small></div>
        <button data-a="deploytoggle" data-id="${a.id}" aria-pressed="${a.deployed}">${a.deployed ? "In the squad" : "Reserve"}</button></li>`).join("")}</ul>
      <div class="acts"><button data-a="hire" ${why ? `disabled title="${W.esc(why)}"` : ""}>Hire a Watcher · ${W.money(W.C.HIRE)}</button>
      <span class="note">${s.roster.length}/${W.C.ROSTER_MAX} in the barracks${s.fallen && s.fallen.length ? ` · fallen: ${s.fallen.map(W.esc).join(", ")}` : ""}</span></div>`;
  }

  /* ---- input ---- */
  onClick(ev) {
    const b = ev.target.closest("button");
    if (!b || b.disabled) return;
    const s = this.s, d = b.dataset;
    if (d.tab) { this.tab = d.tab; W.store.set("tab_v1", this.tab); W.audio.play("click"); return this.draw(); }
    const a = W.C.agentById(s, this.agentId);
    switch (d.a) {
      case "wait": return this.wait();
      case "title": return this.game.toTitle();
      case "deploy": return this.game.toBriefing(d.c);
      case "fund": W.C.setFunding(s, d.lab, +d.f); break;
      case "research": W.C.setActive(s, d.lab, d.r); if (!s.labs[d.lab].funding) W.C.setFunding(s, d.lab, 1000); break;
      case "pause": W.C.setActive(s, d.lab, null); break;
      case "agent": this.agentId = +d.id; break;
      case "buy": if (!W.C.buy(s, a, d.t)) return W.audio.play("deny"); W.audio.play("pickup"); break;
      case "sell": W.C.sell(s, a, +d.i); W.audio.play("click"); break;
      case "install": if (!W.C.install(s, a, d.part)) return W.audio.play("deny"); W.audio.play("heal"); break;
      case "deploytoggle": W.C.toggleDeploy(s, W.C.agentById(s, +d.id)); break;
      case "hire": { const n = W.C.hire(s); if (n) { W.C.note(s, `${n.name} joins the Watchers.`); this.agentId = n.id; W.audio.play("select"); } break; }
      default: return;
    }
    if (d.a !== "buy" && d.a !== "install" && d.a !== "hire" && d.a !== "sell") W.audio.play("click");
    this.commit();
  }
  wait() {
    const s = this.s;
    if (!W.C.dailySpend(s)) { W.C.advanceDay(s); W.C.note(s, "A quiet day. The labs sit idle."); }
    else W.C.advanceDay(s);
    W.audio.play("order");
    this.commit();
  }
  onKey(k, ev) {
    if (k >= "1" && k <= "4") { this.tab = ["research", "armoury", "clinic", "roster"][+k - 1]; W.store.set("tab_v1", this.tab); this.draw(); return true; }
    if (k === "w") { this.wait(); return true; }
    if (k === "enter" && !(ev.target && ev.target.closest && ev.target.closest("button"))) { this.game.toBriefing(W.C.CONTRACTS[0].id); return true; }
    if (k === "escape") { this.game.toTitle(); return true; }
    return false;
  }
};
