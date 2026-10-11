/* The campaign: holding PumaCity for Casey Benton. See docs/meta.md.
 *
 * Eight zones, each with a control level and whole pips of production split
 * every day between research, money and control. Cal pushes one zone at a
 * time. Research costs money to start and research points to finish; points
 * can't be banked. Missions are offered in zones, take days, and pay in
 * research, money or control. After 30 upgrade points the player can send the
 * city to war: decay rises by 30%, Cal commits, and each zone's story chain
 * ends in a lockdown, the last against Cal himself. Lock down every zone to win.
 *
 * Plain data and functions over one JSON state, saved under
 * pcwatchers_campaign_v2. Nothing in here touches the DOM. The numbers are the
 * ones tools/metasim.js was tuned with. */
"use strict";

W.M = {};
const M = W.M;

/* ---------------- the numbers ---------------- */
M.N = {
  CAP: 3.95,
  GAIN: [1.0, 0.6, 0.35, 0.3],          // control bought by a pip on control, by level
  YIELD: [1.0, 1.0, 1.25, 1.5],         // research or money made by a pip, by level
  DECAY: [[0, 0.8], [1, 0.95], [2, 0.95], [2.5, 1.2], [2.9, 1.55], [3, 1.5], [3.3, 1.35], [3.5, 0.5], [3.95, 0.4]],
  CAL: { rest: [3, 6], push: 4, base: 0.4, perPacified: 0.15, tactic: 0.4,
         war: { rest: [2, 4], push: 5, base: 0.6, cornered: 0.1 } },   // at war he commits: shorter rests, longer pushes, and each lockdown corners him
  WAR: 1.3, WAR_AT: 30, INTEL: 0.5,
  PIP_MONEY: 1000,
  TACTIC_GAIN: 0.75,                    // control pips buy this much while one of Cal's tactics stands
  PULL: 0.25,                           // how fast propaganda or mind control draws a zone back up to its floor
  HIRED: 4,                             // a hired crew, in squad power
  BANHAMMER: 6,                         // a BanHammer strike carried, in squad power, for a siege or a lockdown
  PERSUADED: 0.02, CIV_KILLED: 0.03,     // control, per citizen talked round and per civilian killed on a mission, won or lost
  FLOOR_MONEY: [1, 0.85, 0.7],          // what propaganda (1) and mind control (2) leave of a zone's money: people stop spending
};
M.decay = (C, war) => {
  const T = M.N.DECAY, w = war ? M.N.WAR : 1;
  if (C <= T[0][0]) return T[0][1] * w;
  for (let i = 1; i < T.length; i++) if (C <= T[i][0]) { const [x0, y0] = T[i - 1], [x1, y1] = T[i]; return (y0 + (y1 - y0) * (C - x0) / (x1 - x0)) * w; }
  return T[T.length - 1][1] * w;
};
M.level = C => C <= 0 ? -1 : Math.min(3, Math.floor(C));

/* ---------------- the board ---------------- */
M.ZONES = [
  { id: "towers", name: "The Towers", district: "downtown", base: 3, start: 3.95, held: "Benton's own seat",
    areas: ["The Towers", "City Hall", "St. Whiskers Hospital", "PVN Theater", "Club Nine Lives", "PumaCorp"], x: 50, y: 50,
    blurb: "PVN Tower, City Hall, the hospital. Casey Benton's own streets, and her guard on every corner." },
  { id: "oldtown", name: "Old Town and the Market", district: "downtown", base: 3, start: 1.5, held: "street crews",
    areas: ["Old Town", "Market Plaza", "St. Felis Cathedral", "Downtown Precinct", "The Garage"], x: 30, y: 46,
    blurb: "Narrow streets, the cathedral, the precinct, and Market Plaza, where the money changes hands." },
  { id: "lantern", name: "Lantern Row", district: "downtown", base: 2, start: 1.5, held: "street crews",
    areas: ["Lantern Row", "Pounce Park", "Central Station"], x: 42, y: 70,
    blurb: "Central Station, the park, and the bars of Lantern Row." },
  { id: "maple", name: "Maple Heights", district: "suburbs", base: 2, start: 2.5, held: "the Cul-de-Sac Kings",
    areas: ["The Water Tower", "Pounceton College"], x: 30, y: 16,
    blurb: "The water tower, the college, and street after street of Benton's rentals." },
  { id: "juniper", name: "Juniper Hills", district: "suburbs", base: 2, start: 1.5, held: "the Cul-de-Sac Kings",
    areas: ["Main Street", "Pounceton Station", "Whisker Hill Cemetery", "A backyard"], x: 58, y: 18,
    blurb: "Main Street, the station, the cemetery, and the backyards behind it all." },
  { id: "expo", name: "The Expo", district: "convention", base: 3, start: 0.6, held: "the Expo mob",
    areas: null, x: 76, y: 42,
    blurb: "The Convention Center, the arena and Neon Street. A new event every week." },
  { id: "starport", name: "The Starport", district: "starport", base: 3, start: 0.6, held: "the Bay 13 smugglers",
    areas: null, x: 74, y: 74,
    blurb: "The pads, the hangars, the Moonsugar in her cradle, and Skooma coming in cheap." },
  { id: "ranch", name: "The Ranch", district: "ranch", base: 2, start: 0, held: "the Thornback gang",
    areas: null, x: 10, y: 28,
    blurb: "The grow fields, out past the edge of town. Cal's people hold it." },
];
M.zoneDef = id => M.ZONES.find(z => z.id === id);
M.TACTICS = ["a new drug on the streets", "a bought official", "an informer network", "a protection racket", "a pirate radio station", "a gun shop in a back room"];

/* ---------------- research ---------------- */
M.COST = { MK1: [4000, 30], MK2: [12000, 72], MK3: [30000, 136], banhammer: [60000, 160], overseers: [40000, 150], propaganda: [120000, 400], mindcontrol: [250000, 700], works: [100000, 380], requisition: [160000, 580], counter: [5000, 45] };
M.WEAPON_LINES = [
  { id: "pistol", name: "Pistol", start: 1 }, { id: "shotgun", name: "Shotgun", start: 1 }, { id: "uzi", name: "Uzi" },
  { id: "longrange", name: "Longwhisker rifle" }, { id: "minigun", name: "Minigun", needs: "uzi:1" }, { id: "laser", name: "Laser", needs: "longrange:1" },
  { id: "gauss", name: "Gauss Gun", needs: ["minigun:1", "laser:1"] },
];
M.GEAR_LINES = [
  { id: "scanner", name: "Scanner", what: ["a longer reach", "armed people marked apart from unarmed", "people seen through roofs and walls; Cal's gang in red"] },
  { id: "purrsuader", name: "Purrsuader", start: 1, what: ["talks people round", "twice the reach and speed; talks round anyone not already fighting, and the rest with half the crowd", "a bigger following, and they fight better"] },
];
M.catalogue = () => {
  const out = [];
  const marks = (line, kind, name, needs0) => { for (let k = 1; k <= 3; k++) out.push({ id: `${line}:${k}`, line, mk: k, kind, name: `${name} MK${k}`, needs: k > 1 ? [`${line}:${k - 1}`] : [].concat(needs0 || []), cost: M.COST[`MK${k}`], points: k === 3 ? 2 : 1 }); };
  for (const w of M.WEAPON_LINES) marks(w.id, "weapon", w.name, w.needs);
  for (const m of W.MODS) marks(m.id, "mod", m.name);
  for (const g of M.GEAR_LINES) marks(g.id, "gear", g.name);
  out.push({ id: "banhammer", line: "banhammer", mk: 1, kind: "gear", name: "BanHammer Orbital Platform", needs: ["scanner:2"], cost: M.COST.banhammer, points: 2 });
  out.push({ id: "overseers", line: "overseers", kind: "city", name: "Overseers", needs: [], cost: M.COST.overseers, points: 0 });
  // what the Watchers are not proud of: a zone that settles back to level 1, or level 2, on its own
  out.push({ id: "propaganda", line: "propaganda", kind: "city", name: "Propaganda", needs: [], cost: M.COST.propaganda, points: 0 });
  out.push({ id: "mindcontrol", line: "mindcontrol", kind: "city", name: "Mind control", needs: ["propaganda"], cost: M.COST.mindcontrol, points: 0 });
  return out;
};
M.CATALOGUE = M.catalogue();
M.item = id => M.CATALOGUE.find(r => r.id === id);
M.START_DONE = M.CATALOGUE.filter(r => r.mk === 1 && ([...M.WEAPON_LINES, ...M.GEAR_LINES].find(l => l.id === r.line) || {}).start).map(r => r.id);

/* ---------------- prices ---------------- */
M.PRICE = {
  recruit: 45000, medikit: 1000, banhammer: 250000, scanner: [0, 40000, 100000, 240000],
  weapon: [0, 5000, 15000, 40000], purrsuader: [0, 10000, 25000, 60000], mod: [0, 10000, 30000, 75000],
};
M.EVENTS = [
  { id: "festival", name: "A festival", what: "the zone gains 0.75 control over 3 days", price: 12000, zone: true },
  { id: "informants", name: "Informants", what: "shows where Cal will push next, and when", price: 30000 },
  { id: "bribes", name: "Bribes at City Hall", what: "halves Cal's next push", price: 60000 },
  { id: "martial", name: "Martial law", what: "the zone's control can't fall for 3 days, Cal or no Cal", price: 60000, zone: true },
  { id: "hired", name: "Hired guns", what: "a mercenary crew fights beside the squad on its next mission", price: 50000 },
  { id: "amnesty", name: "An amnesty", what: "a lost zone comes back at level 0, without a siege", price: 150000, zone: true, lost: true },
  { id: "propaganda", name: "Propaganda in the zone", what: "PVN on every screen, every hour: the zone won't decay below level 1. People watch more and spend less: 15% less money", price: 50000, zone: true, needs: "propaganda", floor: 1 },
  { id: "mindcontrol", name: "Mind control in the zone", what: "the signal under the broadcasts. People stop wanting to fight. Some stop wanting anything: the zone won\'t decay below level 2, makes 30% less money, and nobody there can be talked round", price: 150000, zone: true, needs: "mindcontrol", floor: 2 },
];
M.ROSTER_MAX = 8;
M.SQUAD = 4;
M.NAMES = ["OCELOT", "SERVAL", "MAINE", "BENGAL", "RAGDOLL", "ABBY", "SIAMESE", "CHARTREUX", "KORAT", "BOMBAY", "SOMALI", "TONKINESE", "BIRMAN", "SAVANNAH", "MAU", "PIXIE", "CORNISH", "HAVANA"];

/* ---------------- missions ---------------- */
/* Mission kinds. `threat` is the kind's base threat (1 to 5); `quiet`
 * missions can be done without a shot fired, and are what a new squad
 * starts on. What each kind asks of the squad on the ground is the mission
 * engine's (see docs/missions.md); here, what it pays and how hard it is. */
M.KINDS = {
  persuade:    { name: "Persuade", threat: 1, quiet: true, days: [3, 4], what: "talk someone round: control in the zone, and a word on Cal" },
  intel:       { name: "Intel", threat: 1, quiet: true, days: [3, 5], what: "get in, get the data, get out: research for the first project running; and where Cal goes next" },
  job:         { name: "Job", threat: 2, days: [3, 6], what: "a robbery, a shakedown, a delivery: money, enough for a real purchase" },
  crackdown:   { name: "Crackdown", threat: 2, days: [4, 7], what: "break up a gang's operation: control in the zone" },
  assassinate: { name: "Assassination", threat: 3, days: [4, 7], what: "a name on Casey Benton's list: money and control" },
  cal:         { name: "Hit Cal's crew", threat: 3, days: [3, 5], what: "ends Cal's push here, and some control back" },
  siege:       { name: "Siege", threat: 4, days: [6, 8], what: "the enemy dug in: takes the zone back" },
  story:       { name: "Story", threat: 3, days: [5, 8], what: "the next step toward locking the zone down" },
};
M.ORDINARY = ["persuade", "intel", "job", "crackdown", "assassinate"];
// what a zone's level leans toward, over M.ORDINARY: calm streets want talking, rough ones fighting
M.MIX = {
  0: [0, 0.1, 0.25, 0.35, 0.3],
  1: [0.1, 0.2, 0.25, 0.25, 0.2],
  2: [0.2, 0.3, 0.25, 0.15, 0.1],
  3: [0.35, 0.35, 0.2, 0.1, 0],
};
M.OFFERS = { "-1": 0, 0: 3, 1: 2, 2: 2, 3: 1 };
/* Threat, 1 to 5: the kind's base, harder where control is low (easier at
 * level 3), and rising with the squad Cal sees in the field (he arms his
 * people to match yours): a step at squad power 18, another at 27; one more
 * at war. A story step: 2, 3 and 4, plus the same step for the squad; Cal's
 * last stand, the final lockdown, is 5. An offer's threat is worked out
 * afresh for the squad that's deployed (M.liveThreats), not frozen when it
 * turned up. */
M.threatStep = s => Math.floor(Math.max(0, M.basePower(s) - 9) / 9);
// Cal's last stand: the lockdown of the last zone he has
M.lastStand = (s, z, step) => step === M.STORY.length - 1 && s.zones.filter(q => !q.locked).length === 1 && !z.locked;
M.threatOf = (s, kind, z, step = 0) => {
  if (kind === "story") return M.lastStand(s, z, step) ? 5 : Math.min(5, 2 + step + M.threatStep(s));
  const L = z.lost ? -1 : M.level(z.C);
  const lvl = L <= 0 ? 1 : L === 3 ? -1 : 0;
  const t = M.KINDS[kind].threat + (kind === "siege" ? 0 : lvl) + M.threatStep(s) + (s.war ? 1 : 0);
  return Math.max(1, Math.min(5, t));
};
/* The enemy at each threat, for the mission engine (L.mod): how many of
 * them, against the district's usual numbers, and what they carry. At
 * threat 1 most are unarmed: lookouts, minders, people who would rather
 * talk; by 5 it's rifles and heavy weapons. `armed` is the share carrying
 * anything; `guns` what the armed ones carry; `armour` multiplies their
 * hit points. */
M.THREAT = {
  1: { crew: 0.35, guards: 0, sec: 1, armed: 0.3, guns: ["pistol"], armour: 1 },
  2: { crew: 0.6, guards: 0.5, sec: 1, armed: 0.7, guns: ["pistol", "pistol", "shotgun"], armour: 1 },
  3: { crew: 1, guards: 1, sec: 1, armed: 1, guns: ["pistol", "shotgun", "uzi"], armour: 1.1 },
  4: { crew: 1.35, guards: 1.25, sec: 0.8, armed: 1, guns: ["shotgun", "uzi", "uzi", "longrange"], armour: 1.25 },
  5: { crew: 1.7, guards: 1.5, sec: 0.6, armed: 1, guns: ["uzi", "longrange", "minigun", "laser"], armour: 1.5 },
};
/* What the squad can take on: each Watcher's best gun and mods, summed over
 * the four who go out, and a hired crew if one's paid for. Four new Watchers
 * with pistols are tier 1. A weapon mark counts a quarter more gun, as it
 * does in the field. The tiers are set from real fights in the engine. */
M.GUN_POWER = { pistol: 0.5, shotgun: 0.8, uzi: 1, longrange: 1.2, minigun: 1.6, laser: 1.8, gauss: 2 };
M.agentPower = a => {
  // a mark over MK1 is +25% damage and +15% range in the field (W.MARK): about a quarter more gun
  const gun = Math.max(0, ...a.items.filter(i => M.GUN_POWER[i.type]).map(i => M.GUN_POWER[i.type] * (1 + 0.25 * ((i.mk || 1) - 1))));
  return 1 + gun + 0.2 * Object.values(a.mods).reduce((t, v) => t + v, 0);
};
// the missions the BanHammer is for: taking a zone back, and locking one down
M.bigGun = o => !!o && (o.kind === "siege" || (o.kind === "story" && o.step === M.STORY.length - 1));
M.carriesBanhammer = s => M.squad(s).some(a => a.items.some(i => i.type === "banhammer" && (i.count || 1) > 0));
M.basePower = s => M.squad(s).reduce((t, a) => t + M.agentPower(a), 0);
M.squadPower = (s, o) => M.basePower(s) + (s.hired ? M.N.HIRED : 0) + (M.bigGun(o) && M.carriesBanhammer(s) ? M.N.BANHAMMER : 0);
M.TIERS = [0, 9, 13, 19, 25];         // squad power for tiers 1..5
M.squadTier = (s, o) => { const p = M.squadPower(s, o); let t = 1; for (let k = 1; k < M.TIERS.length; k++) if (p >= M.TIERS[k]) t = k + 1; return t; };
// a zone's story chain on war footing: three steps, each needing the zone at a level
M.STORY = [{ needs: 0, name: "Find the lieutenant" }, { needs: 2, name: "Turn the network" }, { needs: 2.5, name: "Lock it down" }];

/* ---------------- the state ---------------- */
let seq = 0;
const rnd = s => { s.rng = (s.rng * 9301 + 49297) % 233280; return s.rng / 233280; };
const ri = (s, a, b) => a + Math.floor(rnd(s) * (b - a + 1));
const pickS = (s, a) => a[Math.floor(rnd(s) * a.length)];

M.agent = (id, name, fur, items, patch) => ({ id, name, fur, patch: patch || null, mods: {}, items, deployed: true, missions: 0, kills: 0 });
M.fresh = (seed = Date.now() % 100000) => {
  const s = {
    v: 2, day: 1, cash: 80000, nextId: 5, rng: seed % 233280,
    zones: M.ZONES.map(z => ({ id: z.id, C: z.start, lost: z.start <= 0, locked: false, works: 0, tactic: null, policy: null, story: 0, martial: 0, festival: 0, floor: 0 })),
    research: { done: M.START_DONE.slice(), running: [], points: 0, works: 0, requisition: 0, counters: 0 },
    scannerMk: 0, war: false, won: false,
    cal: { zone: null, left: 0, rest: 4, next: null, nextIn: 0, revealed: false, bribed: false },
    offers: [],
    roster: [
      M.agent(1, "LYNX", "#b08a5a", [{ type: "pistol", mk: 1 }, { type: "purrsuader", mk: 1 }, { type: "medikit", count: 1 }]),
      M.agent(2, "MANX", "#7c7c84", [{ type: "pistol", mk: 1 }, { type: "shotgun", mk: 1 }, { type: "medikit", count: 1 }]),
      M.agent(3, "SPHYNX", "#c9a49a", [{ type: "pistol", mk: 1 }, { type: "shotgun", mk: 1 }, { type: "medikit", count: 1 }]),
      M.agent(4, "CALICO", "#e8e4dc", [{ type: "pistol", mk: 1 }, { type: "medikit", count: 1 }], "#c98a4a"),
    ],
    fallen: [], log: [], stats: { missions: 0, won: 0 },
  };
  for (const z of s.zones) z.policy = M.defaultPolicy(s, z);
  M.planCal(s);
  s.cal.revealed = true;
  M.refreshOffers(s);
  M.note(s, "Casey Benton has given the Watchers the city to hold. Set what each zone spends on control, start some research, and pick a mission.");
  M.note(s, `Joyeuse has a name: Cal moves on ${M.zoneDef(s.cal.next).name} in ${s.cal.nextIn} days. Bank control there.`, "bad");
  return s;
};
M.KEY = "campaign_v2";
M.load = () => { const s = W.store.get(M.KEY, null); return s && s.v === 2 ? s : null; };
M.save = s => W.store.set(M.KEY, s);
M.note = (s, text, kind = "") => { s.log.unshift({ day: s.day, text, kind }); s.log.length = Math.min(s.log.length, 60); };

/* ---------------- zones ---------------- */
M.zone = (s, id) => s.zones.find(z => z.id === id);
M.pips = (s, z) => z.lost ? 0 : M.zoneDef(z.id).base + z.works + (z.locked ? 3 : M.level(z.C));
M.gainOf = (s, z) => M.N.GAIN[Math.max(0, M.level(z.C))] * (z.tactic ? M.N.TACTIC_GAIN : 1);
// Cal pushes harder the more of the city is held at level 2 or above; a zone locked down is out of his reach and his reckoning
M.calPressure = (s, z) => {
  if (s.cal.zone !== z.id) return 0;
  const C = M.N.CAL, base = s.war ? C.war.base + C.war.cornered * s.zones.filter(q => q.locked).length : C.base;
  return (base + C.perPacified * s.zones.filter(q => !q.lost && !q.locked && M.level(q.C) >= 2).length) * (s.cal.bribed ? 0.5 : 1);
};
M.naturalDecay = (s, z) => z.locked ? 0 : M.decay(z.C, s.war);
M.decayOf = (s, z) => M.naturalDecay(s, z) + M.calPressure(s, z);
/* A day's change in control with c pips on it. Pips add, decay takes away;
 * under propaganda or mind control decay can't take a zone below its floor
 * (1 or 2), and below it the zone is drawn back up. The floor holds against
 * decay only: the wall and the cliff above it stand, and Cal's push still
 * comes off on top. noCal leaves Cal out (what overseers plan for). */
M.dayDelta = (s, z, c, noCal) => {
  if (z.locked) return 0;
  const F = z.floor || 0, gain = c * M.gainOf(s, z);
  const d = M.naturalDecay(s, z);
  const C = z.C < F ? z.C + gain + Math.min(M.N.PULL, F - z.C)    // below the floor: drawn back up
    : F ? Math.max(F, z.C + gain - d)                               // above it: decay stops at the floor, and only there
    : z.C + gain - Math.min(d, z.C);                                // no floor: decay can take what's there, the pips go on top
  return C - z.C - (noCal ? 0 : M.calPressure(s, z));
};
// the drift with no pips on control
M.drift = (s, z) => M.dayDelta(s, z, 0);
// pips on control that keep the zone where it is (more than it makes, if it can't be held)
M.holdPips = (s, z, noCal) => { for (let c = 0; c < 24; c++) if (M.dayDelta(s, z, c, noCal) >= -1e-9) return c; return 24; };
M.defaultPolicy = (s, z) => {
  const p = M.pips(s, z), c = Math.min(p, Math.max(1, M.holdPips(s, z)));
  const rest = p - c, r = Math.ceil(rest / 2);
  return { r, m: rest - r, c: z.locked ? 0 : c };
};
// keep a policy's pips summing to what the zone makes: shortfalls come off research, then money, then control
M.fitPolicy = (s, z) => {
  const P = z.policy || (z.policy = { r: 0, m: 0, c: 0 }), want = M.pips(s, z);
  let sum = P.r + P.m + P.c;
  for (const k of ["r", "m", "c"]) while (sum > want && P[k] > 0) { P[k]--; sum--; }
  while (sum < want) { P.m++; sum++; }
  if (z.locked) { P.r += P.c; P.c = 0; }
  return P;
};
// cycle one pip: research -> money -> control -> research
M.cyclePip = (s, z, from) => {
  const P = M.fitPolicy(s, z), next = { r: "m", m: z.locked ? "r" : "c", c: "r" }[from];
  if (P[from] <= 0) return;
  P[from]--; P[next]++;
};
/* The tax dial and the city balance (the command screen's controls). Each
 * zone's dial sets its pips on control; what's left of every zone's pips is
 * split between research and money by one city-wide balance, s.balance (the
 * share to research). The split is spread over the zones so the city's total
 * comes out right: a running sum, rounded as it goes. A save without a
 * balance keeps whatever split its policies have. */
M.balance = s => s.balance == null ? 0.5 : s.balance;
M.spread = s => {
  const b = M.balance(s);
  let acc = 0, given = 0;
  for (const z of s.zones) {
    if (z.lost) continue;
    const P = M.fitPolicy(s, z), rest = P.r + P.m;
    acc += rest * b;
    P.r = Math.min(rest, Math.max(0, Math.round(acc) - given));
    P.m = rest - P.r;
    given += P.r;
  }
};
M.setDial = (s, z, c) => {
  const P = M.fitPolicy(s, z), p = M.pips(s, z);
  if (z.lost || z.locked) return;
  P.c = Math.max(0, Math.min(p, Math.round(c)));
  P.m = p - P.c; P.r = 0;
  M.spread(s);
};
// zone works, once researched, are built where the player chooses: a pip more for good
M.placeWorks = (s, z) => {
  const R = s.research;
  if (!R.worksReady || !z || z.lost) return false;
  R.worksReady--; z.works++;
  z.policy = M.fitPolicy(s, z); M.spread(s);
  M.note(s, `Zone works built in ${M.zoneDef(z.id).name}: a pip more, for good.`, "good");
  return true;
};
M.setBalance = (s, b) => { s.balance = Math.max(0, Math.min(1, b)); M.spread(s); };
// a day's net change in control, as the policy stands
M.netControl = (s, z) => z.lost || z.locked ? 0 : (z.martial > 0 ? Math.max(0, M.dayDelta(s, z, M.fitPolicy(s, z).c)) : M.dayDelta(s, z, M.fitPolicy(s, z).c)) + (z.festival > 0 ? 0.75 / 3 : 0);
/* Where the zone is heading at today's rate: the next level up and the days
 * to it, or the level down (or the loss) and the days to that. Rough: decay
 * changes with control, so it's a guide, not a promise. */
M.forecast = (s, z) => {
  if (z.lost || z.locked) return null;
  const net = M.netControl(s, z), L = M.level(z.C);
  if (Math.abs(net) < 0.005) return { steady: true };
  if (net > 0) return L >= 3 ? { steady: true, top: true } : { to: L + 1, days: Math.max(1, Math.ceil((Math.floor(z.C) + 1 - z.C) / net)) };
  const room = z.C - Math.max(0, Math.ceil(z.C) - 1);
  return L <= 0 ? { lost: true, days: Math.max(1, Math.ceil(z.C / -net)) } : { to: L - 1, days: Math.max(1, Math.ceil(room / -net)) };
};
M.yieldOf = z => M.N.YIELD[Math.max(0, z.locked ? 3 : M.level(z.C))];
// money a pip makes: less where propaganda or mind control has people no longer wanting much
M.moneyYield = z => M.yieldOf(z) * M.N.FLOOR_MONEY[z.floor || 0];

/* ---------------- Cal ---------------- */
// he plans his next push as he starts to rest, so intel can find it out
M.planCal = (s, last) => {
  const cands = s.zones.filter(z => !z.locked && z.id !== (last || s.cal.zone) && z.id !== "towers");
  const w = cands.map(z => [z, (z.lost ? 0.2 : 1) * (4.5 - z.C) * M.zoneDef(z.id).base]);
  let r = rnd(s) * w.reduce((a, [, x]) => a + x, 0);
  s.cal.next = cands[0] ? cands[0].id : null;
  for (const [z, x] of w) if ((r -= x) <= 0) { s.cal.next = z.id; break; }
  s.cal.nextIn = s.cal.rest = ri(s, ...(s.war ? M.N.CAL.war.rest : M.N.CAL.rest));
};
M.calStep = s => {
  const c = s.cal;
  if (c.zone) {
    if (--c.left <= 0) {
      const z = M.zone(s, c.zone);
      if (z && !z.lost && !z.locked && !c.broken && rnd(s) < M.N.CAL.tactic && !z.tactic) {
        z.tactic = pickS(s, M.TACTICS);
        M.note(s, `Cal leaves something behind in ${M.zoneDef(z.id).name}: ${z.tactic}. Control there costs more until it's countered.`, "bad");
      } else M.note(s, `Cal's people pull back from ${M.zoneDef(c.zone).name}.`);
      const last = c.zone;
      c.zone = null; c.bribed = false; c.revealed = false; c.broken = false;
      M.planCal(s, last);
    }
  } else if (--c.rest <= 0) {
    if (c.next && !M.zone(s, c.next).locked) {
      c.zone = c.next; c.left = s.war ? M.N.CAL.war.push : M.N.CAL.push;
      M.note(s, `Cal is pushing ${M.zoneDef(c.zone).name}.`, "bad");
    } else M.planCal(s);
  } else c.nextIn = c.rest;
};

/* ---------------- research ---------------- */
M.isDone = (s, id) => s.research.done.includes(id);
M.isRunning = (s, id) => s.research.running.some(p => p.id === id);
M.repeatCost = (s, kind) => { const n = s.research[kind]; return M.COST[kind].map(x => Math.round(x * 1.5 ** n)); };
M.available = s => {
  const out = M.CATALOGUE.filter(r => !M.isDone(s, r.id) && !M.isRunning(s, r.id) && r.needs.every(n => M.isDone(s, n)));
  for (const kind of ["works", "requisition"]) if (!M.isRunning(s, kind)) out.push({ id: kind, kind: "city", name: kind === "works" ? `Zone works #${s.research.works + 1}` : `Requisition #${s.research.requisition + 1}`, cost: M.repeatCost(s, kind), points: 0, repeat: true });
  for (const z of s.zones) if (z.tactic && !M.isRunning(s, `counter:${z.id}`)) out.push({ id: `counter:${z.id}`, kind: "counter", name: `Counter ${z.tactic} (${M.zoneDef(z.id).name})`, cost: M.COST.counter, points: 0 });
  return out;
};
// why something can't be bought yet: how far short the cash is
M.short = (s, price) => s.cash < price ? `${W.money(price - s.cash)} short` : "";
M.canStart = (s, r) => M.short(s, r.cost[0]);
M.start = (s, r) => {
  if (M.canStart(s, r)) return false;
  s.cash -= r.cost[0];
  s.research.running.push({ id: r.id, name: r.name, left: r.cost[1], total: r.cost[1] });
  return true;
};
M.cancel = (s, id) => { s.research.running = s.research.running.filter(p => p.id !== id); };
M.finish = (s, p) => {
  const R = s.research, id = p.id;
  if (id === "works") {
    R.works++; R.worksReady = (R.worksReady || 0) + 1;
    M.note(s, "Zone works ready: build them from a zone's dossier, and it makes a pip more for good.", "good");
  } else if (id === "requisition") { R.requisition++; M.note(s, `Requisition ${R.requisition}: a free pip a day, wherever control is weakest.`, "good"); }
  else if (id.startsWith("counter:")) { const z = M.zone(s, id.slice(8)); if (z) { M.note(s, `${M.zoneDef(z.id).name}: ${z.tactic} countered.`, "good"); z.tactic = null; } R.counters++; }
  else {
    const it = M.item(id);
    R.done.push(id);
    R.points += it.points;
    M.note(s, `Research done: ${it.name}.${it.kind === "weapon" ? " In the Armoury." : it.kind === "mod" ? " At the Clinic." : ""}`, "good");
    if (!s.war && !s.warReady && R.points >= M.N.WAR_AT) { s.warReady = true; M.note(s, "Casey Benton is ready to go to war with Cal whenever you are. Give the order from the Lab.", "good"); }
  }
};
// the Konami code: every project running finished, and half a million from Casey's petty cash
M.cheat = s => {
  const done = s.research.running.length;
  for (const p of s.research.running) p.left = 0;
  M.feedResearch(s, 0);
  s.cash += 500000;
  M.note(s, `Up, up, down, down. Casey Benton's petty cash: $500,000${done ? `, and ${done} project${done > 1 ? "s" : ""} finished` : ""}. Nobody saw anything.`, "good");
  return done;
};
M.canDeclareWar = s => s.war ? "already at war" : s.research.points < M.N.WAR_AT ? `${M.N.WAR_AT - s.research.points} more upgrade points first` : "";
M.declareWar = s => { if (M.canDeclareWar(s)) return false; M.toWar(s); M.refreshOffers(s); return true; };
M.toWar = s => {
  s.war = true;
  M.note(s, "Cal stops probing and commits. The city is on war footing: control decays faster everywhere. Each zone has a story to finish; lock them all down.", "bad");
};
// research points into the running projects, split evenly; nothing running, they're wasted
M.feedResearch = (s, rp) => {
  const run = s.research.running;
  if (!run.length) { s.research.wasted = (s.research.wasted || 0) + rp; return; }
  const share = rp / run.length;
  for (const p of run) p.left -= share;
  for (const p of run.filter(p => p.left <= 0)) { run.splice(run.indexOf(p), 1); M.finish(s, p); }
};

/* ---------------- a day ---------------- */
M.advanceDay = (s, onMission = false) => {
  M.calStep(s);
  let rp = 0, money = 0;
  const overseers = M.isDone(s, "overseers");
  for (const z of s.zones) {
    if (z.lost) continue;
    const P = M.fitPolicy(s, z);
    let c = P.c, r = P.r, m = P.m;
    // away on a mission, an overseer moves pips onto control so the zone holds against decay; Cal's push is still yours to answer
    if (onMission && overseers && !z.locked) {
      // on the wall (2.5 to 3.5) and not under a push, they put a pip over hold, to climb it
      const wall = z.C >= 2.5 && z.C < 3.5 && s.cal.zone !== z.id;
      const need = Math.min(M.pips(s, z), M.holdPips(s, z, true) + (wall ? 1 : 0));
      while (c < need && (r > 0 || m > 0)) { if (r >= m) r--; else m--; c++; }
    }
    rp += r * M.yieldOf(z); money += m * M.moneyYield(z) * M.N.PIP_MONEY;
    if (z.locked) continue;
    const was = M.level(z.C);
    // under martial law control can rise but not fall
    let delta = M.dayDelta(s, z, c);
    if (z.martial > 0) { delta = Math.max(0, delta); z.martial--; }
    z.C = Math.min(M.N.CAP, z.C + delta);
    if (z.festival > 0) { z.C = Math.min(M.N.CAP, z.C + 0.75 / 3); z.festival--; }
    if (z.C <= 0) {
      z.C = 0; z.lost = true;
      M.note(s, `${M.zoneDef(z.id).name} is lost. Nothing comes out of it until it's taken back by siege.`, "bad");
    } else {
      // the milestones only: reaching or losing level 3, falling to level 0
      const now = M.level(z.C);
      if (now === 3 && was < 3) M.note(s, `${M.zoneDef(z.id).name} is pacified: level 3.`, "good");
      else if (was === 3 && now < 3) M.note(s, `${M.zoneDef(z.id).name} slips from level 3.`, "bad");
      else if (now === 0 && was > 0) M.note(s, `${M.zoneDef(z.id).name} falls to level 0. It's close to lost.`, "bad");
    }
  }
  // requisitioned pips go where control is weakest
  for (let q = 0; q < s.research.requisition; q++) {
    const z = s.zones.filter(z => !z.lost && !z.locked).sort((a, b) => a.C - b.C)[0];
    if (z) z.C = Math.min(M.N.CAP, z.C + M.gainOf(s, z));
  }
  s.cash += Math.round(money);
  s.today = { rp, money };
  // levels moved, so pips did: keep the city's research and money split where the balance has it
  if (s.balance != null) M.spread(s);
  M.feedResearch(s, rp);
  s.day++;
  M.refreshOffers(s);
};

/* ---------------- missions on offer ---------------- */
M.refreshOffers = s => {
  s.offers = s.offers.filter(o => o.expires >= s.day && !(o.kind === "cal" && s.cal.zone !== o.zone) && !M.zone(s, o.zone).locked);
  for (const z of s.zones) {
    if (z.locked) continue;
    const D = M.zoneDef(z.id), L = M.level(z.C), mine = s.offers.filter(o => o.zone === z.id);
    const add = (kind, extra = {}) => {
      const K = M.KINDS[kind];
      s.offers.push(Object.assign({ id: `o${s.day}-${++seq}-${z.id}`, zone: z.id, kind, days: ri(s, ...K.days), level: L, seed: Math.floor(rnd(s) * 1e9),
        landmark: D.areas ? pickS(s, D.areas) : null, expires: s.day + ri(s, 5, 9), threat: M.threatOf(s, kind, z, extra.step || 0) }, extra));
    };
    if (z.lost) { if (!mine.some(o => o.kind === "siege")) add("siege", { expires: s.day + 99 }); continue; }
    if (s.cal.zone === z.id && !mine.some(o => o.kind === "cal")) add("cal", { expires: s.day + s.cal.left });
    if (s.war && !mine.some(o => o.kind === "story") && z.story < M.STORY.length) add("story", { step: z.story, expires: s.day + 99 });
    const want = M.OFFERS[L], ordinary = mine.filter(o => M.ORDINARY.includes(o.kind)).length;
    for (let k = ordinary; k < want; k++) {
      const mix = M.MIX[L];
      let r = rnd(s), i = 0;
      while (i < mix.length - 1 && (r -= mix[i]) > 0) i++;
      add(M.ORDINARY[i]);
    }
  }
  // there is always something the squad can take on: if nothing on offer is within its tier, a
  // quiet job turns up in the calmest zone that isn't lost or locked
  M.liveThreats(s);
  const tier = M.squadTier(s);
  if (!s.offers.some(o => o.threat <= tier)) {
    const z = s.zones.filter(q => !q.lost && !q.locked).sort((a, b) => b.C - a.C)[0];
    if (z) {
      const D = M.zoneDef(z.id), kind = M.hasTalker(s) && rnd(s) < 0.5 ? "persuade" : "intel";
      s.offers.push({ id: `o${s.day}-${++seq}-${z.id}`, zone: z.id, kind, days: ri(s, ...M.KINDS[kind].days), level: M.level(z.C), seed: Math.floor(rnd(s) * 1e9),
        landmark: D.areas ? pickS(s, D.areas) : null, expires: s.day + ri(s, 5, 9), threat: Math.min(tier, M.threatOf(s, kind, z)), fallback: true });
    }
  }
};
// every offer's threat for the squad deployed now: offers aren't frozen at the squad that was out when they turned up
M.liveThreat = (s, o) => { const z = M.zone(s, o.zone), t = M.threatOf(s, o.kind, z, o.step || 0); return o.fallback ? Math.min(M.squadTier(s), t) : t; };
M.liveThreats = s => { for (const o of s.offers) o.threat = M.liveThreat(s, o); };
// a job that's won by talking someone round (persuade, and the story's second step) can't be done without a Purrsuader
M.needsTalker = o => o.kind === "persuade" || (o.kind === "story" && o.step === 1);
M.hasTalker = s => M.squad(s).some(a => a.items.some(i => i.type === "purrsuader" || i.type === "purr2"));
// can this offer be run now? (story steps need the zone at a level; talking jobs need a Purrsuader)
M.canRun = (s, o) => {
  const z = M.zone(s, o.zone);
  const need = o.kind === "story" && M.STORY[o.step].needs;
  if (need && z.C < need) return `needs ${M.zoneDef(z.id).name} at ${Number.isInteger(need) ? `level ${need}` : `control ${need}`}`;
  if (!M.squad(s).length) return "no Watchers in the squad: put one in at the Clinic";
  if (M.needsTalker(o) && !M.hasTalker(s)) return "needs a Purrsuader in the squad: buy one at the Clinic";
  return "";
};
// what a money reward is worth now: the dearest single purchase open to the squad
M.moneyReward = s => {
  const best = Math.max(...M.CATALOGUE.filter(r => M.isDone(s, r.id)).map(r => r.kind === "weapon" ? M.PRICE.weapon[r.mk] : r.kind === "mod" ? M.PRICE.mod[r.mk] : r.line === "purrsuader" ? M.PRICE.purrsuader[r.mk] : 0), M.PRICE.mod[1]);
  return Math.round(Math.min(Math.max(best, s.roster.length < M.ROSTER_MAX ? M.PRICE.recruit * 0.5 : 0), 90000) / 1000) * 1000;
};
M.reward = (s, o) => {
  const L = Math.max(0, M.level(M.zone(s, o.zone).C));
  switch (o.kind) {
    case "persuade": return { control: [0.6, 0.5, 0.45, 0.35][L], reveal: true };
    case "intel": return { rp: M.intelPoints(s, o), reveal: true };
    case "job": return { money: M.moneyReward(s) };
    case "assassinate": return { money: Math.round(M.moneyReward(s) * 0.7 / 1000) * 1000, control: [0.5, 0.45, 0.35, 0.25][L] };
    case "crackdown": return { control: [0.9, 0.8, 0.65, 0.5][L], money: Math.round(M.moneyReward(s) * 0.2 / 1000) * 1000 };
    case "cal": return { endPush: true, control: 0.4 };
    case "siege": return { retake: true };
    case "story": return { story: true, control: 0.3 };
  }
  return {};
};
/* Intel's research: half of what's left on the first project running, up
 * to 12 points a day the mission takes; when what would be left is small,
 * the project is finished outright. */
M.intelPoints = (s, o) => {
  const p = s.research.running[0];
  if (!p) return 0;
  const g = Math.min(p.left * M.N.INTEL, 12 * (o.days || 4));
  return Math.ceil(p.left - g <= Math.max(10, p.total * 0.15) ? p.left : g);
};
M.describeReward = (s, o) => {
  const R = M.reward(s, o), out = [];
  if (o.kind === "intel") out.push(s.research.running.length ? `${R.rp} RP to ${s.research.running[0].name}` : "research (start a project first, or it's wasted)");
  if (R.reveal) out.push("Cal's next move");
  if (R.money) out.push(W.money(R.money));
  if (R.control) out.push(`+${R.control} control`);
  if (R.endPush) out.push("ends Cal's push");
  if (R.retake) out.push("the zone back, at level 0");
  if (R.story) out.push(o.step === M.STORY.length - 1 ? "LOCKDOWN" : `story step ${o.step + 1} of ${M.STORY.length}`);
  return out.join(" · ");
};

/* ---------------- the squad ---------------- */
M.agentById = (s, id) => s.roster.find(a => a.id === id);
M.squad = s => s.roster.filter(a => a.deployed).slice(0, M.SQUAD);
M.toggleDeploy = (s, a) => {
  if (a.deployed) { if (M.squad(s).length > 1) a.deployed = false; }
  else if (M.squad(s).length < M.SQUAD) a.deployed = true;
};
M.canHire = s => s.roster.length >= M.ROSTER_MAX ? `the barracks hold ${M.ROSTER_MAX}, and they're full` : M.short(s, M.PRICE.recruit);
M.hire = (s, free = false) => {
  if (!free && M.canHire(s)) return null;
  if (!free) s.cash -= M.PRICE.recruit;
  const used = new Set(s.roster.map(a => a.name).concat(s.fallen));
  const name = M.NAMES.find(n => !used.has(n)) || "STRAY " + s.nextId;
  const a = M.agent(s.nextId++, name, W.pick(W.FURS), [{ type: "pistol", mk: 1 }, { type: "medikit", count: 1 }], W.chance(0.3) ? W.pick(W.FURS) : null);
  a.deployed = M.squad(s).length < M.SQUAD;
  s.roster.push(a);
  return a;
};
M.bestMk = (s, line) => [3, 2, 1].find(k => M.isDone(s, `${line}:${k}`)) || 0;
// what can be bought for a Watcher: each researched weapon at its best mark, the Purrsuader, medikits, a BanHammer strike
M.shop = (s, a) => {
  const out = [];
  for (const w of M.WEAPON_LINES) {
    const best = M.bestMk(s, w.id); if (!best) continue;
    const have = a.items.find(i => i.type === w.id);
    // every mark researched is on the racks, not only the best: MK1 stays cheap
    for (let mk = 1; mk <= best; mk++) if (!have || (have.mk || 1) < mk) out.push({ key: `w:${w.id}:${mk}`, type: w.id, mk, name: `${w.name} MK${mk}`, price: M.PRICE.weapon[mk], upgrade: !!have });
  }
  const pk = M.bestMk(s, "purrsuader"), hp = a.items.find(i => i.type === "purrsuader" || i.type === "purr2");
  if (pk && (!hp || (hp.mk || 1) < pk)) out.push({ key: "w:purrsuader", type: "purrsuader", mk: pk, name: `Purrsuader MK${pk}`, price: M.PRICE.purrsuader[pk], upgrade: !!hp });
  out.push({ key: "medikit", type: "medikit", name: "Medikit", price: M.PRICE.medikit });
  if (M.isDone(s, "banhammer")) out.push({ key: "banhammer", type: "banhammer", name: "BanHammer strike (one shot)", price: M.PRICE.banhammer });
  return out;
};
// the slots a Watcher's kit takes: a BanHammer strike is a spotter and a radio, and takes none
M.slots = a => a.items.filter(i => i.type !== "banhammer").length;
M.canBuy = (s, a, it) => {
  if (s.cash < it.price) return M.short(s, it.price);
  if (it.type === "medikit") { const m = a.items.find(i => i.type === "medikit"); if (m && m.count >= 4) return "carries the most there is room for: 4"; }
  if (!it.upgrade && it.type !== "medikit" && it.type !== "banhammer" && M.slots(a) >= 8) return "all 8 slots full: sell something first";
  return "";
};
M.buy = (s, a, it) => {
  if (M.canBuy(s, a, it)) return false;
  s.cash -= it.price;
  if (it.type === "medikit") { const m = a.items.find(i => i.type === "medikit"); if (m) m.count++; else a.items.push({ type: "medikit", count: 1 }); return true; }
  if (it.type === "banhammer") { const b = a.items.find(i => i.type === "banhammer"); if (b) b.count = (b.count || 1) + 1; else a.items.push({ type: "banhammer", count: 1 }); return true; }
  const have = a.items.find(i => i.type === it.type || (it.type === "purrsuader" && i.type === "purr2"));
  if (have) { have.type = it.type; have.mk = it.mk; } else a.items.push({ type: it.type, mk: it.mk });
  return true;
};
// what an item fetches: half what it cost
M.sellPrice = it => Math.floor((it.type === "medikit" ? M.PRICE.medikit : it.type === "banhammer" ? M.PRICE.banhammer : it.type === "purrsuader" || it.type === "purr2" ? M.PRICE.purrsuader[it.mk || 1] : M.PRICE.weapon[it.mk || 1]) / 2);
M.sell = (s, a, idx) => {
  const it = a.items[idx]; if (!it) return false;
  s.cash += M.sellPrice(it);
  if ((it.type === "medikit" || it.type === "banhammer") && it.count > 1) it.count--; else a.items.splice(idx, 1);
  return true;
};
M.canInstall = (s, a, part) => {
  const v = (a.mods[part] || 0) + 1;
  if (v > 3) return "fully modded";
  if (!M.isDone(s, `${part}:${v}`)) return `research ${M.item(`${part}:${v}`).name} in the Lab first`;
  if (s.cash < M.PRICE.mod[v]) return M.short(s, M.PRICE.mod[v]);
  return "";
};
M.install = (s, a, part) => {
  if (M.canInstall(s, a, part)) return false;
  const v = (a.mods[part] || 0) + 1;
  s.cash -= M.PRICE.mod[v];
  a.mods[part] = v;
  return true;
};
// the squad's scanner is one piece of kit, fitted a mark at a time once the mark is researched
M.canUpgradeScanner = s => { const k = s.scannerMk + 1; if (k > 3) return "already MK3"; if (!M.isDone(s, `scanner:${k}`)) return `research Scanner MK${k} in the Lab first`; return M.short(s, M.PRICE.scanner[k]); };
M.upgradeScanner = s => { if (M.canUpgradeScanner(s)) return false; s.scannerMk++; s.cash -= M.PRICE.scanner[s.scannerMk]; return true; };
// what the squad has sunk into a Watcher: how much it hurts to lose them
M.worth = a => M.PRICE.recruit + Object.values(a.mods).reduce((t, v) => t + [1, 2, 3].slice(0, v).reduce((x, k) => x + M.PRICE.mod[k], 0), 0)
  + a.items.reduce((t, i) => t + (i.type === "medikit" ? M.PRICE.medikit * (i.count || 1) : i.type === "banhammer" ? M.PRICE.banhammer * (i.count || 1) : i.type === "purrsuader" || i.type === "purr2" ? M.PRICE.purrsuader[i.mk || 1] : M.PRICE.weapon[i.mk || 1] || 0), 0);

/* What the mission engine is given: the deployed squad, with each weapon's mark. */
M.missionRoster = s => M.squad(s).map(a => ({
  id: a.id, name: a.name, fur: a.fur, patch: a.patch, mods: Object.assign({}, a.mods),
  weapons: a.items.filter(i => W.WEAPONS[i.type === "purrsuader" && (i.mk || 1) >= 2 ? "purr2" : i.type]).map(i => ({
    type: i.type === "purrsuader" && (i.mk || 1) >= 2 ? "purr2" : i.type, mk: i.mk || 1, ammo: i.type === "medikit" || i.type === "banhammer" ? i.count || 1 : undefined })),
}));
/* The mission for an offer: the district, the area, the seed; and how hard the zone's streets are. */
/* The mission for an offer, as the engine gets it: the district, the area
 * and the seed pick the ground; L.mission says what kind of job it is and
 * how hard; L.mod is the enemy at that threat (see M.THREAT). */
M.missionFor = (s, o) => {
  const D = M.zoneDef(o.zone), z = M.zone(s, o.zone);
  const L = W.missionLevel({ district: D.district, landmark: o.landmark, seed: o.seed });
  const threat = M.liveThreat(s, o);
  // cal: the crew on the ground are Cal's own (his push, or a zone he holds)
  L.mission = { kind: o.kind, threat, quiet: !!M.KINDS[o.kind].quiet, zoneLevel: z.lost ? -1 : M.level(z.C), step: o.step, cal: o.kind === "cal" || o.kind === "siege" || z.lost || (o.kind === "story" && M.lastStand(s, z, o.step)) };
  L.mod = Object.assign({}, M.THREAT[threat]);
  L.scannerMk = s.scannerMk || 0;
  // a hired crew fights beside the squad; in a mind-controlled zone nobody can be talked round: they don't want anything
  L.mission.hired = s.hired ? 4 : 0;
  L.mission.mindControl = z.floor === 2;
  L.offer = o;
  return L;
};

/* ---------------- events ---------------- */
M.canEvent = (s, e, z) => {
  if (s.cash < e.price) return M.short(s, e.price);
  if (e.zone && !z) return "choose a zone above";
  if (e.lost && !(z && z.lost)) return "only for a zone lost to Cal";
  if (e.id === "amnesty" && s.war) return "not on war footing: a siege takes it back";
  if (e.zone && !e.lost && z && (z.lost || z.locked)) return "not in a zone that's lost or locked down";
  if (e.id === "bribes" && s.cal.bribed) return "already paid for this push";
  if (e.id === "hired" && s.hired) return "already hired for the next mission";
  if (e.needs && !M.isDone(s, e.needs)) return `research ${M.item(e.needs).name} in the Lab first`;
  if (e.floor && z && (z.floor || 0) >= e.floor) return "already running there";
  return "";
};
M.event = (s, e, z) => {
  if (M.canEvent(s, e, z)) return false;
  s.cash -= e.price;
  const name = z ? M.zoneDef(z.id).name : "";
  if (e.id === "festival") { z.festival = 3; M.note(s, `A festival in ${name}.`, "good"); }
  if (e.id === "informants") { s.cal.revealed = true; M.note(s, "Informants say where Cal goes next.", "good"); }
  if (e.id === "bribes") { s.cal.bribed = true; M.note(s, "City Hall has been paid. Cal's next push will be half-hearted.", "good"); }
  if (e.id === "martial") { z.martial = 3; M.note(s, `Martial law in ${name}.`); }
  if (e.id === "hired") { s.hired = true; M.note(s, "A hired crew is on the payroll for the next mission.", "good"); }
  if (e.id === "amnesty") { z.lost = false; z.C = 0.5; z.policy = M.defaultPolicy(s, z); M.note(s, `An amnesty: ${name} is back, at level 0.`, "good"); }
  if (e.floor) {
    z.floor = e.floor;
    M.note(s, e.floor === 1 ? `Propaganda in ${name}: PVN on every screen. The streets grow quieter. Nobody asks why.`
      : `Mind control in ${name}. The fighting stops. So does a good deal else. Joyeuse doesn't talk about it.`, "bad");
  }
  return true;
};

/* ---------------- after a mission ----------------
 * result: { won, agents: [{ id, alive, kills, items: [{ type, ammo, mk }] }] }.
 * Pays out, counts the dead, and lets the mission's days pass with the
 * policies as they stand (overseers adjusting, if researched). Returns the
 * debrief's lines. */
M.settle = (s, o, res) => {
  const D = M.zoneDef(o.zone), z = M.zone(s, o.zone), lines = [];
  s.stats.missions++;
  s.offers = s.offers.filter(x => x.id !== o.id);
  if (res.won) {
    s.stats.won++;
    const R = M.reward(s, o);
    if (o.kind === "intel") {
      const p = s.research.running[0], got = M.intelPoints(s, o);
      if (p) { p.left -= got; M.feedResearch(s, 0); }
      lines.push(["Intel: research", p ? `${got} points to ${p.name}` : "nothing running"]);
    }
    if (R.reveal) { s.cal.revealed = true; lines.push(["Intel: Cal's next push", s.cal.next ? `${M.zoneDef(s.cal.next).name}, in ${s.cal.nextIn} days` : "unclear"]); }
    if (R.money) { s.cash += R.money; lines.push(["Paid", W.money(R.money)]); }
    if (R.endPush && s.cal.zone === z.id) { s.cal.left = 1; s.cal.broken = true; lines.push(["Cal's push", "broken"]); }
    if (R.retake) { z.lost = false; z.C = 0.6; z.policy = M.defaultPolicy(s, z); lines.push([D.name, "taken back"]); M.note(s, `${D.name} is taken back.`, "good"); }
    if (R.story) {
      z.story++;
      if (z.story >= M.STORY.length) {
        z.locked = true; z.C = M.N.CAP; z.tactic = null; z.policy = M.defaultPolicy(s, z);
        lines.push([D.name, "LOCKED DOWN"]);
        M.note(s, `${D.name} is locked down. Cal's network there is finished.`, "good");
        if (s.zones.every(q => q.locked)) { s.won = true; M.note(s, "Every zone is locked down. PumaCity is Casey Benton's, and Cal is finished.", "good"); }
      } else lines.push([`${D.name}: story`, `step ${z.story} of ${M.STORY.length} done`]);
    }
    M.note(s, `${M.KINDS[o.kind].name} in ${D.name}: done.`, "good");
  } else {
    lines.push(["Mission failed", "no reward"]);
    if (!z.lost && !z.locked) { z.C = Math.max(0.01, z.C - 0.3); lines.push([`Control in ${D.name}`, "-0.3"]); }
    M.note(s, `${M.KINDS[o.kind].name} in ${D.name}: failed.`, "bad");
  }
  s.hired = false;
  // a BanHammer strike is spent in the field, when it's called down: the engine hands back what's left
  // the squad comes home, or doesn't
  for (const r of res.agents) {
    const a = M.agentById(s, r.id);
    if (!a) continue;
    if (!r.alive) {
      const worth = M.worth(a);
      s.roster = s.roster.filter(x => x !== a);
      s.fallen.push(a.name);
      lines.push([`${a.name} killed`, `${W.money(worth)} of Watcher lost`]);
      M.note(s, `${a.name} was killed in ${D.name}.`, "bad");
      continue;
    }
    a.missions++; a.kills += r.kills || 0;
    // the engine hands weapons back without their marks: a weapon a Watcher went out with keeps its mark
    const had = {}; for (const i of a.items) had[i.type] = i.mk || 1;
    const items = [];
    for (const w of r.items) {
      const type = w.type === "purr2" ? "purrsuader" : w.type;
      if (!w.mk && had[type]) w.mk = had[type];
      if (type === "medikit") { if (w.ammo > 0) items.push({ type, count: Math.min(4, w.ammo) }); }
      else if (type === "banhammer") { if (w.ammo > 0) items.push({ type, count: w.ammo }); }
      else if (!items.some(i => i.type === type)) {
        items.push({ type, mk: w.mk || 1 });
        // loot from the field: a gun nobody sent them out with, researched or not, is theirs to keep or sell
        if (!had[type] && W.WEAPONS[type]) lines.push([`${a.name} brought home`, `${W.WEAPONS[type].name}${M.isDone(s, `${type}:1`) ? "" : " (not researched)"}`]);
      }
    }
    // what the engine wasn't sent comes home with them as it went
    for (const i of a.items) if (!W.WEAPONS[i.type === "purrsuader" && (i.mk || 1) >= 2 ? "purr2" : i.type] && !r.items.some(w => w.type === i.type)) items.push(Object.assign({}, i));
    a.items = items.filter(i => i.type !== "banhammer").slice(0, 8).concat(items.filter(i => i.type === "banhammer"));
  }
  if (!s.roster.length) { const a = M.hire(s, true); M.note(s, `With no Watchers left, Casey Benton sends a raw recruit: ${a.name}.`, "bad"); }
  if (!M.squad(s).length) s.roster[0].deployed = true;
  // the days the mission took
  const cash0 = s.cash, lost0 = s.zones.filter(q => q.lost).length;
  for (let d = 0; d < o.days; d++) M.advanceDay(s, true);
  lines.push([`${o.days} days away`, `${W.money(s.cash - cash0)} made in the city`]);
  // control won on the ground lands as the squad comes home, after the days away, not before them
  if (res.won) {
    const R = M.reward(s, o);
    if (R.control && !z.lost && !z.locked) { z.C = Math.min(M.N.CAP, z.C + R.control); lines.push([`Control in ${D.name}`, `+${R.control}, now level ${M.level(z.C)}`]); }
  }
  // the streets remember, won or lost: citizens talked round and still with the squad, and civilians the fight killed
  const talked = res.persuaded || 0, dead = res.civKilled || 0;
  if ((talked || dead) && !z.lost && !z.locked) {
    const f = n => (n < 0 ? "−" : "+") + Math.abs(n).toFixed(2);
    if (talked) { const g = talked * M.N.PERSUADED; z.C = Math.min(M.N.CAP, z.C + g); lines.push([`Citizens talked round: ${talked}`, `control ${f(g)}`]); }
    if (dead) { const g = dead * M.N.CIV_KILLED; z.C = Math.max(0.01, z.C - g); lines.push([`Civilians killed: ${dead}`, `control ${f(-g)}`]); }
  }
  const lostNow = s.zones.filter(q => q.lost).length;
  if (lostNow > lost0) lines.push(["While you were out", `${lostNow - lost0} zone${lostNow - lost0 > 1 ? "s" : ""} lost`]);
  return { lines };
};

W.money = n => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
