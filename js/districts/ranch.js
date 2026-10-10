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
    { id: "fields", name: "The North Fields", x: 46, y: 0, w: 98, h: 48, blurb: "Long rows of catnip under the Ranch Road lights." },
    { id: "farms", name: "The Farms", x: 54, y: 44, w: 90, h: 100, blurb: "The patchwork of hedged catnip farms east of the canal." },
  ],

  build(m, rng) {
    const G = W.G, K = W.K;
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
    m.building({ x: 13, y: 12, w: 12, d: 8, floors: 3, style: "barn", name: "The barn", signs: [{ face: "s", text: "THE RANCH", at: 2.5, z: 34, color: "#ffb000" }] });
    m.building({ x: 30, y: 12, w: 8, d: 7, floors: 2, style: "brick", name: "The farmhouse" });
    for (const [x, y] of [[41, 12], [45, 12], [41, 16]]) m.building({ x, y, w: 3, d: 3, floors: 6, style: "metal", name: "Silo" });
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
    m.prop("lamp", 33.5, 20.2); m.light(33.7, 20.6, 2.4, "#ffcf80", 0.22);
    for (const [x, y] of [[11.5, 21.5], [11.5, 22.5], [47.5, 11.5], [37.5, 37.5]]) m.prop("barrel", x, y, { color: "#5a3a2a" });

    // ---- the north fields: long rows of catnip with a path down the middle ----
    m.fill(58, 10, 85, 29, G.FIELD);
    m.fill(97, 10, 3, 29, G.DIRT);
    for (let y = 11; y <= 35; y += 3) {
      m.building({ x: 58, y, w: 39, d: 1, floors: 1, style: "crop" });
      m.building({ x: 100, y, w: 43, d: 1, floors: 1, style: "crop" });
    }
    K.lamps(m, 98.5, 12, 98.5, 37, 12);

    // ---- the greenhouses ----
    m.fill(10, 45, 39, 53, G.DIRT);
    for (const gx of [12, 24, 36]) for (const gy of [47, 55, 63, 71, 79, 87]) m.building({ x: gx, y: gy, w: 10, d: 5, floors: 1, style: "greenhouse" });
    for (const [x, y] of [[22.5, 53.5], [34.5, 69.5], [22.5, 85.5], [11, 61], [47, 77]]) { m.prop("lamp", x, y); m.light(x + 0.2, y + 0.4, 2.4, "#ffcf80", 0.2); }
    for (let i = 0; i < 8; i++) m.prop("barrel", 22.5 + (i % 2) * 12, 52.5 + i * 5, { color: "#2a5a6a" });

    // ---- workers' row ----
    m.fill(10, 104, 39, 39, G.DIRT);
    for (const x of [12, 19, 26, 33, 40]) m.building({ x, y: 106, w: 5, d: 5, floors: 1, style: "brick", name: "Bunkhouse" });
    m.building({ x: 12, y: 116, w: 12, d: 8, floors: 2, style: "metal", door: "s", name: "Drying shed" });
    m.building({ x: 27, y: 116, w: 11, d: 8, floors: 2, style: "metal", door: "s", name: "Drying shed" });
    m.building({ x: 40, y: 116, w: 8, d: 7, floors: 2, style: "brick", name: "Feed store", signs: [{ face: "s", text: "FEED & SEED", at: 0.6, z: 22, color: "#4ade6a" }] });
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
        m.building({ x: px + 2, y: py + 2, w: sw, d: sd, floors: 2, style: "metal", door: "s", name: "Processing shed", signs: [{ face: "s", text: "PROCESSING", at: Math.max(0.3, sw / 2 - 3), z: 22, color: "#ff5266" }] });
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
        if (bw >= 3 && bd >= 3) m.building({ x: px + 2, y: py + 2, w: bw, d: bd, floors: 2, style: "barn", name: "Barn" });
        if (pw >= 16 && pd >= 8) m.building({ x: px + pw - 5, y: py + 2, w: 3, d: 3, floors: 5, style: "metal", name: "Silo" });
        m.prop("truck", px + 3.5, py + pd - 2.5, { color: "#8a3a2a" });
        m.prop("flood", px + pw - 2, py + pd - 2); m.light(px + pw - 2, py + pd - 1.5, 4, "#fffbe8", 0.18);
      } else if (kind === "glass") {
        m.fill(px, py, pw, pd, G.DIRT);
        for (let j = py + 2; j + 4 < py + pd; j += 6) m.building({ x: px + 2, y: j, w: Math.max(2, pw - 4), d: 4, floors: 1, style: "greenhouse" });
      }
    }
    // lanterns where the tracks run
    for (const [tx, ty] of tracks) { m.prop("lamp", tx, ty); m.light(tx + 0.2, ty + 0.4, 2.6, "#ffcf80", 0.22); }

    // ---- mission points ----
    for (const [x, y, n] of [[9.5, 9.5], [30.5, 8.5, "the farm gate on Ranch Road"], [75.5, 8.5, "Ranch Road, by the north fields"], [130.5, 8.5, "Ranch Road, east"],
      [8.5, 70.5, "the County Road, by the greenhouses"], [8.5, 125.5, "the County Road, south"], [60.5, 141.5, "the south pasture"], [142.5, 90.5, "the east fence line"],
      [8.5, 92.5, "the County Road, by the glasshouses"],
      [51.5, 58.5, "the long track"], [8.5, 46.5, "the County Road, at the farm track"]].map(([x, y, n]) => [x, y, n || "the crossroads"]))
      m.point("spawn", x, y, n);
    tracks.forEach(([x, y], k) => { if (k % 2 === 0) m.point("spawn", x, y, "a farm track"); });
    for (const [x, y, n] of [[19.5, 21.5, "the barn"], [33.5, 20.2, "the farmhouse porch"], [43.5, 33.5, "the windmill"], [22.5, 61.5, "the greenhouses"], [34.5, 85.5, "the last row of greenhouses"], [46.5, 69.5, "the potting yard"],
      [34.5, 113, "the bunkhouses"], [43.5, 124.5, "the feed store"], [118.5, 22.5, "the north fields"], [98.5, 30.5, "the field path"]])
      m.point("target", x, y, n);
    if (processing) { const [px, py, pw, pd] = processing; m.point("target", px + Math.min(pw - 2, 6), py + Math.min(pd - 1, 9.5), "the processing shed", "The Processing Yard"); }
    const NAMES = { catnip: "a catnip field", tilled: "a tilled field", paddock: "a paddock", orchard: "an orchard", steading: "a farm steading", glass: "a row of glasshouses" };
    for (const [k, list] of Object.entries(kinds)) list.slice(0, 2).forEach(([cx, cy, px, py]) => m.point("target", k === "catnip" ? px + 1 : cx, k === "catnip" ? py + 0.5 : cy + (k === "steading" ? 3 : 0), NAMES[k], "The Farms"));
    for (const [x, y, n] of [[0.5, 5.5, "the west end of Ranch Road"], [143.5, 5.5, "the east end of Ranch Road"], [5.5, 143.5, "the County Road south"],
      [51.5, 143.5, "the long track south"], [143.5, 41.5, "the east end of the farm track"], [5.5, 0.5, "the County Road north"]])
      m.point("exit", x, y, n);
  },
});
