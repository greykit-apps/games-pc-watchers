/* Downtown: one city, 224 tiles a side, every street of it walkable in every
 * mission. Five avenues each way on a 44-tile grid, a tram line across the
 * middle-south, and on the blocks between them:
 *
 *            First St   Second St   Third St    Fourth St    Fifth St
 *            (x 6)      (x 50)      (x 94)      (x 138)      (x 182)
 *  Harbor St (y 6)
 *    row 0   Old Town   offices     PumaCorp    the Purrington  parking garage
 *  Benton Av (y 50)
 *    row 1   Old Town   Nine Lives  PVN Tower   Benton twins    St. Whiskers
 *  Market St (y 94)
 *    row 2   cathedral  MARKET      the towers  the precinct    City Hall
 *  Crown St  (y 138)                PLAZA
 *    row 3   ---- the tram, y 158..161, stops at Old Town, Central, Fifth ----
 *  Lantern St (y 182)
 *    row 4   Pounce Park            Lantern Row apartments      apartments
 *
 * Market Plaza is the block at x 54..93, y 98..137: the first contract's
 * coordinates are that block's own, offset by (44, 88). */
"use strict";

W.district({
  id: "downtown", name: "Downtown", w: 224, h: 224, seed: 1112,
  blurb: "Towers, Market Plaza, PVN Tower, the tram, the precinct and the cathedral: Casey Benton's front yard.",
  names: { targets: ["Mama Mittens", "Johnny Two-Tails", "The Alley Duchess", "Snowball Sorrento", "Rex Gutterpaw"], crew: "the Gutter Saints", sec: "City police", guard: "Bodyguard", henchman: "Gutter Saint", civ: "Pedestrian" },
  theme: {
    racket: "protection money from every shop between the Precinct and the Plaza",
    secNote: "City police walk the beat Downtown. They do not know who you are, and the precinct is full of them. Keep weapons holstered near them.",
    ground: "Long avenues with traffic and a tram, alleys behind every block, and buildings you can walk into.",
    guards: 4, crew: 10, sec: 10, civ: 0.0035, civMax: 110,
    crewGuns: ["pistol", "pistol", "uzi", "shotgun"],
    secLook: () => ({ coat: "#28469a", trim: "#ffd04a", legs: "#1a2a5a", fur: W.pick(W.FURS), hat: "#16285c", hatKind: "cap" }),
  },
  sections: [],

  build(m, rng) {
    const G = W.G, K = W.K;
    const S = [6, 50, 94, 138, 182];
    const ROW = { 6: "Harbor Street", 50: "Benton Avenue", 94: "Market Street", 138: "Crown Street", 182: "Lantern Street" };
    const COL = { 6: "First Street", 50: "Second Street", 94: "Third Street", 138: "Fourth Street", 182: "Fifth Street" };
    const BX = [10, 54, 98, 142, 186], BS = [40, 40, 40, 40, 38];
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const pick = a => a[Math.floor(rng() * a.length)];
    m.fill(0, 0, 224, 224, G.WALK);
    for (const s of S) { m.street("x", s, 2); m.street("y", s, 2); }
    const SIGNS = ["BAR", "EAT", "PAWN", "NAILS", "NIP", "OPEN", "HOTEL", "LIVE", "24H", "KEYS", "TAX", "LOANS", "TATS", "SUSHI", "RAMEN", "VET"];

    // ---- the edges: a strip of narrow buildings beyond First Street and Harbor Street ----
    for (let j = 0; j < 5; j++) {
      const y0 = BX[j], len = BS[j];
      for (let t = 0; t < len;) { const l = Math.min(ri(6, 11), len - t); m.building({ x: 0, y: y0 + t, w: 5, d: l - (t + l < len ? 1 : 0), floors: ri(2, 7), style: pick(["brick", "office", "concrete"]) }); m.fill(0, y0 + t + l - 1, 5, 1, G.ALLEY); t += l; }
      const x0 = BX[j];
      for (let t = 0; t < len;) { const l = Math.min(ri(6, 11), len - t); m.building({ x: x0 + t, y: 0, w: l - (t + l < len ? 1 : 0), d: 5, floors: ri(3, 9), style: pick(["glass", "office", "concrete"]) }); m.fill(x0 + t + l - 1, 0, 1, 5, G.ALLEY); t += l; }
    }
    m.building({ x: 0, y: 0, w: 5, d: 5, floors: 9, style: "tower", roofKit: "beacon" });

    // a plain block of lots, with lamps on its pavements
    const plain = (i, j, o) => {
      K.lots(m, rng, BX[i] + 2, BX[j] + 2, BS[i] - 4, BS[j] - 4, Object.assign({ signs: SIGNS }, o));
      K.dress(m, rng, BX[i], BX[j], BS[i], BS[j]);
    };

    // ================= row 0 =================
    plain(0, 0, { styles: ["brick", "brick", "concrete"], floors: [2, 4] });
    plain(1, 0, { styles: ["office", "concrete", "glass"], floors: [3, 7] });
    // PumaCorp HQ: a tower on a forecourt, lots behind
    {
      const x = BX[2], y = BX[0];
      m.fill(x + 2, y + 20, 36, 18, G.PLAZA);
      m.building({ x: x + 12, y: y + 22, w: 14, d: 12, floors: 20, style: "glass", roofKit: "beacon", name: "PumaCorp HQ", signs: [{ face: "s", text: "PUMACORP", at: 3.5, z: 250, color: "#54f2ff", size: 12 }] });
      K.lots(m, rng, x + 2, y + 2, 36, 16, { styles: ["office", "concrete"], floors: [4, 8], noAlley: true });
      for (const [a, b] of [[6, 24], [32, 24], [6, 34], [32, 34]]) m.prop("planter", x + a + 0.5, y + b + 0.5);
      K.dress(m, rng, x, y, 40, 40, 8, "#9ff7ff");
    }
    // the Purrington: a hotel tower
    {
      const x = BX[3], y = BX[0];
      m.building({ x: x + 4, y: y + 4, w: 14, d: 14, floors: 16, style: "tower", name: "The Purrington", signs: [{ face: "s", text: "THE PURRINGTON", at: 0.6, z: 200, color: "#ffb000" }] });
      m.prop("blade", x + 18.06, y + 10, { text: "HOTEL", color: "#ff5266", z: 24 });
      K.lots(m, rng, x + 22, y + 2, 16, 36, { styles: ["brick", "office"], floors: [3, 6], signs: SIGNS });
      K.lots(m, rng, x + 2, y + 22, 18, 16, { styles: ["concrete", "brick"], floors: [2, 5], noAlley: true });
      K.dress(m, rng, x, y, 40, 40);
    }
    // the parking garage: you can walk in among the cars
    {
      const x = BX[4], y = BX[0];
      const g = m.structure({ x: x + 3, y: y + 3, w: 30, d: 30, floors: 3, style: "parkade", name: "Fifth Street Garage", doors: [["s", 4, 4], ["s", 20, 4], ["w", 12, 4], ["n", 13, 3]],
        signs: [{ face: "s", text: "PARKING", at: 11, z: 32, color: "#54f2ff" }] });
      for (let i = x + 6; i < x + 32; i += 5) for (let j = y + 6; j < y + 32; j += 7) m.prop("box", i + 0.5, j + 0.5, { w: 0.5, d: 0.5, h: 40, side: "#4a4e58", blocks: true });
      for (let j = y + 5; j < y + 32; j += 7) for (let i = x + 5; i < x + 32; i += 2.2) if (rng() < 0.6) m.park(i, j + 2, "y", null, 1);
      m.floorIn(x + 4, y + 4, 28, 28, G.PARK);
      // the ramps out: to Benton Avenue, Fifth Street and Harbor Street
      m.driveway(x + 7, y + 33, 4, 1, "s"); m.driveway(x + 23, y + 33, 4, 1, "s"); m.driveway(x + 2, y + 16, 1, 4, "w"); m.driveway(x + 16, y + 2, 3, 1, "n");
      m.prop("lamp", x + 18.5, y + 18.5); m.light(x + 18.7, y + 18.9, 4, "#fff3c4", 0.18);
      K.dress(m, rng, x, y, 38, 40);
    }

    // ================= row 1 =================
    plain(0, 1, { styles: ["brick", "brick", "concrete"], floors: [2, 4], signs: ["DINER", "PAWN", "BAR", "TATS", "LOANS"] });
    // Club Nine Lives: queue out front, a dance floor, the bar, the VIP room
    {
      const x = BX[1], y = BX[1];
      const c = m.structure({ x: x + 4, y: y + 6, w: 22, d: 18, floors: 3, style: "tower", name: "Club Nine Lives", doors: [["s", 9, 3], ["n", 3, 2], ["e", 6, 2]],
        signs: [{ face: "s", text: "NINE LIVES", at: 6, z: 32, color: "#ff8fd8", size: 11 }] });
      m.partition(c, x + 5, y + 17, 20, 1, [[4, 3], [13, 3]]);           // lobby | floor
      m.partition(c, x + 17, y + 7, 1, 10, [[6, 2]]);                    // floor | bar and VIP
      m.partition(c, x + 18, y + 12, 7, 1, [[2, 2]]);                    // VIP | bar
      m.floorIn(x + 18, y + 7, 7, 5, G.CARPET);
      // the dance floor: tiles in four colours
      for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) m.daub({ type: "rect", x: x + 6 + i, y: y + 8 + j, x2: x + 7 + i, y2: y + 9 + j, fill: true, color: ["rgba(255,82,102,.35)", "rgba(84,242,255,.3)", "rgba(180,125,255,.35)", "rgba(255,176,0,.3)"][(i + j * 3) % 4] });
      m.prop("box", x + 10.5, y + 7.6, { w: 3, d: 0.8, h: 9, side: "#1a1a24", glow: "#54f2ff", screen: "#54f2ff" });   // the DJ booth
      for (const [a, b] of [[5.6, 7.6], [15.4, 7.6]]) m.prop("box", x + a, y + b, { w: 0.8, d: 0.8, h: 16, side: "#101014", blocks: true });
      for (let i = 0; i < 6; i++) m.prop("box", x + 18.5 + i, y + 15.4, { w: 1, d: 0.6, h: 8, side: "#3a2418", top: "#8a5a3a", glow: i % 2 ? "#ffb000" : null });
      m.prop("box", x + 20.5, y + 9.5, { w: 2.4, d: 0.8, h: 5, side: "#5a1a3a" }); m.prop("box", x + 22.5, y + 8, { w: 2, d: 0.6, h: 5, side: "#5a1a3a" });
      m.prop("box", x + 7, y + 19.5, { w: 2, d: 0.6, h: 8, side: "#3a3f4e" });                   // coat check
      m.light(x + 11, y + 12, 6, "#b47dff", 0.25);
      // the queue outside, behind the rope
      m.fill(x + 2, y + 25, 36, 12, G.PLAZA);
      for (let i = 0; i < 8; i++) m.prop("bollard", x + 10.5 + i, y + 26.6);
      m.prop("blade", x + 26.06, y + 10, { text: "CLUB", color: "#ff8fd8", z: 26 });   // clear of the side door
      K.lots(m, rng, x + 28, y + 2, 10, 22, { styles: ["brick"], floors: [2, 4], noAlley: true, signs: ["BAR", "MILK BAR", "LIVE"] });
      m.prop("truck", x + 32.5, y + 32.5, { color: "#c83a6a" });
      K.dress(m, rng, x, y, 40, 40, 8, "#ff8fd8");
    }
    // PVN Tower: Casey Benton's, with her theater at its foot
    {
      const x = BX[2], y = BX[1];
      m.fill(x + 2, y + 2, 36, 36, G.PLAZA);
      m.building({ x: x + 16, y: y + 4, w: 14, d: 14, floors: 26, style: "tower", roofKit: "beacon", name: "PVN Tower", signs: [{ face: "s", text: "PVN", at: 5.5, z: 330, color: "#ffb000", size: 16 }, { face: "e", text: "BENTON", at: 3.5, z: 300, color: "#ffb000", size: 12 }] });
      const t = m.structure({ x: x + 3, y: y + 21, w: 24, d: 15, floors: 3, style: "dept", name: "PVN Theater", doors: [["s", 9, 4], ["n", 3, 2], ["e", 5, 2]],
        signs: [{ face: "s", text: "PVN THEATER", at: 6, z: 32, color: "#b47dff", size: 11 }] });
      m.partition(t, x + 4, y + 30, 22, 1, [[3, 3], [16, 3]]);           // auditorium | lobby
      m.floorIn(x + 4, y + 22, 22, 2, G.WOOD);                            // the stage
      m.floorIn(x + 4, y + 25, 22, 5, G.CARPET);
      for (let r = 0; r < 4; r++) for (let i = 0; i < 20; i++) if (i !== 4 && i !== 15) m.prop("box", x + 5 + i, y + 25.5 + r * 1.2, { w: 0.9, d: 0.5, h: 4, side: "#6a1a2a" });
      for (const a of [4.6, 25.4]) m.prop("box", x + a, y + 22.5, { w: 0.6, d: 0.6, h: 22, side: "#5a1a2a", blocks: true });   // curtains
      m.light(x + 15, y + 23, 5, "#ffcf6b", 0.25);
      m.prop("box", x + 8, y + 32.5, { w: 2, d: 0.6, h: 8, side: "#3a2418", glow: "#ffb000" });   // the box office
      for (const [a, b] of [[32, 24], [36, 24], [32, 30], [36, 30]]) m.prop("planter", x + a + 0.5, y + b + 0.5);
      m.prop("spout", x + 34, y + 34); m.light(x + 34, y + 34, 3, "#54f2ff", 0.15);
      // Casey Benton's own guard: posts all round the tower, and at the theater doors
      for (const [a, b, d] of [[15, 3, -1.6], [30, 3, -1.6], [14.5, 6, 3.1], [14.5, 15, 3.1], [31, 6, 0], [31, 15, 0], [15, 19, 1.6], [22.5, 19.5, 1.6], [30, 19, 1.6],
        [10, 2.5, -2.4], [37, 2.5, -0.8], [37, 19, 0.8], [2.5, 19, 2.4], [13, 37, 1.6], [17, 37, 1.6], [36.5, 28, 0]]) m.garrison(x + a, y + b, d, "benton");
      for (const [a, b] of [[14, 2], [31, 2], [14, 19], [31, 19]]) { m.prop("flood", x + a, y + b); m.light(x + a, y + b + 0.5, 5, "#fffbe8", 0.2); }
      m.fill(x + 32, y + 32, 4, 4, G.WATER);
      K.dress(m, rng, x, y, 40, 40, 8, "#ffcf6b");
    }
    // the Benton twins
    {
      const x = BX[3], y = BX[1];
      m.fill(x + 2, y + 2, 36, 36, G.PLAZA);
      m.building({ x: x + 4, y: y + 5, w: 12, d: 12, floors: 18, style: "glass", name: "Benton One", signs: [{ face: "s", text: "BENTON ONE", at: 1.2, z: 230, color: "#ffb000" }] });
      m.building({ x: x + 22, y: y + 18, w: 12, d: 12, floors: 22, style: "glass", roofKit: "beacon", name: "Benton Two", signs: [{ face: "s", text: "BENTON TWO", at: 1.2, z: 280, color: "#ffb000" }] });
      for (let i = 0; i < 6; i++) m.prop("tree", x + 6 + i * 5 + 0.5, y + 34.5);
      for (const [a, b] of [[8, 22], [12, 26], [26, 8], [30, 12]]) m.prop("bench", x + a + 0.5, y + b + 0.5);
      K.dress(m, rng, x, y, 40, 40, 8, "#9ff7ff");
    }
    // St. Whiskers Hospital, with its ambulance bay
    {
      const x = BX[4], y = BX[1];
      const h = m.structure({ x: x + 3, y: y + 3, w: 28, d: 22, floors: 7, style: "office", name: "St. Whiskers Hospital", doors: [["s", 12, 3], ["w", 8, 2], ["n", 6, 2]],
        signs: [{ face: "s", text: "ST. WHISKERS", at: 8, z: 92, color: "#ff5266", size: 11 }, { face: "s", text: "EMERGENCY", at: 11, z: 22, color: "#ff5266" }] });
      m.partition(h, x + 4, y + 17, 26, 1, [[5, 2], [18, 2]]);              // the ER and waiting room | the rest
      m.partition(h, x + 17, y + 4, 1, 13, [[6, 2]]);                       // the wards | theatre and pharmacy
      m.partition(h, x + 18, y + 10, 12, 1, [[3, 2]]);                      // theatre | pharmacy
      for (let i = 0; i < 4; i++) m.prop("bench", x + 6.5 + i * 3, y + 22.5);
      m.prop("box", x + 21, y + 19, { w: 4, d: 0.8, h: 8, side: "#c8ccd4", top: "#e8e4dc", screen: "#4ade6a" });   // reception
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) m.prop("box", x + 5.5 + i * 3, y + 5.5 + r * 4, { w: 1, d: 1.8, h: 5, side: "#c8ccd4", top: "#f2eefa" });   // the beds
      m.prop("box", x + 23.5, y + 7, { w: 2, d: 1, h: 6, side: "#8a90a0", top: "#c8ccd4" }); m.light(x + 23.5, y + 7, 3, "#e8fbff", 0.3);   // the operating table
      for (let i = 0; i < 4; i++) m.prop("box", x + 19.5 + i * 2.5, y + 15.4, { w: 1.6, d: 0.5, h: 14, side: "#3a3f4e", screen: "#ff5266" });   // pharmacy shelves
      m.loot.push({ type: "medikit", ammo: 1, x: x + 21.5, y: y + 13.5 }, { type: "medikit", ammo: 1, x: x + 25.5, y: y + 13.5 });
      m.floorIn(x + 18, y + 4, 12, 6, G.INDOOR);
      m.fill(x + 3, y + 27, 32, 10, G.TARMAC);
      for (let i = 0; i < 4; i++) m.park(x + 6 + i * 4, y + 29.5, "y", "#e8e4dc", 1);
      m.driveway(x + 14, y + 36, 4, 1, "s");                                  // out to Market Street
      m.prop("flood", x + 20, y + 35); m.light(x + 20, y + 35.5, 5, "#fffbe8", 0.2);
      m.prop("box", x + 33, y + 10, { w: 1.6, d: 1.6, h: 10, side: "#5a6070" });
      K.dress(m, rng, x, y, 38, 40);
    }

    // ================= row 2 =================
    // St. Felis Cathedral, and its churchyard
    {
      const x = BX[0], y = BX[2];
      m.fill(x + 2, y + 2, 36, 36, G.GRASS);
      m.fill(x + 6, y + 30, 28, 8, G.PLAZA);
      // the nave runs north to south under a steep roof, its gabled front on the plaza
      m.structure({ x: x + 12, y: y + 3, w: 16, d: 28, floors: 4, style: "church", pitch: "y", ridge: 26, roof: "#3a3442", floor: G.WOOD, name: "St. Felis Cathedral",
        doors: [["s", 6, 4], ["w", 12, 2], ["e", 12, 2]] });
      m.floorIn(x + 13, y + 4, 14, 4, G.CARPET);                                       // the chancel
      m.prop("box", x + 20, y + 5.5, { w: 4, d: 1, h: 7, side: "#e8e4dc", top: "#f2eefa", glow: "#ffcf6b", glowR: 14 });   // the altar
      for (const a of [17.5, 22.5]) m.prop("box", x + a, y + 5.5, { w: 0.3, d: 0.3, h: 10, side: "#c8a050", glow: "#ffcf6b" });
      for (let r = 0; r < 8; r++) for (const a of [15.5, 24.5]) m.prop("box", x + a, y + 11 + r * 2, { w: 5, d: 0.6, h: 4, side: "#5a3a24" });
      m.light(x + 20, y + 16, 7, "#ffcf6b", 0.12);
      // the bell tower, beside the front
      m.building({ x: x + 29, y: y + 25, w: 3, d: 3, floors: 8, style: "church", roofKit: "spire", name: "The bell tower" });
      for (let i = 0; i < 14; i++) m.prop("grave", x + 3 + (i % 2) * 1.5 + 0.5, y + 6 + (i >> 1) * 3 + 0.5, { cross: i % 3 === 0 });
      for (let i = 0; i < 8; i++) m.prop("grave", x + 34 + (i % 2) * 1.5 + 0.5, y + 12 + (i >> 1) * 3 + 0.5, { cross: i % 2 === 0 });
      for (const [a, b] of [[3, 3], [3, 34], [36, 34], [36, 26]]) m.prop("tree", x + a + 0.5, y + b + 0.5);
      for (let i = 2; i < 38; i++) { m.prop("fence", x + i + 0.5, y + 1.5, { axis: "x" }); if (i < 6 || i > 33) m.prop("fence", x + i + 0.5, y + 38.5, { axis: "x" }); }
      for (let j = 2; j < 38; j++) { m.prop("fence", x + 1.5, y + j + 0.5, { axis: "y" }); m.prop("fence", x + 38.5, y + j + 0.5, { axis: "y" }); }
      K.dress(m, rng, x, y, 40, 40);
    }
    // Market Plaza
    W.plazaBlock(m, BX[1] - 10, BX[2] - 10);
    // the towers: the financial district on one plaza
    {
      const x = BX[2], y = BX[2];
      m.fill(x + 2, y + 2, 36, 36, G.PLAZA);
      m.building({ x: x + 4, y: y + 4, w: 12, d: 12, floors: 18, style: "glass", name: "First Catnip Bank", signs: [{ face: "s", text: "FIRST CATNIP BANK", at: 0.5, z: 230, color: "#4ade6a", size: 8 }] });
      m.building({ x: x + 24, y: y + 6, w: 12, d: 12, floors: 23, style: "tower", roofKit: "beacon", name: "Meridian Tower" });
      m.building({ x: x + 6, y: y + 24, w: 14, d: 12, floors: 15, style: "glass", name: "Kitt & Kaboodle" });
      m.fill(x + 25, y + 25, 6, 6, G.WATER); m.prop("spout", x + 28, y + 28); m.light(x + 28, y + 28, 4, "#54f2ff", 0.18);
      for (const [a, b] of [[23, 23], [33, 23], [23, 33], [33, 33]]) m.prop("bench", x + a + 0.5, y + b + 0.5);
      for (const [a, b] of [[20, 4], [20, 12], [36, 21], [4, 20]]) m.prop("tree", x + a + 0.5, y + b + 0.5);
      K.dress(m, rng, x, y, 40, 40, 8, "#9ff7ff");
    }
    // the Downtown Precinct
    {
      const x = BX[3], y = BX[2];
      const p = m.structure({ x: x + 4, y: y + 4, w: 30, d: 22, floors: 3, style: "concrete", name: "Downtown Precinct", doors: [["s", 13, 3], ["e", 4, 2], ["n", 20, 2]],
        signs: [{ face: "s", text: "POLICE", at: 12.5, z: 32, color: "#4c8dff", size: 11 }] });
      m.partition(p, x + 5, y + 20, 28, 1, [[6, 2], [20, 2]]);                // lobby | inside
      m.partition(p, x + 16, y + 5, 1, 15, [[2, 2], [11, 2]]);                 // offices | armory, and the corridor
      m.partition(p, x + 17, y + 11, 16, 1);                                   // armory | cells
      m.partition(p, x + 23, y + 5, 1, 6, [[2, 2]]);                           // armory | locker room
      for (const a of [22, 26, 30]) m.partition(p, x + a, y + 12, 1, 4);      // the cells
      for (let a = 17; a < 33; a++) m.prop("bars", x + a + 0.5, y + 16.5, { axis: "x" });
      m.floorIn(x + 5, y + 5, 11, 15, G.CARPET);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) m.prop("box", x + 7.5 + i * 5, y + 7.5 + r * 4, { w: 1.6, d: 0.8, h: 6, side: "#4a3a2a", screen: "#9ff7ff" });
      for (let i = 0; i < 3; i++) m.prop("box", x + 18.5 + i * 1.4, y + 5.6, { w: 1, d: 0.4, h: 14, side: "#3a3f4e" });     // the armory racks
      m.loot.push({ type: "shotgun", ammo: 24, x: x + 19.5, y: y + 8.5 }, { type: "uzi", ammo: 60, x: x + 21.5, y: y + 8.5 });
      m.prop("box", x + 18, y + 22.6, { w: 6, d: 0.8, h: 8, side: "#3a3f4e", top: "#5a6070", screen: "#4c8dff" });   // the front desk
      for (let i = 0; i < 3; i++) m.prop("bench", x + 7.5 + i * 2, y + 23.5);
      m.fill(x + 4, y + 28, 30, 9, G.TARMAC);
      for (let i = 0; i < 6; i++) m.park(x + 6 + i * 4.5, y + 31, "y", i % 2 ? "#e8e4dc" : "#1a1a20", 1);
      m.driveway(x + 8, y + 36, 4, 1, "s"); m.driveway(x + 33, y + 30, 1, 4, "e");   // out to Crown Street and Fifth Street
      m.prop("flood", x + 35, y + 30); m.light(x + 35, y + 30.5, 5, "#fffbe8", 0.2);
      K.dress(m, rng, x, y, 40, 40, 8, "#9ab8ff");
    }
    // City Hall, with its steps and flags
    {
      const x = BX[4], y = BX[2];
      m.fill(x + 2, y + 2, 34, 36, G.GRASS);
      const ch = m.structure({ x: x + 6, y: y + 6, w: 24, d: 16, floors: 4, style: "concrete", name: "City Hall", doors: [["s", 10, 4], ["w", 6, 2], ["e", 6, 2]],
        signs: [{ face: "s", text: "CITY HALL", at: 2.5, z: 46, color: "#ffcf6b", size: 11 }] });
      m.partition(ch, x + 7, y + 15, 22, 1, [[4, 2], [15, 2]]);             // the rotunda | the chamber and offices
      m.partition(ch, x + 18, y + 7, 1, 8, [[3, 2]]);                       // the council chamber | the mayor and the records
      m.partition(ch, x + 19, y + 11, 10, 1, [[2, 2]]);                     // the mayor's office | the records room
      m.prop("statue", x + 18, y + 18);                                     // a puma, in the rotunda
      m.floorIn(x + 7, y + 7, 11, 8, G.CARPET);
      for (let r = 0; r < 3; r++) m.prop("box", x + 12.5, y + 10 + r * 1.5, { w: 8, d: 0.6, h: 4, side: "#5a3a24" });   // the council's benches
      m.prop("box", x + 12.5, y + 7.6, { w: 4, d: 0.8, h: 7, side: "#3a2418", top: "#8a5a3a" });   // the dais
      m.floorIn(x + 19, y + 7, 10, 4, G.CARPET);
      m.prop("box", x + 24, y + 8.5, { w: 3, d: 1, h: 6, side: "#3a2418", top: "#8a5a3a", screen: "#ffcf6b" });   // the mayor's desk
      m.prop("banner", x + 27.5, y + 7.5, { color: "#ffb000" });
      for (let i = 0; i < 4; i++) m.prop("box", x + 20.5 + i * 2.2, y + 13, { w: 0.5, d: 1.6, h: 14, side: "#5a3a24", top: "#7a5a3a" });   // the records
      m.light(x + 18, y + 18, 5, "#ffcf6b", 0.15);
      m.fill(x + 6, y + 22, 24, 10, G.PLAZA);
      for (let i = 0; i < 8; i++) m.prop("box", x + 7.5 + i * 3, y + 22.6, { w: 0.7, d: 0.7, h: 40, side: "#c8c4bc", top: "#e8e4dc" });
      for (const [a, c] of [[8, "#54f2ff"], [18, "#ffb000"], [28, "#ff5266"]]) m.prop("banner", x + a + 0.5, y + 33.5, { color: c });
      m.prop("statue", x + 18, y + 29); m.light(x + 18, y + 29.5, 3, "#ffcf6b", 0.15);
      K.dress(m, rng, x, y, 38, 40, 8, "#ffcf6b");
    }

    // ================= row 3: the tram =================
    for (let i = 0; i < 5; i++) {
      const x = BX[i], y = BX[3], w = BS[i];
      if (i === 2) continue;
      K.lots(m, rng, x + 2, y + 2, w - 4, 12, { styles: ["brick", "concrete", "office"], floors: [3, 7], noAlley: true, signs: SIGNS });
      K.lots(m, rng, x + 2, y + 24, w - 4, 14, { styles: ["brick", "concrete"], floors: [3, 8], noAlley: true, signs: SIGNS });
      K.dress(m, rng, x, y, w, 40);
    }
    // Central Station, the tram running through it
    {
      const x = BX[2], y = BX[3];
      m.fill(x + 2, y + 2, 36, 4, G.PLAZA); m.fill(x + 2, y + 34, 36, 4, G.PLAZA);
      const st = m.structure({ x: x + 2, y: y + 6, w: 36, d: 28, floors: 3, style: "hall", name: "Central Station", doors: [["n", 15, 4], ["s", 15, 4], ["w", 9, 4], ["e", 9, 4], ["n", 4, 2], ["s", 30, 2]],
        signs: [{ face: "s", text: "CENTRAL STATION", at: 10, z: 34, color: "#54f2ff", size: 10 }] });
      for (let i = 0; i < 34; i++) if (i % 5 !== 2) m.prop("box", x + 3.5 + i, y + 13.5, { w: 0.6, d: 0.3, h: 6, side: "#5a6070" });   // the turnstiles
      for (let i = 0; i < 4; i++) m.prop("box", x + 6.5 + i * 7, y + 8, { w: 1, d: 0.5, h: 12, side: "#2a3044", screen: "#54f2ff", glow: "#54f2ff" });   // ticket machines
      for (let i = 0; i < 5; i++) { m.prop("bench", x + 6.5 + i * 6, y + 14.5); m.prop("bench", x + 6.5 + i * 6, y + 21.5); }
      m.prop("kiosk", x + 10.5, y + 27.5, { color: "#ffb000" }); m.prop("kiosk", x + 28.5, y + 27.5, { color: "#ff8fd8" });
      m.light(x + 20, y + 12, 6, "#9ff7ff", 0.18); m.light(x + 20, y + 26, 6, "#9ff7ff", 0.18);
      m.prop("shelter", x + 8.5, y + 3.5); m.prop("shelter", x + 30.5, y + 36);
    }
    // the open-air stops either side
    for (const sx of [BX[0] + 8, BX[4] + 8]) {
      m.fill(sx, 156, 22, 2, G.PLAZA); m.fill(sx, 162, 22, 2, G.PLAZA);
      m.canopy({ x: sx, y: 156, w: 22, d: 8, floors: 2, every: 5 });
      m.prop("shelter", sx + 6.5, 156.5); m.prop("shelter", sx + 15.5, 163);
      m.light(sx + 11, 157, 5, "#9ff7ff", 0.15); m.light(sx + 11, 163, 5, "#9ff7ff", 0.15);
    }
    // the tram line is open: no fences, crossable anywhere, and the trams do not stop for anyone
    m.rail("x", 158, 0, 224, [BX[0] + 19, BX[2] + 20, BX[4] + 19], 2, true);

    // ================= row 4 =================
    // Pounce Park: two blocks of it, a lake and a bandstand
    for (const i of [0, 1]) {
      const x = BX[i], y = BX[4];
      m.fill(x + 2, y + 2, 36, 34, G.GRASS);
      if (i === 0) m.fill(x + 4, y + 4, 12, 12, G.WATER);
      for (let k = 0; k < 18; k++) { const tx = x + 3 + rng() * 34, ty = y + 3 + rng() * 32; if (m.groundAt(tx, ty) === G.GRASS) m.prop("tree", tx, ty); }
      m.fill(x + 2, y + 18, 36, 2, G.DIRT); m.fill(x + 18, y + 2, 2, 34, G.DIRT);
      for (let k = 0; k < 4; k++) m.prop("bench", x + 6 + k * 8 + 0.5, y + 20.6);
      K.dress(m, rng, x, y, 40, 38, 10);
    }
    m.building({ x: BX[1] + 24, y: BX[4] + 6, w: 6, d: 6, floors: 1, style: "arena", name: "Bandstand" });
    m.light(BX[1] + 27, BX[4] + 13, 4, "#ffcf6b", 0.2);
    // Lantern Row: a market street of stalls through the block
    {
      const x = BX[2], y = BX[4];
      m.fill(x + 2, y + 16, 36, 6, G.PLAZA);
      for (let k = 0; k < 9; k++) { const c = ["#ff5266", "#ffb000", "#54f2ff", "#ff8fd8", "#4ade6a"][k % 5]; m.prop("kiosk", x + 4 + k * 4 + 0.5, y + 16.6, { color: c }); m.light(x + 4.5 + k * 4, y + 18, 2, c, 0.2); }
      for (let k = 0; k < 6; k++) m.prop("table", x + 6 + k * 5 + 0.5, y + 20.5, { umbrella: ["#a8326a", "#1f8a8a", "#c98a1a"][k % 3] });
      K.lots(m, rng, x + 2, y + 2, 36, 13, { styles: ["brick", "concrete"], floors: [2, 5], noAlley: true, signs: ["RAMEN", "SUSHI", "TEA", "NOODLE", "DUMPLING"] });
      K.lots(m, rng, x + 2, y + 23, 36, 13, { styles: ["brick", "concrete"], floors: [2, 5], noAlley: true, signs: ["RAMEN", "TEA", "LUCKY", "HERBS"] });
      K.dress(m, rng, x, y, 40, 38, 8, "#ff8fd8");
    }
    for (const i of [3, 4]) { K.lots(m, rng, BX[i] + 2, BX[4] + 2, BS[i] - 4, 34, { styles: ["brick", "concrete", "office"], floors: [4, 9], signs: SIGNS }); K.dress(m, rng, BX[i], BX[4], BS[i], 38); }

    K.signals(m);

    // ---- mission points ----
    for (const sx of S) for (const sy of S) {
      m.point("spawn", sx - 0.5, sy - 0.5, `the corner of ${COL[sx]} and ${ROW[sy]}`);
    }
    for (const sy of S) { m.point("exit", 0.5, sy + 1.5, `the west end of ${ROW[sy]}`); m.point("exit", 223.5, sy + 2.5, `the east end of ${ROW[sy]}`); }
    for (const sx of S) { m.point("exit", sx + 1.5, 0.5, `the north end of ${COL[sx]}`); m.point("exit", sx + 2.5, 223.5, `the south end of ${COL[sx]}`); }
    const T = (area, list) => { for (const [x, y, n] of list) m.point("target", x, y, n, area); };
    T("Club Nine Lives", [[BX[1] + 11, BX[1] + 12, "the dance floor at Nine Lives"], [BX[1] + 21.5, BX[1] + 10.5, "the VIP room at Nine Lives"], [BX[1] + 21.5, BX[1] + 14.2, "the bar at Nine Lives"], [BX[1] + 14.5, BX[1] + 30.5, "the queue outside Nine Lives"]]);
    T("PVN Theater", [[BX[2] + 15, BX[1] + 22.8, "the stage of the PVN Theater"], [BX[2] + 15, BX[1] + 33, "the theater lobby"], [BX[2] + 22.5, BX[1] + 19.5, "the foot of PVN Tower"]]);
    T("St. Felis Cathedral", [[BX[0] + 20, BX[2] + 7.5, "the altar of St. Felis"], [BX[0] + 20, BX[2] + 20.5, "the nave of St. Felis"], [BX[0] + 4, BX[2] + 33, "the churchyard"]]);
    T("Downtown Precinct", [[BX[3] + 18.5, BX[2] + 24, "the front desk at the precinct"], [BX[3] + 26.5, BX[2] + 18, "outside the holding cells"], [BX[3] + 20.5, BX[2] + 9.5, "the precinct armory"], [BX[3] + 20, BX[2] + 34, "the precinct motor pool"]]);
    T("Central Station", [[BX[2] + 20, BX[3] + 9.5, "the station concourse"], [BX[2] + 20, BX[3] + 23, "the south concourse"], [BX[2] + 20, BX[3] + 29.5, "the station shops"]]);
    T("Market Plaza", [[BX[1] + 28.2, BX[2] + 12, "Cafe Miao's terrace"], [BX[1] + 20, BX[2] + 25, "the plaza fountain"], [BX[1] + 20, BX[2] + 34, "the south arcade"]]);
    T("The Towers", [[BX[2] + 20, BX[2] + 20, "the financial plaza"], [BX[2] + 28, BX[2] + 34, "the fountain by Meridian Tower"]]);
    T("City Hall", [[BX[4] + 18, BX[2] + 25, "the steps of City Hall"], [BX[4] + 18, BX[2] + 19.5, "the City Hall rotunda"], [BX[4] + 10, BX[2] + 9, "the council chamber"], [BX[4] + 21, BX[2] + 9.5, "the mayor's office"]]);
    T("St. Whiskers Hospital", [[BX[4] + 15, BX[1] + 32, "the ambulance bay"], [BX[4] + 12, BX[1] + 22, "the hospital waiting room"], [BX[4] + 10, BX[1] + 12, "the wards"], [BX[4] + 23, BX[1] + 13, "the hospital pharmacy"]]);
    T("Pounce Park", [[BX[1] + 27, BX[4] + 15, "the bandstand"], [BX[0] + 19, BX[4] + 19, "the park crossroads"], [BX[0] + 10, BX[4] + 17, "the lakeside"]]);
    T("Lantern Row", [[BX[2] + 20, BX[4] + 19, "the stalls of Lantern Row"]]);
    T("The Garage", [[BX[4] + 18, BX[0] + 18, "level one of the Fifth Street garage"]]);
    T("Old Town", [[BX[0] + 20, BX[1] + 20, "the alleys of Old Town"], [BX[0] + 20, BX[0] + 20, "the back of Old Town"]]);
    T("PumaCorp", [[BX[2] + 20, BX[0] + 36, "the PumaCorp forecourt"]]);
  },
});
