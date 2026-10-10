/* Every sound is synthesised here with Web Audio: nothing to load. The
 * context starts on the first key or click (browsers insist). */
"use strict";

W.audio = (() => {
  let ac = null, master = null, noise = null, amb = null;
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
    return true;
  }
  const wake = () => { if (init() && ac.state === "suspended") ac.resume(); };
  window.addEventListener("pointerdown", wake, true);
  window.addEventListener("keydown", wake, true);

  function env(g, t, a, peak, dcy, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end, t + a + dcy);
  }
  function noiseBurst(t, { dur = 0.15, f = 1200, q = 0.8, type = "bandpass", vol = 0.5, a = 0.002, out = master, fEnd } = {}) {
    const s = ac.createBufferSource(); s.buffer = noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
    const g = ac.createGain(); env(g, t, a, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + a + 0.05);
  }
  function tone(t, { f = 440, fEnd, dur = 0.1, type = "square", vol = 0.2, a = 0.004, out = master } = {}) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
    const g = ac.createGain(); env(g, t, a, vol, dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + a + 0.05);
  }

  const SFX = {
    pistol(t, v) { noiseBurst(t, { dur: 0.12, f: 1800, q: 0.6, vol: 0.55 * v }); tone(t, { f: 180, fEnd: 50, dur: 0.09, type: "triangle", vol: 0.35 * v }); },
    uzi(t, v) { noiseBurst(t, { dur: 0.06, f: 2400, q: 0.7, vol: 0.4 * v }); tone(t, { f: 220, fEnd: 80, dur: 0.05, type: "triangle", vol: 0.2 * v }); },
    shotgun(t, v) { noiseBurst(t, { dur: 0.32, f: 900, q: 0.5, vol: 0.8 * v, type: "lowpass", fEnd: 200 }); tone(t, { f: 120, fEnd: 35, dur: 0.22, type: "sine", vol: 0.5 * v }); },
    laser(t, v) { tone(t, { f: 2200, fEnd: 300, dur: 0.3, type: "sawtooth", vol: 0.18 * v }); tone(t, { f: 1100, fEnd: 150, dur: 0.3, type: "square", vol: 0.08 * v }); },
    purr(t, v) {
      // a rising warble, and a purr under it
      const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(70, t);
      const lfo = ac.createOscillator(); lfo.frequency.value = 26; const lg = ac.createGain(); lg.gain.value = 18;
      lfo.connect(lg); lg.connect(o.frequency);
      const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 500;
      const g = ac.createGain(); env(g, t, 0.05, 0.25 * v, 0.6);
      o.connect(fl); fl.connect(g); g.connect(master);
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
      o.connect(fl); fl.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
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
  const GAP = { uzi: 0.045, hit: 0.03, ric: 0.05, pistol: 0.03, persuaded: 0.1 };

  function play(name, vol = 1) {
    if (!ac || W.prefs.muted || !SFX[name]) return;
    const t = ac.currentTime;
    if (last[name] && t - last[name] < (GAP[name] || 0.015)) return;
    last[name] = t;
    SFX[name](t + 0.005, vol);
  }
  /* a sound placed in the world, quieter the further it is from the view */
  function at(name, x, y, vol = 1) {
    const d = Math.hypot(x - listener.x, y - listener.y);
    const v = vol * W.clamp(1.15 - d / 26, 0, 1);
    if (v > 0.03) play(name, v);
  }

  /* Rain and the city's hum: two filtered noise loops, and a distant siren
   * now and then. */
  function ambience(on) {
    if (!ac) return;
    if (on && !amb) {
      const mk = (f, q, type, vol) => {
        const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
        const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
        const g = ac.createGain(); g.gain.value = vol;
        s.connect(fl); fl.connect(g); g.connect(master); s.start();
        return { s, g };
      };
      amb = { hum: mk(90, 0.7, "lowpass", 0.16), rain: mk(5000, 0.3, "highpass", W.prefs.rain ? 0.05 : 0) };
      amb.timer = setInterval(() => { if (!W.prefs.muted && Math.random() < 0.25) distantSiren(); }, 9000);
    } else if (!on && amb) {
      try { amb.hum.s.stop(); amb.rain.s.stop(); } catch (e) { /* already */ }
      clearInterval(amb.timer); amb = null;
    }
  }
  function distantSiren() {
    const t = ac.currentTime, o = ac.createOscillator(); o.type = "triangle";
    for (let i = 0; i < 6; i++) { o.frequency.setValueAtTime(620, t + i * 0.7); o.frequency.linearRampToValueAtTime(820, t + i * 0.7 + 0.35); o.frequency.linearRampToValueAtTime(620, t + i * 0.7 + 0.7); }
    const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 1200;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.025, t + 1.5); g.gain.linearRampToValueAtTime(0.0001, t + 4.2);
    o.connect(fl); fl.connect(g); g.connect(master); o.start(t); o.stop(t + 4.3);
  }
  function setRain(on) { if (amb) amb.rain.g.gain.value = on ? 0.05 : 0; }

  function setMuted(m) {
    W.prefs.muted = m; W.savePrefs();
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, ac.currentTime, 0.02);
  }
  return { play, at, ambience, setRain, setMuted, listen(x, y) { listener.x = x; listener.y = y; }, get ready() { return !!ac; }, init: wake };
})();
