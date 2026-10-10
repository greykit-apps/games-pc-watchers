/* The Convention Center district: by the Starport, a new event every week.
 * One map, 224 tiles a side.
 *
 *   x 4..7      the Highway            y 4..7      North Road
 *   x 112..115  Expo Avenue            y 96..99    Convention Way
 *   x 118..121  the light rail         y 160..163  Neon Street
 *   x 210..213  East Boulevard         y 210..213  South Road
 *
 * North of Convention Way: the Convention Center itself (x 14..85,
 * y 14..69), which you can walk through room by room; its loading dock; the
 * expo plaza in front; Garage A; the Grand Puma Hotel; and across Expo Avenue
 * the arena. South of it: Garage B, and Neon Street's clubs and bars: Club
 * Catnip, The Litter Box, the Purrcade. */
"use strict";

W.district({
  id: "convention", name: "Convention Center", w: 224, h: 224, seed: 5280,
  blurb: "A convention center you can walk through, parking garages, the arena, and Neon Street's clubs. A new event every week, and pickpockets at all of them.",
  names: { targets: ["Felix Marchetti", "The Promoter", "Velvet Paws", "Lucky Calico", "Madame Purrfidia"], crew: "the Expo mob", sec: "Event Security", guard: "Minder", henchman: "Tout", civ: "Attendee" },
  theme: {
    racket: "a pickpocket ring and a counterfeit-badge racket",
    secNote: "Event Security work the doors, the halls and the plaza. They have no idea who you are, and a crowd this size makes them jumpy. Keep weapons holstered near them.",
    ground: "A huge building to fight through room by room, garages full of cars that burn, and a nightlife strip that never closes.",
    guards: 4, crew: 10, sec: 10, civ: 0.004, civMax: 110,
    crewGuns: ["pistol", "pistol", "uzi", "shotgun"],
    civLook: () => { const coat = W.pick(["#c83a6a", "#3a8ac8", "#d8a01a", "#6a3ac8", "#3ac88a", "#e8e4dc", "#c86a1a"]); return { coat, trim: W.shade(coat, 1.4), legs: W.pick(["#22252e", "#3a3a48"]), fur: W.pick(W.FURS), patch: W.chance(0.3) ? W.pick(W.FURS) : null }; },
    secLook: () => ({ coat: "#1a1a20", trim: "#ffd04a", legs: "#14141a", fur: W.pick(W.FURS), hat: "#1a1a20", hatKind: "cap" }),
  },
  sections: [],

  build(m, rng) {
    const G = W.G, K = W.K;
    const pick = a => a[Math.floor(rng() * a.length)];
    m.fill(0, 0, 224, 224, G.WALK);
    m.street("y", 4, 3); m.street("x", 4, 2);
    m.street("y", 112, 2); m.street("x", 96, 2);
    m.street("y", 210, 2); m.street("x", 160, 2); m.street("x", 210, 1);

    // ================= the Convention Center =================
    const cc = m.structure({ x: 14, y: 14, w: 72, d: 56, floors: 4, style: "hall", skylights: true, name: "PumaCity Convention Center",
      doors: [["s", 10, 3], ["s", 30, 8], ["s", 58, 3], ["n", 8, 4], ["n", 60, 4], ["w", 20, 2], ["e", 10, 2], ["e", 40, 2]],
      signs: [{ face: "s", text: "PUMACITY CONVENTION CENTER", at: 42.5, z: 44, color: "#ffb000", size: 11 }] });   // over the plain wall between the canopy and the east door
    // the grand lobby, along the front
    m.partition(cc, 15, 57, 70, 1, [[10, 4], [30, 6], [56, 4]]);
    for (const a of [20, 40, 60]) m.prop("box", a + 0.5, 62, { w: 4, d: 0.8, h: 8, side: "#2a3044", top: "#3a4258", screen: "#54f2ff", glow: "#54f2ff" });   // registration
    for (let i = 0; i < 6; i++) m.prop("bench", 22.5 + i * 9, 66.5);
    m.prop("kiosk", 50.5, 63.5, { color: "#ffb000" });
    m.light(50, 63, 8, "#9ff7ff", 0.12);
    // exhibit hall A: booths in rows, aisles between
    m.partition(cc, 55, 30, 1, 27, [[10, 4]]);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) {
      const bx = 18 + i * 6, by = 33 + r * 6, c = pick(["#54f2ff", "#ff8fd8", "#ffb000", "#4ade6a", "#b47dff"]);
      m.prop("box", bx + 0.5, by + 0.5, { w: 2.6, d: 1.6, h: 6, side: "#2a3044", top: W.shade(c, 0.6), glow: c });
    }
    m.light(35, 43, 10, "#9ff7ff", 0.12);
    // the ballroom: tables round a stage
    m.floorIn(56, 30, 29, 27, G.CARPET);
    m.floorIn(62, 30, 17, 4, G.WOOD);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) m.prop("table", 60.5 + i * 6, 37.5 + j * 4.5, { umbrella: null });
    m.light(70, 32, 6, "#ffcf6b", 0.2);
    // the back of house: meeting rooms, offices, security, the kitchen, the loading bay
    m.partition(cc, 15, 29, 70, 1, [[8, 3], [22, 3], [48, 3], [62, 3]]);
    for (const [a, gap] of [[21, 11], [27, 11], [35, 11], [55, 11], [63, 11], [73, 11]]) m.partition(cc, a, 15, 1, 14, [[gap, 2]]);
    for (const a of [16, 22, 28]) { m.floorIn(a, 15, 5, 11, G.CARPET); m.prop("box", a + 2.5, 19, { w: 1.4, d: 4, h: 5, side: "#5a3a24" }); }
    m.floorIn(36, 15, 19, 11, G.CARPET);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) m.prop("box", 38.5 + i * 4.5, 17.5 + j * 3, { w: 1.6, d: 0.8, h: 6, side: "#3a3f4e", screen: "#9ff7ff" });
    for (let i = 0; i < 3; i++) m.prop("box", 57.5 + i * 2, 16, { w: 1.6, d: 0.6, h: 12, side: "#1a1e2a", screen: "#4ade6a", glow: "#4ade6a" });   // the monitors
    m.prop("box", 59, 21, { w: 3, d: 1, h: 6, side: "#3a3f4e" });
    for (let i = 0; i < 4; i++) m.prop("box", 65 + i * 2, 16, { w: 1.6, d: 0.8, h: 8, side: "#8a90a0", top: "#c8ccd4" });   // the kitchen
    m.prop("box", 68, 21, { w: 5, d: 1, h: 8, side: "#8a90a0", top: "#c8ccd4" });
    for (let i = 0; i < 9; i++) m.prop("crate", 75.5 + (i % 3) * 2.5, 17.5 + Math.floor(i / 3) * 3);
    m.loot.push({ type: "shotgun", ammo: 24, x: 58.5, y: 24.5 });
    // the loading dock behind
    m.fill(10, 8, 78, 5, G.TARMAC);
    for (const [a, c] of [[22, "#5a5a6a"], [30, "#c86a1a"], [74, "#3a5a8a"], [82, "#d8a01a"]]) m.prop("truck", a + 0.5, 10.5, { color: c });
    m.prop("flood", 50, 9); m.light(50, 9.5, 6, "#fffbe8", 0.18);

    // the front: a glass canopy over the main doors, banners down the facade
    m.canopy({ x: 40, y: 70, w: 16, d: 5, floors: 2, every: 15, name: "Entrance canopy" });
    // banners down the facade, clear of the doors (x 24..26, 44..51, 72..74) and of the sign (x 56..67)
    for (const [x, t, c] of [[17, "PUMA", "#ffb000"], [20, "EXPO", "#54f2ff"], [69, "CON", "#ff8fd8"], [80, "EXPO", "#b47dff"]]) m.prop("blade", x + 0.5, 70.06, { text: t, color: c, z: 30 });

    // ---- the expo plaza ----
    m.fill(10, 71, 100, 24, G.PLAZA);
    for (let x = 14; x <= 106; x += 7) m.prop("banner", x + 0.5, 71.4, { color: ["#54f2ff", "#ff8fd8", "#ffb000", "#b47dff"][(x / 7 | 0) % 4] });
    for (const [x, c] of [[18, "#c83a6a"], [30, "#3ac88a"], [76, "#d8a01a"], [90, "#3a8ac8"]]) {
      m.prop("truck", x + 0.5, 82.5, { color: c }); m.light(x + 0.5, 84, 2.6, "#ffe2a0", 0.22);
      for (const dx of [-2, 2]) m.prop("table", x + 0.5 + dx, 86.5, { umbrella: c });
    }
    m.fill(46, 78, 8, 8, G.WATER); m.prop("spout", 50, 82); m.light(50, 82, 4, "#54f2ff", 0.18);
    m.prop("statue", 62, 82); m.light(62, 82.5, 3, "#ffb000", 0.15);
    m.prop("billboard", 66.5, 74.5, { text: "PUMA EXPO\nTHIS WEEK", color: "#ffb000" });
    for (const x of [38, 42, 56, 60]) m.prop("bench", x + 0.5, 90.5);
    K.lamps(m, 12, 94.6, 108, 94.6, 9, "#9ff7ff");
    K.lamps(m, 10.4, 16, 10.4, 68, 10);

    // ---- Garage A, beside the hall ----
    const garage = (x, y, w, d, name, doors) => {
      const g = m.structure({ x, y, w, d, floors: 3, style: "parkade", name, doors, signs: [{ face: "s", text: "PARKING", at: Math.max(1, w / 2 - 3), z: 32, color: "#54f2ff" }] });
      m.floorIn(x + 1, y + 1, w - 2, d - 2, G.PARK);
      for (let i = x + 3; i < x + w - 2; i += 5) for (let j = y + 3; j < y + d - 2; j += 7) m.prop("box", i + 0.5, j + 0.5, { w: 0.5, d: 0.5, h: 40, side: "#4a4e58", blocks: true });
      for (let j = y + 2; j < y + d - 2; j += 7) for (let i = x + 2; i < x + w - 2; i += 2.2) if (rng() < 0.55) m.park(i, j + 2, "y", null, 1);
      m.prop("lamp", x + w / 2, y + d / 2); m.light(x + w / 2, y + d / 2, 5, "#fff3c4", 0.16);
      return g;
    };
    garage(90, 32, 20, 36, "Garage A", [["s", 8, 4], ["n", 8, 4], ["w", 14, 3], ["e", 14, 4]]);
    m.driveway(109, 47, 1, 4, "e");                                           // the ramp out to Expo Avenue
    // ---- the Grand Puma Hotel ----
    m.building({ x: 92, y: 12, w: 14, d: 14, floors: 18, style: "glass", roofKit: "beacon", name: "Grand Puma Hotel", signs: [{ face: "s", text: "GRAND PUMA", at: 3, z: 230, color: "#ffb000", size: 10 }] });
    m.prop("blade", 106.06, 20, { text: "HOTEL", color: "#ff5266", z: 22 });

    // ================= across Expo Avenue: the light rail, the arena =================
    m.rail("y", 118, 0, 224, [88, 168], 1);
    K.railFence(m, "y", 118, 0, 224);
    m.fill(123, 84, 6, 10, G.PLAZA); m.prop("shelter", 125.5, 88.5); m.light(125, 88, 4, "#9ff7ff", 0.15);
    m.fill(123, 164, 6, 10, G.PLAZA); m.prop("shelter", 125.5, 168.5); m.light(125, 168, 4, "#9ff7ff", 0.15);
    m.canopy({ x: 118, y: 84, w: 11, d: 10, floors: 2, every: 4 });
    m.canopy({ x: 118, y: 164, w: 11, d: 10, floors: 2, every: 4 });
    {
      const AX = 166, AY = 48;
      m.fill(138, 20, 58, 58, G.PLAZA);
      m.building({ x: 144, y: 26, w: 45, d: 45, floors: 4, style: "arena", name: "Arena",
        mask: (i, j) => { const dx = i + 0.5 - AX, dy = j + 0.5 - AY, r = Math.hypot(dx, dy); return r >= 14 && r <= 22 && Math.abs(dx) > 2.5 && Math.abs(dy) > 2.5; } });
      m.daub({ type: "circle", x: AX, y: AY, r: 11, color: "rgba(84,242,255,.35)", w: 2 });
      m.building({ x: 162, y: 38, w: 9, d: 4, floors: 1, style: "metal", name: "Stage", signs: [{ face: "s", text: "LIVE", at: 3, z: 8, color: "#ff5266" }] });
      for (const [x, y] of [[157, 39], [175, 39], [157, 57], [175, 57]]) { m.prop("flood", x, y); m.light(x, y + 0.5, 5, "#fffbe8", 0.2); }
      // ticket booths at the four gates, merch stalls, and a tailgate party by the lot
      for (const [x, y] of [[163, 23], [169, 23], [163, 73], [169, 73], [141, 45], [141, 51], [191, 45], [191, 51]]) m.prop("kiosk", x + 0.5, y + 0.5, { color: "#ffb000" });
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.4, x = AX + Math.cos(a) * 25.5, y = AY + Math.sin(a) * 25.5; m.prop("kiosk", x, y, { color: ["#4ade6a", "#54f2ff", "#ff8fd8"][k % 3] }); }
      for (let k = 0; k < 12; k++) m.prop("banner", 140.5 + k * 4.5, 76.4, { color: k % 2 ? "#4ade6a" : "#e8e4dc" });
      for (const [x, c] of [[142, "#c83a6a"], [150, "#3ac88a"]]) { m.prop("truck", x + 0.5, 68.5, { color: c }); m.prop("table", x + 2.5, 71.5, { umbrella: c }); }
      for (const [x, y] of [[166, 25], [166, 71], [143, 48], [189, 48]]) m.crowd(x, y, 3, 5);
      m.crowd(147, 71, 4, 6);
      K.parking(m, rng, 130, 80, 76, 12, { fill: 0.5, gates: [["s", 10], ["s", 60]] });
    }
    K.lots(m, rng, 126, 8, 82, 10, { styles: ["concrete", "office"], floors: [3, 7], noAlley: true, signs: ["EXPO", "HOTEL", "BAR"] });
    // the Rail Yard Market: a food hall beside the tracks
    {
      const f = m.structure({ x: 124, y: 46, w: 13, d: 27, floors: 2, style: "brick", floor: G.WOOD, name: "Rail Yard Market", doors: [["n", 5, 3], ["s", 5, 3], ["e", 10, 3]],
        signs: [{ face: "s", text: "RAIL YARD MARKET", at: 0.5, z: 22, color: "#ffb000" }] });
      for (let r = 0; r < 4; r++) for (const sx of [125.5, 134.5]) m.prop("box", sx, 49 + r * 6, { w: 1, d: 3, h: 8, side: "#3a2418", top: "#8a5a3a", glow: ["#ffb000", "#ff8fd8", "#4ade6a", "#54f2ff"][r] });
      for (let r = 0; r < 4; r++) m.prop("table", 130.5, 50 + r * 6);
      m.light(130, 59, 6, "#ffcf6b", 0.2);
      m.crowd(130, 58, 4, 8);
    }
    // the north landing of the footbridge: a little open square
    m.fill(123, 36, 14, 8, G.PLAZA);
    m.prop("shelter", 128.5, 37.5); m.prop("kiosk", 133.5, 38.5, { color: "#54f2ff" }); m.light(131, 40, 4, "#9ff7ff", 0.18);
    // Pounce FC: the club's offices, trophy room and locker room, by the arena
    {
      const h = m.structure({ x: 197, y: 22, w: 12, d: 26, floors: 3, style: "glass", name: "Pounce FC", doors: [["w", 10, 3], ["s", 4, 3]],
        signs: [{ face: "s", text: "POUNCE FC", at: 2.5, z: 32, color: "#4ade6a" }] });
      m.partition(h, 198, 30, 10, 1, [[3, 2]]); m.partition(h, 198, 39, 10, 1, [[6, 2]]);
      for (let i = 0; i < 3; i++) m.prop("box", 199.5 + i * 3, 24, { w: 1.6, d: 0.6, h: 10, side: "#1a1e2a", glow: "#ffb000", glowR: 8 });   // the trophies
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) m.prop("box", 200 + i * 4, 33 + j * 3, { w: 1.6, d: 0.8, h: 6, side: "#3a3f4e", screen: "#9ff7ff" });
      for (let i = 0; i < 3; i++) m.prop("bench", 200.5 + i * 3, 43.5);
      m.floorIn(198, 23, 10, 7, G.CARPET);
    }


    // ================= south of Convention Way =================
    garage(130, 104, 36, 34, "Garage B", [["n", 14, 4], ["w", 10, 3], ["e", 20, 3], ["s", 16, 3]]);
    m.driveway(144, 103, 4, 1, "n");                                          // the ramp out to Convention Way
    K.lots(m, rng, 170, 102, 38, 36, { styles: ["brick", "concrete"], floors: [3, 8], signs: ["MOTEL", "HOTEL", "BAR", "VACANCY"] });
    m.building({ x: 12, y: 102, w: 20, d: 14, floors: 8, style: "brick", name: "Hotel Calico", signs: [{ face: "s", text: "HOTEL CALICO", at: 4, z: 100, color: "#ff5266" }] });
    K.lots(m, rng, 36, 102, 72, 36, { styles: ["brick", "concrete", "office"], floors: [2, 6], signs: ["BAR", "PAWN", "24H", "DINER"] });

    // ---- Neon Street ----
    const NEON = ["BAR", "CLUB", "LIVE", "KARAOKE", "SAKE", "LOUNGE", "24H", "TATS", "SHOTS", "DISCO"];
    // Club Catnip
    {
      const c = m.structure({ x: 20, y: 140, w: 24, d: 18, floors: 3, style: "tower", name: "Club Catnip", doors: [["s", 10, 3], ["n", 3, 2], ["w", 6, 2]],
        signs: [{ face: "s", text: "CLUB CATNIP", at: 6, z: 32, color: "#4ade6a", size: 11 }] });
      m.partition(c, 21, 151, 22, 1, [[4, 3], [15, 3]]);
      m.partition(c, 34, 141, 1, 10, [[6, 2]]);
      m.partition(c, 35, 146, 8, 1, [[3, 2]]);
      m.floorIn(35, 141, 8, 5, G.CARPET);
      for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) m.daub({ type: "rect", x: 22 + i, y: 142 + j, x2: 23 + i, y2: 143 + j, fill: true, color: ["rgba(74,222,106,.32)", "rgba(84,242,255,.3)", "rgba(180,125,255,.32)", "rgba(255,82,102,.28)"][(i + j * 3) % 4] });
      m.prop("box", 27.5, 141.6, { w: 3, d: 0.8, h: 9, side: "#1a1a24", glow: "#4ade6a", screen: "#4ade6a" });
      for (let i = 0; i < 7; i++) m.prop("box", 35.5 + i, 149.4, { w: 1, d: 0.6, h: 8, side: "#3a2418", top: "#8a5a3a", glow: i % 2 ? "#4ade6a" : null });
      m.prop("box", 38.5, 143, { w: 3, d: 0.8, h: 5, side: "#1a5a3a" });
      m.light(28, 146, 6, "#4ade6a", 0.25);
      for (let i = 0; i < 8; i++) m.prop("bollard", 27.5 + i, 158.6);
    }
    // The Litter Box: a bar with booths, pool tables and a back room
    {
      const b = m.structure({ x: 54, y: 144, w: 18, d: 14, floors: 2, style: "brick", floor: G.WOOD, name: "The Litter Box", doors: [["s", 7, 2], ["n", 13, 2]],
        signs: [{ face: "s", text: "THE LITTER BOX", at: 2, z: 20, color: "#ffb000" }] });
      m.partition(b, 55, 149, 16, 1, [[11, 2]]);
      for (let i = 0; i < 6; i++) m.prop("box", 57.5 + i, 152.4, { w: 1, d: 0.6, h: 8, side: "#3a2418", top: "#8a5a3a", glow: i % 3 ? null : "#ffb000" });
      for (const a of [58, 65]) m.prop("box", a + 0.5, 155.5, { w: 2, d: 1.2, h: 5, side: "#3a2418", top: "#1a6a3a" });   // pool tables
      for (let i = 0; i < 3; i++) m.prop("box", 56.5 + i * 2.5, 146.5, { w: 1.8, d: 1, h: 4, side: "#5a2a2a" });    // the back room's booths
      m.prop("box", 68, 146, { w: 1.6, d: 0.8, h: 10, side: "#3a3f4e" });
      m.loot.push({ type: "uzi", ammo: 40, x: 69.5, y: 147.5 });
      m.light(63, 154, 4, "#ffb000", 0.22);
    }
    K.lots(m, rng, 76, 142, 30, 16, { styles: ["brick", "concrete"], floors: [2, 4], noAlley: true, signs: NEON });
    K.lots(m, rng, 126, 142, 82, 16, { styles: ["brick", "concrete", "tower"], floors: [2, 6], noAlley: true, signs: NEON });
    // the Purrcade, across the street
    {
      const a = m.structure({ x: 30, y: 166, w: 16, d: 12, floors: 2, style: "dept", name: "Purrcade", doors: [["n", 6, 3]], signs: [{ face: "s", text: "PURRCADE", at: 4, z: 22, color: "#ff8fd8" }] });
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) m.prop("box", 32.5 + i * 2, 169 + r * 3, { w: 0.8, d: 0.6, h: 14, side: "#1a1a24", screen: pick(["#ff8fd8", "#54f2ff", "#4ade6a", "#ffb000"]), glow: pick(["#ff8fd8", "#54f2ff", "#4ade6a"]), glowR: 6 });
      m.light(38, 172, 5, "#ff8fd8", 0.2);
      void a;
    }
    K.lots(m, rng, 10, 166, 18, 40, { styles: ["brick", "concrete"], floors: [2, 5], noAlley: true, signs: NEON });
    // two more bars on the south side of the strip
    {
      const k = m.structure({ x: 80, y: 166, w: 14, d: 12, floors: 2, style: "dept", name: "Nine Tails Karaoke", doors: [["n", 6, 2]], signs: [{ face: "s", text: "NINE TAILS", at: 3, z: 22, color: "#b47dff" }] });
      m.floorIn(81, 167, 12, 3, G.WOOD);
      m.prop("box", 87, 167.5, { w: 3, d: 0.6, h: 6, side: "#1a1a24", screen: "#b47dff", glow: "#b47dff" });
      for (let i = 0; i < 3; i++) m.prop("box", 82.5 + i * 4, 172, { w: 2.2, d: 1.2, h: 4, side: "#4a1a4a" });
      m.prop("box", 87, 176, { w: 6, d: 0.6, h: 8, side: "#3a2418", top: "#8a5a3a", glow: "#ffb000" });
      m.light(87, 171, 5, "#b47dff", 0.22);
      const s2 = m.structure({ x: 96, y: 166, w: 12, d: 11, floors: 2, style: "brick", floor: G.WOOD, name: "Sake Lantern", doors: [["n", 5, 2], ["w", 6, 2]], signs: [{ face: "s", text: "SAKE LANTERN", at: 0.6, z: 22, color: "#ff5266" }] });
      m.prop("box", 101.5, 168, { w: 6, d: 0.6, h: 8, side: "#3a2418", top: "#8a5a3a", glow: "#ff5266" });
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) m.prop("table", 99.5 + i * 5, 171.5 + j * 3);
      m.light(102, 171, 4, "#ff5266", 0.22);
      void k; void s2;
    }
    K.lots(m, rng, 50, 166, 28, 14, { styles: ["brick", "concrete"], floors: [3, 7], noAlley: true, signs: NEON });
    // the night market: an open square of stalls, lanterns and tables
    {
      m.fill(60, 183, 35, 21, G.PLAZA);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) { const c = ["#ff5266", "#ffb000", "#54f2ff", "#ff8fd8", "#4ade6a"][(i + r) % 5]; m.prop("kiosk", 63.5 + i * 4.6, 186.5 + r * 6, { color: c }); m.light(64 + i * 4.6, 188, 1.8, c, 0.18); }
      for (let i = 0; i < 6; i++) m.prop("table", 65.5 + i * 5, 201.5, { umbrella: ["#a8326a", "#1f8a8a", "#c98a1a"][i % 3] });
      m.crowd(77, 192, 9, 18);
      K.lots(m, rng, 50, 182, 9, 24, { styles: ["brick", "concrete"], floors: [2, 5], noAlley: true });
      K.lots(m, rng, 96, 182, 12, 24, { styles: ["brick", "concrete"], floors: [2, 5], noAlley: true });
      K.lots(m, rng, 60, 205, 35, 3, { styles: ["brick"], floors: [2, 3], noAlley: true });
    }
    // Lantern Square: a fountain, benches and trees behind the arcade
    {
      m.fill(30, 181, 18, 19, G.PLAZA);
      m.fill(36, 187, 5, 5, G.WATER); m.prop("spout", 38.5, 189.5); m.light(38.5, 189.5, 4, "#54f2ff", 0.18);
      for (const [x, y] of [[33, 184], [44, 184], [33, 196], [44, 196]]) m.prop("tree", x + 0.5, y + 0.5);
      for (const [x, y] of [[35, 194], [42, 194], [35, 185], [42, 185]]) m.prop("bench", x + 0.5, y + 0.5);
      K.lots(m, rng, 30, 201, 18, 5, { styles: ["brick"], floors: [2, 4], noAlley: true });
    }
    // the old expo hall: derelict, boarded, and somebody's den
    {
      K.lots(m, rng, 126, 166, 82, 12, { styles: ["brick", "concrete", "office"], floors: [3, 9], noAlley: true, signs: NEON });
      const o = m.structure({ x: 140, y: 181, w: 32, d: 24, floors: 3, style: "metal", name: "Old Expo Hall", doors: [["w", 9, 3], ["n", 6, 2], ["s", 22, 3]],
        signs: [{ face: "s", text: "EXPO HALL 2", at: 11, z: 32, color: "#3a3f4e" }] });
      for (let i = 0; i < 26; i++) m.prop("crate", 142.5 + rng() * 28, 183.5 + rng() * 20);
      for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) m.prop("box", 146 + i * 6, 186 + r * 8, { w: 2.6, d: 1.6, h: 5, side: "#2a2a30", top: "#3a3a40" });   // the old booths
      m.partition(o, 141, 197, 12, 1, [[8, 3]]);
      m.floorIn(141, 198, 12, 6, G.CARPET);
      m.prop("box", 146, 201, { w: 3, d: 1, h: 4, side: "#5a2a2a" }); m.prop("box", 149, 199, { w: 1, d: 2, h: 4, side: "#5a2a2a" });   // a couch, salvaged
      for (const [x, y] of [[144.5, 200.5], [151.5, 202.5]]) { m.prop("barrel", x, y, { color: "#5a3a2a" }); m.light(x, y, 3, "#ff8a3c", 0.3); }   // barrel fires
      m.loot.push({ type: "uzi", ammo: 50, x: 150.5, y: 201.5 });
      K.lots(m, rng, 126, 181, 12, 25, { styles: ["brick", "concrete"], floors: [3, 7], noAlley: true });
      K.lots(m, rng, 174, 181, 34, 25, { styles: ["brick", "concrete", "office"], floors: [3, 8], signs: NEON });
    }
    // Neon Street's pavements: terraces, stalls, signs on poles
    for (let x = 14; x < 206; x += 11) {
      if ((x > 106 && x < 128)) continue;
      m.prop("table", x + 0.5, 158.5, { umbrella: ["#ff5266", "#b47dff", "#54f2ff", "#ffb000"][(x / 11 | 0) % 4] });
      m.prop("blade", x + 5.5, 165.4, { text: NEON[(x / 11 | 0) % NEON.length], color: ["#ff8fd8", "#54f2ff", "#4ade6a", "#ffb000"][(x / 11 | 0) % 4], z: 10, pole: true });
    }
    for (const x of [24, 70, 140, 176]) m.crowd(x, 159, 3, 6);
    for (const x of [86, 101, 52]) m.crowd(x, 165, 2.5, 5);
    for (let x = 12; x < 208; x += 8) { m.prop("lamp", x + 0.5, 159.6); m.light(x + 0.7, 160, 2.4, "#ff8fd8", 0.22); m.prop("lamp", x + 4.5, 164.4); m.light(x + 4.7, 164.8, 2.4, "#54f2ff", 0.2); }
    K.lots(m, rng, 10, 214, 98, 9, { styles: ["brick", "concrete"], floors: [2, 4], noAlley: true });
    K.lots(m, rng, 126, 214, 82, 9, { styles: ["brick", "concrete"], floors: [2, 4], noAlley: true });
    // the edges of the map, closed by narrow buildings with passages between them
    for (const [x, y, w, d] of [[8, 0, 104, 3], [122, 0, 88, 3], [214, 0, 10, 3], [0, 8, 3, 88], [0, 100, 3, 60], [0, 164, 3, 46], [0, 214, 3, 10]])
      K.lots(m, rng, x, y, w, d, { styles: ["brick", "concrete", "office"], floors: [3, 8], noAlley: true, maxLot: 10 });
    K.lots(m, rng, 214, 8, 10, 88, { styles: ["brick", "concrete"], floors: [3, 7], maxLot: 9 });
    K.lots(m, rng, 214, 100, 10, 60, { styles: ["brick", "concrete"], floors: [3, 7], maxLot: 9 });
    K.lots(m, rng, 214, 164, 10, 46, { styles: ["brick", "concrete"], floors: [3, 7], maxLot: 9 });
    // two footbridges over the light rail: with the street crossings, the only ways across
    m.footbridge("y", 116, 26, 8, 4, 24);
    m.footbridge("y", 116, 126, 8, 4, 24);
    K.signals(m);

    // ---- mission points ----
    for (const [x, y, n] of [[9.5, 9.5, "the Highway at North Road"], [109.5, 9.5, "Expo Avenue at North Road"], [9.5, 100.5, "the Highway at Convention Way"], [109.5, 100.5, "Expo Avenue at Convention Way"],
      [207.5, 100.5, "East Boulevard at Convention Way"], [9.5, 164.5, "the Highway at Neon Street"], [109.5, 164.5, "Expo Avenue at Neon Street"], [207.5, 164.5, "East Boulevard at Neon Street"],
      [126.5, 90.5, "the light rail stop"], [126.5, 172.5, "the Neon Street rail stop"], [207.5, 9.5, "East Boulevard at North Road"], [60.5, 208.5, "South Road"],
      [60.5, 93.5, "the south edge of the expo plaza"], [129, 41, "the north footbridge"], [124.5, 137.5, "the south footbridge"], [100.5, 70.5, "Garage A"],
      [146, 99.5, "Garage B's ramp"], [196.5, 70.5, "behind the arena"], [39, 199, "Lantern Square"], [77.5, 203.5, "the night market"], [130.5, 207.5, "South Road, east"],
      [3.5, 130.5, "the Highway, west side"], [216.5, 98, "East Boulevard, east side"], [190.5, 92.5, "the arena lot"]])
      m.point("spawn", x, y, n);
    for (const [x, y, n] of [[0.5, 5.5, "the west end of North Road"], [5.5, 0.5, "the Highway north"], [5.5, 223.5, "the Highway south"], [0.5, 97.5, "the west end of Convention Way"],
      [223.5, 98.5, "the east end of Convention Way"], [0.5, 161.5, "the west end of Neon Street"], [223.5, 162.5, "the east end of Neon Street"], [113.5, 0.5, "the north end of Expo Avenue"],
      [114.5, 223.5, "the south end of Expo Avenue"], [211.5, 223.5, "the south end of East Boulevard"]])
      m.point("exit", x, y, n);
    const T = (area, list) => { for (const [x, y, n] of list) m.point("target", x, y, n, area); };
    T("The Convention Center", [[50, 64, "the grand lobby"], [35, 44, "the exhibit hall"], [70, 31.5, "the ballroom stage"], [70, 49, "the ballroom"], [59, 24, "the security office"], [68, 25, "the kitchen"],
      [44, 27, "the offices"], [79, 25, "the loading bay"], [18.5, 22, "a meeting room"]]);
    T("The Expo Plaza", [[66, 86, "the expo plaza"], [30.5, 88.5, "the food trucks"], [50, 76, "the fountain"]]);
    T("Garage A", [[100, 50, "level one of Garage A"]]);
    T("Garage B", [[150, 124, "level one of Garage B"]]);
    T("The Arena", [[166, 44, "the arena stage"], [166, 56, "the arena floor"]]);
    T("Club Catnip", [[28, 147, "the dance floor at Club Catnip"], [38.5, 144.5, "the VIP room at Club Catnip"], [38.5, 150.5, "the bar at Club Catnip"]]);
    T("The Litter Box", [[63, 154, "the bar at The Litter Box"], [64, 146.5, "the back room of The Litter Box"]]);
    T("The Purrcade", [[39, 174, "the Purrcade"]]);
    T("Neon Street", [[90, 161.5, "Neon Street"], [168, 161.5, "the east end of the strip"], [70, 158.5, "a terrace on Neon Street"]]);
    T("The Loading Dock", [[50, 10.5, "the loading dock"]]);
    T("Rail Yard Market", [[130.5, 55, "the Rail Yard Market"], [130.5, 68, "the market's south stalls"]]);
    T("Pounce FC", [[202, 27, "the Pounce FC trophy room"], [203, 45, "the Pounce FC locker room"]]);
    T("The Arena", [[166, 22, "the arena's north gate"], [146, 71, "the tailgate party"]]);
    T("The Night Market", [[77, 195, "the middle of the night market"], [70, 201, "the night market's tables"]]);
    T("Lantern Square", [[38.5, 196, "Lantern Square"]]);
    T("The Old Expo Hall", [[147, 200, "the den in the old expo hall"], [156, 192, "the old expo hall floor"]]);
    T("Nine Tails Karaoke", [[87, 170, "the karaoke stage"], [84, 174.5, "the karaoke booths"]]);
    T("Sake Lantern", [[101.5, 172, "the Sake Lantern"]]);
    T("The Footbridges", [[120, 31, "the north footbridge"], [120, 131, "the south footbridge"]]);
  },
});
