// Batteribytte · the sound of the pant machine. Recorded-quality samples (ElevenLabs, chosen by ear: see
// tools/sfx/ and CREDITS.md) played as AudioBuffers through one master bus and a light compressor, with a little
// random pitch and level on every play so repeats don't sound copied. Loops loop over their exact length. Every
// sound keeps its old Web Audio synthesis as a fallback: until a file has loaded, or if it can't, that plays.
// Audio unlocks on the first press, key or touch (browsers, iOS above all, require a gesture) and the files are
// fetched and decoded right after. The «Lyd» chip turns it off and on. Haptics ride along (vibrate: Android only).
import MAN from './sfx-manifest.js';
let ctx = null, master = null, on = true;
const buzzOk = typeof navigator !== 'undefined' && 'vibrate' in navigator;
export const buzz = (p) => { if (buzzOk) try { navigator.vibrate(p); } catch (e) { /* ignore */ } };

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // iOS 17+: «playback» lets Web Audio sound with the ring/silent switch on silent (the default «auto» mutes it)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();                     // light: glue, not squash
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = on ? 0.9 : 0;
    master.connect(comp).connect(ctx.destination);
    preload();
    LOOPS.forEach((l) => l.wake());
  }
  if (ctx.state !== 'running') {
    // iOS: only a gesture that counts (touchend, click, keydown; not pointerdown) may start audio, so every such
    // event tries again until it runs: resume, plus a silent buffer inside the gesture, which opens the route.
    // «interrupted» (a call, the app in the background) needs the same.
    try { const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0); } catch (e) { /* ignore */ }
    ctx.resume().catch(() => {});
  }
}
if (typeof window !== 'undefined') ['pointerdown', 'touchend', 'click', 'keydown'].forEach((t) => addEventListener(t, unlock, { capture: true, passive: true }));

// ---------- the samples ----------
const BUF = {};
// Ogg first only where the browser is sure of it (Chrome, Firefox say «probably»); Safari gets AAC first: some
// versions say «maybe» to Ogg and then fail or stall decoding it
const FMT = (() => { try { return document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"') === 'probably' ? 'ogg' : 'm4a'; } catch (e) { return 'm4a'; } })();
const FIRST = ['room', 'hum', 'grab', 'suck', 'gulp', 'drop', 'ui'];  // the first step's sounds load first (room before hum: the hum carries it)
let loading = null;
// decode, giving up after 8 s (a decoder that never answers must not hold up the rest of the queue)
function decode(data) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('decode timeout')), 8000);
    const ok = (b) => { clearTimeout(t); res(b); }, no = (e) => { clearTimeout(t); rej(e); };
    try { const p = ctx.decodeAudioData(data, ok, no); if (p && p.catch) p.catch(no); } catch (e) { no(e); }
  });
}
const ERR = [];
async function fetchOne(id) {
  for (const f of FMT === 'ogg' ? ['ogg', 'm4a'] : ['m4a', 'ogg']) {
    try {
      const r = await fetch(`assets/sfx/${id}.${f}`);
      if (!r.ok) throw new Error(r.status);
      BUF[id] = await decode(await r.arrayBuffer());
      LOOPS.forEach((l) => { if (l.id === id) l.upgrade(); });
      return;
    } catch (e) { ERR.push(`${id}.${f}: ${e && (e.message || e.name || e)}`); }   // next format, or the synth stays
  }
}
function preload() {
  if (loading || !ctx) return loading;
  const ids = [...FIRST, ...Object.keys(MAN).filter((k) => !FIRST.includes(k))].filter((k) => MAN[k]);
  let i = 0;
  const worker = async () => { while (i < ids.length) await fetchOne(ids[i++]); };
  loading = Promise.all([worker(), worker(), worker()]);
  return loading;
}
const vary = (r) => 1 + (Math.random() * 2 - 1) * r;
// one shot: false if the file isn't there (then the caller synthesises)
function play(id, { gain = 1, rate = 1, at = 0, pitch = 0.03, level = 0.17 } = {}) {
  const b = BUF[id]; if (!b) return false;
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = b; s.playbackRate.value = rate * vary(pitch);
  g.gain.value = gain * vary(level);                                  // ±1.5 dB
  s.connect(g).connect(master); s.start(now() + at, 0, MAN[id].len + 0.02);
  return true;
}
// a loop from a sample, over its exact length (the file's padding is never reached)
function sampleLoop(id, gain, fadeIn = 0.15, rate = 1) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), lv = ctx.createGain(), out = ctx.createGain();
  s.buffer = BUF[id]; s.loop = true; s.loopStart = 0; s.loopEnd = MAN[id].len; s.playbackRate.value = rate;
  f.type = 'lowpass'; f.frequency.value = 20000; lv.gain.value = 1;
  out.gain.value = 0.0001; out.gain.setTargetAtTime(gain, now(), fadeIn / 3);
  s.connect(f).connect(lv).connect(out).connect(master);
  s.start(now(), Math.random() * MAN[id].len * 0.9);                 // a different spot each time
  return { out, srcs: [s], src: s, f, lv, sample: true };
}
export function setOn(v) { on = v; if (master) master.gain.setTargetAtTime(v ? 0.9 : 0, ctx.currentTime, 0.03); if (v) LOOPS.forEach((l) => l.wake()); }
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
// A loop remembers that it is wanted: asked for before the first gesture (no audio yet), it starts on unlock; running
// on the synth when its file arrives, it crossfades over to the file.
const LOOPS = [];
function loop(build, id) {
  let nodes = null, want = false;
  const l = {
    id,
    start(...a) { want = true; if (!ok() || nodes) return; nodes = build(...a); },
    set(fn) { if (nodes) fn(nodes, now()); },
    stop(fade = 0.08) {
      want = false;
      if (!nodes) return;
      const n = nodes; nodes = null;
      n.out.gain.setTargetAtTime(0.0001, now(), fade);
      (n.srcs || []).forEach((s) => { try { s.stop(now() + fade * 6); } catch (e) { /* ignore */ } });
    },
    wake() { if (want && !nodes && ok()) nodes = build(); },
    upgrade() { if (want && nodes && !nodes.sample) { l.stop(0.4); l.start(); } },
  };
  LOOPS.push(l);
  return l;
}

// the machine idling: the hum sample with the night outside under it; synth: mains hum and a little fan
export const hum = loop(() => {
  if (BUF.hum) {
    const n = sampleLoop('hum', 0.55, 1.2);
    if (BUF.room) { const r = sampleLoop('room', 0.5, 2.5); n.srcs.push(...r.srcs); r.out.disconnect(); r.out.connect(n.out); }
    return n;
  }
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), out = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.frequency.value = 50; o2.frequency.value = 100; o.type = 'sine'; o2.type = 'triangle';
  lp.type = 'lowpass'; lp.frequency.value = 400; out.gain.value = 0.0001;
  out.gain.setTargetAtTime(0.035, now(), 0.4);
  const n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
  n.buffer = noiseBuf(2); n.loop = true; nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6; ng.gain.value = 0.25;
  o.connect(lp); o2.connect(lp); lp.connect(out); n.connect(nf).connect(ng).connect(out); out.connect(master);
  o.start(); o2.start(); n.start();
  return { out, srcs: [o, o2, n] };
}, 'hum');

export function suck() { if (!ok()) return; if (!play('suck', { gain: 0.9 })) { noise(0.7, 'bandpass', 2400, 300, 0.5, 0, 1.5); tone(220, 0.6, 0.05, 'sawtooth', 70); } buzz(30); }
export const rollers = loop(() => {                  // the rollers spinning the can
  if (BUF.rollers) return sampleLoop('rollers', 0.8, 0.12);
  const o = ctx.createOscillator(), out = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = 38; f.type = 'lowpass'; f.frequency.value = 260; out.gain.value = 0.0001;
  out.gain.setTargetAtTime(0.08, now(), 0.05);
  const n = ctx.createBufferSource(), ng = ctx.createGain(); n.buffer = noiseBuf(1); n.loop = true; ng.gain.value = 0.15;
  o.connect(f); n.connect(ng).connect(f); f.connect(out).connect(master); o.start(); n.start();
  return { out, srcs: [o, n] };
}, 'rollers');
// the pitch is the laser's: 1800 Hz is the sample as recorded
export function scanBeep(f = 1800) { if (!ok()) return; if (!play('scanBeep', { rate: f / 1800, pitch: 0.005, gain: 0.7 })) tone(f, 0.05, 0.045, 'square'); }
export function grab() { if (!ok()) return; if (!play('grab')) { noise(0.05, 'bandpass', 1400, null, 0.18, 0, 2); tone(320, 0.06, 0.05, 'sine', 420); } buzz(8); }
export function drop() { if (!ok()) return; if (!play('drop', { gain: 0.8 })) noise(0.06, 'bandpass', 900, null, 0.12, 0, 2); buzz(6); }
export function lock() { if (!ok()) return; if (!play('lock')) { noise(0.05, 'highpass', 2500, null, 0.3); tone(180, 0.12, 0.2, 'sine', 90); } buzz(25); }
export function gulp() { if (!ok()) return; if (!play('gulp', { at: 0.05 })) { tone(160, 0.25, 0.25, 'sine', 55, 0.05); noise(0.3, 'lowpass', 500, 120, 0.4, 0.05); } buzz([20, 30, 40]); }
export function reject() {                            // the dreaded buzz
  if (!ok()) return;
  if (!play('reject', { pitch: 0.01 })) [0, 0.22].forEach((at) => tone(140, 0.18, 0.18, 'square', 120, at));
  buzz([60, 80, 60]);
}
export function accept() { if (!ok()) return; if (!play('accept', { pitch: 0.005 })) { tone(1320, 0.1, 0.12, 'sine', null, 0); tone(1980, 0.18, 0.12, 'sine', null, 0.1); } buzz(20); }
export function crush() {                             // KNAS: the sample, and under it a sub slam for the body blow
  if (!ok()) return;
  if (play('crush', { pitch: 0.04 })) { tone(62, 0.4, 0.3, 'sine', 30); buzz([80, 30, 120]); return; }
  tone(70, 0.5, 0.45, 'sine', 32); noise(0.4, 'lowpass', 900, 120, 0.7);
  for (let i = 0; i < 9; i++) noise(0.05 + Math.random() * 0.05, 'bandpass', 1800 + Math.random() * 3000, null, 0.35 * (1 - i / 10), 0.04 + i * 0.035, 3);
  buzz([80, 30, 120]);
}
export function click() { if (!ok()) return; if (!play('click')) { noise(0.04, 'highpass', 3000, null, 0.4); tone(600, 0.05, 0.08, 'square'); } buzz(15); }
export function ui() { if (!ok()) return; if (!play('ui', { gain: 0.8 })) tone(900, 0.03, 0.03, 'sine'); }   // the chips
export function printer(dur = 1.4) {                  // the thermal printer
  if (!ok()) return;
  if (play('printer', { pitch: 0.01, rate: MAN.printer ? MAN.printer.len / Math.max(0.8, dur) : 1 })) return;
  const steps = Math.floor(dur / 0.05);
  for (let i = 0; i < steps; i++) noise(0.03, 'bandpass', 4200, null, 0.08 + 0.04 * (i % 2), i * 0.05, 4);
  tone(380, dur, 0.02, 'square', 380);
}
export const rumble = loop(() => {                    // the machine choking on the stuck can
  if (BUF.rumble) return sampleLoop('rumble', 0.85, 0.1);
  const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), out = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  n.buffer = noiseBuf(2); n.loop = true; f.type = 'lowpass'; f.frequency.value = 160; out.gain.value = 0.0001;
  out.gain.setTargetAtTime(0.35, now(), 0.1);
  lfo.frequency.value = 7; lg.gain.value = 0.25; lfo.connect(lg).connect(out.gain);
  n.connect(f).connect(out).connect(master); n.start(); lfo.start();
  return { out, srcs: [n, lfo] };
}, 'rumble');
export function rattle(k = 1) { if (!ok()) return; if (!play('rattle', { gain: 0.8 * k, pitch: 0.08 })) { noise(0.12, 'bandpass', 700 + 900 * Math.random(), null, 0.25 * k, 0, 2); tone(90 + 40 * Math.random(), 0.12, 0.12 * k, 'square'); } buzz(25); }
// a gauge segment fills: each a step higher
export function tick(i = 0) { if (!ok()) return; if (!play('tick', { rate: Math.pow(1.12, i), pitch: 0.005 })) tone(660 * Math.pow(1.26, i), 0.12, 0.08, 'triangle'); buzz(12); }
export function whoosh() { if (!ok()) return; if (!play('whoosh')) noise(0.6, 'bandpass', 400, 3200, 0.35, 0, 0.8); }
export function clank(k = 1) { if (!ok()) return; if (!play('clank', { gain: 0.9 * k, pitch: 0.06 })) { tone(420 + 200 * Math.random(), 0.18, 0.12 * k, 'triangle', 300); noise(0.08, 'bandpass', 2600, null, 0.25 * k, 0, 4); } buzz(15); }
export function powerDown() { if (!ok()) return; if (!play('powerDown', { gain: 0.8 })) tone(520, 0.35, 0.05, 'sawtooth', 120); }
export function thud() { if (!ok()) return; if (!play('thud')) { tone(110, 0.35, 0.4, 'sine', 45); noise(0.2, 'lowpass', 600, 150, 0.5); } else tone(80, 0.25, 0.2, 'sine', 40); buzz([40, 20, 60]); }
// charging: the sample climbs with the level (faster, brighter, louder); synth: a hum that climbs, a late riser
export const charge = loop(() => {
  if (BUF.charge) { const n = sampleLoop('charge', 0.7, 0.1, 0.8); n.f.frequency.value = 900; n.lv.gain.value = 0.55; return n; }
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), out = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = 70; f.type = 'lowpass'; f.frequency.value = 400; out.gain.value = 0.0001;
  out.gain.setTargetAtTime(0.09, now(), 0.05);
  const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
  n.buffer = noiseBuf(2); n.loop = true; bp.type = 'bandpass'; bp.Q.value = 1.1; bp.frequency.value = 600; ng.gain.value = 0;
  o.connect(f).connect(out); n.connect(bp).connect(ng).connect(out); out.connect(master); o.start(); n.start();
  return { out, srcs: [o, n], o, f, bp, ng };
}, 'charge');
export function chargeLevel(c) {
  charge.set((n, t) => {
    if (n.sample) {
      n.src.playbackRate.setTargetAtTime(0.8 + 0.55 * c, t, 0.05);
      n.f.frequency.setTargetAtTime(900 + 12000 * c * c, t, 0.05);
      n.lv.gain.setTargetAtTime(0.55 + 0.6 * c, t, 0.05);
      return;
    }
    const r = Math.max(0, (c - 0.4) / 0.6), e = r * r * (3 - 2 * r);
    n.o.frequency.setTargetAtTime(70 + 520 * c, t, 0.03); n.f.frequency.setTargetAtTime(400 + 3200 * c, t, 0.03);
    n.bp.frequency.setTargetAtTime(600 + 6400 * e * e, t, 0.05); n.ng.gain.setTargetAtTime(0.5 * e * e, t, 0.05);
  });
}
export function full() { if (!ok()) return; if (!play('full', { pitch: 0.01 })) [523, 659, 784].forEach((f, i) => tone(f, 0.25, 0.06, 'sine', null, i * 0.06)); buzz([20, 30, 20]); }
// the can opens, in layers: the tab's crack, the spray on top of it, then the fizz that keeps going: loud at first,
// then settling to a quiet hiss that stays as long as the open can is on screen
let fizzV = 0.22;                                                      // where it settles (and where it comes back to)
export const fizz = loop(() => {
  if (BUF.fizz) return sampleLoop('fizz', fizzV * 0.9, 0.6);
  const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), out = ctx.createGain();
  n.buffer = noiseBuf(2); n.loop = true; f.type = 'highpass'; f.frequency.value = 5500; out.gain.value = 0.0001;
  out.gain.setTargetAtTime(fizzV * 0.12, now(), 0.2);
  n.connect(f).connect(out).connect(master); n.start();
  return { out, srcs: [n] };
}, 'fizz');
// how loud the fizz is: v (0…1) reached over tau seconds
export function fizzLevel(v, tau = 0.3) { fizzV = v; fizz.set((n, t) => { n.out.gain.cancelScheduledValues(t); n.out.gain.setTargetAtTime(Math.max(0.0001, v * (n.sample ? 0.9 : 0.12)), t, tau); }); }
export function pop() {
  if (!ok()) return;
  fizzV = 0.22; fizz.start();
  fizz.set((n, t) => {
    const g = n.out.gain, top = n.sample ? 0.9 : 0.12;
    g.cancelScheduledValues(t); g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(top, t + 0.35); g.setTargetAtTime(top * 0.22, t + 1.2, 1.6);
  });
  if (play('pop', { pitch: 0.02 })) {
    play('spray', { at: 0.03, gain: 0.9 });
    tone(80, 0.5, 0.22, 'sine', 36);                                  // a sub thump under it: the size of the moment
  } else {
    tone(92, 0.7, 0.4, 'sine', 36); noise(0.45, 'lowpass', 520, null, 0.7); noise(0.35, 'bandpass', 3200, null, 0.6);
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.7, 0.06, 'sine', null, 0.05 + i * 0.05));
  }
  // the bang, then a crackle in the hand: the bubbles
  buzz([25, 40, 35, 90, 6, 50, 8, 70, 5, 40, 7, 110, 5]);
}
// a sip from the can: the slurp (0.15–0.8 s), a swallow (1.15–1.45 s) and the «ah» (from 1.9 s); the fizz swells
// while the can is tipped. Synth: a slurp of noise, two gulps and a breath.
export const DRINK = { swallow: 1.15, ah: 1.9, len: 3.0 };
export function drink() {
  if (!ok()) return;
  fizzLevel(0.55, 0.2);
  setTimeout(() => fizzLevel(0.2, 0.8), 1900);
  if (!play('drink', { pitch: 0.01, level: 0.05 })) {
    noise(0.6, 'bandpass', 1800, 900, 0.18, 0.15, 3);
    tone(150, 0.18, 0.3, 'sine', 70, 1.15); noise(0.15, 'lowpass', 500, 200, 0.3, 1.18);
    noise(0.7, 'bandpass', 1100, 600, 0.12, 1.9, 0.8);
  }
  buzz([0, 150, 12, 120, 10, 120, 12, 600, 45, 700, 20]);
}

// for tests: how many files are decoded, and which format
if (typeof window !== 'undefined') window.__sfx = { loaded: () => Object.keys(BUF).length, of: Object.keys(MAN).length, fmt: FMT };
// ?lyd on the URL: a small readout of the audio state, for checking on a phone without dev tools
if (typeof location !== 'undefined' && /[?&]lyd\b/.test(location.search)) {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;margin:0;padding:6px 8px;max-width:calc(100vw - 16px);white-space:pre-wrap;font:11px/1.35 ui-monospace,monospace;color:#cfe;background:rgba(0,0,0,.75);border-radius:6px;pointer-events:none';
  const show = () => {
    box.textContent = `lyd: ${ctx ? ctx.state + ' ' + ctx.sampleRate + ' Hz' : 'ikke startet (trykk et sted)'} · på: ${on}\n`
      + `format: ${FMT} · lastet ${Object.keys(BUF).length}/${Object.keys(MAN).length}`
      + ` · audioSession: ${navigator.audioSession ? navigator.audioSession.type : '–'}`
      + (ERR.length ? `\nfeil: ${ERR.slice(-4).join(' | ')}` : '');
  };
  addEventListener('DOMContentLoaded', () => document.body.appendChild(box));
  if (document.body) document.body.appendChild(box);
  setInterval(show, 500); show();
}
