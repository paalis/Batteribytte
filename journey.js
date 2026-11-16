// Batteribytte · «reisen»: the AI film (assets/journey2-*.mp4, every frame a key frame) is the charging scene.
// Holding «Ja» scrubs it with the meter (time = c × T_POP); at 100 % it plays on from T_POP: the tab lifts, foam runs
// down the can, and it stops on the last frame. The 3D studio (scene3d.js) does everything else and stays the
// fallback: if no frame of the film has arrived by 35 % of the charge, that charge runs in 3D as before. Off with reduced motion.
//
// What the film holds (verified frame by frame): 0–2.5 s macro of the lid and a drop · 2.5–5.9 s through the drop,
// ice, pink bubbles · 5.9–9 s more bubbles, the surface breaks at ~8 s · 9–12.5 s teal fog and lightning ·
// 12.5–15.4 s the fog thins and the can appears · 16.65 s the tab lifts · 16.9 s spray, foam runs down · 20.6 s hero.
(() => {
  const BB = window.BB;
  const video = document.getElementById('journey');
  if (!BB || !video || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  const J = window.JOURNEY = { active: false };

  const T_POP = 16.5;            // the last frame before the tab moves: the charge ends here (easy to adjust)
  const T_HIT = 16.85;           // the spray: the page's flash and droplets land here
  const T_YES = 18.4;            // about 1.5 s into the foam: «Fullt ladet!» comes in
  const POP_AT = [0.52, 0.36];   // the top of the can in the pop frame, as fractions of the 720×1280 frame
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

  // ---------- load: after the first paint, when the browser is idle; the small file where it makes sense ----------
  function pickSrc() {
    const c = navigator.connection || {};
    const slow = c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '');
    const small = matchMedia('(pointer: coarse)').matches && navigator.deviceMemory && navigator.deviceMemory <= 4;
    return slow || small ? 'assets/journey2-540.mp4' : 'assets/journey2-720.mp4';
  }
  // iOS Safari ignores preload="auto" and fetches nothing until the video plays. A muted inline video may play
  // without a gesture, so a silent play() + pause() starts the download (it stays invisible until it is needed).
  function kick() {
    if (J.active || !video.paused) return;
    const p = video.play();
    if (p) p.then(() => { if (!J.active) { video.pause(); if (BB.state !== 'charging') video.currentTime = 0; } }).catch(() => {});
  }
  function load() {
    if (video.src) return;
    video.preload = 'auto';
    video.src = pickSrc();
    video.load();
    kick();
  }
  requestAnimationFrame(() => (window.requestIdleCallback ? requestIdleCallback(load, { timeout: 2500 }) : setTimeout(load, 1500)));
  // iOS: a play() inside a user gesture unlocks the element for later seeks and plays
  addEventListener('pointerdown', function prime() {
    removeEventListener('pointerdown', prime, true);
    load();
    if (video.readyState < 2) kick();
  }, true);

  // ---------- show / hide (a 200 ms cross-fade with a short flash over the seam) ----------
  const flash = document.getElementById('flash');
  function quickFlash() { flash.classList.remove('quick'); void flash.offsetWidth; flash.classList.add('quick'); }
  function showFilm() {
    J.active = true;
    quickFlash();
    root.classList.add('journey-on');
    if (window.BB3D) setTimeout(() => { if (J.active) BB3D.pause(); }, 220);
  }
  function hideFilm() {
    if (!J.active) return;
    J.active = false;
    if (window.BB3D) BB3D.resume();
    root.classList.remove('journey-on');
    video.pause();
    setTimeout(() => { if (!J.active) { video.currentTime = 0; shown = 0; vel = 0; } }, 220);
  }
  // the film may take over while the charge is still early (it starts on the frame that matches the meter)
  const LATE = 0.35;
  const cNow = () => clamp((BB.level - 6) / 94);
  function start() {
    if (J.active || BB.state !== 'charging' || cNow() > LATE) return;
    video.pause();
    shown = cNow() * T_POP; vel = 0;
    const fadeIn = () => { if (BB.state === 'charging' && !J.active) showFilm(); };
    if (Math.abs(video.currentTime - shown) > 0.02) { video.addEventListener('seeked', fadeIn, { once: true }); video.currentTime = shown; }
    else if (video.requestVideoFrameCallback) { video.requestVideoFrameCallback(fadeIn); video.currentTime = shown; }
    else fadeIn();
  }

  // ---------- scrub: a critically damped spring toward c × T_POP; seek only when it is worth a frame ----------
  let shown = 0, vel = 0;
  const W = 18;                  // spring stiffness (critically damped: no overshoot)
  function tick(dt) {
    if (!J.active || BB.state !== 'charging') return;
    const target = clamp((BB.level - 6) / 94) * T_POP;
    const a = W * W * (target - shown) - 2 * W * vel;
    vel += a * dt; shown += vel * dt;
    if (Math.abs(shown - video.currentTime) > 1 / 48 && !video.seeking) video.currentTime = clamp(shown, 0, T_POP);
  }

  // ---------- the moments ----------
  addEventListener('bb', (e) => {
    const t = e.detail;
    if (t === 'charge') {
      load();
      // app.js sends 'charge' just before it sets the state: start right after, once it is 'charging'
      if (video.readyState >= 2) { Promise.resolve().then(start); return; }
      // no frame yet (iOS fetches nothing before a play): ask for it inside this press and join in when it arrives;
      // if it is too late in the charge, this one stays in 3D
      kick();
      const late = () => start();
      video.addEventListener('loadeddata', late, { once: true });
      video.addEventListener('canplay', late, { once: true });
    } else if (t === 'pop' && J.active) {
      video.currentTime = T_POP;
      const p = video.play(); if (p) p.catch(() => {});
    } else if (t === 'ask') hideFilm();
  });
  // releasing all the way back (no event for that) also returns to 3D
  (function watch() {
    if (J.active && BB.state === 'ask') hideFilm();
    requestAnimationFrame(watch);
  })();

  // the top of the can in the pop frame, on screen (object-fit cover on phones, contain on wide screens)
  function popXY() {
    const r = video.getBoundingClientRect(), vw = video.videoWidth || 720, vh = video.videoHeight || 1280;
    const cs = getComputedStyle(video), cover = cs.objectFit === 'cover';
    const s = cover ? Math.max(r.width / vw, r.height / vh) : Math.min(r.width / vw, r.height / vh);
    const [px, py] = (cs.objectPosition || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
    const ox = r.left + (r.width - vw * s) * (isNaN(px) ? 0.5 : px), oy = r.top + (r.height - vh * s) * (isNaN(py) ? 0.5 : py);
    return [ox + POP_AT[0] * vw * s, oy + POP_AT[1] * vh * s, 90 * s * (vw / 720)];
  }

  Object.assign(J, { tick, popXY, T_POP, HIT_DELAY: (T_HIT - T_POP) * 1000, YES_DELAY: (T_YES - T_POP) * 1000 });
})();
