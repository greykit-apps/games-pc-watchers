/* The Starport: where the ship lands, trading with other ports. Moonsugar and
 * Skooma come in cheap, and Bay 9 sells what the Watchers can't buy in town.
 *
 *   x 10..93,  y 8..101    the landing field: Pad 1 (the ship), Pad 2, Pad 3,
 *                          the control tower and the fuel farm
 *   x 102..157, y 8..47    Hangar Row: Bays 7 to 11
 *   x 102..157, y 54..100  the cargo yard: container stacks and gantry cranes
 *   y 104..107 Port Avenue    x 96..99 Dock Street    (both with traffic)
 *   y 110..149             warehouses either side of the service road (y 127..129)
 *   x 4..7     the Outer Road    y 150..153 South Street */
"use strict";

W.district({
  id: "starport", name: "Starport", w: 160, h: 160, seed: 9113,
  blurb: "Where the ship lands. Hangars, a container yard, Bay 9's outfitters, and Skooma coming in cheap.",
  names: { targets: ["Captain Koshka", "Skooma Sal", "The Quartermaster", "Bilgewater Tom"], crew: "the Bay 13 smugglers", sec: "Port Authority", guard: "Deckhand", henchman: "Smuggler", civ: "Dockworker" },
  theme: {
    racket: "Skooma straight off the ships, under the Boss's nose",
    secNote: "Port Authority officers patrol the field and the yards. They answer to the port, not the Boss, and they will not know you. Keep weapons holstered near them.",
    ground: "Wide open pads with nowhere to hide, then the cargo yard: stacked containers and narrow aisles.",
    guards: 4, crew: 9, sec: 8, civ: 0.007, civMax: 45,
    crewGuns: ["pistol", "pistol", "uzi", "shotgun"],
    civLook: () => ({ coat: W.pick(["#c86a1a", "#d8a01a", "#5a6a8a"]), trim: "#e8e4dc", legs: "#2a2f3a", fur: W.pick(W.FURS), hat: W.chance(0.4) ? "#d8a01a" : null, hatKind: "cap" }),
    secLook: () => ({ coat: "#3a4256", trim: "#ffd04a", legs: "#232838", fur: W.pick(W.FURS), hat: "#ffd04a", hatKind: "cap" }),
  },
  sections: [
    { id: "field", name: "The Landing Field", x: 0, y: 0, w: 96, h: 104, blurb: "Three pads, the ship on Pad 1, the tower and the fuel farm." },
    { id: "hangars", name: "Hangar Row", x: 96, y: 0, w: 64, h: 58, blurb: "Bays 7 to 11, and the aprons in front of their doors." },
    { id: "cargo", name: "The Cargo Yard", x: 96, y: 50, w: 64, h: 60, blurb: "Containers stacked three high, gantry cranes over the aisles." },
    { id: "warehouses", name: "The Warehouses", x: 0, y: 100, w: 96, h: 60, blurb: "Warehouses, a diner, and Skooma Imports, which imports exactly that." },
    { id: "docks", name: "The East Docks", x: 96, y: 100, w: 64, h: 60, blurb: "Loading docks and warehouses on the far side of Dock Street." },
  ],

  build(m, rng) {
    const G = W.G, K = W.K;
    m.fill(0, 0, 160, 160, G.WALK);
    m.street("x", 104, 3);       // Port Avenue
    m.street("y", 96, 3);        // Dock Street
    m.street("y", 4, 2);         // the Outer Road
    m.street("x", 150, 2);       // South Street

    // ---- the landing field ----
    m.fill(10, 8, 84, 94, G.PAD);
    m.fill(10, 60, 84, 6, G.TARMAC); m.fill(58, 8, 5, 94, G.TARMAC);
    m.daub({ type: "line", x: 10, y: 63, x2: 94, y2: 63, color: "rgba(255,200,90,.6)", dash: [6, 6] });
    m.daub({ type: "line", x: 60.5, y: 8, x2: 60.5, y2: 102, color: "rgba(255,200,90,.6)", dash: [6, 6] });
    // Pad 1, with the ship on it
    m.daub({ type: "circle", x: 36, y: 32, r: 17, color: "rgba(255,176,0,.55)", w: 2 });
    m.daub({ type: "circle", x: 36, y: 32, r: 15, color: "rgba(255,176,0,.3)" });
    m.daub({ type: "text", x: 36, y: 52, text: "PAD 1", color: "rgba(255,176,0,.6)", size: 14 });
    m.building({ x: 22, y: 27, w: 28, d: 10, floors: 4, style: "hull", name: "PCS Moonsugar", signs: [{ face: "s", text: "PCS MOONSUGAR", at: 7, z: 44, color: "#54f2ff" }] });
    m.building({ x: 50, y: 29, w: 6, d: 6, floors: 3, style: "hull" });
    m.building({ x: 30, y: 18, w: 12, d: 9, floors: 2, style: "hull" });
    m.building({ x: 30, y: 37, w: 12, d: 9, floors: 2, style: "hull" });
    m.building({ x: 23, y: 30, w: 4, d: 4, floors: 7, style: "hull" });
    for (const [x, y] of [[20, 12], [52, 12], [20, 50], [52, 50]]) { m.prop("flood", x, y); m.light(x, y + 0.5, 6, "#fffbe8", 0.18); }
    // Pad 2, with a shuttle
    m.daub({ type: "circle", x: 78, y: 26, r: 12, color: "rgba(84,242,255,.45)", w: 2 });
    m.daub({ type: "text", x: 78, y: 40, text: "PAD 2", color: "rgba(84,242,255,.55)", size: 14 });
    m.building({ x: 72, y: 23, w: 12, d: 6, floors: 3, style: "hull", name: "Shuttle" });
    // Pad 3, empty and coned off
    m.daub({ type: "circle", x: 78, y: 84, r: 12, color: "rgba(255,82,102,.45)", w: 2 });
    m.daub({ type: "text", x: 78, y: 84, text: "PAD 3", color: "rgba(255,82,102,.55)", size: 16 });
    for (let a = 0; a < 12; a++) m.prop("cone", 78 + Math.cos(a / 12 * Math.PI * 2) * 12.5, 84 + Math.sin(a / 12 * Math.PI * 2) * 12.5);
    m.prop("truck", 70.5, 92.5, { color: "#d8a01a" });
    for (const [x, y] of [[66, 72], [90, 72], [66, 96], [90, 96], [90, 12], [90, 40]]) { m.prop("flood", x, y); m.light(x, y + 0.5, 6, "#fffbe8", 0.18); }
    // the control tower and the fuel farm
    m.building({ x: 12, y: 68, w: 4, d: 4, floors: 14, style: "glass", roofKit: "beacon", name: "Control tower", signs: [{ face: "e", text: "TOWER", at: 0.6, z: 180, color: "#54f2ff" }] });
    for (const [x, y] of [[14, 86], [18, 86], [14, 90], [18, 90]]) m.building({ x, y, w: 3, d: 3, floors: 4, style: "metal", name: "Fuel tank" });
    for (let i = 0; i < 8; i++) m.prop("barrel", 22.5 + (i % 4), 88.5 + (i >> 2) * 2, { color: "#a8323e" });
    m.prop("flood", 24, 96); m.light(24, 96.5, 5, "#fffbe8", 0.2);
    for (let i = 0; i < 10; i++) m.prop("crate", 44.5 + (i % 5), 76.5 + (i / 5 | 0) * 2);

    // ---- Hangar Row ----
    m.fill(102, 8, 56, 93, G.TARMAC);
    for (const y of [26, 50, 76]) m.driveway(102, y, 1, 4, "w");            // gates onto Dock Street
    m.driveway(128, 100, 4, 1, "s");                                          // and onto Port Avenue
    m.driveway(10, 60, 1, 6, "w");                                            // the taxiway gate onto the Outer Road
    const hangar = (x, y, w, d, floors, sign) => m.building({ x, y, w, d, floors, style: "metal", door: "s", name: sign, signs: [{ face: "s", text: sign, at: Math.max(0.5, w / 2 - sign.length * 0.17), z: floors * 14 - 8, color: "#ffb000", size: 10 }] });
    hangar(104, 10, 18, 14, 4, "BAY 7"); hangar(126, 10, 18, 14, 4, "BAY 8");
    hangar(104, 32, 18, 14, 4, "BAY 9"); hangar(126, 32, 18, 14, 4, "BAY 10");
    hangar(147, 10, 10, 20, 3, "BAY 11");
    for (const [x, y] of [[103, 27], [124, 27], [145, 27], [103, 49], [124, 49], [145, 49]]) { m.prop("flood", x, y); m.light(x, y + 0.5, 5, "#fffbe8", 0.18); }
    for (const [x, y, c] of [[110.5, 27.5, "#d8a01a"], [133.5, 28.5, "#5a6a8a"], [112.5, 50.5, "#a8323e"]]) m.prop("truck", x, y, { color: c });
    for (let i = 0; i < 12; i++) m.prop("crate", 106.5 + (i % 6) * 2, 47.5 + (i / 6 | 0));

    // ---- the cargo yard ----
    const COLS = ["#7a3a2a", "#2a5a7a", "#3a6a3a", "#8a6a1a", "#5a2a5a", "#7a7a80", "#2a3a6a", "#9a4a1a"];
    for (let c = 0; c < 7; c++) for (let r = 0; r < 11; r++) {
      if (c === 3 || r === 5 || rng() < 0.08) continue;      // the main aisles, and gaps
      const x = 104 + c * 8, y = 56 + r * 4;
      m.building({ x, y, w: 6, d: 2, floors: 1 + Math.floor(rng() * 3), style: "container", color: COLS[Math.floor(rng() * COLS.length)] });
    }
    m.prop("crane", 131, 66); m.prop("crane", 131, 90);
    for (const [x, y] of [[129, 56], [129, 99], [103, 77], [156, 77]]) { m.prop("flood", x, y); m.light(x, y + 0.5, 6, "#fffbe8", 0.16); }

    // ---- the warehouses ----
    m.lane(8, 127, 150, 3, G.ROAD);
    const shed = (x, y, w, d, sign, col) => {
      const style = ["concrete", "brick", "metal"][Math.floor(rng() * 3)];
      return m.building({ x, y, w, d, floors: 2 + Math.floor(rng() * 3), style, door: style === "metal" ? "s" : undefined,
        signs: sign ? [{ face: "s", text: sign, at: 0.8, z: 22, color: col }] : undefined });
    };
    shed(10, 110, 14, 10); shed(26, 110, 14, 10, "SKOOMA IMPORTS", "#4ade6a"); shed(42, 110, 14, 10); shed(58, 110, 14, 10, "MOONSUGAR CO.", "#b47dff"); shed(74, 110, 18, 10);
    shed(10, 132, 14, 14); shed(26, 132, 14, 14); m.building({ x: 42, y: 132, w: 10, d: 8, floors: 2, style: "brick", name: "Diner", signs: [{ face: "s", text: "STARPORT DINER", at: 0.3, z: 20, color: "#ff8fd8" }] }); shed(58, 132, 14, 14); shed(74, 132, 18, 14);
    shed(104, 110, 14, 10); shed(120, 110, 14, 10, "BAY 13 STORAGE", "#ff5266"); shed(136, 110, 20, 10);
    shed(104, 132, 14, 14); shed(120, 132, 14, 14); shed(136, 132, 20, 14);
    K.lamps(m, 10, 103.3, 93, 103.3, 9); K.lamps(m, 102, 108.7, 157, 108.7, 9);
    K.lamps(m, 10, 126.3, 93, 126.3, 10); K.lamps(m, 102, 126.3, 157, 126.3, 10);
    K.lamps(m, 100.7, 10, 100.7, 100, 10); K.lamps(m, 8.7, 10, 8.7, 100, 12);
    for (const [x, y, c] of [[30.5, 124.5, "#4a6a3a"], [64.5, 124.5, "#5a5a6a"], [124.5, 124.5, "#7a3a2a"], [148.5, 147.5, "#d8a01a"]]) m.prop("truck", x, y, { color: c });
    for (let i = 0; i < 6; i++) m.park(12 + i * 2.2, 148.6, "x", null, 1);

    // ---- mission points ----
    for (const [x, y, n] of [[12.5, 102.5, "Port Avenue, west"], [94.5, 102.5, "Port Avenue, by Dock Street"], [150.5, 108.5, "Port Avenue, east"],
      [100.5, 6.5, "Dock Street, north"], [8.5, 40.5, "the Outer Road gate"], [60.5, 148.5, "South Street"], [40.5, 128.5, "the service road"],
      [100.5, 60.5, "Dock Street, by the cargo yard"], [130.5, 128.5, "the service road, east"], [156.5, 52.5, "the east apron"], [124.5, 5.5, "the hangar gate"]])
      m.point("spawn", x, y, n);
    for (const [x, y, n] of [[53.5, 37.5, "the ship's ramp"], [17.5, 73.5, "the control tower"], [22.5, 94.5, "the fuel farm"], [78.5, 84.5, "Pad 3"],
      [78.5, 34.5, "Pad 2"], [112.5, 48.5, "Bay 9"], [134.5, 26.5, "Bay 8"], [130.5, 77.5, "the middle of the cargo yard"],
      [31.5, 122.5, "Skooma Imports"], [110.5, 62.5, "the yard's west stacks"], [131.5, 92.5, "under the south crane"], [150.5, 86.5, "the yard's east stacks"],
      [146.5, 124.5, "the east loading bay"], [128.5, 148.5, "the far warehouses"], [80.5, 123.5, "the big warehouse"], [16.5, 148.5, "the car park on South Street"], [127.5, 124.5, "Bay 13 Storage"], [46.5, 141.5, "the Starport Diner"], [151.5, 40.5, "Bay 11"]])
      m.point("target", x, y, n);
    for (const [x, y, n] of [[0.5, 105.5, "Port Avenue west"], [159.5, 106.5, "Port Avenue east"], [97.5, 0.5, "Dock Street north"], [97.5, 159.5, "Dock Street south"],
      [5.5, 0.5, "the Outer Road north"], [5.5, 159.5, "the Outer Road south"], [159.5, 151.5, "South Street east"]])
      m.point("exit", x, y, n);
  },
});
