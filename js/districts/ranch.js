/* The Ranch: an old horse ranch turned grow fields, where PumaCity's cheap
 * 'nip comes from. The Watchers rarely come out this far.
 *
 *   y  4..7    Ranch Road (traffic)          x 4..7    County Road (traffic)
 *   y 10..38   farmstead (x 10..48) | north fields of catnip rows (x 58..142)
 *   y 40..42   the farm track, east-west     x 50..52  the long track, north-south
 *   x 55..56   the irrigation canal, bridged at the tracks and the maze doors
 *   y 46..96   greenhouses (x 10..48) | the farms (x 58..139, y 46..139)
 *   y 104..142 workers' row: bunkhouses, drying sheds, the feed store
 * The farms are a patchwork: plots of every size, split by hedgerows with
 * gaps in them and by dirt tracks, each plot a catnip field, a tilled field,
 * a paddock, an orchard, a steading or glasshouses. Crossing them means
 * finding the gaps. The processing shed sits in a yard in the middle. */
"use strict";

W.district({
  id: "ranch", name: "The Ranch", w: 144, h: 144, seed: 7041,
  blurb: "An old horse ranch turned grow fields: a patchwork of catnip farms behind hedgerows, and very few streetlights.",
  names: { targets: ["Brindle Jack", "Moonsugar Molly", "Old Ned Whiskers", "The Thornback"], crew: "the Thornback gang", sec: "Ranch hands", guard: "Enforcer", henchman: "Thornback", civ: "Farmhand" },
  theme: {
    racket: "the Ranch's catnip, sold around the Boss",
    secNote: "The ranch hands guard the place for its owners and do not know who you are. Keep weapons holstered near them.",
    ground: "Hedged fields with gaps you have to find, rows of catnip, open yards. Good cover, short sightlines, very little light.",
    guards: 4, crew: 9, sec: 6, civ: 0.006, civMax: 36,
    crewGuns: ["pistol", "shotgun", "uzi"],
    civLook: () => ({ coat: W.pick(["#3a5a8a", "#4a6a9a", "#5a4a3a"]), trim: "#c8b88a", legs: "#2a3a5a", fur: W.pick(W.FURS), hat: W.chance(0.5) ? "#8a6a3a" : null }),
    secLook: () => ({ coat: W.pick(["#7a2a2a", "#2a5a3a"]), trim: "#e8e4dc", legs: "#2a3a5a", fur: W.pick(W.FURS), hat: "#6a4a2a" }),
  },
  sections: [
    { id: "farmstead", name: "The Farmstead", x: 0, y: 0, w: 60, h: 56, blurb: "The barn, the farmhouse, the silos and the paddock." },
    { id: "greenhouses", name: "The Greenhouses", x: 0, y: 36, w: 60, h: 70, blurb: "Eighteen glasshouses of seedlings in neat rows." },
    { id: "workers", name: "Workers' Row", x: 0, y: 96, w: 60, h: 48, blurb: "Bunkhouses, drying sheds and the feed store." },
    { id: "fields", name: "Thornback Freight", x: 46, y: 0, w: 98, h: 48, blurb: "The freight shed: lorries at the loading bays, crates stacked to the roof." },
    { id: "farms", name: "The Farms", x: 54, y: 44, w: 90, h: 100, blurb: "The patchwork of hedged catnip farms east of the canal." },
  ],

  build(m, rng) {
    const G = W.G, K = W.K;
    // a round silo three tiles across, standing on (x, y)..(x+2, y+2)
    const silo = (x, y, h = 80, text) => {
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (i !== 1 || j !== 1) m.prop("solid", x + i + 0.5, y + j + 0.5);
      m.prop("silo", x + 1.5, y + 1.5, { h, text });
    };
    // a box lorry nosed north, its back end on (x, y), three more tiles ahead of it
    const lorry = (x, y, color, stripe) => {
      for (let k = 1; k <= 3; k++) m.prop("solid", x + 0.5, y - k + 0.5);
      m.prop("lorry", x + 0.5, y + 0.5, { color, stripe, cab: pick(["#8a2a2a", "#2a4a8a", "#e8e4dc", "#2a5a3a", "#3a3a40"]) });
    };
    const pick = a => a[Math.floor(rng() * a.length)];
    m.fill(0, 0, 144, 144, G.GRASS);
    // the roads in, and their dirt verges
    m.street("x", 4, 2);
    m.street("y", 4, 1);
    m.fill(8, 8, 136, 1, G.DIRT); m.fill(8, 8, 1, 136, G.DIRT);
    // farm tracks and the canal
    m.lane(8, 40, 136, 3, G.DIRT);
    m.lane(50, 8, 3, 136, G.DIRT);
    m.lane(8, 100, 43, 3, G.DIRT);
    m.fill(55, 8, 2, 136, G.WATER);
    for (const y of [40, 71, 119]) m.fill(55, y, 2, y === 40 ? 3 : 2, G.DIRT);   // bridges
    m.fill(53, 71, 5, 2, G.DIRT); m.fill(53, 119, 5, 2, G.DIRT);

    // ---- the farmstead ----
    m.fill(10, 10, 39, 29, G.DIRT);
    // the barn: a gambrel roof, the hayloft door in the gable, stalls down both sides
    const barn = m.structure({ x: 13, y: 11, w: 12, d: 11, floors: 2, style: "barn", floor: G.DIRT, name: "The barn", pitch: "y", gambrel: true, ridge: 40, roof: "#2a2a30", loft: true,
      doors: [["s", 4, 4], ["n", 5, 2], ["e", 6, 1]], signs: [{ face: "s", text: "THE RANCH", at: 0.4, z: 20, color: "#ffb000" }] });
    for (const x of [14, 21]) for (const y of [14, 17, 20]) for (let k = 0; k < 3; k++) m.prop("fence", x + k + 0.5, y + 0.5, { axis: "x" });   // the stall dividers
    for (const [x, y] of [[14.5, 12.5], [15.5, 15.5], [22.5, 12.5], [23.5, 18.5], [14.5, 18.5]]) m.prop("hay", x, y);
    m.prop("trough", 22.5, 15.5); m.prop("tractor", 18.5, 15.5);
    m.prop("box", 23.5, 20.5, { w: 0.8, d: 0.6, h: 9, side: "#5a3a24", top: "#7a5a3a" });   // the tack
    m.loot.push({ type: "shotgun", ammo: 16, x: 15.5, y: 20.5 });
    m.light(18.5, 16.5, 4, "#ffcf80", 0.18);
    void barn;
    // the farmhouse: clapboard, a pitched roof, a porch; the kitchen, the parlour, the owner's office
    const fh = m.structure({ x: 30, y: 11, w: 9, d: 8, floors: 2, style: "clad", floor: G.WOOD, name: "The farmhouse", pitch: "x", ridge: 14, roof: "#3a2e2a", color: "#d8d0bc",
      doors: [["s", 3, 2], ["e", 2, 1]] });
    m.partition(fh, 31, 15, 7, 1, [[1, 2]]);
    m.partition(fh, 35, 12, 1, 3, [[1, 1]]);
    m.prop("table", 32.5, 13.5); m.prop("box", 31.5, 12.6, { w: 1.6, d: 0.6, h: 7, side: "#3a3f4e", top: "#c8ccd4" });   // the kitchen
    m.prop("box", 37, 12.6, { w: 1.6, d: 0.8, h: 6, side: "#3a2418", top: "#8a5a3a", screen: "#4ade6a" });                // the owner's desk
    m.prop("box", 32.5, 17.4, { w: 2.4, d: 0.8, h: 4, side: "#5a3a4a" }); m.prop("box", 36.5, 16.5, { w: 0.8, d: 0.8, h: 3, side: "#5a3a4a" });   // the parlour
    m.loot.push({ type: "pistol", ammo: 18, x: 36.5, y: 13.5 });
    m.light(34, 16.5, 3, "#ffcf80", 0.2);
    m.canopy({ x: 30, y: 19, w: 9, d: 2, floors: 1, every: 4, plain: true, roof: "#4a3a34", name: "The porch" });
    m.prop("bench", 31.5, 19.6);
    // the silos
    silo(41, 11, 84, "RANCH"); silo(45, 11, 84); silo(41, 15, 70);
    // the paddock: grass inside a fence, with a gate on the north side
    m.fill(13, 24, 21, 12, G.GRASS);
    K.fence(m, 13, 24, 21, 24); K.fence(m, 25, 24, 33, 24);
    K.fence(m, 13, 35, 33, 35); K.fence(m, 13, 25, 13, 34); K.fence(m, 33, 25, 33, 34);
    for (let i = 0; i < 9; i++) m.prop("hay", 15.5 + rng() * 16, 26.5 + rng() * 7);
    m.prop("trough", 28.5, 33.5);
    m.prop("windmill", 41.5, 30.5);
    m.prop("tractor", 27.5, 21.5); m.prop("tractor", 36.5, 22.5);
    m.prop("truck", 45.5, 23.5, { axis: "y", color: "#8a3a2a" });
    m.prop("flood", 26.5, 22.5); m.light(26.5, 23, 5, "#fffbe8", 0.2);
    m.prop("flood", 46.5, 36.5); m.light(46.5, 37, 5, "#fffbe8", 0.2);
    m.prop("lamp", 29.5, 21.2); m.light(29.7, 21.6, 2.4, "#ffcf80", 0.22);
    for (const [x, y] of [[11.5, 21.5], [11.5, 22.5], [47.5, 11.5], [37.5, 37.5]]) m.prop("barrel", x, y, { color: "#5a3a2a" });

    /* ---- Thornback Freight: where the 'nip ships out ----
     * A long shed along Ranch Road, x 58..141, y 12..38. Eight loading bays
     * open north onto a yard and the road, a lorry at each, loaded and
     * pointed out; behind them the staging floor, then rows of crates
     * stacked two and three high with aisles between, and the freight
     * office in the south-east corner. */
    const BAYS = [0, 1, 2, 3, 4, 5, 6, 7].map(k => 64 + k * 10);
    const wh = m.structure({ x: 58, y: 12, w: 84, d: 27, floors: 3, style: "metal", floor: G.INDOOR, name: "Thornback Freight",
      doors: [...BAYS.map(bx => ["n", bx - 58, 3]), ["s", 20, 3], ["s", 56, 3], ["w", 12, 3], ["e", 8, 2]],
      signs: [{ face: "s", text: "THORNBACK FREIGHT", at: 30, z: 30, color: "#ffb000", size: 11 }, { face: "e", text: "FREIGHT", at: 6, z: 30, color: "#ffb000" }] });
    m.fill(58, 9, 84, 3, G.TARMAC);                                         // the yard
    for (const bx of BAYS) {
      m.driveway(bx, 9, 3, 3, "n");
      lorry(bx + 1, 17, pick(["#c8ccd4", "#e8e4dc", "#9aa0a8", "#c8b888"]), pick(["#ffb000", "#4ade6a", "#ff5266"]));
      m.prop("flood", bx - 1, 10.5); m.light(bx + 1.5, 11, 4, "#fffbe8", 0.16);
    }
    m.daub({ type: "line", x: 59, y: 19.5, x2: 141, y2: 19.5, color: "rgba(255,176,0,.5)" });   // the dock line
    // the staging floor: pallets waiting
    for (let x = 60; x < 140; x += 3) if (rng() < 0.45) m.prop("box", x + 0.5 + rng(), 21.5, { w: 1.2, d: 1.2, h: 3 + Math.floor(rng() * 3) * 4, side: "#7a5a34", top: "#9a7a4a" });
    // the stacks
    for (const r of [23, 27, 31]) for (const y of [r, r + 1]) for (let x = 60; x < 140; x++) {
      if ((x - 60) % 12 === 10 || (x - 60) % 12 === 11) continue;           // the cross aisles
      if (x >= 128 && r >= 27) continue;                                   // the office
      if (rng() < 0.9) m.prop("crate", x + 0.5, y + 0.5, { n: 1 + Math.floor(rng() * 3) });
    }
    // forklifts, parked where they stopped
    for (const [x, y] of [[71, 26], [95, 30], [119, 22], [83, 34]]) m.prop("box", x + 0.5, y + 0.5, { w: 0.8, d: 1.3, h: 7, side: "#c8a01a", top: "#e8c04a" });
    // the freight office
    m.partition(wh, 128, 27, 1, 11, [[3, 2]]);
    m.partition(wh, 129, 27, 12, 1, [[8, 2]]);
    m.floorIn(129, 28, 12, 10, G.CARPET);
    m.prop("box", 133, 30, { w: 3, d: 1, h: 6, side: "#3a3f4e", top: "#5a6070", screen: "#4ade6a" });
    m.prop("box", 138, 35, { w: 1, d: 0.8, h: 10, side: "#5a6070", top: "#8a90a0" });   // the safe
    m.prop("table", 134.5, 34.5);
    m.loot.push({ type: "uzi", ammo: 40, x: 136.5, y: 32.5 });
    m.light(134, 32, 4, "#ffcf80", 0.2);
    for (const [x, y] of [[80, 25], [110, 29], [74, 33], [104, 21]]) m.light(x, y, 6, "#fff3c4", 0.12);
    void wh;

    // ---- the greenhouses ----
    m.fill(10, 45, 39, 53, G.DIRT);
    for (const gx of [12, 24, 36]) for (const gy of [47, 55, 63, 71, 79, 87]) {
      m.structure({ x: gx, y: gy, w: 10, d: 5, floors: 1, style: "greenhouse", floor: G.DIRT, name: "Greenhouse", doors: [["s", 4, 2], ["n", 4, 2]] });
      for (let i = 1; i < 9; i++) if (i < 4 || i > 5) m.prop("bed", gx + i + 0.5, gy + 2.5, { color: pick(["#4a9a3a", "#3a8a2a", "#8aaa3a"]) });
    }
    for (const [x, y] of [[22.5, 53.5], [34.5, 69.5], [22.5, 85.5], [11, 61], [47, 77]]) { m.prop("lamp", x, y); m.light(x + 0.2, y + 0.4, 2.4, "#ffcf80", 0.2); }
    for (let i = 0; i < 8; i++) m.prop("barrel", 22.5 + (i % 2) * 12, 52.5 + i * 5, { color: "#2a5a6a" });

    // ---- workers' row ----
    m.fill(10, 104, 39, 39, G.DIRT);
    for (const x of [12, 19, 26, 33, 40]) {
      m.structure({ x, y: 106, w: 5, d: 5, floors: 1, style: "clad", floor: G.WOOD, name: "Bunkhouse", pitch: "x", ridge: 7, roof: "#3a3a3a", color: pick(["#a8a090", "#8a9a8a", "#a89a7a", "#9a8a8a"]), doors: [["s", 2, 1]] });
      m.prop("box", x + 1.5, 107.6, { w: 0.9, d: 1.8, h: 6, side: "#5a4a3a", top: "#c8c0b0" }); m.prop("box", x + 3.5, 107.6, { w: 0.9, d: 1.8, h: 6, side: "#5a4a3a", top: "#c8c0b0" });   // bunks
      m.light(x + 2.5, 108.5, 1.8, "#ffcf80", 0.18);
    }
    // the drying sheds: the 'nip hung on racks
    for (const [x, w] of [[12, 12], [27, 11]]) {
      m.structure({ x, y: 116, w, d: 8, floors: 2, style: "metal", floor: G.DIRT, name: "Drying shed", doors: [["s", 3, 4], ["n", 2, 2]] });
      for (let i = x + 1; i < x + w - 1; i++) for (const y of [118, 121]) if (i !== x + 4 && i !== x + 5) m.prop("box", i + 0.5, y + 0.5, { w: 1, d: 0.5, h: 12, side: "#2a5a2a", top: "#4a8a3a" });
      m.light(x + w / 2, 120, 3, "#ff9a5c", 0.15);
    }
    m.loot.push({ type: "medikit", ammo: 1, x: 17.5, y: 122.5 });
    // the feed store
    const fs = m.structure({ x: 40, y: 116, w: 8, d: 7, floors: 2, style: "brick", floor: G.WOOD, name: "Feed store", doors: [["s", 2, 2]], signs: [{ face: "s", text: "FEED & SEED", at: 4.2, z: 22, color: "#4ade6a" }] });
    m.prop("box", 44, 119.5, { w: 3, d: 0.8, h: 7, side: "#3a2418", top: "#8a5a3a", screen: "#4ade6a" });
    for (let i = 0; i < 5; i++) m.prop("box", 41.5 + i * 1.2, 117.4, { w: 0.9, d: 0.6, h: 12, side: "#5a3a24", top: "#7a5a3a" });
    for (const [x, y] of [[45.5, 121.5], [46.5, 121.5], [46.5, 120.5]]) m.prop("hay", x, y);
    m.light(44, 120, 3, "#ffcf80", 0.2);
    void fs;
    m.fill(14, 130, 10, 7, G.WATER);
    for (const [x, y] of [[12.5, 129.5], [25.5, 131.5], [13.5, 138.5], [26.5, 137.5]]) m.prop("tree", x, y);
    K.lamps(m, 11, 112.5, 47, 112.5, 9);
    m.prop("truck", 35.5, 128.5, { color: "#3a5a8a" }); m.prop("truck", 41.5, 129.5, { axis: "y", color: "#c8b040" });
    for (let i = 0; i < 6; i++) m.prop("crate", 30.5 + (i % 3), 134.5 + (i / 3 | 0));
    m.prop("flood", 38.5, 126.5); m.light(38.5, 127, 5, "#fffbe8", 0.2);

    // ---- the farms: a patchwork of hedged plots and tracks ----
    m.fill(58, 46, 82, 94, G.GRASS);
    const plots = [], tracks = [];
    const hedgeRow = (hx, hy, hw, hd) => {
      const along = hw >= hd, len = along ? hw : hd;
      const gaps = [];
      for (let k = 0; k < 1 + Math.floor(len / 16); k++) gaps.push(1 + Math.floor(rng() * (len - 4)));
      let a = 0;
      for (const g of gaps.sort((p, q) => p - q).concat([len])) {
        if (g > a) m.building(along ? { x: hx + a, y: hy, w: g - a, d: 1, floors: 1, style: "hedge" } : { x: hx, y: hy + a, w: 1, d: g - a, floors: 1, style: "hedge" });
        a = Math.max(a, g + 3);
      }
    };
    const cut = (px, py, pw, pd) => {
      const long = Math.max(pw, pd);
      if (long <= 26 && (long <= 16 || rng() < 0.5)) { plots.push([px, py, pw, pd]); return; }
      const alongX = pw >= pd, L = alongX ? pw : pd;
      const at = Math.floor(L * (0.35 + rng() * 0.3));
      const track = rng() < 0.4, tw = track ? 2 : 1;
      if (alongX) {
        if (track) { m.fill(px + at, py, 2, pd, G.DIRT); tracks.push([px + at + 1, py + Math.floor(pd / 2) + 0.5]); } else hedgeRow(px + at, py, 1, pd);
        cut(px, py, at, pd); cut(px + at + tw, py, pw - at - tw, pd);
      } else {
        if (track) { m.fill(px, py + at, pw, 2, G.DIRT); tracks.push([px + Math.floor(pw / 2) + 0.5, py + at + 1]); } else hedgeRow(px, py + at, pw, 1);
        cut(px, py, pw, at); cut(px, py + at + tw, pw, pd - at - tw);
      }
    };
    cut(58, 46, 82, 94);
    const kinds = { catnip: [], tilled: [], paddock: [], orchard: [], steading: [], glass: [] };
    const ORDER = ["catnip", "catnip", "catnip", "tilled", "paddock", "orchard", "steading", "glass"];
    let processing = null;
    for (const [px, py, pw, pd] of plots) {
      const cx = px + pw / 2, cy = py + pd / 2;
      if (!processing && 99 >= px && 99 < px + pw && 93 >= py && 93 < py + pd) {
        // the processing yard
        processing = [px, py, pw, pd];
        m.fill(px, py, pw, pd, G.DIRT);
        const sw = Math.min(8, pw - 4), sd = Math.min(6, pd - 5);
        m.structure({ x: px + 2, y: py + 2, w: sw, d: sd, floors: 2, style: "metal", name: "Processing shed", doors: [["s", 1, 2], ["e", 1, 2]],
          signs: [{ face: "s", text: "PROCESSING", at: Math.max(3.2, sw / 2 - 2), z: 22, color: "#ff5266" }] });
        // cutting tables, the scale, sacks of the finished product
        for (let i = 0; i < sw - 3; i += 2) m.prop("box", px + 3.5 + i, py + 3.5, { w: 1.4, d: 0.8, h: 5, side: "#8a90a0", top: "#4a8a3a" });
        m.prop("box", px + sw, py + sd, { w: 0.8, d: 0.8, h: 6, side: "#3a3f4e", screen: "#ff5266" });
        for (let i = 0; i < 3; i++) m.prop("barrel", px + 3.5 + i, py + sd + 0.5, { color: "#4ade6a" });
        m.loot.push({ type: "uzi", ammo: 40, x: px + sw - 0.5, y: py + 3.5 });
        m.light(px + 2 + sw / 2, py + 2 + sd / 2, 3, "#ff5266", 0.2);
        m.prop("flood", px + 1, py + 1); m.light(px + 1, py + 1.5, 5, "#fffbe8", 0.22);
        m.prop("flood", px + pw - 1, py + pd - 1); m.light(px + pw - 1, py + pd - 0.5, 5, "#fffbe8", 0.22);
        for (let i = 0; i < Math.min(7, pw - 3); i++) m.prop("barrel", px + 2.5 + i, py + sd + 3.5, { color: i % 2 ? "#4ade6a" : "#2a5a3a" });
        if (pw > sw + 5) m.prop("truck", px + sw + 3.5, py + 3.5, { axis: "y", color: "#5a5a5a" });
        continue;
      }
      const kind = ORDER[Math.floor(rng() * ORDER.length)];
      kinds[kind].push([cx, cy, px, py, pw, pd]);
      if (kind === "catnip") {
        m.fill(px, py, pw, pd, G.FIELD);
        if (pw >= pd) for (let yy = py + 1; yy < py + pd - 1; yy += 3) m.building({ x: px + 2, y: yy, w: Math.max(1, pw - 4), d: 1, floors: 1, style: "crop" });
        else for (let xx = px + 1; xx < px + pw - 1; xx += 3) m.building({ x: xx, y: py + 2, w: 1, d: Math.max(1, pd - 4), floors: 1, style: "crop" });
      } else if (kind === "tilled") {
        m.fill(px, py, pw, pd, G.FIELD);
        if (rng() < 0.6) m.prop("tractor", cx, cy);
      } else if (kind === "paddock") {
        const gate = px + 2 + Math.floor(rng() * Math.max(1, pw - 5));
        for (let i = px + 1; i < px + pw - 1; i++) { if (i !== gate && i !== gate + 1) m.prop("fence", i + 0.5, py + 1.5, { axis: "x" }); m.prop("fence", i + 0.5, py + pd - 1.5, { axis: "x" }); }
        for (let j = py + 2; j < py + pd - 2; j++) { m.prop("fence", px + 1.5, j + 0.5, { axis: "y" }); m.prop("fence", px + pw - 1.5, j + 0.5, { axis: "y" }); }
        for (let k = 0; k < 5; k++) m.prop("hay", px + 3 + rng() * (pw - 6), py + 3 + rng() * (pd - 6));
        m.prop("trough", cx, cy);
      } else if (kind === "orchard") {
        for (let i = px + 2; i < px + pw - 1; i += 3) for (let j = py + 2; j < py + pd - 1; j += 3) m.prop("tree", i + 0.5, j + 0.5);
      } else if (kind === "steading") {
        m.fill(px, py, pw, pd, G.DIRT);
        const bw = Math.min(10, pw - 4), bd = Math.min(6, pd - 6);
        if (bw >= 6 && bd >= 4) {
          m.structure({ x: px + 2, y: py + 2, w: bw, d: bd, floors: 2, style: "barn", floor: G.DIRT, name: "Barn", pitch: "y", gambrel: true, ridge: Math.min(32, bw * 3.5), roof: "#2a2a30", loft: bw >= 8,
            doors: [["s", Math.floor(bw / 2) - 1, 2]] });
          m.prop("hay", px + 3.5, py + 3.5); if (bw > 6) m.prop("tractor", px + bw - 0.5, py + 3.5);
        } else if (bw >= 3 && bd >= 3) m.building({ x: px + 2, y: py + 2, w: bw, d: bd, floors: 2, style: "barn", name: "Barn" });
        if (pw >= 16 && pd >= 8) silo(px + pw - 5, py + 2, 66);
        m.prop("truck", px + 3.5, py + pd - 2.5, { color: "#8a3a2a" });
        m.prop("flood", px + pw - 2, py + pd - 2); m.light(px + pw - 2, py + pd - 1.5, 4, "#fffbe8", 0.18);
      } else if (kind === "glass") {
        m.fill(px, py, pw, pd, G.DIRT);
        for (let j = py + 2; j + 4 < py + pd; j += 6) {
          const gw = Math.max(2, pw - 4);
          if (gw >= 5) {
            m.structure({ x: px + 2, y: j, w: gw, d: 4, floors: 1, style: "greenhouse", floor: G.DIRT, name: "Glasshouse", doors: [["s", 1, 2], ["n", gw - 3, 2]] });
            for (let i = 3; i < gw - 1; i += 2) m.prop("bed", px + 2 + i + 0.5, j + 1.5, { color: "#4a9a3a" });
          } else m.building({ x: px + 2, y: j, w: gw, d: 4, floors: 1, style: "greenhouse" });
        }
      }
    }
    // lanterns where the tracks run
    for (const [tx, ty] of tracks) { m.prop("lamp", tx, ty); m.light(tx + 0.2, ty + 0.4, 2.6, "#ffcf80", 0.22); }

    // ---- mission points ----
    for (const [x, y, n] of [[9.5, 9.5], [30.5, 8.5, "the farm gate on Ranch Road"], [75.5, 8.5, "Ranch Road, by the freight yard"], [130.5, 8.5, "Ranch Road, east"],
      [8.5, 70.5, "the County Road, by the greenhouses"], [8.5, 125.5, "the County Road, south"], [60.5, 141.5, "the south pasture"], [142.5, 90.5, "the east fence line"],
      [8.5, 92.5, "the County Road, by the glasshouses"],
      [51.5, 58.5, "the long track"], [8.5, 46.5, "the County Road, at the farm track"]].map(([x, y, n]) => [x, y, n || "the crossroads"]))
      m.point("spawn", x, y, n);
    tracks.forEach(([x, y], k) => { if (k % 2 === 0) m.point("spawn", x, y, "a farm track"); });
    for (const [x, y, n] of [[19.5, 21.5, "the barn"], [33.5, 20.2, "the farmhouse porch"], [43.5, 33.5, "the windmill"], [22.5, 61.5, "the greenhouses"], [34.5, 85.5, "the last row of greenhouses"], [46.5, 69.5, "the potting yard"],
      [34.5, 113, "the bunkhouses"], [43.5, 124.5, "the feed store"], [100, 15, "the loading docks"], [100, 25.5, "the warehouse floor"], [134, 31.5, "the freight office"], [18.5, 17, "the hayloft stairs"], [36.5, 13.5, "the owner's office"], [30.5, 120.5, "the drying shed"]])
      m.point("target", x, y, n);
    if (processing) { const [px, py, pw, pd] = processing; m.point("target", px + Math.min(pw - 2, 6), py + Math.min(pd - 1, 9.5), "the processing shed", "The Processing Yard"); }
    const NAMES = { catnip: "a catnip field", tilled: "a tilled field", paddock: "a paddock", orchard: "an orchard", steading: "a farm steading", glass: "a row of glasshouses" };
    for (const [k, list] of Object.entries(kinds)) list.slice(0, 2).forEach(([cx, cy, px, py]) => m.point("target", k === "catnip" ? px + 1 : cx, k === "catnip" ? py + 0.5 : cy + (k === "steading" ? 3 : 0), NAMES[k], "The Farms"));
    for (const [x, y, n] of [[0.5, 5.5, "the west end of Ranch Road"], [143.5, 5.5, "the east end of Ranch Road"], [5.5, 143.5, "the County Road south"],
      [51.5, 143.5, "the long track south"], [143.5, 41.5, "the east end of the farm track"], [5.5, 0.5, "the County Road north"]])
      m.point("exit", x, y, n);
  },
});
