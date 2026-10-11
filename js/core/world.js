/* A mission in progress: the map, everyone in it, the traffic, the effects,
 * and the rules for winning and losing. The screen drives it with update(dt)
 * and draws it with the renderer; nothing in here touches the DOM. */
"use strict";

/* when the target dies, the share of the hostile crew that breaks and runs, by threat */
W.BREAK = { 1: 0.85, 2: 0.75, 3: 0.6, 4: 0.35, 5: 0.15 };
/* how deep the strip along the map's edge is that a Watcher can leave by */
W.EDGE = 3;
/* a train's carriages, nose to nose */
W.CARRIAGE = 4.1;
/* over this, a car that hits someone kills them (town traffic tops out at 4.6) */
W.SPEEDING = 5;
/* When a vehicle (its info: lane, nose, tail, delay, top speed) can reach the
 * point `a` along its lane: 0 if it is there now, Infinity if it has gone by. */
W.etaAt = (I, a) => {
  if ((a - I.tail) * I.dir > -0.4 && (I.nose - a) * I.dir > -0.4) return 0;
  const d = (a - I.nose) * I.dir;
  return d < 0 ? Infinity : I.delay + d / I.vmax;
};
/* A train's push field at (x, y): how far off the line it reaches there, or
 * 0 if the spot is outside it. A wedge: it reaches further ahead the faster
 * the train runs, and is widest at the nose. A train standing at a station
 * or waiting off the map has none. */
W.pushWidth = (I, x, y) => {
  if (!I || (I.speed < 0.3 && I.delay > 1)) return 0;
  const reach = 3 + I.speed * 2.2, d = ((I.ax ? x : y) - I.nose) * I.dir;
  if (d < -0.6 || d > reach) return 0;
  const wide = I.half + 0.45 + 0.6 * (1 - Math.max(0, d) / reach);
  return Math.abs((I.ax ? y : x) - I.lat) < wide ? wide : 0;
};

W.World = class {
  constructor(level, opts = {}) {
    this.level = level;
    this.attract = !!opts.attract;
    let m;
    if (level.makeMap) m = level.makeMap(opts);
    else {
      m = new W.Map(level.w, level.h);
      m.seed = level.seed || 1;
      level.build(m);
      m.finish();
    }
    this.map = m;
    // who is who, in this level's words
    this.names = Object.assign({ target: "Vesper Sly", crew: "Vesper's crew", sec: "Plaza Security", guard: "Bodyguard", henchman: "Henchcat", civ: "Civilian" }, level.names || {});
    this.units = []; this.cars = []; this.items = [];
    this.tracers = []; this.particles = []; this.booms = []; this.decals = []; this.smoke = []; this.pings = [];
    this.strikes = []; this.columns = [];
    this.msgs = [];
    this.time = 0; this.cam = { x: 0, y: 0 };
    this.selected = new Set();
    this.alarm = false; this.alarmAt = null;
    this.status = "play"; this.endT = 0; this.endReason = "";
    // civ: civilians the fight killed, which count against the squad; civAcc: accidents, which do not
    this.stats = { shots: 0, crew: 0, sec: 0, civ: 0, civAcc: 0, lost: 0, recruited: 0, time: 0 };
    this.trains = [];
    this.objectives = [];
    this.light = { x: true, y: false };
    this.spawnTraffic();
    this.scanTraffic();
    for (const l of m.loot) this.items.push(Object.assign({}, l));
    level.populate(this, opts);
    if (!this.attract && level.mission && level.mission.hired) W.spawnHired(this, level.mission.hired);
  }

  add(u) { this.units.push(u); return u; }
  get agents() { return this.units.filter(u => u.isAgent); }

  msg(text, color = "#dbe4fb") {
    this.msgs.push({ text, color, t: 7, at: this.time });
    if (this.msgs.length > 6) this.msgs.shift();
  }

  /* ---- effects ---- */
  tracer(x0, y0, z0, x1, y1, z1, color = "#ffe9a8", w = 1, life = 0.07) { this.tracers.push({ x0, y0, z0, x1, y1, z1, color, w, t: 0, life }); }
  spark(x, y, z, color, n = 4) {
    for (let i = 0; i < n; i++) this.particles.push({ x, y, z, vx: W.rand(-1.5, 1.5), vy: W.rand(-1.5, 1.5), vz: W.rand(10, 40), color, size: 1, t: 0, life: W.rand(0.2, 0.45) });
  }
  blood(u, n = 5) {
    const col = u.isAgent ? "#3ad0e0" : "#9a1428";
    for (let i = 0; i < n; i++) this.particles.push({ x: u.x, y: u.y, z: W.rand(6, 14), vx: W.rand(-1.2, 1.2), vy: W.rand(-1.2, 1.2), vz: W.rand(0, 25), color: col, size: 1, t: 0, life: W.rand(0.3, 0.6) });
  }
  ping(x, y, color = "#54f2ff") { this.pings.push({ x, y, color, t: 0, life: 0.6 }); }

  /* ---- harm ---- */
  damage(u, dmg, src) {
    if (!u.alive) return;
    if (u.isAgent) dmg *= u.armor;
    u.hp -= dmg;
    this.blood(u, 4);
    W.audio.at("hit", u.x, u.y, 0.7);
    if (src && src.faction) {
      if (u.kind === "civ" && !u.follower) this.panic(u, src.x, src.y);
      if (u.kind === "sec" && !u.follower) { if (src.faction === "player") W.secCall(this, u, "player"); else if (src.faction === "crew") W.secCall(this, u, "crew"); }
      if (u.faction === "crew") {
        if (src.faction === "player") { u.broken = false; if (!u.hostile) { u.hostile = true; W.drawBest(u); } u.seen = [src.x, src.y]; this.raiseAlarm(u, src); }
        if (src.faction === "sec") u.angryAt.sec = true;
      }
    }
    if (u.hp <= 0) this.kill(u, src);
  }
  kill(u, src) {
    u.alive = false; u.hp = 0; u.path = null; u.target = null; u.say = null;
    u.deadSide = Math.random() < 0.5 ? -1 : 1;
    this.selected.delete(u);
    // never leave the player holding nobody
    if (u.isAgent && !this.selected.size) { const next = this.units.find(a => a.isAgent && a.alive); if (next) this.selected.add(next); }
    W.audio.at(u.isAgent ? "meow" : "die", u.x, u.y);
    this.blood(u, 10);
    // what they carried lands on the pavement
    // (everything they had: a gun, a spare, and now and then a medikit; the squad can take it home)
    const guns = u.isAgent ? u.weapons.filter(w => (W.WEAPONS[w.type].gun && w.type !== "pistol") || w.type === "goods") : u.weapons.filter(w => W.WEAPONS[w.type].gun);
    if (!u.isAgent && (u.faction === "crew" || u.kind === "sec") && Math.random() < 0.15) guns.push({ type: "medikit", ammo: 1 });
    guns.forEach((w, i) => this.items.push({ type: w.type, ammo: w.ammo, mk: w.mk, x: u.x + (i ? W.rand(-0.3, 0.3) : 0), y: u.y + (i ? W.rand(-0.3, 0.3) : 0) }));
    if (src && src.isAgent && !u.isAgent) src.kills = (src.kills || 0) + 1;
    if (u.isAgent) { this.stats.lost++; this.msg(`${u.name} is down.`, "#ff5266"); }
    else if (u.kind === "civ" && !u.follower) { if (src && src.accident) this.stats.civAcc++; else this.stats.civ++; }
    else if (u.faction === "crew") this.stats.crew++;
    else if (u.kind === "sec") this.stats.sec++;
    for (const o of this.units) if (o.target === u) o.target = null;
    this.noise(u.x, u.y, 5, src || u);
  }
  panic(u, fx, fy) {
    if (u.kind !== "civ" || u.follower || !u.alive) return;
    if (u.state !== "panic" && Math.random() < 0.2) W.say(u, W.pick(W.LINES.panic), "#94a0c4", 1.4);
    u.state = "panic"; u.stateT = W.rand(5, 9); u.fear = [fx, fy]; u.path = null;
  }
  /* Gunfire and bangs: the crowd scatters, the guards and the crew react to
   * whoever made it. */
  noise(x, y, r, src) {
    for (const u of this.units) {
      if (!u.alive || u.follower || u === src || u.inCar) continue;
      const d = W.dist(x, y, u.x, u.y);
      if (d > r && !(u.elite && d <= r * 2)) continue;
      if (u.kind === "civ") this.panic(u, x, y);
      else if (u.kind === "sec" && src && src.faction && src.faction !== "sec" && src.faction !== "civ" && src.alive) {
        if (d < 4 || W.canSee(this, u, src, 11)) W.secCall(this, u, src.faction === "player" ? "player" : "crew");
      } else if (u.faction === "crew" && src && src.faction === "player" && !this.attract) {
        if (!u.hostile && (d < 6 || W.canSee(this, u, src, 12))) { u.hostile = true; W.drawBest(u); u.seen = [src.x, src.y]; this.raiseAlarm(u, src); }
      }
    }
    // a fight in the street: drivers nearby floor it, and stop for nobody
    if (src && (src.faction === "player" || src.faction === "crew" || src.faction === "sec") && !this.attract) {
      for (const c of this.cars) if (!c.parked && !c.train && !c.escape && !c.dead && W.dist(x, y, c.x, c.y) < r) c.panicT = W.rand(6, 10);
    }
  }
  raiseAlarm(by, seen) {
    if (this.attract) return;
    this.alarmAt = [seen ? seen.x : by.x, seen ? seen.y : by.y];
    if (this.alarm) return;
    this.alarm = true;
    this.msg(`${this.names.crew} has made you. They're on the radio.`, "#ff5266");
    W.audio.play("alarm", 0.8);
    for (const u of this.units) if (u.alive && u.faction === "crew" && !u.follower && W.dist(u.x, u.y, this.alarmAt[0], this.alarmAt[1]) < 20) {
      if (!u.hostile && u.kind !== "target") { u.hostile = true; W.drawBest(u); }
    }
  }
  explode(x, y, r, dmg, src) {
    this.booms.push({ x, y, t: 0, life: 0.6 });
    this.decals.push({ x, y, r: r * 0.6 });
    if (this.decals.length > 40) this.decals.shift();
    for (let i = 0; i < 26; i++) this.particles.push({ x, y, z: W.rand(2, 10), vx: W.rand(-4, 4), vy: W.rand(-4, 4), vz: W.rand(20, 70), color: W.pick(["#ffb000", "#ff5266", "#ffe9a8", "#ff8a3c"]), size: 2, t: 0, life: W.rand(0.4, 0.9) });
    W.audio.at("boom", x, y, 1.2);
    for (const u of this.units) {
      if (!u.alive || u.inCar) continue;
      const d = W.dist(x, y, u.x, u.y);
      if (d < r) this.damage(u, dmg * (1 - d / r) + 1, src);
    }
    for (const c of this.cars) if (!c.dead && W.dist(x, y, c.x, c.y) < r + 0.6 && !c.boomed) this.damageCar(c, 8, src);
    this.noise(x, y, 14, src);
  }

  /* ---- the BanHammer ----
   * A Watcher paints a spot they can see with the laser; a few seconds later
   * the orbital platform clears it. Everything in the circle dies, ours too,
   * and the cars in it go up. One strike used per call. */
  canStrike(a, x, y) {
    const def = W.WEAPONS.banhammer;
    if (!a || !a.alive || a.out || !a.weapons.some(w => w.type === "banhammer" && (w.ammo == null || w.ammo > 0))) return "no strike to call";
    if (W.dist(a.x, a.y, x, y) > def.range) return "out of range";
    if (!this.map.los(a.x, a.y, x, y)) return "no line of sight";
    return "";
  }
  callStrike(a, x, y) {
    if (this.canStrike(a, x, y)) return false;
    const def = W.WEAPONS.banhammer, k = a.weapons.findIndex(w => w.type === "banhammer" && (w.ammo == null || w.ammo > 0)), w = a.weapons[k];
    w.ammo = (w.ammo ?? 1) - 1;
    if (w.ammo <= 0) { a.weapons.splice(k, 1); if (a.cur === k) a.cur = -1; else if (a.cur > k) a.cur--; }
    this.strikes.push({ x, y, by: a, t: 0, delay: def.strike.delay, r: def.strike.r, dmg: def.strike.dmg });
    this.msg(`${a.name}: target painted. Strike in ${def.strike.delay} seconds. Clear the circle.`, "#ff5266");
    W.audio.play("alarm", 0.6);
    return true;
  }
  updateStrikes(dt) {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t += dt;
      if (s.t < s.delay) continue;
      this.strikes.splice(i, 1);
      this.columns.push({ x: s.x, y: s.y, r: s.r, t: 0, life: 0.9 });
      this.explode(s.x, s.y, s.r, s.dmg, s.by);
      for (const c of this.cars) if (!c.dead && W.dist(s.x, s.y, c.x, c.y) < s.r + 0.6) this.damageCar(c, 200, s.by);
      for (let k = 0; k < 6; k++) { const a = Math.random() * Math.PI * 2, d = Math.random() * s.r * 0.8; this.booms.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, t: -Math.random() * 0.2, life: 0.8 }); }
      this.decals.push({ x: s.x, y: s.y, r: s.r * 0.9 });
      W.audio.play("boom", 1.6);
      this.msg("The BanHammer comes down.", "#ffb000");
    }
  }

  /* ---- traffic ---- */
  spawnTraffic() {
    // cars parked in lots and bays: they never move, but they burn
    for (const p of this.map.parked) {
      this.cars.push({ isCar: true, id: "p" + this.cars.length, parked: true, axis: p.axis, dir: p.dir || 1, x: p.x, y: p.y, z: p.z || 0,
        len: 1.9, wid: 0.95, speed: 0, hp: 12, maxHp: 12, color: p.color || W.pick(["#4a5a7a", "#7a2a36", "#2a6a5a", "#8a8a96", "#3a3a48", "#6a5a3a", "#2a4a8a"]), alive: true });
    }
    for (const lane of this.map.lanes) {
      const n = lane.cars ?? 2;
      const span = lane.to - lane.from;
      for (let i = 0; i < n; i++) {
        const s = lane.from + span * ((i + Math.random() * 0.5) / n);
        if (lane.train) {
          // a train: its carriages nose to tail, moved as one by the lead (cars[0])
          const T = { lane, cars: [], holdT: 0, wait: 0, lastStop: null };
          for (let k = 0; k < (lane.carriages || 6); k++) T.cars.push(this.addCar(lane, s - lane.dir * k * W.CARRIAGE, { train: true, group: T, k, len: 3.9, wid: 1.3, maxSpeed: 6, hp: 60, maxHp: 60, color: "#9aa4b8" }));
          this.trains.push(T);
        } else this.addCar(lane, s);
      }
    }
  }
  addCar(lane, s, o = {}) {
    const ax = lane.axis === "x";
    const car = Object.assign({
      isCar: true, id: "c" + Math.random().toString(36).slice(2, 7), lane, axis: lane.axis, dir: lane.dir,
      x: ax ? s : lane.at, y: ax ? lane.at : s,
      len: 1.9, wid: 0.95, speed: 0, maxSpeed: W.rand(3.2, 4.6), hp: 12, maxHp: 12,
      color: W.pick(["#4a5a7a", "#7a2a36", "#2a6a5a", "#8a8a96", "#3a3a48", "#6a5a3a", "#2a4a8a", "#c8b040"]),
      alive: true,
    }, o);
    if (car.color === "#c8b040" && !car.train) car.taxi = true;
    this.cars.push(car);
    return car;
  }
  damageCar(car, dmg, src) {
    if (car.dead) return;
    car.hp -= dmg;
    this.spark(car.x, car.y, 6, "#ffd27a", 2);
    if (src && src.faction === "player") this.noise(car.x, car.y, 6, src);
    if (car.hp <= 0) {
      car.dead = true; car.alive = false; car.boomed = true; car.speed = 0;
      if (car.passenger && car.passenger.alive) {
        const p = car.passenger;
        p.inCar = false; p.x = car.x; p.y = car.y;
        this.kill(p, src);
      }
      this.explode(car.x, car.y, 2.4, 14, src);
    }
  }
  boardEscape(u, car) {
    u.inCar = true; u.path = null;
    car.passenger = u; car.escape = true; car.parked = false; car.startT = 2.2;
    W.audio.at("engine", car.x, car.y);
    this.msg(`${this.names.target} is in the car. Stop it!`, "#ffb000");
  }
  /* A car drives its lane. It keeps its distance, brakes for people and red
   * lights, and gives way to trains. A getaway car, or a driver panicking
   * away from a fight, stops for nobody on foot. Train carriages only smoke
   * here: their train moves them (updateTrain). */
  updateCar(car, dt) {
    if (car.dead) {
      if (Math.random() < dt * 6) this.smoke.push({ x: car.x + W.rand(-0.3, 0.3), y: car.y + W.rand(-0.3, 0.3), z: 8, t: 0, life: 2.2 });
      return;
    }
    if (car.hp < car.maxHp * 0.5 && Math.random() < dt * 4) this.smoke.push({ x: car.x, y: car.y, z: 8, t: 0, life: 1.4 });
    if (car.parked || car.train) return;
    if (car.startT > 0) { car.startT -= dt; if (Math.random() < dt * 10) this.smoke.push({ x: car.x - car.dir * 1.1, y: car.y, z: 2, t: 0, life: 0.8 }); return; }
    if (car.panicT > 0) car.panicT -= dt;
    const reckless = car.escape || car.panicT > 0;
    const ax = car.axis === "x", dir = car.dir;
    const s = ax ? car.x : car.y, lat = ax ? car.y : car.x;
    let want = car.escape ? 5.5 : reckless ? Math.max(5.5, car.maxSpeed * 1.4) : car.maxSpeed;
    // whatever is in front: the car ahead in the lane, or anything crossing it
    const front = s + dir * car.len / 2;
    let blocked = false;
    for (const o of this.cars) {
      if (o === car || o.dead && !o.boomed) continue;
      if (o.axis === car.axis) {
        const os = ax ? o.x : o.y, ol = ax ? o.y : o.x;
        if (Math.abs(ol - lat) > 0.75) continue;
        const ahead = (os - s) * dir;
        if (ahead <= 0) continue;
        const gap = ahead - (car.len + o.len) / 2;
        if (gap < 2.4) { want = Math.min(want, Math.max(0, gap - 0.5) * 2.2); if (o.parked || o.dead) blocked = true; }
      } else {
        // crossing traffic: is its body inside the next stretch of our lane?
        const os = ax ? o.x : o.y, ol = ax ? o.y : o.x;
        const halfAlong = o.wid / 2, halfAcross = o.len / 2;
        if (Math.abs(ol - lat) > halfAcross + 0.6) continue;
        const ahead = (os - front) * dir;
        if (ahead > -halfAlong && ahead < 2.6 + halfAlong) want = Math.min(want, Math.max(0, ahead - halfAlong - 0.4) * 2);
      }
    }
    // a level crossing: nobody, not even a getaway driver, races a train
    const L = car.lane;
    for (const T of this.trains) {
      const I = T.info;
      if (!I || I.ax === ax || I.lat < L.from || I.lat > L.to) continue;
      const reach = I.half + 1;
      const toBand = ((I.lat - dir * reach) - front) * dir;    // our nose to the near side of its track
      if (toBand < 0 || toBand > 9) continue;                    // already on it (clear it), or far off
      const clear = (toBand + reach * 2 + car.len) / Math.max(car.speed, 2.5) + 1.5;
      if (W.etaAt(I, lat) < clear) want = Math.min(want, Math.max(0, toBand - 0.3) * 2.5);
    }
    // people in the road (not on a bridge overhead). A driver brakes for
    // anyone in front, though now and then one is looking the other way; a
    // runner brakes for nobody. The nose strikes, the sides only bump.
    if (car.distractT > 0) car.distractT -= dt;
    for (const u of this.units) {
      if (!u.alive || u.inCar || (u.z || 0) > 6) continue;
      const us = ax ? u.x : u.y, ul = ax ? u.y : u.x;
      if (Math.abs(ul - lat) > car.wid / 2 + 0.3) continue;
      const d = (us - front) * dir;   // + ahead of the nose, - back along the body
      if (d > -0.6 && d < 0.3) { if (car.speed > 1.5 && !u.hitBy) this.strike(car, u); }
      else if (d <= -0.6 && d > -car.len - 0.2) { if (car.speed > 0.5 && !u.hitBy) this.bump(car, u); }
      if (!reckless && d > -car.len / 2 && d < 1.3) {
        if (u.seenBy !== car.id) { u.seenBy = car.id; if (Math.random() < 0.06) car.distractT = 0.8; }
        if (!(car.distractT > 0)) want = 0;
      }
    }
    // the lights
    if (!reckless) {
      for (const j of this.map.junctions) {
        const lo = ax ? j.y0 : j.x0, hi = ax ? j.y1 : j.x1;
        if (lat < lo || lat > hi) continue;
        const entry = ax ? (dir > 0 ? j.x0 : j.x1) : (dir > 0 ? j.y0 : j.y1);
        const ahead = (entry - front) * dir;
        if (ahead >= -0.05 && ahead < 2.2 && !this.light[car.axis]) want = Math.min(want, Math.max(0, ahead - 0.6) * 2.5);
      }
    }
    // stuck behind something that will not move (a squad car, a wreck): turn round, when the other lane is clear
    if (blocked && car.speed < 0.1 && !car.escape) {
      car.blockedT = (car.blockedT || 0) + dt;
      if (car.blockedT > 1.5) {
        const O = this.map.lanes.find(o => !o.train && o.axis === car.axis && o.dir === -dir && Math.abs(o.at - lat) <= 2.5 && s > o.from && s < o.to);
        if (O && !this.cars.some(c => c !== car && c.lane === O && Math.abs((ax ? c.x : c.y) - s) < 3.5)) {
          car.lane = O; car.dir = O.dir; car.blockedT = 0;
          if (ax) car.y = O.at; else car.x = O.at;
          return;
        }
      }
    } else car.blockedT = 0;
    car.speed += W.clamp(want - car.speed, -14 * dt, (reckless ? 7 : 4) * dt);
    if (car.speed < 0.02) car.speed = 0;
    const ns = s + dir * car.speed * dt;
    if (ax) car.x = ns; else car.y = ns;
    if ((dir > 0 && ns > L.to) || (dir < 0 && ns < L.from)) {
      if (car.escape) { car.gone = true; return; }
      // round again from the start of the lane, if it is clear
      const start = dir > 0 ? L.from : L.to;
      const clear = !this.cars.some(o => o !== car && o.lane === L && Math.abs((ax ? o.x : o.y) - start) < 3);
      if (clear) { if (ax) car.x = start; else car.y = start; car.maxSpeed = W.rand(3.2, 4.6); car.panicT = 0; }
      else car.speed = 0;
    }
  }
  /* Struck by a car's nose. Speeding, it kills, and the car takes a dent;
   * slower, it knocks them down and hurts. A getaway car or a panicked driver
   * is the fight's doing, and counts; anything else is an accident. */
  strike(car, u) {
    const fight = car.escape || car.panicT > 0;
    const src = { faction: car.escape ? "crew" : "none", accident: !fight, x: car.x, y: car.y };
    u.hitBy = car.id;
    if (car.speed > W.SPEEDING) { this.damage(u, 1e6, src); this.damageCar(car, 1, null); }
    else { this.damage(u, 1.5, src); this.knock(car, u, 0.8, 2.2, true); }
  }
  /* Walked into a moving car's side: thrown back and dazed, no worse. */
  bump(car, u) { u.hitBy = car.id; this.knock(car, u, 0.7, 1.2, false); }
  /* Out of the car's lane, to whichever side they were on, and stunned a moment. */
  knock(car, u, dist, stun, down) {
    const ax = car.axis === "x", off = (ax ? u.y : u.x) - (ax ? car.y : car.x), k = off >= 0 ? dist : -dist;
    for (const sg of [k, -k]) {
      const x = ax ? u.x : u.x + sg, y = ax ? u.y + sg : u.y;
      if (this.map.walkable(x, y)) { u.x = x; u.y = y; break; }
    }
    if (!u.alive) return;
    u.stunT = Math.max(u.stunT || 0, stun);
    if (down) { u.downT = stun; u.deadSide = off >= 0 ? 1 : -1; }
  }

  /* A train: the lead carriage drives and the rest ride behind it, nose to
   * tail. It stops at its stations, runs off the end of the map, and waits
   * out of sight a good while before it comes round again. It stops for
   * nobody, and hurts nobody: its push field (trainPush) moves everyone off
   * the line ahead of it. */
  updateTrain(T, dt) {
    const L = T.lane, dir = L.dir, ax = L.axis === "x", lead = T.cars[0];
    if (T.cars.some(c => c.dead)) { for (const c of T.cars) c.speed = 0; return; }   // a wreck blocks the line
    const s = ax ? lead.x : lead.y, front = s + dir * lead.len / 2;
    let want = lead.maxSpeed;
    if (T.holdT > 0) { T.holdT -= dt; want = 0; }
    else if (T.wait > 0) { T.wait -= dt; want = 0; }
    else for (const st of L.stops || []) {
      if (T.lastStop === st) continue;
      const ahead = (st - front) * dir;
      if (ahead > -0.2 && ahead < 0.15) { T.wait = 5; T.lastStop = st; want = 0; }
      else if (ahead > 0 && ahead < 4) want = Math.min(want, 1 + ahead * 1.5);
    }
    // another train ahead on the same track
    for (const O of this.trains) {
      if (O === T || O.lane !== L) continue;
      const tail = O.cars[O.cars.length - 1], gap = ((ax ? tail.x : tail.y) - dir * tail.len / 2 - front) * dir;
      if (gap > 0 && gap < 8) want = Math.min(want, Math.max(0, gap - 1.5) * 1.5);
    }
    lead.speed += W.clamp(want - lead.speed, -14 * dt, 4 * dt);
    if (lead.speed < 0.02) lead.speed = 0;
    let ns = s + dir * lead.speed * dt;
    // the last carriage off the end: back to the start, out of sight, and wait
    const last = ns - dir * (T.cars.length - 1) * W.CARRIAGE;
    if ((dir > 0 && last - lead.len / 2 > L.to) || (dir < 0 && last + lead.len / 2 < L.from)) {
      ns = dir > 0 ? L.from : L.to;
      lead.speed = 0; T.lastStop = null; T.holdT = W.rand(45, 75);
    }
    T.cars.forEach((c, k) => { const a = ns - dir * k * W.CARRIAGE; if (ax) c.x = a; else c.y = a; c.speed = lead.speed; });
  }
  /* Where a train is and when it can be somewhere: what walkers and drivers
   * look at before they cross its line. */
  trainInfo(T) {
    const L = T.lane, dir = L.dir, ax = L.axis === "x", lead = T.cars[0], last = T.cars[T.cars.length - 1];
    const wreck = T.cars.some(c => c.dead);
    return {
      ax, dir, lat: L.at, half: lead.wid / 2,
      nose: (ax ? lead.x : lead.y) + dir * lead.len / 2, tail: (ax ? last.x : last.y) - dir * last.len / 2,
      delay: wreck ? Infinity : Math.max(T.holdT, T.wait), vmax: lead.maxSpeed, speed: wreck ? 0 : lead.speed,
    };
  }
  /* What is coming down the lines this tick: every train for everyone on
   * foot, and the cars that stop for nobody, which civilians also watch for. */
  scanTraffic() {
    for (const T of this.trains) T.info = this.trainInfo(T);
    this.threats = this.trains.map(T => T.info);
    this.civThreats = this.threats.concat(this.cars.filter(c => !c.dead && !c.train && !c.parked && (c.escape || c.panicT > 0)).map(c => {
      const ax = c.axis === "x", s = ax ? c.x : c.y;
      return { ax, dir: c.dir, lat: ax ? c.y : c.x, half: c.wid / 2, nose: s + c.dir * c.len / 2, tail: s - c.dir * c.len / 2,
        delay: Math.max(0, c.startT || 0), vmax: Math.max(c.speed, 5.5) };
    }));
  }
  /* The push field: a wedge out in front of a moving train. Anyone on foot
   * inside it steps off the line to whichever side is nearer (the other side
   * if that one is walled off), and does not try to step back in. A squad
   * crossing as a train comes may end up split either side of it. */
  trainPush(dt) {
    const m = this.map;
    for (const T of this.trains) {
      const I = T.info;
      for (const u of this.units) {
        if (!u.alive || u.inCar || (u.z || 0) > 6) continue;
        const wide = W.pushWidth(I, u.x, u.y);
        if (!wide) continue;
        const off = (I.ax ? u.y : u.x) - I.lat, pref = off >= 0 ? 1 : -1;
        const step = Math.max(W.speedOf(u), 2.6) * dt;
        let moved = false;
        for (const pass of [0, 1]) for (const sg of [pref, -pref]) {
          if (moved) break;
          const nx = I.ax ? u.x : u.x + sg * step, ny = I.ax ? u.y + sg * step : u.y;
          const ex = I.ax ? u.x : I.lat + sg * (wide + 0.15), ey = I.ax ? I.lat + sg * (wide + 0.15) : u.y;
          // first look for a side with room to stand clear, then take any step at all
          if (m.walkable(nx, ny) && (pass || m.walkable(ex, ey))) {
            if (u.kind === "civ" && !(u.pushedT > 0) && Math.random() < 0.3) W.say(u, W.pick(W.LINES.panic), "#94a0c4", 1.2);
            u.x = nx; u.y = ny; u.dir = I.ax ? (sg > 0 ? Math.PI / 2 : -Math.PI / 2) : (sg > 0 ? 0 : Math.PI);
            u.moving = true; u.anim += step * 7; u.pushedT = 0.25;
            moved = true;
          }
        }
      }
    }
  }

  /* ---- the mission ----
   * The job done (the target dead), the squad still has to get out: to the
   * pickup at the drop point (or a PumaCity facility, where a district marks
   * one), or off any edge of the map. Until then it can pick over the dead.
   * Won when every Watcher still alive is out; lost if none of them make it. */
  objective(o) { o.state = "active"; this.objectives.push(o); return o; }
  startExfil(why, task) {
    this.phase = "exfil";
    // the boss is dead: some of the crew lose heart and run, the more so the smaller the outfit
    const mod = this.level.mod, threat = this.level.mission ? this.level.mission.threat : 3;
    const chance = W.BREAK[threat] ?? 0.4;
    let broke = 0;
    for (const u of this.units) {
      if (!u.alive || u.follower || u.faction !== "crew" || u.kind === "target" || !u.hostile) continue;
      if (Math.random() < chance) { u.broken = true; u.hostile = false; u.target = null; u.manual = null; u.cur = -1; u.weaponOut = false; u.path = null; broke++; }
    }
    if (broke) this.msg(`${this.names.crew}: ${broke > 3 ? "they're running" : "some of them are running"}.`, "#94a0c4");
    const m = this.map, pts = [];
    const drop = this.dropAt || this.startAt;
    if (drop) pts.push({ x: drop[0], y: drop[1], name: "the pickup" });
    for (const f of (m.points && m.points.facility) || []) pts.push({ x: f.x, y: f.y, name: f.name || "a PumaCity facility" });
    this.exfilPoints = pts.map(p => { const q = m.nearestWalkable(p.x, p.y, 4) || [p.x, p.y]; return { x: q[0], y: q[1], name: p.name }; });
    this.stats.out = 0;
    this.objective({ type: "exfil", text: task || "Get out: to the pickup at the drop point, or off any edge of the map" });
    this.msg(`${why} ${task ? task + "." : "Get out: the pickup at the drop point, or off any edge of the map. Take what the dead dropped."}`, "#4ade6a");
    W.audio.play("order");
  }
  /* is (x, y) somewhere a Watcher can leave from? */
  atExit(x, y) {
    const m = this.map;
    if (x < W.EDGE || y < W.EDGE || x > m.w - W.EDGE || y > m.h - W.EDGE) return true;
    return (this.exfilPoints || []).some(p => W.dist(x, y, p.x, p.y) < 1.6);
  }
  /* the nearest way out for u that a path reaches: a pickup, or the nearest point of each map edge */
  exitFor(u) {
    const m = this.map, c = (this.exfilPoints || []).map(p => [p.x, p.y]);
    // each edge: the walkable spot in its band nearest to straight across from u
    const band = (side) => {
      for (let k = 0; k < Math.max(m.w, m.h); k++) for (const sg of [1, -1]) for (let dpt = 0.5; dpt < W.EDGE; dpt += 1) {
        const along = (side < 2 ? u.y : u.x) + sg * k;
        const x = side === 0 ? dpt : side === 1 ? m.w - dpt : along, y = side === 0 || side === 1 ? along : side === 2 ? dpt : m.h - dpt;
        if (m.walkable(x, y)) return [x, y];
      }
      return null;
    };
    for (let side = 0; side < 4; side++) { const q = band(side); if (q) c.push(q); }
    c.sort((a, b) => W.dist(u.x, u.y, a[0], a[1]) - W.dist(u.x, u.y, b[0], b[1]));
    for (const p of c) { const path = m.path(u.x, u.y, p[0], p[1]); if (path) return p; }
    return null;
  }
  checkMission(dt) {
    if (this.attract || this.status !== "play") return;
    if (this.phase === "exfil") {
      const S = this.subjectUnit;
      if (S && S.alive && !S.out && S.follower && (this.atExit(S.x, S.y) || this.agents.some(a => a.out && W.dist(a.x, a.y, S.x, S.y) < 3))) {
        S.out = true; S.inCar = true; S.path = null; this.msg(`${S.name} is out.`, "#4ade6a");
      }
      if (S && !S.alive) { this.end("lost", `${S.name} is dead.`); return; }
      if (this.carrier && !this.carrier.alive) { this.end("lost", `The data died with ${this.carrier.name}.`); return; }
      if (this.terminal && this.terminal.safe && !this.goodsOut && !this.agents.some(a => a.alive && !a.out)) { this.end("lost", "The goods never left."); return; }
      for (const a of this.agents) {
        if (!a.alive || a.out || !this.atExit(a.x, a.y)) continue;
        a.out = true; a.inCar = true; a.path = null; a.target = null; a.manual = null;
        this.selected.delete(a); this.stats.out++;
        // the goods are handed over at the way out: they are the job's, not the Watcher's kit
        const goods = a.weapons.some(w => w.type === "goods");
        if (goods) { this.goodsOut = true; a.weapons = a.weapons.filter(w => w.type !== "goods"); a.cur = -1; a.weaponOut = false; }
        this.msg(`${a.name} is out${a === this.carrier ? ", with the data" : goods ? ", with the goods" : ""}.`, "#4ade6a");
        // the subject, right behind them, comes too
        if (S && S.alive && !S.out && S.follower && W.dist(a.x, a.y, S.x, S.y) < 3) { S.out = true; S.inCar = true; S.path = null; this.msg(`${S.name} is out.`, "#4ade6a"); }
        if (!this.selected.size) { const next = this.agents.find(b => b.alive && !b.out); if (next) this.selected.add(next); }
      }
      for (const o of this.objectives) if (o.state === "active" && o.type === "civcap" && this.stats.civ > o.n) { o.state = "failed"; this.msg(`Bonus lost: ${o.text}.`, "#ffb000"); }
      for (const o of this.objectives) if (o.state === "active" && o.type === "recruit" && this.stats.recruited >= o.n) { o.state = "done"; this.msg(`Bonus: ${o.text}.`, "#4ade6a"); }
      if (!this.agents.some(a => a.alive && !a.out)) {
        // the squad is out and the subject a few steps behind: they finish the walk on their own
        if (S && S.alive && S.follower && !S.out) {
          S.aloneT = (S.aloneT || 0) + dt;
          if (S.aloneT > 60) { this.end("lost", `The squad got out, and left ${S.name} behind.`); return; }
          if (!S.path) { const p = this.exitFor(S); if (p) W.goTo(this, S, p[0], p[1]); else this.end("lost", `The squad got out, and left ${S.name} behind.`); }
          return;
        }
        if (S) S.out ? this.end("won", `${S.name} is out, and talking.`) : this.end("lost", `The squad got out, and left ${S.name} behind.`);
        else if (this.carrier) this.carrier.out ? this.end("won", "The data is out.") : this.end("lost", "The data never left.");
        else if (this.terminal && this.terminal.safe) this.goodsOut ? this.end("won", "The goods are out.") : this.end("lost", "The goods never left.");
        else if (this.stash || this.siege) this.stats.out ? this.end("won", this.stash ? "The operation is broken, and the squad is out." : `${this.siege.name} is taken, and the squad is out.`) : this.end("lost", "The job was done, but nobody got out.");
        else if (this.stats.out) this.end("won", `${this.names.target} is dead, and the squad is out.`);
        else this.end("lost", `${this.names.target} is dead, but nobody got out.`);
      }
      return;
    }
    // a persuade job: talk them round; lose them, and it is over
    const S = this.subjectUnit;
    if (S) {
      if (!S.alive) { this.end("lost", `${S.name} is dead.`); return; }
      if (this.subjectGone) { this.end("lost", `${S.name} got away.`); return; }
      if (S.follower) {
        for (const o of this.objectives) if (o.type === "persuade" && o.state === "active") { o.state = "done"; this.msg(`Objective complete: ${o.text}.`, "#4ade6a"); }
        this.startExfil(`${S.name} is with you.`, `Walk ${S.name} out: to the pickup at the drop point, or off any edge of the map`);
        return;
      }
    }
    // an intel job: a Watcher stands at the terminal while it copies; whoever finishes carries the data
    // a crackdown: the stash burned, and most of the operation's crew down or run off
    const ST = this.stash;
    if (ST) {
      if (ST.dead && !this.stashGone) {
        this.stashGone = true;
        for (const o of this.objectives) if (o.type === "crackdown" && o.state === "active") o.stash = true;
        this.msg("The stash is burning.", "#ffb000");
        // and some of them have had enough
        const chance = W.BREAK[this.level.mission ? this.level.mission.threat : 3] ?? 0.4;
        for (const u of this.units) if (u.alive && u.op && u.faction === "crew" && !u.follower && Math.random() < chance * 0.6) { u.broken = true; u.hostile = false; u.target = null; u.cur = -1; u.weaponOut = false; u.path = null; }
      }
      const op = this.units.filter(u => u.op && u.faction !== "player"), down = op.filter(u => !u.alive || u.broken).length;
      if (this.stashGone && down >= Math.ceil(op.length * 0.7)) {
        for (const o of this.objectives) if (o.type === "crackdown" && o.state === "active") { o.state = "done"; this.msg(`Objective complete: ${o.text}.`, "#4ade6a"); }
        for (const u of this.units) if (u.alive && u.op && u.faction === "crew" && !u.follower) { u.broken = true; u.hostile = false; u.target = null; u.cur = -1; u.weaponOut = false; }
        this.startExfil("The operation is broken.");
        return;
      }
    }
    // a siege: every defender down
    if (this.siege) {
      const left = this.units.filter(u => u.defender && u.alive && u.faction !== "player").length;
      this.siege.left = left;
      if (!left) {
        for (const o of this.objectives) if (o.type === "siege" && o.state === "active") { o.state = "done"; this.msg(`Objective complete: ${o.text}.`, "#4ade6a"); }
        this.startExfil(`${this.siege.name} is taken.`);
        return;
      }
    }
    const D = this.terminal;
    if (D && !D.done) {
      const at = this.agents.find(a => a.alive && !a.out && W.dist(a.x, a.y, D.x, D.y) < 1.4);
      if (at) {
        if (!D.t) this.msg(D.safe ? `${at.name}: on the safe.` : `${at.name}: on the terminal. Copying.`, "#54f2ff");
        D.t += dt; D.by = at;
        if (D.t >= D.need && D.safe) {
          // the goods: a case, carried like anything else (and dropped like it)
          D.done = true; W.giveWeapon(at, "goods");
          for (const o of this.objectives) if (o.type === "job" && o.state === "active") { o.state = "done"; this.msg(`Objective complete: ${o.text}.`, "#4ade6a"); }
          W.audio.play("order");
          this.startExfil(`${at.name} has the goods.`, "Get the goods out: to the pickup at the drop point, or off any edge of the map");
          return;
        }
        if (D.t >= D.need) {
          D.done = true; this.carrier = at; at.carries = "data";
          for (const o of this.objectives) if (o.type === "intel" && o.state === "active") { o.state = "done"; this.msg(`Objective complete: ${o.text}.`, "#4ade6a"); }
          W.audio.play("order");
          this.startExfil(`${at.name} has the data.`, `Get the data out with ${at.name}: to the pickup at the drop point, or off any edge of the map`);
          return;
        }
      }
    }
    if (!this.agents.some(u => u.alive)) { this.end("lost", "Every Watcher is down."); return; }
    if (S || D || ST || this.siege) {
      for (const o of this.objectives) {
        if (o.state !== "active") continue;
        if (o.type === "recruit" && this.stats.recruited >= o.n) { o.state = "done"; this.msg(`Bonus: ${o.text}.`, "#4ade6a"); }
        if (o.type === "civcap" && this.stats.civ > o.n) { o.state = "failed"; this.msg(`Bonus lost: ${o.text}.`, "#ffb000"); }
      }
      return;
    }
    const T = this.targetUnit;
    for (const o of this.objectives) {
      if (o.state !== "active") continue;
      if (o.type === "kill" && !o.unit.alive) { o.state = "done"; this.msg(`Objective complete: ${o.text}.`, "#4ade6a"); }
      if (o.type === "recruit" && this.stats.recruited >= o.n) { o.state = "done"; this.msg(`Bonus: ${o.text}.`, "#4ade6a"); }
      if (o.type === "civcap" && this.stats.civ > o.n) { o.state = "failed"; this.msg(`Bonus lost: ${o.text}.`, "#ffb000"); }
    }
    if (T && !T.alive && this.status === "play") this.startExfil(`${this.names.target} is dead.`);
    else if (!this.units.some(u => u.isAgent && u.alive)) this.end("lost", "Every Watcher is down.");
    else if ((this.escapeCar && this.escapeCar.gone) || this.escaped) this.end("lost", `${this.names.target} got away.`);
  }
  end(status, reason) {
    this.status = status; this.endReason = reason; this.endT = 0;
    // for the area's control (the campaign's business): citizens talked round and still with us, and the civilians the fight killed
    this.stats.persuaded = this.units.filter(u => u.alive && u.persuadedCiv && u.follower).length;
    for (const o of this.objectives) if (o.state === "active") o.state = o.type === "civcap" && status === "won" ? "done" : o.optional ? "failed" : (status === "won" ? "done" : "failed");
    this.msg(reason, status === "won" ? "#4ade6a" : "#ff5266");
    W.audio.play(status === "won" ? "win" : "lose");
  }

  /* ---- the tick ---- */
  update(dt) {
    this.time += dt;
    if (this.status === "play") this.stats.time += dt;
    else this.endT += dt;
    // traffic lights: 8s each way, 2.5s of all-red between so a wide crossing clears
    const ph = this.time % 21;
    this.light.x = ph < 8; this.light.y = ph >= 10.5 && ph < 18.5;
    W.lightPhase = this.light;
    for (const u of this.units) W.updateUnit(this, u, dt);
    W.separate(this, dt);
    for (const c of this.cars) this.updateCar(c, dt);
    for (const T of this.trains) this.updateTrain(T, dt);
    this.scanTraffic();
    this.trainPush(dt);
    // the escape car carries its passenger
    const ec = this.escapeCar;
    if (ec && ec.passenger) { ec.passenger.x = ec.x; ec.passenger.y = ec.y; }
    for (const u of this.units) if (u.hitBy && !this.cars.some(c => c.id === u.hitBy && W.dist(c.x, c.y, u.x, u.y) < 2)) u.hitBy = null;
    // effects age
    const age = (arr) => { for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt; if (arr[i].t >= arr[i].life) arr.splice(i, 1); } };
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 120 * dt; if (p.z < 0) { p.z = 0; p.vx *= 0.5; p.vy *= 0.5; p.vz = 0; } }
    for (const s of this.smoke) { s.z += 14 * dt; s.x += 0.2 * dt; }
    this.updateStrikes(dt);
    age(this.tracers); age(this.particles); age(this.booms); age(this.smoke); age(this.pings); age(this.columns);
    for (const m of this.msgs) m.t -= dt;
    this.checkMission(dt);
  }
};
