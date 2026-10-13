/* Taking a car. A Watcher can flag down a car in traffic and take it: the
 * driver gets out and runs, and the squad drives. A car goes where it is
 * sent by the roads, turning at the junctions, and keeps every rule the
 * traffic keeps (the lights, the car in front, people in the road, the
 * trains). Inside, the squad is out of sight: nobody looks into a passing
 * car, unless they saw a Watcher get in. Then it is a target, and a car that
 * is shot enough goes up with everyone in it. */
"use strict";

W.CAR_SEATS = 4;
W.CAR_SPEED = 4.8;     // a little under W.SPEEDING: a careful driver
W.HAIL_R = 10;         // how close a Watcher must be (in the driver's sight) for them to stop
W.CHASE_R = 25;        // further than this (or than it was, and then some), the car has got away
W.BOARD_R = 1.4;       // close enough to get in
W.CAR_BLAST = 36;      // what the squad inside take when the car goes up, before armour: 27 kills a stock Watcher (24)

/* can the squad get into this car (another seat, or a car in traffic)? */
W.canBoard = c => !!c && !c.dead && !c.gone && !c.train && !c.escape && !c.escapeCar && !c.stash &&
  (c.player ? c.riders.length < W.CAR_SEATS : !c.parked);

/* ---- the roads as a graph ----
 * Every lane is a straight run one way. Where two lanes cross inside a
 * junction, a car can turn from one onto the other. */
W.roadGraph = map => {
  if (map._roads) return map._roads;
  const lanes = map.lanes.filter(L => !L.train), cross = lanes.map(() => []);
  const inJunction = (x, y) => map.junctions.some(j => x >= j.x0 - 0.01 && x <= j.x1 + 0.01 && y >= j.y0 - 0.01 && y <= j.y1 + 0.01);
  lanes.forEach((A, i) => lanes.forEach((B, k) => {
    if (A.axis !== "x" || B.axis !== "y") return;
    const x = B.at, y = A.at;
    if (x < A.from || x > A.to || y < B.from || y > B.to || !inJunction(x, y)) return;
    cross[i].push({ s: x, to: k, ts: y });
    cross[k].push({ s: y, to: i, ts: x });
  }));
  // how far along each lane a car may go: the stretch of it on the road and on the map
  const onRoad = (L, s) => { const x = L.axis === "x" ? s : L.at, y = L.axis === "x" ? L.at : s; return map.inb(Math.floor(x), Math.floor(y)) && (map.groundAt(x, y) === W.G.ROAD || map.groundAt(x, y) === W.G.RAIL); };
  const ends = lanes.map(L => {
    const top = (L.axis === "x" ? map.w : map.h) - 0.5;
    let lo = Math.max(L.from, 0.5), hi = Math.min(L.to, top);
    while (lo < hi && !onRoad(L, lo)) lo += 0.5;
    while (hi > lo && !onRoad(L, hi)) hi -= 0.5;
    return [lo, hi];
  });
  // the other way along the same street: a car can turn round into it
  const near = (L, r) => { let b = -1, bd = r; lanes.forEach((o, k) => { const d = Math.abs(o.at - L.at); if (o.axis === L.axis && o.dir === -L.dir && d <= bd) { bd = d; b = k; } }); return b; };
  const opp = lanes.map(L => near(L, 2.5));
  // at the end of the road (the map's edge) it can always turn round, across a median if need be
  const back = lanes.map(L => near(L, 7));
  return (map._roads = { lanes, cross, ends, opp, back });
};
W.laneEnds = (map, L) => { const G = W.roadGraph(map), i = G.lanes.indexOf(L); return i >= 0 ? G.ends[i] : [L.from, L.to]; };

/* Send a car of ours to the road nearest (x, y). False if no road goes there. */
W.driveTo = (world, car, x, y) => {
  car.goal = [x, y]; car.exiting = null; car.blockedT = 0;
  car.route = W.routePlan(world, car, x, y);
  return !!car.route;
};
/* Stuck behind something that will not move: find another way from here. */
W.reroute = (world, car) => {
  if (W.driveTo(world, car, car.goal[0], car.goal[1])) return true;
  world.msg("The road is blocked.", "#ffb000");
  return false;
};
/* Something in the road that will not move: a parked car, a wreck, a car of ours left standing. */
W.standing = o => o.parked || o.dead || (o.player && !o.riders.length);

/* The way from where a car is to the road nearest (x, y), or null: a list
 * of legs, each driven along its lane to s, then turned off on to next (or,
 * the last, stopped at). */
W.routePlan = (world, car, x, y) => {
  const G = W.roadGraph(world.map), lanes = G.lanes;
  const along = (L, c) => L.axis === "x" ? c.x : c.y;
  const goals = new Map();
  let best = Infinity;
  const cand = lanes.map((L, i) => {
    const ax = L.axis === "x", [lo, hi] = G.ends[i], a = ax ? x : y, lat = ax ? y : x, s = W.clamp(a, lo, hi);
    const off = Math.abs(lat - L.at) + Math.abs(a - s);
    best = Math.min(best, off);
    return { i, s, off };
  });
  if (best > 8) return null;
  for (const c of cand) if (c.off <= best + 2.6) goals.set(c.i, c.s);
  const start = lanes.indexOf(car.lane);
  if (start < 0) return null;
  const s0 = along(car.lane, car);
  // what stands in the lanes: no way past it along that lane
  const stands = lanes.map(() => []);
  for (const o of world.cars) if (o !== car && o.lane && !o.train && W.standing(o)) { const i = lanes.indexOf(o.lane); if (i >= 0 && Math.abs((o.lane.axis === "x" ? o.y : o.x) - o.lane.at) < 0.5) stands[i].push(along(o.lane, o)); }
  const clear = (i, a, b) => !stands[i].some(s => (s - a) * lanes[i].dir > -0.2 && (b - s) * lanes[i].dir > -(car.len + 0.5));
  // Dijkstra over stops (lane, s). Moves: on to the next stop ahead in the lane, or a turn at a crossing.
  const key = (i, s) => i + ":" + Math.round(s * 100);
  const D = new Map(), P = new Map(), open = [];
  const relax = (i, s, d, from, turn) => {
    const k = key(i, s);
    if (d < (D.get(k) ?? Infinity)) { D.set(k, d); P.set(k, { from, turn }); open.push({ i, s, d, k }); }
  };
  relax(start, s0, 0, null, false);
  open[0].start = true;
  let end = null;
  while (open.length) {
    let b = 0; for (let n = 1; n < open.length; n++) if (open[n].d < open[b].d) b = n;
    const N = open.splice(b, 1)[0];
    if (N.d > D.get(N.k)) continue;
    const gs = goals.get(N.i);
    // arrived: on a goal lane at its stop (the start counts only if the car is already there)
    if (gs != null && Math.abs(N.s - gs) < 0.01) { end = N; break; }
    const L = lanes[N.i], [lo, hi] = G.ends[N.i];
    let next = null;
    const consider = s => { const ahead = (s - N.s) * L.dir; if (ahead > 0.01 && s >= lo - 0.01 && s <= hi + 0.01 && (next == null || ahead < (next - N.s) * L.dir)) next = s; };
    for (const c of G.cross[N.i]) consider(c.s);
    if (gs != null) consider(gs);
    const roadEnd = L.dir > 0 ? hi : lo, B = G.back[N.i];
    if (B >= 0 && roadEnd >= G.ends[B][0] && roadEnd <= G.ends[B][1]) consider(roadEnd);
    if (next != null && clear(N.i, N.s, next)) relax(N.i, next, N.d + Math.abs(next - N.s), N, false);
    for (const c of G.cross[N.i]) if (Math.abs(c.s - N.s) < 0.01) relax(c.to, c.ts, N.d + 2, N, true);
    // where it stands, it can turn round into the other lane
    const O = G.opp[N.i];
    if (N.start && O >= 0 && N.s >= G.ends[O][0] && N.s <= G.ends[O][1]) relax(O, N.s, N.d + 4, N, true);
    // and at the end of the road
    const Bk = G.back[N.i];
    if (Bk >= 0 && Math.abs(N.s - (L.dir > 0 ? hi : lo)) < 0.01 && N.s >= G.ends[Bk][0] && N.s <= G.ends[Bk][1]) relax(Bk, N.s, N.d + 6, N, true);
  }
  if (!end) return null;
  // back from the end: every turn is a leg's end
  const chain = [];
  for (let N = end; N; N = P.get(N.k).from) chain.unshift({ N, turn: P.get(N.k).turn });
  const legs = [];
  for (let n = 1; n < chain.length; n++) {
    const { N, turn } = chain[n];
    if (turn) { const was = chain[n - 1].N; legs.push({ lane: lanes[was.i], s: was.s, next: { lane: lanes[N.i], s: N.s } }); }
  }
  legs.push({ lane: lanes[end.i], s: end.s, next: null });
  return legs;
};

/* ---- the car of ours, every tick (from World.updateCar) ---- */
/* How fast it may go for its route: slow for a turn, easing to a stop at the end. */
W.routeWant = (world, car) => {
  if (!car.route || car.exiting || !car.riders.length) return 0;
  const leg = car.route[0], s = car.axis === "x" ? car.x : car.y, d = (leg.s - s) * car.dir;
  if (!leg.next) return Math.min(car.maxSpeed, Math.max(0, d) * 1.8 + (d > 0.15 ? 0.4 : 0));
  let want = Math.min(car.maxSpeed, Math.max(1.8, d * 1.6));
  // wait to turn until the lane it turns on to is clear there
  // (and wait short of it, so as not to stop the car it is waiting for)
  if (W.turnBusy(world, car, leg.next)) want = Math.min(want, Math.max(0, d - car.len / 2 - car.wid / 2 - 0.6) * 2);
  return want;
};
/* Is there a car in the way where a turn comes out? */
W.turnBusy = (world, car, to) => {
  const B = to.lane, bx = B.axis === "x";
  return world.cars.some(o => o !== car && !o.parked && o.lane === B && Math.abs((bx ? o.x : o.y) - to.s) < (car.len + o.len) / 2 + 0.6);
};
/* After it moves: turn, stop, and carry the squad. */
W.afterDrive = (world, car) => {
  const ax = car.axis === "x", s = ax ? car.x : car.y;
  const leg = car.route && car.route[0];
  if (leg && leg.lane === car.lane && (leg.s - s) * car.dir <= 0.05) {
    if (leg.next && W.turnBusy(world, car, leg.next)) { car.speed = 0; }
    else if (leg.next) {
      // the turn: on to the crossing lane (or, turning round, the other lane), where the two meet
      const B = leg.next.lane, round = B.axis === car.axis;
      car.lane = B; car.axis = B.axis; car.dir = B.dir;
      if (B.axis === "x") { car.x = leg.next.s; car.y = B.at; } else { car.y = leg.next.s; car.x = B.at; }
      car.speed = round ? 0 : car.speed * 0.7;
      car.route.shift();
    } else {
      if (ax) car.x = leg.s; else car.y = leg.s;
      car.route = null;
    }
  }
  // the edge of the map: no further
  const s2 = car.axis === "x" ? car.x : car.y, [lo, hi] = W.laneEnds(world.map, car.lane);
  if (s2 < lo || s2 > hi) { const c = W.clamp(s2, lo, hi); if (car.axis === "x") car.x = c; else car.y = c; car.speed = 0; car.route = null; }
  car.riders = car.riders.filter(r => r.alive && !r.out && r.car === car);
  for (const r of car.riders) { r.x = car.x; r.y = car.y; }
  if (car.exiting && car.speed < 0.3) W.leaveCar(world, car, car.exiting);
};

/* ---- in and out ---- */
/* Walking to a car to get in (from thinkAgent). True while that is all they are doing. */
W.boardThink = (world, a) => {
  const c = a.board, m = world.map;
  // a car that has driven off the map (to come round again) is gone
  const d = c && W.dist(a.x, a.y, c.x, c.y);
  if (a.boardMax == null && c) a.boardMax = Math.max(W.CHASE_R, d + 8);
  if (!W.canBoard(c) || c.x < 0.5 || c.y < 0.5 || c.x > m.w - 0.5 || c.y > m.h - 0.5 || d > a.boardMax) {
    if (c && !c.dead && !c.player) world.msg(`${a.name}: the car got away.`, "#ffb000");
    a.board = null; a.boardMax = null; return false;
  }
  if (d <= W.BOARD_R) { W.getIn(world, a, c); return true; }
  // close enough to wave it down: the driver stops
  if (d <= W.HAIL_R && !c.player && m.los(a.x, a.y, c.x, c.y)) c.hailT = 1;
  if (!a.path || a.chaseT <= 0) {
    a.chaseT = 0.6;
    if (!W.goTo(world, a, c.x, c.y)) { a.board = null; world.msg(`${a.name}: can't get to that car.`, "#ffb000"); return false; }
  }
  return true;
};
W.getIn = (world, a, c) => {
  if (!c.player) {
    // ours now: the driver gets out the other side and runs
    c.player = true; c.riders = []; c.route = null; c.maxSpeed = W.CAR_SPEED; c.panicT = 0; c.distractT = 0; c.hailT = 0;
    const p = W.kerbBeside(world, c, a.x, a.y, true);
    if (p) {
      const drv = world.add(W.makeUnit("civ", p[0], p[1]));
      world.panic(drv, a.x, a.y);
      W.say(drv, W.pick(["My car!", "Take it, take it!", "Hey!"]), "#94a0c4", 1.6);
    }
    W.audio.at("engine", c.x, c.y);
  }
  a.inCar = true; a.car = c; a.board = null; a.boardMax = null; a.path = null; a.dest = null; a.moving = false;
  a.target = null; a.manual = null; a.shootAt = null; a.cur = -1; a.weaponOut = false;
  c.riders.push(a);
  a.x = c.x; a.y = c.y;
  // anyone already after the squad who sees them get in knows the car
  if (!c.spotted && W.seenGettingIn(world, a)) { c.spotted = true; world.msg(`${a.name} was seen getting in. They know the car.`, "#ff5266"); }
  else world.msg(`${a.name} is in the car.`, "#54f2ff");
};
/* Is anyone hunting the squad looking at a? */
W.seenGettingIn = (world, a) => world.units.some(u => u.alive && !u.inCar && !u.follower &&
  ((u.faction === "crew" && u.hostile && !u.broken) || (u.kind === "sec" && u.angryAt.player)) &&
  W.canSee(world, u, a, u.sight + 2));
/* Out of the car on to the pavement beside it, once it has stopped. who: the riders getting out. */
W.leaveCar = (world, c, who) => {
  c.route = null;
  if (c.speed > 0.3) { c.exiting = who; return; }
  c.exiting = null;
  for (const a of who) {
    if (a.car !== c) continue;
    const p = W.kerbBeside(world, c, c.x, c.y, false) || [c.x, c.y];
    a.inCar = false; a.car = null; a.x = p[0] + W.rand(-0.2, 0.2); a.y = p[1] + W.rand(-0.2, 0.2); a.path = null;
    if (!world.map.walkable(a.x, a.y)) { a.x = p[0]; a.y = p[1]; }
  }
  c.riders = c.riders.filter(r => r.car === c);
};
/* A spot to stand beside a car: off the road if there is pavement near, on
 * the side away from (fx, fy) when away, else the nearer. */
W.kerbBeside = (world, c, fx, fy, away) => {
  const m = world.map, ax = c.axis === "x";
  const toward = (ax ? fy - c.y : fx - c.x) >= 0 ? 1 : -1, sides = away ? [-toward, toward] : [toward, -toward];
  for (const off of [1.6, 2.4, 3.2, 1.1]) for (const sg of sides) {
    const x = ax ? c.x : c.x + sg * off, y = ax ? c.y + sg * off : c.y;
    if (m.walkable(x, y) && (off < 1.5 || m.groundAt(x, y) !== W.G.ROAD)) return [x, y];
  }
  return m.nearestWalkable(c.x, c.y, 4);
};
/* A spot clear of a car's lane, level with `along` on it: the pavement on
 * u's side if there is any near, else the other side's, else the road just
 * out of the lane. Where a follower waits for the car, or steps to let it by. */
W.wayside = (world, c, u, along) => {
  const m = world.map, ax = c.axis === "x", lat = ax ? c.y : c.x, side = (ax ? u.y : u.x) >= lat ? 1 : -1;
  const at = (sg, off) => ax ? [along, lat + sg * off] : [lat + sg * off, along];
  for (const sg of [side, -side]) for (const off of [1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0]) {
    const [x, y] = at(sg, off);
    if (m.walkable(x, y) && m.groundAt(x, y) !== W.G.ROAD && m.groundAt(x, y) !== W.G.RAIL) return [x, y];
  }
  for (const sg of [side, -side]) { const [x, y] = at(sg, 1.2); if (m.walkable(x, y)) return [x, y]; }
  return null;
};
/* The car goes up (after its blast, which nobody inside feels twice): each
 * Watcher in it takes W.CAR_BLAST through their armour, and any left alive
 * is thrown clear on to the pavement, flat for a moment. Enough to kill one
 * with the stock body; a Chest mod (more health, harder to hurt) gets them out. */
W.carLost = (world, c, src) => {
  for (const a of c.riders || []) {
    if (!a.alive || a.car !== c) continue;
    const p = W.kerbBeside(world, c, c.x, c.y, false) || [c.x, c.y];
    a.inCar = false; a.car = null; a.x = p[0] + W.rand(-0.3, 0.3); a.y = p[1] + W.rand(-0.3, 0.3); a.path = null;
    if (!world.map.walkable(a.x, a.y)) { a.x = p[0]; a.y = p[1]; }
    world.damage(a, W.CAR_BLAST, src);
    if (a.alive) { a.stunT = a.downT = 1.6; a.deadSide = Math.random() < 0.5 ? -1 : 1; world.msg(`${a.name} is thrown clear of the wreck.`, "#ffb000"); }
  }
  if (c.riders) c.riders = [];
};

/* For the crew and the police: a car they know the squad is in, in sight and range. */
W.knownCar = (world, u, range) => {
  if (!((u.faction === "crew" && u.hostile && !u.broken) || (u.kind === "sec" && u.angryAt.player))) return null;
  let best = null, bd = Infinity;
  for (const c of world.cars) {
    if (!c.player || !c.spotted || c.dead || !c.riders.length) continue;
    const d = W.dist(u.x, u.y, c.x, c.y);
    if (d < bd && d <= range && world.map.los(u.x, u.y, c.x, c.y)) { bd = d; best = c; }
  }
  return best;
};
