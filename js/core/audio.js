/* Every sound is synthesised here with Web Audio: nothing to load. The
 * context starts on the first key or click (browsers insist). */
"use strict";

W.audio = (() => {
  let ac = null, master = null, noise = null, amb = null, verb = null, world = null, musOut = null;
  let out0 = null;   // where a sound goes unless told: the world bus while at() plays one
  const last = {};
  let listener = { x: 0, y: 0 };

  function init() {
    if (ac) return true;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return false; }
    master = ac.createGain();
    master.gain.value = W.prefs.muted ? 0 : 0.7;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a room for the city: a synthesised 2-second tail. Sounds placed in the
    // world and the score send to it; the interface's clicks stay dry
    const ir = ac.createBuffer(2, ac.sampleRate * 2, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const b = ir.getChannelData(c);
      for (let i = 0; i < b.length; i++) b[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / b.length, 3.2);
    }
    verb = ac.createConvolver(); verb.buffer = ir;
    const wet = ac.createGain(); wet.gain.value = 0.32;
    verb.connect(wet); wet.connect(master);
    world = ac.createGain(); world.connect(master);
    const ws = ac.createGain(); ws.gain.value = 0.35; world.connect(ws); ws.connect(verb);
    // the score's own switch, under the master: Music off silences it alone
    musOut = ac.createGain(); musOut.gain.value = W.prefs.music ? 1 : 0;
    musOut.connect(master);
    const ms = ac.createGain(); ms.gain.value = 0.5; musOut.connect(ms); ms.connect(verb);
    return true;
  }
  // the title's theme, if it never got going, starts here too. Anything but
  // running is worth a resume: Safari marks a context it refused "interrupted",
  // not "suspended", and waits for it to be asked again inside a key or click
  const wake = () => { if (init()) { if (ac.state !== "running") ac.resume().catch(() => {}); if (mus.wantTitle && !mus.timer) musicStart("title", true); } };
  window.addEventListener("pointerdown", wake, true);
  window.addEventListener("keydown", wake, true);

  function env(g, t, a, peak, dcy, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end, t + a + dcy);
  }
  function noiseBurst(t, { dur = 0.15, f = 1200, q = 0.8, type = "bandpass", vol = 0.5, a = 0.002, out = out0 || master, fEnd } = {}) {
    const s = ac.createBufferSource(); s.buffer = noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
    const g = ac.createGain(); env(g, t, a, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + a + 0.05);
  }
  function tone(t, { f = 440, fEnd, dur = 0.1, type = "square", vol = 0.2, a = 0.004, out = out0 || master } = {}) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
    const g = ac.createGain(); env(g, t, a, vol, dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + a + 0.05);
  }

  /* a gunshot in three parts: the crack (a click of high noise), the body (noise
   * falling through a lowpass) and the thump (a sine dropping away). The room
   * on the world bus gives it its tail. */
  function shot(t, v, { crack, crackF, body, bodyF, bodyEnd, dur, thump, thumpF }) {
    noiseBurst(t, { dur: 0.012, f: crackF, type: "highpass", q: 0.7, vol: crack * v, a: 0.001 });
    noiseBurst(t, { dur, f: bodyF, fEnd: bodyEnd, type: "lowpass", q: 0.9, vol: body * v, a: 0.002 });
    tone(t, { f: thumpF, fEnd: thumpF / 3, dur: dur * 0.9, type: "sine", vol: thump * v, a: 0.002 });
  }
  // a mechanism: two clicks, metal on metal
  function click2(t, vol) {
    noiseBurst(t, { dur: 0.01, f: 3200, q: 4, vol, a: 0.001 });
    noiseBurst(t + 0.035, { dur: 0.012, f: 2400, q: 4, vol: vol * 0.8, a: 0.001 });
  }

  const SFX = {
    // a silenced round: a soft thup, and the click of the slide
    silenced(t, v) { shot(t, v, { crack: 0.06, crackF: 5000, body: 0.2, bodyF: 900, bodyEnd: 220, dur: 0.05, thump: 0.2, thumpF: 220 }); tone(t + 0.03, { f: 2600, dur: 0.008, type: "square", vol: 0.035 * v }); },
    // the Longwhisker: a heavier thup, then the bolt
    rifle_s(t, v) { shot(t, v, { crack: 0.08, crackF: 4500, body: 0.3, bodyF: 700, bodyEnd: 140, dur: 0.09, thump: 0.32, thumpF: 160 }); click2(t + 0.32, 0.05 * v); },
    pistol(t, v) { shot(t, v, { crack: 0.45, crackF: 3500, body: 0.45, bodyF: 1800, bodyEnd: 300, dur: 0.12, thump: 0.3, thumpF: 170 }); },
    uzi(t, v) { shot(t, v, { crack: 0.3, crackF: 4000, body: 0.32, bodyF: 2600, bodyEnd: 600, dur: 0.06, thump: 0.18, thumpF: 190 }); },
    // the Minigun's rounds come too fast to tell apart: a low rip, each round a tick of it
    minigun(t, v) { shot(t, v, { crack: 0.12, crackF: 3000, body: 0.24, bodyF: 1300, bodyEnd: 380, dur: 0.045, thump: 0.16, thumpF: 120 }); },
    shotgun(t, v) {
      shot(t, v, { crack: 0.55, crackF: 3000, body: 0.85, bodyF: 1600, bodyEnd: 140, dur: 0.34, thump: 0.6, thumpF: 110 });
      click2(t + 0.42, 0.07 * v); click2(t + 0.55, 0.07 * v);   // the pump
    },
    // the Gauss Gun: a rising whine, then the round lands with a snap
    gauss(t, v) {
      tone(t, { f: 180, fEnd: 2400, dur: 0.12, type: "sawtooth", vol: 0.08 * v });
      shot(t + 0.12, v, { crack: 0.5, crackF: 2500, body: 0.6, bodyF: 1200, bodyEnd: 120, dur: 0.22, thump: 0.5, thumpF: 90 });
    },
    laser(t, v) { tone(t, { f: 2200, fEnd: 300, dur: 0.3, type: "sawtooth", vol: 0.18 * v }); tone(t, { f: 1100, fEnd: 150, dur: 0.3, type: "square", vol: 0.08 * v }); },
    purr(t, v) {
      // a rising warble, and a purr under it
      const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(70, t);
      const lfo = ac.createOscillator(); lfo.frequency.value = 26; const lg = ac.createGain(); lg.gain.value = 18;
      lfo.connect(lg); lg.connect(o.frequency);
      const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 500;
      const g = ac.createGain(); env(g, t, 0.05, 0.25 * v, 0.6);
      o.connect(fl); fl.connect(g); g.connect(out0 || master);
      o.start(t); lfo.start(t); o.stop(t + 0.75); lfo.stop(t + 0.75);
      tone(t, { f: 500, fEnd: 1400, dur: 0.35, type: "sine", vol: 0.12 * v });
    },
    persuaded(t, v) { tone(t, { f: 660, dur: 0.08, type: "square", vol: 0.12 * v }); tone(t + 0.09, { f: 990, dur: 0.12, type: "square", vol: 0.12 * v }); },
    heal(t, v) { [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.06, { f, dur: 0.12, type: "triangle", vol: 0.18 * v })); },
    boom(t, v) {
      noiseBurst(t, { dur: 1.1, f: 600, q: 0.3, vol: 1.0 * v, type: "lowpass", fEnd: 60, a: 0.005 });
      tone(t, { f: 90, fEnd: 25, dur: 0.8, type: "sine", vol: 0.8 * v });
    },
    hit(t, v) { noiseBurst(t, { dur: 0.05, f: 500, q: 1.5, vol: 0.3 * v }); },
    ric(t, v) { tone(t, { f: 2400 + Math.random() * 1500, fEnd: 900, dur: 0.12, type: "sine", vol: 0.06 * v }); },
    die(t, v) { tone(t, { f: 300, fEnd: 90, dur: 0.35, type: "sawtooth", vol: 0.12 * v }); noiseBurst(t + 0.05, { dur: 0.12, f: 300, vol: 0.25 * v, type: "lowpass" }); },
    meow(t, v) {
      const o = ac.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(500, t); o.frequency.linearRampToValueAtTime(900, t + 0.12); o.frequency.linearRampToValueAtTime(420, t + 0.4);
      const fl = ac.createBiquadFilter(); fl.type = "bandpass"; fl.Q.value = 3;
      fl.frequency.setValueAtTime(900, t); fl.frequency.linearRampToValueAtTime(1600, t + 0.12); fl.frequency.linearRampToValueAtTime(700, t + 0.4);
      const g = ac.createGain(); env(g, t, 0.03, 0.18 * v, 0.4);
      o.connect(fl); fl.connect(g); g.connect(out0 || master); o.start(t); o.stop(t + 0.5);
    },
    whistle(t, v) { tone(t, { f: 2600, dur: 0.12, type: "sine", vol: 0.15 * v }); tone(t + 0.16, { f: 2600, dur: 0.3, type: "sine", vol: 0.15 * v }); },
    alarm(t, v) { for (let i = 0; i < 3; i++) { tone(t + i * 0.5, { f: 700, fEnd: 1100, dur: 0.25, type: "square", vol: 0.07 * v }); tone(t + i * 0.5 + 0.25, { f: 1100, fEnd: 700, dur: 0.25, type: "square", vol: 0.07 * v }); } },
    select(t, v) { tone(t, { f: 880, dur: 0.04, type: "square", vol: 0.08 * v }); tone(t + 0.045, { f: 1320, dur: 0.05, type: "square", vol: 0.07 * v }); },
    order(t, v) { tone(t, { f: 660, dur: 0.05, type: "square", vol: 0.07 * v }); },
    click(t, v) { tone(t, { f: 1200, dur: 0.025, type: "square", vol: 0.05 * v }); },
    deny(t, v) { tone(t, { f: 160, dur: 0.12, type: "square", vol: 0.09 * v }); },
    pickup(t, v) { tone(t, { f: 740, dur: 0.05, type: "triangle", vol: 0.12 * v }); tone(t + 0.06, { f: 1110, dur: 0.07, type: "triangle", vol: 0.12 * v }); },
    win(t, v) { [392, 523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.12, { f, dur: 0.35, type: "triangle", vol: 0.16 * v })); },
    lose(t, v) { [392, 330, 262, 196].forEach((f, i) => tone(t + i * 0.22, { f, dur: 0.5, type: "sawtooth", vol: 0.1 * v })); },
    engine(t, v) { tone(t, { f: 60, fEnd: 140, dur: 0.8, type: "sawtooth", vol: 0.12 * v }); },
  };
  const GAP = { uzi: 0.045, minigun: 0.045, rifle_s: 0.1, gauss: 0.15, shotgun: 0.1, hit: 0.03, ric: 0.05, pistol: 0.03, silenced: 0.03, persuaded: 0.1 };

  function play(name, vol = 1) {
    if (!ac || W.prefs.muted || !SFX[name]) return;
    const t = ac.currentTime;
    if (last[name] && t - last[name] < (GAP[name] || 0.015)) return;
    last[name] = t;
    SFX[name](t + 0.005, vol);
  }
  /* a sound placed in the world, quieter the further it is from the view,
   * and in the room */
  function at(name, x, y, vol = 1) {
    const d = Math.hypot(x - listener.x, y - listener.y);
    const v = vol * W.clamp(1.15 - d / 26, 0, 1);
    if (v <= 0.03) return;
    out0 = world;
    try { play(name, v); } finally { out0 = null; }
  }

  /* ---- the score ----
   * A step sequencer in the manner of Syndicate's mission music: a dark pad,
   * a bass ostinato, drums, and over them an arpeggio when it comes to a
   * fight. Three moods, each with its own patterns and tempo:
   *   0 the walk     86 bpm, the pad and a pulse
   *   1 trouble      104 bpm: an alarm, or the crew or security after the squad nearby
   *   2 the fight    140 bpm: a Watcher shooting or shot at, these 7 seconds
   * The patterns change on the next beat; the tempo glides there over a bar
   * or two, so the city winds up as the fight starts and down after it.
   *
   * The piece is sixteen bars: four sections of four, A (Dm Bb Gm A) and
   * B (Gm Eb Bb A) in an order the mission picks. Over the chords, now and
   * then, a slow tune of a few notes (never in a fight). The last bar of a
   * section has a drum fill; now and then a bar drops its drums, or on the
   * walk its bass. Each mission seeds its own version (key, form, which of
   * the patterns, which notes of the tune), so the same mission always
   * sounds the same and no two sound quite alike.
   * Notes are scheduled a little ahead of the clock (the usual Web Audio
   * look-ahead), from a timer the music owns.
   *
   * The title has a theme of its own on the same machine, always the same:
   * four bars of bass in 13/16, the limp of the Terminator's beat (a hit, a
   * hit, a double, a hit), joined by a clank, then the kick, then a swell;
   * then the piece above in trouble's patterns, A A B A, at TITLE_BPM; then
   * the 13/16 again, with the pad under it this time, and round. */
  const BPM = [86, 104, 140], TITLE_BPM = 100;
  // the opening's bar: on these sixteenths, [semitones over the root, weight]
  const OPEN = { 0: [0, 1], 3: [0, 0.7], 6: [0, 0.75], 7: [12, 0.9], 10: [0, 0.7] };
  const OPEN_ROOT = [38, 38, 34, 33], OPEN_PAD = [[50, 53, 57], [50, 53, 57], [46, 50, 53], [49, 52, 57]];
  const _ = null;
  const SONG = {
    A: { root: [38, 34, 43, 45], pad: [[50, 53, 57], [46, 50, 53], [50, 55, 58], [49, 52, 57]],
      // the tune: [step, note, length in steps], a bar at a time
      tune: [[[0, 69, 7], [8, 65, 7]], [[0, 70, 12]], [[0, 67, 6], [8, 70, 6]], [[0, 69, 14]]] },
    B: { root: [43, 39, 34, 45], pad: [[50, 55, 58], [51, 55, 58], [50, 53, 58], [49, 52, 57]],
      tune: [[[0, 74, 10]], [[0, 70, 7], [8, 67, 7]], [[0, 65, 12]], [[0, 64, 7], [8, 61, 7]]] },
  };
  const FORMS = [["A", "A", "B", "A"], ["A", "B", "A", "B"], ["A", "A", "B", "B"], ["A", "B", "B", "A"]];
  // the bass, three ways for each mood: semitones over the chord's root
  const BASS = [
    [[0, _, _, _, _, _, 0, _, 12, _, _, _, _, _, 7, _],
     [0, _, _, _, _, _, _, _, 0, _, _, 7, _, _, _, _],
     [0, _, _, 0, _, _, _, _, 12, _, _, _, 7, _, _, _]],
    [[0, _, 0, _, 12, _, 0, _, 0, _, 0, _, 7, _, 12, _],
     [0, _, _, 0, _, _, 0, _, 12, _, _, 0, _, _, 7, _],
     [0, _, 0, 0, 12, _, 0, _, 0, _, 0, 0, 7, _, 10, _]],
    [[0, 0, 12, 0, 0, 7, 12, 0, 0, 0, 12, 0, 7, 0, 12, 10],
     [0, 12, 0, 12, 0, 12, 7, 12, 0, 12, 0, 12, 10, 12, 7, 12],
     [0, 0, 0, 12, 0, 0, 7, 0, 0, 0, 0, 12, 0, 10, 7, 5]],
  ];
  const KICK = [[], [0, 8], [0, 4, 7, 8, 12, 14]];
  const SNARE = [[], [12], [4, 12]];
  const HAT = [
    [2, 6, 10, 14],
    [2, 4, 6, 10, 12, 14],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  ];
  // the fight's arpeggio: which chord voice on each sixteenth, three ways
  const ARPS = [
    [0, 1, 2, 1, 2, 0, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1],
    [0, 2, 1, 2, 0, 2, 1, 2, 1, 2, 0, 2, 1, 2, 0, 1],
    [2, 1, 0, 1, 2, 1, 0, 2, 2, 1, 0, 1, 0, 1, 2, 1],
  ];
  const KEYS = [0, -2, 1, 3];   // D, C, Eb or F minor
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  // a small seeded generator, so a mission's choices are its own
  const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

  const mus = { bus: null, timer: null, step: 0, bar: 0, next: 0, bpm: BPM[0], mood: 0, want: 0, fightT: -1e9, filt: null };

  function musicStart(seed, title = false) {
    if (!ac || mus.timer) return;
    mus.bus = ac.createGain(); mus.bus.gain.value = 0;
    mus.bus.gain.setTargetAtTime(0.42, ac.currentTime, 1.2);
    mus.filt = ac.createBiquadFilter(); mus.filt.type = "lowpass"; mus.filt.frequency.value = 1400; mus.filt.Q.value = 0.7;
    mus.filt.connect(mus.bus); mus.bus.connect(musOut);
    // this mission's version
    const rng = mus.rng = seeded(hash(seed == null ? Math.random() : seed));
    const pick = n => Math.floor(rng() * n);
    mus.key = KEYS[pick(KEYS.length)];
    mus.form = FORMS[pick(FORMS.length)];
    mus.bassV = [pick(3), pick(3), pick(3)];
    mus.arp = ARPS[pick(ARPS.length)];
    mus.tempo = 0.97 + rng() * 0.06;
    mus.step = 0; mus.bar = 0; mus.next = ac.currentTime + 0.1; mus.mood = 0; mus.want = 0; mus.fightT = -1e9;
    mus.bpm = BPM[0] * mus.tempo;
    mus.title = title;
    if (title) {
      mus.key = 0; mus.form = ["A", "A", "B", "A"]; mus.bassV = [0, 0, 0]; mus.arp = ARPS[0];
      mus.tempo = 1; mus.bpm = TITLE_BPM; mus.want = 1;
      mus.open = true; mus.obar = 0; mus.pass = 0;
      mus.filt.frequency.value = 450;
    }
    mus.timer = setInterval(musicTick, 25);
  }
  function musicStop() {
    if (!mus.timer) return;
    clearInterval(mus.timer); mus.timer = null; mus.title = false;
    const b = mus.bus, t = ac.currentTime;
    b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => b.disconnect(), 900);
  }
  function musicTick() {
    if (W.prefs.muted) { mus.next = ac.currentTime + 0.05; return; }
    // a fight is over seven seconds after its last shot
    const want = !mus.title && ac.currentTime - mus.fightT < 7 ? 2 : mus.want;
    while (mus.next < ac.currentTime + 0.12) {
      if (mus.title && mus.open) {
        openStep(mus.next, mus.step);
        mus.next += 60 / mus.bpm / 4;
        if (++mus.step === 13) { mus.step = 0; if (++mus.obar === 4) mus.open = false; }
        continue;
      }
      if (mus.step % 4 === 0) mus.mood = want;
      if (mus.step === 0) newBar();
      musicStep(mus.next, mus.step);
      // the tempo winds toward the mood's, a little each step
      mus.bpm += ((mus.title ? TITLE_BPM : BPM[mus.mood] * mus.tempo) - mus.bpm) * 0.06;
      mus.next += 60 / mus.bpm / 4;
      if (++mus.step === 16) {
        mus.step = 0; mus.bar = (mus.bar + 1) % 16;
        if (mus.title && mus.bar === 0) { mus.open = true; mus.obar = 0; mus.pass++; }
      }
    }
  }
  // a sixteenth of the title's opening: the bass on its five hits, the rest
  // arriving a bar at a time; the pad only once it has come round again
  function openStep(t, i) {
    const b = mus.obar, out = mus.filt, step = 60 / mus.bpm / 4, h = OPEN[i];
    if (i === 0) {
      mus.filt.frequency.setTargetAtTime([450, 700, 1000, 1500][b], t, 0.4);
      if (mus.pass > 0) pad(t, OPEN_PAD[b], step * 13, 0);
      if (b === 3) swell(t, step * 13, out);
    }
    if (h) {
      bass(t, OPEN_ROOT[b] + h[0], step * (i === 0 ? 2.6 : 1.7), 1, out, h[1]);
      if (b >= 1) clank(t, out, h[1] * (b === 1 ? 0.6 : 1));
      if (b >= 2 && (i === 0 || i === 7)) kick(t, out);
    }
    if (b === 3 && i >= 11) snare(t, out, i === 11 ? 0.6 : 1);
    if (b >= 2 && i % 2 === 1) noiseBurst(t, { dur: 0.03, f: 8000, type: "highpass", q: 0.5, vol: b === 3 ? 0.04 : 0.025, out });
  }
  // metal struck: a ringing band of noise and a hard square blip
  function clank(t, out, v) {
    noiseBurst(t, { dur: 0.09, f: 3200, q: 9, vol: 0.2 * v, out });
    tone(t, { f: 1250, fEnd: 1100, dur: 0.05, type: "square", vol: 0.025 * v, a: 0.001, out });
  }
  // what this bar is: its section and chord, and the dice for it. The dice are
  // thrown every bar whatever the mood, so a mission's sequence never drifts
  function newBar() {
    const r = mus.rng, b = mus.bar, inSec = b % 4, sec = SONG[mus.form[b >> 2]];
    if (inSec === 0) { const r0 = r(); mus.tuneOn = mus.title ? b >= 4 : r0 < 0.5; }   // the tune plays in about half the sections; on the title, all but the first
    const keep = [r(), r()];
    mus.cur = {
      sec, inSec, root: sec.root[inSec] + mus.key, pad: sec.pad[inSec].map(n => n + mus.key),
      tune: mus.tuneOn ? sec.tune[inSec].filter((_n, i) => keep[i] < 0.8).map(([st, n, len]) => [st, n + mus.key, len]) : [],
      fill: inSec === 3,
      drop: inSec !== 0 && inSec !== 3 && r() < 0.14,
      bell: r() < 0.5,
    };
  }
  function musicStep(t, i) {
    const m = mus.mood, out = mus.filt, B = mus.cur, beat = 60 / mus.bpm, step = beat / 4;
    if (i === 0) {
      // the filter opens with the mood: murk on the walk, edge in a fight
      mus.filt.frequency.setTargetAtTime([1100, 2000, 4200][m], t, 0.4);
      pad(t, B.pad, beat * 4, m);
      if (m === 0 && B.bell && !B.tune.length) bell(t + beat * 2, B.pad[2 - (B.inSec >> 1)] + 24, out);
      // the end of the piece, on the walk: a swell into the top again
      if (m === 0 && mus.bar === 15) swell(t, beat * 4, out);
    }
    if (m < 2) for (const [st, n, len] of B.tune) if (st === i) melody(t, n, len * step, m, out);
    const fillNow = B.fill && m > 0 && i >= (m === 2 ? 12 : 14);
    const n = BASS[m][mus.bassV[m]][i];
    if (n != null && !(B.drop && m === 0)) bass(t, B.root + n, beat / (m === 2 ? 4.5 : 2.5), m, out);
    const drums = !(B.drop && m > 0);
    if (fillNow) fill(t, i, m, out);
    else if (drums) {
      if (KICK[m].includes(i)) kick(t, out);
      if (SNARE[m].includes(i)) snare(t, out);
    }
    if (HAT[m].includes(i) && (drums || i % 2 === 0)) noiseBurst(t, { dur: 0.03, f: 8000, type: "highpass", q: 0.5, vol: (m === 2 ? (i % 4 === 2 ? 0.07 : 0.035) : 0.04) * (drums ? 1 : 0.6), out });
    if (m === 2) arp(t, B.pad[mus.arp[i]] + 12 + (i >= 8 ? 12 : 0), step, out);
    else if (m === 1 && i % 4 === 3) arp(t, B.pad[mus.arp[i]] + 24, beat / 3, out, 0.05);
  }
  // the fill into the next section: snare and toms, falling
  function fill(t, i, m, out) {
    const k = m === 2 ? i - 12 : i - 14, n = m === 2 ? 4 : 2;
    snare(t, out, 0.5 + 0.5 * (k + 1) / n);
    tone(t, { f: [230, 190, 155, 120][m === 2 ? k : k + 2], fEnd: 70, dur: 0.18, type: "sine", vol: 0.28, a: 0.002, out });
  }
  // the tune's voice: a soft triangle, slow to speak, with a little vibrato
  function melody(t, note, len, m, out) {
    const f = mtof(note), o = ac.createOscillator(); o.type = "triangle"; o.frequency.value = f;
    const o2 = ac.createOscillator(); o2.type = "sine"; o2.frequency.value = f * 2;
    const lfo = ac.createOscillator(); lfo.frequency.value = 5; const lg = ac.createGain();
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + len * 0.6);
    lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    const g = ac.createGain(), vol = m === 0 ? 0.045 : 0.03;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.12);
    g.gain.setValueAtTime(vol, t + len * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.5);
    const g2 = ac.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out);
    for (const x of [o, o2, lfo]) { x.start(t); x.stop(t + len + 0.6); }
  }
  // a breath of filtered noise rising over a bar
  function swell(t, len, out) {
    const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 2;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(3500, t + len);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + len * 0.95); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.1);
    s.connect(bp); bp.connect(g); g.connect(out); s.start(t); s.stop(t + len + 0.2);
  }
  // two detuned saws a voice, slow to swell, through the score's filter
  function pad(t, chord, len, m) {
    const g = ac.createGain(), vol = [0.07, 0.055, 0.04][m];
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.9, len * 0.3));
    g.gain.setValueAtTime(vol, t + len * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.3);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 0.5;
    lp.connect(g); g.connect(mus.filt);
    for (const note of chord) for (const det of [-7, 7]) {
      const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(note); o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + len + 0.4);
    }
  }
  function bass(t, note, len, m, out, v = 1) {
    const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(note);
    const s = ac.createOscillator(); s.type = "square"; s.frequency.value = mtof(note - 12);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 6;
    lp.frequency.setValueAtTime([500, 900, 1600][m], t); lp.frequency.exponentialRampToValueAtTime(140, t + len);
    const g = ac.createGain(); env(g, t, 0.005, [0.16, 0.17, 0.18][m] * v, len);
    o.connect(lp); s.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); s.start(t); o.stop(t + len + 0.05); s.stop(t + len + 0.05);
  }
  function kick(t, out) {
    tone(t, { f: 140, fEnd: 42, dur: 0.16, type: "sine", vol: 0.55, a: 0.002, out });
    noiseBurst(t, { dur: 0.012, f: 3000, q: 0.7, vol: 0.12, out });
  }
  function snare(t, out, v = 1) {
    noiseBurst(t, { dur: 0.14, f: 1900, q: 0.6, vol: 0.22 * v, out });
    tone(t, { f: 210, fEnd: 150, dur: 0.07, type: "triangle", vol: 0.12 * v, out });
  }
  function arp(t, note, len, out, vol = 0.07) {
    const o = ac.createOscillator(); o.type = "square"; o.frequency.value = mtof(note);
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = mtof(note) * 2; bp.Q.value = 1.2;
    const g = ac.createGain(); env(g, t, 0.003, vol, len * 0.9);
    o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.05);
  }
  // the walk's one tune: a cold bell now and then, over the pad
  function bell(t, note, out) {
    for (const [r, v] of [[1, 0.06], [2.76, 0.02], [5.4, 0.01]]) tone(t, { f: mtof(note) * r, dur: 2.2 / r, type: "sine", vol: v, a: 0.004, out });
  }

  /* ---- the street under it: rain, and a siren far off now and then ---- */
  function ambience(on, seed) {
    mus.wantTitle = false;
    if (!ac) return;
    if (mus.title) musicStop();
    if (on && !amb) {
      const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
      // rain is a soft wash, not hiss: a band, rolled off at the top
      const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800; hp.Q.value = 0.3;
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4500; lp.Q.value = 0.3;
      const g = ac.createGain(); g.gain.value = W.prefs.rain ? RAIN : 0;
      s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master); s.start();
      amb = { rain: { s, g } };
      amb.timer = setInterval(() => { if (!W.prefs.muted && Math.random() < 0.25) distantSiren(); }, 9000);
      musicStart(seed);
    } else if (!on && amb) {
      try { amb.rain.s.stop(); } catch (e) { /* already */ }
      clearInterval(amb.timer); amb = null;
      musicStop();
    }
  }
  const RAIN = 0.006;   // under everything: a texture, not a sound
  function distantSiren() {
    const t = ac.currentTime, o = ac.createOscillator(); o.type = "triangle";
    for (let i = 0; i < 6; i++) { o.frequency.setValueAtTime(620, t + i * 0.7); o.frequency.linearRampToValueAtTime(820, t + i * 0.7 + 0.35); o.frequency.linearRampToValueAtTime(620, t + i * 0.7 + 0.7); }
    const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 1200;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.025, t + 1.5); g.gain.linearRampToValueAtTime(0.0001, t + 4.2);
    o.connect(fl); fl.connect(g); g.connect(world); o.start(t); o.stop(t + 4.3);
  }
  function setRain(on) { if (amb) amb.rain.g.gain.value = on ? RAIN : 0; }
  /* the game's word on the mood: fight() whenever a Watcher shoots or is
   * shot at; trouble(on) as the street around the squad turns */
  function fight() { if (ac) mus.fightT = ac.currentTime; }
  function trouble(on) { mus.want = on ? 1 : 0; }

  /* the title's theme: on as the title shows, from the page's load; off with
   * any ambience() call. A browser that will not play before a key or click
   * keeps the context suspended (Safari: interrupted), and the sequencer,
   * which runs on the context's clock, waits at its first note until wake()
   * resumes it */
  function title(on) {
    mus.wantTitle = on;
    if (on && !init()) return;
    if (!ac) return;
    if (on && ac.state !== "running") ac.resume().catch(() => {});
    if (on && !mus.timer) musicStart("title", true);
    else if (!on && mus.title) musicStop();
  }

  function setMuted(m) {
    W.prefs.muted = m; W.savePrefs();
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, ac.currentTime, 0.02);
  }
  function setMusic(on) {
    W.prefs.music = on; W.store.set("pcwatchers_music_v1", on ? 1 : 0);
    if (musOut) musOut.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, 0.05);
  }
  /* the context, made if need be but not resumed (the intro asks the browser
   * first), and the effects' way out, for the intro's boot sound and ticks */
  const ctx = () => init() ? ac : null;
  return { play, at, ambience, title, setRain, setMuted, setMusic, fight, trouble, ctx, get fx() { return master; }, get mood() { return mus.mood; }, get bpm() { return mus.bpm; }, listen(x, y) { listener.x = x; listener.y = y; }, get ready() { return !!ac; }, init: wake };
})();
