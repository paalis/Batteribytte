// Batteribytte · the clips. Plays the commercial-style clips listed in clips.json and keeps them in step with app.js:
//   idle   loops while the page waits (0 %)
//   charge is scrubbed by the battery level: frame = round(p · (N − 1)), p = (level − 6) / 94
//          phones draw a WebP sequence on <canvas> (iOS Safari scrubs video badly); desktop seeks an all-key-frame video
//   open   plays at 100 %;  drain plays on «Nei»
// Swap the clips by editing clips.json only (see ASSETS.md). If the manifest or a clip fails, the photo version stays.
(() => {
  const root = document.documentElement, BB = window.BB;
  if (!BB) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DESKTOP = matchMedia('(hover: hover) and (pointer: fine)').matches && !/iP(hone|ad|od)/.test(navigator.userAgent);
  const stage = document.getElementById('stage'), sceneEl = document.getElementById('scene');
  const box = document.getElementById('clip');
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

  fetch('clips.json').then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then(start).catch((e) => console.warn('Batteribytte clips off:', e));

  function start(M) {
    const W = M.width || 720, H = M.height || 1280, C = M.clips;
    // paths are relative to the page, or to "base" when the clips live elsewhere (Vercel Blob)
    const R = (u) => (u && M.base && !/^(https?:)?\/\//.test(u) ? M.base.replace(/\/$/, '') + '/' + u : u);
    const vid = (c, attrs = {}) => {
      const v = document.createElement('video');
      Object.assign(v, { muted: true, playsInline: true, preload: 'none', disablePictureInPicture: true, ...attrs });
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      if (c.poster) v.dataset.poster = R(c.poster);    // set when the clip is needed: nothing but idle loads up front
      v.className = 'layer';
      v.dataset.src = R(c.video);
      box.appendChild(v);
      return v;
    };
    const load = (v) => { if (!v.src) { if (v.dataset.poster) v.poster = v.dataset.poster; v.src = v.dataset.src; v.preload = 'auto'; v.load(); } };

    // ---------- layers ----------
    const idle = vid(C.idle, { loop: true, preload: 'auto' });
    idle.poster = idle.dataset.poster || '';
    const seq = document.createElement('canvas'); seq.className = 'layer'; seq.width = W; seq.height = H; box.appendChild(seq);
    const sg = seq.getContext('2d');
    const scrubV = DESKTOP && C.charge.scrub ? vid({ video: C.charge.scrub }) : null;
    const open = vid(C.open), drain = vid(C.drain);
    const all = [idle, seq, scrubV, open, drain].filter(Boolean);
    let shown = null;
    function showLayer(el) {
      if (shown === el) return;
      all.forEach((x) => x.classList.toggle('on', x === el));
      shown = el;
    }
    // first frame of idle as a still for reduced motion; the loop otherwise
    if (RM) { idle.removeAttribute('loop'); idle.poster = R(C.idle.poster) || ''; }
    else { load(idle); idle.play().catch(() => {}); }
    showLayer(idle);

    // ---------- the charge: a WebP sequence with a small window of decoded frames ----------
    const N = C.charge.count, pad = C.charge.pad || 3;
    const url = (i) => R(C.charge.frames.replace('{i}', String(i).padStart(pad, '0')));
    const imgs = new Array(N), bmp = new Map(), KEEP = 16;
    let seqLoading = false, cur = -1, dir = 1;
    function loadSeq() {                      // after the idle loop runs: fetch the compressed frames, nothing decoded yet
      if (seqLoading || scrubV) return;
      seqLoading = true;
      for (let i = 0; i < N; i++) { const im = new Image(); im.decoding = 'async'; im.src = url(i); imgs[i] = im; }
    }
    function decode(i) {
      if (i < 0 || i >= N || bmp.has(i) || !imgs[i] || !imgs[i].complete || !window.createImageBitmap) return;
      bmp.set(i, null);                       // pending
      createImageBitmap(imgs[i]).then((b) => {
        bmp.set(i, b);
        // keep only the frames around where we are
        if (bmp.size > KEEP) for (const [k, v] of bmp) { if (Math.abs(k - cur) > KEEP / 2 && v) { v.close(); bmp.delete(k); } if (bmp.size <= KEEP) break; }
        if (i === want) paint(i);
      }).catch(() => bmp.delete(i));
    }
    let want = 0;
    function paint(i) {
      const b = bmp.get(i);
      if (b) { sg.drawImage(b, 0, 0, W, H); cur = i; return true; }
      const im = imgs[i];
      if (im && im.complete && im.naturalWidth) { sg.drawImage(im, 0, 0, W, H); cur = i; return true; }
      return false;
    }
    function seqTo(i) {
      if (i !== want) dir = i > want ? 1 : -1;
      want = i;
      if (!paint(i)) {                        // not there yet: show the nearest frame we have, never a blank
        for (let d = 1; d < 6; d++) if (paint(i - d * dir) || paint(i + d * dir)) break;
      }
      for (let k = 1; k <= 6; k++) decode(i + k * dir);
      decode(i);
    }
    // desktop: seek an all-intra video; one seek in flight at a time
    let seeking = false, pendingT = -1;
    function scrubTo(i) {
      const t = (i + 0.5) / (C.charge.fps || 30);
      if (seeking) { pendingT = t; return; }
      seeking = true; scrubV.currentTime = t;
    }
    if (scrubV) scrubV.addEventListener('seeked', () => { seeking = false; if (pendingT >= 0) { const t = pendingT; pendingT = -1; seeking = true; scrubV.currentTime = t; } });

    // ---------- framing: fill a phone; a feathered vertical strip on wide screens ----------
    function layout() {
      const vw = innerWidth, vh = innerHeight, r = sceneEl.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (vw / vh < (W / H) * 1.25) {          // portrait-ish: full bleed, the can centred on the scene area
        const h = Math.max(vh, 2 * Math.max(cy, vh - cy));
        Object.assign(box.style, { left: '0px', width: vw + 'px', top: cy - h / 2 + 'px', height: h + 'px' });
        box.classList.remove('strip');
      } else {                                  // wide: a 9:16 strip on the can's column, edges fading into black
        const h = vh * 1.04, w = (h * W) / H;
        Object.assign(box.style, { left: cx - w / 2 + 'px', width: w + 'px', top: (vh - h) / 2 + 'px', height: h + 'px' });
        box.classList.add('strip');
      }
    }
    layout(); addEventListener('resize', layout);
    // clip coordinates (0–1) → screen pixels, for effects that sit on things in the clip (the can's top, the arcs)
    BB.clipToScreen = (x, y) => {
      const b = box.getBoundingClientRect(), s = Math.max(b.width / W, b.height / H);
      return [b.left + b.width / 2 + (x - 0.5) * W * s, b.top + b.height / 2 + (y - 0.5) * H * s];
    };
    BB.clips = C;

    // ---------- follow the state ----------
    const lvlFrame = () => Math.round(clamp((BB.level - 6) / 94) * (N - 1));
    const playFrom0 = (v) => { load(v); v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    addEventListener('bb', (e) => {
      const t = e.detail;
      if (t === 'charge') {
        if (RM) return;
        load(open); load(drain); loadSeq();
        if (scrubV) { load(scrubV); scrubTo(lvlFrame()); showLayer(scrubV); } else { seqTo(lvlFrame()); showLayer(seq); }
        idle.pause();
      } else if (t === 'pop') {
        if (RM) { open.poster = R(C.open.last || C.open.poster) || ''; showLayer(open); return; }
        playFrom0(open);
        const swap = () => showLayer(open);
        if (open.requestVideoFrameCallback) open.requestVideoFrameCallback(swap); else open.addEventListener('playing', swap, { once: true });
      } else if (t === 'no') {
        if (RM) { drain.poster = R(C.drain.last) || ''; showLayer(drain); return; }
        playFrom0(drain);
        const swap = () => showLayer(drain);
        if (drain.requestVideoFrameCallback) drain.requestVideoFrameCallback(swap); else drain.addEventListener('playing', swap, { once: true });
      } else if (t === 'ask') {
        showLayer(idle);
        if (!RM) { idle.currentTime = 0; idle.play().catch(() => {}); }
        open.pause(); drain.pause();
      }
    });
    // every frame while charging: the level picks the frame (and back to idle if it ran all the way back)
    let lastI = -1;
    (function tick() {
      if (BB.state === 'charging' && !RM) {
        const i = lvlFrame();
        if (i !== lastI) { lastI = i; if (scrubV) scrubTo(i); else seqTo(i); }
      } else if (BB.state === 'ask' && shown !== idle) {
        showLayer(idle); idle.play().catch(() => {});
      }
      requestAnimationFrame(tick);
    })();
    // warm the sequence a moment after the loop starts, so the first press finds it ready
    setTimeout(loadSeq, 1200);
    document.addEventListener('visibilitychange', () => { if (document.hidden) idle.pause(); else if (shown === idle && !RM) idle.play().catch(() => {}); });

    // the page is now a commercial: the photo can stands down
    const ready = () => root.classList.add('clips');
    if (RM || idle.readyState >= 2) ready(); else { idle.addEventListener('loadeddata', ready, { once: true }); setTimeout(ready, 2500); }
  }
})();
