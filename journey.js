// Batteribytte · «reisen», scroll-driven. One timeline, three ways to move it.
//
//   progress p (0 … 1) is the only truth. Scrolling moves it (Lenis for the inertia, GSAP ScrollTrigger maps the
//   scroll onto the master timeline), holding «Ja» moves it (it scrolls the page for you), and the keyboard moves it.
//   Everything reads p in the same frame: the film, the battery, the captions, the light on «Ja», the sound.
//
//   p = 0          the can stands in the fog and the film breathes over 15.75–16.46 s («Er du klar?»)
//   0 → REW        one whoosh back to the macro of the lid (the film runs backwards through itself, blurred)
//   REW → 1        the film is scrubbed 0 → T_POP while the battery charges 6 → 100 %
//   p = 1          the can waits («Åpne!»): scroll on, swipe up, press «Åpne!», J or Enter
//   open           the film plays on to its last frame (tab, spray, foam), then the can comes out of the film
//                  as a real 3D can you can turn (lib/can3d.js), and «Fullt ladet!» comes in
//
// The film is an image sequence on a canvas (frames/720 or frames/540, 24 fps, 494 frames), not a <video>:
// every frame is exact in both directions on every browser, and it loads coarse-to-fine so scrubbing works early.
// Loading it is the first charge: the battery fills 0 → 6 % while the first pass of frames comes in.
// With reduced motion, or if the libraries or the frames cannot load, the page stays the photo version (app.js).
(() => {
  const root = document.documentElement;
  const BB = window.BB;
  const film = document.getElementById('film');
  const cv = document.getElementById('frames');
  const off = () => root.classList.remove('film-base', 'film-ready', 'scroll-mode', 'finale');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!BB || !film || !cv || RM || !window.gsap || !window.ScrollTrigger || !window.Lenis) { off(); return; }
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  const J = window.JOURNEY = { active: false, scroll: false, progress: 0 };
  const N = 494, FPS = 24, END = (N - 1) / FPS;
  const T_POP = 16.5;            // the last frame before the tab moves: the charge ends here
  const T_HIT = 16.85;           // the spray: the slam (sound and vibration) lands here
  const HERO = 16.1;             // the poster's frame
  const HOLD_A = 15.75, HOLD_B = T_POP - 0.04;
  const BREATH = Math.PI / 1.8;  // rad/s: one slow breath every 3.6 s
  const REW = 0.06;              // the share of the scroll that rewinds the film to its first frame
  const FULL = 8, FALL = 2.4;    // seconds for «Ja» to charge 0 → 100 %, and to fall back 100 → 0 when let go
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (k) => k * k * (3 - 2 * k);

  // ---------- frames: coarse to fine, so the whole film can be scrubbed long before every frame is here ----------
  const small = (() => {
    const c = navigator.connection || {};
    const slow = c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '');
    const phone = matchMedia('(pointer: coarse)').matches && (!navigator.deviceMemory || navigator.deviceMemory <= 4);
    return slow || phone;
  })();
  const DIR = small ? 'frames/540/' : 'frames/720/';
  const imgs = new Array(N), got = new Uint8Array(N);
  const heroI = Math.round(HERO * FPS);
  const order = [], seen = new Uint8Array(N);
  const push = (i) => { if (i >= 0 && i < N && !seen[i]) { seen[i] = 1; order.push(i); } };
  for (let i = Math.round(HOLD_A * FPS); i <= Math.round(T_POP * FPS); i++) push(i);   // the breathing first
  push(0);
  for (const s of [32, 8]) for (let i = 0; i < N; i += s) push(i);
  const FIRST = order.length;                       // the first pass: enough to scrub the whole film coarsely
  for (const s of [4, 2, 1]) for (let i = 0; i < N; i += s) push(i);

  let loaded = 0, failedN = 0, next = 0, firstDone = false;
  function pump() {
    while (next < order.length && inflight < 6) {
      const i = order[next++]; inflight++;
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        imgs[i] = im; got[i] = 1; loaded++; inflight--;
        if (i === heroI || (!J.active && got[heroI])) ready();
        progressLoad();
        pump();
      };
      im.onerror = () => { failedN++; inflight--; if (i === heroI) fail(); pump(); };
      im.src = DIR + String(i).padStart(3, '0') + '.webp';
    }
  }
  let inflight = 0;
  function progressLoad() {
    const f = clamp(Math.min(next, loaded + failedN) / FIRST);
    if (!firstDone) BB.boot(Math.min(f, loaded / FIRST));
    if (!firstDone && loaded + failedN >= FIRST) { firstDone = true; BB.boot(1); }
  }
  // start after the first paint, when the browser has a moment
  requestAnimationFrame(() => (window.requestIdleCallback ? requestIdleCallback(pump, { timeout: 800 }) : setTimeout(pump, 200)));
  const giveUp = setTimeout(() => { if (!J.active) fail(); }, 20000);

  function nearest(i) {
    if (got[i]) return i;
    for (let d = 1; d < 40; d++) { if (i - d >= 0 && got[i - d]) return i - d; if (i + d < N && got[i + d]) return i + d; }
    return -1;
  }

  // ---------- the canvas: the frame is drawn «cover», and the 3D can is placed in the same box ----------
  const g = cv.getContext('2d', { alpha: false });
  let box = { x: 0, y: 0, w: 0, h: 0 }, dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = film.clientWidth, h = film.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const s = Math.max(w / 720, h / 1280);
    box = { w: 720 * s, h: 1280 * s, x: (w - 720 * s) / 2, y: (h - 1280 * s) / 2 };
    g.imageSmoothingQuality = 'high';
    drawn = -1;
    if (can3d) placeCan();
  }
  let drawn = -1;
  function draw(t) {
    const fi = clamp(t * FPS, 0, N - 1);
    const a = Math.floor(fi), f = fi - a;
    const key = Math.round(fi * 8);                  // redraw only when the picture would change
    if (key === drawn) return;
    const ia = nearest(a);
    if (ia < 0) return;
    drawn = key;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.drawImage(imgs[ia], box.x, box.y, box.w, box.h);
    // between two frames, blend the next one in: slow scrolling glides instead of stepping
    const b = a + 1;
    if (f > 0.04 && b < N && got[b] && ia === a) { g.globalAlpha = f; g.drawImage(imgs[b], box.x, box.y, box.w, box.h); g.globalAlpha = 1; }
  }

  // ---------- smooth scrolling and the master timeline ----------
  let lenis = null, tl = null, st = null;
  const track = document.getElementById('track');
  function setupScroll() {
    root.classList.add('scroll-mode');
    lenis = new window.Lenis({ autoRaf: false, lerp: 0.085, smoothWheel: true, syncTouch: false, anchors: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // The master timeline is one unit long: its time is p. Everything that moves with the charge lives on it.
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    tl.set({}, {}, 1);
    tl.to('.copy', { autoAlpha: 0, y: -36, filter: 'blur(6px)', duration: 0.05, ease: 'power1.in' }, 0.004);
    tl.to('#ask-h', { autoAlpha: 0, duration: 0.03 }, 0.004);
    tl.fromTo('.scroll-cue', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.02 }, 0);
    // the captions follow what the film shows (docs/interaction-spec.md); their place on p is film time → p
    const pAt = (t) => REW + (1 - REW) * (t / T_POP);
    document.querySelectorAll('.cap').forEach((el) => {
      const a = pAt(+el.dataset.from), b = pAt(+el.dataset.to), d = Math.min(0.03, (b - a) / 3);
      tl.fromTo(el, { autoAlpha: 0, y: 28, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: d, ease: 'power2.out' }, a);
      tl.to(el, { autoAlpha: 0, y: -28, filter: 'blur(8px)', duration: d, ease: 'power2.in' }, b - d);
    });
    // the light rises with the charge: a warm bloom over the film
    tl.fromTo('.bloom', { opacity: 0 }, { opacity: 1, duration: 1 - REW, ease: 'power2.in' }, REW);

    st = ScrollTrigger.create({
      trigger: track, start: 'top top', end: 'bottom bottom', animation: tl, scrub: true,
      onUpdate: (self) => { J.progress = self.progress; BB.kick(); },
    });
    ScrollTrigger.config({ ignoreMobileResize: true });
    J.scroll = true;

    // at 100 %, one more push down opens the can (a wheel, a trackpad, a swipe up on touch). It has to be a new
    // gesture: the momentum of the scroll that got you here never opens it by itself.
    let push = 0, lastGesture = 0, fresh = false;
    lenis.on('virtual-scroll', ({ deltaY }) => {
      const now = performance.now();
      if (now - lastGesture > 260) fresh = true;
      lastGesture = now;
      if (BB.state !== 'armed' || now - armedAt < 300) { push = 0; fresh = false; return; }
      push = fresh && deltaY > 0 ? push + deltaY : 0;
      if (push > 70) { push = 0; fresh = false; BB.open(); }
    });
  }

  // holding «Ja» is scrolling: it moves the page toward the end at the charge's own speed; letting go falls back
  function go(mode) {
    if (!lenis) return;
    const max = lenis.limit || 1, cur = lenis.animatedScroll, p = clamp(cur / max);
    if (mode === 'up') lenis.scrollTo(max, { duration: Math.max(0.05, (1 - p) * FULL), easing: (x) => x, force: true });
    else if (mode === 'fall') lenis.scrollTo(0, { duration: Math.max(0.05, p * FALL), easing: (x) => x, force: true });
    else if (mode === 'stop') lenis.scrollTo(cur, { immediate: true, force: true });
  }

  // ---------- ready / fail ----------
  function ready() {
    if (J.active) return;
    J.active = true;
    clearTimeout(giveUp);
    resize();
    shown = breathT(performance.now());
    draw(shown);
    root.classList.add('film-ready');
    setupScroll();
  }
  function fail() {
    if (J.active || J.failed) return;
    J.failed = true;
    clearTimeout(giveUp);
    off();
    BB.boot(1);
  }

  // ---------- the film's time: a spring toward wherever p (or the state) wants it ----------
  let t0 = performance.now(), shown = HERO, vel = 0, slow = false, playing = false, playAt = 0, armedAt = 0;
  const breathT = (now) => HOLD_B - (HOLD_B - HOLD_A) * (1 - Math.cos(((now - t0) / 1000) * BREATH)) / 2;
  function targetT(now) {
    const p = J.progress;
    const hero = breathT(now);
    if (BB.state === 'no' || BB.state === 'draining' || p <= 0) return hero;
    if (p < REW) return hero * (1 - smooth(p / REW));          // the whoosh back to the first frame
    return ((p - REW) / (1 - REW)) * T_POP;
  }
  let flashed = false;
  const flash = document.getElementById('flash');
  function step(now, dt) {
    if (!J.active) return;
    let t;
    if (playing) {
      t = Math.min(END, T_POP + (now - playAt) / 1000);
      shown = t; vel = 0;
      if (t >= END) { playing = false; finale(); }
    } else if (BB.state === 'yes') {
      t = shown;
    } else {
      const target = targetT(now), e = shown - target;
      if (slow && Math.abs(e) < 0.25) slow = false;
      // a critically damped spring, solved exactly: no overshoot, and stable at any frame rate
      const W = slow ? 6.5 : 26, ex = Math.exp(-W * dt), k = (vel + W * e) * dt;
      vel = (vel - W * k) * ex;
      shown = target + (e + k) * ex;
      t = shown;
    }
    draw(clamp(t, 0, END));
    // speed is blur: the rewind and every fast scrub smear the picture a little, and brighten it
    const speed = playing ? 0 : Math.abs(vel);
    const blur = clamp((speed - 3) / 25) * 5;
    film.style.setProperty('--speed-blur', blur.toFixed(2) + 'px');
    film.style.setProperty('--speed-light', (1 + blur * 0.06).toFixed(3));
    // a flash as the rewind starts (once per pass through)
    const p = J.progress;
    if (p > 0.01 && p < REW && !flashed && BB.state === 'charging') { flashed = true; if (flash) { flash.classList.remove('quick'); void flash.offsetWidth; flash.classList.add('quick'); } }
    if (p <= 0.002) flashed = false;
  }

  // ---------- the picture follows the pointer, and pushes in with the charge ----------
  let px = 0, py = 0, tx = 0, ty = 0, lastT = '';
  if (FINE) addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  function frameOf(dt) {
    const k = Math.min(1, dt * 3);
    px += (tx - px) * k; py += (ty - py) * k;
    const c = BB.state === 'yes' ? 0 : J.progress;
    const s = 1.04 + 0.035 * c;
    const lift = innerWidth / innerHeight < 4 / 3 ? -innerHeight * 0.05 : 0;      // on a phone the can stands a little higher
    const t = `translate3d(${(-px * 16).toFixed(1)}px, ${(lift - py * 10).toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
    if (t !== lastT) { lastT = t; film.style.transform = t; }
  }

  let last = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(now, dt);
    frameOf(dt);
  });
  addEventListener('resize', () => { if (J.active) resize(); });

  // ---------- the finale: the can steps out of the film as a real 3D can ----------
  const host = document.getElementById('can3d');
  let can3d = null, canLoad = null, onEnded = null;
  function loadCan() {
    if (!canLoad && host) {
      canLoad = import('./lib/can3d.js').then((m) => m.mount(host)).then((c) => { can3d = c; placeCan(); return c; }).catch(() => null);
    }
    return canLoad || Promise.resolve(null);
  }
  function placeCan() {
    if (!can3d) return;
    Object.assign(host.style, { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });
    can3d.resize(Math.round(box.w), Math.round(box.h));
  }
  function finale() {
    const done = () => { const f = onEnded; onEnded = null; if (f) f(); };
    loadCan().then((c) => {
      if (BB.state !== 'yes') return;
      if (c) { root.classList.add('finale'); c.show(); }
      done();
    });
  }

  // ---------- the moments (app.js emits these) ----------
  addEventListener('bb', (e) => {
    const t = e.detail;
    if (!J.active) return;
    if (t === 'armed') { armedAt = performance.now(); loadCan(); }
    else if (t === 'pop') {
      lenis && lenis.stop();
      shown = T_POP; vel = 0; playing = true; playAt = performance.now();
    } else if (t === 'no') {
      lenis && lenis.stop();
    } else if (t === 'ask') {
      playing = false;
      root.classList.remove('finale');
      if (can3d) can3d.hide();
      slow = true; vel = 0;
      if (lenis) { lenis.start(); lenis.scrollTo(0, { immediate: true, force: true }); }
      J.progress = 0; t0 = performance.now();
      if (st) st.update();
    }
  });

  Object.assign(J, {
    go,
    onEnd(fn) { onEnded = fn; },
    waiting: () => false,
    get moving() { return !!(lenis && lenis.isScrolling); },
    T_POP, HIT_DELAY: (T_HIT - T_POP) * 1000,
  });
})();
