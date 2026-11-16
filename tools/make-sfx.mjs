// Renders the page's sound effects into assets/sfx/ with huashu-motion's own synthesiser (vendor/huashu-motion,
// MIT): everything is made from noise and oscillators, so there are no samples and no licences to track.
//   node tools/make-sfx.mjs        (needs ffmpeg for the .m4a files)
// The riser that follows the charge is synthesised live in app.js, because it has to follow the meter.
import { SFX, Track, toWav } from '../vendor/huashu-motion/cli/lib/sound.js';
import { biquad, decay, mix, noise, partials, peakTo, rng, shape } from '../vendor/huashu-motion/cli/lib/dsp.js';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const OUT = 'assets/sfx';
mkdirSync(OUT, { recursive: true });
const key = () => 440;
const fx = (name, o = {}) => { const s = SFX[name].fn(o, rng(name), key); return s.sig || s; };

const sounds = {
  // 100 %: the slam — a big impact with an 808 falling away under it
  hit: [1.6, [[fx('impact'), 0, 1], [fx('subdrop', { dur: 1.3 }), 0, 0.7]]],
  // the can opens: a sharp crack, then the hiss of the gas
  tsss: [1.2, [[peakTo(decay(biquad(noise(0.03, rng('crack')), 'bp', 2800, 1.4), 0.005), 0.8), 0, 1],
    [peakTo(shape(biquad(noise(1.1, rng('hiss')), 'hp', 4200), (u, t) => Math.min(1, t / 0.015) * Math.exp(-t / 0.32)), 0.55), 0.012, 1]]],
  // ice: three clinks against the can
  ice: [0.6, [0, 0.085, 0.2].map((at, i) => [peakTo(partials(2500 + i * 340, 0.3, [[1, 1, 0.06], [2.76, 0.5, 0.03], [5.4, 0.25, 0.015]], 0.0005), 0.45 - i * 0.08), at, 1])],
  // a fast whoosh for the cuts in the opening clip
  whoosh: [0.7, [[fx('whoosh', { dur: 0.5 }), 0, 0.8]]],
};

for (const [name, [sec, parts]] of Object.entries(sounds)) {
  const t = new Track(sec);
  for (const [sig, at, gain] of parts) {
    if (Array.isArray(sig)) { t.add(sig[0], at, gain, -1); t.add(sig[1], at, gain, 1); } else t.add(sig, at, gain);
  }
  const wav = `${OUT}/${name}.wav`;
  writeFileSync(wav, toWav(t));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-c:a', 'aac', '-b:a', '96k', `${OUT}/${name}.m4a`]);
  rmSync(wav);
  console.log(`${OUT}/${name}.m4a`);
}
