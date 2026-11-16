// Batteribytte · live effects over the clips: rolling fog (a WebGL shader), fizz and spray (particles) and lightning
// between the cans at 100 %. Everything follows app.js (window.BB) and sits on the clip through BB.clipToScreen.
// Nothing runs with reduced motion, and the loop sleeps while the tab is hidden.
(() => {
  const BB = window.BB;
  if (!BB || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  const fogCv = document.getElementById('fog'), cv = document.getElementById('fx2'), g = cv.getContext('2d');
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const COARSE = matchMedia('(pointer: coarse)').matches;

  // ---------- fog: fbm noise drifting sideways, thick on the floor, thin above; half resolution ----------
  const gl = fogCv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  let fogU = null;
  if (gl) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision mediump float;varying vec2 uv;uniform float t,dens,warm,asp;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<5;k++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
      void main(){vec2 q=vec2(uv.x*asp,uv.y)*2.6;
        float f=fbm(q+vec2(t*.05,-t*.015)+fbm(q*.7-vec2(t*.03,0.))*1.4);
        float floorBand=smoothstep(.62,0.,uv.y)*.9+.12;
        float a=clamp((f-.38)*1.9,0.,1.)*floorBand*dens;
        vec3 c=mix(vec3(.86,.91,1.),vec3(1.,.78,.5),warm);
        gl_FragColor=vec4(c*a,a);}`));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    fogU = { t: gl.getUniformLocation(prog, 't'), dens: gl.getUniformLocation(prog, 'dens'), warm: gl.getUniformLocation(prog, 'warm'), asp: gl.getUniformLocation(prog, 'asp') };
  }

  let dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    fogCv.width = Math.round(innerWidth / 2); fogCv.height = Math.round(innerHeight / 2);
    if (gl) gl.viewport(0, 0, fogCv.width, fogCv.height);
  }
  resize(); addEventListener('resize', resize);

  // ---------- particles ----------
  const P = [], MAX = COARSE ? 260 : 420;
  const add = (p) => { if (P.length < MAX) P.push(p); };
  const top = () => (BB.clipToScreen && BB.clips ? BB.clipToScreen(...(BB.clips.charge.top || [0.5, 0.3])) : [innerWidth / 2, innerHeight * 0.35]);
  const scale = () => (BB.clipToScreen ? Math.abs(BB.clipToScreen(1, 0)[0] - BB.clipToScreen(0, 0)[0]) / 720 : 1);
  function bubble(c) {                     // fizz rising off the top of the can while it charges
    const [x, y] = top(), s = scale();
    add({ k: 'b', x: x + rnd(-60, 60) * s, y: y + rnd(-6, 10) * s, vx: rnd(-14, 14), vy: -rnd(50, 140) * (0.6 + c), life: 0, max: rnd(0.5, 1.1), r: rnd(1, 2.6) * Math.max(0.7, s) });
  }
  function spray() {                       // the can opens: droplets thrown up and out, they fall back
    const [x, y] = BB.clips?.open?.top ? BB.clipToScreen(...BB.clips.open.top) : top(), s = scale();
    for (let i = 0; i < (COARSE ? 70 : 110); i++) {
      const a = rnd(-Math.PI * 0.92, -Math.PI * 0.08), v = rnd(260, 900) * Math.max(0.6, s);
      add({ k: 'd', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rnd(0.8, 1.5), r: rnd(1.6, 4.8) * Math.max(0.7, s),
        col: Math.random() < 0.55 ? '246,170,80' : '220,64,92' });
    }
  }

  // ---------- lightning: midpoint displacement, drawn three times (wide glow, core, white hot centre) ----------
  const bolts = [];
  function boltPath(x1, y1, x2, y2, rough) {
    let pts = [[x1, y1], [x2, y2]];
    for (let lv = 0; lv < 6; lv++) {
      const next = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay);
        const nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1), o = rnd(-1, 1) * len * rough;
        next.push([(ax + bx) / 2 + nx * o, (ay + by) / 2 + ny * o], pts[i + 1]);
      }
      pts = next; rough *= 0.55;
    }
    return pts;
  }
  function strike(arc, life = 0.09) {
    const [x1, y1] = BB.clipToScreen(arc[0], arc[1]), [x2, y2] = BB.clipToScreen(arc[2], arc[3]);
    bolts.push({ pts: boltPath(x1, y1, x2, y2, 0.32), life: 0, max: life });
    if (Math.random() < 0.6) {             // a fork
      const k = 0.3 + Math.random() * 0.4, mx = x1 + (x2 - x1) * k, my = y1 + (y2 - y1) * k;
      bolts.push({ pts: boltPath(mx, my, mx + rnd(-60, 60), my + rnd(40, 110), 0.4), life: 0, max: life * 0.8 });
    }
  }
  let storm = null;                         // a short sequence of strikes, timed from the hit
  function lightning() {
    const arcs = BB.clips?.open?.arcs;
    if (!arcs || !BB.clipToScreen) return;
    const times = BB.clips.open.strikes || [0.3, 0.4, 0.5, 0.7, 0.9];
    storm = { t: 0, times: times.slice(), arcs };
  }

  // ---------- one loop ----------
  let last = performance.now(), T = 0, fogD = 0.35, fogWarm = 0, flash = 0;
  addEventListener('bb', (e) => {
    const t = e.detail;
    if (t === 'pop') {
      const hit = (BB.clips?.open?.hit ?? 0.25) * 1000;
      lightning();                          // strike times are seconds from the start of the open clip
      setTimeout(() => { spray(); flash = 1; fogD = 1.1; }, hit);
    }
  });
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; T += dt;
    const st = BB.state, c = clamp((BB.level - 6) / 94), on = root.classList.contains('clips');

    // fog density by state, eased (never linear)
    const target = !on ? 0 : st === 'charging' ? 0.4 + 0.35 * c : st === 'yes' ? 0.6 : st === 'no' || st === 'draining' ? 0.22 : 0.38;
    fogD += (target - fogD) * (1 - Math.exp(-dt * 2.2));
    fogWarm += ((st === 'charging' ? c : st === 'yes' ? 0.8 : 0) - fogWarm) * (1 - Math.exp(-dt * 3));
    if (gl && fogU) {
      gl.uniform1f(fogU.t, T); gl.uniform1f(fogU.dens, fogD); gl.uniform1f(fogU.warm, fogWarm);
      gl.uniform1f(fogU.asp, innerWidth / innerHeight);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    if (on && BB.pumping) { let n = (14 + 90 * c * c) * dt; while (n-- > Math.random()) bubble(c); }

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life += dt;
      if (p.life >= p.max) { P.splice(i, 1); continue; }
      const a = 1 - p.life / p.max;
      if (p.k === 'b') {
        p.vx += rnd(-40, 40) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = `rgba(255,236,210,${0.55 * a})`; g.lineWidth = 1;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.stroke();
      } else {
        p.vy += 1700 * dt; p.vx *= 1 - 0.6 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = `rgba(${p.col},${0.9 * a})`;
        g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * 1.3, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, 7); g.fill();
        g.fillStyle = `rgba(255,255,255,${0.7 * a})`;
        g.beginPath(); g.arc(p.x - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.32, 0, 7); g.fill();
      }
    }
    if (storm) {
      storm.t += dt;
      while (storm.times.length && storm.t >= storm.times[0]) { storm.times.shift(); storm.arcs.forEach((a) => { if (Math.random() < 0.8) strike(a); }); flash = Math.max(flash, 0.5); }
      if (!storm.times.length && !bolts.length) storm = null;
    }
    g.globalCompositeOperation = 'lighter';
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.life += dt;
      if (b.life >= b.max) { bolts.splice(i, 1); continue; }
      const a = 1 - b.life / b.max;
      for (const [w, col] of [[14, `rgba(150,180,255,${0.12 * a})`], [5, `rgba(190,215,255,${0.45 * a})`], [1.6, `rgba(255,255,255,${a})`]]) {
        g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round';
        g.beginPath(); b.pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      }
    }
    if (flash > 0.01) {                     // the strike lights the whole frame for a moment
      g.fillStyle = `rgba(200,220,255,${0.22 * flash})`; g.fillRect(0, 0, innerWidth, innerHeight);
      flash *= Math.exp(-dt * 14);
    }
    g.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }
  let raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
})();
