/* The Suburbs: cul-de-sacs of Casey Benton's rentals, 240 tiles a side, all
 * of it one map. Two boulevards each way, four lanes and a tree-lined median
 * apiece, cut the place into nine superblocks with long, open sightlines: a
 * sniper's dream. Inside the superblocks are quiet streets of houses, and
 * behind every row of houses fenced backyards and an alley: the slow way
 * round, out of sight.
 *
 *   boulevards: x 76..85 and 160..169 (Oak and Elm), y 76..85 and 160..169 (Birch and Cedar)
 *   superblock (0,0)  the water tower on its hill, and houses
 *   superblock (1,0)  Pounceton Community College: library, lecture hall,
 *                     student union, gym, sports field, the quad
 *   superblock (1,1)  the town centre: Main Street, its coffee shops, and
 *                     the commuter rail station with its park-and-ride
 *   superblock (0,2)  Whisker Hill Cemetery and its chapel
 *   the rest: houses, backyards and alleys
 * The commuter line runs east-west at y 124..127, crossing the boulevards. */
"use strict";

W.district({
  id: "suburbs", name: "Suburbs", w: 240, h: 240, seed: 4420,
  blurb: "Quiet streets of Casey Benton's rentals, wide boulevards with nowhere to hide, and backyards and alleys behind every row.",
  names: { targets: ["Doc Calloway", "Patches McGee", "The Landlady", "Biscuit Bramble", "Sergeant Purrkins"], crew: "the Cul-de-Sac Kings", sec: "Neighbourhood watch", guard: "Heavy", henchman: "Cul-de-Sac King", civ: "Resident" },
  theme: {
    racket: "a Skooma kitchen in a rental Casey Benton thought was rented to a nice family",
    secNote: "The neighbourhood watch patrol in pairs, armed and nervous. They do not know who you are. Keep weapons holstered near them.",
    ground: "Wide boulevards with long sightlines: cross them fast. Backyards, fences and alleys are the quiet way round.",
    guards: 4, crew: 10, sec: 8, civ: 0.0025, civMax: 90,
    crewGuns: ["pistol", "shotgun", "uzi", "longrange"],
    civLook: () => { const coat = W.pick(["#5a6a8a", "#8a5a6a", "#4a7a6a", "#7a6a4a", "#9a8a6a", "#c8b088"]); return { coat, trim: W.shade(coat, 1.3), legs: W.pick(["#3a4a6a", "#4a3a30"]), fur: W.pick(W.FURS), patch: W.chance(0.3) ? W.pick(W.FURS) : null }; },
    secLook: () => ({ coat: "#c86a1a", trim: "#ffd04a", legs: "#3a4a6a", fur: W.pick(W.FURS), hat: "#3a4a6a", hatKind: "cap" }),
  },
  sections: [],

  build(m, rng) {
    const G = W.G, K = W.K;
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const pick = a => a[Math.floor(rng() * a.length)];
    m.fill(0, 0, 240, 240, G.GRASS);
    // the boulevards: one-way carriageways either side of a median of trees,
    // with a sidewalk down each outer edge
    const BLV = [76, 160];
    for (const b of BLV) { m.fill(b - 1, 0, 1, 240, G.WALK); m.fill(b + 10, 0, 1, 240, G.WALK); m.fill(0, b - 1, 240, 1, G.WALK); m.fill(0, b + 10, 240, 1, G.WALK); }
    for (const b of BLV) { m.divided("y", b, 2); m.divided("x", b, 2); }
    for (const b of BLV) for (let t = 2; t < 240; t += 6) {
      if (!BLV.some(o => t >= o - 1 && t <= o + 10)) { m.prop("tree", b + 5, t + 0.5); m.prop("tree", t + 0.5, b + 5); }
    }
    const BLVNAME = { x76: "Oak Boulevard", x160: "Elm Boulevard", y76: "Birch Boulevard", y160: "Cedar Boulevard" };
    const SUPER = [[0, 76], [86, 160], [170, 240]];
    const STREETS = ["Maple Court", "Willow Lane", "Juniper Drive", "Aspen Way", "Hazel Close", "Laurel Street", "Poplar Drive", "Sycamore Lane", "Rowan Court", "Alder Road", "Linden Way", "Hawthorn Drive", "Spruce Lane", "Cherry Close", "Magnolia Way", "Holly Road"];
    let streetNo = 0;
    const HOUSE = ["#7a7468", "#8a7a5a", "#5a6a7a", "#7a5a5a", "#6a7a6a", "#8a8a80", "#9a8a6a", "#5a5a6a"];
    const ROOF = ["#3a2e2a", "#2a2f3a", "#4a2a24", "#3a3a3a", "#2a3a2e"];

    /* A neighbourhood. Streets run east-west from boulevard to boulevard,
     * a sidewalk down each side; between two streets, a module of
     *   [sidewalk][lawn 2][houses, facing north][backyards 6][alley 2]
     *   [backyards 6][houses, facing south][lawn 2][sidewalk]
     * 31 tiles, 36 with the street below it. Lots are 11 wide: a house in
     * the first 7 (with a passage beside it to the backyard), a garage or a
     * driveway in the last 3, and the driveway always runs across the lawn
     * and the sidewalk to the street. Houses vary: wide or narrow, deep or
     * shallow, one storey or two, an L with a front wing, a rear extension.
     *   topStreet: put a street along the top first (no boulevard above)
     *   openBottom: below is a boulevard, so the last row may face it */
    const CARS = ["#8a2a2a", "#2a4a8a", "#e8e4dc", "#3a3a40", "#6a7a8a", "#2a5a3a", "#c8a03a", "#5a3a6a", "#9a9aa0"];

    /* A backyard, 10 wide and 6 deep behind the house: v counts back from the
     * house (0, kept clear, the way round) to the back fence (5); u runs
     * across the lot (1..10), the lot's own fence on its west side. Each
     * gets a few of: a pool and its paving, a hot tub, a grill and a patio
     * table, vegetable beds, a shed, a tree, now and then a car up on the
     * grass, and something to remember it by. Every yard is fenced all round
     * (gaps in the fence between neighbours now and then); a yard on an alley
     * has a gate onto it, wherever the junk in the yard leaves room. */
    const FUN = [
      ["trampoline", 2, 2], ["swing", 1, 1], ["cattree", 1, 1], ["yarn", 1, 1], ["laundry", 1, 1], ["dish", 1, 1],
      ["flamingos", 3, 1], ["gnomes", 3, 2], ["rocket", 1, 1],
    ];
    const backyard = (lx, yardY, north, alley, first, last) => {
      const Y = v => north ? yardY + v : yardY + 5 - v;
      const top = (v0, d) => Math.min(Y(v0), Y(v0 + d - 1));
      const used = new Set();
      const free = (u, v) => {
        if (u < 1 || u > 10 || v < 1 || v > 4 || used.has(u * 8 + v)) return false;
        const k = m.i(lx + u, Y(v));
        return m.height[k] === 0 && m.propAt[k] < 0 && m.ground[k] === G.GRASS;
      };
      const take = (u0, v0, w, d) => {
        for (let u = u0; u < u0 + w; u++) for (let v = v0; v < v0 + d; v++) if (!free(u, v)) return false;
        for (let u = u0; u < u0 + w; u++) for (let v = v0; v < v0 + d; v++) used.add(u * 8 + v);
        return true;
      };
      const spot = (w, d, tries = 8) => { for (let t = 0; t < tries; t++) { const u = ri(1, 11 - w), v = ri(1, 5 - d); if (take(u, v, w, d)) return [u, v]; } return null; };
      const at = (u, v) => [lx + u + 0.5, Y(v) + 0.5];
      // a pool on paving, or a hot tub
      const r = rng();
      if (r < 0.3 && take(1, 1, 6, 4)) {
        m.fill(lx + 1, top(1, 4), 6, 4, G.PLAZA);
        m.fill(lx + 2, top(2, 2), 4, 2, G.WATER);
        m.light(lx + 4, top(2, 2) + 1, 2.4, "#54d8ff", 0.12);
        m.prop("box", ...at(6, 1), { w: 0.5, d: 0.9, h: 2, side: "#e8e4dc", top: "#54a8ff" });    // a lounger
      } else if (r < 0.42) {
        const s = spot(1, 1); if (s) { m.prop("hottub", ...at(...s)); m.light(...at(...s), 1.6, "#54d8ff", 0.15); }
      }
      // a grill by the back door, with a patio table
      if (rng() < 0.55) for (let t = 0; t < 6; t++) {
        const u = ri(1, 9);
        if (take(u, 1, 2, 1)) { m.prop("grill", ...at(u, 1)); m.prop("table", ...at(u + 1, 1), { umbrella: rng() < 0.5 ? pick(["#d83a3a", "#3a7ad0", "#ffcf3a", "#2a8a5a"]) : null }); break; }
      }
      // vegetable beds along the back
      if (rng() < 0.3) for (let t = 0; t < 6; t++) {
        const u = ri(1, 8);
        if (take(u, 4, 3, 1)) { for (let i = 0; i < 3; i++) m.prop("bed", ...at(u + i, 4), { color: pick(["#4a9a3a", "#3a8a2a", "#8aaa3a", "#c84a3a"]) }); break; }
      }
      // a shed
      if (rng() < 0.3) { const s = spot(2, 2); if (s) m.building({ x: lx + s[0], y: top(s[1], 2), w: 2, d: 2, floors: 1, style: "metal" }); }
      // a car up on the grass: a project, or nobody's
      if (rng() < 0.08) { const s = spot(1, 2); if (s) m.park(lx + s[0] + 0.5, top(s[1], 2) + 1, "y", pick(CARS), rng() < 0.5 ? 1 : -1); }
      // something to remember it by
      if (rng() < 0.4) {
        const [kind, w, d] = pick(FUN), s = spot(w, d);
        if (s) {
          const [u, v] = s;
          if (kind === "flamingos") for (let i = 0; i < 3; i++) m.prop("flamingo", lx + u + i + 0.3 + rng() * 0.4, Y(v) + 0.5);
          else if (kind === "gnomes") for (let i = 0; i < 6; i++) m.prop("gnome", lx + u + (i % 3) + 0.5, top(v, 2) + (i < 3 ? 0.5 : 1.5));
          else if (kind === "trampoline") m.prop("trampoline", lx + u + 1, top(v, 2) + 1);
          else m.prop(kind, ...at(u, v), { color: pick(["#d83a5a", "#3a7ad0", "#b8a07a", "#8a5ab8"]), seed: ri(0, 3) });
        }
      }
      // a tree, if there is room
      if (rng() < 0.5) { const s = spot(1, 1, 4); if (s) m.prop("tree", ...at(...s)); }
      // fences: our west side (gapped now and then, except at the end of a row), the back,
      // and the east side if we are the last yard in the row
      for (let j = 0; j < 6; j++) if (first || !(j === 3 && rng() < 0.3)) m.prop("fence", lx + 0.5, yardY + j + 0.5, { axis: "y" });
      if (last) for (let j = 0; j < 6; j++) m.prop("fence", lx + LOT + 0.5, yardY + j + 0.5, { axis: "y" });
      let gate = -1;
      if (alley) {
        const ok = [];
        for (let u = 2; u <= 8; u++) if (!used.has(u * 8 + 4) && !used.has((u + 1) * 8 + 4) && m.height[m.i(lx + u, Y(4))] === 0 && m.height[m.i(lx + u + 1, Y(4))] === 0) ok.push(u);
        if (ok.length) gate = pick(ok);
      }
      for (let u = 1; u <= LOT - 1; u++) if (u !== gate && u !== gate + 1) m.prop("fence", lx + u + 0.5, Y(5) + 0.5, { axis: "x" });
    };
    const LOT = 11;
    const yards = [];
    const neighbourhood =(x0, y0, w, h, label, { topStreet = false, openBottom = true } = {}) => {
      const LOT = 11;
      let y = y0;
      const street = (sy, name) => {
        m.road(Math.max(0, x0 - 1), sy, Math.min(240, x0 + w + 1) - Math.max(0, x0 - 1), 4, "x");
        for (let lx = x0 + 3; lx < x0 + w; lx += 12) { m.prop("lamp", lx + 0.5, sy - 0.4); m.light(lx + 0.7, sy, 2.4, "#ffcf80", 0.2); m.prop("lamp", lx + 6.5, sy + 4.4); m.light(lx + 6.7, sy + 4.8, 2.4, "#ffcf80", 0.2); }
        void name;
      };
      if (topStreet) { street(y, ""); y += 4; }
      for (;;) {
        const rem = y0 + h - y;
        const full = rem >= 36 || (rem >= 31 && openBottom);
        if (!full && rem < 15) break;
        const name = STREETS[streetNo++ % STREETS.length];
        const hasStreet = full && rem >= 36;
        m.fill(x0, y, w, 1, G.WALK);                               // the sidewalk on the street above
        if (full) {
          m.fill(x0, y + 15, w, 2, G.ALLEY);
          m.fill(x0, y + 31 - 0, w, 0, G.WALK);
          if (hasStreet) { m.fill(x0, y + 31, w, 1, G.WALK); street(y + 32, name); }
          else if (y + 31 < y0 + h) m.fill(x0, y + 31, w, 1, G.WALK);
        }
        const rows = full ? [true, false] : [true];
        for (let lx = x0 + 1; lx + LOT <= x0 + w; lx += LOT) {
          for (const north of rows) {
            // the street side of the lot, and the row the house's front is on
            const front = north ? y + 3 : y + 28;
            const yardY = north ? y + 9 : y + 17;
            const color = pick(HOUSE), roofColor = pick(ROOF), floors = rng() < 0.35 ? 2 : 1;
            const hw = ri(4, 6), hd = ri(4, 6);
            const hx = lx + 1 + ri(0, 6 - hw), hy = north ? front : front - hd + 1;
            const doorX = hx + (hw >> 1);
            // a path from the front door to the sidewalk, laid before the house so a wing can sit on it
            if (north) m.fill(doorX, y + 1, 1, 2, G.WALK); else m.fill(doorX, y + 29, 1, 2, G.WALK);
            const shape = rng();
            if (shape < 0.3) {
              // an L: a one-storey wing coming forward toward the street
              const wx = rng() < 0.5 ? hx : hx + hw - 3;
              m.building({ x: wx, y: north ? hy - 2 : hy + hd, w: 3, d: 2, floors: 1, style: "house", color, roofColor });
            } else if (shape < 0.55) {
              // a rear extension into the yard
              const ew = Math.max(3, hw - 2), ex = hx + ri(0, hw - ew);
              m.building({ x: ex, y: north ? hy + hd : hy - 2, w: ew, d: 2, floors: 1, style: "house", color, roofColor });
            }
            m.building({ x: hx, y: hy, w: hw, d: hd, floors, style: "house", color, roofColor, door: doorX - hx });
            // a garage, or a driveway down the side; either way the drive reaches the street
            const gx = lx + 8;
            const toStreetN = () => m.driveway(gx, y, 3, 3, "n");                          // across the lawn and the sidewalk to the street above
            const toStreetS = () => m.driveway(gx, y + 29, 3, Math.min(3, y0 + h - (y + 29)), "s");
            // most households have a car, and it lives on the drive
            if (rng() < 0.55) {
              m.building({ x: gx, y: north ? front : front - 3, w: 3, d: 4, floors: 1, style: "house", garage: true, color, roofColor });
              if (north) toStreetN(); else toStreetS();
              if (rng() < 0.45) m.park(gx + 1.5, north ? y + 1.6 : y + 30.4, "y", pick(CARS), north ? 1 : -1);
            } else {
              if (north) { m.driveway(gx, y, 3, 9, "n"); if (rng() < 0.85) m.park(gx + 1.5, y + 5, "y", pick(CARS), 1); }
              else { m.drive(gx, y + 23, 3, 6); toStreetS(); if (rng() < 0.85) m.park(gx + 1.5, y + 26, "y", pick(CARS), -1); }
            }
            backyard(lx, yardY, north, full, lx === x0 + 1, lx + 2 * LOT > x0 + w);
            yards.push([lx + 4.5, yardY + 3, name]);
          }
        }
        if (full) {
          m.point("spawn", x0 + 0.5, y + 15.5, `the alley behind ${name}`, label);
          m.point("spawn", x0 + w - 0.5, y + 15.5, `the far end of the alley behind ${name}`, label);
        }
        if (!full) break;
        y += hasStreet ? 36 : 31;
        if (!hasStreet) break;
      }
    };

    // ---- superblock (0,0): the water tower on its hill ----
    m.fill(4, 4, 30, 30, G.GRASS);
    m.prop("watertower", 18, 18, { text: "SUBURBS", color: "#9aa8b8" }); m.light(18, 18.5, 5, "#ff3048", 0.06);
    for (let t = 6; t < 32; t++) { m.prop("fence", t + 0.5, 6.5, { axis: "x" }); m.prop("fence", t + 0.5, 30.5, { axis: "x" }); if (t !== 18 && t !== 19) { m.prop("fence", 6.5, t + 0.5, { axis: "y" }); m.prop("fence", 30.5, t + 0.5, { axis: "y" }); } }
    m.building({ x: 22, y: 21, w: 4, d: 3, floors: 1, style: "metal", name: "Pump house" });
    m.prop("flood", 12, 12); m.light(12, 12.5, 5, "#fffbe8", 0.15);
    neighbourhood(35, 0, 40, 75, "Maple Heights", { topStreet: true });
    // west of the tower, its street lined up with the one coming in from the east
    m.fill(0, 35, 35, 1, G.WALK);
    neighbourhood(0, 36, 35, 39, "Maple Heights", { topStreet: true });

    // ---- superblock (1,0): Pounceton Community College ----
    {
      const x = 86, y = 0;
      m.fill(x, y, 74, 76, G.WALK);
      m.fill(x + 14, y + 20, 46, 36, G.GRASS);
      m.fill(x + 14, y + 37, 46, 2, G.WALK); m.fill(x + 36, y + 20, 2, 36, G.WALK);
      m.prop("statue", x + 37, y + 38); m.light(x + 37, y + 38.5, 3, "#ffcf6b", 0.15);
      for (let k = 0; k < 12; k++) m.prop("tree", x + 16 + (k % 6) * 8 + 0.5, y + 23 + Math.floor(k / 6) * 28 + 0.5);
      // the library
      const lib = m.structure({ x: x + 10, y: y + 4, w: 22, d: 14, floors: 3, style: "brick", floor: G.WOOD, name: "Library", doors: [["s", 9, 3], ["e", 4, 2]], signs: [{ face: "s", text: "LIBRARY", at: 7, z: 34, color: "#ffcf6b" }] });
      for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) m.prop("box", x + 12.5 + i * 2.5, y + 6 + r * 2.2, { w: 0.5, d: 1.6, h: 16, side: "#5a3a24", top: "#7a5a3a", blocks: true });
      m.partition(lib, x + 11, y + 14, 20, 1, [[8, 4]]);
      for (let i = 0; i < 4; i++) m.prop("table", x + 13.5 + i * 4, y + 15.5);
      m.prop("box", x + 26, y + 15.5, { w: 3, d: 0.8, h: 8, side: "#5a3a24", screen: "#ffcf6b" });
      m.light(x + 21, y + 11, 6, "#ffcf6b", 0.15);
      // the lecture hall: two raked theatres off a corridor along the front
      const lh = m.structure({ x: x + 36, y: y + 4, w: 30, d: 13, floors: 4, style: "concrete", name: "Lecture Hall", doors: [["s", 4, 3], ["s", 23, 3], ["e", 9, 2]],
        signs: [{ face: "s", text: "LECTURE HALL", at: 9, z: 46, color: "#54f2ff" }] });
      m.partition(lh, x + 37, y + 12, 28, 1, [[6, 2], [20, 2]]);
      m.partition(lh, x + 50, y + 5, 1, 7, []);
      for (const tx of [x + 43.5, x + 57.5]) {
        m.prop("box", tx, y + 5.3, { w: 6, d: 0.3, h: 16, z: 6, side: "#e8e4dc", top: "#e8e4dc", glow: "#9fd8ff" });   // the screen
        m.prop("box", tx - 3, y + 6.5, { w: 1, d: 0.6, h: 7, side: "#5a3a24", top: "#7a5a3a" });                     // the lectern
        for (let r = 0; r < 3; r++) m.prop("box", tx, y + 8 + r * 1.3, { w: 10, d: 0.5, h: 3 + r * 1.5, side: "#3a4a6a" });   // the seats, rising
        m.light(tx, y + 6, 4, "#9fd8ff", 0.15);
      }
      // the science building: labs down one side of a corridor
      const sci = m.structure({ x: x + 64, y: y + 20, w: 8, d: 32, floors: 3, style: "glass", name: "Science building", doors: [["w", 4, 2], ["w", 25, 2], ["s", 1, 2]] });
      m.partition(sci, x + 67, y + 21, 1, 30, [[3, 2], [13, 2], [24, 2]]);
      m.partition(sci, x + 68, y + 30, 3, 1, []); m.partition(sci, x + 68, y + 41, 3, 1, []);
      for (const [ly, glow] of [[y + 25, "#4ade6a"], [y + 35, "#54f2ff"], [y + 46, "#ff8fd8"]]) {
        m.prop("box", x + 69.5, ly - 1.5, { w: 0.8, d: 2.5, h: 6, side: "#c8ccd4", top: "#e8e4dc", screen: glow });
        m.prop("box", x + 69.5, ly + 2, { w: 0.8, d: 2.5, h: 6, side: "#c8ccd4", top: "#e8e4dc" });
        m.prop("box", x + 70.4, ly + 4, { w: 0.5, d: 0.5, h: 14, side: "#3a3f4e", glow });
        m.light(x + 69.5, ly, 3, glow, 0.2);
      }
      m.loot.push({ type: "medikit", ammo: 1, x: x + 69.5, y: y + 47.5 });
      // the student union: canteen, counter, lounge
      const su = m.structure({ x: x + 10, y: y + 58, w: 20, d: 15, floors: 2, style: "brick", name: "Student Union", doors: [["n", 8, 3], ["s", 3, 2], ["w", 5, 2]], signs: [{ face: "s", text: "STUDENT UNION", at: 3, z: 22, color: "#4ade6a" }] });
      m.partition(su, x + 22, y + 59, 1, 13, [[4, 3]]);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m.prop("table", x + 13.5 + i * 3, y + 61.5 + j * 3, { umbrella: null });
      m.prop("box", x + 19, y + 70.6, { w: 5, d: 0.8, h: 8, side: "#3a4258", top: "#5a6070", glow: "#ffe2a0" });
      m.floorIn(x + 23, y + 59, 6, 13, G.CARPET);
      for (let j = 0; j < 3; j++) m.prop("box", x + 26, y + 61 + j * 4, { w: 2, d: 0.8, h: 4, side: "#3a5a8a" });
      // the gym: a court with bleachers, and the locker rooms at the east end
      const gym = m.structure({ x: x + 36, y: y + 58, w: 30, d: 15, floors: 3, style: "arena", name: "Gym", doors: [["n", 10, 3], ["w", 7, 2], ["s", 24, 2]],
        signs: [{ face: "s", text: "POUNCETON PUMAS", at: 4, z: 34, color: "#ffb000" }] });
      m.partition(gym, x + 58, y + 59, 1, 13, [[4, 2]]);
      m.partition(gym, x + 59, y + 65, 6, 1, [[2, 2]]);
      m.floorIn(x + 37, y + 59, 21, 13, G.WOOD);
      m.daub({ type: "rect", x: x + 38, y: y + 63, x2: x + 57, y2: y + 71, color: "rgba(255,176,0,.45)" });
      m.daub({ type: "line", x: x + 47.5, y: y + 63, x2: x + 47.5, y2: y + 71, color: "rgba(255,176,0,.45)" });
      for (let r = 0; r < 3; r++) m.prop("box", x + 47.5, y + 59.6 + r * 1.1, { w: 18, d: 0.6, h: 8 - r * 2.5, side: "#5a6a8a" });   // the bleachers
      for (const hx of [x + 38.4, x + 56.6]) m.prop("box", hx, y + 67, { w: 0.3, d: 1, h: 18, side: "#c8ccd4", top: "#ff7a30" });     // the hoops
      for (const ly of [y + 60, y + 67]) for (let i = 0; i < 3; i++) m.prop("box", x + 60 + i * 2, ly, { w: 1.4, d: 0.5, h: 12, side: "#4a6a8a" });   // lockers
      m.light(x + 47, y + 66, 8, "#fffbe8", 0.12);
      // the sports field
      m.fill(x + 2, y + 20, 10, 36, G.GRASS);
      m.daub({ type: "rect", x: x + 3, y: y + 21, x2: x + 11, y2: y + 55, color: "rgba(255,255,255,.35)" });
      m.daub({ type: "line", x: x + 3, y: y + 38, x2: x + 11, y2: y + 38, color: "rgba(255,255,255,.35)" });
      for (const [a, b] of [[3, 20], [11, 20], [3, 56], [11, 56]]) { m.prop("flood", x + a, y + b); m.light(x + a, y + b + 0.5, 6, "#fffbe8", 0.14); }
      K.lamps(m, x + 15, y + 19.3, x + 59, y + 19.3, 11, "#ffcf80");
      K.lamps(m, x + 15, y + 56.7, x + 59, y + 56.7, 11, "#ffcf80");
    }

    // ---- superblock (1,1): the town centre ----
    {
      const x = 86, y = 86;
      m.fill(x, y, 74, 74, G.WALK);
      m.road(x, y + 10, 74, 4, "x");                                          // Main Street
      // the north side of Main Street: little shops
      K.lots(m, rng, x + 2, y + 1, 70, 8, { styles: ["brick", "concrete"], floors: [1, 2], noAlley: true, gaps: 0.2, signs: ["BAKERY", "BOOKS", "VET", "NAILS", "DELI", "HARDWARE"] });
      // the coffee shops, and the shops between them
      const cafe = (cx, name, col) => {
        const s = m.structure({ x: cx, y: y + 15, w: 12, d: 11, floors: 2, style: "brick", floor: G.WOOD, name, doors: [["n", 5, 2], ["s", 1, 2]], signs: [{ face: "s", text: name.toUpperCase(), at: 0.6, z: 22, color: col }] });
        m.prop("box", cx + 6, y + 23.6, { w: 6, d: 0.8, h: 8, side: "#3a2418", top: "#8a5a3a", glow: col });
        m.prop("box", cx + 2, y + 23.6, { w: 1, d: 0.8, h: 12, side: "#5a5a5a", glow: "#ffe2a0" });     // the espresso machine
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) m.prop("table", cx + 2.5 + i * 3.5, y + 17.5 + j * 3);
        m.prop("box", cx + 9.5, y + 17, { w: 1.4, d: 2, h: 4, side: "#5a2a3a" });
        m.light(cx + 6, y + 20, 4, col, 0.2);
        return s;
      };
      cafe(x + 4, "The Daily Grind", "#ffb000");
      cafe(x + 40, "Catpuccino", "#ff8fd8");
      K.lots(m, rng, x + 18, y + 15, 20, 11, { styles: ["brick", "concrete"], floors: [1, 2], noAlley: true, signs: ["PHARMACY", "TOYS", "FLOWERS"] });
      // the savings bank: a banking hall, the tellers' counter, the vault behind bars
      const bank = m.structure({ x: x + 54, y: y + 15, w: 11, d: 11, floors: 2, style: "concrete", floor: G.CARPET, name: "Pounceton Savings", doors: [["n", 4, 3]],
        signs: [{ face: "s", text: "SAVINGS", at: 2, z: 22, color: "#4ade6a" }] });
      m.partition(bank, x + 55, y + 21, 9, 1, [[6, 2]]);
      for (let i = 0; i < 3; i++) m.prop("box", x + 56.5 + i * 2, y + 20.4, { w: 1.6, d: 0.6, h: 7, side: "#3a2418", top: "#8a5a3a", screen: "#4ade6a" });
      m.prop("bars", x + 61.5, y + 23.5, { axis: "x" }); m.prop("bars", x + 62.5, y + 23.5, { axis: "x" });
      m.prop("box", x + 62, y + 24.8, { w: 3, d: 0.8, h: 14, side: "#5a6070", top: "#8a90a0", glow: "#ffcf6b" });   // the vault door
      m.loot.push({ type: "uzi", ammo: 60, x: x + 57.5, y: y + 24.5 });
      K.lots(m, rng, x + 65, y + 15, 7, 11, { styles: ["brick", "concrete"], floors: [1, 2], noAlley: true, signs: ["PIZZA"] });
      for (let lx = x + 3; lx < x + 72; lx += 9) { m.prop("lamp", lx + 0.5, y + 9.6); m.light(lx + 0.7, y + 10, 2.4, "#ffcf80", 0.2); m.prop("lamp", lx + 4.5, y + 14.4); m.light(lx + 4.7, y + 14.8, 2.4, "#ffcf80", 0.2); }
      // the station: a ticket hall, two platforms, the park-and-ride
      const st = m.structure({ x: x + 22, y: y + 27, w: 16, d: 7, floors: 2, style: "concrete", name: "Pounceton Station", doors: [["n", 6, 3], ["s", 6, 3]], signs: [{ face: "s", text: "POUNCETON", at: 3.5, z: 22, color: "#54f2ff" }] });
      m.prop("box", x + 26, y + 29.6, { w: 3, d: 0.6, h: 8, side: "#3a4258", screen: "#54f2ff" });
      for (let i = 0; i < 3; i++) m.prop("box", x + 32 + i * 1.6, y + 29.6, { w: 1, d: 0.5, h: 12, side: "#2a3044", glow: "#54f2ff" });
      m.fill(x + 6, y + 34, 60, 4, G.PLAZA); m.fill(x + 6, y + 42, 60, 4, G.PLAZA);
      m.canopy({ x: x + 6, y: y + 34, w: 60, d: 12, floors: 2, name: "Pounceton Station canopy" });
      for (const sx of [x + 12, x + 30, x + 50]) { m.prop("shelter", sx + 0.5, y + 35.2); m.prop("shelter", sx + 0.5, y + 44.5); m.light(sx, y + 36, 4, "#9ff7ff", 0.15); m.light(sx, y + 44, 4, "#9ff7ff", 0.15); }
      K.parking(m, rng, x + 6, y + 48, 60, 24, { fill: 0.5, gates: [["s", 28], ["e", 8], ["w", 8]] });

    }
    m.rail("x", 124, 0, 240, [116], 1);
    K.railFence(m, "x", 124, 0, 240);

    // ---- superblock (0,2): Whisker Hill Cemetery ----
    {
      const x = 0, y = 170;
      m.fill(x + 2, y + 2, 72, 66, G.GRASS);
      for (let t = 2; t < 74; t++) { if (t < 34 || t > 39) m.prop("fence", x + t + 0.5, y + 2.5, { axis: "x" }); m.prop("fence", x + t + 0.5, y + 67.5, { axis: "x" }); }
      for (let t = 3; t < 67; t++) { m.prop("fence", x + 2.5, y + t + 0.5, { axis: "y" }); if (t < 30 || t > 34) m.prop("fence", x + 73.5, y + t + 0.5, { axis: "y" }); }
      m.fill(x + 34, y + 3, 6, 64, G.DIRT); m.fill(x + 3, y + 30, 70, 5, G.DIRT);
      const ch = m.structure({ x: x + 31, y: y + 42, w: 12, d: 16, floors: 2, style: "church", pitch: "y", ridge: 18, roof: "#3a3442", floor: G.WOOD, name: "Cemetery chapel", doors: [["n", 4, 3], ["s", 4, 3], ["e", 3, 2]] });
      for (let r = 0; r < 4; r++) for (const a of [34.5, 39.5]) m.prop("box", x + a, y + 47 + r * 2, { w: 3, d: 0.6, h: 4, side: "#5a3a24" });
      m.prop("box", x + 37, y + 55.5, { w: 3, d: 1, h: 7, side: "#e8e4dc", glow: "#ffcf6b" });
      for (const [a, b] of [[10, 10], [56, 10], [10, 52], [56, 52]]) m.building({ x: x + a, y: y + b, w: 4, d: 4, floors: 1, style: "concrete", name: "Mausoleum" });
      m.building({ x: x + 64, y: y + 58, w: 5, d: 4, floors: 1, style: "metal", name: "Groundskeeper's shed" });
      for (let gy = y + 6; gy < y + 66; gy += 3) for (let gx = x + 5; gx < x + 72; gx += 3) {
        if ((gx >= x + 32 && gx <= x + 41) || (gy >= y + 28 && gy <= y + 36)) continue;
        if (m.height[m.i(gx, gy)] > 0 || m.roofOf[m.i(gx, gy)] >= 0) continue;
        if (rng() < 0.75) m.prop("grave", gx + 0.5, gy + 0.5, { cross: rng() < 0.3, color: pick(["#6a6e78", "#7a7a80", "#5a5e66", "#8a8a8a"]) });
      }
      for (let k = 0; k < 16; k++) { const tx = x + 4 + rng() * 68, ty = y + 4 + rng() * 62; if (m.propAt[m.i(Math.floor(tx), Math.floor(ty))] < 0 && m.groundAt(tx, ty) === G.GRASS) m.prop("tree", tx, ty); }
      for (const [a, b] of [[37, 6], [37, 28], [20, 32], [54, 32]]) { m.prop("lamp", x + a + 0.5, y + b + 0.5); m.light(x + a + 0.7, y + b + 0.9, 2.6, "#ffcf80", 0.2); }
      void ch;
    }

    // ---- everywhere else: houses ----
    neighbourhood(171, 0, 69, 75, "Willow Park", { topStreet: true });
    neighbourhood(0, 87, 75, 36, "Juniper Hills");
    neighbourhood(0, 129, 75, 30, "Juniper Hills", { topStreet: true });
    neighbourhood(171, 87, 69, 36, "Aspen Grove");
    neighbourhood(171, 129, 69, 30, "Aspen Grove", { topStreet: true });
    neighbourhood(87, 171, 72, 69, "Laurel Gardens", { openBottom: false });
    neighbourhood(171, 171, 69, 69, "Sycamore Rise", { openBottom: false });

    K.signals(m);

    // ---- mission points ----
    for (const bx of BLV) for (const by of BLV) {
      m.point("spawn", bx - 0.5, by - 0.5, `the corner of ${BLVNAME["x" + bx]} and ${BLVNAME["y" + by]}`);
      m.point("spawn", bx + 10.5, by + 10.5, `the corner of ${BLVNAME["x" + bx]} and ${BLVNAME["y" + by]}`);
    }
    for (const b of BLV) {
      m.point("exit", b + 1.5, 0.5, `the north end of ${BLVNAME["x" + b]}`); m.point("exit", b + 8.5, 239.5, `the south end of ${BLVNAME["x" + b]}`);
      m.point("exit", 0.5, b + 1.5, `the west end of ${BLVNAME["y" + b]}`); m.point("exit", 239.5, b + 8.5, `the east end of ${BLVNAME["y" + b]}`);
    }
    const T = (area, list) => { for (const [x, y, n] of list) m.point("target", x, y, n, area); };
    T("The Water Tower", [[18.5, 23.5, "the foot of the water tower"], [24, 25.5, "the pump house"]]);
    T("Pounceton College", [[107, 14, "the library stacks"], [107, 16, "the library reading room"], [124.5, 40.5, "the quad"], [99.5, 66, "the student union canteen"], [111.5, 63.5, "the student union lounge"], [92, 30, "the sports field"]]);
    T("Main Street", [[96, 104, "The Daily Grind"], [132, 104, "Catpuccino"], [120, 98, "Main Street"], [145, 105, "the Pounceton Savings banking hall"], [146, 109.5, "the bank vault"]]);
    T("Pounceton College", [[129.5, 9, "the west lecture theatre"], [143.5, 9, "the east lecture theatre"], [155.5, 25, "the chemistry lab"], [155.5, 45, "the biology lab"], [133.5, 68, "the gym"], [148, 63, "the gym locker rooms"]]);
    T("Pounceton Station", [[115, 116, "the station ticket hall"], [100, 121.5, "the station platform"], [130, 137, "the park-and-ride"]]);
    T("Whisker Hill Cemetery", [[37, 222, "the cemetery chapel"], [36.5, 202, "the cemetery crossroads"], [13, 189, "the old graves"]]);
    // a handful of backyards, any of which might be the one
    for (let k = 0; k < yards.length; k += 23) T("A backyard", [[yards[k][0], yards[k][1], `a backyard on ${yards[k][2]}`]]);
  },
});
