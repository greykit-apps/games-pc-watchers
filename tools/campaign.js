#!/usr/bin/env node
/* A headless campaign: a bot plays the meta-game (js/campaign/meta.js) from a
 * fresh start, as a player would. It keeps research running (a weapon, mod or
 * gear project on top, the city's underneath), kits the squad out (guns, mods
 * to MK3 as they're researched, the scanner), sells what it brings home, and
 * takes the mission worth most a day for the risk: what it pays (money,
 * control, research, Cal's push broken, a zone back, a story step) times the
 * chance to win, less the Watchers it expects to lose at what they're worth.
 * At war it puts every pip on control where a story step waits on the zone's
 * level. Never goes out short-handed while there's a Watcher in reserve or
 * cash for a recruit. Checks the campaign's invariants after every mission.
 *
 *   node tools/campaign.js [missions=60] [--fight] [--harsh] [--quiet] [--seed=N] [--strategy=S] [--idle=N]
 *   node tools/campaign.js --report [--seeds=12] [--missions=200] [--harsh] [--idle=N] [--strategy=S]
 *
 * A mission's outcome is rolled from tools/fights.json: the tactics bench
 * (tools/bench.js) playing each kind at each squad level and threat, every
 * way in. A careful player (the default) fights as the two best ways in for
 * that cell did; --harsh, as the average of every way the squad can manage
 * (the raw rate). --fight plays each one out in the mission engine instead.
 * The bot gives the order to Take Control once the squad is tier 3, or at 40
 * upgrade points. Strategies: baseline, turtle, mind (propaganda and mind
 * control everywhere, story first), eager (Take Control the moment it's
 * ready, as a first-timer might). --idle=N waits N days after every mission.
 *
 * --report plays a dozen campaigns and checks them against the targets in
 * docs/balance-plan.md: the board, training jobs, threat gaps, deaths, money
 * and research.
 *
 * As a module: require("./campaign.js").play({ seed, missions, fight, strategy }) */
"use strict";
const path = require("path");
const { load, run } = require("./sim.js");

/* ---------------- the rolled fight ---------------- */
const FIGHTS = require(path.join(__dirname, "fights.json"));
// the story's steps fight as their jobs, and Cal's crew as a crackdown on his people
const engineKind = o => o.kind === "story" ? ["assassinate", "persuade", "siege"][o.step] : o.kind === "cal" ? "crackdown" : o.kind;
// where the bench has no cell: by threat minus tier, the chance to win and the Watchers lost (the engine's test bot, 2026-10-11)
const ROLL = { "-2": [0.99, 0], "-1": [0.98, 0.03], 0: [0.95, 0.2], 1: [0.88, 1.0], 2: [0.5, 2.4], 3: [0.15, 3.2] };
const guess = gap => { const [w, l] = ROLL[Math.max(-2, Math.min(3, gap))]; return [w, l, 0.5, 2, 0]; };
/* The odds for a mission: [chance to win, Watchers lost, side jobs done, side jobs offered, loot].
 * level is the squad's (tier less one). The bench measured each threat for squads one level over
 * it to two under (gaps -1 to +2); past that, the nearest of those cells at the mission's own
 * threat (so the loot is that threat's): a squad far over it loses a third as many as the cell
 * says, one more than two under is half as likely to win and loses a third more. */
function odds(kind, level, threat, ways, careful) {
  const t = Math.max(1, Math.min(5, threat)), gap = t - level - 1;
  let lv = Math.max(0, Math.min(level, t, 4), t - 3), cell = FIGHTS.cells[`${kind} L${lv} t${t}`];
  while (!cell && lv > 0) { lv--; cell = FIGHTS.cells[`${kind} L${lv} t${t}`]; }
  if (!cell) return guess(gap);
  const rows = Object.entries(cell).filter(([w, r]) => ways.includes(w) && r[0]).map(([, r]) => r.map((x, i) => i ? x / r[0] : x));
  if (!rows.length) return guess(gap);
  // careful: the two best ways in (most won, then fewest lost); raw: every way the squad has
  rows.sort((a, b) => b[1] - a[1] || a[2] - b[2]);
  // a strike carried is called down, careful or not: half the time, for the raw player
  const strike = ways.includes("banhammer") && cell.banhammer && cell.banhammer[0] ? cell.banhammer.map((x, i) => i ? x / cell.banhammer[0] : x) : null;
  const use = careful ? rows.slice(0, 2) : strike ? rows.concat(Array(rows.length).fill(strike)) : rows, mean = i => use.reduce((s, r) => s + r[i], 0) / use.length;
  let [won, lost, done, offered, loot] = [mean(1), mean(2), mean(3), mean(4), mean(5)];
  if (level > lv + 0) for (let k = lv; k < level && k < 4; k++) lost /= 3;
  if (level < lv - 0 || gap > 2) { won *= 0.5; lost = Math.min(4, lost * 1.33); }
  return [won, lost, done, offered, loot];
}

/* ---------------- what things are worth, to the bot ---------------- */
const CV = 60000;        // a point of control, in money: a level of a zone is a pip a day for a long time
const RPV = 500;         // a research point
function play(opt = {}) {
  const W = opt.W || load(), M = W.M;
  const N = opt.missions || 60, fight = !!opt.fight, strategy = opt.strategy || "baseline", seed = opt.seed || 1, careful = !opt.harsh, idle = opt.idle || 0;
  let r = seed * 9301 + 49297;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const s = M.fresh(seed);
  const log = opt.log || (() => {});
  const fail = m => { throw new Error(`day ${s.day}: ${m}`); };
  const check = () => {
    if (!Number.isFinite(s.cash) || s.cash < 0) fail(`cash went to ${s.cash}`);
    if (!s.roster.length) fail("no Watchers left");
    if (M.squad(s).length < 1 || M.squad(s).length > M.SQUAD) fail("squad size");
    if (s.roster.length > M.ROSTER_MAX) fail("too many Watchers");
    for (const a of s.roster) if (M.slots(a) > 8) fail(`${a.name} carries ${M.slots(a)} items`);
    for (const id of s.research.done) if (s.research.done.indexOf(id) !== s.research.done.lastIndexOf(id)) fail(`${id} researched twice`);
    for (const z of s.zones) {
      if (!(z.C >= 0 && z.C <= M.N.CAP + 1e-9)) fail(`${z.id} control ${z.C}`);
      const P = M.fitPolicy(s, z);
      if (P.r + P.m + P.c !== M.pips(s, z)) fail(`${z.id} policy doesn't sum to its pips`);
    }
    for (const o of s.offers) if (!M.zone(s, o.zone)) fail("an offer for no zone");
  };
  const stats = { warAt: null, warDay: null, wonAt: null, wonDay: null, fallen: 0, lockedAtEnd: 0, cash: [], storyTried: 0, storyWon: 0, mindZones: 0,
    boards: [], taken: {}, gaps: {}, firstMk: {}, tiers: [], idleDays: 0 };
  // research: the first marks of what the squad fights with, then the second, then the third; the city's projects underneath
  const ORDER = ["uzi:1", "chest:1", "scanner:1", "legs:1", "longrange:1", "eyes:1", "arms:1", "heart:1", "brain:1", "purrsuader:2", "minigun:1", "laser:1",
    "chest:2", "uzi:2", "legs:2", "scanner:2", "eyes:2", "arms:2", "longrange:2", "minigun:2", "laser:2", "heart:2", "brain:2", "banhammer",
    "chest:3", "minigun:3", "legs:3", "laser:3", "eyes:3", "arms:3", "gauss:1", "scanner:3", "heart:3", "brain:3", "gauss:2", "gauss:3"];
  const CITY = strategy === "mind" ? ["propaganda", "mindcontrol", "overseers", "works"] : ["overseers", "works"];
  const reserve = () => M.PRICE.recruit + 20000;
  // the board as a player sees it, before choosing
  const look = () => {
    const ord = s.offers.filter(o => M.ORDINARY.includes(o.kind) && !o.fallback), kinds = ord.map(o => o.kind);
    stats.boards.push({ war: s.war, n: s.offers.length, ordinary: ord.length, twice: new Set(kinds).size < kinds.length,
      training: s.offers.some(o => M.KINDS[o.kind].quiet && o.threat <= 2), fresh: s.offers.some(o => o.threat <= 1 || (M.KINDS[o.kind].quiet && o.threat <= 2)) });
  };
  for (let i = 0; i < N && !s.won; i++) {
    // research: one weapon, mod or gear project on top; city projects underneath
    const avail = M.available(s), running = s.research.running;
    if (!running.some(p => !["works", "requisition", "overseers", "propaganda", "mindcontrol"].includes(p.id))) {
      const counter = avail.find(a => a.kind === "counter");
      const next = counter || ORDER.map(id => avail.find(a => a.id === id)).find(Boolean) || avail.find(a => a.kind !== "city" && a.kind !== "counter");
      if (next && !M.canStart(s, next)) M.start(s, next);
    }
    if (!running.some(p => CITY.includes(p.id)) && s.cash > 150000) {
      const prod = CITY.map(id => avail.find(a => a.id === id)).find(Boolean);
      if (prod && s.cash - prod.cost[0] > 60000) M.start(s, prod);
    }
    for (const p of s.research.done) if (!stats.firstMk[p.slice(-1)] && /:\d$/.test(p) && !M.START_DONE.includes(p)) stats.firstMk[p.slice(-1)] = i + 1;
    // zone works: where they lift a zone over the wall soonest (base 2 first)
    while (s.research.worksReady > 0) M.placeWorks(s, s.zones.filter(z => !z.lost).sort((a, b) => M.zoneDef(a.id).base + a.works - M.zoneDef(b.id).base - b.works)[0]);
    // the squad: fill it from the reserve, then with recruits; arm it, mod it
    for (const a of s.roster) if (!a.deployed && M.squad(s).length < M.SQUAD) a.deployed = true;
    while (M.squad(s).length < M.SQUAD && !M.canHire(s) && s.cash >= M.PRICE.recruit + 5000) M.hire(s);
    // what's on the racks: the best of it handed out where it adds to a Watcher, the rest sold
    for (const row of M.armoury(s)) {
      if (!row.count || row.type === "medikit" || row.type === "banhammer") continue;
      for (const a of M.squad(s)) {
        if (!s.armoury[row.key] || M.canIssue(s, a, row.key)) continue;
        const now = M.agentPower(a), have = a.items.find(x => x.type === row.type);
        const next = M.agentPower(Object.assign({}, a, { items: a.items.filter(x => x.type !== row.type).concat([{ type: row.type, mk: row.mk }]) }));
        if (next > now + 0.01 && (!have || (have.mk || 1) < row.mk)) M.issue(s, a, row.key);
      }
      while (s.armoury[row.key]) M.armSell(s, row.key);
    }
    // one Purrsuader in the squad, for the jobs that need talking
    if (!M.hasTalker(s) && M.squad(s).length) { const a = M.squad(s)[0], it = M.shop(s, a).find(x => x.type === "purrsuader"); if (it && !M.canBuy(s, a, it)) M.buy(s, a, it); }
    for (const a of M.squad(s)) {
      // the gun that adds most to this Watcher's power, one at a time, while it's affordable: a rack of every gun is money thrown away
      for (;;) {
        const now = M.agentPower(a), gain = it => M.agentPower(Object.assign({}, a, { items: a.items.filter(x => x.type !== it.type).concat([{ type: it.type, mk: it.mk }]) })) - now;
        const it = M.shop(s, a).filter(x => x.mk && x.type !== "purrsuader" && !M.canBuy(s, a, x) && s.cash - x.price > reserve() && gain(x) > 0.01).sort((p, q) => gain(q) / q.price - gain(p) / p.price)[0];
        if (!it) break;
        M.buy(s, a, it);
      }
      const med = M.shop(s, a).find(x => x.type === "medikit");
      while ((a.items.find(x => x.type === "medikit") || { count: 0 }).count < 2 && !M.canBuy(s, a, med) && s.cash > reserve()) M.buy(s, a, med);
    }
    // mods: the cheapest step first, over the whole squad, while there's money over a recruit's reserve
    for (;;) {
      const steps = M.squad(s).flatMap(a => W.MODS.map(m => [a, m.id, (a.mods[m.id] || 0) + 1])).filter(([a, part]) => !M.canInstall(s, a, part));
      steps.sort((p, q) => p[2] - q[2]);
      const st = steps[0];
      if (!st || s.cash - M.PRICE.mod[st[2]] < reserve()) break;
      M.install(s, st[0], st[1]);
    }
    if (!M.canUpgradeScanner(s) && s.cash - M.PRICE.scanner[s.scannerMk + 1] > reserve()) M.upgradeScanner(s);
    // mind control: roll it out everywhere it can be afforded
    if (strategy === "mind") for (const e of [M.EVENTS.find(x => x.id === "mindcontrol"), M.EVENTS.find(x => x.id === "propaganda")]) for (const z of s.zones) if (!M.canEvent(s, e, z) && s.cash - e.price > 50000) M.event(s, e, z);
    stats.mindZones = s.zones.filter(z => z.floor === 2).length;
    // Take Control: once the squad is ready (tier 3, or 40 points); eager gives the order the moment it can
    if (s.warReady && !s.war && (strategy === "eager" || M.squadTier(s) >= 3 || s.research.points >= 40)) M.declareWar(s);
    // policy: hold every zone, climb the weak ones a little; at war, everything on control where a story step waits on control
    for (const z of s.zones) {
      if (z.lost || z.locked) continue;
      const p = M.pips(s, z), L = M.level(z.C), need = s.war && z.story < M.STORY.length ? M.STORY[z.story].needs : 0;
      const short = need > z.C, climb = short || (strategy === "turtle" ? L < 3 : L < 2);
      M.setDial(s, z, Math.min(p, M.holdPips(s, z) + (climb ? (short ? 99 : 1) : 0)));
      // a festival to get a zone over the lockdown's mark, if that's all it's short of
      if (short && need - z.C < 0.6 && !z.festival && s.cash > 80000) M.event(s, M.EVENTS.find(e => e.id === "festival"), z);
    }
    // at war the tree is nearly done and the squad needs paying for: money first
    // a player with money in the bank and nothing to spend it on turns the city to research
    const bal = opt.balance != null ? opt.balance : (strategy === "turtle" ? 0.7 : 0.5) + (s.cash > 400000 ? 0.4 : s.cash > 200000 ? 0.2 : 0);
    M.setBalance(s, s.war ? Math.min(bal, s.cash > 400000 ? 0.6 : 0.2) : Math.min(1, bal));
      // a BanHammer strike for a siege or a lockdown that's at or over the squad's tier: a careful player doesn't storm those without one
    if (!M.carriesBanhammer(s) && M.isDone(s, "banhammer") && s.cash > M.PRICE.banhammer + (s.war ? 40000 : 150000) && s.offers.some(o => M.bigGun(o) && !M.canRun(s, o) && o.threat >= M.squadTier(s) - 1)) {
      const a = M.squad(s)[0], it = M.shop(s, a).find(x => x.type === "banhammer");
      if (it && !M.canBuy(s, a, it)) M.buy(s, a, it);
    }
    look();
    if (opt.onBoard) opt.onBoard(s);
    // the mission: the most it's worth a day, for the risk
    const level = () => M.squadTier(s) - 1 + (s.hired ? 0 : 0);
    const ways = o => ["assault", "stealth"].concat(M.hasTalker(s) ? ["mob"] : [], level() >= 1 ? ["snipe"] : [], M.bigGun(o) && M.carriesBanhammer(s) ? ["banhammer"] : []);
    const worthOfSquad = M.squad(s).reduce((t, a) => t + M.worth(a), 0) / Math.max(1, M.squad(s).length);
    const value = o => {
      const R = M.reward(s, o), z = M.zone(s, o.zone);
      let v = (R.money || 0) + (R.control || 0) * CV + (R.rp || 0) * RPV + (R.reveal ? 5000 : 0) + (R.untactic ? 0.4 * CV : 0);
      if (R.perContract) v += 3 * (R.perContract.money + R.perContract.control * CV);
      // a push is answered with pips or with this: worth the pips it would take to hold the zone through it,
      // and the control it would cost where pips can't hold it
      if (R.endPush) {
        const extra = Math.max(0, M.holdPips(s, z) - M.holdPips(s, z, true)), room = Math.max(0, M.pips(s, z) - M.holdPips(s, z, true));
        const held = Math.min(extra, room), short = extra > room ? (extra - room) * M.gainOf(s, z) : 0;
        v += s.cal.left * (held * M.yieldOf(z) * M.N.PIP_MONEY + short * CV);
      }
      // a zone back; taking control, a lost zone stands between the squad and the end
      if (R.retake) v += 250000 + (s.war ? 900000 : 0);
      // a story step brings the end closer; Cal's last stand is the end
      if (R.story) v += M.lastStand(s, z, o.step) ? 3000000 : 500000 * (o.step + 1);
      return v;
    };
    const ev = o => {
      const [won, lost, done, , loot] = odds(engineKind(o), M.squadTier(s, o) - 1, o.threat, ways(o), careful);
      const side = M.contractPay(s, o), sideV = o.kind === "sweep" ? 0 : done * (side.money + side.control * CV);
      return { won, lost, e: (won * value(o) + sideV + loot - (1 - won) * 0.3 * CV - lost * worthOfSquad) / (o.days || 4) };
    };
    const cands = s.offers.filter(o => !M.canRun(s, o)).map(o => Object.assign({ o }, ev(o)))
      // never short-handed into what's likely to cost more than one
      .filter(c => !(M.squad(s).length < M.SQUAD && c.lost > 1))
      .sort((a, b) => (strategy === "mind" && (b.o.kind === "story") - (a.o.kind === "story")) || b.e - a.e);
    const pick = cands[0];
    if (opt.debug && s.war && i % 5 === 0) console.log(`  [${i}] ` + cands.map(c => `${c.o.kind}${c.o.kind === "story" ? c.o.step : ""}@${c.o.zone} t${c.o.threat} w${c.won.toFixed(2)} l${c.lost.toFixed(2)} e${Math.round(c.e / 1000)}k`).join(" | ") + `  || not runnable: ${s.offers.filter(o => M.canRun(s, o)).map(o => `${o.kind}@${o.zone}: ${M.canRun(s, o)}`).join("; ")}`);
    if (!pick || pick.e <= 0) { M.advanceDay(s); stats.idleDays++; check(); i--; if (stats.idleDays > 2000) fail("stuck waiting"); continue; }
    const offer = pick.o;
    // a stretch: hire guns if there's money for it
    if (offer.threat > M.squadTier(s, offer) && !s.hired && s.cash > 120000) M.event(s, M.EVENTS.find(e => e.id === "hired"));
    const tierNow = M.squadTier(s, offer);
    let res;
    if (fight) {
      const L = M.missionFor(s, offer);
      const out = run(W, i, false, true, false, M.missionRoster(s), L);
      res = { won: out.status === "won", persuaded: out.world.stats.persuaded || 0, turned: out.world.stats.turned || 0, civKilled: out.world.stats.civ || 0, contracts: (out.world.contracts || []).map(c => ({ id: c.id, weight: c.weight, done: c.done })), agents: out.world.agents.map(a => ({ id: a.rosterId, alive: a.alive, kills: a.kills || 0, items: a.weapons.map(x => ({ type: x.type, ammo: x.ammo, mk: x.mk })) })) };
    } else {
      const [pw, deaths, done, offered, loot] = odds(engineKind(offer), M.squadTier(s, offer) - 1, offer.threat, ways(offer), careful), sq = M.squad(s);
      const won = rand() < pw;
      // a careful player calls a BanHammer strike down on the siege or lockdown it's carried for, and nowhere else
      const fire = M.bigGun(offer) && sq.find(a => a.items.some(x => x.type === "banhammer"));
      const n = Math.round(offered), d = Math.min(n, Math.floor(done + rand()));
      res = { won, contracts: Array.from({ length: n }, (_, k) => ({ id: k, weight: 1, done: k < d })),
        agents: sq.map(a => ({ id: a.id, alive: rand() >= deaths / sq.length, kills: 3, items: a.items.map(x => ({ type: x.type, mk: x.mk, ammo: x.type === "banhammer" && a === fire ? (x.count || 1) - 1 : x.count })) })) };
      // what they bring home, sold: the bench counts it at what it fetches
      if (res.agents.some(a => a.alive)) s.cash += Math.round(loot * (0.5 + rand()));
    }
    if (offer.kind === "story") { stats.storyTried++; if (res.won) stats.storyWon++; }
    const dead = res.agents.filter(a => !a.alive).length;
    stats.fallen += dead;
    stats.taken[offer.kind] = (stats.taken[offer.kind] || 0) + 1;
    const gap = offer.threat - tierNow, G = stats.gaps[gap] = stats.gaps[gap] || [0, 0, 0];
    G[0]++; G[1] += dead; G[2] += res.won ? 1 : 0;
    stats.tiers.push(tierNow);
    M.settle(s, offer, res);
    check();
    for (let d = 0; d < idle && !s.won; d++) { M.advanceDay(s); check(); }
    if (s.war && stats.warAt == null) { stats.warAt = i + 1; stats.warDay = s.day; }
    if (s.won && stats.wonAt == null) { stats.wonAt = i + 1; stats.wonDay = s.day; }
    if ((i + 1) % 10 === 0) stats.cash.push(Math.round(s.cash));
    log(`day ${String(s.day).padStart(3)}  ${(res.won ? "won " : "LOST")} t${offer.threat}/${tierNow} x${res.agents.length} ${M.KINDS[offer.kind].name.padEnd(14)} ${M.zoneDef(offer.zone).name.padEnd(24)} cash ${W.money(s.cash).padStart(10)}  pts ${String(s.research.points).padStart(2)}${s.war ? " TC " : "    "}  levels ${s.zones.map(z => z.locked ? "X" : z.lost ? "-" : M.level(z.C)).join("")}  board ${String(s.offers.length).padStart(2)}  roster ${s.roster.length}`);
  }
  stats.missions = s.stats.missions; stats.won = s.stats.won; stats.day = s.day; stats.points = s.research.points;
  stats.lockedAtEnd = s.zones.filter(z => z.locked).length; stats.lostAtEnd = s.zones.filter(z => z.lost).length; stats.win = !!s.won;
  stats.s = s;
  return stats;
}
module.exports = { play, odds };

/* ---------------- --report: a dozen campaigns against the targets ---------------- */
function report(opt) {
  const runs = [];
  for (let k = 1; k <= opt.seeds; k++) {
    try { runs.push(play(Object.assign({}, opt, { seed: k * 7 + 1 }))); }
    catch (e) { console.log(`seed ${k * 7 + 1}: FAIL ${e.message}`); }
  }
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN, pct = (a, f) => Math.round(100 * a.filter(f).length / Math.max(1, a.length));
  const B = runs.flatMap(r => r.boards), peace = B.filter(b => !b.war), war = B.filter(b => b.war);
  const missions = runs.reduce((t, r) => t + r.missions, 0), fallen = runs.reduce((t, r) => t + r.fallen, 0);
  const gaps = {}; for (const r of runs) for (const [g, v] of Object.entries(r.gaps)) { const G = gaps[g] = gaps[g] || [0, 0, 0]; v.forEach((x, i) => G[i] += x); }
  const taken = {}; for (const r of runs) for (const [k, n] of Object.entries(r.taken)) taken[k] = (taken[k] || 0) + n;
  const atTier = Object.entries(gaps).filter(([g]) => +g <= 0).reduce((t, [, v]) => [t[0] + v[0], t[1] + v[1]], [0, 0]);
  const wins = runs.filter(r => r.win), cashEnd = mean(runs.map(r => r.s.cash));
  const row = (name, val, target, ok) => console.log(`${(ok == null ? "    " : ok ? "ok  " : "MISS")}  ${name.padEnd(46)} ${String(val).padEnd(22)} ${target}`);
  console.log(`${runs.length} campaigns, ${opt.missions} missions at most, ${opt.harsh ? "raw" : "careful"}${opt.idle ? `, ${opt.idle} idle days a mission` : ""}${opt.strategy ? `, ${opt.strategy}` : ""}; fights from tools/fights.json (${FIGHTS.measured})\n`);
  row("Offers on the board before Take Control", `${mean(peace.map(b => b.n)).toFixed(1)} avg, ${Math.max(...peace.map(b => b.n))} most`, "5 to 7 / 9", mean(peace.map(b => b.n)) >= 4 && mean(peace.map(b => b.n)) <= 7.5 && Math.max(...peace.map(b => b.n)) <= 10);
  row("Offers on the board, taking control", war.length ? `${mean(war.map(b => b.n)).toFixed(1)} avg, ${Math.max(...war.map(b => b.n))} most` : "-", "9 or fewer", !war.length || mean(war.map(b => b.n)) <= 9);
  row("Boards with a quiet job at threat 2 or less", `${pct(B, b => b.training)}%`, "100%", pct(B, b => b.training) === 100);
  row("Boards a fresh squad can win something on", `${pct(B, b => b.fresh)}%`, "100%", pct(B, b => b.fresh) === 100);
  row("Same kind twice among the ordinary offers", `${pct(B, b => b.twice)}%`, "under 10%", pct(B, b => b.twice) < 10);
  const kinds = Object.entries(taken).sort((a, b) => b[1] - a[1]);
  row("Kinds taken", kinds.map(([k, n]) => `${k} ${Math.round(100 * n / missions)}%`).join(", "), "", null);
  const ordinaryLow = ["persuade", "intel", "job", "crackdown", "assassinate", "sweep"].filter(k => (taken[k] || 0) / missions < 0.05);
  row("Ordinary kinds taken under 5% of missions", ordinaryLow.join(", ") || "none", "none", !ordinaryLow.length);
  row("Watchers lost per mission at or under the tier", (atTier[1] / Math.max(1, atTier[0])).toFixed(2), "0.15 to 0.3", null);
  row("Watchers lost per mission, all", (fallen / missions).toFixed(2), "", null);
  console.log("      by threat minus tier:  " + Object.keys(gaps).map(Number).sort((a, b) => a - b).map(g => `${g > 0 ? "+" : ""}${g}: ${gaps[g][0]} taken, ${(gaps[g][2] / gaps[g][0] * 100).toFixed(0)}% won, ${(gaps[g][1] / gaps[g][0]).toFixed(2)} lost`).join(" · "));
  row("Cash at the end", `$${Math.round(cashEnd / 1000)}k avg, $${Math.round(Math.max(...runs.map(r => r.s.cash)) / 1000)}k most`, opt.harsh ? "" : "under $1M", opt.harsh ? null : cashEnd < 1e6);
  const curve = []; for (let k = 0; k < 20; k++) { const c = runs.map(r => r.cash[k]).filter(x => x != null); if (c.length >= runs.length / 2) curve.push(`${(k + 1) * 10}: $${Math.round(mean(c) / 1000)}k`); }
  console.log(`      cash by mission:  ${curve.join(" · ")}`);
  const tierCurve = []; for (let k = 0; k < 200; k += 20) { const t = runs.map(r => r.tiers[k]).filter(x => x != null); if (t.length >= runs.length / 2) tierCurve.push(`${k + 1}: ${mean(t).toFixed(1)}`); }
  console.log(`      squad tier by mission:  ${tierCurve.join(" · ")}`);
  console.log(`      first MK2 done at mission ${mean(runs.map(r => r.firstMk[2]).filter(Boolean)).toFixed(0)}, first MK3 at ${mean(runs.map(r => r.firstMk[3]).filter(Boolean)).toFixed(0)}; idle days ${mean(runs.map(r => r.idleDays)).toFixed(0)} a campaign`);
  const warAt = runs.filter(r => r.warAt).map(r => r.warAt), wonAt = wins.map(r => r.wonAt);
  row("Take Control at mission / won at mission", `${mean(warAt).toFixed(0)} / ${wins.length ? mean(wonAt).toFixed(0) : "-"} (day ${mean(runs.filter(r => r.warAt).map(r => r.warDay)).toFixed(0)} / ${wins.length ? mean(wins.map(r => r.wonDay)).toFixed(0) : "-"})`, "55 to 65 / 90 to 110",
    opt.harsh ? null : mean(warAt) >= 50 && mean(warAt) <= 70 && wins.length && mean(wonAt) >= 85 && mean(wonAt) <= 115);
  row("Campaigns won", `${wins.length} of ${runs.length}${runs.some(r => !r.win) ? `; the rest ended with ${runs.filter(r => !r.win).map(r => `${r.lockedAtEnd} locked, ${r.lostAtEnd} lost`).join("; ")}` : ""}`, opt.harsh ? "8 of 12 by about mission 140" : "all", opt.harsh ? wins.length >= runs.length * 2 / 3 : wins.length === runs.length);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const val = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a && a.split("=")[1]; };
  const quiet = args.includes("--quiet"), fight = args.includes("--fight"), harsh = args.includes("--harsh");
  const seed = +(val("seed") || 1), strategy = val("strategy") || "baseline", idle = +(val("idle") || 0);
  if (args.includes("--report")) { report({ seeds: +(val("seeds") || 12), missions: +(val("missions") || 200), harsh, idle, strategy }); return; }
  const N = +(args.find(a => /^\d+$/.test(a)) || 60);
  try {
    const st = play({ seed, missions: N, fight, strategy, harsh, idle, debug: args.includes("--debug"), log: quiet ? null : console.log });
    const s = st.s;
    console.log(`${st.missions} missions, ${st.won} won, day ${st.day}; research ${st.points} points${s.war ? `, taking control since mission ${st.warAt}` : ""}; zones ${s.zones.map(z => `${z.id}:${z.locked ? "locked" : z.lost ? "lost" : W_level(z.C)}`).join(" ")}; fallen ${st.fallen}${st.win ? `; WON at mission ${st.wonAt}` : ""}`);
  } catch (e) { console.error(`FAIL ${e.message}`); if (process.env.STACK) console.error(e.stack); process.exit(1); }
}
function W_level(C) { return C <= 0 ? -1 : Math.min(3, Math.floor(C)); }
