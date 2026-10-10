/* Mission 1 -- Market Plaza.
 *
 * Downtown's open-air mall: a square block of shopping wings around a
 * fountain plaza, four avenues of traffic around it, and towers beyond.
 * Vesper Sly is selling Skooma under Casey Benton's price out of the cafe in
 * the plaza's north-east corner. His car waits on North Avenue.
 *
 *   y  0..4   north towers          x  0..4   west towers
 *   y  6..9   North Avenue          x  6..9   West Street
 *   y 10..49  the Market Plaza block
 *   y 50..53  South Avenue          x 50..53  East Street
 *   y 55..59  south towers          x 55..59  east towers
 */
"use strict";

W.LEVELS = W.LEVELS || {};

W.LEVELS.plaza = {
  id: "plaza",
  name: "Market Plaza",
  district: "Downtown",
  w: 60, h: 60, seed: 1994,
  codename: "CLEAN SWEEP",

  briefing: {
    from: "Casey Benton, via Watch-Captain Joyeuse",
    text: [
      "Vesper Sly is selling Skooma in Market Plaza at half Casey Benton's price. The Boss takes that personally.",
      "Sly holds court at Cafe Miao in the plaza's north-east corner, with four bodyguards in black. A few more of his crew in red loiter around the plaza, and two watch his car on North Avenue.",
      "Plaza Security are mall cops, not Watchers, and nobody has told them who you are. If they see a gun out they will warn you once, then open fire. Keep your weapons holstered until you need them.",
      "If Sly's crew make you, he runs for his car. If the car leaves the map, he is gone. Blowing up the car first is one answer.",
    ],
    intel: [
      ["Target", "Vesper Sly: white suit, black fur. Marked in amber."],
      ["Bodyguards", "4, in black, with shotguns. They stay with Sly."],
      ["Crew", "8, in red, with pistols and Uzis."],
      ["Plaza Security", "6 officers, in blue. Neutral until provoked."],
      ["Civilians", "Shoppers and tourists. The Boss wants them spending, not dead."],
    ],
  },

  build(m) {
    const G = W.G;
    m.fill(0, 0, 60, 60, G.WALK);
    // avenues and streets, four lanes each
    m.road(0, 6, 60, 4, "x");     // North Avenue
    m.road(0, 50, 60, 4, "x");    // South Avenue
    m.road(6, 0, 4, 60, "y");     // West Street
    m.road(50, 0, 4, 60, "y");    // East Street
    m.lanes.push(
      { axis: "x", at: 7, dir: -1, from: -3, to: 63, cars: 3 },
      { axis: "x", at: 9, dir: 1, from: -3, to: 63, cars: 0 },   // Sly's car blocks this lane
      { axis: "x", at: 51, dir: -1, from: -3, to: 63, cars: 3 },
      { axis: "x", at: 53, dir: 1, from: -3, to: 63, cars: 3 },
      { axis: "y", at: 7, dir: 1, from: -3, to: 63, cars: 3 },
      { axis: "y", at: 9, dir: -1, from: -3, to: 63, cars: 2 },
      { axis: "y", at: 51, dir: 1, from: -3, to: 63, cars: 2 },
      { axis: "y", at: 53, dir: -1, from: -3, to: 63, cars: 3 },
    );

    // ---- the plaza block ----
    m.fill(18, 18, 24, 24, G.PLAZA);
    m.fill(28, 12, 4, 6, G.PLAZA); m.fill(28, 42, 4, 6, G.PLAZA);
    m.fill(12, 28, 6, 4, G.PLAZA); m.fill(42, 28, 6, 4, G.PLAZA);
    m.fill(27, 27, 6, 6, G.WATER);
    m.fill(19, 37, 4, 4, G.GRASS); m.fill(37, 37, 4, 4, G.GRASS);

    const mallA = "#1f8a8a", mallB = "#a8326a", mallC = "#c98a1a";
    m.building({ x: 13, y: 13, w: 15, d: 5, floors: 2, style: "mall", awning: mallA, name: "North Arcade",
      signs: [{ face: "s", text: "NAPPERS & CO", at: 1.5, z: 21, color: "#54f2ff" }, { face: "s", text: "FEATHERS", at: 10, z: 21, color: "#ff8fd8" }] });
    m.building({ x: 32, y: 13, w: 15, d: 5, floors: 2, style: "mall", awning: mallC, name: "Cafe Miao",
      signs: [{ face: "s", text: "RED DOT OPTICS", at: 0.5, z: 21, color: "#ff5266" }, { face: "s", text: "CAFE MIAO", at: 9.3, z: 21, color: "#ffb000" }] });
    m.building({ x: 13, y: 42, w: 15, d: 5, floors: 2, style: "mall", awning: mallB, name: "South Arcade",
      signs: [{ face: "s", text: "MARKET PLAZA", at: 3, z: 21, color: "#54f2ff", size: 10 }] });
    m.building({ x: 32, y: 42, w: 15, d: 5, floors: 2, style: "mall", awning: mallA, name: "South Arcade East",
      signs: [{ face: "s", text: "ZOOMERS", at: 4, z: 21, color: "#4ade6a" }] });
    m.building({ x: 13, y: 18, w: 5, d: 10, floors: 4, style: "dept", awning: "#6a3a9a", name: "Feline & Co.",
      signs: [{ face: "e", text: "FELINE & CO.", at: 1.2, z: 40, color: "#b47dff", size: 10 }] });
    m.building({ x: 13, y: 32, w: 5, d: 10, floors: 4, style: "dept", awning: "#6a3a9a", name: "Feline & Co. Annex",
      signs: [{ face: "e", text: "SILVERVINE", at: 2, z: 40, color: "#ff8fd8" }] });
    m.building({ x: 42, y: 18, w: 5, d: 10, floors: 3, style: "mall", awning: mallB, name: "East Arcade",
      signs: [{ face: "e", text: "PLAZA EAST", at: 2.5, z: 32, color: "#54f2ff" }] });
    m.building({ x: 42, y: 32, w: 5, d: 10, floors: 3, style: "mall", awning: mallC, name: "East Arcade South" });

    // ---- the towers beyond the avenues ----
    const B = (x, y, w, d, floors, style, o = {}) => m.building(Object.assign({ x, y, w, d, floors, style }, o));
    // corners
    B(0, 0, 5, 5, 9, "tower", { roofKit: "beacon" });
    B(55, 0, 5, 5, 5, "glass");
    B(0, 55, 5, 5, 2, "brick");
    B(55, 55, 5, 5, 2, "brick");
    // north
    B(10, 0, 9, 5, 6, "office");
    m.fill(19, 0, 2, 5, G.ALLEY);
    B(21, 0, 10, 5, 11, "glass", { signs: [{ face: "s", text: "BENTON HOLDINGS", at: 1.3, z: 134, color: "#ffb000", size: 9 }], roofKit: "beacon" });
    m.fill(31, 0, 2, 5, G.ALLEY);
    B(33, 0, 9, 5, 4, "brick", { signs: [{ face: "s", text: "HOTEL CALICO", at: 1.4, z: 48, color: "#ff5266" }] });
    B(42, 0, 8, 5, 5, "concrete");
    // south
    B(10, 55, 11, 5, 3, "concrete", { signs: [{ face: "s", text: "PAWN", at: 4, z: 24, color: "#ffb000" }] });
    m.fill(21, 55, 2, 5, G.ALLEY);
    B(23, 55, 12, 5, 3, "office");
    m.fill(35, 55, 2, 5, G.ALLEY);
    B(37, 55, 13, 5, 4, "brick");
    // west
    B(0, 10, 5, 11, 5, "office");
    m.fill(0, 21, 5, 2, G.ALLEY);
    B(0, 23, 5, 12, 9, "glass", { signs: [{ face: "e", text: "PUMACORP", at: 3, z: 110, color: "#54f2ff", size: 10 }] });
    m.fill(0, 35, 5, 2, G.ALLEY);
    B(0, 37, 5, 13, 4, "brick");
    // east
    B(55, 10, 5, 13, 4, "concrete");
    m.fill(55, 23, 5, 2, G.ALLEY);
    B(55, 25, 5, 12, 4, "office", { signs: [{ face: "e", text: "SKOOMA? NO.", at: 1.5, z: 44, color: "#4ade6a" }] });
    m.fill(55, 37, 5, 2, G.ALLEY);
    B(55, 39, 5, 11, 3, "glass");

    // ---- dressing ----
    const lamp = (x, y, col = "#ffcf80") => { m.prop("lamp", x, y); m.light(x + 0.2, y + 0.4, 2.4, col, 0.2); };
    // street lamps on every kerb
    for (let x = 12; x <= 48; x += 6) { lamp(x + 0.5, 10.3); lamp(x + 0.5, 49.7); }
    for (let y = 14; y <= 46; y += 6) { lamp(10.3, y + 0.5); lamp(49.7, y + 0.5); }
    for (let x = 12; x <= 48; x += 9) { lamp(x + 0.5, 5.6); lamp(x + 0.5, 54.4); }
    for (let y = 14; y <= 46; y += 9) { lamp(5.6, y + 0.5); lamp(54.4, y + 0.5); }
    // plaza lamps, cooler
    for (const [x, y] of [[19, 19], [19, 41], [41, 41], [24, 26], [36, 26], [24, 34], [36, 34], [29.5, 13], [29.5, 47], [12.5, 29.5], [47.5, 29.5]]) lamp(x, y, "#9ff7ff");
    // the fountain
    m.prop("spout", 30, 30);
    m.light(30, 30, 4, "#54f2ff", 0.18);
    for (const [x, y] of [[25.5, 28.5], [25.5, 31.5], [34.5, 28.5], [34.5, 31.5], [28.5, 25.5], [31.5, 25.5], [28.5, 34.5], [31.5, 34.5]]) m.prop("bench", x, y);
    // trees and planters
    for (const [x, y] of [[20, 38], [22, 40], [38, 38], [40, 40], [20, 20], [20, 24], [24, 20]]) m.prop("tree", x + 0.5, y + 0.5);
    for (const [x, y] of [[26, 19], [33, 19], [19, 26], [19, 33], [26, 40], [33, 40], [40, 33]]) m.prop("planter", x + 0.5, y + 0.5);
    // kiosks
    m.prop("kiosk", 23.5, 33.5, { color: "#ff8fd8" }); m.light(24, 34.2, 2, "#ff8fd8", 0.22);
    m.prop("kiosk", 35.5, 35.5, { color: "#54f2ff" }); m.light(36, 36.2, 2, "#54f2ff", 0.22);
    m.prop("kiosk", 30.5, 21.5, { color: "#ffb000" }); m.light(31, 22.2, 2, "#ffb000", 0.22);
    // Cafe Miao's terrace, where Sly holds court
    for (const [x, y, c] of [[36.5, 20.5, "#a8326a"], [39.5, 20.5, "#1f8a8a"], [36.5, 23.5, "#c98a1a"], [39.5, 23.5, "#a8326a"]]) m.prop("table", x, y, { umbrella: c });
    m.light(38, 21.5, 3, "#ffb000", 0.2);
    // vending machines and bins along the arcades
    for (const [x, y, c] of [[18.5, 18.5, "#54f2ff"], [41.5, 18.5, "#ff5266"], [18.5, 41.5, "#4ade6a"], [12.5, 12.5, "#ffb000"], [47.5, 47.5, "#54f2ff"]]) m.prop("vend", x, y, { color: c });
    for (const [x, y] of [[27.5, 18.5], [32.5, 41.5], [41.5, 27.5], [18.5, 32.5], [12.5, 20.5], [47.5, 38.5], [22.5, 11.5], [40.5, 48.5]]) m.prop("bin", x, y);
    // bollards across the passages
    for (const x of [28.5, 29.5, 30.5, 31.5]) { m.prop("bollard", x, 11.6); m.prop("bollard", x, 48.4); }
    for (const y of [28.5, 29.5, 30.5, 31.5]) { m.prop("bollard", 11.6, y); m.prop("bollard", 48.4, y); }
    // hydrants
    for (const [x, y] of [[16.5, 10.4], [44.5, 49.6], [10.4, 38.5], [49.6, 22.5], [26.5, 5.6], [5.6, 33.5]]) m.prop("hydrant", x, y);
    // neon blade signs hung on the arcades, facing the plaza
    m.prop("blade", 22.2, 18.06, { text: "NIP", color: "#4ade6a", z: 14 });
    m.prop("blade", 35.2, 18.06, { text: "BAR", color: "#ff5266", z: 14 });
    m.prop("blade", 18.06, 23.2, { text: "OPEN", color: "#ffb000", z: 16 });
    m.prop("blade", 18.06, 36.2, { text: "SALE", color: "#ff8fd8", z: 16 });
    m.prop("blade", 14.5, 47.06, { text: "EAT", color: "#54f2ff", z: 14 });
    m.prop("blade", 44.5, 5.06, { text: "HOTEL", color: "#ff5266", z: 24 });
    m.prop("blade", 25.2, 5.06, { text: "BENTON", color: "#ffb000", z: 30 });
    m.prop("blade", 5.06, 27.5, { text: "PUMA", color: "#54f2ff", z: 26 });
    // billboards at the block's corners
    m.prop("billboard", 11.5, 11.5, { text: "BENTON\nREALTY", color: "#ffb000" });
    m.prop("billboard", 48.5, 48.5, { text: "SKOOMA?\nSAY NO", color: "#4ade6a" });
    m.prop("billboard", 48.5, 11.5, { text: "RED DOT\nOPTICS", color: "#ff5266" });
    // crates in the alleys
    for (const [x, y] of [[19.5, 1.5], [20.5, 3.5], [31.5, 2.5], [21.5, 57.5], [36.5, 56.5], [2.5, 21.5], [57.5, 23.5], [3.5, 36.5], [56.5, 38.5]]) m.prop("crate", x, y);
    // traffic lights at every junction corner
    for (const j of [{ x0: 6, y0: 6, x1: 10, y1: 10 }, { x0: 50, y0: 6, x1: 54, y1: 10 }, { x0: 6, y0: 50, x1: 10, y1: 54 }, { x0: 50, y0: 50, x1: 54, y1: 54 }]) {
      m.prop("signal", j.x0 - 0.35, j.y0 - 0.35, { axis: "y" });
      m.prop("signal", j.x1 + 0.35, j.y1 + 0.35, { axis: "y" });
      m.prop("signal", j.x1 + 0.35, j.y0 - 0.35, { axis: "x" });
      m.prop("signal", j.x0 - 0.35, j.y1 + 0.35, { axis: "x" });
    }
  },

  /* Who is where. opts.attract fills the plaza for the title screen's
   * backdrop: the crowd and the traffic, nobody armed. */
  populate(world, opts) {
    const m = world.map;
    // the crowd
    const nCiv = opts.attract ? 60 : 52;
    for (let i = 0; i < nCiv; i++) {
      const p = m.randomCell((x, y, g) => g === W.G.WALK || g === W.G.PLAZA);
      if (p) world.add(W.makeUnit("civ", p[0] + W.rand(-0.3, 0.3), p[1] + W.rand(-0.3, 0.3)));
    }
    // Plaza Security
    const secPosts = [
      { at: [28.5, 44.5], patrol: [[28.5, 44.5], [31.5, 44.5], [31.5, 40], [28.5, 40]] },
      { at: [30.5, 47.6], patrol: [[30.5, 47.6], [22, 47.6], [30.5, 47.6], [38, 47.6]] },
      { at: [22, 30], patrol: [[22, 22], [22, 37], [26, 37], [26, 22]] },
      { at: [37, 30], patrol: [[34, 26], [38, 34], [34, 38], [27, 38]] },
      { at: [14.5, 29.5], patrol: [[14.5, 29.5], [20, 29.5]] },
      { at: [44.5, 30.5], patrol: [[44.5, 30.5], [41, 30.5], [41, 35], [38, 30.5]] },
    ];
    for (const s of secPosts) {
      const u = world.add(W.makeUnit("sec", s.at[0], s.at[1], { home: s.at, patrol: s.patrol }));
      W.giveWeapon(u, "pistol");
    }
    if (opts.attract) return;

    // Vesper Sly and his bodyguards, on the cafe terrace
    const sly = world.add(W.makeUnit("target", 38.2, 22.0, { post: [38.2, 22.0, Math.PI * 0.75], name: "Vesper Sly", dir: Math.PI * 0.75 }));
    W.giveWeapon(sly, "pistol");
    world.targetUnit = sly;
    for (const [x, y, d] of [[36.6, 21.9, 2.4], [39.9, 21.4, 1.0], [37.4, 24.4, 2.0], [39.0, 19.4, 0.3]]) {
      const g = world.add(W.makeUnit("guard", x, y, { post: [x, y, d], dir: d }));
      W.giveWeapon(g, "shotgun", 40); W.giveWeapon(g, "pistol");
    }
    // the crew in red
    const crew = [
      { at: [30.6, 11.0], post: [30.6, 11.0, Math.PI / 2], w: "uzi" },          // at the car
      { at: [34.6, 11.0], post: [34.6, 11.0, Math.PI / 2], w: "pistol" },
      { at: [20.5, 30.5], post: [20.5, 30.5, 0], w: "pistol" },                 // dealing by Feline & Co.
      { at: [21.2, 31.6], post: [21.2, 31.6, -0.4], w: "uzi" },
      { at: [39.5, 39.0], post: [39.5, 39.0, -2.3], w: "pistol" },              // south-east lawn
      { at: [36, 27], patrol: [[36, 27], [40.5, 30.5], [36, 34.5], [33.5, 26.5]], w: "pistol" },
      { at: [29.5, 15.5], post: [29.5, 15.5, Math.PI / 2], w: "uzi" },           // the north passage
      { at: [47.5, 24], patrol: [[47.5, 24], [47.5, 12.5], [36, 12.2]], w: "pistol" },
    ];
    for (const c of crew) {
      const u = world.add(W.makeUnit("crew", c.at[0], c.at[1], { post: c.post, patrol: c.patrol, dir: c.post ? c.post[2] : 0 }));
      W.giveWeapon(u, c.w, c.w === "uzi" ? 60 : undefined);
    }
    // Sly's car, parked on North Avenue with the engine running
    const lane = m.lanes[1];
    const car = world.addCar(lane, 32.5, { parked: true, color: "#e8e4dc", maxSpeed: 6.5, hp: 16, maxHp: 16, escapeCar: true });
    car.door = [32.5, 10.6];
    world.escapeCar = car;

    // the Watchers, stepping off South Avenue
    W.spawnSquad(world, opts.roster || W.defaultRoster(), [[14.5, 48.6], [15.6, 48.6], [14.5, 49.5], [15.6, 49.5]]);

    world.objective({ type: "kill", unit: sly, text: "Eliminate Vesper Sly" });
    world.objective({ type: "recruit", n: 5, optional: true, text: "Recruit 5 followers with the Purrsuader" });
    world.objective({ type: "civcap", n: 4, optional: true, text: "Lose no more than 4 civilians" });
  },
  start: [21, 43],
};
