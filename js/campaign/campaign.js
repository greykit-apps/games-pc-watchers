/* The campaign, Syndicate Wars-style: contracts pay cash, cash funds two
 * research labs a day at a time, and finished research puts new gear in the
 * Armoury and new mods in the Clinic, where it still has to be bought.
 * Watchers who die stay dead.
 *
 * Plain data and functions over one JSON state, saved under
 * pcwatchers_campaign_v1. Nothing in here touches the DOM. */
"use strict";

W.C = {};

/* ---- what can be researched ---- */
W.C.RESEARCH = (() => {
  const r = [
    { id: "uzi", lab: "weapons", name: "Uzi", cost: 4000, needs: [], weapon: "uzi" },
    { id: "longrange", lab: "weapons", name: "Longwhisker rifle", cost: 8000, needs: [], weapon: "longrange" },
    { id: "purr2", lab: "weapons", name: "Purrsuader II", cost: 12000, needs: [], weapon: "purr2" },
    { id: "minigun", lab: "weapons", name: "Minigun", cost: 15000, needs: ["uzi"], weapon: "minigun" },
    { id: "laser", lab: "weapons", name: "Laser", cost: 24000, needs: ["longrange"], weapon: "laser" },
    { id: "gauss", lab: "weapons", name: "Gauss Gun", cost: 36000, needs: ["minigun", "laser"], weapon: "gauss" },
  ];
  const costs = [5000, 12000, 25000];
  for (const m of W.MODS) for (let v = 1; v <= 3; v++) {
    r.push({ id: `${m.id}${v}`, lab: "mods", name: `${m.name} v${v}`, cost: costs[v - 1], needs: v > 1 ? [`${m.id}${v - 1}`] : [], mod: m.id, v });
  }
  return r;
})();
W.C.byId = id => W.C.RESEARCH.find(r => r.id === id);
/* what a Watcher starts the campaign able to buy */
W.C.START_DONE = ["pistol", "shotgun", "purrsuader", "medikit"];

W.C.PRICE = { pistol: 300, shotgun: 900, uzi: 1500, longrange: 3000, purrsuader: 2500, purr2: 6000, minigun: 5000, laser: 8000, gauss: 12000, medikit: 400 };
W.C.MOD_PRICE = [0, 2000, 5000, 10000];
W.C.FUNDING = [0, 250, 500, 1000, 2000, 4000];
W.C.HIRE = 4000;
W.C.ROSTER_MAX = 8;
W.C.SQUAD = 4;
W.C.GRADE_PAY = { S: 1.25, A: 1.1, B: 1, C: 0.9, D: 0.8 };
W.C.LABS = [
  { id: "weapons", name: "Weapons lab", who: "Bay 9 armourers" },
  { id: "mods", name: "Cyber lab", who: "the clinic under PVN Tower" },
];

/* ---- the city ----
 * PumaCity's districts, laid out as PumaCity draws them. Downtown has the
 * only contract so far; the rest wait on Joyeuse's intel. */
W.C.DISTRICTS = [
  { id: "convention", name: "Convention Center", col: 0, row: 0, blurb: "Halls, an arena and acres of parking by the Starport. A new event every week, and pickpockets at all of them." },
  { id: "ranch", name: "The Ranch", col: 1, row: 0, blurb: "An old horse ranch turned grow fields. The Watchers rarely come out this far." },
  { id: "vault", name: "The Vault", col: 0, row: 1, blurb: "The leadership's war shelter, run as a bank meanwhile. Everyone's money, and everyone's secrets." },
  { id: "suburbs", name: "Suburbs", col: 1, row: 1, blurb: "Cul-de-sacs of Casey Benton's rentals. Quiet, until it isn't." },
  { id: "starport", name: "Starport", col: 0, row: 2, blurb: "Where the ship lands. Bay 9's outfitters, and Skooma coming in cheap." },
  { id: "downtown", name: "Downtown", col: 1, row: 2, hq: true, blurb: "Market Plaza and PVN Tower, Casey Benton's theater, nightclub and penthouse. The Watchers work out of its basement." },
];
W.C.CONTRACTS = [
  { id: "plaza", level: "plaza", district: "downtown", name: "Market Plaza", op: "Clean Sweep", fee: 15000, repeatFee: 6000, bonusFee: 2500, days: 2,
    summary: "Kill Vesper Sly, who sells Skooma under the Boss's price.",
    repeatSummary: "Mop-up: Sly's old crew has regrouped around a new face in a white suit. Same job, smaller fee." },
];

/* ---- the squad ---- */
W.C.NAMES = ["OCELOT", "SERVAL", "MAINE", "BENGAL", "RAGDOLL", "ABBY", "SIAMESE", "CHARTREUX", "KORAT", "BOMBAY", "SOMALI", "TONKINESE", "BIRMAN", "SAVANNAH"];
W.C.agent = (id, name, fur, items, patch) => ({ id, name, fur, patch: patch || null, mods: {}, items, deployed: true, missions: 0, kills: 0 });

W.C.fresh = () => {
  const s = {
    v: 1, day: 1, cash: 10000, nextId: 5,
    done: W.C.START_DONE.slice(),
    labs: { weapons: { active: "uzi", funding: 1000 }, mods: { active: null, funding: 0 } },
    spent: {},
    roster: [
      W.C.agent(1, "LYNX", "#b08a5a", [{ type: "pistol" }, { type: "purrsuader" }, { type: "medikit", count: 1 }]),
      W.C.agent(2, "MANX", "#7c7c84", [{ type: "pistol" }, { type: "shotgun" }, { type: "medikit", count: 1 }]),
      W.C.agent(3, "SPHYNX", "#c9a49a", [{ type: "pistol" }, { type: "shotgun" }, { type: "medikit", count: 1 }]),
      W.C.agent(4, "CALICO", "#e8e4dc", [{ type: "pistol" }, { type: "pistol" }, { type: "medikit", count: 1 }], "#c98a4a"),
    ],
    contracts: {},
    log: [],
  };
  // two pistols is one pistol
  s.roster[3].items = [{ type: "pistol" }, { type: "medikit", count: 1 }];
  W.C.note(s, "Casey Benton has put the Watchers on the payroll. The weapons lab is working on the Uzi.");
  return s;
};

W.C.KEY = "campaign_v1";
W.C.load = () => { const s = W.store.get(W.C.KEY, null); return s && s.v === 1 ? s : null; };
W.C.save = s => W.store.set(W.C.KEY, s);
W.C.note = (s, text, kind = "") => { s.log.unshift({ day: s.day, text, kind }); s.log.length = Math.min(s.log.length, 40); };

/* ---- research ---- */
W.C.isDone = (s, id) => s.done.includes(id);
W.C.available = (s, id) => { const r = W.C.byId(id); return r && !W.C.isDone(s, id) && r.needs.every(n => W.C.isDone(s, n)); };
W.C.progress = (s, id) => (s.spent[id] || 0) / W.C.byId(id).cost;
W.C.daysLeft = (s, lab) => {
  const L = s.labs[lab];
  if (!L.active || !L.funding) return Infinity;
  const r = W.C.byId(L.active);
  return Math.ceil((r.cost - (s.spent[r.id] || 0)) / L.funding);
};
W.C.dailySpend = s => W.C.LABS.reduce((a, l) => a + (s.labs[l.id].active ? s.labs[l.id].funding : 0), 0);
W.C.setActive = (s, lab, id) => { if (id === null || (W.C.available(s, id) && W.C.byId(id).lab === lab)) s.labs[lab].active = id; };
W.C.setFunding = (s, lab, f) => { if (W.C.FUNDING.includes(f)) s.labs[lab].funding = f; };

/* A day passes: each lab spends its funding, as far as the cash goes. */
W.C.advanceDay = (s, n = 1) => {
  for (let d = 0; d < n; d++) {
    s.day++;
    for (const lab of W.C.LABS) {
      const L = s.labs[lab.id];
      if (!L.active || !L.funding) continue;
      const r = W.C.byId(L.active);
      const owed = r.cost - (s.spent[r.id] || 0);
      const pay = Math.min(L.funding, owed, s.cash);
      if (pay <= 0) { if (s.cash <= 0 && !s.brokeNoted) { W.C.note(s, `The ${lab.name.toLowerCase()} has stopped: no money.`, "bad"); s.brokeNoted = true; } continue; }
      s.brokeNoted = false;
      s.cash -= pay;
      s.spent[r.id] = (s.spent[r.id] || 0) + pay;
      if (s.spent[r.id] >= r.cost) {
        s.done.push(r.id);
        L.active = null;
        W.C.note(s, r.weapon ? `Weapons lab: the ${r.name} is ready. Buy it in the Armoury.` : `Cyber lab: ${r.name} is ready. Install it at the Clinic.`, "good");
        // carry on with the next thing in the same lab, if there is an obvious one
        const next = W.C.RESEARCH.find(x => x.lab === lab.id && W.C.available(s, x.id) && (s.spent[x.id] || 0) > 0);
        if (next) L.active = next.id;
      }
    }
  }
};

/* ---- the Armoury and the Clinic ---- */
W.C.agentById = (s, id) => s.roster.find(a => a.id === id);
W.C.slots = a => a.items.length;
W.C.canBuy = (s, a, type) => {
  if (!W.C.isDone(s, type) && !W.C.START_DONE.includes(type)) return "not researched";
  if (s.cash < W.C.PRICE[type]) return "not enough cash";
  if (type === "medikit") { const m = a.items.find(i => i.type === "medikit"); if (m) return m.count >= 4 ? "carries 4 already" : ""; }
  else if (a.items.some(i => i.type === type)) return "already carries one";
  if (a.items.length >= 8) return "no free slot";
  return "";
};
W.C.buy = (s, a, type) => {
  if (W.C.canBuy(s, a, type)) return false;
  s.cash -= W.C.PRICE[type];
  const m = type === "medikit" && a.items.find(i => i.type === "medikit");
  if (m) m.count++;
  else a.items.push(type === "medikit" ? { type, count: 1 } : { type });
  return true;
};
W.C.sell = (s, a, idx) => {
  const it = a.items[idx];
  if (!it) return false;
  s.cash += Math.floor(W.C.PRICE[it.type] / 2);
  if (it.type === "medikit" && it.count > 1) it.count--;
  else a.items.splice(idx, 1);
  return true;
};
W.C.canInstall = (s, a, part) => {
  const v = (a.mods[part] || 0) + 1;
  if (v > 3) return "fully modded";
  if (!W.C.isDone(s, `${part}${v}`)) return "research it first";
  if (s.cash < W.C.MOD_PRICE[v]) return "not enough cash";
  return "";
};
W.C.install = (s, a, part) => {
  if (W.C.canInstall(s, a, part)) return false;
  const v = (a.mods[part] || 0) + 1;
  s.cash -= W.C.MOD_PRICE[v];
  a.mods[part] = v;
  return true;
};

/* ---- the roster ---- */
W.C.squad = s => s.roster.filter(a => a.deployed).slice(0, W.C.SQUAD);
W.C.toggleDeploy = (s, a) => {
  if (a.deployed) { if (W.C.squad(s).length > 1) a.deployed = false; }
  else if (W.C.squad(s).length < W.C.SQUAD) a.deployed = true;
};
W.C.canHire = s => s.roster.length >= W.C.ROSTER_MAX ? "the barracks are full" : s.cash < W.C.HIRE ? "not enough cash" : "";
W.C.hire = (s, free = false) => {
  if (!free && W.C.canHire(s)) return null;
  if (!free) s.cash -= W.C.HIRE;
  const used = new Set(s.roster.map(a => a.name).concat(s.fallen || []));
  const name = W.C.NAMES.find(n => !used.has(n)) || "STRAY " + s.nextId;
  const a = W.C.agent(s.nextId++, name, W.pick(W.FURS), [{ type: "pistol" }, { type: "medikit", count: 1 }], W.chance(0.3) ? W.pick(W.FURS) : null);
  a.deployed = W.C.squad(s).length < W.C.SQUAD;
  s.roster.push(a);
  return a;
};

/* What the mission engine needs for the deployed squad: names, looks, mods
 * and a loadout with fresh ammunition. */
W.C.missionRoster = s => W.C.squad(s).map(a => ({
  id: a.id, name: a.name, fur: a.fur, patch: a.patch, mods: Object.assign({}, a.mods),
  weapons: a.items.map(i => ({ type: i.type, ammo: i.type === "medikit" ? i.count : undefined })),
}));

/* ---- the pay ---- */
W.C.contractFee = (s, c) => (s.contracts[c.id] && s.contracts[c.id].wins ? c.repeatFee : c.fee);
/* Settle a finished (or abandoned) mission. result: { contract, won, grade,
 * bonuses, agents: [{ id, alive, items, kills }] }. Returns the lines of the
 * payslip for the debrief. */
W.C.settle = (s, res) => {
  const c = W.C.CONTRACTS.find(x => x.id === res.contract);
  const rec = s.contracts[c.id] || (s.contracts[c.id] = { wins: 0, tries: 0, best: null });
  rec.tries++;
  const lines = [];
  let pay = 0;
  if (res.won) {
    const fee = W.C.contractFee(s, c);
    lines.push([rec.wins ? "Mop-up fee" : "Contract fee", fee]);
    pay += fee;
    if (res.bonuses) { lines.push([`Bonuses (${res.bonuses})`, res.bonuses * c.bonusFee]); pay += res.bonuses * c.bonusFee; }
    const mul = W.C.GRADE_PAY[res.grade] || 1;
    if (mul !== 1) { const d = Math.round(pay * (mul - 1)); lines.push([`Grade ${res.grade}`, d]); pay += d; }
    rec.wins++;
    const rank = g => "SABCD".indexOf(g);
    if (!rec.best || rank(res.grade) < rank(rec.best)) rec.best = res.grade;
    s.cash += pay;
    W.C.note(s, `${c.name}: contract complete, grade ${res.grade}. Casey Benton paid $${pay.toLocaleString("en-US")}.`, "good");
  } else {
    lines.push(["No fee", 0]);
    W.C.note(s, `${c.name}: contract failed. No fee.`, "bad");
  }
  // the squad comes home, or doesn't
  for (const r of res.agents) {
    const a = W.C.agentById(s, r.id);
    if (!a) continue;
    if (!r.alive) {
      s.roster = s.roster.filter(x => x !== a);
      (s.fallen || (s.fallen = [])).push(a.name);
      W.C.note(s, `${a.name} was killed in ${c.name}.`, "bad");
      continue;
    }
    a.missions++; a.kills += r.kills || 0;
    // they keep what they carry home, picked-up weapons included; empty medikits are gone
    const items = [];
    for (const w of r.items) {
      if (w.type === "medikit") { if (w.ammo > 0) items.push({ type: "medikit", count: Math.min(4, w.ammo) }); }
      else if (!items.some(i => i.type === w.type)) items.push({ type: w.type });
    }
    a.items = items.slice(0, 8);
  }
  if (!s.roster.length) {
    const a = W.C.hire(s, true);
    W.C.note(s, `With no Watchers left, Casey Benton sends a raw recruit: ${a.name}.`, "bad");
  }
  if (!W.C.squad(s).length) s.roster[0].deployed = true;
  const before = s.cash;
  W.C.advanceDay(s, c.days);
  lines.push([`Research, ${c.days} days`, -(before - s.cash)]);
  return { lines, pay };
};

W.money = n => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
