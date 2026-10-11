/* Watchers command: the meta-game's screen. The city board on the left: eight
 * zones, each with its control, its level, and its pips, which the player
 * splits between research, money and control by clicking them. Cal, and the
 * log, under it. On the right, tabs: the missions on offer, research, the
 * squad (roster, armoury, clinic) and events. Every button changes the
 * campaign, saves it and redraws. */
"use strict";

W.Command = class {
  constructor(game) {
    this.game = game;
    this.tab = W.store.get("cmdtab_v1", "missions");
    this.zoneId = null;
    this.agentId = null;
  }
  get s() { return this.game.campaign; }

  open() {
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "ow cmd";
      this.el.setAttribute("role", "main");
      this.el.setAttribute("aria-label", "Watchers command");
      this.el.addEventListener("click", ev => this.onClick(ev));
      document.body.appendChild(this.el);
    }
    this.el.hidden = false;
    this.draw();
  }
  close() { if (this.el) { this.el.remove(); this.el = null; } }
  commit() { W.M.save(this.s); this.draw(); }

  draw() {
    const s = this.s, M = W.M;
    if (!this.agentId || !M.agentById(s, this.agentId)) this.agentId = s.roster[0] && s.roster[0].id;
    // the day's take, as the policies stand
    let rp = 0, money = 0;
    for (const z of s.zones) { if (z.lost) continue; const P = M.fitPolicy(s, z), y = M.yieldOf(z); rp += P.r * y; money += P.m * y * M.N.PIP_MONEY; }
    const pts = s.research.points;
    this.el.innerHTML = `
      <header class="ow-head">
        <div class="ow-brand"><span class="tag">PumaCity</span><h1>Watchers command</h1></div>
        <div class="ow-stats">
          <div><small>Day</small><b>${s.day}</b></div>
          <div><small>Cash</small><b>${W.money(s.cash)}</b></div>
          <div><small>A day</small><b class="c-m">+${W.money(money)}</b><b class="c-r"> +${rp.toFixed(1)}<i>rp</i></b></div>
          <div><small>${s.war ? "The city is" : "Upgrades"}</small><b class="${s.war ? "warn" : ""}">${s.war ? "AT WAR" : `${pts}<i>/${M.N.WAR_AT}</i>`}</b></div>
        </div>
        <div class="ow-acts">
          <button data-a="wait" title="Let a day pass: the zones produce, control moves, Cal works"><kbd>W</kbd>Wait a day</button>
          <button data-a="title"><kbd>Esc</kbd>Title</button>
        </div>
      </header>
      ${s.won ? `<div class="cmd-won">Every zone is locked down. PumaCity is Casey Benton's. <b>You win.</b></div>` : ""}
      <div class="ow-body">
        <section class="ow-left">
          <h2>The city <span class="key"><i class="c-r">research</i><i class="c-m">money</i><i class="c-c">control</i> · click a pip to move it</span></h2>
          <div class="board">${this.boardHTML()}</div>
          ${this.calHTML()}
          <h2>Log</h2>
          <ul class="ow-log">${s.log.slice(0, 10).map(l => `<li class="${l.kind}"><span>Day ${l.day}</span>${W.esc(l.text)}</li>`).join("")}</ul>
        </section>
        <section class="ow-right">
          <div class="ow-tabs" role="tablist">${[["missions", "Missions", "1"], ["research", "Research", "2"], ["squad", "Squad", "3"], ["events", "Events", "4"]].map(([id, n, k]) =>
            `<button role="tab" data-tab="${id}" aria-selected="${this.tab === id}" aria-pressed="${this.tab === id}"><kbd>${k}</kbd>${n}${id === "missions" ? ` <i class="n">${s.offers.length}</i>` : ""}</button>`).join("")}</div>
          <div class="ow-panel">${this[this.tab + "HTML"]()}</div>
        </section>
      </div>`;
    this.el.querySelectorAll("canvas[data-port]").forEach(c => { const a = M.agentById(s, +c.dataset.port); if (a) W.drawPortrait(c.getContext("2d"), W.agentLook(a), c.width, c.height); });
    this.el.querySelectorAll("canvas[data-icon]").forEach(c => W.drawWeaponIcon(c.getContext("2d"), c.dataset.icon, c.width / 2, c.height / 2, "#dbe4fb"));
  }

  /* ---------------- the board ---------------- */
  boardHTML() {
    return this.s.zones.map(z => this.zoneHTML(z)).join("");
  }
  zoneHTML(z) {
    const s = this.s, M = W.M, D = M.zoneDef(z.id), L = M.level(z.C);
    const P = z.lost ? { r: 0, m: 0, c: 0 } : M.fitPolicy(s, z), net = M.netControl(s, z), y = M.yieldOf(z);
    const status = z.locked ? `<b class="lv locked">LOCKED</b>` : z.lost ? `<b class="lv lost">LOST</b>` : `<b class="lv l${L}">L${L}</b>`;
    const pips = ["r", "m", "c"].flatMap(k => Array.from({ length: P[k] }, () => `<button class="pip p-${k}" data-a="pip" data-z="${z.id}" data-k="${k}" title="${{ r: "Research", m: "Money", c: "Control" }[k]}: click to move it on"></button>`)).join("");
    const offers = s.offers.filter(o => o.zone === z.id).length;
    const flags = [s.cal.zone === z.id ? `<i class="f-cal" title="Cal is pushing here">CAL</i>` : "", s.cal.revealed && s.cal.next === z.id && !s.cal.zone ? `<i class="f-next" title="Cal comes here next">CAL ${s.cal.nextIn}d</i>` : "",
      z.tactic ? `<i class="f-tac" title="${W.esc(z.tactic)}: control pips buy less until it's countered">TACTIC</i>` : "",
      z.floor ? `<i class="f-floor" title="${z.floor === 2 ? "Mind control: the zone settles back to level 2" : "Propaganda: the zone settles back to level 1"}">${z.floor === 2 ? "MIND" : "PROP"}</i>` : "", z.martial > 0 ? `<i class="f-ev">MARTIAL</i>` : "", z.festival > 0 ? `<i class="f-ev">FESTIVAL</i>` : ""].join("");
    // the control bar: 0..3.95, ticks at each level, the plateau from 3.5 shaded
    const pct = Math.max(0, Math.min(1, z.C / M.N.CAP)) * 100;
    const DIST = { downtown: "Downtown", suburbs: "Suburbs", convention: "Convention Center", starport: "Starport", ranch: "The Ranch" };
    return `<div class="zone d-${D.district} ${this.zoneId === z.id ? "sel" : ""} ${z.lost ? "lost" : ""} ${z.locked ? "locked" : ""} ${s.cal.zone === z.id ? "cal" : ""}" style="grid-area:${z.id}" data-a="zone" data-z="${z.id}" title="${W.esc(D.blurb)}">
      <div class="zd">${DIST[D.district]}</div>
      <div class="zh">${status}<span class="zn">${W.esc(D.name)}</span>${offers ? `<i class="f-off" title="missions on offer">${offers}</i>` : ""}</div>
      <div class="cbar" title="control ${z.C.toFixed(2)} of ${M.N.CAP}"><i style="width:${pct}%" class="l${Math.max(0, L)}"></i><u style="left:${100 / M.N.CAP}%"></u><u style="left:${200 / M.N.CAP}%"></u><u style="left:${300 / M.N.CAP}%"></u><s style="left:${350 / M.N.CAP}%"></s>${z.floor ? `<b class="floor" style="left:${100 * z.floor / M.N.CAP}%"></b>` : ""}</div>
      <div class="zs">${z.lost ? `<em>siege to retake</em>` : z.locked ? `<em>no decay</em>` : `<em class="${net >= 0 ? "up" : "down"}">${net >= 0 ? "+" : ""}${net.toFixed(2)}/day</em>`}<em>${z.lost ? "" : `${(P.r * y).toFixed(1)}rp ${W.money(P.m * y * M.N.PIP_MONEY)}`}</em></div>
      <div class="pipz">${pips || "<em>no production</em>"}</div>
      ${flags ? `<div class="fl">${flags}</div>` : ""}
    </div>`;
  }
  calHTML() {
    const s = this.s, M = W.M, c = s.cal;
    const now = c.zone ? `<b class="bad">Cal is pushing ${W.esc(M.zoneDef(c.zone).name)}</b>, ${c.left} more day${c.left === 1 ? "" : "s"}${c.bribed ? " (half-hearted: City Hall was paid)" : ""}. A mission against his crew there ends it.`
      : c.revealed && c.next ? `Cal is resting. <b class="warn">Next: ${W.esc(M.zoneDef(c.next).name)}, in ${c.nextIn} day${c.nextIn === 1 ? "" : "s"}.</b> Bank control there now.`
      : `Cal is resting. Where he goes next is anyone's guess: intel missions, or informants, would tell you.`;
    return `<p class="cal">${now}</p>`;
  }

  /* ---------------- missions ---------------- */
  missionsHTML() {
    const s = this.s, M = W.M;
    const list = s.offers.slice().sort((a, b) => (this.zoneId ? (b.zone === this.zoneId) - (a.zone === this.zoneId) : 0) || (a.threat || 1) - (b.threat || 1) || a.kind.localeCompare(b.kind));
    const squad = M.squad(s), tier = M.squadTier(s);
    return `<p class="note">The squad can take on threat <b class="tier">${tier}</b> <span class="dots">${this.dots(tier, tier)}</span> (power ${M.squadPower(s).toFixed(1)}; better guns, marks and mods raise it). Above that, expect to lose Watchers. Quiet jobs can be done without a shot fired.</p>
      <p class="note">A mission takes days. The zones' pips stand as you set them until the squad is back${M.isDone(s, "overseers") ? "; the overseers keep each zone from slipping below its level" : ""}. Lower control means more missions, and rougher streets.</p>
      <p class="note">The squad: ${squad.map(a => `<b>${W.esc(a.name)}</b>`).join(", ")} <button class="mini" data-tab="squad">change</button></p>
      ${list.map(o => this.offerHTML(o)).join("") || "<p>Nothing on offer. Wait a day.</p>"}`;
  }
  // threat as five pips, lit up to the threat, coloured against what the squad can take on
  dots(threat, tier) {
    const cls = threat <= tier ? "ok" : threat === tier + 1 ? "hard" : "deadly";
    return Array.from({ length: 5 }, (_, i) => `<i class="${i < threat ? cls : ""}"></i>`).join("");
  }
  offerHTML(o) {
    const s = this.s, M = W.M, D = M.zoneDef(o.zone), z = M.zone(s, o.zone), K = M.KINDS[o.kind], why = M.canRun(s, o), tier = M.squadTier(s), th = o.threat || 1;
    const lvl = z.lost ? "lost" : `level ${M.level(z.C)}`;
    const title = o.kind === "story" ? `${M.STORY[o.step].name}` : K.name;
    return `<div class="offer k-${o.kind} ${this.zoneId === o.zone ? "here" : ""}">
      <div><span class="dots" title="threat ${th}${th > tier ? ": above what the squad can take on" : ""}">${this.dots(th, tier)}</span> <span class="kind">${W.esc(K.name)}</span>${K.quiet ? ` <i class="quiet" title="can be done without a shot fired">quiet</i>` : ""} <b>${W.esc(title === K.name ? (o.landmark || D.name) : title)}</b> <small>${W.esc(D.name)} · ${lvl} · ${o.days} days${o.expires < 90 + s.day ? ` · gone in ${Math.max(0, o.expires - s.day)}d` : ""}</small>
      <p>${W.esc(M.describeReward(s, o))}</p></div>
      <button class="primary" data-a="deploy" data-o="${o.id}" ${why ? `disabled title="${W.esc(why)}"` : ""}>Brief</button></div>`;
  }

  /* ---------------- research ---------------- */
  researchHTML() {
    const s = this.s, M = W.M, R = s.research, run = R.running;
    const rate = s.zones.reduce((t, z) => t + (z.lost ? 0 : M.fitPolicy(s, z).r * M.yieldOf(z)), 0);
    const avail = M.available(s);
    const group = (title, list) => list.length ? `<h3>${title}</h3><ul class="proj">${list.map(r => { const why = M.canStart(s, r);
      return `<li><span>${W.esc(r.name)}${r.points ? ` <i class="pt">${r.points}pt</i>` : ""}</span><em>${W.esc(this.what(r))}</em><small>${W.money(r.cost[0])} · ${r.cost[1]}rp</small><button data-a="start" data-r="${r.id}" ${why ? `disabled title="${W.esc(why)}"` : ""}>Start</button></li>`; }).join("")}</ul>` : "";
    return `<p class="note">Research costs money to start and research points to finish. Points can't be banked: they split evenly between the projects running, and with none running they're wasted. ${s.war ? "" : `War comes at ${M.N.WAR_AT} upgrade points (an MK3 or the BanHammer is 2).`}</p>
      <div class="lab"><h3>Running <span>${rate.toFixed(1)} points a day${run.length > 1 ? `, ${(rate / run.length).toFixed(1)} each` : ""}</span></h3>
        ${run.length ? `<ul class="proj">${run.map(p => `<li class="on"><span>${W.esc(p.name)}</span><em><div class="bar"><i style="width:${Math.round(100 * (1 - p.left / p.total))}%"></i></div></em>
          <small>${Math.ceil(p.left)} of ${p.total}rp${rate ? ` · ${Math.ceil(p.left / (rate / run.length))}d` : ""}</small><button data-a="cancel" data-r="${p.id}" title="Stop it: what was paid is lost">Stop</button></li>`).join("")}</ul>`
          : `<p class="warn">Nothing running: today's research points are wasted.</p>`}</div>
      ${group("Countermeasures to Cal's tactics", avail.filter(r => r.kind === "counter"))}
      ${group("Weapons", avail.filter(r => r.kind === "weapon"))}
      ${group("Mods", avail.filter(r => r.kind === "mod"))}
      ${group("Gear", avail.filter(r => r.kind === "gear"))}
      ${group("The city", avail.filter(r => r.kind === "city"))}
      ${R.done.length > M.START_DONE.length ? `<p class="done">Done: ${R.done.filter(d => !M.START_DONE.includes(d)).map(d => W.esc(M.item(d).name)).join(", ")}</p>` : ""}`;
  }
  what(r) {
    const M = W.M;
    if (r.kind === "weapon") return r.mk === 1 ? (W.WEAPONS[r.line] || {}).desc || "" : r.mk === 2 ? "hits harder, reaches further" : "hits hardest";
    if (r.kind === "mod") return (W.MODS.find(m => m.id === r.line) || {}).what || "";
    if (r.line === "scanner" || r.line === "purrsuader") return M.GEAR_LINES.find(g => g.id === r.line).what[r.mk - 1];
    if (r.id === "banhammer") return "an orbital strike: mark a spot, and everything near it dies";
    if (r.id === "overseers") return "while the squad is out, zones keep their level";
    if (r.id === "propaganda") return "a zone it's rolled out in settles back to level 1, never lower by itself. It works";
    if (r.id === "mindcontrol") return "a zone it's rolled out in settles back to level 2. It works. That is the worst of it";
    if (r.id === "works") return "+1 pip, for good, in the zone that makes least";
    if (r.id === "requisition") return "a free pip of control a day, wherever control is weakest";
    if (r.kind === "counter") return "control pips there buy full value again";
    return "";
  }

  /* ---------------- the squad: roster, armoury, clinic ---------------- */
  squadHTML() {
    const s = this.s, M = W.M, a = M.agentById(s, this.agentId), why = M.canHire(s);
    const roster = `<ul class="roster">${s.roster.map(x => `<li class="${x.deployed ? "on" : ""} ${x.id === this.agentId ? "sel" : ""}">
        <canvas width="40" height="40" data-port="${x.id}" data-a="agent" data-id="${x.id}"></canvas>
        <div data-a="agent" data-id="${x.id}"><b>${W.esc(x.name)}</b><small>${x.missions} mission${x.missions === 1 ? "" : "s"} · ${x.kills} down · worth ${W.money(M.worth(x))}</small>
        <small class="m">${x.items.map(i => `${(W.WEAPONS[i.type] || { short: i.type === "banhammer" ? "BANH" : i.type }).short}${i.mk > 1 ? i.mk : ""}`).join(" ")} · ${W.MODS.filter(m => x.mods[m.id]).map(m => `${m.name} ${x.mods[m.id]}`).join(" ") || "no mods"}</small></div>
        <button data-a="deploytoggle" data-id="${x.id}" aria-pressed="${x.deployed}">${x.deployed ? "Squad" : "Reserve"}</button></li>`).join("")}</ul>
      <div class="acts"><button data-a="hire" ${why ? `disabled title="${W.esc(why)}"` : ""}>Recruit · ${W.money(M.PRICE.recruit)}</button>
      <span class="note">${s.roster.length}/${M.ROSTER_MAX} Watchers, ${M.SQUAD} go out${s.fallen.length ? ` · fallen: ${s.fallen.map(W.esc).join(", ")}` : ""}</span></div>`;
    if (!a) return roster;
    const shop = M.shop(s, a);
    const scan = M.canUpgradeScanner(s);
    return roster + `
      <h3>${W.esc(a.name)} carries <span>${a.items.length}/8 · ammunition is topped up free</span></h3>
      <ul class="inv">${a.items.map((it, i) => `<li><canvas width="44" height="22" data-icon="${it.type === "banhammer" ? "laser" : it.type}"></canvas><span>${W.esc(it.type === "banhammer" ? "BanHammer strike" : (W.WEAPONS[it.type] || {}).name || it.type)}${it.mk ? ` MK${it.mk}` : ""}${it.count > 1 ? ` ×${it.count}` : ""}</span>
        <button data-a="sell" data-i="${i}" title="Sell for half">Sell</button></li>`).join("") || "<li class='empty'>Nothing.</li>"}</ul>
      <h3>The Armoury</h3>
      <ul class="shop">${shop.map(it => { const why2 = M.canBuy(s, a, it); return `<li><canvas width="44" height="22" data-icon="${it.type === "banhammer" ? "laser" : it.type}"></canvas><span>${W.esc(it.name)}${it.upgrade ? "<em>replaces the one carried</em>" : ""}</span>
        <button data-a="buy" data-k="${it.key}" ${why2 ? `disabled title="${W.esc(why2)}"` : ""}>${W.money(it.price)}</button></li>`; }).join("")}</ul>
      <h3>The Clinic <span>${W.esc(a.name)}'s body</span></h3>
      <ul class="mods">${W.MODS.map(m => { const v = a.mods[m.id] || 0, why3 = M.canInstall(s, a, m.id);
        return `<li><span class="part">${m.name}</span><span class="pips">${[1, 2, 3].map(k => `<i class="${k <= v ? "on" : M.isDone(s, `${m.id}:${k}`) ? "ready" : ""}"></i>`).join("")}</span><em>${W.esc(m.what)}</em>
          ${v < 3 ? `<button data-a="install" data-part="${m.id}" ${why3 ? `disabled title="${W.esc(why3)}"` : ""}>MK${v + 1} · ${W.money(M.PRICE.mod[v + 1])}</button>` : `<b class="max">MK3</b>`}</li>`; }).join("")}</ul>
      <h3>The squad's scanner <span>${s.scannerMk ? `MK${s.scannerMk}` : "the standard issue"}</span></h3>
      ${s.scannerMk < 3 ? `<div class="acts"><button data-a="scanner" ${scan ? `disabled title="${W.esc(scan)}"` : ""}>Fit MK${s.scannerMk + 1} · ${W.money(M.PRICE.scanner[s.scannerMk + 1])}</button></div>` : ""}`;
  }

  /* ---------------- events ---------------- */
  eventsHTML() {
    const s = this.s, M = W.M, z = this.zoneId && M.zone(s, this.zoneId);
    return `<p class="note">Money buys what production can't. Events in a zone apply to the zone picked on the board${z ? `: <b>${W.esc(M.zoneDef(z.id).name)}</b>` : " (click one)"}.</p>
      <ul class="proj">${M.EVENTS.map(e => { const why = M.canEvent(s, e, z);
        return `<li><span>${W.esc(e.name)}</span><em>${W.esc(e.what)}</em><small>${W.money(e.price)}</small><button data-a="event" data-e="${e.id}" ${why ? `disabled title="${W.esc(why)}"` : ""}>Buy</button></li>`; }).join("")}</ul>`;
  }

  /* ---------------- input ---------------- */
  onClick(ev) {
    const b = ev.target.closest("[data-a],[data-tab]");
    if (!b || b.disabled) return;
    const s = this.s, M = W.M, d = b.dataset, a = M.agentById(s, this.agentId);
    if (d.tab) { this.tab = d.tab; W.store.set("cmdtab_v1", this.tab); W.audio.play("click"); return this.draw(); }
    switch (d.a) {
      case "wait": return this.wait();
      case "title": return this.game.toTitle();
      case "zone": if (ev.target.closest(".pip")) return; this.zoneId = this.zoneId === d.z ? null : d.z; W.audio.play("click"); return this.draw();
      case "pip": M.cyclePip(s, M.zone(s, d.z), d.k); break;
      case "deploy": return this.game.toBriefing(d.o);
      case "start": { const r = M.available(s).find(x => x.id === d.r); if (!r || !M.start(s, r)) return W.audio.play("deny"); W.audio.play("select"); break; }
      case "cancel": M.cancel(s, d.r); break;
      case "agent": this.agentId = +d.id; break;
      case "deploytoggle": M.toggleDeploy(s, M.agentById(s, +d.id)); break;
      case "hire": { const n = M.hire(s); if (n) { M.note(s, `${n.name} joins the Watchers.`); this.agentId = n.id; W.audio.play("select"); } break; }
      case "buy": { const it = M.shop(s, a).find(x => x.key === d.k); if (!it || !M.buy(s, a, it)) return W.audio.play("deny"); W.audio.play("pickup"); break; }
      case "sell": M.sell(s, a, +d.i); break;
      case "install": if (!M.install(s, a, d.part)) return W.audio.play("deny"); W.audio.play("heal"); break;
      case "scanner": if (!M.upgradeScanner(s)) return W.audio.play("deny"); W.audio.play("pickup"); break;
      case "event": { const e = M.EVENTS.find(x => x.id === d.e); if (!M.event(s, e, this.zoneId && M.zone(s, this.zoneId))) return W.audio.play("deny"); W.audio.play("select"); break; }
      default: return;
    }
    if (!["buy", "install", "hire", "start", "event"].includes(d.a)) W.audio.play("click");
    this.commit();
  }
  wait() { W.M.advanceDay(this.s); W.audio.play("order"); this.commit(); }
  onKey(k, ev) {
    if (k >= "1" && k <= "4") { this.tab = ["missions", "research", "squad", "events"][+k - 1]; W.store.set("cmdtab_v1", this.tab); this.draw(); return true; }
    if (k === "w") { this.wait(); return true; }
    if (k === "escape") { if (this.zoneId) { this.zoneId = null; this.draw(); } else this.game.toTitle(); return true; }
    return false;
  }
};
