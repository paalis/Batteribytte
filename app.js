// Batteribytte: a short studio film (hard cuts on the real can photo), then "Er du klar?" with Ja / Nei.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stage = $('#stage'), camera = $('.camera'), hero = $('#hero');
  const kicker = $('#kicker'), title = $('#title'), status = $('#status');
  const panels = { ask: $('#ask'), yes: $('#yes'), no: $('#no') };
  const skipBtn = $('#skip');

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- condensation on the hero can (photo coordinates: 23.6..176.4 × 0..400) ---------- */

  (function condensation() {
    const r = rng(3);
    let s = `<defs>
      <radialGradient id="drop" cx=".45" cy=".42" r=".62">
        <stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset=".55" stop-color="#fff" stop-opacity=".12"/>
        <stop offset=".78" stop-color="#ffe6c8" stop-opacity=".35"/><stop offset=".9" stop-color="#3a0a00" stop-opacity=".35"/>
        <stop offset="1" stop-color="#1a0500" stop-opacity=".55"/></radialGradient>
      <filter id="mist" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="7"/>
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3.4 0 0 0 -1.9"/></filter></defs>
      <rect x="27" y="10" width="146" height="372" filter="url(#mist)" opacity=".2"/>`;
    for (let i = 0; i < 190; i++) {
      const cx = 27 + r() * 146, cy = 12 + r() * 368;
      const rad = 0.4 + Math.pow(r(), 3.2) * 2.8, rx = rad * (0.85 + r() * 0.2), ry = rad * (1 + r() * 0.25);
      s += `<ellipse cx="${(cx + rad * .12).toFixed(1)}" cy="${(cy + rad * .2).toFixed(1)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="#2a0600" fill-opacity=".22"/>` +
        `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="url(#drop)"/>` +
        `<ellipse cx="${(cx - rx * .34).toFixed(1)}" cy="${(cy - ry * .4).toFixed(1)}" rx="${(rx * .26).toFixed(2)}" ry="${(ry * .2).toFixed(2)}" fill="#fff" fill-opacity=".95"/>`;
    }
    $('.drops', hero).innerHTML = s;
  })();

  /* ---------- battery meter on the can's own "=" bars ---------- */

  const BAR = { x: 0.1702, w: 0.2448 };
  let level = 8;
  function setLevel(v) {
    level = v;
    const f = Math.max(0, Math.min(v, 100)) / 100;
    $$('.meter .cover', hero).forEach((r) => { r.setAttribute('x', BAR.x + BAR.w * f); r.setAttribute('width', BAR.w * (1 - f)); });
    $$('.meter .red', hero).forEach((r) => r.setAttribute('width', v < 20 ? BAR.w * f : 0));
    stage.classList.toggle('low', v < 20);
  }
  function tweenLevel(to, ms, tick) {
    const from = level, t0 = performance.now();
    let last = -1;
    if (RM) { setLevel(to); return Promise.resolve(); }
    return new Promise((res) => {
      (function step(now) {
        const k = Math.min((now - t0) / ms, 1), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
        setLevel(v);
        if (tick && Math.floor(v / 10) !== last) { last = Math.floor(v / 10); tick(v); }
        if (k < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }

  /* ---------- sound: unlocked by the first tap, synthesized with Web Audio ---------- */

  let AC = null, master = null, noiseBuf = null, soundOn = true;

  function ac() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!AC) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      AC = new Ctx();
      const comp = AC.createDynamicsCompressor();
      master = AC.createGain();
      master.gain.value = soundOn ? 0.7 : 0;
      master.connect(comp).connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state !== 'running') {
      AC.resume().catch(() => {});
      const src = AC.createBufferSource();
      src.buffer = AC.createBuffer(1, 1, 22050);
      src.connect(AC.destination);
      src.start(0);
    }
    return AC;
  }

  function canPlay() {
    if (!soundOn || !AC || AC.state === 'closed') return false;
    if (AC.state !== 'running') AC.resume().catch(() => {});
    return true;
  }

  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) =>
    addEventListener(ev, () => { if (soundOn && (!AC || AC.state !== 'running')) ac(); }, { capture: true, passive: true })
  );

  const soundBtn = $('#sound');
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? 'Lyd: på' : 'Lyd: av';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    if (soundOn) ac();
    if (master) master.gain.setTargetAtTime(soundOn ? 0.7 : 0, AC.currentTime, 0.05);
  });

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function noise(t, dur, filterType, freq, q, peak, attack, out = master) {
    const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    src.buffer = noiseBuf;
    f.type = filterType; f.frequency.value = freq; if (q) f.Q.value = q;
    env(g, t, attack, peak, dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 1.5, attack + dur + 0.05);
    return f;
  }

  function tone(t, type, f0, f1, dur, peak, attack = 0.005, out = master) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, attack, peak, dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + attack + dur + 0.05);
    return o;
  }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* --- music bed: Am – F – C – G at 104 bpm --- */
  const Music = { section: 'off', step: 0, next: 0, timer: 0, bus: null, lp: null };
  const SIX = 60 / 104 / 4;
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];

  function musicStart() {
    if (!AC || Music.timer) return;
    Music.bus = AC.createGain();
    Music.bus.gain.value = 0.5;
    Music.lp = AC.createBiquadFilter();
    Music.lp.type = 'lowpass';
    Music.lp.frequency.value = 2500;
    Music.bus.connect(Music.lp).connect(master);
    Music.next = AC.currentTime + 0.08;
    Music.step = 0;
    Music.timer = setInterval(musicTick, 25);
  }

  function musicSet(sec) {
    Music.section = sec;
    if (!Music.lp) return;
    const t = AC.currentTime, f = Music.lp.frequency;
    const target = sec === 'sad' ? 520 : sec === 'intro' ? 2500 : sec === 'build' ? 7000 : 18000;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(target, t + (sec === 'sad' ? 2.5 : 0.6));
  }

  function musicTick() {
    if (!AC) return;
    if (Music.next < AC.currentTime) Music.next = AC.currentTime + 0.02;
    while (Music.next < AC.currentTime + 0.15) {
      musicStep(Music.step, Music.next);
      Music.next += SIX;
      Music.step++;
    }
  }

  function musicStep(st, t) {
    const sec = Music.section;
    if (sec === 'off' || !soundOn) return;
    const s = st % 16, bar = Math.floor(st / 16), ch = CHORDS[bar % 4], out = Music.bus;
    if (s === 0) pad(t, ch, sec === 'sad' ? 0.05 : 0.07);
    if (sec === 'sad') { if (s === 0 || s === 10) pluck(t, ch[bar % 3] + 12, 0.05); return; }
    if (sec === 'intro') {
      if (s === 0 || s === 10) kick(t, 0.5);
      if (s % 4 === 2) noise(t, 0.04, 'highpass', 8000, 0, 0.03, 0.002, out);
      return;
    }
    if (s % 4 === 0) kick(t, 0.75);
    if (sec === 'drop') {
      if (s === 4 || s === 12) noise(t, 0.16, 'bandpass', 1600, 0.8, 0.35, 0.002, out);
      if (s % 2 === 1) noise(t, 0.035, 'highpass', 8000, 0, 0.06, 0.002, out);
      if (s % 4 === 2) noise(t, 0.18, 'highpass', 7000, 0, 0.08, 0.002, out);
      if (s % 2 === 0) bass(t, ch[0] - 24, 0.22);
      if (s === 14 || s === 7) pluck(t, ch[(s >> 2) % 3] + 12, 0.06);
    } else {
      if (s % 4 === 2) noise(t, 0.04, 'highpass', 8000, 0, 0.06, 0.002, out);
      if (s === 0 || s === 6 || s === 10) bass(t, ch[0] - 24, 0.18);
      if (s === 12) noise(t, 0.14, 'bandpass', 1600, 0.8, 0.18, 0.002, out);
    }
  }

  function kick(t, v) { tone(t, 'sine', 150, 42, 0.32, v, 0.003, Music.bus); }

  function bass(t, m, v) {
    const o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.value = mtof(m);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + 0.2);
    env(g, t, 0.005, v, 0.22);
    o.connect(f).connect(g).connect(Music.bus);
    o.start(t); o.stop(t + 0.3);
  }

  function pluck(t, m, v) { tone(t, 'triangle', mtof(m), mtof(m), 0.6, v, 0.004, Music.bus); }

  function pad(t, notes, v) {
    const len = 16 * SIX;
    const f = AC.createBiquadFilter(), g = AC.createGain();
    f.type = 'lowpass'; f.frequency.value = 1300;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.5);
    g.gain.setValueAtTime(v, t + len - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.4);
    f.connect(g).connect(Music.bus);
    notes.forEach((m) => [-7, 7].forEach((det) => {
      const o = AC.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + len + 0.5);
    }));
  }

  /* --- sound effects --- */
  const sfx = {
    whoosh() {
      if (!canPlay()) return;
      const t = AC.currentTime, f = noise(t, 0.55, 'bandpass', 400, 1.2, 0.35, 0.18);
      f.frequency.setValueAtTime(350, t);
      f.frequency.exponentialRampToValueAtTime(2600, t + 0.3);
      f.frequency.exponentialRampToValueAtTime(500, t + 0.7);
    },
    ice() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      for (let i = 0; i < 9; i++) {
        const ti = t + i * rand(0.025, 0.07);
        noise(ti, 0.03, 'bandpass', rand(2500, 6000), 4, 0.25, 0.001);
        tone(ti, 'sine', rand(2800, 5200), rand(2600, 5000), 0.09, 0.05);
      }
    },
    psst() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      tone(t, 'square', 1400, 900, 0.03, 0.12);
      const f = noise(t + 0.02, 0.7, 'highpass', 6000, 0, 0.45, 0.01);
      f.frequency.exponentialRampToValueAtTime(2500, t + 0.7);
    },
    glug(ms) {
      if (!canPlay()) return;
      const t = AC.currentTime;
      for (let i = 0; i * 0.15 < ms / 1000; i++) {
        const ti = t + i * 0.15 + rand(-0.02, 0.02);
        tone(ti, 'sine', rand(150, 210), rand(90, 120), 0.1, 0.22, 0.01);
        noise(ti, 0.12, 'lowpass', 700, 0, 0.18, 0.01);
      }
      noise(t, ms / 1000, 'bandpass', 1800, 0.6, 0.08, 0.2);
    },
    fizz(ms) {
      if (!canPlay()) return;
      noise(AC.currentTime, ms / 1000, 'highpass', 5000, 0, 0.3, 0.03);
    },
    boom() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      tone(t, 'sine', 140, 28, 1.1, 1, 0.01);
      const f = noise(t, 1.3, 'lowpass', 4000, 0, 0.6, 0.005);
      f.frequency.exponentialRampToValueAtTime(200, t + 1.2);
    },
    hit() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      tone(t, 'sine', 110, 35, 0.6, 0.7, 0.005);
      noise(t, 0.5, 'lowpass', 2500, 0, 0.3, 0.003);
    },
    splash() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      tone(t, 'sine', 120, 45, 0.35, 0.6, 0.003);
      const f = noise(t, 0.9, 'bandpass', 2400, 0.7, 0.55, 0.004);
      f.frequency.exponentialRampToValueAtTime(700, t + 0.8);
      noise(t + 0.05, 1.1, 'highpass', 5000, 0, 0.18, 0.05);
      for (let i = 0; i < 10; i++) tone(t + 0.15 + i * rand(0.04, 0.09), 'sine', rand(900, 2200), rand(700, 1600), 0.05, 0.05);
    },
    thud() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      tone(t, 'sine', 95, 40, 0.3, 0.6);
      tone(t + 0.02, 'triangle', 900, 700, 0.25, 0.08);
      noise(t, 0.15, 'lowpass', 400, 0, 0.3, 0.003);
    },
    powerDown() {
      if (!canPlay()) return;
      const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 2.2);
      f.type = 'lowpass'; f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(140, t + 2.2);
      g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o.connect(f).connect(g).connect(master);
      o.start(t); o.stop(t + 2.5);
    },
    blip(freq, v = 0.06) {
      if (!canPlay()) return;
      tone(AC.currentTime, 'square', freq, freq, 0.07, v, 0.003);
    },
  };

  /* ---------- cold smoke rolling over the floor ---------- */

  const smoke = $('#smoke'), sg = smoke.getContext('2d');
  function wispSprite(seed) {
    const r = rng(seed), w = 220, h = 300, c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.filter = 'blur(14px)';
    // a low, wide bank of fog: blobs spread sideways, thinning upwards
    for (let i = 0; i < 70; i++) {
      const t = Math.pow(r(), 1.6), y = h * (0.92 - t * 0.6);
      const x = w * (0.1 + r() * 0.8);
      const rad = (22 + r() * 40) * (1 - t * 0.3), a = 0.045 * (1 - t * 0.7);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(235,240,255,${a.toFixed(3)})`);
      gr.addColorStop(1, 'rgba(235,240,255,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    return c;
  }
  const WISPS = [1, 2, 3, 4, 5].map(wispSprite);
  const puffs = [];
  let smokeRate = 0, smokeLoop = 0, lastT = 0, W = 0, H = 0;

  function sizeSmoke() {
    // half resolution is plenty for soft smoke and keeps it cheap on phones
    W = smoke.clientWidth; H = smoke.clientHeight;
    smoke.width = Math.round(W / 2); smoke.height = Math.round(H / 2);
    sg.setTransform(0.5, 0, 0, 0.5, 0, 0);
  }
  addEventListener('resize', sizeSmoke);
  sizeSmoke();

  function floorY() { const r = camera.getBoundingClientRect(), s = smoke.getBoundingClientRect(); return r.bottom - s.top; }

  function puff(x, y, o = {}) {
    puffs.push({ img: WISPS[(Math.random() * WISPS.length) | 0], x, y, vx: o.vx ?? rand(-0.25, 0.25), vy: o.vy ?? -rand(0.15, 0.45),
      s: o.s ?? rand(0.9, 1.6), gs: o.gs ?? 0.0015, rot: rand(-0.4, 0.4), vr: rand(-0.002, 0.002), life: 1, decay: o.decay ?? rand(0.003, 0.005), a: o.a ?? rand(0.5, 1) });
  }

  function smokeFrame(now) {
    const k = lastT ? Math.min((now - lastT) / 16.7, 4) : 1;
    lastT = now;
    if (Math.random() < smokeRate * k && puffs.length < 40) {
      const fy = floorY();
      puff(rand(-0.1, 1.1) * W, fy + rand(0, 30), { vx: rand(-0.5, 0.5), vy: -rand(0.02, 0.12), s: rand(1.6, 2.8), decay: rand(0.002, 0.0035), a: rand(0.4, 0.8) });
    }
    sg.clearRect(0, 0, W, H);
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.x += p.vx * k; p.y += p.vy * k; p.s += p.gs * k; p.rot += p.vr * k; p.life -= p.decay * k;
      if (p.life <= 0) { puffs.splice(i, 1); continue; }
      const w = p.img.width * p.s, h = p.img.height * p.s;
      sg.globalAlpha = Math.sin(p.life * Math.PI) * p.a;
      sg.save(); sg.translate(p.x, p.y); sg.rotate(p.rot * 0.25); sg.drawImage(p.img, -w, -h * 0.8, w * 2, h * 0.8); sg.restore();
    }
    sg.globalAlpha = 1;
    // stop drawing when there is nothing to draw, nothing coming, or the tab is hidden
    if ((puffs.length || smokeRate) && !document.hidden) smokeLoop = requestAnimationFrame(smokeFrame);
    else smokeLoop = 0;
  }
  function smokeOn(rate) {
    smokeRate = RM ? 0 : rate;
    if (!smokeLoop && !RM) { lastT = 0; smokeLoop = requestAnimationFrame(smokeFrame); }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (smokeRate || puffs.length)) smokeOn(smokeRate); });

  /* ---------- camera: hard cuts and slow pushes, like a product film ---------- */

  let camAnim = null;
  function shot(name, from, to, ms) {
    stage.dataset.shot = name;
    if (camAnim) camAnim.cancel();
    camera.style.transformOrigin = from.origin || '50% 60%';
    if (RM || !to) { camera.style.transform = (RM && to) || from.t || 'none'; return; }
    camAnim = camera.animate([{ transform: from.t }, { transform: to }], { duration: ms, easing: 'cubic-bezier(.3,0,.3,1)', fill: 'forwards' });
  }

  // where on the camera box a point of the hero can sits, for zooming into it
  function heroPoint(fx, fy) {
    if (camAnim) { camAnim.cancel(); camAnim = null; }
    camera.style.transform = 'none';
    const c = camera.getBoundingClientRect(), h = hero.getBoundingClientRect();
    return { x: h.left - c.left + h.width * fx, y: h.top - c.top + h.height * fy, w: h.width, vw: innerWidth };
  }

  function show(id) {
    Object.entries(panels).forEach(([k, el]) => { el.hidden = k !== id; if (k === id && !RM) { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); } });
  }
  function textOn(el, on) { el.classList.toggle('on', on); if (on && !RM) { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); } }

  /* ---------- the film ---------- */

  let run = 0, busy = false;

  function packshot() {
    run++;
    stage.classList.remove('filming', 'sweeping', 'charged', 'dark');
    textOn(kicker, false); textOn(title, false);
    skipBtn.hidden = true;
    shot('pack', { t: 'scale(1.05)', origin: '50% 70%' }, 'none', 1400);
    setLevel(8);
    smokeOn(0.05);
    resetChoices();
    show('ask');
    status.textContent = 'Er du klar? Velg ja eller nei.';
  }

  async function film() {
    if (RM) { packshot(); return; }
    const me = ++run;
    const alive = () => me === run;
    busy = true;
    stage.classList.add('filming');
    stage.classList.remove('charged', 'dark', 'sweeping');
    Object.values(panels).forEach((p) => { p.hidden = true; });
    textOn(kicker, false); textOn(title, false);
    skipBtn.hidden = false;
    setLevel(8);

    // 1 · black, then the three cans; a light sweeps across them while smoke rolls in
    shot('black', { t: 'none' });
    await sleep(350); if (!alive()) return;
    smokeOn(0.12);
    shot('trio', { t: 'scale(1.14)', origin: '50% 75%' }, 'scale(1.02)', 1900);
    await sleep(450); if (!alive()) return;
    stage.classList.add('sweeping');
    sfx.whoosh();
    await sleep(1250); if (!alive()) return;

    // 2 · macro: the "+" and the condensation, slow push
    stage.classList.remove('sweeping');
    let p = heroPoint(0.38, 0.3);
    const macro = (p.vw * 0.95) / p.w;
    shot('macro', { t: `scale(${macro})`, origin: `${p.x}px ${p.y}px` }, `scale(${macro * 1.07}) translateY(1.5%)`, 1300);
    textOn(kicker, true);
    await sleep(1250); if (!alive()) return;

    // 3 · the top of the can: side light, a cold breath as it opens
    p = heroPoint(0.5, 0.03);
    const top = (p.vw * 0.8) / p.w;
    shot('top', { t: `scale(${top})`, origin: `${p.x}px ${p.y}px` }, `scale(${top * 1.05})`, 1000);
    sfx.psst();
    const sr = smoke.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    for (let i = 0; i < 5; i++) puff(hr.left - sr.left + hr.width / 2 + rand(-20, 20), sr.height * 0.5, { vy: -rand(0.6, 1.2), s: rand(0.8, 1.3), decay: 0.012 });
    await sleep(1000); if (!alive()) return;

    // 4 · the title, big, over the hero can
    textOn(kicker, false);
    shot('type', { t: 'scale(1.3)', origin: '50% 55%' }, 'scale(1.22)', 1400);
    textOn(title, true);
    sfx.hit();
    await sleep(1400); if (!alive()) return;

    // 5 · a beat of black, then the packshot and the question
    textOn(title, false);
    shot('black', { t: 'none' });
    await sleep(260); if (!alive()) return;
    busy = false;
    packshot();
  }

  /* ---------- answers ---------- */

  function resetChoices() {
    $$('.choice').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $('.choices').classList.remove('locked');
  }

  async function answer(btn) {
    if (busy) return;
    busy = true;
    const yes = btn.dataset.answer === 'ja';
    btn.setAttribute('aria-pressed', 'true');
    $('.choices').classList.add('locked');
    musicStart();
    sfx.blip(yes ? 1200 : 300, 0.12);
    await sleep(RM ? 0 : 450);
    panels.ask.hidden = true;
    if (yes) {
      musicSet('drop');
      sfx.psst();
      stage.classList.add('sweeping');
      smokeOn(0.2);
      await tweenLevel(100, 1300, (v) => sfx.blip(320 + v * 6, 0.05));
      stage.classList.add('charged');
      sfx.hit();
      show('yes');
      status.textContent = 'Fullt ladet! Batteriet er byttet. Skål!';
      smokeOn(0.06);
      $('#again').focus({ preventScroll: true });
    } else {
      musicSet('sad');
      sfx.powerDown();
      smokeOn(0.03);
      stage.classList.add('dark');
      await tweenLevel(0, 1800);
      show('no');
      status.textContent = 'Lavt batteri. Helt greit, vi venter til du er klar.';
      $('#retry').focus({ preventScroll: true });
    }
    stage.classList.remove('sweeping');
    busy = false;
  }

  $$('.choice').forEach((b) => b.addEventListener('click', () => answer(b)));
  $('#again').addEventListener('click', () => { busy = false; film(); });
  $('#retry').addEventListener('click', () => {
    musicSet('build');
    stage.classList.remove('dark');
    packshot();
    $('.choice.yes').focus({ preventScroll: true });
  });
  skipBtn.addEventListener('click', () => { busy = false; packshot(); $('.choice.yes').focus({ preventScroll: true }); });

  const start = () => film();
  const img = $('img', hero);
  (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; }))
    .then(() => (document.fonts ? Promise.race([document.fonts.ready, sleep(800)]) : null))
    .then(start);
})();
