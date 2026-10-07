(() => {
  const $ = (s) => document.querySelector(s);
  const stage = $('#stage');
  const canMove = $('#canMove');
  const can = $('#can');
  const canArea = $('#canArea');
  const lvl = $('#lvl');
  const pct = $('#pct');
  const tab = $('#tab');
  const headline = $('#headline');
  const choices = $('#choices');
  const cbYes = $('#cbYes');
  const cbNo = $('#cbNo');
  const flashEl = $('#flash');

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const K = RM ? 0.3 : 1;
  const NEON = ['#d4ff00', '#e8ff6a', '#00ffa3', '#ffffff', '#ffe600'];
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const rand = (a, b) => a + Math.random() * (b - a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Sound (Web Audio, synthesized) ---------- */

  let AC = null, master = null, soundOn = true;

  function ac() {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain();
      master.gain.value = 0.55;
      master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }

  function canPlay() {
    return soundOn && AC && AC.state === 'running';
  }

  function env(g, t, attack, peak, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function noise(dur) {
    const a = AC, buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    return src;
  }

  function zap(vol = 0.3) {
    if (!canPlay()) return;
    const t = AC.currentTime;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(rand(1400, 2200), t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.28);
    env(g, t, 0.005, vol, 0.3);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.4);
    const n = noise(0.25), f = AC.createBiquadFilter(), ng = AC.createGain();
    f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 0.8;
    env(ng, t, 0.002, vol * 0.8, 0.2);
    n.connect(f).connect(ng).connect(master);
    n.start(t);
  }

  function boom() {
    if (!canPlay()) return;
    const t = AC.currentTime;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.9);
    env(g, t, 0.01, 1, 1.1);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 1.3);
    const n = noise(1.4), f = AC.createBiquadFilter(), ng = AC.createGain();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(4000, t);
    f.frequency.exponentialRampToValueAtTime(200, t + 1.2);
    env(ng, t, 0.005, 0.7, 1.2);
    n.connect(f).connect(ng).connect(master);
    n.start(t);
  }

  function hum(dur) {
    if (!canPlay()) return;
    const t = AC.currentTime, s = dur / 1000;
    const g = AC.createGain(), f = AC.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(5000, t + s);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + s * 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + s + 0.05);
    f.connect(g).connect(master);
    [0, 7].forEach((det) => {
      const o = AC.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = det * 10;
      o.frequency.setValueAtTime(55, t);
      o.frequency.exponentialRampToValueAtTime(880, t + s);
      o.connect(f);
      o.start(t); o.stop(t + s + 0.1);
    });
  }

  function powerDown() {
    if (!canPlay()) return;
    const t = AC.currentTime;
    const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
    const lfo = AC.createOscillator(), lg = AC.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 2.4);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3000, t);
    f.frequency.exponentialRampToValueAtTime(150, t + 2.4);
    lfo.frequency.setValueAtTime(14, t);
    lfo.frequency.linearRampToValueAtTime(3, t + 2.4);
    lg.gain.value = 0.12;
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    lfo.connect(lg).connect(g.gain);
    o.connect(f).connect(g).connect(master);
    o.start(t); lfo.start(t);
    o.stop(t + 2.7); lfo.stop(t + 2.7);
  }

  function blip(freq, vol = 0.15) {
    if (!canPlay()) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    env(g, t, 0.003, vol, 0.08);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.12);
  }

  function fizz(dur) {
    if (!canPlay()) return;
    const t = AC.currentTime, s = dur / 1000;
    const n = noise(s), f = AC.createBiquadFilter(), g = AC.createGain();
    f.type = 'highpass'; f.frequency.value = 5000;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + s);
    n.connect(f).connect(g).connect(master);
    n.start(t);
  }

  const soundBtn = $('#sound');
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊 Lyd på' : '🔇 Lyd av';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    if (soundOn) { ac(); blip(880); }
  });
  // Browsers only allow audio after a user gesture; unlock on the first one.
  addEventListener('pointerdown', () => soundOn && ac(), { once: true });
  addEventListener('keydown', () => soundOn && ac(), { once: true });

  /* ---------- Canvas FX: particles + lightning ---------- */

  const cv = $('#fx'), cx = cv.getContext('2d');
  let W = 0, H = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize);
  resize();

  const P = [], B = [];
  let mode = 'calm';     // calm | charge | party | dead
  let charge = 1;        // charge intensity multiplier
  let fizzing = 0;       // timestamp until which the can sprays

  function spawn(o) {
    if (P.length > 2600) return;
    P.push(Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0.99, life: 1, decay: 0.01,
      size: 2, color: '#d4ff00', type: 'dot', rot: 0, vr: 0,
    }, o));
  }

  function bolt(x1, y1, x2, y2, o = {}) {
    let pts = [[x1, y1], [x2, y2]];
    let disp = Math.hypot(x2 - x1, y2 - y1) * 0.28;
    for (let k = 0; k < 6; k++) {
      const n = [pts[0]];
      for (let j = 0; j < pts.length - 1; j++) {
        const [ax, ay] = pts[j], [bx, by] = pts[j + 1];
        const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
        const off = (Math.random() - 0.5) * disp;
        n.push([(ax + bx) / 2 - (dy / len) * off, (ay + by) / 2 + (dx / len) * off], pts[j + 1]);
      }
      pts = n;
      disp *= 0.55;
    }
    B.push({ pts, life: 1, decay: o.decay || 0.09, width: o.width || 2, color: o.color || '#e8ff6a' });
    if (o.branches) {
      for (let i = 0; i < o.branches; i++) {
        const [bx, by] = pts[(rand(0.2, 0.8) * pts.length) | 0];
        const ang = Math.atan2(y2 - y1, x2 - x1) + rand(-1, 1);
        const len = Math.hypot(x2 - x1, y2 - y1) * rand(0.15, 0.35);
        bolt(bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len, { width: (o.width || 2) * 0.5, decay: o.decay, color: o.color });
      }
    }
  }

  function canRect() {
    const r = can.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top };
  }

  function burst(x, y, n, o = {}) {
    n = Math.round(n * K);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(o.min || 2, o.max || 14);
      spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g ?? 0.12, drag: 0.95,
        decay: rand(0.012, 0.03), size: rand(1, 3.2), color: pick(o.colors || NEON),
        type: Math.random() < 0.6 ? 'spark' : 'dot',
      });
    }
  }

  function arcAround(c, scale = 1) {
    const a = rand(0, Math.PI * 2);
    const sx = c.x + Math.cos(a) * c.w * 0.45, sy = c.y + Math.sin(a) * c.h * 0.42;
    const r = c.w * rand(0.7, 1.8) * scale;
    bolt(sx, sy, sx + Math.cos(a + rand(-0.6, 0.6)) * r, sy + Math.sin(a + rand(-0.6, 0.6)) * r, {
      width: rand(1.2, 2.5), decay: 0.14, color: pick(['#e8ff6a', '#b9fff0', '#ffffff']), branches: 1,
    });
  }

  function confetti() {
    spawn({
      x: rand(0, W), y: -20, vx: rand(-1.5, 1.5), vy: rand(2, 5), g: 0.05, drag: 0.995,
      decay: 0.004, size: rand(5, 10), color: pick(NEON.concat(['#00e5ff'])), type: Math.random() < 0.3 ? 'zig' : 'conf',
      rot: rand(0, 6), vr: rand(-0.2, 0.2),
    });
  }

  function ambient() {
    const c = canRect();
    if (mode === 'calm' || mode === 'party') {
      if (Math.random() < 0.35 * K) {
        spawn({ x: rand(0, W), y: H + 10, vx: rand(-0.3, 0.3), vy: -rand(0.5, 2), drag: 1,
          decay: rand(0.003, 0.007), size: rand(0.8, 2.2), color: pick(NEON) });
      }
    }
    if (mode === 'charge') {
      if (Math.random() < 0.22 * charge * K) arcAround(c, Math.min(charge, 2));
      for (let i = 0; i < 2 * charge * K; i++) {
        const a = rand(0, Math.PI * 2), r = rand(180, 420), sp = rand(6, 11);
        spawn({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp,
          decay: sp / r, type: 'spark', size: 1.6, color: pick(NEON), drag: 1 });
      }
    }
    if (mode === 'party') {
      if (Math.random() < 0.7 * K) confetti();
      if (Math.random() < 0.025 * K) bolt(rand(0, W), 0, rand(0, W), H * rand(0.3, 0.8), { width: 3, branches: 2, decay: 0.07 });
      if (Math.random() < 0.08 * K) arcAround(c, 1.2);
    }
    if (mode === 'dead' && Math.random() < 0.3) {
      spawn({ x: rand(0, W), y: -10, vx: rand(-0.2, 0.2), vy: rand(0.3, 0.9), drag: 1, decay: 0.0025,
        size: rand(0.8, 2.2), color: '#8d939a', type: 'dust' });
    }
    if (performance.now() < fizzing) {
      for (let i = 0; i < 7 * K; i++) {
        spawn({ x: c.x + rand(-c.w * 0.12, c.w * 0.12), y: c.top + c.h * 0.03, vx: rand(-3.5, 3.5), vy: -rand(8, 17),
          g: 0.32, drag: 0.99, decay: rand(0.012, 0.02), size: rand(1.5, 4),
          color: pick(['#ffffff', '#e8ff6a', '#bfffe0', '#d4ff00']) });
      }
    }
  }

  function frame() {
    cx.clearRect(0, 0, W, H);
    ambient();
    cx.globalCompositeOperation = 'lighter';
    cx.lineCap = 'round';
    cx.lineJoin = 'round';

    for (let i = B.length - 1; i >= 0; i--) {
      const b = B[i];
      cx.beginPath();
      cx.moveTo(b.pts[0][0], b.pts[0][1]);
      for (let j = 1; j < b.pts.length; j++) cx.lineTo(b.pts[j][0], b.pts[j][1]);
      cx.globalAlpha = Math.max(b.life, 0) * (Math.random() < 0.15 ? 0.4 : 1);
      cx.shadowBlur = 24;
      cx.shadowColor = b.color;
      cx.strokeStyle = b.color;
      cx.lineWidth = b.width * 2.4;
      cx.stroke();
      cx.shadowBlur = 0;
      cx.strokeStyle = '#fff';
      cx.lineWidth = b.width * 0.7;
      cx.stroke();
      b.life -= b.decay;
      if (b.life <= 0) B.splice(i, 1);
    }

    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.vx *= p.drag; p.vy *= p.drag; p.vy += p.g;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > H + 60) { P.splice(i, 1); continue; }
      cx.globalAlpha = Math.min(p.life * 1.4, 1) * (p.type === 'dust' ? 0.5 : 1);
      cx.fillStyle = cx.strokeStyle = p.color;
      if (p.type === 'spark') {
        cx.lineWidth = p.size;
        cx.beginPath();
        cx.moveTo(p.x, p.y);
        cx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
        cx.stroke();
      } else if (p.type === 'conf' || p.type === 'zig') {
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(p.rot);
        cx.scale(Math.cos(p.rot * 1.7), 1);
        if (p.type === 'conf') {
          cx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          const s = p.size;
          cx.beginPath();
          cx.moveTo(s * 0.2, -s); cx.lineTo(-s * 0.5, s * 0.1); cx.lineTo(0, s * 0.1);
          cx.lineTo(-s * 0.2, s); cx.lineTo(s * 0.5, -s * 0.1); cx.lineTo(0, -s * 0.1);
          cx.closePath();
          cx.fill();
        }
        cx.restore();
      } else {
        cx.beginPath();
        cx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        cx.fill();
      }
    }

    cx.globalAlpha = 1;
    cx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- DOM effects ---------- */

  function flash(strength = 0.8, dur = 400) {
    flashEl.animate([{ opacity: strength }, { opacity: 0 }], { duration: dur, easing: 'ease-out' });
  }

  function shake(power = 12, dur = 500) {
    if (RM) return;
    const frames = [];
    for (let i = 0; i < 10; i++) {
      const f = 1 - i / 10;
      frames.push({ transform: `translate(${rand(-power, power) * f}px, ${rand(-power, power) * f}px) rotate(${rand(-1, 1) * f}deg)` });
    }
    frames.push({ transform: 'none' });
    stage.animate(frames, { duration: dur, easing: 'linear' });
  }

  function ring(color) {
    const r = document.createElement('div');
    r.className = 'ring';
    if (color) { r.style.borderColor = color; r.style.boxShadow = `0 0 30px ${color}, inset 0 0 30px ${color}`; }
    canArea.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
  }

  function setCanState(cls) {
    canMove.className = '';
    void canMove.offsetWidth; // restart animation
    if (cls) canMove.className = cls;
  }

  function show(id) {
    document.querySelectorAll('#panels > section').forEach((s) => s.classList.toggle('show', s.id === id));
  }

  let level = 0;
  function setLevel(v) {
    level = v;
    lvl.setAttribute('width', (68 * Math.min(Math.max(v, 0), 100)) / 100);
    const col = v > 100 ? '#ffffff' : v > 50 ? '#d4ff00' : v > 20 ? '#ffd000' : '#ff2d55';
    lvl.setAttribute('fill', col);
    pct.setAttribute('fill', v > 20 ? (v > 100 ? '#ffffff' : '#d4ff00') : '#ff2d55');
    pct.textContent = Math.round(v) + '%';
    can.classList.toggle('low', v < 20);
  }

  function tweenLevel(to, ms, onTick) {
    const from = level, t0 = performance.now();
    let lastTick = -1;
    return new Promise((res) => {
      (function step(now) {
        const k = Math.min((now - t0) / ms, 1);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        setLevel(from + (to - from) * e);
        const tick = Math.floor(level / 10);
        if (onTick && tick !== lastTick) { lastTick = tick; onTick(level); }
        if (k < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }

  /* ---------- Headline ---------- */

  const TEXT = 'Det er tid for batteribytte!';
  let li = 0;
  headline.innerHTML = TEXT.split(' ').map((w) =>
    `<span class="w${w.startsWith('batteri') ? ' hl' : ''}" aria-hidden="true">` +
    [...w].map((ch) => `<span class="l" style="--i:${li++}">${ch}</span>`).join('') +
    '</span>'
  ).join(' ');
  const letters = [...headline.querySelectorAll('.l')];

  /* ---------- Sequences ---------- */

  let busy = false;

  async function intro() {
    busy = true;
    document.body.className = '';
    stage.classList.remove('drained');
    headline.classList.remove('in', 'glitch');
    tab.classList.remove('pop');
    mode = 'calm';
    charge = 1;
    setLevel(0);
    setCanState('hidden');
    show(null);

    await sleep(500);
    let c = canRect();
    bolt(rand(W * 0.3, W * 0.7), 0, c.x, c.y, { width: 4, branches: 3, decay: 0.06 });
    flash(0.6, 300);
    zap(0.35);
    setCanState('drop');

    await sleep(600);
    c = canRect();
    ring();
    shake(16, 450);
    burst(c.x, c.y + c.h * 0.45, 70, { max: 12 });
    blip(110, 0.25);

    await sleep(250);
    mode = 'charge';
    hum(2100);
    await tweenLevel(100, 2100, (v) => blip(300 + v * 6, 0.06));

    mode = 'calm';
    c = canRect();
    flash(0.5, 300);
    ring();
    burst(c.x, c.y, 120);
    zap(0.4);
    shake(10, 350);

    await sleep(250);
    show('intro');
    headline.classList.add('in');
    letters.forEach((l, i) => setTimeout(() => {
      const r = l.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 8, { max: 5, g: 0.05 });
      if (i % 3 === 0) blip(600 + i * 25, 0.04);
    }, i * 48 + 420));

    await sleep(letters.length * 48 + 900);
    headline.classList.add('glitch');
    await sleep(2400);

    document.body.classList.add('compact');
    resetChoices();
    show('question');
    busy = false;
  }

  function resetChoices() {
    cbYes.checked = cbNo.checked = false;
    choices.classList.remove('locked');
    choices.querySelectorAll('.choice').forEach((c) => c.classList.remove('picked'));
  }

  async function onYes() {
    mode = 'charge';
    charge = 1.5;
    zap(0.3);
    await sleep(700);
    show(null);
    document.body.classList.remove('compact');
    setCanState('rumble');
    await sleep(500);
    charge = 3;
    hum(1900);
    await tweenLevel(200, 1900, (v) => { blip(400 + v * 4, 0.05); if (v > 120) shake(4, 120); });

    // BOOM
    const c = canRect();
    mode = 'party';
    document.body.classList.add('party');
    flash(1, 700);
    boom();
    shake(26, 900);
    ring();
    setTimeout(() => ring('#00ffa3'), 140);
    setTimeout(() => ring('#ffffff'), 300);
    burst(c.x, c.y, 320, { max: 22, g: 0.1 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rand(-0.3, 0.3);
      bolt(c.x, c.y, c.x + Math.cos(a) * Math.max(W, H), c.y + Math.sin(a) * Math.max(W, H), { width: 3.5, branches: 2, decay: 0.05 });
    }
    setLevel(100);
    tab.classList.add('pop');
    setCanState('hover');
    fizzing = performance.now() + 2600;
    fizz(2600);

    await sleep(350);
    show('yes');
    await sleep(1600);
    $('#againBtn').classList.add('ready');
    $('#againBtn').focus({ preventScroll: true });
  }

  async function onNo() {
    await sleep(600);
    powerDown();
    stage.classList.add('flicker');
    mode = 'dead';
    setTimeout(() => stage.classList.remove('flicker'), 1700);
    show(null);
    document.body.classList.remove('compact');
    stage.classList.add('drained');
    setCanState('slump');
    await tweenLevel(3, 2600);

    show('no');
    const title = 'Lavt batteri…';
    const out = $('#noTitle');
    out.textContent = '';
    for (const ch of title) {
      out.textContent += ch;
      blip(180, 0.03);
      await sleep(110);
    }

    const zzzTimer = setInterval(() => {
      if (mode !== 'dead') return clearInterval(zzzTimer);
      const z = document.createElement('span');
      z.className = 'zzz';
      z.textContent = 'Z';
      z.style.fontSize = rand(1.2, 2.4) + 'rem';
      z.style.setProperty('--dx', rand(20, 90) + 'px');
      canArea.appendChild(z);
      z.addEventListener('animationend', () => z.remove());
    }, 900);

    await sleep(800);
    $('#retryBtn').classList.add('ready');
    $('#retryBtn').focus({ preventScroll: true });
  }

  async function retry() {
    if (busy) return;
    busy = true;
    $('#retryBtn').classList.remove('ready');
    show(null);
    stage.classList.remove('drained');
    mode = 'charge';
    charge = 2;
    zap(0.4);
    flash(0.4, 250);
    setCanState('standup');
    hum(1300);
    await tweenLevel(100, 1300, (v) => blip(300 + v * 6, 0.05));
    const c = canRect();
    mode = 'calm';
    ring();
    burst(c.x, c.y, 120);
    zap(0.3);
    setCanState('');
    document.body.classList.add('compact');
    await sleep(500);
    resetChoices();
    show('question');
    busy = false;
  }

  function choose(input, other, handler) {
    input.addEventListener('change', () => {
      if (busy || !input.checked) return;
      busy = true;
      other.checked = false;
      choices.classList.add('locked');
      input.closest('.choice').classList.add('picked');
      blip(input === cbYes ? 1200 : 300, 0.15);
      handler().finally(() => { busy = false; });
    });
  }

  choose(cbYes, cbNo, onYes);
  choose(cbNo, cbYes, onNo);

  $('#retryBtn').addEventListener('click', retry);
  $('#againBtn').addEventListener('click', () => {
    if (busy) return;
    $('#againBtn').classList.remove('ready');
    fizzing = 0;
    intro();
  });

  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, sleep(1200)]).then(intro);
  } else {
    intro();
  }
})();
