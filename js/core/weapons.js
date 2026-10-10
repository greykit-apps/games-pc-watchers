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
  purrsuader: {
    name: "Purrsuader", short: "PURR", gun: false, range: 2.8, cd: 1.1, ammo: null,
    sound: "purr", desc: "Talks anyone into following you. The armed need a crowd behind you first."
  },
  medikit: {
    name: "Medikit", short: "MEDI", gun: false, heal: true, ammo: 1, sound: "heal", desc: "Patches one Watcher to full. One use."
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
    case "medikit":
      c.strokeRect(-9, -6, 18, 13); R(-2, -4, 4, 9); R(-6, -1, 12, 3); break;
  }
  c.restore();
};
