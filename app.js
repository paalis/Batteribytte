// Batteribytte — an interactive charging station. Hold «Ja» (or tap it) and the can charges from 6 to 100 %,
// then opens. «Nei» drains it and the lights go. This file owns the state, the meter and the sound; the clips
// (player.js), live effects (fx.js) and type motion (motion.js) follow it through window.BB and 'bb' events.
// Without clips the photo can below does its own glow, sparks and pop. Sound is off until «Lyd» is pressed.
// Interaction spec: docs/interaction-spec.md
(() => {
  const $ = (s) => document.querySelector(s);
  const stage = $('#stage'), can = $('#can'), canBody = $('#can-body'), sheen = $('.can-sheen');
  const hud = $('#hud'), hudFill = $('#hud-fill'), hudPct = $('#hud-pct');
  const ja = $('#ja'), nei = $('#nei'), choices = $('.choices'), hint = $('#hint');
  const panels = { ask: $('#ask'), yes: $('#yes'), no: $('#no') };
  const flash = $('#flash'), ring = $('#ring'), toast = $('#toast'), status = $('#status'), soundBtn = $('#sound');
  const cv = $('#fx'), g = cv.getContext('2d');

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const HINT = hint.innerHTML;

  const START = 6;                 // the battery is low when you arrive
  const RATE = 94 / 1.5;           // % per second while charging: 1.5 s from 6 to 100
  const DECAY = 94 / 2.4;          // % per second when let go early
  const DRAIN = 1.1;               // seconds for «Nei» to empty the battery
  const TAP = 280;                 // a press shorter than this is a tap: the can charges by itself

  // ---------- state ----------
  let state = 'ask';               // ask | charging | yes | draining | no
  let level = START;
  let holding = false, auto = false, pressAt = 0, drainFrom = 0;

  function setState(s) { state = s; stage.dataset.state = s; }
  // while the clips run (player.js), the photo version's own can and particles stand down
  const GL = () => document.documentElement.classList.contains('clips');
  const emit = (type) => dispatchEvent(new CustomEvent('bb', { detail: type }));
  let lastAria = -1;
  function setLevel(v) {
    level = clamp(v, 0, 100);
    const r = Math.round(level);
    hudFill.style.transform = `scaleX(${level / 100})`;
    hudPct.textContent = r + ' %';
    hud.classList.toggle('low', level < 20);
    stage.style.setProperty('--charge', clamp((level - START) / (100 - START)).toFixed(3));
    const step = r === 100 || r === 0 || r === START ? r : Math.floor(r / 10) * 10;   // tens, not every frame
    if (step !== lastAria) { lastAria = step; hud.setAttribute('aria-valuenow', r); hud.setAttribute('aria-valuetext', r + ' prosent'); }
  }

  function show(id) {
    for (const [k, el] of Object.entries(panels)) {
      el.hidden = k !== id;
      if (k === id && !RM) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
    }
  }
  function say(msg) { status.textContent = msg; }
  function buzz(p) { if (navigator.vibrate) navigator.vibrate(p); }
  function replay(el) { el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }

  // ---------- «Ja»: hold to charge, or tap and it charges itself ----------
  function startCharge(isAuto) {
    if (state !== 'ask' && state !== 'charging') return;
    if (state === 'ask') { say('Lader.'); buzz(10); emit('charge'); sound.play('ice', 0.7); }
    setState('charging');
    choices.classList.add('locked');
    holding = !isAuto; auto = !!isAuto;
    pressAt = performance.now();
    ja.classList.add('holding');
    hint.textContent = auto ? 'Lader …' : 'Hold inne …';
    sound.charge(true);
    kick();
  }
  function release(fromKeyboard) {
    if (!holding) return;
    holding = false;
    ja.classList.remove('holding');
    if (fromKeyboard || performance.now() - pressAt < TAP) { auto = true; hint.textContent = 'Lader …'; }
    else if (level < 100) hint.textContent = 'Hold inne til 100 %';
  }
  function abortCharge() {           // let go early and the level ran all the way back
    setState('ask');
    auto = false;
    choices.classList.remove('locked');
    ja.classList.remove('holding');
    sound.charge(false);
    setLevel(START);
  }

  function pop() {
    setState('yes');
    holding = auto = false;
    setLevel(100);
    ja.classList.remove('holding');
    sound.charge(false);
    sound.pop();
    buzz([25, 40, 35]);
    emit('pop');
    const r = canBody.getBoundingClientRect();
    if (!RM && !GL()) {
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.08;
      flash.style.setProperty('--fx', cx + 'px'); flash.style.setProperty('--fy', (r.top + r.height / 2) + 'px');
      replay(flash); replay(ring);
      burst(cx, cy, r.width);
      spring.vs += 2.2;              // the can jumps
      shake = 0.35;
    }
    setTimeout(() => {
      show('yes');
      hint.innerHTML = HINT;
      say('Fullt ladet! Batteriet er byttet. Skål!');
      $('#share').focus({ preventScroll: true });
    }, RM ? 0 : 320);
  }

  // ---------- «Nei»: drain to 0, lights out ----------
  function answerNo() {
    if (state !== 'ask') return;
    setState('draining');
    choices.classList.add('locked');
    drainFrom = level;
    pressAt = performance.now();
    buzz([8, 60, 8]);
    sound.down();
    emit('no');
    kick();
  }
  function landNo() {
    setState('no');
    setLevel(0);
    show('no');
    say('Lavt batteri. Helt greit, vi venter til du er klar.');
    $('#retry').focus({ preventScroll: true });
  }

  function backToAsk() {
    setState('ask');
    holding = auto = false;
    choices.classList.remove('locked');
    hint.innerHTML = HINT;
    setLevel(START);
    show('ask');
    say('Er du klar? Velg ja eller nei.');
    emit('ask');
    ja.focus({ preventScroll: true });
  }

  // ---------- the can: tilt toward the pointer, spring when it jumps, fizz when tapped ----------
  const tilt = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0 };
  const spring = { s: 0, vs: 0 };    // vertical jump (in % of the can's height)
  let shake = 0;
  function aim(clientX, clientY) {
    if (RM) return;
    tilt.ty = (clientX / innerWidth - 0.5) * 26;     // rotateY, degrees
    tilt.tx = -(clientY / innerHeight - 0.5) * 10;   // rotateX
    kick();
  }
  if (FINE) {
    addEventListener('pointermove', (e) => aim(e.clientX, e.clientY), { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { tilt.tx = tilt.ty = 0; kick(); });
  }
  can.addEventListener('pointermove', (e) => { if (!FINE && e.buttons) aim(e.clientX, e.clientY); }, { passive: true });
  can.addEventListener('pointerup', () => { if (!FINE) { tilt.tx = tilt.ty = 0; kick(); } });
  can.addEventListener('click', () => {
    if (GL() || state === 'charging' || state === 'draining') return;
    sound.fizz();
    if (RM) return;
    const r = canBody.getBoundingClientRect();
    fizz(r.left + r.width / 2, r.top + r.height * 0.06, r.width);
    spring.vs += 0.9;
    kick();
  });

  // ---------- particles (canvas, additive light) ----------
  const P = [];
  const MAX = 420;
  let dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  }
  resize(); addEventListener('resize', resize);
  const GOLD = ['255,214,140', '255,184,96', '255,240,210', '255,150,80'];
  function add(p) { if (P.length < MAX) P.push(p); }
  function ember(r, c) {            // sparks drawn up from the floor into the can while it charges
    const side = Math.random() < 0.5 ? -1 : 1;
    add({ k: 'spark', x: r.left + r.width / 2 + side * rnd(0.15, 0.75) * r.width, y: r.bottom + rnd(-4, 10),
      vx: -side * rnd(10, 60), vy: -rnd(160, 420) * (0.6 + c), life: 0, max: rnd(0.35, 0.8), w: rnd(1, 2.2),
      col: GOLD[(Math.random() * 4) | 0], g: -40 });
  }
  function burst(cx, cy, w) {
    for (let i = 0; i < 170; i++) {
      const a = rnd(0, Math.PI * 2), s = rnd(220, 980);
      add({ k: 'spark', x: cx + rnd(-w * .2, w * .2), y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 260,
        life: 0, max: rnd(0.5, 1.3), w: rnd(1, 2.6), col: GOLD[(Math.random() * 4) | 0], g: 900 });
    }
    for (let i = 0; i < 46; i++) {  // droplets: the drink itself, amber to red like the can
      const a = rnd(-Math.PI * 0.85, -Math.PI * 0.15), s = rnd(260, 760);
      add({ k: 'drop', x: cx + rnd(-w * .15, w * .15), y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0, max: rnd(0.9, 1.6), r: rnd(2, 5.5), col: Math.random() < 0.5 ? '240,150,70' : '214,58,84', g: 1500 });
    }
    kick();
  }
  function fizz(cx, cy, w) {
    for (let i = 0; i < 22; i++) {
      add({ k: 'bubble', x: cx + rnd(-w * .3, w * .3), y: cy + rnd(0, 8), vx: rnd(-30, 30), vy: -rnd(60, 200),
        life: 0, max: rnd(0.5, 1.1), r: rnd(1.2, 3.2), g: -60 });
    }
  }
  function draw(dt) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life += dt;
      if (p.life >= p.max) { P.splice(i, 1); continue; }
      p.vy += p.g * dt; p.vx *= 1 - 0.8 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const a = 1 - p.life / p.max;
      if (p.k === 'spark') {
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = `rgba(${p.col},${a})`;
        g.lineWidth = p.w;
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); g.stroke();
      } else if (p.k === 'drop') {
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = `rgba(${p.col},${0.85 * a})`;
        g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * 1.25, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, 7); g.fill();
        g.fillStyle = `rgba(255,255,255,${0.55 * a})`;
        g.beginPath(); g.arc(p.x - p.r * .3, p.y - p.r * .35, p.r * .3, 0, 7); g.fill();
      } else {
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = `rgba(255,255,255,${0.6 * a})`;
        g.lineWidth = 1;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.stroke();
      }
    }
    g.globalCompositeOperation = 'source-over';
  }

  // ---------- one loop, running only while something moves ----------
  let raf = 0, last = 0, emberAcc = 0;
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    let busy = false;

    if (state === 'charging') {
      busy = true;
      // a speed ramp: it starts slowly and accelerates toward the top (still about 1.5 s from 6 to 100)
      const c0 = clamp((level - START) / (100 - START));
      setLevel(level + (holding || auto ? RATE * (0.5 + 1.2 * c0) : -DECAY) * dt);
      const c = clamp((level - START) / (100 - START));
      sound.level(c);
      if (!RM && !GL() && (holding || auto)) {
        emberAcc += (30 + 170 * c) * dt;
        const r = canBody.getBoundingClientRect();
        while (emberAcc >= 1) { emberAcc--; ember(r, c); }
      }
      if (level >= 100) pop();
      else if (!holding && !auto && level <= START) abortCharge();
    } else if (state === 'draining') {
      busy = true;
      const k = clamp((now - pressAt) / (DRAIN * 1000));
      setLevel(drainFrom * (1 - k * k));
      if (k >= 1) landNo();
    }

    // tilt: a soft spring toward the pointer
    for (const ax of ['x', 'y']) {
      const v = 'v' + ax, t = 't' + ax;
      tilt[v] += ((tilt[t] - tilt[ax]) * 60 - tilt[v] * 11) * dt;
      tilt[ax] += tilt[v] * dt;
      if (Math.abs(tilt[t] - tilt[ax]) > 0.02 || Math.abs(tilt[v]) > 0.02) busy = true;
    }
    // jump: an underdamped spring, so the can lands with a small bounce
    spring.vs += (-spring.s * 120 - spring.vs * 9) * dt;
    spring.s += spring.vs * dt;
    if (Math.abs(spring.s) > 0.001 || Math.abs(spring.vs) > 0.001) busy = true;

    let sx = 0, sy = 0;
    const charging = state === 'charging' && (holding || auto);
    if (!RM && (charging || shake > 0)) {
      const c = charging ? clamp((level - START) / (100 - START)) : 1;
      const amp = charging ? 0.4 + 2.6 * c * c : 6 * shake;
      sx = rnd(-amp, amp); sy = rnd(-amp, amp) * 0.5;
      shake = Math.max(0, shake - dt);
      busy = true;
    }
    const h = canBody.offsetHeight;
    can.style.transform = `translate(${sx}px, ${sy - spring.s * h * 0.1}px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg)`;
    sheen.style.setProperty('--sheen', (50 + tilt.y * 2.2).toFixed(1) + '%');

    draw(dt);
    if (P.length) busy = true;
    raf = busy ? requestAnimationFrame(frame) : 0;
  }

  // ---------- sound: made live, off until the user turns it on ----------
  const sound = (() => {
    let ctx = null, on = false, hum = null;
    const ok = () => on && ctx;
    // recorded-style effects, rendered with tools/make-sfx.mjs; fetched only once the user turns sound on
    const SFX = ['hit', 'tsss', 'ice', 'whoosh'], buf = {};
    const loadSfx = () => SFX.forEach((n) => { if (!(n in buf)) { buf[n] = null;
      fetch(`assets/sfx/${n}.m4a`).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((d) => { buf[n] = d; }).catch(() => {}); } });
    function play(name, gain = 1, at = 0) {
      if (!ok() || !buf[name]) return false;
      const s = ctx.createBufferSource(), gn = ctx.createGain();
      s.buffer = buf[name]; gn.gain.value = gain; s.connect(gn).connect(ctx.destination); s.start(ctx.currentTime + at);
      return true;
    }
    function noise(dur, type, freq, gain) {
      const n = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain(), t = ctx.currentTime;
      src.buffer = n; f.type = type; f.frequency.value = freq;
      gn.gain.setValueAtTime(gain, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(gn).connect(ctx.destination); src.start();
    }
    function tone(freq, start, dur, gain, type = 'sine', to) {
      const o = ctx.createOscillator(), gn = ctx.createGain(), t = ctx.currentTime + start;
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(gain, t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
    }
    return {
      toggle() {
        on = !on;
        if (on && !ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
        if (ctx) (on ? ctx.resume() : ctx.suspend()).catch(() => {});
        if (on && ctx) loadSfx();
        if (!on) this.charge(false);
        return on;
      },
      charge(start) {
        if (!start) { if (hum) { const h = hum; hum = null; h.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05); h.ng.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04); h.o.stop(ctx.currentTime + 0.3); h.ns.stop(ctx.currentTime + 0.3); } return; }
        if (!ok() || hum) return;
        // the riser: a saw and a band of noise that both climb with the meter
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = 70; f.type = 'lowpass'; f.frequency.value = 400; gn.gain.value = 0.0001;
        gn.gain.setTargetAtTime(0.05, ctx.currentTime, 0.05);
        o.connect(f).connect(gn).connect(ctx.destination); o.start();
        const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const ns = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
        ns.buffer = nb; ns.loop = true; bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.value = 500; ng.gain.value = 0.0001;
        ng.gain.setTargetAtTime(0.03, ctx.currentTime, 0.08);
        ns.connect(bp).connect(ng).connect(ctx.destination); ns.start();
        hum = { o, f, g: gn, ns, bp, ng };
      },
      level(c) {
        if (!hum) return;
        const t = ctx.currentTime;
        hum.o.frequency.setTargetAtTime(70 + 520 * c, t, 0.03); hum.f.frequency.setTargetAtTime(400 + 3200 * c, t, 0.03);
        hum.bp.frequency.setTargetAtTime(500 + 5200 * c * c, t, 0.03); hum.ng.gain.setTargetAtTime(0.03 + 0.09 * c * c, t, 0.05);
      },
      pop() {
        if (!ok()) return;
        const hit = (window.BB && BB.clips && BB.clips.open && BB.clips.open.hit) || 0;
        // tsss when the tab cracks, the slam on the hit; the synth pop if the samples are not in yet
        if (!play('tsss', 0.9) | !play('hit', 1, hit)) { noise(0.35, 'bandpass', 3200, 0.5); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.05 + i * 0.05, 0.7, 0.06)); }
        play('whoosh', 0.5, hit + 0.55);
      },
      play,
      down() { if (!ok()) return; tone(440, 0, DRAIN, 0.07, 'triangle', 70); },
      fizz() { if (!ok()) return; noise(0.25, 'highpass', 5000, 0.12); },
      suspend(h) { if (ctx && on) (h ? ctx.suspend() : ctx.resume()).catch(() => {}); },
    };
  })();

  // ---------- share ----------
  let toastTimer = 0;
  function note(msg) {
    toast.textContent = msg;
    toast.classList.remove('out');
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('out');                       // leave the way it came, then hide
      toastTimer = setTimeout(() => { toast.hidden = true; toast.classList.remove('out'); }, RM ? 0 : 160);
    }, 2500);
  }
  async function share() {
    const data = { title: 'Det er tid for batteribytte!', text: 'Er du klar?', url: location.href.split('#')[0] };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(data.url);
      note('Lenke kopiert – lim den inn til kollegaene');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      note('Kunne ikke kopiere. Del denne lenken: ' + data.url);
    }
  }

  // ---------- wiring ----------
  ja.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    ja.setPointerCapture(e.pointerId);
    startCharge(false);
  });
  const up = () => release(false);
  ja.addEventListener('pointerup', up);
  ja.addEventListener('pointercancel', up);
  ja.addEventListener('lostpointercapture', up);
  ja.addEventListener('contextmenu', (e) => e.preventDefault());
  ja.addEventListener('click', (e) => { if (e.detail === 0) startCharge(true); });   // Enter, or a click without a pointer
  ja.addEventListener('keydown', (e) => {
    if (e.key !== ' ') return;
    e.preventDefault();
    if (!e.repeat) startCharge(false);
  });
  ja.addEventListener('keyup', (e) => { if (e.key === ' ') { e.preventDefault(); release(false); } });
  nei.addEventListener('click', answerNo);
  $('#again').addEventListener('click', backToAsk);
  $('#retry').addEventListener('click', backToAsk);
  $('#share').addEventListener('click', share);
  soundBtn.addEventListener('click', () => {
    const on = sound.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.title = on ? 'Slå av lyd (M)' : 'Slå på lyd (M)';
  });

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'm') soundBtn.click();
    else if (k === 'j' && state === 'ask') startCharge(true);
    else if (k === 'n' && state === 'ask') answerNo();
  });
  document.addEventListener('visibilitychange', () => {
    sound.suspend(document.hidden);
    if (document.hidden && holding) release(false);
  });

  window.BB = {
    get state() { return state; },
    get level() { return level; },
    get pumping() { return state === 'charging' && (holding || auto); },
    fizz() { sound.fizz(); },
    sfx(name, gain) { sound.play(name, gain); },
  };

  // ---------- the headline arrives letter by letter, once ----------
  if (!RM) {
    let i = 0;
    for (const word of document.querySelectorAll('.title .nw')) {
      word.innerHTML = [...word.textContent].map((c) => `<span class="ch" aria-hidden="true" style="--i:${i++}">${c}</span>`).join('');
    }
  }
  setLevel(START);
  say('Det er tid for batteribytte! Er du klar? Velg ja eller nei.');
  kick();
})();
