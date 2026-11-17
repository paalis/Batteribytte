// Batteribytte · the can in real 3D, for the finale after the film has played to its last frame.
//
// The shape is a real 500 ml can (Ø 66.2 mm, 168 mm: base bevel and dome, body, shoulder, neck, seamed rim,
// countersunk lid, a stay-on tab and its opening). It stands opened, as the film leaves it.
// The label is built from the product photo (assets/battery-fresh.webp) at runtime:
//   - the label is unwrapped from the photo: a column at angle φ on the can is the photo column at x = sin φ
//     (a cylinder seen from the front), so the front reads like the photo. The back, which no photo shows,
//     gets the label's own gradient row by row.
// Drag to turn it; it settles back with inertia and a slow idle sway.
//
// Built into lib/can3d.js by tools/build-can3d.sh (esbuild: only the parts of three.js this file uses).
import {
  WebGLRenderer, Scene, PerspectiveCamera, LatheGeometry, Vector2, CanvasTexture, MeshPhysicalMaterial,
  MeshStandardMaterial, Mesh, CircleGeometry, Group, DirectionalLight, PMREMGenerator, SRGBColorSpace,
  NeutralToneMapping, ExtrudeGeometry, Shape, Path, MeshBasicMaterial,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const FRONT = (80 * Math.PI) / 180;   // the photo is trusted up to ±80°; beyond that it blends into the back colour
const TW = 1024;                      // label texture width (around the can)

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

// rows of the photo → [left, right] edge of the can (alpha > 50 %)
function silhouette(data, w, h) {
  const rows = new Array(h);
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 128) { l = x; break; }
    for (let x = w - 1; x >= 0; x--) if (data[(y * w + x) * 4 + 3] > 128) { r = x; break; }
    rows[y] = l < 0 ? null : [l, r];
  }
  return rows;
}

export function buildLabel(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const src = document.createElement('canvas'); src.width = w; src.height = h;
  const sg = src.getContext('2d', { willReadFrequently: true });
  sg.drawImage(img, 0, 0);
  const d = sg.getImageData(0, 0, w, h).data;
  const rows = silhouette(d, w, h);
  let y0 = rows.findIndex(Boolean), y1 = h - 1 - [...rows].reverse().findIndex(Boolean);
  const half = Math.max(...rows.filter(Boolean).map(([l, r]) => (r - l) / 2));

  // the back: per row, the label's colour near the left edge where it is not part of the black graphics
  const back = new Float32Array(h * 3), okRow = new Uint8Array(h);
  for (let y = y0; y <= y1; y++) {
    const [l, r] = rows[y]; const cx = (l + r) / 2, hw = (r - l) / 2;
    let R = 0, G = 0, B = 0, n = 0;
    for (const f of [0.8, 0.84, 0.88]) {
      const x = Math.round(cx - f * hw), i = (y * w + x) * 4;
      R += d[i]; G += d[i + 1]; B += d[i + 2]; n++;
    }
    R /= n; G /= n; B /= n;
    back.set([R, G, B], y * 3);
    // only the label's own saturated colour counts: black graphics and their pale anti-aliased edges are filled in
    // from their neighbours. The lid and base are metal and keep what is there.
    okRow[y] = (Math.max(R, G, B) > 170 && R - B > 80) || y < y0 + 40 || y > y1 - 30 ? 1 : 0;
  }
  // keep clear of the graphics' soft edges: a row only counts if its neighbours are clean too
  const clean = okRow.slice();
  for (let y = y0; y <= y1; y++) if (!clean[y]) for (let k = -10; k <= 10; k++) if (y + k >= y0 + 40 && y + k <= y1 - 30) okRow[y + k] = 0;
  for (let y = y0; y <= y1; y++) {
    if (okRow[y]) continue;
    let a = y; while (a > y0 && !okRow[a]) a--;
    let b = y; while (b < y1 && !okRow[b]) b++;
    const t = b === a ? 0 : (y - a) / (b - a);
    for (let c = 0; c < 3; c++) back[y * 3 + c] = back[a * 3 + c] * (1 - t) + back[b * 3 + c] * t;
  }
  // soften the back vertically so it reads as one smooth gradient
  const sm = new Float32Array(back.length);
  for (let y = y0; y <= y1; y++) {
    let R = 0, G = 0, B = 0, n = 0;
    for (let k = -24; k <= 24; k++) { const yy = Math.min(y1, Math.max(y0, y + k)); R += back[yy * 3]; G += back[yy * 3 + 1]; B += back[yy * 3 + 2]; n++; }
    sm[y * 3] = R / n; sm[y * 3 + 1] = G / n; sm[y * 3 + 2] = B / n;
  }

  const H = y1 - y0 + 1;
  const out = document.createElement('canvas'); out.width = TW; out.height = H;
  const og = out.getContext('2d');
  const od = og.createImageData(TW, H);
  for (let y = 0; y < H; y++) {
    const sy = y + y0; const [l, r] = rows[sy]; const cx = (l + r) / 2, hw = (r - l) / 2;
    for (let u = 0; u < TW; u++) {
      const phi = (u / TW - 0.5) * Math.PI * 2;       // 0 at the front
      const o = (y * TW + u) * 4;
      let R = sm[sy * 3], G = sm[sy * 3 + 1], B = sm[sy * 3 + 2];
      const a = Math.abs(phi);
      if (a < Math.PI / 2) {
        const x = Math.min(r - 5, Math.max(l + 5, Math.round(cx + Math.sin(phi) * hw * 0.97))), i = (sy * w + x) * 4;
        const k = a < FRONT ? 1 : 1 - (a - FRONT) / (Math.PI / 2 - FRONT);
        let e = k * k * (3 - 2 * k);
        // black graphics stop cleanly at the edge of the trusted front instead of smearing into the back
        if (a >= FRONT && d[i] + d[i + 1] + d[i + 2] < 0.45 * (R + G + B)) e = 0;
        R = d[i] * e + R * (1 - e); G = d[i + 1] * e + G * (1 - e); B = d[i + 2] * e + B * (1 - e);
      }
      od.data[o] = R; od.data[o + 1] = G; od.data[o + 2] = B; od.data[o + 3] = 255;
    }
  }
  og.putImageData(od, 0, 0);

  // the profile, bottom to top, in units of the can's radius
  // the photo's edge is a few pixels noisy: smooth the radius, or the light shows rings around the can
  const rad = (y) => { const [l, rr] = rows[y]; return (rr - l) / 2 / half; };
  const pts = [];
  const step = 4;
  for (let y = y1; y >= y0; y -= step) {
    let s = 0, n = 0;
    for (let k = -6; k <= 6; k++) { const yy = y + k; if (yy >= y0 && yy <= y1) { s += rad(yy); n++; } }
    const edge = y - y0 < 40 || y1 - y < 30;          // keep the neck and base crisp
    pts.push(new Vector2(Math.max(0.001, edge ? rad(y) : s / n), (y1 - y) / half));
  }
  const top = pts[pts.length - 1], bottom = pts[0];
  return { canvas: out, pts, height: (y1 - y0) / half, top, bottom };
}

// ---------- a 500 ml can, in mm (the label covers the outer wall, v = height / H) ----------
const H = 168;
const OUTER = [
  [24.6, 0], [26.5, 0.4], [29.5, 2], [31.8, 4.5], [32.9, 7.5], [33.1, 9.5],
  [33.1, 145], [32.8, 148.5], [31.9, 151.5], [30.4, 154.5], [28.8, 157.5], [27.6, 160], [27.1, 162],
  [27.1, 163.6], [27.75, 164.4], [27.9, 166.2], [27.6, 167.6], [27.0, 168],
];
const LID = [[27.0, 168], [26.2, 167.7], [25.7, 166.6], [25.5, 165.2], [25.0, 164.6], [23.5, 164.5], [0.01, 164.4]];
const BASE = [[0.01, 5.2], [10, 4.9], [18, 3.6], [22.5, 1.6], [24.0, 0.4], [24.6, 0]];
const lathe = (pts, seg = 160) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg, -Math.PI, Math.PI * 2);
function outerGeometry() {
  const g = lathe(OUTER);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, pos.getY(i) / H);
  uv.needsUpdate = true;
  return g;
}
function tabGeometry() {
  const s = new Shape();
  s.absarc(0, 3.5, 7.5, 0, Math.PI, false);
  s.lineTo(-7.5, -14); s.absarc(0, -14, 7.5, Math.PI, Math.PI * 2, false); s.lineTo(7.5, 3.5);
  const hole = new Path(); hole.absellipse(0, -12, 4.6, 5.2, 0, Math.PI * 2, true); s.holes.push(hole);
  const g = new ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.35, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2);
  return g;
}

export async function mount(el, { photo = 'assets/battery-fresh.webp' } = {}) {
  const img = await loadImage(photo);
  const label = buildLabel(img);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  el.appendChild(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;

  const tex = new CanvasTexture(label.canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const wall = new MeshPhysicalMaterial({ map: tex, metalness: 0.35, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  const metal = new MeshStandardMaterial({ color: 0x9da1a9, metalness: 1, roughness: 0.3 });
  const dull = new MeshStandardMaterial({ color: 0x8e9299, metalness: 1, roughness: 0.42 });

  const can = new Group();
  can.add(new Mesh(outerGeometry(), wall), new Mesh(lathe(LID), metal), new Mesh(lathe(BASE), dull));
  // opened, like the film's last frame: the tab stands up and the opening is dark
  const hole = new Mesh(new CircleGeometry(1, 40), new MeshBasicMaterial({ color: 0x050506 }));
  hole.scale.set(7, 9.5, 1); hole.rotation.x = -Math.PI / 2; hole.position.set(0, 164.5, 11.5);
  const tab = new Mesh(tabGeometry(), metal);
  tab.rotation.y = Math.PI;                          // finger hole to the back, nose over the opening
  const tabPivot = new Group(); tabPivot.position.set(0, 164.9, -2); tabPivot.add(tab);
  tabPivot.rotation.x = 1.15;
  const rivet = new Mesh(new CircleGeometry(2.4, 24), metal); rivet.rotation.x = -Math.PI / 2; rivet.position.set(0, 165.6, -2);
  can.add(hole, tabPivot, rivet);
  can.position.y = -H / 2;                           // pivot in the middle of the can
  const turn = new Group();                          // drag and idle sway turn this
  turn.add(can);
  const tilt = new Group();                          // a slight lean toward the camera, like the film
  tilt.add(turn);
  tilt.rotation.x = 0.06;
  scene.add(tilt);

  // units are mm now: the lights only need a direction
  const key = new DirectionalLight(0xffe2b8, 2.2); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new DirectionalLight(0x4fd6c8, 2.6); rim.position.set(4, 1.5, -3); scene.add(rim);
  const rim2 = new DirectionalLight(0x4fd6c8, 1.2); rim2.position.set(-4, 0.5, -2); scene.add(rim2);

  // the camera frames the can where it stands in the film's last frame: 53 % of the frame's height, centre at 62 %
  const camera = new PerspectiveCamera(18, 9 / 16, 1, 10000);
  const FIT_H = 0.53, FIT_Y = 0.625;
  function fit(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const visH = H / FIT_H;
    const dist = visH / 2 / Math.tan((camera.fov * Math.PI) / 360);
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    tilt.position.y = (0.5 - FIT_Y) * visH;
    camera.updateProjectionMatrix();
  }

  // ---------- interaction: drag to turn, inertia, a slow sway when left alone ----------
  let angle = 0, vel = 0, dragging = false, lastX = 0, lastMove = 0, spin = 0, t0 = performance.now();
  const dom = renderer.domElement;
  dom.style.touchAction = 'pan-y';
  dom.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastMove = performance.now(); vel = 0; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now(), dx = e.clientX - lastX;
    const da = (dx / Math.max(200, dom.clientWidth)) * Math.PI * 1.6;
    angle += da; vel = da / Math.max(0.008, (now - lastMove) / 1000);
    lastX = e.clientX; lastMove = now;
  });
  const end = () => { dragging = false; };
  dom.addEventListener('pointerup', end); dom.addEventListener('pointercancel', end);

  let raf = 0, last = performance.now(), visible = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!dragging) {
      angle += vel * dt;
      vel *= Math.exp(-2.2 * dt);
      // with no push left, ease back toward the front with a slow sway (the brand side faces you)
      if (Math.abs(vel) < 0.4) {
        const home = Math.round(angle / (Math.PI * 2)) * Math.PI * 2 + Math.sin((now - t0) / 1000 * 0.6) * 0.35;
        angle += (home - angle) * Math.min(1, dt * 1.2);
      }
    }
    turn.rotation.y = angle + spin;
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(frame) : 0;
  }

  return {
    el: dom,
    resize: fit,
    // appear: a full turn in from behind that settles on the front
    show() {
      visible = true; t0 = performance.now(); angle = 0; vel = 0;
      spin = -Math.PI * 2;
      const s = { v: spin };
      const ease = (t) => 1 - Math.pow(1 - t, 4);
      const start = performance.now(), D = 1600;
      (function tw(now) {
        const k = Math.min(1, (now - start) / D);
        spin = s.v * (1 - ease(k));
        if (k < 1 && visible) requestAnimationFrame(tw);
      })(start);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    },
    hide() { visible = false; },
    // a nudge from outside (the pointer, a fling): add angular velocity
    push(v) { vel += v; },
  };
}
