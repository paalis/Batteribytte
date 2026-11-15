// Batteribytte: plays the studio film (film-src/), then asks «Er du klar?». The film holds three segments:
// the intro (0–9 s, ends on the packshot), «Ja» (9–11 s) and «Nei» (11–13 s). The page plays one segment at a time.
// Interaction spec: docs/interaction-spec.md
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const stage = $('#stage'), film = $('#film'), status = $('#status');
  const panels = { ask: $('#ask'), yes: $('#yes'), no: $('#no') };
  const soundBtn = $('#sound'), skipBtn = $('#skip');
  const progress = $('#progress'), loader = $('#loader'), loaderPct = $('#loader-pct'), note = $('#note');
  const meter = $('#meter'), meterFill = $('#meter-fill'), meterPct = $('#meter-pct'), meterLabel = $('#meter-label');
  const toast = $('#toast');

  const SEG = { intro: [0, 9], ja: [9, 11], nei: [11, 13] };
  const PACK = 8.9;                       // a frame of the packshot to rest on
  const HIT = { ja: 10.3, nei: 12.4 };    // where the result lands: the impact (Ja), the lights gone (Nei)
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = { inOut2: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2), in1: (k) => k * k };
  // the can's battery meter in the film, mirrored in the page (same times and curves as film-src/index.html)
  const level = (t, answer) => {
    const clamp = (x) => Math.max(0, Math.min(1, x));
    if (answer === 'ja') return 6 + 94 * ease.inOut2(clamp((t - 9.15) / 1.3));
    return 6 - 6 * ease.in1(clamp((t - 11.3) / 1.2));
  };

  stage.dataset.state = 'intro';          // without JS the page shows the question straight away

  // the tall film on portrait screens, the wide one elsewhere; H.264 where it plays, else VP9
  const tall = matchMedia('(max-aspect-ratio: 1/1)').matches;
  const mp4 = film.canPlayType('video/mp4; codecs="avc1.640028, mp4a.40.2"') !== '';
  film.poster = tall ? film.dataset.posterTall : film.dataset.posterWide;
  film.src = (tall ? film.dataset.tall : film.dataset.wide) + (mp4 ? '.mp4' : '.webm');

  // ---------- play one segment; tick every frame; stop on its last frame ----------
  let seg = null, watching = 0;
  function watch() {
    if (!seg) return;
    const t = film.currentTime;
    if (seg.tick) seg.tick(t);
    if (seg.at != null && t >= seg.at) { const f = seg.atFn; seg.at = null; f(); }
    if (t >= seg.to - 0.04) {
      film.pause();
      film.currentTime = seg.to - 0.04;
      const s = seg; seg = null;
      if (s.tick) s.tick(s.to);
      if (s.at != null) s.atFn();
      if (s.done) s.done();
      return;
    }
    watching = requestAnimationFrame(watch);
  }
  function play([from, to], o = {}) {
    cancelAnimationFrame(watching);
    seg = { to, tick: o.tick, done: o.done, at: o.at, atFn: o.atFn };
    film.currentTime = from;
    const p = film.play();
    // if the browser refuses to play, jump to the end of the segment and carry on
    if (p && p.catch) p.catch(() => { if (seg) { const s = seg; rest(to - 0.04); if (s.tick) s.tick(to); if (s.at != null) s.atFn(); if (s.done) s.done(); } });
    watching = requestAnimationFrame(watch);
  }
  function rest(t) { cancelAnimationFrame(watching); seg = null; film.pause(); film.currentTime = t; }

  // ---------- panels ----------
  function show(id) {
    Object.entries(panels).forEach(([k, el]) => {
      el.hidden = k !== id;
      if (k === id && !RM) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
    });
  }
  function resetChoices() {
    $$('.choice').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $('.choices').classList.remove('locked');
  }
  function setProgress(k) { progress.style.transform = `scaleX(${Math.max(0, Math.min(1, k))})`; }

  // ---------- states ----------
  function ask(focus) {
    stage.dataset.state = 'ask';
    skipBtn.hidden = true;
    setProgress(0);
    meter.hidden = true;
    resetChoices();
    show('ask');
    status.textContent = 'Det er tid for batteribytte! Er du klar? Velg ja eller nei.';
    if (focus) $('.choice.yes').focus({ preventScroll: true });
  }
  function intro() {
    stage.dataset.state = 'intro';
    show(null);
    note.hidden = true;
    if (RM) { rest(PACK); ask(false); return; }
    skipBtn.hidden = false;
    play(SEG.intro, { tick: (t) => setProgress(t / SEG.intro[1]), done: () => ask(false) });
  }
  function skip() { if (stage.dataset.state !== 'intro') return; rest(PACK); ask(true); }

  let busy = false;
  function answer(btn) {
    if (busy || stage.dataset.state !== 'ask') return;
    busy = true;
    const key = btn.dataset.answer;      // 'ja' | 'nei'
    const yes = key === 'ja';
    // feedback within 100 ms: the box is ticked, the other choice steps back, the meter appears
    btn.setAttribute('aria-pressed', 'true');
    $('.choices').classList.add('locked');
    if (navigator.vibrate) navigator.vibrate(yes ? 12 : [8, 60, 8]);
    stage.dataset.state = key;
    meterLabel.textContent = yes ? 'Lader' : 'Tapper';
    meter.dataset.answer = key;
    const showLevel = (t) => {
      const v = Math.round(level(t, key));
      meterFill.style.transform = `scaleX(${v / 100})`;
      meterPct.textContent = v + ' %';
      meter.classList.toggle('low', v < 20);
    };
    showLevel(SEG[key][0]);
    panels.ask.hidden = true;
    meter.hidden = false;
    if (!RM) { meter.classList.remove('enter'); void meter.offsetWidth; meter.classList.add('enter'); }

    const land = () => {
      meter.hidden = true;
      show(yes ? 'yes' : 'no');
      status.textContent = yes ? 'Fullt ladet! Batteriet er byttet. Skål!' : 'Lavt batteri. Helt greit, vi venter til du er klar.';
      (yes ? $('#share') : $('#retry')).focus({ preventScroll: true });
      busy = false;
    };
    if (RM) { rest(SEG[key][1] - 0.04); showLevel(SEG[key][1]); land(); return; }
    play(SEG[key], { tick: showLevel, at: HIT[key], atFn: land });
  }

  // ---------- share: the page's real purpose is to tell colleagues ----------
  let toastTimer = 0;
  function say(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
  }
  async function share() {
    const data = { title: 'Det er tid for batteribytte!', text: 'Er du klar?', url: location.href.split('#')[0] };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(data.url);
      say('Lenke kopiert – lim den inn til kollegaene');
    } catch (e) {
      if (e && e.name === 'AbortError') return;               // the user closed the share sheet
      say('Kunne ikke kopiere. Del denne lenken: ' + data.url);
    }
  }

  // ---------- sound: one control, its state shown, never relabelled as an action ----------
  function toggleSound() {
    film.muted = !film.muted;
    soundBtn.setAttribute('aria-pressed', String(!film.muted));
    soundBtn.title = film.muted ? 'Slå på lyd (M)' : 'Slå av lyd (M)';
  }

  // ---------- wiring ----------
  $$('.choice').forEach((b) => b.addEventListener('click', () => answer(b)));
  $('#again').addEventListener('click', () => { busy = false; intro(); });
  $('#retry').addEventListener('click', () => { busy = false; rest(PACK); ask(true); });
  $('#share').addEventListener('click', share);
  skipBtn.addEventListener('click', skip);
  soundBtn.addEventListener('click', toggleSound);

  // keyboard: J = Ja, N = Nei, Esc = skip the film, M = sound (never while typing or with modifiers)
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') skip();
    else if (k === 'm') toggleSound();
    else if (k === 'j' && stage.dataset.state === 'ask') answer($('.choice.yes'));
    else if (k === 'n' && stage.dataset.state === 'ask') answer($('.choice.no'));
  });

  // pause with the tab, carry on where it was
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) film.pause();
    else if (seg) film.play().catch(() => {});
  });

  // ---------- loading: say what is happening after 400 ms; give up gracefully after 8 s ----------
  let started = false;
  const pct = () => {
    try { const b = film.buffered; return b.length && film.duration ? Math.round((b.end(b.length - 1) / SEG.intro[1]) * 100) : 0; }
    catch { return 0; }
  };
  const showLoader = setTimeout(() => { if (!started) loader.hidden = false; }, 400);
  const tickLoader = setInterval(() => { if (!started) loaderPct.textContent = Math.min(99, pct()) + ' %'; }, 250);
  function begin() {
    if (started) return;
    started = true;
    clearTimeout(showLoader); clearInterval(tickLoader); clearTimeout(giveUp);
    loader.hidden = true;
    intro();
  }
  function fallback(why) {
    if (started) return;
    started = true;
    clearTimeout(showLoader); clearInterval(tickLoader); clearTimeout(giveUp);
    loader.hidden = true;
    note.textContent = why + ' Vi går rett til spørsmålet.';
    note.hidden = false;
    ask(false);
  }
  const giveUp = setTimeout(() => fallback('Filmen laster tregt.'), 8000);
  film.addEventListener('error', () => fallback('Filmen kunne ikke spilles.'), { once: true });
  if (film.readyState >= 3) begin();
  else film.addEventListener('canplay', begin, { once: true });
})();
