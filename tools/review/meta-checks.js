#!/usr/bin/env node
/* Review checks against the campaign rules (js/campaign/meta.js), run headless.
 * Each check sets up a campaign state by hand, does one thing a player can do,
 * and prints what the rules did with it. Nothing here is a bot: these are the
 * specific situations the 2026-10-12 review suspected from reading the code.
 *
 *   node tools/review/meta-checks.js
 */
"use strict";
const { load } = require("../sim.js");
const W = load(), M = W.M;

const out = [];
const say = (id, verdict, text) => { out.push([id, verdict, text]); console.log(`${verdict.padEnd(9)} ${id}: ${text}`); };
const fresh = seed => { const s = M.fresh(seed); s.cash = 10_000_000; return s; };
const won = (s, ids) => ({ won: true, agents: M.squad(s).map(a => ({ id: a.id, alive: true, kills: 0, items: a.items.map(x => ({ type: x.type, mk: x.mk, ammo: x.count })) })), contracts: [] });

/* 1. An amnesty brings a lost zone back, but the siege offer for it stays on the board.
 *    Running that stale siege resets the zone's control to 0.6. */
{
  const s = fresh(11);
  const z = M.zone(s, "ranch");                       // starts lost
  const siege = s.offers.find(o => o.kind === "siege" && o.zone === "ranch");
  const amnesty = M.EVENTS.find(e => e.id === "amnesty");
  const ok = M.event(s, amnesty, z);
  M.refreshOffers(s);
  const still = s.offers.find(o => o.kind === "siege" && o.zone === "ranch");
  // the player then builds the zone up over a fortnight
  M.setDial(s, z, 99);
  for (let d = 0; d < 14; d++) M.advanceDay(s);
  const before = z.C, lvl = M.level(z.C);
  const runnable = still && !M.canRun(s, still);
  if (runnable) M.settle(s, still, won(s));
  say("amnesty-stale-siege", still && runnable && z.C < before ? "VERIFIED" : "CLEAR",
    `amnesty ${ok ? "bought" : "refused"}; siege offer still on the board: ${!!still}; runnable: ${!!runnable}; control before the stale siege ${before.toFixed(2)} (level ${lvl}), after ${z.C.toFixed(2)} (level ${M.level(z.C)})`);
}

/* 2. A zone that is lost while an offer stands keeps the offer. Ordinary jobs and story
 *    steps can then be run in a zone Cal holds, at the threat they were rolled at. */
{
  const s = fresh(5);
  const z = M.zone(s, "expo");                         // starts at 0.6: close to lost
  const before = s.offers.filter(o => o.zone === "expo" && o.kind !== "siege").map(o => `${o.kind} T${o.threat}`);
  z.C = 0.01; M.setDial(s, z, 0);                      // the player taxes it to nothing
  s.cal.zone = "expo"; s.cal.left = 3;                 // and Cal pushes it
  M.advanceDay(s);
  const after = s.offers.filter(o => o.zone === "expo" && o.kind !== "siege" && o.kind !== "cal");
  const run = after.filter(o => !M.canRun(s, o));
  say("offers-survive-zone-loss", z.lost && run.length ? "VERIFIED" : "CLEAR",
    `Expo lost: ${z.lost}; offers there before: [${before.join(", ")}]; non-siege offers still up: ${after.length}; runnable in the lost zone: ${run.map(o => `${o.kind} T${o.threat} (mission says ${JSON.stringify({ zoneLevel: M.missionFor(s, o).mission.zoneLevel, cal: M.missionFor(s, o).mission.cal })})`).join("; ") || "none"}`);
}

/* 2b. The same with a story step once the city is being taken: step 1 can be run in a lost zone. */
{
  const s = fresh(5);
  s.research.points = 30; M.declareWar(s);
  const story = s.offers.find(o => o.kind === "story" && o.step === 0 && M.zoneDef(o.zone).base === 3), z = M.zone(s, story.zone);
  z.C = 0.01; M.setDial(s, z, 0); s.cal.zone = z.id; s.cal.left = 3;
  M.advanceDay(s);
  const still = s.offers.find(o => o.kind === "story" && o.zone === z.id);
  const runnable = still && !M.canRun(s, still);
  if (runnable) M.settle(s, still, won(s));
  say("story-step-in-lost-zone", z.lost && runnable ? "VERIFIED" : "CLEAR",
    `story offer before the loss: ${!!story} (${z.id}); zone lost: ${z.lost}; story offer still up: ${!!still}; runnable: ${!!runnable}; story progress after running it in a lost zone: ${z.story}`);
}

/* 3. A pip on control buys 1.0 at level 0 and 0.3 to 0.35 at levels 2 and 3, and the
 *    whole day's gain is priced at the level the zone STARTS the day on. So a base-3 zone
 *    at 0.99 with every pip on control jumps past the wall in one day. */
{
  const s = fresh(1);
  const z = M.zone(s, "oldtown");                      // base 3
  const trial = (C0, days) => { z.C = C0; z.lost = false; M.setDial(s, z, 99); const path = [C0]; for (let d = 0; d < days; d++) { M.advanceDay(s); path.push(+z.C.toFixed(2)); } return path; };
  const jump = trial(0.99, 1), climb = trial(1.0, 6), slow = trial(2.0, 6);
  say("level0-control-jump", jump[1] >= 3 ? "VERIFIED" : "CLEAR",
    `base-3 zone, all pips on control: from 0.99 -> ${jump[1]} in ONE day; from 1.00 -> ${climb.slice(1).join(" -> ")}; from 2.00 -> ${slow.slice(1).join(" -> ")}`);
  // and the designed route: hold at level 2 and climb the wall
  const base2 = M.zone(s, "lantern"); base2.C = 0.99; M.setDial(s, base2, 99); M.advanceDay(s);
  say("level0-control-jump-base2", base2.C >= 2 ? "VERIFIED" : "CLEAR", `base-2 zone from 0.99 with all pips on control -> ${base2.C.toFixed(2)} in one day (level ${M.level(base2.C)})`);
}

/* 4. Research points past what a project needs are thrown away, not passed on. */
{
  const s = fresh(1);
  s.research.running = [{ id: "uzi:1", name: "Uzi MK1", left: 1, total: 30 }, { id: "chest:1", name: "Chest MK1", left: 30, total: 30 }];
  M.feedResearch(s, 20);                                // 10 each: the uzi needed 1
  say("research-overflow-wasted", s.research.running[0].left === 20 ? "VERIFIED" : "CLEAR",
    `20 RP into two projects needing 1 and 30: the second has ${s.research.running[0].left} left (passing the overflow on would leave 11)`);
}

/* 5. A persuade's control reward is priced at the zone's level AFTER the days away, not the one shown at the briefing. */
{
  const s = fresh(3);
  const z = M.zone(s, "oldtown"); z.C = 1.95; M.setDial(s, z, 0);
  const o = M.addOffer(s, z, "persuade");
  const shown = M.reward(s, o).control;
  for (const q of s.zones) if (q.id !== "oldtown") M.setDial(s, q, 99);
  o.days = 8;
  M.settle(s, o, won(s));
  const paid = o.days && M.reward(s, o).control;   // what settle used after the days: the zone fell to level 0 meanwhile
  say("persuade-reward-repriced", shown !== paid ? "VERIFIED" : "CLEAR", `briefing showed +${shown} control; after ${o.days} days away the zone was level ${M.level(z.C)} and the formula pays +${paid}`);
}

/* 6. Killing the squad: with no Watchers left Casey sends one free recruit, so the campaign can't be lost by attrition. */
{
  const s = fresh(2);
  const o = s.offers[0];
  M.settle(s, o, { won: false, agents: M.squad(s).map(a => ({ id: a.id, alive: false, kills: 0, items: [] })), contracts: [] });
  say("squad-wipe-free-recruit", s.roster.length === 1 && s.cash > 0 ? "VERIFIED" : "CLEAR", `all four dead: roster now ${s.roster.length} (${s.roster.map(a => a.name).join(", ")}), hired free; cash ${W.money(s.cash)}`);
}

/* 7. Cash: can the player ever be unable to act? With zero cash and no squad, is there always a job? */
{
  const s = fresh(9); s.cash = 0;
  for (let d = 0; d < 20; d++) { M.advanceDay(s); s.cash = 0; }   // broke every day: the city's take is spent as it comes
  const cheap = s.offers.filter(o => o.kind === "job" && o.threat <= 2);
  say("broke-money-job-guarantee", cheap.length ? "VERIFIED" : "CLEAR", `cash 0 for 20 days: ${cheap.length} job(s) at T2 or under on the board (${cheap.map(o => M.zoneDef(o.zone).name).join(", ")})`);
}

/* 8. Fallback offers do not count against the board cap, so the board can carry more than the documented 5 + urgent. */
{
  let most = 0, mostFallback = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = fresh(seed); s.cash = 0;
    for (let d = 0; d < 60; d++) { M.advanceDay(s); most = Math.max(most, s.offers.length); mostFallback = Math.max(mostFallback, s.offers.filter(o => o.fallback).length); }
  }
  say("board-size", "INFO", `20 seeds x 60 idle days, cash 0: most offers on a board ${most}; most fallback (training/money) offers at once ${mostFallback}`);
}

/* 9. Cal's push can take a zone below zero in one day regardless of the pips on it (pips are added after decay is clamped, Cal after that). */
{
  const s = fresh(4);
  const z = M.zone(s, "lantern"); z.C = 0.3; M.setDial(s, z, 99);
  for (const q of s.zones) if (q.lost || q.locked) continue; else if (q.id !== "lantern") q.C = 3.9;   // the city is pacified: Cal pushes hard
  s.cal.zone = "lantern"; s.cal.left = 4;
  const pressure = M.calPressure(s, z), hold = M.holdPips(s, z);
  M.advanceDay(s);
  say("cal-pressure-at-pacified-city", "INFO", `6 zones at level 3: Cal's push adds ${pressure.toFixed(2)} control a day; a base-2 zone at 0.3 needs ${hold} pips to hold and has ${M.pips(s, z)}; after one day it is ${z.lost ? "LOST" : z.C.toFixed(2)}`);
}

/* 10. The Take Control order with a city that can't pay: what does holding cost at war? */
{
  const s = fresh(6); s.research.points = 30; M.declareWar(s);
  const rows = [];
  for (const z of s.zones) { if (z.lost) continue; for (const C of [1.5, 2.5, 3.0, 3.7]) { z.C = C; rows.push(`${z.id}@${C}: hold ${M.holdPips(s, z, true)}/${M.pips(s, z)}`); } }
  say("war-hold-cost", "INFO", rows.join(" · "));
}

/* 11. The fee for calm quiet jobs vs a day's production: is a training job worth the days away? */
{
  const s = fresh(7);
  const towers = M.zone(s, "towers");
  const o = s.offers.find(x => x.zone === "towers") || M.addOffer(s, towers, "intel", { fallback: true });
  const R = M.reward(s, o);
  const take = s.zones.filter(z => !z.lost).reduce((t, z) => { const P = M.fitPolicy(s, z); return t + P.m * M.moneyYield(z) * M.N.PIP_MONEY; }, 0);
  say("training-job-pay", "INFO", `a ${o.kind} in the Towers pays ${JSON.stringify(R)} for ${o.days} days away; the city makes ${W.money(take)} a day in money at the start (default policies)`);
}

/* 12. Does M.forecast agree with what advanceDay does? Rough check across many zone states. */
{
  const s = fresh(8);
  let off = 0, n = 0, worst = "";
  for (const z of s.zones) { if (z.lost) continue; for (const C of [0.5, 1.2, 1.9, 2.4, 2.9, 3.2, 3.6]) for (const c of [0, 1, 2, 3]) {
    z.C = C; M.setDial(s, z, c);
    const f = M.forecast(s, z); if (!f || f.steady) continue;
    const C0 = z.C; let days = 0; const want = f.lost ? -1 : f.to;
    while (days < 60 && (f.lost ? !z.lost : (f.to > M.level(C0) ? M.level(z.C) < want : M.level(z.C) > want) && !z.lost)) { M.advanceDay(s); days++; }
    const err = Math.abs(days - f.days); n++; if (err > 1) { off++; if (!worst || err > +worst.split(" ")[0]) worst = `${err} days off: ${z.id} at ${C0} with ${c} pips, forecast ${f.lost ? "lost" : "level " + f.to} in ${f.days}, took ${days}`; }
    z.lost = false;
  } }
  say("forecast-accuracy", off ? "INFO" : "CLEAR", `${n} forecasts checked against the day loop; ${off} off by more than a day; worst: ${worst || "none"}`);
}

/* 13. The dial is a TAX (pips handed to the city). When a zone climbs a level and gains a pip, fitPolicy
 *     puts the new pip on money, so a zone dialled to "Invest" (tax 0) is quietly taxed 1 from then on. */
{
  const s = fresh(1);
  const z = M.zone(s, "oldtown"); z.C = 1.9; M.setDial(s, z, 99);
  const tax0 = M.pips(s, z) - M.fitPolicy(s, z).c;
  M.advanceDay(s);                                    // crosses to level 2: 5 pips now
  const P = M.fitPolicy(s, z), tax1 = M.pips(s, z) - P.c;
  say("tax-dial-drifts-on-level-up", tax1 !== tax0 ? "VERIFIED" : "CLEAR", `tax set to ${tax0} of 4 pips at level 1; after the climb to level ${M.level(z.C)} (${M.pips(s, z)} pips) the policy is r${P.r} m${P.m} c${P.c}: tax ${tax1}`);
  // and the stall it causes: from 1.0 with "everything on control" set once, where does the zone end up?
  z.C = 1.0; M.setDial(s, z, 99);
  for (let d = 0; d < 20; d++) M.advanceDay(s);
  const stuck = z.C;
  z.C = 1.0; for (let d = 0; d < 20; d++) { M.setDial(s, z, 99); M.advanceDay(s); }
  say("tax-dial-stall", stuck < 3 && z.C >= 3 ? "VERIFIED" : "CLEAR", `base-3 zone from 1.0, tax 0 set once: ${stuck.toFixed(2)} after 20 days; tax re-set to 0 every day: ${z.C.toFixed(2)}`);
}

/* 14. An ending: every zone lost ends the campaign; nothing can be run after it. */
{
  const s = fresh(2);
  for (const z of s.zones) { z.lost = true; z.C = 0; }
  M.advanceDay(s);
  const siege = s.offers.find(o => o.kind === "siege");
  say("city-lost-ending", s.lost && siege && M.canRun(s, siege) ? "VERIFIED" : "CLEAR", `all eight zones lost: s.lost = ${s.lost}; a siege on the board: ${!!siege}; canRun says "${siege && M.canRun(s, siege)}"; the log: "${s.log[0].text}"`);
}

console.log("\n" + out.length + " checks run.");
