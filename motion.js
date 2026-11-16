// Batteribytte · type and interface motion (GSAP 3, lib/gsap.min.js). No linear easing anywhere: power3/expo for
// entrances, back/elastic for overshoot, a small squash before every big move (anticipation). Big words land on a
// 120 bpm grid (a 16th = 0.125 s). Reduced motion: none of this runs and the page shows its end states.
(() => {
  const gsap = window.gsap, BB = window.BB;
  if (!gsap || !BB || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  root.classList.add('gsap');
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const BEAT = 0.5, S16 = BEAT / 4;
  const count = $('#count'), ja = $('#ja'), clip = $('#clip');

  // split a heading into word spans (kept readable: the heading keeps its text, the spans are presentation)
  function words(el) {
    if (el.dataset.split) return [...el.querySelectorAll('.w')];
    el.dataset.split = '1';
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    return [...el.querySelectorAll('.w')];
  }

  // ---------- the opening: the headline rises out of a mask, letter by letter, then the question ----------
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro.from('.kicker', { yPercent: 60, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0.1)
    .set('.title .nw', { clipPath: 'inset(0 -30% 0 -30%)' }, 0)
    .from('.title .ch', { yPercent: 108, rotate: 7, duration: 0.95, stagger: 0.035 }, 0.18)
    .set('.title .nw', { clearProps: 'clipPath' })
    .from('#ask h2', { y: 18, opacity: 0, duration: 0.6, ease: 'power3.out' }, 0.62)
    .fromTo('.choice', { y: 26, scale: 0.9, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.7, stagger: 0.07, ease: 'back.out(2.2)', clearProps: 'opacity,transform,translate,scale' }, 0.72)
    .from('#hint', { opacity: 0, duration: 0.5, ease: 'power2.out' }, 0.95);

  // ---------- «Ja»: squash on press (anticipation), spring back with overshoot ----------
  ja.addEventListener('pointerdown', () => gsap.to(ja, { scale: 0.92, duration: 0.14, ease: 'power2.out', overwrite: 'auto' }));
  const springBack = () => gsap.to(ja, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.38)', overwrite: 'auto' });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => ja.addEventListener(t, springBack));

  // ---------- the counter: a big number that runs with the clip ----------
  let punched = 0, showing = false;
  function countIn() {
    if (showing) return; showing = true; punched = 0;
    gsap.fromTo(count, { yPercent: 40, opacity: 0, scale: 0.9 }, { yPercent: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'expo.out', overwrite: 'auto' });
  }
  function countOut(d = 0) {
    if (!showing) return; showing = false;
    gsap.to(count, { yPercent: -30, opacity: 0, duration: 0.35, delay: d, ease: 'power3.in', overwrite: 'auto' });
  }
  (function tick() {
    const st = BB.state, lv = Math.round(BB.level);
    if (st === 'charging') {
      countIn();
      count.textContent = lv + ' %';
      const step = Math.floor(lv / 25);
      if (step > punched && lv < 100) { punched = step; gsap.fromTo(count, { scale: 1.14 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }); }
    } else if (st === 'ask') countOut();
    requestAnimationFrame(tick);
  })();

  // ---------- the moments ----------
  addEventListener('bb', (e) => {
    const t = e.detail;
    if (t === 'pop') {
      const hit = BB.clips?.open?.hit ?? 0.25;
      count.textContent = '100 %';
      gsap.timeline()
        .to(count, { scale: 0.94, duration: 0.1, ease: 'power2.in' })                   // the breath before the slam
        .to(count, { scale: 1.35, duration: 0.18, ease: 'expo.out' }, hit)
        .add(() => countOut(0.25));
      // the frame shakes on the hit and settles (decays fast; video-director: e^(−14·t))
      gsap.timeline({ delay: hit })
        .to(clip, { keyframes: [{ x: 10, y: -6 }, { x: -8, y: 5 }, { x: 5, y: -3 }, { x: -2, y: 1 }, { x: 0, y: 0 }], duration: 0.32, ease: 'power3.out' });
    }
  });

  // panels: their words slam in on the grid when app.js shows them
  const panelIn = {
    yes(p) {
      const w = words(p.querySelector('h2'));
      return gsap.timeline()
        .from(w, { scale: 2.4, opacity: 0, rotate: -4, duration: 0.55, stagger: S16, ease: 'expo.out', transformOrigin: '50% 60%' })
        .from(p.querySelector('p'), { y: 14, opacity: 0, duration: 0.5, ease: 'power3.out' }, S16 * 3)
        .fromTo(p.querySelectorAll('.chip'), { y: 22, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.06, ease: 'back.out(2)' }, S16 * 4);
    },
    no(p) {
      const w = words(p.querySelector('h2'));
      return gsap.timeline()
        .from(w, { y: -30, opacity: 0, rotate: 3, duration: 0.7, stagger: S16, ease: 'bounce.out' })
        .from(p.querySelector('p'), { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.3)
        .fromTo(p.querySelector('.chip'), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, 0.45);
    },
    ask(p) {
      return gsap.timeline()
        .from(p.querySelector('h2'), { y: 18, opacity: 0, duration: 0.5, ease: 'power3.out' })
        .fromTo(p.querySelectorAll('.choice'), { y: 22, scale: 0.9, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'back.out(2.2)', clearProps: 'opacity,transform,translate,scale' }, 0.08);
    },
  };
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      const p = m.target;
      if (m.attributeName === 'hidden' && !p.hidden && panelIn[p.id]) panelIn[p.id](p);
    }
  });
  $$('.panel').forEach((p) => mo.observe(p, { attributes: true, attributeFilter: ['hidden'] }));

  // the battery chip punches when it fills
  addEventListener('bb', (e) => { if (e.detail === 'pop') gsap.fromTo('#hud', { scale: 1.18 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)', delay: BB.clips?.open?.hit ?? 0.25 }); });
})();
