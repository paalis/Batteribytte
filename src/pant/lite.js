// Batteribytte · the light version: no WebGL, or reduced motion. The same story and the same receipt, told in stills
// rendered with Cycles from the live version's own camera stations (tools/blender/render_stills.py). Each step is
// one press of the action chip (or its key); the machine's screen becomes a caption. No movement, no shaking.
import * as S from './sound.js';

const SHOTS = {
  drag: ['start', 'FLATT BATTERI?', 'SETT INN HER'],
  roll: ['inside', 'AVVIST', 'STREKKODEN VISES IKKE'],
  press: ['button', 'KNAS! GODKJENT', 'TRYKK PANT'],
  shake: ['hatch', 'FEIL 0xBATT', 'BATTERIET SITTER FAST'],
  hold: ['hero', 'LAD OPP', 'HOLD PÅ BATTERIET'],
  flick: ['hero', '100 %', 'DRA FLIKEN OPP'],
  done: ['finale', 'FULLT LADET', 'BATTERIET ER BYTTET'],
};

export function createLite(ui) {
  const img = document.getElementById('poster');
  const cap = document.getElementById('caption');
  let resolveStep = null, current = null;
  const show = (name) => {
    const [still, title, sub] = SHOTS[name];
    img.src = `assets/pant/stills/${still}.webp`;
    cap.hidden = false;
    cap.querySelector('b').textContent = title;
    cap.querySelector('span').textContent = sub;
  };
  const step = (name) => new Promise((res) => { current = name; show(name); ui.step(name); resolveStep = res; });
  const next = () => { if (!resolveStep) return; const r = resolveStep; resolveStep = null; r(); };
  let holdT = 0;
  return {
    async run() {
      S.hum.start();
      for (const n of ['drag', 'roll', 'press', 'shake', 'hold', 'flick']) {
        await step(n);
        ({ drag: S.suck, roll: S.accept, press: S.click, shake: S.thud, hold: S.full, flick: S.pop })[n]();
      }
      show('done');
      return { time: new Date(), tries: 2, count: 1 + (Number(localStorage.getItem('bb-count') || 0) || 0) };
    },
    act() { next(); },
    key(k) { if ((k === 'up' && current === 'flick') || (k === 'shake' && current === 'shake') || ((k === 'up' || k === 'down') && current === 'roll')) next(); },
    hold(v) { clearTimeout(holdT); if (v && current === 'hold') holdT = setTimeout(next, 900); },
    get step() { return current; },
  };
}
