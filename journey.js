// Batteribytte · «reisen»: the AI film (assets/journey2-*.mp4, every frame a key frame) is the base of the whole page.
//
//   ask / no   the can stands in the fog and the film breathes slowly over its last seconds (15.75–16.46 s);
//              on a mouse the picture also follows the pointer, on touch it drifts in slowly
//   Ja         the film rewinds in one whoosh (blur, light, a flash) to the macro of the lid, then the meter scrubs it:
//              time = charge × T_POP. Let go and it runs back; at 100 % the can waits in the fog («Åpne!»)
//   open       it plays on from T_POP: the tab lifts, foam runs down the can, and it stops on the last frame
//   again      it whooshes back to the can in the fog
//
// One spring drives the time of the film toward wherever the state wants it, so every cut is a movement.
// The poster (the same hero frame) is on screen from the first paint; the video fades in over it once it has loaded.
// If the film cannot load at all, or with reduced motion, the photo version of the can stays instead.
//
// What the film holds (verified frame by frame): 0–2.5 s macro of the lid and a drop · 2.5–5.9 s through the drop,
// ice, pink bubbles · 5.9–9 s more bubbles, the surface breaks at ~8 s · 9–12.5 s teal fog and lightning ·
// 12.5–15.4 s the fog thins and the can appears · 16.65 s the tab lifts · 16.9 s spray, foam runs down · 20.6 s hero,
// then «Fullt ladet!» comes in over the last frame.
(() => {
  const root = document.documentElement;
  const BB = window.BB;
  const video = document.getElementById('journey');
  const film = document.getElementById('film');
  const off = () => root.classList.remove('film-base', 'film-ready', 'rush');
  if (!BB || !video || !film || matchMedia('(prefers-reduced-motion: reduce)').matches) { off(); return; }
  const J = window.JOURNEY = { active: false };      // active: the film is loaded and in charge

  const T_POP = 16.5;            // the last frame before the tab moves: the charge ends here (easy to adjust)
  const T_HIT = 16.85;           // the spray: the slam (sound and vibration) lands here
  const HOLD_A = 15.75, HOLD_B = T_POP - 0.04;     // the stretch the waiting can breathes over
  const BREATH = Math.PI / 1.8;                    // rad/s: one slow breath every 3.6 s
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

  // after the pop the film runs to its last frame; if it stalls for data or gets paused on the way, it picks up again
  let playing = false;
  const keepGoing = () => { if (playing && !video.ended && BB.state === 'yes') { const p = video.play(); if (p) p.catch(() => {}); } };
  video.addEventListener('pause', () => setTimeout(keepGoing, 120));
  video.addEventListener('stalled', keepGoing);
  function onEnd(fn) {
    let fired = false;
    const once = () => { if (fired) return; fired = true; playing = false; clearTimeout(guard); fn(); };
    video.addEventListener('ended', once, { once: true });
    // never leave the page without its buttons: give up waiting a while after the film should have ended
    const guard = setTimeout(once, ((video.duration || 20.6) - T_POP) * 1000 + 6000);
  }

  // ---------- load: after the first paint, when the browser is idle; the small file where it makes sense ----------
  function pickSrc() {
    const c = navigator.connection || {};
    const slow = c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '');
    const small = matchMedia('(pointer: coarse)').matches && navigator.deviceMemory && navigator.deviceMemory <= 4;
    return slow || small ? 'assets/journey2-540.mp4' : 'assets/journey2-720.mp4';
  }
  // iOS Safari ignores preload="auto" and fetches nothing until the video plays. A muted inline video may play
  // without a gesture, so a silent play() + pause() starts the download (the video is invisible until it is ready).
  function kick() {
    if (playing || !video.paused) return;
    const p = video.play();
    if (p) p.then(() => { if (!playing) video.pause(); }).catch(() => {});
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

  // ---------- ready: the video seeks to the poster's frame, then fades in over it ----------
  let ready = false, failed = false, waitSince = 0, giveUp = 0;
  let shown = (HOLD_A + HOLD_B) / 2, vel = 0;       // where the film is now (s), and how fast it is moving
  function tryReady() {
    if (ready || failed || video.readyState < 2) return;
    ready = true;
    shown = baseT(performance.now());
    video.addEventListener('seeked', () => { J.active = true; root.classList.add('film-ready'); clearTimeout(giveUp); }, { once: true });
    video.currentTime = shown;
  }
  video.addEventListener('loadeddata', tryReady);
  video.addEventListener('canplay', tryReady);
  function fail() {                                  // the film cannot be used: the photo of the can takes over
    failed = true; J.active = false; playing = false;
    off();
  }
  video.addEventListener('error', fail);
  // charging always uses the film: until it is on screen the meter waits («Laster filmen …»).
  // Only if it cannot load at all (an error, or nothing after MAX_WAIT) does the charge run with the photo.
  const MAX_WAIT = 20000;
  const waiting = () => BB.state === 'charging' && !J.active && !failed && performance.now() - waitSince < MAX_WAIT;

  // ---------- the flash over the start of the rewind ----------
  const flash = document.getElementById('flash');
  function quickFlash() { if (!flash) return; flash.classList.remove('quick'); void flash.offsetWidth; flash.classList.add('quick'); }

  // ---------- one spring drives the film's time; seek only when it is worth a frame ----------
  let t0 = performance.now(), rush = false;
  const baseT = (now) => {                           // the breathing: a slow ease in and out between HOLD_A and HOLD_B
    const k = (1 - Math.cos(((now - t0) / 1000) * BREATH)) / 2;
    return HOLD_B - (HOLD_B - HOLD_A) * k;
  };
  const targetT = (now) => (BB.state === 'charging' ? clamp((BB.level - 6) / 94) * T_POP : baseT(now));
  function drive(now, dt) {
    if (!J.active || playing || BB.state === 'yes') return;
    const err = targetT(now) - shown;
    if (!rush && Math.abs(err) > 1.5) { rush = true; root.classList.add('rush'); if (BB.state === 'charging') quickFlash(); }
    else if (rush && Math.abs(err) < 0.3) { rush = false; root.classList.remove('rush'); }
    const W = rush ? 6.5 : 18;                       // stiffness: critically damped, so no overshoot
    vel += (W * W * err - 2 * W * vel) * dt;
    shown += vel * dt;
    const ct = clamp(shown, 0, (video.duration || 20.6) - 0.05);
    if (Math.abs(ct - video.currentTime) > 1 / 48 && !video.seeking) video.currentTime = ct;
  }

  // ---------- the picture itself: it follows the pointer and pushes in with the charge ----------
  let px = 0, py = 0, tx = 0, ty = 0, lastT = '';
  if (FINE) addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  function frameOf(dt) {
    const k = Math.min(1, dt * 3);
    px += (tx - px) * k; py += (ty - py) * k;
    const c = BB.state === 'charging' ? clamp((BB.level - 6) / 94) : BB.state === 'armed' ? 1 : 0;
    const s = 1.04 + 0.035 * c;
    const lift = innerWidth / innerHeight < 4 / 3 ? -innerHeight * 0.05 : 0;      // on a phone the can stands a little higher, clear of the buttons
    const t = `translate3d(${(-px * 16).toFixed(1)}px, ${(lift - py * 10).toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
    if (t !== lastT) { lastT = t; film.style.transform = t; }
  }
  let last = performance.now();
  (function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    drive(now, dt);
    frameOf(dt);
    requestAnimationFrame(loop);
  })(last);

  // ---------- the moments ----------
  addEventListener('bb', (e) => {
    const t = e.detail;
    if (t === 'charge') {
      waitSince = performance.now();
      load();
      if (!ready) {
        // no frame yet (iOS fetches nothing before a play): ask for it inside this press; the meter waits for it
        kick();
        clearTimeout(giveUp);
        giveUp = setTimeout(() => { if (!J.active) fail(); }, MAX_WAIT);
      }
    } else if (t === 'pop' && J.active) {
      video.currentTime = T_POP;
      playing = true;
      const p = video.play(); if (p) p.catch(() => {});
    } else if (t === 'ask') {
      playing = false;
      if (!video.paused) video.pause();
      shown = video.currentTime || shown; vel = 0;   // the spring takes it from wherever the film stopped
    }
  });

  Object.assign(J, { onEnd, waiting, T_POP, HIT_DELAY: (T_HIT - T_POP) * 1000 });
})();
