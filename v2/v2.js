(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const K = RM ? 0.35 : 1;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const world = $('#world');
  const camera = $('#camera');

  /* ================================================================
     Artwork: cans with condensation, ice, bubbles, pull tabs
     ================================================================ */

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const CAN_KINDS = {
    a:     { box: '0 0 200 400', drops: 170, area: [22, 44, 178, 358], seed: 1 },
    b:     { box: '0 0 200 400', drops: 170, area: [22, 44, 178, 358], seed: 2 },
    pack:  { box: '0 0 200 400', drops: 190, area: [22, 44, 178, 358], seed: 3 },
    side:  { box: '0 0 200 400', drops: 40,  area: [22, 44, 178, 358], seed: 4 },
    pour:  { box: '0 0 200 400', drops: 230, area: [22, 20, 178, 358], seed: 5 },
    macro: { box: '30 120 140 200', drops: 300, area: [30, 120, 170, 320], seed: 6, big: true },
  };

  function dropsMarkup(k) {
    const r = rng(k.seed);
    const [x0, y0, x1, y1] = k.area;
    let s = '';
    for (let i = 0; i < k.drops; i++) {
      const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0);
      const rad = (k.big ? 0.3 : 0.4) + Math.pow(r(), 3.2) * (k.big ? 3.4 : 2.8);
      const rx = rad * (0.85 + r() * 0.2), ry = rad * (1 + r() * 0.25);
      const run = rad > 1.5 && r() < 0.16;
      const style = run ? ` class="run" style="--t:${(5 + r() * 6).toFixed(1)}s;--d:${(-r() * 8).toFixed(1)}s;--dy:${(60 + r() * 140) | 0}px"` : '';
      // Wet trail left by a drop that has already run
      if (rad > 1.2 && r() < 0.22) {
        s += `<rect x="${(cx - rx * 0.55).toFixed(1)}" y="${(cy - 18 - r() * 40).toFixed(1)}" width="${(rx * 1.1).toFixed(2)}" height="${(18 + r() * 40).toFixed(0)}" rx="${(rx * 0.5).toFixed(2)}" fill="#fff" fill-opacity=".07"/>`;
      }
      s += `<g${style}>` +
        `<ellipse cx="${(cx + rad * 0.12).toFixed(1)}" cy="${(cy + rad * 0.2).toFixed(1)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="#2a0600" fill-opacity=".22"/>` +
        `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="url(#c-drop)"/>` +
        `<ellipse cx="${(cx - rx * 0.34).toFixed(1)}" cy="${(cy - ry * 0.4).toFixed(1)}" rx="${(rx * 0.26).toFixed(2)}" ry="${(ry * 0.2).toFixed(2)}" fill="#fff" fill-opacity=".95"/>` +
        (rad > 1 ? `<path d="M${(cx - rx * 0.5).toFixed(1)} ${(cy + ry * 0.45).toFixed(1)} Q${cx.toFixed(1)} ${(cy + ry * 0.85).toFixed(1)} ${(cx + rx * 0.5).toFixed(1)} ${(cy + ry * 0.45).toFixed(1)}" fill="none" stroke="#fff3d6" stroke-opacity=".55" stroke-width="${(rad * 0.16).toFixed(2)}" stroke-linecap="round"/>` : '') +
        `</g>`;
    }
    return s;
  }

  function canSVG(kind) {
    const k = CAN_KINDS[kind];
    const [mx0, my0, mx1, my1] = k.area;
    return `<svg viewBox="${k.box}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M20 42 L32 18 Q100 8 168 18 L180 42 Z" fill="url(#c-lid)"/>
      <path d="M20 42 L32 18 Q100 8 168 18 L180 42 Z" fill="url(#c-vshade)" opacity=".6"/>
      <ellipse cx="100" cy="17" rx="68" ry="9" fill="url(#c-lid)"/>
      <ellipse cx="100" cy="17" rx="63" ry="7.2" fill="#8d939b"/>
      <ellipse cx="100" cy="17.6" rx="57" ry="6" fill="url(#c-lid)" opacity=".9"/>
      <ellipse cx="100" cy="17.6" rx="57" ry="6" fill="none" stroke="#3a3d42" stroke-width=".8"/>
      <ellipse cx="100" cy="17" rx="67" ry="8.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/>
      <g class="tab">
        <rect x="84" y="10" width="34" height="12" rx="6" fill="url(#c-lid)" stroke="#55595f" stroke-width=".8"/>
        <rect x="88" y="13" width="12" height="6" rx="3" fill="#2a2c30"/>
        <circle cx="109" cy="16" r="2.4" fill="#55595f"/>
      </g>
      <rect x="20" y="40" width="160" height="322" fill="url(#c-paint)"/>
      <g clip-path="url(#c-body)">
        <text x="74" y="62" text-anchor="middle" font-family="Inter, sans-serif" font-size="8" font-weight="700" fill="#4a2c10" fill-opacity=".75" letter-spacing="1.5">EXOTIC FRUIT</text>
        <rect x="57" y="74" width="32" height="110" fill="#111"/>
        <rect x="8" y="113" width="130" height="32" fill="#111"/>
        <rect x="24" y="198" width="104" height="17" fill="none" stroke="#111" stroke-width="3"/>
        <rect x="24" y="224" width="104" height="17" fill="none" stroke="#111" stroke-width="3"/>
        <rect class="lvl" x="24" y="198" width="104" height="17" fill="#111"/>
        <rect class="lvl" x="24" y="224" width="104" height="17" fill="#111"/>
        <text transform="translate(144 64) rotate(90)" font-family="Russo One, sans-serif" font-size="40" fill="#111" letter-spacing="1">BATTERY</text>
        <text transform="translate(118 252) rotate(90)" font-family="Russo One, sans-serif" font-size="21" fill="#fff" letter-spacing="3">FRESH</text>
        <rect x="20" y="40" width="160" height="322" fill="url(#c-metal)"/>
        <rect x="20" y="40" width="160" height="322" fill="url(#c-vshade)"/>
        <rect x="${mx0}" y="${my0}" width="${mx1 - mx0}" height="${my1 - my0}" filter="url(#c-mist)" opacity="${k.big ? 0.16 : 0.24}"/>
        ${dropsMarkup(k)}
      </g>
      <path d="M20 360 L32 386 Q100 396 168 386 L180 360 Z" fill="url(#c-lid)"/>
      <path d="M20 360 L32 386 Q100 396 168 386 L180 360 Z" fill="url(#c-vshade)" opacity=".7"/>
      <circle class="mouth" cx="100" cy="13" r="1" fill="none"/>
    </svg>`;
  }

  $$('[data-can]').forEach((el) => { el.innerHTML = canSVG(el.dataset.can); });

  function iceMarkup(front) {
    const r = rng(front ? 11 : 12);
    let s = '';
    const n = front ? 11 : 9;
    for (let i = 0; i < n; i++) {
      const x = 30 + (i + r() * 0.8) * (640 / n), y = front ? 95 + r() * 55 : 60 + r() * 40;
      const w = (front ? 64 : 56) + r() * 34, h = w * (0.75 + r() * 0.35), rot = (r() - 0.5) * 70, rr = w * 0.22;
      const x0 = -w / 2, y0 = -h / 2;
      s += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot.toFixed(0)})">` +
        `<g class="cube" style="--jx:${((r() - 0.5) * 30).toFixed(0)}px;--jr:${((r() - 0.5) * 40).toFixed(0)}deg;--d:${(r() * 0.15).toFixed(2)}s">` +
        // clear body with a frosted core and a faint red refraction of the backdrop
        `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${rr}" fill="url(#ice)"/>` +
        `<ellipse cx="${(w * 0.05).toFixed(1)}" cy="${(h * 0.08).toFixed(1)}" rx="${(w * 0.32).toFixed(1)}" ry="${(h * 0.28).toFixed(1)}" fill="url(#ice-core)"/>` +
        `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${rr}" filter="url(#c-mist)" opacity=".18"/>` +
        // bevelled edges: bright rim on top/left, soft inner bevel
        `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${rr}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6"/>` +
        `<rect x="${x0 + 6}" y="${y0 + 6}" width="${w - 12}" height="${h - 12}" rx="${rr * 0.7}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="3"/>` +
        `<path d="M${x0 + rr} ${y0 + 2} L${-x0 - rr} ${y0 + 2} M${x0 + 2} ${y0 + rr} L${x0 + 2} ${-y0 - rr}" stroke="#fff" stroke-opacity=".95" stroke-width="2.4" stroke-linecap="round"/>` +
        `<path d="M${(x0 + w * 0.25).toFixed(1)} ${(y0 + h * 0.3).toFixed(1)} l${(w * 0.22).toFixed(1)} ${(h * 0.18).toFixed(1)} l${(w * 0.12).toFixed(1)} ${(h * 0.3).toFixed(1)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>` +
        `<ellipse cx="${(-x0 - w * 0.22).toFixed(1)}" cy="${(-y0 - h * 0.2).toFixed(1)}" rx="${(w * 0.08).toFixed(1)}" ry="${(h * 0.05).toFixed(1)}" fill="#fff" fill-opacity=".8"/>` +
        `<circle cx="${(w * 0.1).toFixed(1)}" cy="${(-h * 0.36).toFixed(1)}" r="${(1.4 + r() * 2).toFixed(1)}" fill="#fff" fill-opacity=".9"/>` +
        `</g></g>`;
    }
    return s;
  }
  $('[data-ice="back"]').innerHTML = iceMarkup(false);
  $('[data-ice="front"]').innerHTML = iceMarkup(true);

  (function bucketDrops() {
    const r = rng(21);
    let s = '';
    for (let i = 0; i < 70; i++) {
      const x = 70 + r() * 560, y = 90 + r() * 420, rad = 0.8 + Math.pow(r(), 3) * 4;
      s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(1)}" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-opacity=".18"/>` +
        `<circle cx="${(x - rad * 0.3).toFixed(1)}" cy="${(y - rad * 0.35).toFixed(1)}" r="${(rad * 0.3).toFixed(1)}" fill="#fff" fill-opacity=".7"/>`;
    }
    $('.bucketDrops').innerHTML = s;
  })();

  (function glassBits() {
    const r = rng(31);
    let b = '';
    // fine bubbles rising in thin streams, like a freshly poured glass
    for (let i = 0; i < 110; i++) {
      const lane = 50 + ((i % 9) / 8) * 260 + (r() - 0.5) * 16;
      b += `<circle class="bub" cx="${lane.toFixed(0)}" cy="${(320 + r() * 380).toFixed(0)}" r="${(0.8 + Math.pow(r(), 2) * 2.6).toFixed(1)}" fill="#fffbe8" fill-opacity=".85" style="--t:${(2 + r() * 2.5).toFixed(1)}s;--d:${(-r() * 5).toFixed(1)}s;--dx:${((r() - 0.5) * 10).toFixed(0)}px"/>`;
    }
    $('.glass .bubbles').innerHTML = b;
    let f = '';
    for (let i = 0; i < 90; i++) {
      const fx = 20 + r() * 320, fy = 20 + r() * 80, fr = 1.5 + Math.pow(r(), 2) * 7;
      f += `<circle cx="${fx.toFixed(0)}" cy="${fy.toFixed(0)}" r="${fr.toFixed(1)}" fill="#fff" fill-opacity=".35" stroke="#cdb489" stroke-opacity=".45" stroke-width=".8"/>`;
    }
    $('.glass .foamBubbles').innerHTML = f;
    let d = '';
    for (let i = 0; i < 120; i++) {
      const y = 130 + r() * 560, t = (y / 700), x = 20 + t * 38 + r() * (320 - t * 76);
      const rad = 0.8 + Math.pow(r(), 3) * 5;
      d += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${rad.toFixed(1)}" ry="${(rad * 1.15).toFixed(1)}" fill="url(#c-drop)"/>` +
        `<ellipse cx="${(x - rad * 0.35).toFixed(1)}" cy="${(y - rad * 0.4).toFixed(1)}" rx="${(rad * 0.25).toFixed(1)}" ry="${(rad * 0.18).toFixed(1)}" fill="#fff" fill-opacity=".9"/>`;
    }
    $('.glass .glassDrops').innerHTML = d;
    $$('.drip').forEach((el, i) => el.style.setProperty('--d', (0.5 + i * 0.35) + 's'));

    const tabs = [[120, 70, -20], [330, 120, 35], [640, 60, 160], [820, 130, -60]];
    $('.tabs').innerHTML = tabs.map(([x, y, a]) =>
      `<g transform="translate(${x} ${y}) rotate(${a}) scale(2.2)">` +
      `<rect x="-14" y="-8" width="28" height="16" rx="8" fill="url(#c-silver)" stroke="#3a3d42"/>` +
      `<rect x="-4" y="-4" width="12" height="8" rx="4" fill="#0b0b0d"/>` +
      `<circle cx="-8" cy="0" r="2" fill="#3a3d42"/></g>`).join('');
  })();

  (function grain() {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d'), img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    $('#grain').style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  /* ================================================================
     Layout: scale the 1000×1600 world to the viewport
     ================================================================ */

  const cv = $('#fx'), cx = cv.getContext('2d');
  let W = 0, H = 0, S = 1, DPR = 1;

  function layout() {
    W = innerWidth; H = innerHeight;
    S = Math.min(W / 800, H / 1500);
    world.style.transform = `translate(${(W - 1000 * S) / 2}px, ${(H - 1600 * S) / 2}px) scale(${S})`;
    DPR = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * DPR; cv.height = H * DPR;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  addEventListener('resize', layout);
  layout();

  /* ================================================================
     Audio: unlock, synthesized music bed and sound effects
     ================================================================ */

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
    soundBtn.textContent = soundOn ? '🔊 Lyd: PÅ' : '🔇 Lyd: AV';
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

  /* ================================================================
     Liquid: drops, pour streams, swirl
     ================================================================ */

  const L = [];

  // Pre-rendered glossy droplets: amber body, dark rim, sharp specular, caustic glow
  function sprite(core, edge, rim, foam = false) {
    const n = 64, r = n / 2, c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    const body = g.createRadialGradient(r * 0.8, r * 0.75, r * 0.05, r, r, r);
    body.addColorStop(0, core);
    body.addColorStop(0.68, edge);
    body.addColorStop(0.9, rim);
    body.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = body;
    g.beginPath(); g.arc(r, r, r * 0.98, 0, Math.PI * 2); g.fill();
    if (!foam) {
      const ca = g.createRadialGradient(r * 1.12, r * 1.42, 0, r * 1.12, r * 1.42, r * 0.55);
      ca.addColorStop(0, 'rgba(255,246,205,.85)');
      ca.addColorStop(1, 'rgba(255,246,205,0)');
      g.fillStyle = ca;
      g.beginPath(); g.arc(r, r, r * 0.9, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.beginPath(); g.ellipse(r * 0.66, r * 0.58, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2); g.fill();
    return c;
  }
  const DRINK = [
    sprite('rgba(255,222,130,.96)', 'rgba(246,150,44,.92)', 'rgba(150,50,14,.9)'),
    sprite('rgba(255,206,110,.96)', 'rgba(238,118,52,.92)', 'rgba(140,34,24,.9)'),
    sprite('rgba(255,232,160,.96)', 'rgba(250,170,60,.9)', 'rgba(160,70,20,.85)'),
  ];
  const FOAM = sprite('rgba(255,255,250,.98)', 'rgba(250,240,220,.85)', 'rgba(220,200,170,.4)', true);
  let lastFrame = 0;
  let pourCans = [];          // cans currently pouring into the bucket
  let streamOn = false;       // diagonal pour close-up
  let swirlOn = false;
  let sprayUntil = 0, SPRAY_MS = 3800;
  const V = [];               // swirl flecks

  function drop(x, y, vx, vy, r, foam = false) {
    if (L.length > 1200) return;
    L.push({ x, y, vx, vy, r, foam, img: foam ? FOAM : pick(DRINK), life: 1 });
  }

  function centerOf(el) {
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }

  function axis(canEl) {
    const m = centerOf($('.mouth', canEl)), c = centerOf(canEl);
    const dx = m.x - c.x, dy = m.y - c.y, len = Math.hypot(dx, dy) || 1;
    return { m, ux: dx / len, uy: dy / len };
  }

  function emit(k, now) {
    const G = 0.9 * S;
    if (now < sprayUntil) {
      const { m } = axis($('#packCan'));
      const left = (sprayUntil - now) / SPRAY_MS;
      const lift = Math.sqrt(2 * G * Math.max(m.y + 40, 120)) * (0.6 + 0.4 * left);
      const sway = Math.sin(now / 170) * 0.9 + Math.sin(now / 430) * 0.35;
      for (let i = 0; i < 11 * K * k * (0.35 + 0.65 * left); i++) {
        drop(m.x + rand(-4, 4) * S, m.y, (sway + rand(-0.12, 0.12)) * rand(3, 6) * S * 2, -lift * rand(0.75, 1.05), rand(2, 5) * S);
      }
      if (Math.random() < 0.5 * K) drop(m.x, m.y, rand(-1.5, 1.5) * S, -rand(2, 6) * S, rand(2, 6) * S, true);
    }
  }

  function updateDrops(k) {
    const G = 0.9 * S;
    const rimR = current && current.id === 'sBucket' ? $('#rimMark').getBoundingClientRect() : null;
    for (let i = L.length - 1; i >= 0; i--) {
      const d = L[i];
      d.vy += (d.foam ? 0.35 : 1) * G * k;
      d.x += d.vx * k; d.y += d.vy * k;
      if (d.foam) d.life -= 0.015 * k;
      if (rimR && d.vy > 0 && d.y > rimR.top && d.x > rimR.left && d.x < rimR.right) {
        if (!d.foam && Math.random() < 0.25) {
          for (let j = 0; j < 2; j++) drop(d.x, rimR.top - 2, rand(-2, 2) * S * 2, -rand(2, 6) * S * 2, rand(1.2, 3) * S);
          if (Math.random() < 0.3) drop(d.x, rimR.top - 4, rand(-1, 1) * S, -rand(1, 3) * S, rand(3, 8) * S, true);
        }
        L.splice(i, 1);
        continue;
      }
      if (d.y > H + 40 || d.life <= 0 || d.x < -80 || d.x > W + 80) { L.splice(i, 1); continue; }
      const sp = Math.hypot(d.vx, d.vy) || 0.001;
      const len = d.r * 2 * (1 + Math.min(sp / (9 * S + 0.1), 1.4)), wid = d.r * 2;
      const c = d.vx / sp, sn = d.vy / sp;
      cx.globalAlpha = d.foam ? Math.max(d.life, 0) : 1;
      cx.setTransform(DPR * c * len, DPR * sn * len, -DPR * sn * wid, DPR * c * wid, DPR * d.x, DPR * d.y);
      cx.drawImage(d.img, -0.5, -0.5, 1, 1);
    }
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.globalAlpha = 1;
  }

  // A pour stream as a glossy tube: overlapping droplet sprites along a ballistic path
  function streamPath(m, ux, uy, v0, stopY, now, seed) {
    const g = 0.9 * S, pts = [];
    for (let t = 0; t < 90; t += 1) {
      const amp = Math.min(t, 22) * 0.45 * S;
      const wob = Math.sin(t * 0.22 - now * 0.011 + seed) * amp + Math.sin(t * 0.7 - now * 0.026 + seed) * 2 * S;
      const x = m.x + ux * v0 * t - uy * wob, y = m.y + uy * v0 * t + 0.5 * g * t * t + ux * wob;
      pts.push([x, y]);
      if (y > stopY || y > H + 60 || x < -80 || x > W + 80) break;
    }
    return pts;
  }

  // Layered strokes give the stream a smooth cross-section: dark amber edge → golden core → glossy highlight
  const TUBE = [[1, '#8a2a10', 0.9], [0.88, '#d9661f', 0.95], [0.72, '#f39433', 1], [0.52, '#ffbf55', 1], [0.32, '#ffe08e', 0.95], [0.14, '#fff6d8', 0.9]];

  function drawTube(pts, w, now) {
    if (pts.length < 2) return;
    const trace = (ox = 0, oy = 0) => {
      cx.beginPath();
      cx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
      for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
    };
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    for (const [f, col, a] of TUBE) {
      trace(-w * (1 - f) * 0.12, -w * (1 - f) * 0.1);
      cx.globalAlpha = a;
      cx.strokeStyle = col;
      cx.lineWidth = w * f;
      cx.stroke();
    }
    // moving ripples and a sharp specular line sell the motion
    trace(-w * 0.2, -w * 0.14);
    cx.globalAlpha = 0.85;
    cx.strokeStyle = '#ffffff';
    cx.lineWidth = Math.max(w * 0.07, 1);
    cx.setLineDash([w * 0.9, w * 0.35]);
    cx.lineDashOffset = -now * 0.9 * S;
    cx.stroke();
    trace(w * 0.18, w * 0.1);
    cx.globalAlpha = 0.35;
    cx.strokeStyle = '#fff2c8';
    cx.lineWidth = Math.max(w * 0.05, 1);
    cx.setLineDash([w * 0.3, w * 0.6]);
    cx.lineDashOffset = -now * 1.3 * S;
    cx.stroke();
    cx.setLineDash([]);
    cx.globalAlpha = 1;
  }

  function drawPours(now, k) {
    const rim = $('#rimMark').getBoundingClientRect();
    pourCans.forEach((canEl, i) => {
      const { m, ux, uy } = axis(canEl);
      const pts = streamPath(m, ux, uy, 3.2 * S, rim.top, now, i * 2.1);
      drawTube(pts, 30 * S, now);
      const end = pts[pts.length - 1];
      for (let j = 0; j < 3 * K * k; j++) drop(end[0] + rand(-10, 10) * S, rim.top - 4, rand(-3, 3) * S * 2, -rand(3, 9) * S * 2, rand(2, 5.5) * S);
      if (Math.random() < 0.5 * k) drop(end[0] + rand(-14, 14) * S, rim.top - 6, rand(-1, 1) * S, -rand(1, 4) * S, rand(4, 10) * S, true);
    });
  }

  function drawStream(now) {
    const { m, ux, uy } = axis($('#sPour .pourCan'));
    const pts = streamPath(m, ux, uy, 17 * S, H + 80, now, 0);
    const w = 104 * S;
    drawTube(pts, w, now);
    for (let i = 0; i < 3 * K; i++) {
      const p = pts[(Math.random() * (pts.length - 1)) | 0];
      drop(p[0] + rand(-w, w) * 0.4, p[1], ux * 17 * S * rand(0.6, 1.1), uy * 10 * S + rand(-2, 2) * S, rand(3, 8) * S);
    }
  }

  function drawSwirl(k) {
    const el = $('.swirl'), b = el.getBoundingClientRect();
    const ox = b.left + b.width / 2, oy = b.top + b.height / 2, R = b.width / 2 * 0.62;
    for (let i = 0; i < 9 * K * k; i++) V.push({ a: rand(0, Math.PI * 2), r: R * rand(0.4, 1), w: rand(0.8, 2.4) });
    cx.globalAlpha = 0.38;
    cx.strokeStyle = '#fff1cf';
    cx.lineCap = 'round';
    for (const wv of [0, 1]) {
      cx.lineWidth = (wv ? 2.6 : 1.2) * Math.max(S * 2, 0.8);
      cx.beginPath();
      for (let i = V.length - 1; i >= 0; i--) {
        const f = V[i];
        if ((f.w > 1.6) !== !!wv) continue;
        const a0 = f.a;
        f.a += (R / (f.r + 20)) * 0.07 * k;
        f.r -= (f.r * 0.012 + 0.3) * k;
        if (f.r < R * 0.14) { V.splice(i, 1); continue; }
        cx.moveTo(ox + Math.cos(a0 - 0.08) * f.r, oy + Math.sin(a0 - 0.08) * f.r);
        cx.arc(ox, oy, f.r, a0 - 0.08, f.a);
      }
      cx.stroke();
    }
    cx.globalAlpha = 1;
  }

  function frame(now) {
    const k = lastFrame ? Math.min((now - lastFrame) / 16.7, 4) : 1;
    lastFrame = now;
    cx.clearRect(0, 0, W, H);
    emit(k, now);
    if (swirlOn) drawSwirl(k);
    if (streamOn) drawStream(now);
    if (pourCans.length) drawPours(now, k);
    updateDrops(k);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ================================================================
     Direction helpers: poses, cuts, camera, titles, panels
     ================================================================ */

  const canA = $('#canA'), canB = $('#canB'), packCan = $('#packCan');
  const HOME = new Map([[canA, { x: 0, y: 0, r: -7 }], [canB, { x: 0, y: 0, r: 5 }], [packCan, { x: 0, y: 0, r: 0 }]]);
  const tf = (p) => `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`;

  function setPose(el, p) {
    el.getAnimations().forEach((a) => a.cancel());
    el.style.transform = tf(p);
  }

  function moveTo(el, frames, ms, easing = 'cubic-bezier(.45,0,.2,1)') {
    const list = (Array.isArray(frames) ? frames : [frames]);
    const kf = [{ transform: el.style.transform || 'none' }, ...list.map((p) => ({ transform: tf(p), offset: p.o }))];
    const a = el.animate(kf, { duration: RM ? ms * 0.6 : ms, easing, fill: 'forwards' });
    return a.finished.then(() => { el.style.transform = tf(list[list.length - 1]); a.cancel(); }).catch(() => {});
  }

  let current = null, camAnim = null;

  function cut(id, dur = 420) {
    const next = $('#' + id), prev = current;
    sfx.whoosh();
    if (prev && prev !== next) {
      prev.animate([{ opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }, { opacity: 0, filter: RM ? 'none' : 'blur(14px)', transform: 'scale(1.12)' }],
        { duration: dur, easing: 'ease-in' }).finished.then(() => prev.classList.remove('on')).catch(() => {});
    }
    next.classList.add('on');
    next.animate([{ opacity: 0, filter: RM ? 'none' : 'blur(14px)', transform: 'scale(.92)' }, { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }],
      { duration: dur + 160, easing: 'cubic-bezier(.2,.8,.2,1)' });
    current = next;
  }

  function cam(from, to, ms, easing = 'ease-in-out') {
    if (camAnim) camAnim.cancel();
    camAnim = camera.animate([{ transform: from }, { transform: to }], { duration: RM ? 1 : ms, easing, fill: 'forwards' });
    return camAnim;
  }

  function shake(power = 14, dur = 500) {
    if (RM) return;
    const frames = [];
    for (let i = 0; i < 10; i++) {
      const f = 1 - i / 10;
      frames.push({ translate: `${rand(-power, power) * f}px ${rand(-power, power) * f}px` });
    }
    frames.push({ translate: '0 0' });
    world.animate(frames, { duration: dur, composite: 'add' });
  }

  function flash(strength = 0.8, dur = 400) {
    const f = document.createElement('div');
    f.style.cssText = 'position:fixed;inset:0;background:#fff;pointer-events:none;z-index:20';
    document.body.appendChild(f);
    f.animate([{ opacity: strength }, { opacity: 0 }], { duration: dur, easing: 'ease-out' }).finished.then(() => f.remove());
  }

  const t1 = $('#titles .t1'), t2 = $('#titles .t2');
  function title(el) { el.classList.remove('out'); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); }
  function hideTitles() { [t1, t2].forEach((el) => { if (el.classList.contains('in')) el.classList.add('out'); }); }
  function clearTitles() { [t1, t2].forEach((el) => el.classList.remove('in', 'out')); }

  function show(id) { $$('.panel').forEach((p) => p.classList.toggle('show', p.id === id)); }

  function setLevel(el, v) {
    const col = v < 20 ? '#ff2d55' : '#111';
    $$('.lvl', el).forEach((r) => { r.setAttribute('width', (104 * Math.max(0, Math.min(v, 100))) / 100); r.setAttribute('fill', col); });
    el.classList.toggle('low', v < 20);
  }

  function tweenLevel(el, from, to, ms, tick) {
    const t0 = performance.now();
    let last = -1;
    return new Promise((res) => {
      (function step(now) {
        const k = Math.min((now - t0) / ms, 1), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
        setLevel(el, v);
        if (tick && Math.floor(v / 10) !== last) { last = Math.floor(v / 10); tick(v); }
        if (k < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }

  /* ================================================================
     The film
     ================================================================ */

  let busy = false;
  const iceFront = $('.ice.front'), iceBack = $('.ice.back');

  function resetAll() {
    document.body.classList.remove('dim', 'party');
    $$('.scene').forEach((s) => { s.classList.remove('on'); s.getAnimations().forEach((a) => a.cancel()); });
    current = null;
    HOME.forEach((p, el) => setPose(el, p));
    [canA, canB, packCan].forEach((el) => { setLevel(el, 100); $('.tab', el).style.transform = ''; });
    iceFront.classList.remove('jostle'); iceBack.classList.remove('jostle');
    if (camAnim) camAnim.cancel();
    camera.style.transform = '';
    clearTitles();
    show(null);
    L.length = 0; V.length = 0;
    pourCans = []; streamOn = false; swirlOn = false; sprayUntil = 0;
    ['#againBtn', '#retryBtn'].forEach((b) => $(b).classList.remove('ready'));
  }

  function jostle() {
    [iceFront, iceBack].forEach((el) => { el.classList.remove('jostle'); void el.getBoundingClientRect(); el.classList.add('jostle'); });
    sfx.ice();
  }

  async function film() {
    busy = true;
    resetAll();
    musicSet('intro');

    // 1 · Hero: ice bucket, slow push-in
    cut('sBucket', 700);
    cam('scale(1)', 'scale(1.07) translateY(1%)', 3200);
    await sleep(2300);

    // Lift both cans out of the ice
    musicSet('build');
    jostle();
    await Promise.all([
      moveTo(canA, { x: -10, y: -380, r: -4 }, 900, 'cubic-bezier(.3,0,.2,1)'),
      moveTo(canB, { x: 10, y: -400, r: 3 }, 900, 'cubic-bezier(.3,0,.2,1)'),
    ]);
    for (const el of [canA, canB]) {
      const b = el.getBoundingClientRect();
      for (let i = 0; i < 6; i++) drop(b.left + b.width * rand(0.3, 0.7), b.bottom - 10, rand(-1, 1) * S, rand(0, 2) * S, rand(1.5, 3) * S);
    }

    // Flip them upside down and pour back into the bucket
    sfx.whoosh();
    cam('scale(1.07) translateY(1%)', 'scale(1.12) translateY(4%)', 2600);
    await Promise.all([
      moveTo(canA, { x: -50, y: -520, r: 152 }, 950),
      moveTo(canB, { x: 60, y: -560, r: -146 }, 950),
    ]);
    sfx.psst();
    pourCans = [canA, canB];
    sfx.glug(2100);
    await sleep(2100);
    pourCans = [];
    await sleep(250);

    // 2 · Macro: condensation on the label
    L.length = 0;
    cut('sMacro');
    const macro = $('.macroCan');
    macro.animate([{ transform: 'rotate(16deg) scale(1.05) translateY(4%)' }, { transform: 'rotate(11deg) scale(1.2) translateY(-5%)' }],
      { duration: 3600, easing: 'ease-in-out', fill: 'forwards' });
    if (camAnim) camAnim.cancel();
    await sleep(500);
    title(t1);
    await sleep(2700);

    // 3 · Diagonal pour close-up
    cut('sPour');
    $('.pourCan').animate([{ transform: 'rotate(118deg) translate(0, 0)' }, { transform: 'rotate(127deg) translate(-2%, -3%)' }],
      { duration: 3000, easing: 'ease-out', fill: 'forwards' });
    sfx.psst();
    streamOn = true;
    sfx.glug(2600);
    await sleep(350);
    musicSet('drop');
    sfx.hit();
    title(t2);
    shake(10, 400);
    await sleep(2500);
    streamOn = false;

    // 4 · Looking down into the glass: the swirl
    hideTitles();
    cut('sSwirl');
    swirlOn = true;
    $('.swirl').animate([{ transform: 'scale(1.05) rotate(0)' }, { transform: 'scale(1.25) rotate(-25deg)' }], { duration: 2400, easing: 'ease-in', fill: 'forwards' });
    sfx.fizz(2200);
    await sleep(2300);
    swirlOn = false; V.length = 0;
    clearTitles();

    // 5 · Packshot + question
    musicSet('build');
    cut('sPack', 600);
    cam('scale(1.12) translateY(2%)', 'scale(1)', 2200, 'cubic-bezier(.2,.8,.2,1)');
    await sleep(1000);
    resetChoices();
    show('question');
    busy = false;
  }

  function resetChoices() {
    $('#cbYes').checked = $('#cbNo').checked = false;
    $('#choices').classList.remove('locked');
    $$('.choice').forEach((c) => c.classList.remove('picked'));
  }

  async function onYes() {
    await sleep(350);
    show(null);
    musicSet('drop');
    sfx.boom();
    flash(0.9, 600);
    shake(22, 800);
    document.body.classList.add('party');
    cam('scale(1)', 'scale(1.08) translateY(2%)', 900, 'cubic-bezier(.2,1.4,.4,1)');
    sfx.psst();
    $('.tab', packCan).style.transform = 'translate(19px, 4px) rotate(-55deg) translate(-19px, -4px)';
    const { m } = axis(packCan);
    for (let i = 0; i < 160 * K; i++) {
      drop(m.x + rand(-8, 8) * S, m.y, rand(-9, 9) * S * 2, -rand(6, 20) * S * 2, rand(2, 6) * S);
    }
    sprayUntil = performance.now() + SPRAY_MS;
    sfx.fizz(SPRAY_MS);
    await sleep(500);
    show('yes');
    await sleep(1800);
    $('#againBtn').classList.add('ready');
    $('#againBtn').focus({ preventScroll: true });
  }

  async function onNo() {
    await sleep(350);
    show(null);
    musicSet('sad');
    sfx.powerDown();
    document.body.classList.add('dim');
    await tweenLevel(packCan, 100, 6, 1800);
    await moveTo(packCan, [{ x: 0, y: 0, r: -6, o: 0.25 }, { x: 0, y: 0, r: 5, o: 0.5 }, { x: 70, y: -112, r: -90 }], 1500, 'cubic-bezier(.6,0,.9,.6)');
    sfx.thud();
    shake(8, 300);
    await moveTo(packCan, [{ x: 64, y: -128, r: -86, o: 0.4 }, { x: 68, y: -112, r: -90 }], 400, 'ease-out');
    show('no');
    const out = $('#noTitle');
    out.textContent = '';
    for (const ch of 'Lavt batteri…') { out.textContent += ch; sfx.blip(180, 0.03); await sleep(110); }
    await sleep(500);
    $('#retryBtn').classList.add('ready');
    $('#retryBtn').focus({ preventScroll: true });
  }

  async function retry() {
    if (busy) return;
    busy = true;
    $('#retryBtn').classList.remove('ready');
    show(null);
    document.body.classList.remove('dim');
    musicSet('build');
    await moveTo(packCan, [{ x: -10, y: -40, r: -20, o: 0.6 }, { x: 0, y: 0, r: 0 }], 800, 'cubic-bezier(.3,1.4,.5,1)');
    sfx.thud();
    await tweenLevel(packCan, 6, 100, 1100, (v) => sfx.blip(300 + v * 6, 0.05));
    resetChoices();
    show('question');
    busy = false;
  }

  function choose(input, other, handler) {
    input.addEventListener('change', () => {
      if (busy || !input.checked) return;
      busy = true;
      other.checked = false;
      $('#choices').classList.add('locked');
      input.closest('.choice').classList.add('picked');
      sfx.blip(input.value === 'ja' ? 1200 : 300, 0.12);
      handler().finally(() => { busy = false; });
    });
  }
  choose($('#cbYes'), $('#cbNo'), onYes);
  choose($('#cbNo'), $('#cbYes'), onNo);
  $('#retryBtn').addEventListener('click', retry);
  $('#againBtn').addEventListener('click', () => { if (!busy) film(); });

  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, sleep(1500)]) : Promise.resolve();
  const gate = $('#gate');
  $('#startBtn').addEventListener('click', () => {
    ac();
    musicStart();
    gate.classList.add('gone');
    gate.addEventListener('transitionend', () => gate.remove(), { once: true });
    fontsReady.then(film);
  }, { once: true });
  $('#startBtn').focus({ preventScroll: true });
})();
