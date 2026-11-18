// Batteribytte · the sound of the pant machine, made live with Web Audio (no files). One master bus through a
// compressor, so every effect sits at one loudness. It starts on the first press (browsers require a gesture);
// the «Lyd» chip turns it off and on. Haptics ride along with the big moments (vibrate: Android; iOS ignores it).
let ctx = null, master = null, on = true;
const buzzOk = typeof navigator !== 'undefined' && 'vibrate' in navigator;
export const buzz = (p) => { if (buzzOk) try { navigator.vibrate(p); } catch (e) { /* ignore */ } };

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = on ? 0.9 : 0;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}
export function setOn(v) { on = v; if (master) master.gain.setTargetAtTime(v ? 0.9 : 0, ctx.currentTime, 0.03); }
export const isOn = () => on;
export function suspend(h) { if (ctx) (h ? ctx.suspend() : ctx.resume()).catch(() => {}); }
const ok = () => ctx && on;
const now = () => ctx.currentTime;

function noiseBuf(dur) {
  const b = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * dur)), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function noise(dur, type, f0, f1, gain, at = 0, q = 1) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = now() + at;
  s.buffer = noiseBuf(dur); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.05);
}
function tone(freq, dur, gain, type = 'sine', to, at = 0) {
  const o = ctx.createOscillator(), g = ctx.createGain(), t = now() + at;
  o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
}

// a loop that can be started, shaped and stopped (the machine's hum, the rumble, the charge)
function loop(build) {
  let nodes = null;
  return {
    start(...a) { if (!ok() || nodes) return; nodes = build(...a); },
    set(fn) { if (nodes) fn(nodes, now()); },
    stop(fade = 0.08) {
      if (!nodes) return;
      const n = nodes; nodes = null;
      n.out.gain.setTargetAtTime(0.0001, now(), fade);
      (n.srcs || []).forEach((s) => { try { s.stop(now() + fade * 6); } catch (e) { /* ignore */ } });
    },
  };
}

export const hum = loop(() => {                      // the machine idling: mains hum and a little fan noise
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), out = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.frequency.value = 50; o2.frequency.value = 100; o.type = 'sine'; o2.type = 'triangle';
  lp.type = 'lowpass'; lp.frequency.value = 400; out.gain.value = 0.0001;
  out.gain.setTargetAtTime(0.035, now(), 0.4);
  const n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
  n.buffer = noiseBuf(2); n.loop = true; nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6; ng.gain.value = 0.25;
  o.connect(lp); o2.connect(lp); lp.connect(out); n.connect(nf).connect(ng).connect(out); out.connect(master);
  o.start(); o2.start(); n.start();
  return { out, srcs: [o, o2, n] };
});

export function suck() { if (!ok()) return; noise(0.7, 'bandpass', 2400, 300, 0.5, 0, 1.5); tone(220, 0.6, 0.05, 'sawtooth', 70); buzz(30); }
export const rollers = loop(() => {                  // the rollers spinning the can
  const o = ctx.createOscillator(), out = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = 38; f.type = 'lowpass'; f.frequency.value = 260; out.gain.value = 0.0001;
  out.gain.setTargetAtTime(0.08, now(), 0.05);
  const n = ctx.createBufferSource(), ng = ctx.createGain(); n.buffer = noiseBuf(1); n.loop = true; ng.gain.value = 0.15;
  o.connect(f); n.connect(ng).connect(f); f.connect(out).connect(master); o.start(); n.start();
  return { out, srcs: [o, n] };
});
export function scanBeep(f = 1800) { if (!ok()) return; tone(f, 0.05, 0.045, 'square'); }
export function grab() { if (!ok()) return; noise(0.05, 'bandpass', 1400, null, 0.18, 0, 2); tone(320, 0.06, 0.05, 'sine', 420); buzz(8); }
export function drop() { if (!ok()) return; noise(0.06, 'bandpass', 900, null, 0.12, 0, 2); buzz(6); }
export function lock() { if (!ok()) return; noise(0.05, 'highpass', 2500, null, 0.3); tone(180, 0.12, 0.2, 'sine', 90); buzz(25); }
export function gulp() { if (!ok()) return; tone(160, 0.25, 0.25, 'sine', 55, 0.05); noise(0.3, 'lowpass', 500, 120, 0.4, 0.05); buzz([20, 30, 40]); }
export function reject() {                            // the dreaded buzz
  if (!ok()) return;
  [0, 0.22].forEach((at) => tone(140, 0.18, 0.18, 'square', 120, at));
  buzz([60, 80, 60]);
}
export function accept() { if (!ok()) return; tone(1320, 0.1, 0.12, 'sine', null, 0); tone(1980, 0.18, 0.12, 'sine', null, 0.1); buzz(20); }
export function crush() {                             // KNAS: a slam, a crunch that crackles out, and a thud
  if (!ok()) return;
  tone(70, 0.5, 0.45, 'sine', 32); noise(0.4, 'lowpass', 900, 120, 0.7);
  for (let i = 0; i < 9; i++) noise(0.05 + Math.random() * 0.05, 'bandpass', 1800 + Math.random() * 3000, null, 0.35 * (1 - i / 10), 0.04 + i * 0.035, 3);
  buzz([80, 30, 120]);
}
export function click() { if (!ok()) return; noise(0.04, 'highpass', 3000, null, 0.4); tone(600, 0.05, 0.08, 'square'); buzz(15); }
export function printer(dur = 1.4) {                  // the thermal printer: a fast rhythmic chatter
  if (!ok()) return;
  const steps = Math.floor(dur / 0.05);
  for (let i = 0; i < steps; i++) noise(0.03, 'bandpass', 4200, null, 0.08 + 0.04 * (i % 2), i * 0.05, 4);
  tone(380, dur, 0.02, 'square', 380);
}
export const rumble = loop(() => {                    // the machine choking on the stuck can
  const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), out = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  n.buffer = noiseBuf(2); n.loop = true; f.type = 'lowpass'; f.frequency.value = 160; out.gain.value = 0.0001;
  out.gain.setTargetAtTime(0.35, now(), 0.1);
  lfo.frequency.value = 7; lg.gain.value = 0.25; lfo.connect(lg).connect(out.gain);
  n.connect(f).connect(out).connect(master); n.start(); lfo.start();
  return { out, srcs: [n, lfo] };
});
export function rattle(k = 1) { if (!ok()) return; noise(0.12, 'bandpass', 700 + 900 * Math.random(), null, 0.25 * k, 0, 2); tone(90 + 40 * Math.random(), 0.12, 0.12 * k, 'square'); buzz(25); }
export function thud() { if (!ok()) return; tone(110, 0.35, 0.4, 'sine', 45); noise(0.2, 'lowpass', 600, 150, 0.5); buzz([40, 20, 60]); }
export const charge = loop(() => {                    // charging: a hum that climbs, a riser that comes in late
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), out = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = 70; f.type = 'lowpass'; f.frequency.value = 400; out.gain.value = 0.0001;
  out.gain.setTargetAtTime(0.09, now(), 0.05);
  const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
  n.buffer = noiseBuf(2); n.loop = true; bp.type = 'bandpass'; bp.Q.value = 1.1; bp.frequency.value = 600; ng.gain.value = 0;
  o.connect(f).connect(out); n.connect(bp).connect(ng).connect(out); out.connect(master); o.start(); n.start();
  return { out, srcs: [o, n], o, f, bp, ng };
});
export function chargeLevel(c) {
  charge.set((n, t) => {
    const r = Math.max(0, (c - 0.4) / 0.6), e = r * r * (3 - 2 * r);
    n.o.frequency.setTargetAtTime(70 + 520 * c, t, 0.03); n.f.frequency.setTargetAtTime(400 + 3200 * c, t, 0.03);
    n.bp.frequency.setTargetAtTime(600 + 6400 * e * e, t, 0.05); n.ng.gain.setTargetAtTime(0.5 * e * e, t, 0.05);
  });
}
export function full() { if (!ok()) return; [523, 659, 784].forEach((f, i) => tone(f, 0.25, 0.06, 'sine', null, i * 0.06)); buzz([20, 30, 20]); }
export function pop() {                               // the can opens: a sub falling away, a thump, the crack, a chord
  if (!ok()) return;
  tone(92, 0.7, 0.4, 'sine', 36); noise(0.45, 'lowpass', 520, null, 0.7); noise(0.35, 'bandpass', 3200, null, 0.6);
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.7, 0.06, 'sine', null, 0.05 + i * 0.05));
  noise(1.6, 'highpass', 5000, 8000, 0.12, 0.1);    // the fizz
  buzz([25, 40, 35]);
}
