// Batteribytte: plays the studio film (film-src/), then asks «Er du klar?». The film holds three segments:
// the intro (0–9 s, ends on the packshot), «Ja» (9–11 s) and «Nei» (11–13 s). The page plays one segment at a time.
(() => {
  const $ = (s) => document.querySelector(s);
  const stage = $('#stage'), film = $('#film'), status = $('#status');
  const panels = { ask: $('#ask'), yes: $('#yes'), no: $('#no') };
  const soundBtn = $('#sound'), skipBtn = $('#skip');
  const SEG = { intro: [0, 9], ja: [9, 11], nei: [11, 13] };
  const PACK = 8.9;                     // a frame of the packshot to rest on
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // the tall film on portrait screens, the wide one elsewhere (chosen once; both tell the same story)
  const tall = matchMedia('(max-aspect-ratio: 1/1)').matches;
  film.poster = tall ? film.dataset.posterTall : film.dataset.posterWide;
  film.src = tall ? film.dataset.tall : film.dataset.wide;

  // ---------- play one segment, stop on its last frame ----------
  let stopAt = null, onDone = null, watching = 0;
  function watch() {
    if (stopAt != null && film.currentTime >= stopAt - 0.04) {
      film.pause();
      film.currentTime = stopAt - 0.04;
      const done = onDone; stopAt = null; onDone = null;
      if (done) done();
      return;
    }
    watching = requestAnimationFrame(watch);
  }
  function play([from, to], done) {
    cancelAnimationFrame(watching);
    stopAt = to; onDone = done;
    film.currentTime = from;
    const p = film.play();
    // if the browser refuses to play, jump to the segment's last frame and carry on
    if (p && p.catch) p.catch(() => { if (stopAt == null) return; rest(to - 0.04); if (done) done(); });
    watching = requestAnimationFrame(watch);
  }
  function rest(t) {
    cancelAnimationFrame(watching); stopAt = null; onDone = null;
    film.pause(); film.currentTime = t;
  }

  // ---------- states ----------
  function show(id) { Object.entries(panels).forEach(([k, el]) => { el.hidden = k !== id; }); }
  function resetChoices() {
    document.querySelectorAll('.choice').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $('.choices').classList.remove('locked');
  }
  function ask(focus) {
    stage.dataset.state = 'ask';
    skipBtn.hidden = true;
    resetChoices();
    show('ask');
    status.textContent = 'Det er tid for batteribytte! Er du klar? Velg ja eller nei.';
    if (focus) $('.choice.yes').focus({ preventScroll: true });
  }
  function intro() {
    stage.dataset.state = 'intro';
    show(null);
    if (RM) { rest(PACK); ask(false); return; }
    skipBtn.hidden = false;
    play(SEG.intro, () => ask(false));
  }

  let busy = false;
  function answer(btn) {
    if (busy) return;
    busy = true;
    const yes = btn.dataset.answer === 'ja';
    btn.setAttribute('aria-pressed', 'true');
    $('.choices').classList.add('locked');
    const finish = () => {
      show(yes ? 'yes' : 'no');
      status.textContent = yes ? 'Fullt ladet! Batteriet er byttet. Skål!' : 'Lavt batteri. Helt greit, vi venter til du er klar.';
      (yes ? $('#again') : $('#retry')).focus({ preventScroll: true });
      busy = false;
    };
    setTimeout(() => { if (busy) panels.ask.hidden = true; }, RM ? 0 : 350);
    if (RM) { rest((yes ? SEG.ja : SEG.nei)[1] - 0.04); finish(); }
    else play(yes ? SEG.ja : SEG.nei, finish);
  }

  document.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => answer(b)));
  $('#again').addEventListener('click', () => { busy = false; intro(); });
  $('#retry').addEventListener('click', () => { busy = false; rest(PACK); ask(true); });
  skipBtn.addEventListener('click', () => { rest(PACK); ask(true); });

  // sound: the film starts muted (browsers require it); one tap turns its soundtrack on
  soundBtn.addEventListener('click', () => {
    film.muted = !film.muted;
    soundBtn.setAttribute('aria-pressed', String(!film.muted));
    soundBtn.textContent = film.muted ? 'Slå på lyd' : 'Lyd: på';
  });

  // pause with the tab, carry on where it was
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) film.pause();
    else if (stopAt != null) film.play().catch(() => {});
  });

  if (film.readyState >= 2) intro();
  else film.addEventListener('loadeddata', intro, { once: true });
})();
