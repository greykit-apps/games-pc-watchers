/* The Starport: where the ships come in, trading with other ports. Moonsugar
 * and Skooma come in cheap, and Bay 9 sells what the Watchers can't buy in
 * town. One map, 224 tiles a side.
 *
 *   x 4..7 the Outer Road   x 96..99 Dock Street (to South Street)   x 214..217 the East Road
 *   y 104..107 Port Avenue  y 162..165 South Street
 *   x 10..93,  y 8..101    the landing field: Starport Control and its tower,
 *                          the fuel farm, Pad 1 (a rounded square ringed with
 *                          maintenance gear), Pad 2, Pad 3
 *   x 102..157, y 8..100   Hangar Row (Bays 7 to 11) and the cargo yard
 *   x 162..211, y 8..100   the Port Authority, the Customs House, the terminal
 *   y 110..158             warehouses either side of the service road (y 128..130)
 *   y 168..222             the cradle, and in it the PCS Moonsugar: a ship
 *                          very nearly the width of the map, raised 28px on its
 *                          cradle. The bridge at the bow (west), crew
 *                          quarters, the cargo bay, engineering, the engines
 *                          (east). Ramps climb from the starport side to the
 *                          crew and engineering airlocks and the cargo bay. */
"use strict";

W.district({
  id: "starport", name: "Starport", w: 224, h: 224, seed: 9113,
  blurb: "Where the ships come in. The PCS Moonsugar in her cradle, hangars, a container yard, the terminal, and Skooma coming in cheap.",
  names: { targets: ["Captain Koshka", "Skooma Sal", "The Quartermaster", "Bilgewater Tom"], crew: "the Bay 13 smugglers", sec: "Port Authority", guard: "Deckhand", henchman: "Smuggler", civ: "Dockworker" },
  theme: {
    racket: "Skooma straight off the ships, under the Boss's nose",
    secNote: "Port Authority officers patrol the field, the yards and the terminal. They answer to the port, not the Boss, and they will not know you. Keep weapons holstered near them.",
    ground: "Wide open pads with nowhere to hide, a ship to fight through deck by deck, the container yard's narrow aisles.",
    guards: 4, crew: 11, sec: 10, civ: 0.005, civMax: 70,
    civLook: () => ({ coat: W.pick(["#c86a1a", "#d8a01a", "#5a6a8a"]), trim: "#e8e4dc", legs: "#2a2f3a", fur: W.pick(W.FURS), hat: W.chance(0.4) ? "#d8a01a" : null, hatKind: "cap" }),
    secLook: () => ({ coat: "#3a4256", trim: "#ffd04a", legs: "#232838", fur: W.pick(W.FURS), hat: "#ffd04a", hatKind: "cap" }),
  },
  sections: [],

  build(m, rng) {
    const G = W.G, K = W.K;
    const pick = a => a[Math.floor(rng() * a.length)];
    // something big: one prop drawn from its middle, the rest of its footprint blocked
    const big = (x, y, w, d, o) => {
      for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) m.prop("solid", x + i + 0.5, y + j + 0.5);
      m.prop("box", x + w / 2, y + d / 2, Object.assign({ w: w - 0.1, d: d - 0.1 }, o));
    };
    const silo = (x, y, h, color, text) => {
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (i !== 1 || j !== 1) m.prop("solid", x + i + 0.5, y + j + 0.5);
      m.prop("silo", x + 1.5, y + 1.5, { h, color, text });
    };
    const flood = (x, y, r = 6) => { m.prop("flood", x, y); m.light(x, y + 0.5, r, "#fffbe8", 0.18); };
    // maintenance gear, one piece of it
    const GEAR = [
      (x, y) => m.prop("truck", x, y, { color: "#d8a01a" }),                                                     // a tug
      (x, y) => m.prop("truck", x, y, { color: "#a8323e", axis: "y" }),                                          // a fuel bowser
      (x, y) => m.prop("box", x, y, { w: 1.4, d: 0.8, h: 4, side: "#5a6070", top: "#ff7a1a" }),                  // a baggage cart
      (x, y) => m.prop("box", x, y, { w: 0.7, d: 0.5, h: 5, side: "#a8323e", top: "#c84a4a" }),                  // a toolbox
      (x, y) => m.prop("barrel", x, y, { color: "#3a3f4c" }),                                                     // a cable reel
      (x, y) => m.prop("box", x, y, { w: 0.8, d: 1.8, h: 18, side: "#7a8090", top: "#9aa0ac", blocks: true }),   // boarding stairs
      (x, y) => m.prop("box", x, y, { w: 1.2, d: 1.2, h: 8, side: "#c8a01a", top: "#e8c04a", glow: "#ffe2a0", glowR: 6 }),   // a generator
      (x, y) => m.prop("crate", x, y, { n: 1 + Math.floor(rng() * 2) }),
      (x, y) => m.prop("cone", x, y),
    ];

    m.fill(0, 0, 224, 224, G.WALK);
    m.street("x", 104, 3);       // Port Avenue
    m.street("y", 96, 3, 0, 166);   // Dock Street, as far as South Street
    for (const L of m.lanes) if (L.axis === "y" && L.at > 96 && L.at < 100) L.to = 163;
    m.street("y", 4, 2);         // the Outer Road
    m.street("x", 162, 2);       // South Street
    m.street("y", 214, 2);       // the East Road

    // ================= the landing field =================
    m.fill(10, 8, 84, 94, G.PAD);
    m.fill(10, 60, 84, 6, G.TARMAC); m.fill(58, 8, 5, 94, G.TARMAC);
    m.daub({ type: "line", x: 10, y: 63, x2: 94, y2: 63, color: "rgba(255,200,90,.6)", dash: [6, 6] });
    m.daub({ type: "line", x: 60.5, y: 8, x2: 60.5, y2: 102, color: "rgba(255,200,90,.6)", dash: [6, 6] });
    m.driveway(10, 60, 1, 6, "w");                                            // the taxiway gate onto the Outer Road

    // ---- Starport Control: the operations floor, the radar room, the supervisor's office; the tower beside it ----
    {
      const sc = m.structure({ x: 12, y: 10, w: 30, d: 20, floors: 3, style: "glass", floor: G.CARPET, name: "Starport Control", doors: [["s", 12, 3], ["e", 8, 2]],
        signs: [{ face: "s", text: "STARPORT CONTROL", at: 3, z: 34, color: "#54f2ff" }] });
      m.partition(sc, 13, 17, 28, 1, [[5, 2], [20, 2]]);
      m.partition(sc, 26, 11, 1, 6, []);
      m.prop("box", 27, 18.3, { w: 12, d: 0.3, h: 18, side: "#1a2030", glow: "#54f2ff", glowR: 16, screen: "#54f2ff" });   // the big board
      for (const y of [21, 24, 27]) for (let x = 15; x < 39; x += 3) if (x < 24 || x > 27) m.prop("box", x + 0.5, y + 0.5, { w: 2, d: 0.8, h: 6, side: "#2a3044", top: "#3a4258", screen: "#54f2ff" });
      m.prop("box", 19, 13.5, { w: 2.4, d: 2.4, h: 5, side: "#1a2a1a", top: "#2a6a3a", glow: "#4ade6a", glowR: 10 });         // the radar scope
      m.prop("box", 34, 12.6, { w: 3, d: 0.8, h: 6, side: "#3a2418", top: "#8a5a3a", screen: "#9ff7ff" });                  // the supervisor's desk
      m.prop("box", 39.5, 12.5, { w: 1, d: 0.8, h: 10, side: "#5a6070", top: "#8a90a0" });                                  // the safe
      m.loot.push({ type: "pistol", ammo: 24, x: 38.5, y: 15.5 });
      m.building({ x: 43, y: 10, w: 5, d: 5, floors: 14, style: "glass", roofKit: "beacon", name: "Control tower", signs: [{ face: "e", text: "TOWER", at: 0.6, z: 180, color: "#54f2ff" }] });
      void sc;
    }
    // ---- the fuel farm: round tanks, pipes, a bowser ----
    silo(14, 36, 46, "#c8ccd4", "FUEL"); silo(19, 36, 46, "#c8ccd4"); silo(24, 36, 46, "#c8ccd4");
    silo(14, 42, 40, "#b8bcc4"); silo(19, 42, 40, "#b8bcc4");
    for (let x = 14; x < 30; x++) m.prop("box", x + 0.5, 47.5, { w: 1, d: 0.3, h: 3, side: "#a8323e", top: "#c84a4a" });   // the pipe
    for (let i = 0; i < 6; i++) m.prop("barrel", 31.5 + (i % 3), 40.5 + (i / 3 | 0), { color: "#a8323e" });
    m.prop("truck", 28.5, 50.5, { color: "#a8323e", axis: "y" });
    flood(30, 36); flood(12, 52);

    // ---- Pad 1: a rounded square, ringed with the maintenance crews' gear ----
    {
      const X0 = 17, Y0 = 68, X1 = 50, Y1 = 100;
      m.daub({ type: "rrect", x: X0, y: Y0, x2: X1, y2: Y1, r: 5, color: "rgba(255,176,0,.6)", w: 2 });
      m.daub({ type: "rrect", x: X0 + 2, y: Y0 + 2, x2: X1 - 2, y2: Y1 - 2, r: 4, color: "rgba(255,176,0,.25)", w: 1 });
      m.daub({ type: "text", x: (X0 + X1) / 2, y: (Y0 + Y1) / 2, text: "PAD 1", color: "rgba(255,176,0,.55)", size: 16 });
      // the gear: along the outside of the square, a piece every couple of tiles
      for (let x = X0 + 2; x < X1 - 1; x += 2 + Math.floor(rng() * 2)) { pick(GEAR)(x + 0.5, Y0 - 1.2); pick(GEAR)(x + 0.5, Y1 + 0.6); }
      for (let y = Y0 + 3; y < Y1 - 2; y += 2 + Math.floor(rng() * 2)) { pick(GEAR)(X0 - 2.5, y + 0.5); if (rng() < 0.7) pick(GEAR)(X0 - 4.5, y + 0.5); pick(GEAR)(X1 + 2.5, y + 0.5); if (rng() < 0.6) pick(GEAR)(X1 + 4.5, y + 0.5); }
      for (const [x, y] of [[X0 - 1, Y0 - 1], [X1 + 1, Y0 - 1], [X0 - 1, Y1], [X1 + 1, Y1]]) flood(x, y, 7);
      m.crowd(X0 - 3, (Y0 + Y1) / 2, 3, 4);
    }
    // ---- Pad 2 and Pad 3: empty and waiting ----
    m.daub({ type: "circle", x: 78, y: 30, r: 12, color: "rgba(84,242,255,.45)", w: 2 });
    m.daub({ type: "text", x: 78, y: 30, text: "PAD 2", color: "rgba(84,242,255,.55)", size: 14 });
    for (const [x, y] of [[66, 44.5], [69, 44.5], [90, 16.5]]) pick(GEAR)(x + 0.5, y);
    m.daub({ type: "circle", x: 78, y: 84, r: 12, color: "rgba(255,82,102,.45)", w: 2 });
    m.daub({ type: "text", x: 78, y: 84, text: "PAD 3", color: "rgba(255,82,102,.55)", size: 16 });
    for (let a = 0; a < 12; a++) m.prop("cone", 78 + Math.cos(a / 12 * Math.PI * 2) * 12.5, 84 + Math.sin(a / 12 * Math.PI * 2) * 12.5);
    m.prop("truck", 70.5, 97.5, { color: "#d8a01a" });
    for (const [x, y] of [[66, 72], [90, 72], [66, 96], [90, 96], [90, 12], [66, 12], [90, 48]]) flood(x, y);

    // ================= Hangar Row and the cargo yard =================
    m.fill(102, 8, 56, 93, G.TARMAC);
    for (const y of [26, 50, 76]) m.driveway(102, y, 1, 4, "w");            // gates onto Dock Street
    m.driveway(128, 100, 4, 1, "s");                                          // and onto Port Avenue
    const hangar = (x, y, w, d, floors, sign, fit) => {
      const s = m.structure({ x, y, w, d, floors, style: "metal", floor: G.TARMAC, name: sign, doors: [["s", Math.floor(w / 2) - 3, 6], ["n", 2, 2]],
        signs: [{ face: "s", text: sign, at: Math.max(0.5, w / 2 - sign.length * 0.17), z: floors * 14 - 8, color: "#ffb000", size: 10 }] });
      // workbenches along the back wall, a craft or a job on the floor
      for (let i = x + 2; i < x + w - 2; i += 3) m.prop("box", i + 0.5, y + 1.6, { w: 2, d: 0.7, h: 6, side: "#3a3f4e", top: "#5a6070", screen: rng() < 0.4 ? "#ffb000" : null });
      fit(s);
      return s;
    };
    const craft = (x, y, col) => { big(x, y, 6, 3, { h: 14, side: col, top: W.shade(col, 1.2) }); m.prop("box", x - 0.5, y + 1.5, { w: 0.8, d: 0.8, h: 4, side: "#5a6070" }); };
    hangar(104, 10, 18, 14, 4, "BAY 7", () => { craft(110, 15, "#5a6a8a"); for (let i = 0; i < 4; i++) m.prop("crate", 106.5 + i, 21.5, { n: 2 }); });
    hangar(126, 10, 18, 14, 4, "BAY 8", () => { craft(132, 15, "#8a5a3a"); pick(GEAR)(129.5, 20.5); pick(GEAR)(140.5, 20.5); });
    hangar(104, 32, 18, 14, 4, "BAY 9", () => {
      // the outfitters: racks of what can't be bought in town
      for (let i = 0; i < 5; i++) m.prop("box", 106.5 + i * 3, 36.5, { w: 2, d: 0.6, h: 12, side: "#1a1e2a", screen: "#ff5266", glow: i % 2 ? "#ff5266" : null });
      m.prop("box", 112.5, 41, { w: 6, d: 0.8, h: 7, side: "#3a2418", top: "#8a5a3a", screen: "#4ade6a" });
      m.loot.push({ type: "shotgun", ammo: 20, x: 108.5, y: 39.5 }, { type: "uzi", ammo: 60, x: 117.5, y: 39.5 });
    });
    hangar(126, 32, 18, 14, 4, "BAY 10", () => { craft(132, 37, "#3a6a5a"); for (let i = 0; i < 6; i++) m.prop("barrel", 128.5 + i, 43.5, { color: "#d8a01a" }); });
    hangar(147, 10, 10, 20, 3, "BAY 11", () => { for (let j = 0; j < 4; j++) m.prop("crate", 151.5, 14.5 + j * 3, { n: 3 }); m.prop("truck", 149.5, 25.5, { color: "#5a6a8a" }); });
    for (const [x, y] of [[103, 27], [124, 27], [145, 27], [103, 49], [124, 49], [145, 49]]) flood(x, y, 5);
    for (const [x, y, c] of [[110.5, 28.5, "#d8a01a"], [133.5, 28.5, "#5a6a8a"], [112.5, 50.5, "#a8323e"]]) m.prop("truck", x, y, { color: c });
    // the cargo yard
    const COLS = ["#7a3a2a", "#2a5a7a", "#3a6a3a", "#8a6a1a", "#5a2a5a", "#7a7a80", "#2a3a6a", "#9a4a1a"];
    for (let c = 0; c < 7; c++) for (let r = 0; r < 11; r++) {
      if (c === 3 || r === 5 || rng() < 0.08) continue;
      m.building({ x: 104 + c * 8, y: 56 + r * 4, w: 6, d: 2, floors: 1 + Math.floor(rng() * 3), style: "container", color: pick(COLS) });
    }
    m.prop("crane", 131, 66); m.prop("crane", 131, 90);
    for (const [x, y] of [[129, 56], [129, 99], [103, 77], [156, 77]]) flood(x, y);

    // ================= the Port Authority, the Customs House, the terminal =================
    {
      const pa = m.structure({ x: 162, y: 10, w: 28, d: 22, floors: 5, style: "concrete", floor: G.CARPET, name: "Port Authority", doors: [["s", 11, 4], ["w", 8, 2]],
        signs: [{ face: "s", text: "PORT AUTHORITY", at: 4, z: 60, color: "#ffd04a" }] });
      m.partition(pa, 163, 23, 26, 1, [[4, 2], [12, 2], [21, 2]]);
      m.partition(pa, 171, 11, 1, 12, [[5, 2]]); m.partition(pa, 180, 11, 1, 12, [[5, 2]]);
      m.floorIn(163, 24, 26, 7, G.PLAZA);
      m.prop("box", 176, 25.4, { w: 6, d: 0.8, h: 7, side: "#2a3044", top: "#3a4258", screen: "#ffd04a" });   // the front desk
      for (const x of [165, 167, 187]) m.prop("bench", x + 0.5, 29.5);
      for (let j = 0; j < 4; j++) m.prop("box", 164.5, 12.5 + j * 2.5, { w: 0.6, d: 1.8, h: 14, side: "#5a5040", top: "#7a7060" });   // the records
      for (let j = 0; j < 3; j++) m.prop("box", 175.5, 13.5 + j * 3, { w: 1.6, d: 0.8, h: 6, side: "#3a3f4e", screen: "#9ff7ff" });
      m.prop("box", 185, 13, { w: 3, d: 1, h: 6, side: "#3a2418", top: "#8a5a3a", screen: "#ffd04a" });   // the harbour master's desk
      m.prop("box", 188.4, 20.5, { w: 0.8, d: 1, h: 10, side: "#5a6070", top: "#8a90a0" });
      m.loot.push({ type: "medikit", ammo: 1, x: 186.5, y: 19.5 });
      m.light(176, 28, 5, "#ffcf80", 0.14);
      const cu = m.structure({ x: 162, y: 38, w: 28, d: 24, floors: 3, style: "brick", floor: G.INDOOR, name: "Customs House", doors: [["s", 4, 3], ["n", 12, 3]],
        signs: [{ face: "s", text: "CUSTOMS", at: 13, z: 34, color: "#ffd04a" }] });
      m.partition(cu, 180, 39, 1, 22, [[3, 2], [15, 2]]);
      m.partition(cu, 181, 50, 8, 1, [[2, 2]]);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) m.prop("box", 165.5 + i * 5, 43.5 + r * 5, { w: 3, d: 1.2, h: 5, side: "#5a6070", top: "#c8ccd4" });   // inspection tables
      big(173, 57, 2, 1, { h: 16, side: "#3a3f4e", top: "#5a6070", glow: "#54f2ff" });                 // the scanner arch
      for (let i = 181; i < 189; i++) if (i !== 182 && i !== 186) m.prop("bars", i + 0.5, 55.5, { axis: "x" });   // the holding cells, their doors open
      m.partition(cu, 184, 56, 1, 5, []);
      for (let i = 0; i < 6; i++) m.prop("crate", 182.5 + (i % 3) * 2, 40.5 + Math.floor(i / 3) * 2, { n: 2 });   // the evidence room
      m.loot.push({ type: "uzi", ammo: 50, x: 187.5, y: 47.5 });
      m.light(171, 50, 6, "#fff3c4", 0.12);
      // the terminal: check-in, security, the departure lounge under a glass vault, the Spacers' Bar
      const te = m.structure({ x: 162, y: 68, w: 48, d: 32, floors: 3, style: "glass", floor: G.PLAZA, name: "Starport Terminal",
        roofs: [{ x: 164, y: 70, w: 44, d: 28, kind: "vault", rise: 18 }],
        doors: [["s", 10, 4], ["s", 30, 4], ["w", 12, 3], ["e", 12, 3], ["n", 6, 3]],
        signs: [{ face: "s", text: "STARPORT TERMINAL", at: 15.5, z: 34, color: "#54f2ff", size: 11 }] });
      for (let x = 165; x < 194; x += 3) m.prop("box", x + 0.5, 73.5, { w: 2, d: 0.8, h: 7, side: "#2a3044", top: "#5a6070", screen: "#54f2ff" });   // check-in
      for (let x = 164; x < 194; x++) if (x % 6 !== 0 && x % 6 !== 1) m.prop("box", x + 0.5, 79.5, { w: 1, d: 0.4, h: 6, side: "#3a3f4e", top: "#ffd04a" });   // the security line
      for (let r = 0; r < 4; r++) for (let x = 166; x < 192; x += 2) if (x % 8 !== 0) m.prop("bench", x + 0.5, 84.5 + r * 3);
      m.partition(te, 196, 69, 1, 18, [[8, 3]]);
      m.partition(te, 197, 86, 12, 1, [[4, 3]]);
      m.prop("box", 202, 71.5, { w: 8, d: 0.8, h: 8, side: "#3a2418", top: "#8a5a3a", glow: "#ff8fd8" });   // the Spacers' Bar
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) m.prop("table", 199.5 + i * 5, 76.5 + j * 4);
      m.loot.push({ type: "pistol", ammo: 20, x: 207.5, y: 84.5 });
      m.light(185, 90, 8, "#9ff7ff", 0.1); m.light(202, 77, 4, "#ff8fd8", 0.2);
      m.crowd(180, 90, 6, 12); m.crowd(202, 78, 3, 5); m.crowd(178, 75, 4, 6);
      K.parking(m, rng, 193, 10, 18, 52, { fill: 0.55, gates: [["w", 24], ["e", 10]] });
      void pa; void cu;
    }

    // ================= the warehouses =================
    m.lane(8, 128, 205, 3, G.ROAD);
    const shed = (x, y, w, d, sign, col) => {
      const style = pick(["concrete", "brick", "metal"]);
      return m.building({ x, y, w, d, floors: 2 + Math.floor(rng() * 3), style, door: style === "metal" ? "s" : undefined, signs: sign ? [{ face: "s", text: sign, at: 0.8, z: 22, color: col }] : undefined });
    };
    // a warehouse you can walk into: rows of crates with aisles, a forklift, the office in a corner
    const store = (x, y, w, d, name, sign, col, doors, loot) => {
      const s = m.structure({ x, y, w, d, floors: 3, style: "metal", floor: G.INDOOR, name, doors, signs: [{ face: "s", text: sign, at: 1, z: 30, color: col }] });
      m.partition(s, x + w - 8, y + 1, 1, 6, [[3, 2]]); m.partition(s, x + w - 7, y + 7, 6, 1, []);
      m.prop("box", x + w - 4, y + 2.6, { w: 2.4, d: 0.8, h: 6, side: "#3a3f4e", screen: col });
      for (let r = y + 3; r < y + d - 3; r += 4) for (let i = x + 2; i < x + w - (r < y + 9 ? 10 : 2); i++) if ((i - x) % 7 !== 0 && rng() < 0.85) m.prop("crate", i + 0.5, r + 0.5, { n: 1 + Math.floor(rng() * 3) });
      m.prop("box", x + 3.5, y + d - 2.5, { w: 0.8, d: 1.3, h: 7, side: "#c8a01a", top: "#e8c04a" });   // a forklift
      m.loot.push(Object.assign({ x: x + w - 3.5, y: y + 4.5 }, loot));
      return s;
    };
    shed(10, 110, 14, 12);
    {
      const sk = m.structure({ x: 26, y: 110, w: 16, d: 14, floors: 2, style: "metal", floor: G.INDOOR, name: "Skooma Imports", doors: [["s", 6, 4]], signs: [{ face: "s", text: "SKOOMA IMPORTS", at: 0.6, z: 22, color: "#4ade6a" }] });
      for (let i = 0; i < 8; i++) m.prop("crate", 28.5 + i, 112.5, { n: 2 });
      for (const x of [30, 35]) m.prop("box", x, 117, { w: 3, d: 1.2, h: 5, side: "#5a6070", top: "#2a5a3a", glow: "#4ade6a", glowR: 8 });   // the cook's benches
      m.partition(sk, 38, 111, 1, 8, [[5, 2]]);
      m.loot.push({ type: "uzi", ammo: 40, x: 40.5, y: 113.5 });
      void sk;
    }
    shed(44, 110, 12, 12);
    m.structure({ x: 58, y: 110, w: 16, d: 14, floors: 2, style: "brick", floor: G.WOOD, name: "Moonsugar Co.", doors: [["s", 6, 3]], signs: [{ face: "s", text: "MOONSUGAR CO.", at: 0.8, z: 22, color: "#b47dff" }] });
    for (let i = 0; i < 10; i++) m.prop("barrel", 60.5 + i, 112.5, { color: "#b47dff" });
    for (const x of [62, 68]) m.prop("box", x, 117, { w: 3, d: 1, h: 6, side: "#3a3f4e", top: "#c8ccd4", screen: "#b47dff" });
    {
      const dn = m.structure({ x: 76, y: 110, w: 14, d: 12, floors: 2, style: "brick", floor: G.WOOD, name: "Starport Diner", doors: [["s", 3, 2]], signs: [{ face: "s", text: "STARPORT DINER", at: 5, z: 20, color: "#ff8fd8" }] });
      m.partition(dn, 77, 114, 12, 1, [[9, 2]]);
      m.prop("box", 82, 115.5, { w: 8, d: 0.8, h: 7, side: "#c8ccd4", top: "#e8e4dc", glow: "#ff8fd8" });
      for (let i = 0; i < 4; i++) m.prop("box", 78 + i * 3, 119.5, { w: 1.8, d: 1, h: 4, side: "#a8323e" });
      m.light(83, 118, 4, "#ff8fd8", 0.2); m.crowd(83, 118, 2.5, 4);
      void dn;
    }
    store(10, 134, 30, 24, "Warehouse 4", "WAREHOUSE 4", "#ffb000", [["n", 6, 4], ["n", 20, 4], ["s", 12, 3]], { type: "shotgun", ammo: 16 });
    shed(42, 134, 14, 20); shed(58, 134, 16, 20); shed(76, 134, 16, 20);
    shed(104, 110, 14, 12);
    {
      const b13 = m.structure({ x: 120, y: 110, w: 18, d: 14, floors: 2, style: "concrete", floor: G.INDOOR, name: "Bay 13 Storage", doors: [["s", 4, 3]], signs: [{ face: "s", text: "BAY 13 STORAGE", at: 7.5, z: 22, color: "#ff5266" }] });
      for (const x of [125, 130]) m.partition(b13, x, 111, 1, 8, [[6, 2]]);
      for (let i = 0; i < 9; i++) m.prop("crate", 121.5 + (i % 3) + (i > 5 ? 10 : i > 2 ? 5 : 0), 112.5 + Math.floor((i % 3) / 2), { n: 3 });
      m.loot.push({ type: "uzi", ammo: 40, x: 134.5, y: 113.5 });
      void b13;
    }
    shed(140, 110, 18, 12); shed(160, 110, 16, 12); shed(178, 110, 14, 12); shed(194, 110, 16, 12);
    store(104, 134, 32, 24, "Warehouse 9", "WAREHOUSE 9", "#54f2ff", [["n", 8, 4], ["n", 22, 4], ["s", 14, 3]], { type: "uzi", ammo: 50 });
    shed(138, 134, 18, 20); shed(158, 134, 16, 20); shed(176, 134, 16, 20); shed(194, 134, 16, 20);
    K.lamps(m, 10, 103.3, 93, 103.3, 9); K.lamps(m, 102, 108.7, 211, 108.7, 9);
    K.lamps(m, 10, 127.3, 93, 127.3, 10); K.lamps(m, 102, 127.3, 211, 127.3, 10);
    K.lamps(m, 100.7, 10, 100.7, 100, 10); K.lamps(m, 8.7, 10, 8.7, 100, 12);
    K.lamps(m, 10, 160.3, 211, 160.3, 10);
    for (const [x, y, c] of [[30.5, 125.5, "#4a6a3a"], [64.5, 125.5, "#5a5a6a"], [124.5, 125.5, "#7a3a2a"]]) m.prop("truck", x, y, { color: c });

    // ================= the cradle, and the PCS Moonsugar in it =================
    /* The PCS Moonsugar, a Corellian corvette, bow to the west, filling the
     * cradle to the map's south edge. A wide flat hammerhead forward with the
     * bridge in it and the cockpit jutting ahead of it; a narrow neck, the
     * crew deck, behind; then the fat round midsection, the cargo bay, turrets and the radar dish on
     * top; then engineering, and the great engine block aft with its eleven
     * thrusters facing east. Her centre line is y 199..200. */
    const Z0 = 28, HULL = "#bcb8b0", C = 199;
    m.fill(8, 168, 205, 56, G.PAD);
    m.daub({ type: "rect", x: 8.5, y: 174.5, x2: 211.5, y2: 223.5, color: "rgba(255,176,0,.45)", w: 2 });
    const vault = (x, y, w, d, rise, o = {}) => [Object.assign({ x: x + 1, y: y + 1, w: w - 2, d: d - 2, kind: "vault", rise, metal: true, spine: true, greeble: true }, o)];
    const HULLS = [];
    // a section of hull hw tiles either side of the centre line; doors on the centre line by default
    const section = (x, w, hw, floors, name, rise, o = {}, style = "ship") => {
      const y = C + 1 - hw, d = 2 * hw;
      HULLS.push([x, x + w - 1, y, y + d - 1]);
      const doors = (o.doors || []).map(([side, at, wd]) => [side, at === "c" ? C - (y + 1) : at === "belly" ? C + 6 - (y + 1) : at, wd]);
      return m.structure({ x, y, w, d, floors, z0: Z0, style, roof: HULL, floor: G.INDOOR, name, doors, roofs: vault(x, y, w, d, rise, o), signs: o.signs });
    };
    section(10, 4, 5, 1, "The Moonsugar's cockpit", 16, { glass: 4, doors: [["e", "c", 2]] }, "shipPorts");
    const bridge = section(14, 24, 21, 2, "The Moonsugar's bridge", 24, { glass: 3, doors: [["w", "c", 2], ["e", "c", 2]] }, "shipPorts");
    const crew = section(38, 24, 10, 2, "The Moonsugar's crew deck", 40, { doors: [["w", "c", 2], ["e", "c", 2], ["n", 11, 2]] }, "shipPorts");
    const cargo = section(62, 72, 21, 2, "The Moonsugar's cargo bay", 72, { doors: [["w", "c", 2], ["e", "c", 2], ["n", 34, 4]],
      details: [{ u: 8, v: 19, kind: "turret" }, { u: 22, v: 15, kind: "dish" }, { u: 50, v: 19, kind: "turret" }, { u: 40, v: 30, kind: "turret" }],
      signs: [{ face: "s", text: "PCS MOONSUGAR", at: 26, z: 28, color: "#a8323e", size: 12 }] });
    const engr = section(134, 28, 21, 2, "The Moonsugar's engineering deck", 72, { doors: [["w", "c", 2], ["e", "c", 2], ["n", 15, 2]] });
    const eng = section(162, 44, 24, 6, "The Moonsugar's engine room", 26, { doors: [["w", "c", 2]] });
    // the eleven thrusters: six below, five above
    m.prop("thrusters", 206.5, 223.5, { fx: 206, r: 24, rows: [[Z0 + 22, [180.5, 188.5, 196.5, 204.5, 212.5, 220.5]], [Z0 + 62, [184.5, 192.5, 200.5, 208.5, 216.5]]] });
    m.light(210, C, 9, "#ff6a4a", 0.22);
    // machinery filling part of a section: a solid block of engine, pipes and housings
    const machinery = (S, x, y, w, d, glow) => m.building({ x, y, w, d, floors: S.floors, style: "machine", glow, struct: S.id, inner: true, name: "Machinery" });
    // the airlocks, on the starport side: a room inside the hull's north wall, a landing outside its
    // door, a ramp down to the tarmac, low walls either side so nobody climbs on halfway
    const airlock = (S, ax, wy) => {
      m.partition(S, ax - 3, wy + 1, 1, 3, []); m.partition(S, ax + 4, wy + 1, 1, 3, []);
      m.partition(S, ax - 3, wy + 4, 8, 1, [[3, 2]]);
      m.deckArea(ax, wy - 2, 2, 2, Z0);
      m.deckRamp(ax, wy - 9, 2, 7, "s", Z0);
      for (let y = wy - 9; y <= wy - 1; y++) {
        const h = y >= wy - 2 ? Z0 - 2 : Math.max(2, Z0 * (y - (wy - 9) + 0.5) / 7 - 2);
        for (const x of [ax - 1, ax + 2]) m.prop("box", x + 0.5, y + 0.5, { w: 0.4, d: 1, h, side: "#8a8680", top: "#a8323e", blocks: h > 12 });
      }
      m.light(ax + 1, wy - 10, 3, "#ffb000", 0.18);
    };
    airlock(crew, 49, C - 9); airlock(engr, 149, C - 20);
    // the cargo ramp: four wide, down from the main cargo bay's door to the starport side
    m.deckArea(96, C - 22, 4, 2, Z0);
    m.deckRamp(96, C - 29, 4, 7, "s", Z0);
    for (let y = C - 29; y <= C - 21; y++) {
      const h = y >= C - 22 ? Z0 - 2 : Math.max(2, Z0 * (y - (C - 29) + 0.5) / 7 - 2);
      for (const x of [95, 100]) m.prop("box", x + 0.5, y + 0.5, { w: 0.4, d: 1, h, side: "#8a8680", top: "#a8323e", blocks: h > 12 });
    }
    m.light(98, C - 30, 4, "#ffb000", 0.2);
    // the cockpit: two seats at the glass
    m.prop("box", 11.5, C - 1.5, { w: 0.8, d: 0.8, h: 5, side: "#8a2a2a" }); m.prop("box", 11.5, C + 2.5, { w: 0.8, d: 0.8, h: 5, side: "#8a2a2a" });
    // the hammerhead: the bridge at the front, the captain's quarters north of it and the comms room
    // south; a corridor across behind them; the conference room, the escape pods, the spine aft
    m.partition(bridge, 27, C - 19, 1, 40, [[4, 2], [19, 2], [33, 2]]);
    m.partition(bridge, 15, C - 7, 12, 1, []); m.partition(bridge, 15, C + 9, 12, 1, []);
    m.partition(bridge, 30, C - 19, 1, 18, [[8, 2]]); m.partition(bridge, 30, C + 3, 1, 17, [[8, 2]]);
    m.partition(bridge, 31, C - 2, 6, 1, []); m.partition(bridge, 31, C + 2, 6, 1, []);
    for (const [dx, dy] of [[1.5, -5], [1.5, -3], [1.5, 4], [1.5, 6], [4.5, -6], [4.5, 7], [8.5, -6], [8.5, 7]])
      m.prop("box", 14 + dx, C + dy + 0.5, { w: 0.9, d: 0.9, h: 6, side: "#2a3044", top: "#3a4258", screen: "#54f2ff" });
    m.prop("box", 21, C + 1, { w: 1.2, d: 1.2, h: 5, side: "#8a2a2a", top: "#c83a3a" });   // the captain's chair
    big(24, C, 2, 2, { h: 5, side: "#2a3044", top: "#2a5a6a", glow: "#4ade6a", glowR: 8 });
    m.prop("box", 18, C - 16, { w: 3, d: 1.6, h: 4, side: "#4a3a5a", top: "#c8c0b0" }); m.prop("box", 24, C - 17.4, { w: 2, d: 0.7, h: 6, side: "#3a2418", screen: "#ffcf6b" });   // the captain's quarters
    m.loot.push({ type: "pistol", ammo: 24, x: 16.5, y: C - 12.5 });
    for (let x = 16; x < 26; x += 2) m.prop("box", x + 0.5, C + 18.4, { w: 1.4, d: 0.7, h: 10, side: "#1a2030", screen: "#9ff7ff" });   // the comms racks
    big(32, C - 12, 3, 4, { h: 5, side: "#3a2418", top: "#8a5a3a" });                                                            // the conference table
    for (let y = C + 6; y < C + 19; y += 3) m.prop("box", 35.5, y + 0.5, { w: 1.2, d: 1.6, h: 12, side: "#c8c4bc", top: "#a8323e" });   // escape pods
    // the crew deck: the corridor on the centre line, cabins to the south, the mess, galley and medbay to the north
    m.partition(crew, 39, C + 3, 22, 1, [[1, 1], [6, 1], [11, 1], [16, 1]]);
    for (const x of [43, 48, 53, 58]) m.partition(crew, x, C + 4, 1, 6, []);
    for (const x of [39, 44, 49, 54]) m.prop("box", x + 2, C + 8, { w: 2.2, d: 1, h: 5, side: "#4a4e58", top: "#c8c0b0" });   // bunks
    m.partition(crew, 39, C - 3, 22, 1, [[2, 2], [16, 2]]);
    for (const x of [40.5, 43.5]) m.prop("table", x, C - 5.5);
    m.prop("box", 41, C - 7.6, { w: 3, d: 0.7, h: 7, side: "#8a90a0", top: "#c8ccd4" });   // the galley
    m.prop("box", 58.5, C - 6.5, { w: 2, d: 1, h: 4, side: "#c8ccd4", top: "#f2eefa" });   // the medbay cot
    m.loot.push({ type: "medikit", ammo: 1, x: 56.5, y: C - 4.5 }, { type: "medikit", ammo: 1, x: 59.5, y: C - 4.5 });
    // the holds: crates in rows, containers, a forklift
    const hold = (x0, x1, door) => {
      for (const r of [C - 18, C - 17, C - 12, C - 11, C + 12, C + 13, C + 18, C + 19]) for (let x = x0; x < x1; x++) if ((x - x0) % 7 !== 6 && Math.abs(x + 0.5 - door) > 3 && rng() < 0.85) m.prop("crate", x + 0.5, r + 0.5, { n: 1 + Math.floor(rng() * 3) });
      for (let x = x0 + 2; x < x1 - 6; x += 9) big(x, C - 6, 5, 2, { h: 22, side: pick(COLS), top: "#5a6070" });
      for (let x = x0 + 6; x < x1 - 4; x += 9) if (Math.abs(x - door) > 4) big(x, C + 3, 3, 2, { h: 14, side: pick(COLS), top: "#5a6070" });
      m.prop("box", (x0 + x1) / 2 + 0.5, C + 0.5, { w: 0.8, d: 1.3, h: 7, side: "#c8a01a", top: "#e8c04a" });
    };
    hold(63, 133, 98);
    m.loot.push({ type: "uzi", ammo: 60, x: 66.5, y: C + 0.5 });
    // engineering: the corridor down the centre line, the workshop and the parts store to the north
    // (the airlock between them), the fabrication bay and life support to the south
    m.partition(engr, 135, C - 1, 26, 1, [[4, 2], [14, 2], [22, 2]]);
    m.partition(engr, 135, C + 2, 26, 1, [[3, 2], [12, 2]]);
    m.partition(engr, 148, C - 15, 1, 14, [[9, 2]]); m.partition(engr, 151, C - 15, 1, 14, [[11, 2]]);
    m.partition(engr, 146, C + 3, 1, 17, [[6, 2]]);
    for (let x = 136; x < 146; x += 3) m.prop("box", x + 0.5, C - 18.4, { w: 2, d: 0.7, h: 6, side: "#3a3f4e", top: "#5a6070", screen: rng() < 0.5 ? "#4ade6a" : null });
    for (let x = 137; x < 146; x += 2) m.prop("box", x + 0.5, C - 6.6, { w: 1.4, d: 0.6, h: 16, side: "#5a6070", top: "#7a8090" });
    machinery(engr, 136, C - 14, 4, 5, "#4ade6a");
    for (let i = 0; i < 12; i++) m.prop("crate", 153.5 + (i % 3) * 2, C - 17.5 + Math.floor(i / 3) * 3, { n: 1 + (i % 2) });
    m.loot.push({ type: "shotgun", ammo: 20, x: 159.5, y: C - 4.5 });
    big(138, C + 6, 4, 3, { h: 14, side: "#2a3044", top: "#3a4258", glow: "#b47dff", glowR: 10 });   // the fabricator
    machinery(engr, 136, C + 12, 9, 7, "#b47dff");
    machinery(engr, 149, C + 3, 11, 7, "#54aaff"); machinery(engr, 149, C + 13, 11, 6, "#54aaff");   // life support, a crawlway between
    // the engine room: almost all engine. A corridor on the centre line from the door to the
    // thrusters, a ring round the outside, three cross corridors; machinery in every block between,
    // and the reactor in the middle of it with a walkway round it
    const EX0 = 163, EX1 = 204, EY0 = C - 22, EY1 = C + 23;            // the interior
    const CORX = [[EX0, 2], [176, 2], [190, 2], [EX1 - 1, 2]], CORY = [[EY0, 2], [C, 2], [EY1 - 1, 2]];
    const xs = [], ys = [];
    for (let i = 0; i + 1 < CORX.length; i++) xs.push([CORX[i][0] + CORX[i][1], CORX[i + 1][0] - 1]);
    for (let j = 0; j + 1 < CORY.length; j++) ys.push([CORY[j][0] + CORY[j][1], CORY[j + 1][0] - 1]);
    for (const [x0, x1] of xs) for (const [y0, y1] of ys) {
      if (x0 === 178) {
        // the reactor block: a walkway round the reactor, a way in from the corridor
        const ry0 = y0 < C ? y0 : y0, mid = Math.floor((y0 + y1) / 2);
        machinery(eng, x0, y0, x1 - x0 + 1, 2, "#ff6a4a"); machinery(eng, x0, y1 - 1, x1 - x0 + 1, 2, "#ff6a4a");
        if (y0 < C) big(x0 + 3, mid - 3, 6, 6, { h: 56, side: "#2a3044", top: "#ff6a4a", glow: "#ff6a4a", glowR: 24 });
        else machinery(eng, x0 + 3, mid - 2, 6, 5, "#ff9a3c");
        void ry0;
      } else machinery(eng, x0, y0, x1 - x0 + 1, y1 - y0 + 1, x0 > 190 ? "#ff9a3c" : "#54aaff");
    }
    m.prop("box", EX0 + 0.5, C - 1.6, { w: 0.6, d: 0.6, h: 8, side: "#2a3044", screen: "#54f2ff" });
    m.loot.push({ type: "medikit", ammo: 1, x: EX1 - 0.5, y: EY0 + 0.5 });
    void bridge; void cargo; void eng;
    // the cradle: clamps under the hull's north edge (the south runs off the map), gantries, gear on the apron
    for (let x = 12; x < 206; x += 6) {
      if ((x > 93 && x < 102) || (x > 46 && x < 54) || (x > 146 && x < 154)) continue;
      const H = HULLS.find(([x0, x1]) => x >= x0 && x <= x1);
      if (!H) continue;
      for (const y of [H[2] - 2, H[3] + 1]) if (y < 224 && m.propAt[m.i(x, y)] < 0) m.prop("box", x + 0.5, y + 0.5, { w: 0.8, d: 1.4, h: Z0 + 2, side: "#4a5060", top: "#ffb000", blocks: true });
    }
    for (const x of [26, 76, 122, 186]) m.prop("crane", x, 170);
    for (let x = 12; x < 210; x += 3 + Math.floor(rng() * 3)) {
      if ((x > 44 && x < 56) || (x > 144 && x < 156) || (x > 92 && x < 103)) continue;
      const H = HULLS.find(([x0, x1]) => x >= x0 && x <= x1), top = H ? H[2] - 3 : 175;
      if (top > 170) pick(GEAR)(x + 0.5, 170.5 + rng() * (top - 170.5));
    }
    for (const x of [20, 66, 110, 136, 180, 206]) flood(x, 169, 6);
    m.crowd(60, 174, 3, 4); m.crowd(140, 171, 3, 4);

    K.signals(m);

    // ================= mission points =================
    for (const [x, y, n] of [[12.5, 102.5, "Port Avenue, west"], [94.5, 102.5, "Port Avenue, by Dock Street"], [150.5, 108.5, "Port Avenue, east"],
      [100.5, 6.5, "Dock Street, north"], [8.5, 40.5, "the Outer Road gate"], [60.5, 160.5, "South Street"], [40.5, 131.5, "the service road"],
      [100.5, 60.5, "Dock Street, by the cargo yard"], [150.5, 131.5, "the service road, east"], [156.5, 52.5, "the east apron"], [124.5, 5.5, "the hangar gate"],
      [212.5, 30.5, "the East Road, north"], [212.5, 120.5, "the East Road"], [11.5, 175.5, "the cradle, at the bow"], [209.5, 171.5, "the cradle, aft"], [70.5, 172.5, "the cradle's north side"],
      [190.5, 102.5, "Port Avenue, by the terminal"]])
      m.point("spawn", x, y, n);
    for (const [x, y, n] of [[0.5, 105.5, "Port Avenue west"], [223.5, 106.5, "Port Avenue east"], [97.5, 0.5, "Dock Street north"],
      [5.5, 0.5, "the Outer Road north"], [5.5, 223.5, "the Outer Road south"], [0.5, 164.5, "South Street west"], [223.5, 163.5, "South Street east"],
      [215.5, 0.5, "the East Road north"], [215.5, 223.5, "the East Road south"]])
      m.point("exit", x, y, n);
    const T = (area, list) => { for (const [x, y, n] of list) m.point("target", x, y, n, area); };
    T("The Moonsugar", [[170, 200, "the Moonsugar's engine room"], [182, 189, "the reactor"], [146, 200, "the Moonsugar's engineering deck"], [149.5, 181, "the engineering airlock"], [76, 194, "the Moonsugar's cargo bay"], [120, 194, "the back of the cargo bay"], [97.5, 174, "the cargo ramp"],
      [49.5, 192, "the crew airlock"], [42, 194.5, "the crew mess"], [58, 194.5, "the Moonsugar's medbay"], [22, 197, "the Moonsugar's bridge"], [20, 187, "the captain's quarters"], [12, 200, "the Moonsugar's cockpit"], [158, 190, "the parts store"]]);
    T("Starport Control", [[26, 24, "the operations floor"], [19, 15.5, "the radar room"], [34, 15, "the supervisor's office"], [45.5, 16.5, "the foot of the tower"]]);
    T("The Fuel Farm", [[24, 50.5, "the fuel farm"]]);
    T("The Pads", [[33.5, 84, "Pad 1"], [14, 84, "the maintenance line at Pad 1"], [78, 30, "Pad 2"], [78, 84, "Pad 3"]]);
    T("Hangar Row", [[113, 20, "Bay 7"], [135, 20, "Bay 8"], [113, 43, "Bay 9's outfitters"], [135, 43, "Bay 10"], [151, 22, "Bay 11"]]);
    T("The Cargo Yard", [[130.5, 77.5, "the middle of the cargo yard"], [110.5, 62.5, "the yard's west stacks"], [131.5, 92.5, "under the south crane"], [150.5, 86.5, "the yard's east stacks"]]);
    T("Port Authority", [[176, 28, "the Port Authority lobby"], [185, 16, "the harbour master's office"], [167, 17, "the records office"]]);
    T("Customs House", [[170, 54, "the customs hall"], [186, 58, "the holding cells"], [186, 44, "the evidence room"]]);
    T("The Terminal", [[178, 76, "check-in"], [180, 91, "the departure lounge"], [203, 79, "the Spacers' Bar"]]);
    T("The Warehouses", [[33, 120, "Skooma Imports"], [66, 120, "Moonsugar Co."], [82, 117.5, "the Starport Diner"], [24, 155, "Warehouse 4"], [128, 120, "Bay 13 Storage"], [119, 155, "Warehouse 9"]]);
  },
});
