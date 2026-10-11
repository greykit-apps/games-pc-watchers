/* What a Watcher can carry. Ranges are in tiles, cooldowns in seconds,
 * damage in hit points. ammo: null never runs dry. `gun` is anything that
 * fires rounds, which is what makes Plaza Security nervous. */
"use strict";

W.WEAPONS = {
  pistol: {
    name: "Pistol", short: "PSTL", gun: true, dmg: 3, range: 7, cd: 0.5, acc: 0.78, pellets: 1,
    ammo: null, sound: "pistol", tracer: "#ffe9a8", desc: "Sidearm. Never runs dry."
  },
  uzi: {
    name: "Uzi", short: "UZI", gun: true, dmg: 1.7, range: 6.5, cd: 0.11, acc: 0.55, pellets: 1,
    ammo: 80, sound: "uzi", tracer: "#ffd27a", desc: "Hoses a crowd. Eats ammo."
  },
  shotgun: {
    name: "Shotgun", short: "SHTG", gun: true, dmg: 1.8, range: 4.6, cd: 0.95, acc: 0.62, pellets: 6, spread: 0.32,
    ammo: 24, sound: "shotgun", tracer: "#ffb36b", desc: "Six pellets. Close work."
  },
  minigun: {
    name: "Minigun", short: "MINI", gun: true, dmg: 1.6, range: 7, cd: 0.05, acc: 0.5, pellets: 1, heavy: true,
    ammo: 300, sound: "uzi", tracer: "#ffe08a", desc: "A wall of lead. Slows whoever carries it, unless their arms are modded."
  },
  longrange: {
    name: "Longwhisker", short: "LONG", gun: true, dmg: 7, range: 11.5, cd: 1.3, acc: 0.95, pellets: 1,
    ammo: 30, sound: "shotgun", tracer: "#e8f4ff", desc: "A rifle for the far side of the plaza."
  },
  laser: {
    name: "Laser", short: "LASR", gun: true, dmg: 13, range: 10, cd: 1.6, acc: 0.96, pellets: 1, beam: true,
    ammo: 12, sound: "laser", tracer: "#ff3048", desc: "One beam, one body. Few charges."
  },
  gauss: {
    name: "Gauss Gun", short: "GAUS", gun: true, dmg: 6, range: 9, cd: 2.0, acc: 0.9, pellets: 1, blast: { r: 2.2, dmg: 14 },
    ammo: 6, sound: "shotgun", tracer: "#b47dff", desc: "Explosive rounds. Mind the crowd."
  },
  purrsuader: {
    name: "Purrsuader", short: "PURR", gun: false, persuade: 1, range: 2.8, cd: 1.1, ammo: null,
    sound: "purr", desc: "Talks anyone into following you. The armed need a crowd behind you first."
  },
  purr2: {
    name: "Purrsuader II", short: "PUR2", gun: false, persuade: 2, range: 5.5, cd: 0.45, ammo: null,
    sound: "purr", desc: "Twice the reach, twice as quick. Talks round anyone who isn't already fighting you; the angry ones need half the crowd."
  },
  medikit: {
    name: "Medikit", short: "MEDI", gun: false, heal: true, ammo: 1, sound: "heal", desc: "Patches one Watcher to full. One use."
  },
  banhammer: {
    name: "BanHammer", short: "BANH", gun: false, strike: { r: 6, dmg: 999, delay: 4 }, range: 30, ammo: 1, sound: "boom",
    desc: "The orbital platform. X, then click a spot the Watcher can see: the laser paints it, and a few seconds later everything in the circle dies. One shot each."
  },
};

/* How many followers a Watcher's squad needs before the Purrsuader works on
 * someone armed (Syndicate's persuasion threshold). */
W.PERSUADE_NEED = { civ: 0, sec: 2, crew: 4, target: Infinity };

/* Draw a weapon's icon into a 2D context, centred at (cx, cy), about 28px wide. */
W.drawWeaponIcon = (c, type, cx, cy, col = "#dbe4fb") => {
  c.save();
  c.translate(cx, cy);
  c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 2;
  const R = (x, y, w, h) => c.fillRect(x, y, w, h);
  switch (type) {
    case "pistol": R(-9, -4, 15, 4); R(-9, -4, 4, 9); R(4, -6, 2, 2); break;
    case "uzi": R(-11, -4, 20, 5); R(-3, 1, 4, 8); R(-11, -2, 4, 6); R(7, -6, 2, 2); R(-7, 1, 3, 4); break;
    case "shotgun": R(-14, -3, 28, 3); R(-14, -3, 7, 6); R(0, 0, 9, 2); break;
    case "purrsuader":
      c.beginPath(); c.arc(-2, 0, 6, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(-2, 0, 2, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(6, -6); c.lineTo(12, -9); c.moveTo(6, 0); c.lineTo(13, 0); c.moveTo(6, 6); c.lineTo(12, 9); c.stroke();
      // ears
      c.beginPath(); c.moveTo(-8, -4); c.lineTo(-7, -10); c.lineTo(-4, -6); c.fill();
      c.beginPath(); c.moveTo(0, -6); c.lineTo(3, -10); c.lineTo(4, -4); c.fill();
      break;
    case "minigun": R(-12, -4, 20, 6); R(8, -3, 6, 1); R(8, -1, 6, 1); R(8, 1, 6, 1); R(-4, 2, 4, 6); break;
    case "longrange": R(-15, -2, 30, 2); R(-15, -2, 8, 5); R(-2, -5, 7, 2); R(1, 0, 2, 4); break;
    case "laser": R(-11, -4, 18, 6); R(7, -2, 7, 2); R(-4, 2, 4, 6); c.fillStyle = "#ff3048"; R(12, -2, 3, 2); break;
    case "gauss": R(-12, -5, 22, 8); R(10, -3, 4, 4); R(-4, 3, 4, 5); c.fillStyle = "#b47dff"; R(-8, -3, 12, 2); break;
    case "purr2":
      c.beginPath(); c.arc(-2, 0, 6, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(-2, 0, 2, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(6, -6); c.lineTo(13, -10); c.moveTo(6, 0); c.lineTo(14, 0); c.moveTo(6, 6); c.lineTo(13, 10); c.stroke();
      c.beginPath(); c.moveTo(-8, -4); c.lineTo(-7, -10); c.lineTo(-4, -6); c.fill();
      c.beginPath(); c.moveTo(0, -6); c.lineTo(3, -10); c.lineTo(4, -4); c.fill();
      R(-12, 7, 3, 3); R(-8, 7, 3, 3);
      break;
    case "banhammer": R(-11, -7, 12, 9); R(1, -4, 13, 3); c.fillStyle = "#ff3048"; R(-8, -4, 6, 3); break;
    case "medikit":
      c.strokeRect(-9, -6, 18, 13); R(-2, -4, 4, 9); R(-6, -1, 12, 3); break;
  }
  c.restore();
};

/* Cyber-mods: six parts, three versions each. What a version does is read
 * by the engine through W.mod(u, part); v0 is the stock body. */
W.MODS = [
  { id: "legs", name: "Legs", what: "walking speed, +12% a version" },
  { id: "arms", name: "Arms", what: "rate of fire; any version carries heavy weapons at full speed" },
  { id: "chest", name: "Chest", what: "armour and health" },
  { id: "heart", name: "Heart", what: "healing in the field, and resisting stim dependency" },
  { id: "eyes", name: "Eyes", what: "aim, and how far a Watcher looks for trouble" },
  { id: "brain", name: "Brain", what: "reflexes; each version counts as a follower for the Purrsuader" },
];
W.mod = (u, part) => (u.mods && u.mods[part]) || 0;
