// Batteribytte · the page: picks the stage (the live pant machine, or the light fallback of stills), and gives every
// step its words (the action chip, the hint, what a screen reader hears) and its keyboard. The stage tells us which
// step it is on (ui.step), and when the story is over (run() resolves with the receipt).
import * as S from './sound.js';
import { drawReceipt, receiptFonts, shareReceipt } from './receipt.js';

// every step: what the chip says, a short hint, what a screen reader hears, and how the keyboard does it
const STEPS = {
  intro: { verb: '', say: 'Batteribytte. En pantemaskin for flate batterier våkner i mørket.' },
  wait:  { verb: '' },                                   // between steps: the machine is busy, nothing to do
  drag:  { verb: 'Dra batteriet inn', hint: 'Dra den flate boksen inn i hullet', say: 'Du holder en flat, grå Battery-boks. Siste strek blinker rødt. Dra den inn i hullet på pantemaskinen, eller trykk Enter.' },
  roll:  { verb: 'Rull boksen', hint: 'Rull boksen til strekkoden vender opp', say: 'Avvist: strekkoden vises ikke. Rull boksen med piltastene, dra opp og ned, eller trykk Enter.' },
  press: { verb: 'Trykk PANT', hint: 'Trykk på den grønne knappen', say: 'Godkjent, og knust. Trykk på den grønne PANT-knappen, eller trykk Enter.' },
  shake: { verb: 'Rist maskinen', hint: 'Det nye batteriet sitter fast – rist!', say: 'Pantelappen er skrevet ut, men det nye batteriet sitter fast. Rist telefonen, dra fram og tilbake over skjermen, eller trykk R flere ganger.' },
  hold:  { verb: 'Hold for å lade', hint: 'Hold på batteriet til det er fullt', say: 'Det ferske batteriet svever foran deg. Hold på det, eller hold mellomrom, til logoen er fylt. Enter lader av seg selv.' },
  flick: { verb: 'Åpne', hint: 'Dra fliken opp', say: 'Hundre prosent. Dra fliken opp, eller trykk pil opp.' },
  done:  { verb: '', say: 'Batteriet er byttet. Pantelappen er klar, du kan dele den.' },
};

const $ = (s) => document.querySelector(s);
const root = document.documentElement;
const chip = $('#act'), hint = $('#hint'), status = $('#status'), soundBtn = $('#sound');
let stage = null, current = 'intro';

const ui = {
  step(name) {
    current = name;
    const s = STEPS[name] || {};
    root.dataset.step = name;
    chip.hidden = !s.verb;
    chip.querySelector('.verb').textContent = s.verb || '';
    hint.textContent = s.hint || '';
    if (s.say) status.textContent = s.say;
    if (s.verb && !chip.contains(document.activeElement) && !$('#lapp').contains(document.activeElement)) chip.focus({ preventScroll: true });
  },
};

// ---------- input that every stage shares ----------
// in the hold step the chip is held like the can; a quick tap (or Enter) charges it by itself
let chipDown = 0;
chip.addEventListener('pointerdown', (e) => { S.unlock(); if (current === 'hold' && stage) { e.preventDefault(); chipDown = performance.now(); chip.setPointerCapture(e.pointerId); stage.hold(true); } });
const chipUp = () => { if (current === 'hold' && stage) { stage.hold(false); if (performance.now() - chipDown < 280) stage.act(); } };
chip.addEventListener('pointerup', chipUp); chip.addEventListener('pointercancel', chipUp);
chip.addEventListener('click', (e) => { if (!stage) return; if (current === 'hold' && e.detail !== 0) return; stage.act(); });
chip.addEventListener('contextmenu', (e) => e.preventDefault());

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || !stage) return;
  const k = e.key;
  if (k === 'm' || k === 'M') { soundBtn.click(); return; }
  if ($('#lapp').contains(document.activeElement)) return;
  S.unlock();
  if (k === 'ArrowUp') { e.preventDefault(); stage.key('up'); }
  else if (k === 'ArrowDown') { e.preventDefault(); stage.key('down'); }
  else if (k === 'r' || k === 'R') stage.key('shake');
  else if (k === ' ') {
    e.preventDefault();
    if (current === 'shake') stage.key('shake');
    else if (current === 'hold') { if (!e.repeat) stage.hold(true); }
    else if (!e.repeat && document.activeElement !== chip) stage.act();
    else if (!e.repeat) stage.act();
  } else if (k === 'Enter' && document.activeElement !== chip && !e.repeat) stage.act();
});
addEventListener('keyup', (e) => { if (e.key === ' ' && current === 'hold' && stage) { e.preventDefault(); stage.hold(false); } });

soundBtn.addEventListener('click', () => {
  S.unlock();
  const on = !S.isOn(); S.setOn(on);
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.title = on ? 'Slå av lyd (M)' : 'Slå på lyd (M)';
});
document.addEventListener('visibilitychange', () => S.suspend(document.hidden));

// ---------- the end: the receipt, to keep and to share ----------
async function done(data) {
  ui.step('done');
  await receiptFonts();
  const c = drawReceipt(document.createElement('canvas'), data);
  const lapp = $('#lapp');
  $('#lapp-img').src = c.toDataURL('image/png');
  lapp.hidden = false;
  requestAnimationFrame(() => lapp.classList.add('in'));
  $('#share').focus({ preventScroll: true });
  $('#share').onclick = async () => {
    const r = await shareReceipt(c, location.href.split('#')[0]);
    note(r === 'copied' ? 'Lenke kopiert – lim den inn til kollegaene' : r === 'failed' ? 'Kunne ikke dele. Kopier adressen fra nettleseren.' : '');
  };
  $('#again').onclick = () => location.reload();
}
let noteT = 0;
function note(msg) {
  if (!msg) return;
  const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(noteT);
  noteT = setTimeout(() => { t.hidden = true; }, 2800);
}

// ---------- start: the live machine where we can, the light version otherwise ----------
function webgl() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
}
async function start() {
  receiptFonts();
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!RM && webgl()) {
    try {
      const { createWorld } = await import('./world.js');
      stage = await createWorld($('#gl'), ui);
      root.classList.add('live');
    } catch (e) {
      console.warn('Batteribytte: 3D off', e);
      stage = null;
    }
  }
  if (!stage) {
    const { createLite } = await import('./lite.js');
    stage = createLite(ui);
    root.classList.add('lite');
  }
  const data = await stage.run();
  done(data);
}
start();
