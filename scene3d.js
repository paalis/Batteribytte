// Batteribytte · the 3D studio, live. The can, its light and its floor come from the film's studio (film-src/,
// made with huashu-motion); here they run in real time and answer what you do. The camera changes angle at every
// step (video-director grammar): a macro reveal that pulls back, a low push-in while you charge, a push + flash cut
// at the pop and a slow orbit after it, a crane up and away when you say no. The can's own logo bars are the
// battery meter. If WebGL is missing, or anything here fails, the photo version underneath simply stays.
(() => {
  const root = document.documentElement;
  if (!window.BB) return;
  const probe = document.createElement('canvas');
  if (!(window.WebGLRenderingContext && (probe.getContext('webgl2') || probe.getContext('webgl')))) return;
  const s = document.createElement('script');
  s.src = 'lib/three.min.js';
  s.onload = () => { try { build(); } catch (e) { console.warn('Batteribytte 3D off:', e); document.querySelector('.gl-canvas')?.remove(); root.classList.remove('gl'); } };
  document.head.appendChild(s);

  function build() {
    const THREE = window.THREE, BB = window.BB;
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const COARSE = matchMedia('(pointer: coarse)').matches;
    const stageEl = document.getElementById('stage'), sceneEl = document.getElementById('scene');
    const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const DEG = Math.PI / 180;

    // ---------- renderer (one, capped pixel ratio, paused with the tab) ----------
    const cv = document.createElement('canvas');
    cv.className = 'gl-canvas';
    cv.setAttribute('aria-hidden', 'true');
    stageEl.insertBefore(cv, stageEl.firstChild);
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, COARSE ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const GROUND = new THREE.Color('#050506');
    const scene = new THREE.Scene();
    scene.background = GROUND;
    scene.fog = new THREE.Fog(GROUND, 13, 38);
    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 200);

    // the studio sky (two soft boxes over a dark floor): metal reads as metal
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(studioSky()).texture;
    scene.environmentIntensity = 0.6;

    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.45, 0.9);
    composer.addPass(bloom);
    composer.addPass(new THREE.OutputPass());

    // ---------- the can: a lathe of the photo's own silhouette ----------
    const IMG_W = 564, IMG_H = 1476, CX = 282.5, R_PH = 278.5, TOP = 24, BOT = 1472, S = 4.0 / (BOT - TOP);
    const PROFILE = [[1472, 30], [1468, 110], [1464, 147.5], [1452, 199], [1444, 209.5], [1434, 222], [1424, 229], [1414, 246], [1404, 260],
      [1394, 270], [1384, 275.5], [1374, 277.5], [700, 278.5], [190, 277.5], [184, 277.5], [174, 276], [164, 274.5], [154, 271], [144, 267],
      [134, 263], [124, 259], [114, 254], [104, 248], [94, 242], [84, 236], [74, 230], [64, 226], [44, 223], [30, 225], [24, 225.5]];
    const RIM = 225.5 * S, HCAN = (BOT - TOP) * S, RB = 205 * S;
    const BARS = [{ x: 96, y: 624, w: 140, h: 81 }, { x: 96, y: 726, w: 140, h: 54 }];

    // half-width of the can at every photo row (for wrapping the photo round the body)
    const hwRow = new Float32Array(IMG_H);
    for (let r = 0; r < IMG_H; r++) {
      let hw = PROFILE[PROFILE.length - 1][1];
      for (let i = 0; i < PROFILE.length - 1; i++) {
        const [r0, h0] = PROFILE[i], [r1, h1] = PROFILE[i + 1];
        if (r <= r0 && r >= r1) { hw = h1 + (h0 - h1) * ((r - r1) / (r0 - r1 || 1)); break; }
      }
      if (r > BOT) hw = 30;
      hwRow[r] = hw;
    }

    // label: the photo wrapped round the front, the can's own colours (row by row) round the back
    const TW = COARSE ? 1536 : 2048, TH = COARSE ? 1152 : 1536;
    const base = document.createElement('canvas'); base.width = TW; base.height = TH;
    const bump = document.createElement('canvas'); bump.width = TW; bump.height = TH;
    const labelTex = new THREE.CanvasTexture(base);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    labelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const bumpTex = new THREE.CanvasTexture(bump);
    const wrapX = (px) => TW * (0.5 + Math.asin(clamp((px - CX) / R_PH, -1, 1)) / (2 * Math.PI));
    const rowY = (row) => (row * TH) / IMG_H;

    function paintLabel(photo) {
      const pc = document.createElement('canvas'); pc.width = IMG_W; pc.height = IMG_H;
      const pg = pc.getContext("2d", { willReadFrequently: true }); pg.drawImage(photo, 0, 0);
      const src = pg.getImageData(0, 0, IMG_W, IMG_H).data;
      // the back: per row, the median of the painted pixels (no black type, no white type), smoothed
      const strip = new Float32Array(IMG_H * 3);
      const ch = [[], [], []];
      for (let r = 0; r < IMG_H; r++) {
        ch[0].length = ch[1].length = ch[2].length = 0;
        for (let x = 0; x < IMG_W; x++) {
          const o = (r * IMG_W + x) * 4, a = src[o + 3];
          if (a < 220) continue;
          const l = (src[o] + src[o + 1] + src[o + 2]) / 3;
          if (l < 70 || l > 232) continue;
          ch[0].push(src[o]); ch[1].push(src[o + 1]); ch[2].push(src[o + 2]);
        }
        for (let c = 0; c < 3; c++) {
          const v = ch[c].sort((a, b) => a - b);
          strip[r * 3 + c] = v.length ? v[v.length >> 1] : -1;
        }
      }
      for (let r = 0; r < IMG_H; r++) if (strip[r * 3] < 0) {         // rows with no paint: borrow the nearest
        let d = 1; while (d < IMG_H) { const q = strip[(r + d) * 3] >= 0 ? r + d : strip[(r - d) * 3] >= 0 ? r - d : -1; if (q >= 0 && q < IMG_H) { for (let c = 0; c < 3; c++) strip[r * 3 + c] = strip[q * 3 + c]; break; } d++; }
      }
      const smooth = new Float32Array(IMG_H * 3);
      for (let r = 0; r < IMG_H; r++) for (let c = 0; c < 3; c++) {
        let s = 0, n = 0;
        for (let k = -14; k <= 14; k++) { const q = r + k; if (q >= 0 && q < IMG_H) { s += strip[q * 3 + c]; n++; } }
        smooth[r * 3 + c] = (s / n) * 0.97;
      }
      // wrap: |angle| < 72° is the photo, 72–86° blends into the back
      const g = base.getContext('2d'), out = g.createImageData(TW, TH), d = out.data;
      for (let y = 0; y < TH; y++) {
        const r = Math.min(IMG_H - 1, Math.floor(((y + 0.5) * IMG_H) / TH)), hw = hwRow[r] * 0.985;
        const br = smooth[r * 3], bg = smooth[r * 3 + 1], bb = smooth[r * 3 + 2];
        for (let x = 0; x < TW; x++) {
          const th = ((x + 0.5) / TW) * 2 * Math.PI - Math.PI, a = Math.abs(th);
          let w = a < 1.257 ? 1 : a < 1.5 ? (1.5 - a) / 0.243 : 0;
          let R = br, G = bg, B = bb;
          if (w > 0) {
            const sx = CX + hw * Math.sin(th), x0 = Math.floor(sx), f = sx - x0;
            if (x0 >= 0 && x0 < IMG_W - 1) {
              const o = (r * IMG_W + x0) * 4, o2 = o + 4;
              const pa = (src[o + 3] * (1 - f) + src[o2 + 3] * f) / 255;
              const ww = w * pa;
              R = R * (1 - ww) + (src[o] * (1 - f) + src[o2] * f) * ww;
              G = G * (1 - ww) + (src[o + 1] * (1 - f) + src[o2 + 1] * f) * ww;
              B = B * (1 - ww) + (src[o + 2] * (1 - f) + src[o2 + 2] * f) * ww;
            }
          }
          const p = (y * TW + x) * 4;
          d[p] = R; d[p + 1] = G; d[p + 2] = B; d[p + 3] = 255;
        }
      }
      g.putImageData(out, 0, 0);
      labelPx = d;
      // condensation all round: many small drops, a few big ones, a dark rim and a sharp highlight; bump from the same
      const bg2 = bump.getContext('2d');
      bg2.fillStyle = '#000'; bg2.fillRect(0, 0, TW, TH);
      const K = TW / 1750;
      let seed = 11; const r2 = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < (COARSE ? 1300 : 1900); i++) {
        const y = rowY(190 + r2() * 1180), x = r2() * TW, rad = (0.8 + Math.pow(r2(), 3.4) * 5.5) * K * 1.1;
        const gr = g.createRadialGradient(x - rad * 0.3, y - rad * 0.35, rad * 0.1, x, y, rad);
        gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(0.7, 'rgba(255,255,255,.04)');
        gr.addColorStop(0.88, 'rgba(60,10,0,.30)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad, rad * 1.12, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x - rad * 0.32, y - rad * 0.4, rad * 0.26, rad * 0.18, -0.5, 0, 7); g.fill();
        const bgr = bg2.createRadialGradient(x, y, 0, x, y, rad);
        bgr.addColorStop(0, '#fff'); bgr.addColorStop(0.8, '#aaa'); bgr.addColorStop(1, '#000');
        bg2.fillStyle = bgr; bg2.beginPath(); bg2.ellipse(x, y, rad, rad * 1.12, 0, 0, 7); bg2.fill();
      }
      labelTex.needsUpdate = true; bumpTex.needsUpdate = true;
    }

    // the meter: a small patch over the logo's two bars, so only a tiny texture changes while it charges
    const MX0 = BARS[0].x - 6, MX1 = BARS[0].x + BARS[0].w + 6, MY0 = BARS[0].y - 6, MY1 = BARS[1].y + BARS[1].h + 6;
    const meterCv = document.createElement('canvas'); meterCv.width = 256; meterCv.height = 192;
    const meterTex = new THREE.CanvasTexture(meterCv); meterTex.colorSpace = THREE.SRGBColorSpace;
    const mwx0 = wrapX(MX0), mwx1 = wrapX(MX1), mwy0 = rowY(MY0), mwy1 = rowY(MY1);
    const toM = (wx, wy) => [((wx - mwx0) / (mwx1 - mwx0)) * 256, ((wy - mwy0) / (mwy1 - mwy0)) * 192];
    let meterKey = '', barRows = null, labelPx = null;
    function drawMeter(level, red) {
      const key = Math.round(level * 2) + '|' + red.toFixed(2);
      if (key === meterKey) return;
      meterKey = key;
      const g = meterCv.getContext('2d');
      g.drawImage(base, mwx0, mwy0, mwx1 - mwx0, mwy1 - mwy0, 0, 0, 256, 192);
      if (!barRows) {                                  // the paint behind each bar, sampled just right of it, row by row
        barRows = BARS.map((b) => {
          const sx = Math.round(wrapX(b.x + b.w + 9)), y0 = Math.floor(rowY(b.y)), y1 = Math.ceil(rowY(b.y + b.h));
          return { y0, y1, cols: Array.from({ length: y1 - y0 }, (_, i) => { const o = ((y0 + i) * TW + sx) * 4;
            return `rgb(${labelPx[o]},${labelPx[o + 1]},${labelPx[o + 2]})`; }) };
        });
      }
      const f = clamp(level / 100);
      BARS.forEach((b, j) => {
        const rows = barRows[j];
        const [xf] = toM(wrapX(b.x + b.w * f), 0), [xe] = toM(wrapX(b.x + b.w + 1), 0), [xs] = toM(wrapX(b.x + 3), 0);
        rows.cols.forEach((c, i) => {
          const [, yy] = toM(0, rows.y0 + i), [, yy2] = toM(0, rows.y0 + i + 1);
          g.fillStyle = c; g.fillRect(xf, yy, xe - xf + 1, yy2 - yy + 0.6);
        });
        if (red > 0 && f > 0) {
          const [, ya] = toM(0, rowY(b.y + 3)), [, yb] = toM(0, rowY(b.y + b.h - 3));
          g.fillStyle = `rgba(255,45,85,${red})`; g.fillRect(xs, ya, Math.max(0, xf - xs - 2), yb - ya);
        }
      });
      meterTex.needsUpdate = true;
    }

    function latheGeo() {
      const pts = PROFILE.map(([row, hw]) => new THREE.Vector2(hw * S, (BOT - row) * S));
      const geo = new THREE.LatheGeometry(pts, 128, Math.PI, Math.PI * 2);     // seam at the back
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setY(i, 1 - (BOT - pos.getY(i) / S) / IMG_H);
      geo.computeVertexNormals();
      return geo;
    }
    const canGeo = latheGeo();
    const canMat = new THREE.MeshPhysicalMaterial({ map: labelTex, bumpMap: bumpTex, bumpScale: 1.2, metalness: 0.12, roughness: 0.36,
      clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.85 });
    const meterMat = new THREE.MeshPhysicalMaterial({ map: meterTex, metalness: 0.12, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.2,
      envMapIntensity: 0.85, polygonOffset: true, polygonOffsetFactor: -2 });
    const lidMat = new THREE.MeshPhysicalMaterial({ color: '#1b1b1e', metalness: 0.9, roughness: 0.28, clearcoat: 0.5 });
    const rimMat = new THREE.MeshPhysicalMaterial({ color: '#a9adb4', metalness: 1, roughness: 0.3, envMapIntensity: 0.7 });
    const th0 = Math.asin((MX0 - CX) / R_PH), th1 = Math.asin((MX1 - CX) / R_PH);
    const meterGeo = new THREE.CylinderGeometry(R_PH * S * 1.004, R_PH * S * 1.004, (MY1 - MY0) * S, 24, 1, true, th0, th1 - th0);

    function makeCan(isHero) {
      const rootG = new THREE.Group(), tip = new THREE.Group(), hold = new THREE.Group(), spin = new THREE.Group();
      tip.position.x = RB; hold.position.x = -RB;
      rootG.add(tip); tip.add(hold); hold.add(spin);
      const body = new THREE.Mesh(canGeo, canMat); body.castShadow = true; spin.add(body);
      if (isHero) { const m = new THREE.Mesh(meterGeo, meterMat); m.position.y = (BOT - (MY0 + MY1) / 2) * S; spin.add(m); }
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(RIM * 0.93, RIM * 0.93, 0.02, 96), lidMat); lid.position.y = HCAN - 0.035; spin.add(lid);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(RIM * 0.97, 0.028, 16, 96), rimMat); rim.rotation.x = Math.PI / 2; rim.position.y = HCAN - 0.006; spin.add(rim);
      const tabPivot = new THREE.Group(); tabPivot.position.set(0, HCAN - 0.012, -0.02); spin.add(tabPivot);
      const tab = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 6, 16), rimMat);
      tab.rotation.set(Math.PI / 2, 0, Math.PI / 2); tab.scale.set(1, 1, 0.25); tab.position.z = 0.14; tabPivot.add(tab);
      return { root: rootG, tip, spin, tabPivot };
    }
    const hero = makeCan(true), left = makeCan(false), right = makeCan(false);
    left.root.position.set(-1.95, 0, -0.6); left.spin.rotation.y = 0.18;
    right.root.position.set(1.95, 0, -0.6); right.spin.rotation.y = -0.18;
    scene.add(hero.root, left.root, right.root);

    // the glossy floor shows the cans mirrored under it
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshPhysicalMaterial({ color: '#050507', roughness: 0.3,
      clearcoat: 1, clearcoatRoughness: 0.15, transparent: true, opacity: 0.9, envMapIntensity: 0.3 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const mirror = new THREE.Group(); mirror.scale.y = -1; scene.add(mirror);
    const twins = [hero, left, right].map((c) => {
      const t = makeCan(c === hero);
      t.root.position.copy(c.root.position); t.spin.rotation.y = c.spin.rotation.y;
      t.root.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.side = THREE.DoubleSide; } });
      mirror.add(t.root); return t;
    });
    const heroTwin = twins[0];

    // ---------- light: cold studio, warm energy ----------
    const cold = new THREE.Color('#dbe6ff'), warm = new THREE.Color('#ffc27a');
    const key = new THREE.DirectionalLight(cold, 1.2); key.position.set(-5, 7, 6); key.castShadow = true;
    key.shadow.mapSize.set(COARSE ? 1024 : 2048, COARSE ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 7, bottom: -6 }); key.shadow.radius = 8; key.shadow.bias = -0.0004;
    const rimL = new THREE.SpotLight(cold, 2.5, 0, 0.45, 0.7, 0); rimL.position.set(-6, 5, -6); rimL.target.position.set(0, 2, 0);
    const rimR = new THREE.SpotLight(cold, 2.5, 0, 0.45, 0.7, 0); rimR.position.set(6, 5, -6); rimR.target.position.set(0, 2, 0);
    const sweep = new THREE.SpotLight('#ffffff', 0, 0, 0.13, 0.55, 0); sweep.position.set(-7, 3.2, 7); sweep.target.position.set(-3, 2, 0);
    const fill = new THREE.SpotLight('#fff3e2', 1.4, 0, 0.14, 1, 0); fill.position.set(0, 2.2, 9); fill.target.position.set(0, 2.2, 0);
    const back = new THREE.PointLight(warm, 0, 3.4, 1); back.position.set(0, 2.6, -0.95);
    const burstL = new THREE.PointLight('#ffd9a0', 0, 9, 1.6); burstL.position.set(0, HCAN + 0.4, 0.3);
    scene.add(key, rimL, rimL.target, rimR, rimR.target, sweep, sweep.target, fill, fill.target, back, burstL);
    const sprite = (stops) => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    };
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 6.6), new THREE.MeshBasicMaterial({
      map: sprite([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,220,170,.55)'], [1, 'rgba(255,200,140,0)']]), color: warm,
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    glow.position.set(0, 1.9, -1.0); scene.add(glow);

    // low smoke on the floor (billboards that face the camera)
    const wispTex = [1, 2, 3].map((seed) => {
      let s0 = seed * 977; const r = () => ((s0 = (s0 * 16807) % 2147483647) / 2147483647);
      const c = document.createElement('canvas'); c.width = 512; c.height = 256;
      const g = c.getContext('2d'); g.filter = 'blur(18px)';
      for (let i = 0; i < 60; i++) {
        const x = 60 + r() * 392, y = 190 - Math.pow(r(), 1.5) * 110, rad = 26 + r() * 50, a = 0.08 * (1 - (190 - y) / 160);
        const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(235,240,255,${a})`); gr.addColorStop(1, 'rgba(235,240,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    });
    const smoke = Array.from({ length: COARSE ? 12 : 20 }, (_, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: wispTex[i % 3], transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      m.userData = { x: rnd(-9, 9), z: rnd(-3.5, 3), y: rnd(0.15, 0.6), s: rnd(3, 7), v: rnd(-0.18, 0.18), a: rnd(0.35, 0.85) };
      scene.add(m); return m;
    });

    // ---------- particles: sparks (additive streaks) and droplets of the drink ----------
    const SMAX = COARSE ? 500 : 800;
    const sPos = new Float32Array(SMAX * 6), sCol = new Float32Array(SMAX * 6);
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage));
    sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3).setUsage(THREE.DynamicDrawUsage));
    const sparks = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false }));
    sparks.frustumCulled = false; scene.add(sparks);
    const SP = [];
    const GOLD = [[3, 2.2, 1.1], [2.6, 1.6, 0.6], [3, 2.8, 2.2], [2.4, 1.1, 0.45]];
    function spark(x, y, z, vx, vy, vz, life, g, drag = 0.6, hot = 1) {
      if (SP.length >= SMAX) return;
      const c = GOLD[(Math.random() * 4) | 0];
      SP.push({ x, y, z, vx, vy, vz, t: 0, life, g, drag, c, hot });
    }
    const DMAX = 90;
    const dropMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
    const drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), dropMat, DMAX);
    drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage); drops.castShadow = false; drops.frustumCulled = false;
    const DCOL = [new THREE.Color('#f09a46'), new THREE.Color('#e0485f'), new THREE.Color('#f6b25a')];
    for (let i = 0; i < DMAX; i++) drops.setColorAt(i, DCOL[i % 3]);
    scene.add(drops);
    const DP = [];
    function drop(x, y, z, vx, vy, vz, r) { if (DP.length < DMAX) DP.push({ x, y, z, vx, vy, vz, r, t: 0, life: rnd(1.4, 2.4), b: 0 }); }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.1, 1.0),
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; scene.add(ring);
    let ringT = -1;

    // ---------- camera: poses (target, log-distance, yaw, pitch, roll), smoothed toward each state's pose ----------
    let D = 12, view = { cx: 0, cy: 0 };
    const cam = { tx: 0.1, ty: 2.6, tz: 0, ld: Math.log(0.36), yaw: -42, pitch: -3, roll: 4 };
    let introUntil = 0, cutAt = -1, yesAt = 0, shake = 0, flashB = 0;
    const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
    function layout() {
      const W = innerWidth, H = innerHeight;
      renderer.setSize(W, H, false);
      composer.setSize(W, H);
      bloom.setSize(Math.round(W / 2), Math.round(H / 2));
      const r = sceneEl.getBoundingClientRect();
      view = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      camera.aspect = W / H;
      camera.setViewOffset(W, H, W / 2 - view.cx, H / 2 - view.cy, W, H);
      camera.updateProjectionMatrix();
      // the can (plus a little air) fills the scene area's height
      const fracH = clamp((r.height * 0.86) / H, 0.25, 0.95), fracW = clamp((r.width * 0.9) / W, 0.2, 1);
      const t = Math.tan((camera.fov * DEG) / 2);
      D = Math.max(HCAN / (fracH * 2 * t), (RIM * 2.6) / (fracW * 2 * t * camera.aspect));
    }
    layout();
    addEventListener('resize', layout);

    function poseFor(state, now, c) {
      const ox = ptr.sx, oy = ptr.sy;
      if (state === 'charging') return { tx: 0, ty: 2.0 + 0.3 * c, tz: 0, ld: Math.log(1 - 0.36 * c), yaw: -14 + 34 * c + ox * 4, pitch: 4 - 13 * c + oy * 2, roll: 2.5 * c, k: 3.2 };
      if (state === 'yes') { const s = (now - yesAt) / 1000; return { tx: 0, ty: 2.1, tz: 0, ld: Math.log(0.95), yaw: 26 + s * 11 + ox * 4, pitch: -7 + Math.min(10, s * 2.2) + oy * 2, roll: 0, k: 1.6 }; }
      if (state === 'draining' || state === 'no') return { tx: 0.5, ty: 0.9, tz: 0, ld: Math.log(1.22), yaw: -34 + ox * 4, pitch: 31 + oy * 2, roll: 0, k: 1.1 };
      const s = now / 1000;
      return { tx: 0, ty: 2.0, tz: 0, ld: 0, yaw: -14 + 8 * Math.sin((s * 2 * Math.PI) / 18) + ox * 8, pitch: 4 + oy * 3, roll: 0, k: now < introUntil ? 1.15 : 2.2 };
    }
    function place() {
      const d = Math.exp(cam.ld) * D, y = cam.yaw * DEG, p = cam.pitch * DEG;
      camera.position.set(cam.tx + d * Math.sin(y) * Math.cos(p), cam.ty + d * Math.sin(p), cam.tz + d * Math.cos(y) * Math.cos(p));
      camera.lookAt(cam.tx, cam.ty, cam.tz);
      if (cam.roll) camera.rotateZ(cam.roll * DEG);
      if (shake > 0.001) { camera.rotateX(rnd(-1, 1) * shake * 0.006); camera.rotateY(rnd(-1, 1) * shake * 0.006); }
    }

    // ---------- input: tilt with the pointer, drag to turn the can, tap it to fizz ----------
    if (!COARSE) addEventListener('pointermove', (e) => { ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    let spinV = 0, drag = null;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, t: performance.now(), last: e.clientX, moved: 0 }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.last; drag.last = e.clientX; drag.moved += Math.abs(dx);
      if (BB.state !== 'charging' && BB.state !== 'draining') { hero.spin.rotation.y += dx * 0.012; spinV = dx * 0.7; }
    });
    cv.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const tap = drag.moved < 6 && performance.now() - drag.t < 400; drag = null;
      if (!tap || BB.state === 'charging' || BB.state === 'draining') return;
      const r = cv.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(hero.root, true).length) fizz();
    });
    cv.addEventListener('pointercancel', () => { drag = null; });

    // ---------- moments ----------
    const hop = { y: 0, v: 0 };
    let tipK = 0, tipTarget = 0, tabK = 0, tabTarget = 0;
    function fizz() {
      BB.fizz();
      if (RM) return;
      hop.v += 3.2; spinV += (Math.random() < 0.5 ? -1 : 1) * 9;
      for (let i = 0; i < 12; i++) { const a = rnd(0, 6.283), s = rnd(0.6, 1.8); drop(Math.cos(a) * 0.2, HCAN + 0.05, Math.sin(a) * 0.2, Math.cos(a) * s, rnd(2.5, 4.5), Math.sin(a) * s, rnd(0.018, 0.035)); }
    }
    function pop() {
      yesAt = performance.now();
      tabTarget = 1;
      if (RM) return;
      // push + flash: cut on the flash to a low hero angle
      cutAt = yesAt;
      Object.assign(cam, { tx: 0, ty: 2.15, tz: 0, ld: Math.log(0.82), yaw: 22, pitch: -11, roll: 3 });
      flashB = 1; shake = 1; ringT = 0; hop.v += 4.2;
      const top = HCAN + 0.08;
      for (let i = 0; i < (COARSE ? 220 : 340); i++) {
        const a = rnd(0, 6.283), e = rnd(-0.2, 1.35), s = rnd(3, 11);
        spark(0, top, 0, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 1.5, Math.sin(a) * Math.cos(e) * s, rnd(0.5, 1.4), -9.8, 0.9);
      }
      for (let i = 0; i < 70; i++) {
        const a = rnd(0, 6.283), up = rnd(4, 8.5), out = rnd(0.6, 2.8);
        drop(Math.cos(a) * 0.12, top, Math.sin(a) * 0.12, Math.cos(a) * out, up, Math.sin(a) * out, rnd(0.022, 0.06));
      }
    }
    addEventListener('bb', (e) => {
      const t = e.detail;
      if (t === 'charge') introUntil = 0;
      else if (t === 'pop') pop();
      else if (t === 'no') { tipTarget = RM ? 0 : 1; introUntil = 0; }
      else if (t === 'ask') { tipTarget = 0; tabTarget = 0; }
    });

    // ---------- the loop ----------
    let last = performance.now(), started = false, slow = 0, quality = 2;
    function tune() {
      if (quality === 1) renderer.setPixelRatio(1);
      if (quality === 0) bloom.enabled = false;
      layout();
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      // keep it smooth on slower phones: step the quality down when frames run long
      slow = slow * 0.95 + (dt > 0.034 ? 1 : 0) * 0.05;
      if (slow > 0.6 && quality > 0) { quality--; slow = 0; tune(); }
      const st = BB.state, lvl = BB.level, c = clamp((lvl - 6) / 94), pumping = BB.pumping;
      const dark = st === 'draining' || st === 'no';

      // camera
      ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 3); ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 3);
      const P = RM ? { tx: 0, ty: 2.0, tz: 0, ld: 0, yaw: -14, pitch: 4, roll: 0, k: 99 } : poseFor(st, now, c);
      const a = 1 - Math.exp(-P.k * dt);
      for (const k of ['tx', 'ty', 'tz', 'ld', 'yaw', 'pitch', 'roll']) cam[k] += (P[k] - cam[k]) * a;
      if (pumping && !RM) shake = Math.max(shake, 0.15 + 0.6 * c * c);
      place();
      shake *= Math.exp(-14 * dt * (pumping ? 0.2 : 1));

      // the can: meter, charge tremble, hop, tip over, tab, free spin
      drawMeter(lvl, lvl < 20 ? 1 : 0);
      hop.v -= 22 * dt; hop.y += hop.v * dt; if (hop.y < 0) { hop.y = 0; hop.v = Math.abs(hop.v) > 1.2 ? -hop.v * 0.35 : 0; }
      const tremble = pumping && !RM ? 0.012 * (0.3 + c) : 0;
      hero.root.position.set(rnd(-tremble, tremble), hop.y, rnd(-tremble, tremble));
      tipK += (tipTarget - tipK) * (1 - Math.exp(-(tipTarget ? 2.6 : 5) * dt));
      // falls with gravity and a small bounce at the end (eased, not simulated)
      const e = tipTarget ? (tipK < 0.92 ? Math.pow(tipK / 0.92, 2.2) : 1 - Math.sin((tipK - 0.92) / 0.08 * Math.PI) * 0.03) : tipK;
      hero.tip.rotation.z = -e * (Math.PI / 2);
      tabK += (tabTarget - tabK) * (1 - Math.exp(-10 * dt));
      hero.tabPivot.rotation.x = -tabK * 1.15;
      if (!drag) { hero.spin.rotation.y += spinV * 0.36 * dt; spinV *= Math.exp(-2.2 * dt); }
      heroTwin.root.position.copy(hero.root.position);
      heroTwin.tip.rotation.z = hero.tip.rotation.z; heroTwin.spin.rotation.y = hero.spin.rotation.y; heroTwin.tabPivot.rotation.x = hero.tabPivot.rotation.x;

      // light: the studio dims for «Nei», warms with the charge, flashes on the pop
      const studio = dark ? 0.12 : 1;
      const lit = st === 'yes' ? 0.35 : c;            // after the pop the energy settles to an afterglow
      const k = 1 - Math.exp(-(dark ? 1.4 : 3) * dt);
      key.intensity += (1.2 * studio - key.intensity) * k;
      rimL.intensity += ((2.5 + 2 * lit) * studio - rimL.intensity) * k; rimR.intensity = rimL.intensity;
      fill.intensity += ((1.4 + 1.2 * lit) * studio - fill.intensity) * k;
      rimL.color.copy(cold).lerp(warm, lit * 0.8); rimR.color.copy(rimL.color);
      back.intensity = (8 * lit + 18 * flashB) * studio;
      glow.material.opacity = (0.32 * lit + 0.3 * flashB) * studio;
      burstL.intensity = 28 * flashB;
      bloom.strength = 0.3 + 0.35 * lit + 0.6 * flashB;
      flashB *= Math.exp(-7 * dt);
      scene.environmentIntensity += ((dark ? 0.12 : 0.6) - scene.environmentIntensity) * k;

      // the intro: a light glides over the drops while the camera pulls back
      if (now < introUntil) {
        const u = clamp(1 - (introUntil - now) / 3200);
        sweep.intensity = 160 * Math.sin(u * Math.PI);
        sweep.target.position.x = -3 + u * 6;
      } else sweep.intensity = 0;

      // smoke drifts, faces the camera
      for (const m of smoke) {
        const d = m.userData;
        d.x += d.v * dt; if (d.x > 10) d.x = -10; if (d.x < -10) d.x = 10;
        m.position.set(d.x, d.y, d.z); m.scale.setScalar(d.s); m.quaternion.copy(camera.quaternion);
        m.material.opacity = d.a * 0.5 * (dark ? 0.35 : 1) * (1 + lit * 0.4);
      }

      // sparks pulled up round the can while it charges
      if (pumping && !RM) {
        const n = (60 + 320 * c) * dt * (COARSE ? 0.65 : 1);
        for (let i = 0; i < n; i++) {
          const ang = rnd(0, 6.283), rad = rnd(0.95, 1.5);
          const sw = 2.2 + 3 * c;
          spark(Math.cos(ang) * rad, rnd(0, 0.15), Math.sin(ang) * rad,
            -Math.sin(ang) * sw - Math.cos(ang) * 0.6, rnd(2.5, 6.5) * (0.6 + c), Math.cos(ang) * sw - Math.sin(ang) * 0.6, rnd(0.35, 0.85), 1.5, 0.4, 0.8);
        }
      }
      let n = 0;
      for (let i = SP.length - 1; i >= 0; i--) {
        const p = SP[i]; p.t += dt;
        if (p.t >= p.life) { SP.splice(i, 1); continue; }
        p.vy += p.g * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr; p.vz *= dr;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0) { p.y = 0; p.vy *= -0.3; }
        const f = (1 - p.t / p.life) * p.hot, o = n * 6;
        sPos[o] = p.x; sPos[o + 1] = p.y; sPos[o + 2] = p.z;
        sPos[o + 3] = p.x - p.vx * 0.022; sPos[o + 4] = p.y - p.vy * 0.022; sPos[o + 5] = p.z - p.vz * 0.022;
        sCol[o] = p.c[0] * f; sCol[o + 1] = p.c[1] * f; sCol[o + 2] = p.c[2] * f;
        sCol[o + 3] = p.c[0] * f * 0.15; sCol[o + 4] = p.c[1] * f * 0.15; sCol[o + 5] = p.c[2] * f * 0.15;
        n++;
      }
      sGeo.setDrawRange(0, n * 2);
      sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;

      // droplets: thrown out, bounce once or twice on the floor, shrink away
      for (let i = DP.length - 1; i >= 0; i--) {
        const p = DP[i]; p.t += dt;
        if (p.t >= p.life) { DP.splice(i, 1); continue; }
        p.vy -= 9.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < p.r) { p.y = p.r; p.vy = -p.vy * 0.3; p.vx *= 0.6; p.vz *= 0.6; p.b++; }
      }
      for (let i = 0; i < DMAX; i++) {
        const p = DP[i];
        if (p) {
          const life = 1 - Math.pow(p.t / p.life, 3);
          const stretch = 1 + Math.min(1.2, Math.hypot(p.vx, p.vy, p.vz) * 0.06);
          q.setFromUnitVectors(v3.set(0, 1, 0), v3.set(p.vx, p.vy, p.vz).normalize());
          sc.set(p.r * life, p.r * life * stretch, p.r * life);
          m4.compose(v3.set(p.x, p.y, p.z), q, sc);
        } else m4.makeScale(0, 0, 0);
        drops.setMatrixAt(i, m4);
      }
      drops.instanceMatrix.needsUpdate = true;

      if (ringT >= 0) {
        ringT += dt; const u = ringT / 0.85;
        ring.scale.setScalar(0.4 + u * 6); ring.material.opacity = Math.max(0, 1 - u);
        if (u >= 1) { ringT = -1; ring.material.opacity = 0; }
      }

      composer.render(dt);
      if (!started) { started = true; requestAnimationFrame(() => root.classList.add('gl')); }
    }

    // build the label from the photo, then show the studio and start the reveal
    const photo = new Image();
    photo.src = 'assets/battery-fresh.webp';
    photo.decode().then(() => {
      paintLabel(photo);
      drawMeter(BB.level, 1);
      layout();
      const fresh = BB.state === 'ask' && BB.level <= 6;
      if (!RM && fresh) introUntil = performance.now() + 3200;
      else Object.assign(cam, { tx: 0, ty: 2.0, tz: 0, ld: 0, yaw: -14, pitch: 4, roll: 0 });
      last = performance.now();
      renderer.setAnimationLoop(frame);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) renderer.setAnimationLoop(null);
        else { last = performance.now(); renderer.setAnimationLoop(frame); }
      });
    });

    function studioSky() {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
      const g = c.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, 512);
      sky.addColorStop(0, '#2a2c33'); sky.addColorStop(0.48, '#0e0f13'); sky.addColorStop(0.52, '#050506'); sky.addColorStop(1, '#050505');
      g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
      const box = (x, y, w, h, al) => { const r = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) / 1.4); r.addColorStop(0, `rgba(255,255,255,${al})`); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(x - w, y - h, w * 3, h * 3); };
      box(180, 90, 220, 120, 1); box(640, 120, 160, 90, 0.75); box(470, 20, 120, 40, 0.5);
      const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
  }
})();
