/* A mission in progress: the map, everyone in it, the traffic, the effects,
 * and the rules for winning and losing. The screen drives it with update(dt)
 * and draws it with the renderer; nothing in here touches the DOM. */
"use strict";

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
    this.msgs = [];
    this.time = 0; this.cam = { x: 0, y: 0 };
    this.selected = new Set();
    this.alarm = false; this.alarmAt = null;
    this.status = "play"; this.endT = 0; this.endReason = "";
    this.stats = { shots: 0, crew: 0, sec: 0, civ: 0, lost: 0, recruited: 0, time: 0 };
    this.objectives = [];
    this.light = { x: true, y: false };
    this.spawnTraffic();
    for (const l of m.loot) this.items.push(Object.assign({}, l));
    level.populate(this, opts);
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
        if (src.faction === "player") { if (!u.hostile) { u.hostile = true; W.drawBest(u); } u.seen = [src.x, src.y]; this.raiseAlarm(u, src); }
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
    const guns = u.isAgent ? u.weapons.filter(w => W.WEAPONS[w.type].gun && w.type !== "pistol") : u.weapons.filter(w => W.WEAPONS[w.type].gun).slice(0, 1);
    guns.forEach((w, i) => this.items.push({ type: w.type, ammo: w.ammo, x: u.x + (i ? W.rand(-0.3, 0.3) : 0), y: u.y + (i ? W.rand(-0.3, 0.3) : 0) }));
    if (src && src.isAgent && !u.isAgent) src.kills = (src.kills || 0) + 1;
    if (u.isAgent) { this.stats.lost++; this.msg(`${u.name} is down.`, "#ff5266"); }
    else if (u.kind === "civ" && !u.follower) this.stats.civ++;
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
          // a train: three carriages nose to tail
          for (let k = 0; k < 3; k++) this.addCar(lane, s - lane.dir * k * 4.1, { train: true, len: 3.9, wid: 1.3, maxSpeed: 6, hp: 60, maxHp: 60, color: "#9aa4b8", wait: 0 });
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
  /* the leading carriage of the train this one belongs to */
  leadOf(car) {
    let lead = car;
    for (const o of this.cars) if (o.train && o.lane === car.lane && (o.axis === "x" ? o.x - lead.x : o.y - lead.y) * car.dir > 0 && (o.axis === "x" ? o.x - lead.x : o.y - lead.y) * car.dir < 4.6) lead = o;
    return lead === car ? car : this.leadOf(lead) === lead ? lead : this.leadOf(lead);
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
  updateCar(car, dt) {
    if (car.dead) {
      if (Math.random() < dt * 6) this.smoke.push({ x: car.x + W.rand(-0.3, 0.3), y: car.y + W.rand(-0.3, 0.3), z: 8, t: 0, life: 2.2 });
      return;
    }
    if (car.hp < car.maxHp * 0.5 && Math.random() < dt * 4) this.smoke.push({ x: car.x, y: car.y, z: 8, t: 0, life: 1.4 });
    if (car.parked) return;
    if (car.startT > 0) { car.startT -= dt; if (Math.random() < dt * 10) this.smoke.push({ x: car.x - car.dir * 1.1, y: car.y, z: 2, t: 0, life: 0.8 }); return; }
    const ax = car.axis === "x", dir = car.dir;
    const s = ax ? car.x : car.y, lat = ax ? car.y : car.x;
    let want = car.escape ? 5.5 : car.maxSpeed;
    // trains wait at their stops, a few seconds each
    if (car.train) {
      if (car.wait > 0) { car.wait -= dt; want = 0; }
      else for (const st of car.lane.stops || []) {
        const front = s + dir * car.len / 2, ahead = (st - front) * dir;
        if (ahead > -0.2 && ahead < 0.15 && car.lastStop !== st && car === this.leadOf(car)) { car.wait = 5; car.lastStop = st; want = 0; }
        if (ahead > 0 && ahead < 4 && car.lastStop !== st && car === this.leadOf(car)) want = Math.min(want, 1 + ahead * 1.5);
      }
    }
    // whatever is in front: the car ahead in the lane, or anything crossing it
    const front = s + dir * car.len / 2;
    for (const o of this.cars) {
      if (o === car || o.dead && !o.boomed) continue;
      if (car.train && !o.train) continue;          // trains do not stop for cars
      const oax = o.axis === "x";
      if (o.axis === car.axis) {
        const os = ax ? o.x : o.y, ol = ax ? o.y : o.x;
        if (Math.abs(ol - lat) > 0.75) continue;
        const ahead = (os - s) * dir;
        if (ahead <= 0) continue;
        const gap = ahead - (car.len + o.len) / 2;
        if (gap < 2.4) want = Math.min(want, Math.max(0, gap - 0.5) * 2.2);
      } else {
        // crossing traffic: is its body inside the next stretch of our lane?
        const os = ax ? o.x : o.y, ol = ax ? o.y : o.x;
        const halfAlong = o.wid / 2, halfAcross = o.len / 2;
        if (Math.abs(ol - lat) > halfAcross + 0.6) continue;
        const ahead = (os - front) * dir;
        if (ahead > -halfAlong && ahead < 2.6 + halfAlong) want = Math.min(want, Math.max(0, ahead - halfAlong - 0.4) * 2);
      }
    }
    // people in the road: stop for them, unless you are running; not people on a bridge overhead
    for (const u of this.units) {
      if (!u.alive || u.inCar || (u.z || 0) > 6) continue;
      const us = ax ? u.x : u.y, ul = ax ? u.y : u.x;
      if (Math.abs(ul - lat) > 0.75) continue;
      const ahead = (us - s) * dir;
      if (car.escape || car.train) {
        if (ahead > -car.len / 2 && ahead < car.len / 2 + 0.3 && car.speed > 1.5 && !u.hitBy) {
          u.hitBy = car.id; this.damage(u, car.train ? 30 : 9, { faction: car.train ? "none" : "crew", x: car.x, y: car.y });
          const k = W.rand(-0.9, 0.9);
          if (ax) u.y += k > 0 ? 0.9 : -0.9; else u.x += k > 0 ? 0.9 : -0.9;
        }
      } else if (ahead > 0 && ahead < car.len / 2 + 1.3) want = 0;
    }
    // the lights
    if (!car.escape && !car.train) {
      const front = s + dir * car.len / 2;
      for (const j of this.map.junctions) {
        const lo = ax ? j.y0 : j.x0, hi = ax ? j.y1 : j.x1;
        if (lat < lo || lat > hi) continue;
        const entry = ax ? (dir > 0 ? j.x0 : j.x1) : (dir > 0 ? j.y0 : j.y1);
        const ahead = (entry - front) * dir;
        if (ahead >= -0.05 && ahead < 2.2 && !this.light[car.axis]) want = Math.min(want, Math.max(0, ahead - 0.6) * 2.5);
      }
    }
    car.speed += W.clamp(want - car.speed, -14 * dt, (car.escape ? 7 : 4) * dt);
    if (car.speed < 0.02) car.speed = 0;
    const ns = s + dir * car.speed * dt;
    if (ax) car.x = ns; else car.y = ns;
    const L = car.lane;
    if ((dir > 0 && ns > L.to) || (dir < 0 && ns < L.from)) {
      if (car.escape) { car.gone = true; return; }
      if (car.train) { car.lastStop = null; }
      // round again from the start of the lane, if it is clear
      const start = dir > 0 ? L.from : L.to;
      const clear = !this.cars.some(o => o !== car && o.lane === L && Math.abs((ax ? o.x : o.y) - start) < 3);
      if (clear) { if (ax) car.x = start; else car.y = start; car.maxSpeed = W.rand(3.2, 4.6); }
      else car.speed = 0;
    }
  }

  /* ---- the mission ---- */
  objective(o) { o.state = "active"; this.objectives.push(o); return o; }
  checkMission(dt) {
    if (this.attract || this.status !== "play") return;
    const T = this.targetUnit;
    for (const o of this.objectives) {
      if (o.state !== "active") continue;
      if (o.type === "kill" && !o.unit.alive) { o.state = "done"; this.msg(`Objective complete: ${o.text}.`, "#4ade6a"); }
      if (o.type === "recruit" && this.stats.recruited >= o.n) { o.state = "done"; this.msg(`Bonus: ${o.text}.`, "#4ade6a"); }
      if (o.type === "civcap" && this.stats.civ > o.n) { o.state = "failed"; this.msg(`Bonus lost: ${o.text}.`, "#ffb000"); }
    }
    if (T && !T.alive && this.status === "play") this.end("won", `${this.names.target} is dead.`);
    else if (!this.units.some(u => u.isAgent && u.alive)) this.end("lost", "Every Watcher is down.");
    else if ((this.escapeCar && this.escapeCar.gone) || this.escaped) this.end("lost", `${this.names.target} got away.`);
  }
  end(status, reason) {
    this.status = status; this.endReason = reason; this.endT = 0;
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
    // the escape car carries its passenger
    const ec = this.escapeCar;
    if (ec && ec.passenger) { ec.passenger.x = ec.x; ec.passenger.y = ec.y; }
    for (const u of this.units) if (u.hitBy && !this.cars.some(c => c.id === u.hitBy && W.dist(c.x, c.y, u.x, u.y) < 2)) u.hitBy = null;
    // effects age
    const age = (arr) => { for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += dt; if (arr[i].t >= arr[i].life) arr.splice(i, 1); } };
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 120 * dt; if (p.z < 0) { p.z = 0; p.vx *= 0.5; p.vy *= 0.5; p.vz = 0; } }
    for (const s of this.smoke) { s.z += 14 * dt; s.x += 0.2 * dt; }
    age(this.tracers); age(this.particles); age(this.booms); age(this.smoke); age(this.pings);
    for (const m of this.msgs) m.t -= dt;
    this.checkMission(dt);
  }
};
