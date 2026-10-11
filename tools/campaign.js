#!/usr/bin/env node
/* A headless campaign: a bot plays the meta-game (js/campaign/meta.js) from a
 * fresh start. It keeps research running (a weapon, mod or gear project on top,
 * production underneath), kits out the squad, and takes the mission that
 * matters most within the squad's reach (threat no more than a step over its
 * tier): a siege, Cal's crew, a story step, then whatever the weakest zone
 * offers. At war it puts every pip on control where a story step waits on the
 * zone's level. Never goes out short-handed while there's a Watcher in reserve
 * or cash for a recruit. Checks the campaign's invariants after every mission.
 *
 *   node tools/campaign.js [missions=60] [--fight] [--quiet] [--seed=N] [--strategy=S]
 *
 * By default a mission's outcome is rolled against the gap between its threat
 * and the squad's tier, set from real fights in the engine (a squad at its
 * tier wins 19 in 20 and loses a Watcher about one mission in five; a step
 * over, about one a mission; two over, it wins half and loses two or three).
 * Those are the engine's test bot, which walks straight in; by default the
 * bot assumes a careful player who loses half as many (--harsh for the raw
 * rates). --fight plays each one out in the mission engine. The bot declares war once
 * the squad is tier 3, or at 40 upgrade points. Strategies: baseline, turtle,
 * mind (propaganda and mind control everywhere, story first), eager (war the
 * moment it's ready, as a first-timer might).
 *
 * As a module: require("./campaign.js").play({ seed, missions, fight, strategy }) */
"use strict";
const { load, run } = require("./sim.js");

// the rolled fight: by threat minus tier, the chance to win and the Watchers lost on average
const ROLL = { "-2": [0.99, 0], "-1": [0.98, 0.03], 0: [0.95, 0.2], 1: [0.88, 1.0], 2: [0.5, 2.4], 3: [0.15, 3.2] };
// the engine's test bot walks straight in; a careful player (cover, the Purrsuader, medikits) loses about half as many
const CAREFUL = 0.5;

function play(opt = {}) {
  const W = opt.W || load(), M = W.M;
  const N = opt.missions || 60, fight = !!opt.fight, strategy = opt.strategy || "baseline", seed = opt.seed || 1, deathScale = opt.harsh ? 1 : CAREFUL;
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
  const stats = { warAt: null, warDay: null, wonAt: null, wonDay: null, fallen: 0, lockedAtEnd: 0, cash: [], storyTried: 0, storyWon: 0, mindZones: 0 };
  const ORDER = ["uzi:1", "chest:1", "scanner:1", "legs:1", "longrange:1", "eyes:1", "purrsuader:2", "arms:1", "minigun:1", "chest:2", "laser:1", "scanner:2", "banhammer", "heart:1", "brain:1"];
  const CITY = strategy === "mind" ? ["propaganda", "mindcontrol", "overseers", "works"] : ["overseers", "works"];
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
    // zone works: where they lift a zone over the wall soonest (base 2 first)
    while (s.research.worksReady > 0) M.placeWorks(s, s.zones.filter(z => !z.lost).sort((a, b) => M.zoneDef(a.id).base + a.works - M.zoneDef(b.id).base - b.works)[0]);
    // the squad: fill it from the reserve, then with recruits; arm it, mod it
    for (const a of s.roster) if (!a.deployed && M.squad(s).length < M.SQUAD) a.deployed = true;
    while (M.squad(s).length < M.SQUAD && !M.canHire(s) && s.cash >= M.PRICE.recruit + 5000) M.hire(s);
    for (const a of M.squad(s)) {
      const shop = M.shop(s, a), best = {};
      for (const it of shop) if (it.mk && (!best[it.type] || it.mk > best[it.type].mk)) best[it.type] = it;
      for (const it of Object.values(best)) if (!M.canBuy(s, a, it) && s.cash - it.price > 40000) M.buy(s, a, it);
      const med = M.shop(s, a).find(x => x.type === "medikit");
      if (!a.items.some(x => x.type === "medikit") && !M.canBuy(s, a, med)) M.buy(s, a, med);
      for (const part of ["chest", "legs", "eyes", "arms"]) if (!M.canInstall(s, a, part) && s.cash > 80000) M.install(s, a, part);
    }
    // mind control: roll it out everywhere it can be afforded
    if (strategy === "mind") for (const e of [M.EVENTS.find(x => x.id === "mindcontrol"), M.EVENTS.find(x => x.id === "propaganda")]) for (const z of s.zones) if (!M.canEvent(s, e, z) && s.cash - e.price > 50000) M.event(s, e, z);
    stats.mindZones = s.zones.filter(z => z.floor === 2).length;
    // war: declared once the squad is ready (tier 3, or 40 points); eager declares the moment it can
    if (s.warReady && !s.war && (strategy === "eager" || M.squadTier(s) >= 3)) M.declareWar(s);
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
    const bal = opt.balance != null ? opt.balance : strategy === "turtle" ? 0.7 : 0.5;
    M.setBalance(s, s.war ? Math.min(bal, 0.2) : bal);
    // the mission: within reach first, then by what matters; story first under the mind strategy
    M.liveThreats(s);
    const tier = M.squadTier(s), short = M.squad(s).length < M.SQUAD;
    // a stretch (a step over the tier) only for what can't wait: Cal, a siege, a story step; and never short-handed
    const urgent = o => o.kind === "cal" || o.kind === "siege" || o.kind === "story";
    const reach = o => o.threat <= M.squadTier(s, o) + (short || !urgent(o) ? 0 : 1);
    // at war, a BanHammer strike for the siege or lockdown that's out of reach without one
    if (s.war && !M.carriesBanhammer(s) && M.isDone(s, "banhammer") && s.cash > M.PRICE.banhammer + 40000 && s.offers.some(o => M.bigGun(o) && !M.canRun(s, o) && o.threat > M.squadTier(s, o) + 1)) {
      const a = M.squad(s)[0], it = M.shop(s, a).find(x => x.type === "banhammer");
      if (it && !M.canBuy(s, a, it)) M.buy(s, a, it);
    }
    const order = o => strategy === "mind" ? (o.kind === "story" ? 0 : o.kind === "siege" ? 1 : o.kind === "cal" ? 2 : 3) : (o.kind === "siege" ? 0 : o.kind === "cal" ? 1 : o.kind === "story" ? 2 : 3);
    const pri = o => (reach(o) ? 0 : 1000 + o.threat * 100) + order(o) * 10 + Math.max(0, M.level(M.zone(s, o.zone).C));
    const offer = s.offers.filter(o => !M.canRun(s, o)).sort((a, b) => pri(a) - pri(b))[0];
    if (!offer) { M.advanceDay(s); check(); continue; }
    // a stretch: hire guns if there's money for it
    if (offer.threat > tier && !s.hired && s.cash > 120000) M.event(s, M.EVENTS.find(e => e.id === "hired"));
    const tierNow = M.squadTier(s, offer);
    let res;
    if (fight) {
      const L = M.missionFor(s, offer);
      const out = run(W, i, false, true, false, M.missionRoster(s), L);
      res = { won: out.status === "won", agents: out.world.agents.map(a => ({ id: a.rosterId, alive: a.alive, kills: a.kills || 0, items: a.weapons.map(x => ({ type: x.type, ammo: x.ammo, mk: x.mk })) })) };
    } else {
      const gap = Math.max(-2, Math.min(3, offer.threat - tierNow)), [pw, deaths] = ROLL[gap], sq = M.squad(s);
      const won = rand() < pw;
      // a careful player calls a BanHammer strike down on the siege or lockdown it's carried for, and nowhere else
      const fire = M.bigGun(offer) && sq.find(a => a.items.some(x => x.type === "banhammer"));
      res = { won, agents: sq.map(a => ({ id: a.id, alive: rand() >= deaths * deathScale / sq.length, kills: 3, items: a.items.map(x => ({ type: x.type, mk: x.mk, ammo: x.type === "banhammer" && a === fire ? (x.count || 1) - 1 : x.count })) })) };
    }
    if (offer.kind === "story") { stats.storyTried++; if (res.won) stats.storyWon++; }
    stats.fallen += res.agents.filter(a => !a.alive).length;
    M.settle(s, offer, res);
    check();
    if (s.war && stats.warAt == null) { stats.warAt = i + 1; stats.warDay = s.day; }
    if (s.won && stats.wonAt == null) { stats.wonAt = i + 1; stats.wonDay = s.day; }
    if ((i + 1) % 10 === 0) stats.cash.push(Math.round(s.cash));
    log(`day ${String(s.day).padStart(3)}  ${(res.won ? "won " : "LOST")} t${offer.threat}/${tierNow} x${res.agents.length} ${M.KINDS[offer.kind].name.padEnd(14)} ${M.zoneDef(offer.zone).name.padEnd(24)} cash ${W.money(s.cash).padStart(10)}  pts ${String(s.research.points).padStart(2)}${s.war ? " WAR" : "    "}  levels ${s.zones.map(z => z.locked ? "X" : z.lost ? "-" : M.level(z.C)).join("")}  roster ${s.roster.length}`);
  }
  stats.missions = s.stats.missions; stats.won = s.stats.won; stats.day = s.day; stats.points = s.research.points;
  stats.lockedAtEnd = s.zones.filter(z => z.locked).length; stats.lostAtEnd = s.zones.filter(z => z.lost).length; stats.win = !!s.won;
  stats.s = s;
  return stats;
}
module.exports = { play };

if (require.main === module) {
  const args = process.argv.slice(2);
  const N = +(args.find(a => /^\d+$/.test(a)) || 60);
  const quiet = args.includes("--quiet"), fight = args.includes("--fight"), harsh = args.includes("--harsh");
  const val = k => { const a = args.find(x => x.startsWith(`--${k}=`)); return a && a.split("=")[1]; };
  const seed = +(val("seed") || 1), strategy = val("strategy") || "baseline";
  try {
    const st = play({ seed, missions: N, fight, strategy, harsh, log: quiet ? null : console.log });
    const s = st.s;
    console.log(`${st.missions} missions, ${st.won} won, day ${st.day}; research ${st.points} points${s.war ? `, at war since mission ${st.warAt}` : ""}; zones ${s.zones.map(z => `${z.id}:${z.locked ? "locked" : z.lost ? "lost" : st.s.zones && W_level(z.C)}`).join(" ")}; fallen ${st.fallen}${st.win ? `; WON at mission ${st.wonAt}` : ""}`);
  } catch (e) { console.error(`FAIL ${e.message}`); process.exit(1); }
}
function W_level(C) { return C <= 0 ? -1 : Math.min(3, Math.floor(C)); }
