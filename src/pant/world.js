// Batteribytte · the pant machine, live (three.js). One scene, one camera, one story:
//
//   drag   the flat battery (a drained, grey Battery can) into the hole → the machine sucks it in and the camera dives
//          in after it, into the scanning chamber
//   roll   rejected! («Strekkoden vises ikke») → roll the can on its rollers until the barcode faces the scanner
//   (knas) accepted → the press crushes it in slow motion; the counter ticks; the camera backs out of the machine
//   press  the big green PANT button → the receipt prints … and the machine chokes: the fresh can is stuck
//   shake  shake it loose (the phone, a drag back and forth, or R) → it drops, the flap swings, the can floats up
//   hold   hold on to it: the logo's «+ ‖» fills like a battery gauge, lightning runs through the label
//   flick  flick the tab up → pop, spray, foam, flash; the camera pulls back to the hero shot, and the receipt is yours
//
// The machine and its room come from Blender (tools/blender/build_machine.py → assets/pant/machine.glb), the cans from
// tools/blender/build_can.py (assets/can/battery-can.glb), the spray from tools/blender/render_spray.py.
// Every step can also be done with the action chip or the keyboard (main.js): stage.act(), stage.key(), stage.hold().
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, DirectionalLight, PointLight, HemisphereLight, PMREMGenerator,
  SRGBColorSpace, NeutralToneMapping, AnimationMixer, LoopOnce, Vector3, Vector2, Quaternion, Euler, Color, FogExp2,
  CanvasTexture, TextureLoader, MeshStandardMaterial, Sprite, SpriteMaterial, Raycaster, MathUtils, Plane, CatmullRomCurve3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeBloom } from './bloom.js';
import * as S from './sound.js';
import { drawReceipt } from './receipt.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const V = (x, y, z) => new Vector3(x, y, z);
const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;

// ---------- camera stations (shared with tools/blender/render_stills.py) ----------
const ST = {
  start:  { pos: V(0.06, 1.2, 2.05), tgt: V(0, 1.12, 0), fov: 50 },
  inside: { pos: V(0.13, 1.21, -0.19), tgt: V(0, 1.02, -0.33), fov: 62 },
  button: { pos: V(0.32, 1.02, 0.62), tgt: V(0.22, 0.95, 0), fov: 46 },
  hatch:  { pos: V(0.0, 0.62, 1.05), tgt: V(0, 0.33, 0), fov: 48 },
  hero:   { pos: V(0.0, 0.98, 1.05), tgt: V(0, 0.95, 0.45), fov: 40 },
  finale: { pos: V(0.35, 1.05, 1.9), tgt: V(0, 0.95, 0.2), fov: 48 },
};
const P_START = V(-0.1, 0.84, 1.2);      // the flat can, held out in front of you
const P_HOLE = V(0, 1.05, 0.16);          // just in front of the hole
const P_CHAMBER = V(0, 1.011, -0.33);     // resting on the two rollers
const P_HERO = V(0, 0.95, 0.45);

export async function createWorld(canvas, ui) {
  const loader = new GLTFLoader();
  const tl = new TextureLoader();
  const [machineG, canG, meterTex, sprayTex, sprayMeta] = await Promise.all([
    loader.loadAsync('assets/pant/machine.glb'),
    loader.loadAsync('assets/can/battery-can.glb'),
    tl.loadAsync('assets/pant/meter.webp'),
    tl.loadAsync('assets/can/spray.webp').catch(() => null),
    fetch('assets/can/spray.json').then((r) => r.json()).catch(() => null),
  ]);

  // ---------- renderer, scene, light ----------
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let dprCap = COARSE ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new Scene();
  scene.background = new Color(0x040506);
  scene.fog = new FogExp2(0x05070a, 0.22);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.1;
  scene.add(new HemisphereLight(0x29404a, 0x050505, 0.5));
  const key = new DirectionalLight(0xd6e8ff, 0.9); key.position.set(-1.2, 2.6, 2.2); scene.add(key);
  const warm = new PointLight(0xffa860, 1.2, 5, 2); warm.position.set(1.4, 1.5, 0.9); scene.add(warm);
  const holeLight = new PointLight(0x4fd6c8, 0.25, 1.2, 2); holeLight.position.set(0, 1.05, 0.22); scene.add(holeLight);
  const chamberRed = new PointLight(0xff2a1a, 0, 0.7, 2); chamberRed.position.set(0, 1.2, -0.3); scene.add(chamberRed);
  const chamberFill = new PointLight(0xfff2e0, 0, 0.8, 2); chamberFill.position.set(0.12, 1.18, -0.2); scene.add(chamberFill);
  const heroLight = new PointLight(0xfff0d8, 0, 2.0, 2); heroLight.position.set(-0.35, 1.25, 0.95); scene.add(heroLight);

  const camera = new PerspectiveCamera(50, 1, 0.01, 30);
  const bloom = makeBloom(renderer, { threshold: 2.4 });

  // ---------- the machine ----------
  const machine = machineG.scene;
  scene.add(machine);
  const M = (n) => machine.getObjectByName(n);
  const screen = M('Screen'), ring = M('HoleRing'), button = M('Button'), receipt = M('Receipt');
  const flap = M('HatchFlap'), press = M('Press'), lasers = [M('Laser1'), M('Laser2'), M('Laser3')].filter(Boolean);
  const rollers = [M('Roller1'), M('Roller2')].filter(Boolean), tubes = [M('Tube1'), M('Tube2')].filter(Boolean);
  const shakeRig = new Group(); scene.add(shakeRig); shakeRig.add(machine);
  // emissive parts: keep their own material so they can be driven separately
  const own = (o) => { if (o && o.material) o.material = o.material.clone(); return o; };
  [ring, button, ...lasers, ...tubes].forEach(own);
  // Blender's emission strengths are for Cycles; on the page the neon only just crosses the bloom threshold
  machine.traverse((o) => { if (o.isMesh && o.material && o.material.emissiveIntensity > 1) o.material.emissiveIntensity *= 0.55; });
  lasers.forEach((l) => { l.visible = false; l.material.transparent = true; l.material.depthWrite = false; });
  const ringBase = ring ? ring.material.emissiveIntensity : 1;

  // the screen: a canvas the page writes on
  const scr = document.createElement('canvas'); scr.width = 512; scr.height = 284;
  const scrTex = new CanvasTexture(scr); scrTex.flipY = false; scrTex.colorSpace = SRGBColorSpace;
  if (screen) screen.material = new MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: scrTex, emissiveIntensity: 1.35, roughness: 0.2 });
  let scrState = { title: '', sub: '', color: '#4fd6c8', bar: -1, blink: false };
  function drawScreen(t) {
    const g = scr.getContext('2d');
    g.fillStyle = '#020405'; g.fillRect(0, 0, 512, 284);
    g.fillStyle = 'rgba(79,214,200,0.05)'; for (let y = 0; y < 284; y += 4) g.fillRect(0, y, 512, 1);   // scanlines
    const vis = !scrState.blink || Math.floor(t * 2.4) % 2 === 0;
    g.textAlign = 'center';
    if (vis) {
      g.fillStyle = scrState.color;
      g.font = '400 54px "Archivo Black", "Arial Black", Impact, sans-serif';
      g.fillText(scrState.title, 256, 128);
    }
    g.fillStyle = '#cfe9e5';
    g.font = '700 25px ui-monospace, Menlo, Consolas, monospace';
    g.fillText(scrState.sub, 256, 184);
    if (scrState.bar >= 0) {
      g.strokeStyle = scrState.color; g.lineWidth = 3; g.strokeRect(116, 212, 280, 34);
      g.fillStyle = scrState.color; g.fillRect(122, 218, 268 * clamp(scrState.bar), 22);
    }
    scrTex.needsUpdate = true;
  }
  const say = (title, sub = '', color = '#4fd6c8', extra = {}) => { scrState = { title, sub, color, bar: -1, blink: false, ...extra }; };

  // the receipt: printed onto the paper hanging from the slot
  const rc = document.createElement('canvas');
  const receiptData = { time: new Date(), tries: 1, count: 1 };
  const rTex = new CanvasTexture(drawReceipt(rc, receiptData)); rTex.flipY = false; rTex.colorSpace = SRGBColorSpace;
  if (receipt) {
    receipt.material = new MeshStandardMaterial({ map: rTex, roughness: 0.9 });
    receipt.scale.y = 0.001; receipt.visible = false;
  }

  // ---------- the cans: one fresh (with its tab, foam and energy), one drained and flat ----------
  const H = 0.168;
  meterTex.flipY = false;
  function prepare(root, { flat }) {
    const u = { uMeter: { value: meterTex }, uLevel: { value: 0 }, uMeterColor: { value: new Color(1.0, 0.75, 0.35) }, uMeterGain: { value: 0 }, uSat: { value: flat ? 0.06 : 1 }, uDim: { value: flat ? 0.55 : 1 } };
    let label = null;
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      o.material = o.material.clone();
      if (o.material.map) o.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (/Foam/.test(o.name) || /Foam/.test(o.parent ? o.parent.name : '')) o.visible = false;
      if (o.material.emissiveMap) {
        label = o.material;
        o.material.emissiveIntensity = 0;
        o.material.onBeforeCompile = (sh) => {
          Object.assign(sh.uniforms, u);
          sh.fragmentShader = 'uniform sampler2D uMeter; uniform float uLevel; uniform vec3 uMeterColor; uniform float uMeterGain; uniform float uSat; uniform float uDim;\n' + sh.fragmentShader
            .replace('#include <map_fragment>', `#include <map_fragment>
              { float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, uSat) * uDim; }`)
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
              { float m = texture2D(uMeter, vMapUv).r; float h = 1.0 - vMapUv.y;
                float top = 0.465 + uLevel * (0.815 - 0.465);
                float lit = m * smoothstep(top + 0.006, top - 0.006, h);
                totalEmissiveRadiance += uMeterColor * lit * uMeterGain; }`);
        };
      }
    });
    if (flat) root.traverse((o) => { if (o.name === 'Opening') o.visible = false; });
    // holder: where it is · crush: squashes in world space (the press) · orient: how it is turned · root: the model
    const orient = new Group(); orient.add(root); root.position.y = -H / 2;
    const crush = new Group(); crush.add(orient);
    const holder = new Group(); holder.add(crush);
    scene.add(holder);
    return { root, orient, crush, holder, label, u };
  }
  const freshRoot = canG.scene;
  const flatRoot = freshRoot.clone(true);
  const flat = prepare(flatRoot, { flat: true });
  const fresh = prepare(freshRoot, { flat: false });
  fresh.holder.visible = false;
  flat.u.uMeterColor.value.setRGB(1.0, 0.12, 0.08);   // a red last bar

  // the fresh can's own animations: «open» (tab, opening) and «Foam»
  const mixer = new AnimationMixer(freshRoot);
  const isFoam = (c) => c.tracks.some((t) => /Foam/.test(t.name));
  const mk = (c) => { const a = mixer.clipAction(c); a.setLoop(LoopOnce, 1); a.clampWhenFinished = true; return a; };
  const openA = canG.animations.filter((c) => !isFoam(c)).map(mk), foamA = canG.animations.filter(isFoam).map(mk);
  const foamMeshes = []; freshRoot.traverse((o) => { if (o.isMesh && /Foam/.test(o.name + (o.parent ? o.parent.name : ''))) foamMeshes.push(o); });
  const setOpen = (k) => { openA.forEach((a) => { a.play(); a.paused = true; a.time = a.getClip().duration * clamp(k); }); mixer.update(0); };
  const setFoam = (s) => { foamA.forEach((a) => { a.play(); a.paused = true; a.time = Math.min(s, a.getClip().duration); }); foamMeshes.forEach((m) => { m.visible = s > 0.01; }); mixer.update(0); };
  setOpen(0); setFoam(0);
  const tab = freshRoot.getObjectByName('Tab');
  if (tab) { tab.material = tab.material.clone(); tab.material.emissive = new Color(1, 0.8, 0.45); tab.material.emissiveIntensity = 0; }

  // the spray: the Cycles flipbook as a sprite standing on the opening
  let spray = null;
  if (sprayTex && sprayMeta) {
    sprayTex.colorSpace = SRGBColorSpace;
    sprayTex.repeat.set(1 / sprayMeta.cols, 1 / sprayMeta.rows);
    const mat = new SpriteMaterial({ map: sprayTex, transparent: true, depthWrite: false, opacity: 0 });
    spray = new Sprite(mat);
    const c = sprayMeta.crop, visH = H / 0.53;
    spray.scale.set((c.x1 - c.x0) * visH * 9 / 16, (c.y1 - c.y0) * visH, 1);
    spray.center.set(0.5, 1 - (0.36 - c.y0) / (c.y1 - c.y0));
    fresh.holder.add(spray);
    spray.position.set(0, H / 2, 0.012);
  }
  const sprayFrame = (f) => {
    if (!spray) return;
    const { cols, rows, frames } = sprayMeta;
    if (f < 0 || f >= frames) { spray.material.opacity = 0; return; }
    spray.material.opacity = f > frames - 6 ? (frames - f) / 6 : 1;
    spray.material.map.offset.set((f % cols) / cols, 1 - (Math.floor(f / cols) + 1) / rows);
  };

  // ---------- time: tweens, waits ----------
  const tweens = [];
  const tween = (dur, fn, ease = easeInOut) => new Promise((res) => {
    if (RM) dur = Math.min(dur, 0.01);
    tweens.push({ t0: performance.now(), dur: dur * 1000, fn, ease, res });
  });
  const wait = (s) => new Promise((r) => setTimeout(r, RM ? 0 : s * 1000));

  // ---------- the camera rig ----------
  const cam = { pos: ST.start.pos.clone(), tgt: ST.start.tgt.clone(), fov: ST.start.fov };
  let shakeAmt = 0, push = 0;
  // the camera flies along one smooth curve through the waypoints (no corners), the target along its own; the field
  // of view can open up on the way (fovPeak: a tunnel rush through the hole) and the picture smears with speed (blur)
  function fly(to, dur = 1.4, via = [], { fovPeak = 0, blur = 0, ease = easeInOut } = {}) {
    const f0 = cam.fov;
    const path = new CatmullRomCurve3([cam.pos.clone(), ...via.map((v) => v.pos), to.pos], false, 'centripetal');
    const aims = new CatmullRomCurve3([cam.tgt.clone(), ...via.map((v) => v.tgt || to.tgt), to.tgt], false, 'centripetal');
    return tween(dur, (k) => {
      path.getPointAt(k, cam.pos);
      aims.getPointAt(k, cam.tgt);
      const bump = Math.sin(Math.PI * k);
      cam.fov = MathUtils.lerp(f0, to.fov, k) + fovPeak * bump * bump;
      if (blur && !RM) canvas.style.filter = bump > 0.05 ? `blur(${(blur * Math.pow(bump, 3)).toFixed(2)}px)` : '';
      if (k >= 1) canvas.style.filter = '';
    }, ease);
  }
  let pointerPar = new Vector2();
  addEventListener('pointermove', (e) => { if (!COARSE) pointerPar.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5); }, { passive: true });
  const par = new Vector2();

  // ---------- resize ----------
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    bloom.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  }
  resize(); addEventListener('resize', resize);

  // screen-space helpers
  const toScreen = (v) => { const p = v.clone().project(camera); return new Vector2((p.x * 0.5 + 0.5) * innerWidth, (-p.y * 0.5 + 0.5) * innerHeight); };
  const ray = new Raycaster();
  const hits = (e, obj) => {
    ray.setFromCamera(new Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    return ray.intersectObject(obj, true).length > 0;
  };

  // ---------- input: the current step owns the pointer and the keys ----------
  let step = null;                                  // { name, down, move, up, act, key, hold }
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => { S.unlock(); askMotion(); if (step && step.down) { canvas.setPointerCapture(e.pointerId); step.down(e); } });
  canvas.addEventListener('pointermove', (e) => { if (step && step.move) step.move(e); });
  const up = (e) => { if (step && step.up) step.up(e); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  function begin(name, handlers) {
    return new Promise((resolve) => {
      // when a step is done the chip goes away until the next one asks for something (ui.step('wait'))
      step = { name, ...handlers, done: (v) => { if (step && step.name === name) { step = null; ui.step('wait'); resolve(v); } } };
      ui.step(name);
    });
  }

  // shake from the phone itself (iOS asks for permission inside a gesture: the first press)
  let motionAsked = false, onMotion = null;
  function askMotion() {
    if (motionAsked) return; motionAsked = true;
    const D = window.DeviceMotionEvent;
    if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {});
  }
  let lastA = null;
  addEventListener('devicemotion', (e) => {
    const a = e.accelerationIncludingGravity || e.acceleration; if (!a || a.x == null) return;
    if (lastA) { const j = Math.abs(a.x - lastA.x) + Math.abs(a.y - lastA.y) + Math.abs(a.z - lastA.z); if (j > 18 && onMotion) onMotion(); }
    lastA = { x: a.x, y: a.y, z: a.z };
  });

  // ---------- the loop ----------
  let energy = 0, meterGlow = 0, t0 = performance.now(), last = t0, scrT = 0;
  let flatBlink = true, idleBob = true;
  const flash = document.getElementById('flash');
  const flashIt = (strong) => { if (!flash || RM) return; flash.className = ''; void flash.offsetWidth; flash.className = strong ? 'go big' : 'go'; };

  renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000), t = (now - t0) / 1000; last = now;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const w = tweens[i], k = clamp((now - w.t0) / w.dur);
      w.fn(w.ease(k));
      if (k >= 1) { tweens.splice(i, 1); w.res(); }
    }
    // the flat battery's last bar blinks red
    flat.u.uLevel.value = 0.09;
    flat.u.uMeterGain.value = flatBlink ? (Math.sin(t * 7) > 0 ? 2.2 : 0.15) : 0;
    if (idleBob && flat.holder.visible && !dragging) flat.holder.position.y = P_START.y + Math.sin(t * 1.6) * 0.008;
    // the fresh can: energy veins and the gauge
    if (fresh.label) fresh.label.emissiveIntensity = energy * (0.75 + 0.25 * Math.random());
    fresh.u.uMeterGain.value = meterGlow;
    // neon: the ring breathes; the tubes flicker now and then
    if (ring) ring.material.emissiveIntensity = ringBase * (ringPulse ? 0.7 + 0.6 * (0.5 + 0.5 * Math.sin(t * 4)) : 1);
    tubes.forEach((tb, i) => { tb.material.emissiveIntensity = (Math.sin(t * 0.7 + i * 2) > 0.985 && Math.random() > 0.5) ? 0.3 : 3; });
    // the camera: rig + parallax + shake
    par.lerp(pointerPar, Math.min(1, dt * 3));
    camera.position.copy(cam.pos);
    camera.position.x += par.x * 0.05; camera.position.y -= par.y * 0.03;
    if (shakeAmt > 0) { camera.position.x += (Math.random() - 0.5) * shakeAmt; camera.position.y += (Math.random() - 0.5) * shakeAmt; shakeAmt = Math.max(0, shakeAmt - dt * 0.06); }
    camera.fov = cam.fov - push;
    camera.updateProjectionMatrix();
    camera.lookAt(cam.tgt);
    if ((scrT += dt) > 0.06) { scrT = 0; drawScreen(t); }
    if (frameHook) frameHook(dt, t);
    if (fxHook) fxHook(dt, t);
    renderer.render(scene, camera);
    bloom.render(scene, camera, 0.35 + 0.45 * clamp(energy / 2));
  });
  let frameHook = null, fxHook = null, ringPulse = false, dragging = false;

  // ---------- poses ----------
  const qUp = new Quaternion().setFromEuler(new Euler(0.12, 0.35, -0.22));          // held out, a little tipped
  const qLie = new Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2);         // lying, top into the machine
  const rollQ = (th) => new Quaternion().setFromAxisAngle(V(0, 0, 1), th).multiply(qLie);
  flat.holder.position.copy(P_START); flat.orient.quaternion.copy(qUp);

  // ================================================================== the story
  async function intro() {
    ui.step('intro');
    say('', '');
    S.hum.start();
    // the machine wakes: the neon and the screen stutter on
    for (const k of [0.2, 0, 0.6, 0.1, 1]) { if (ring) ring.material.emissiveIntensity = ringBase * k; await wait(0.09); }
    say('FLATT BATTERI?', 'SETT INN HER', '#4fd6c8', { blink: true });
    ringPulse = true;
  }

  // a spring (critically damped or bouncy, by k and d) that eases a vector toward a goal: x, v updated in place
  const spring = (x, v, goal, k, d, dt) => {
    const n = Math.ceil(dt / 0.008), h = dt / n;                 // small steps: stable at any frame rate
    for (let i = 0; i < n; i++) for (const a of ['x', 'y', 'z']) { v[a] += ((goal[a] - x[a]) * k - v[a] * d) * h; x[a] += v[a] * h; }
  };
  const ndc = (e) => new Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);

  // 1 · DRAG — the can follows your finger in 3D. Picked up, it lifts toward you and grows a touch; it leans into the
  // direction you move it; nearing the hole it lies down and the hole starts pulling (a magnet that grows with
  // closeness). Let go far away and it springs back with a small bounce; let go close and the machine takes it.
  function stepDrag() {
    idleBob = false;
    const x = P_START.clone(), v = V(0, 0, 0), goal = P_START.clone();
    const plane = new Plane(), hit = new Vector3();
    const span = P_START.distanceTo(P_HOLE);
    let grabbed = false, lift = 0, leanX = 0, leanY = 0, released = false, auto = 0;
    const closeness = () => clamp(1 - x.distanceTo(P_HOLE) / span);
    const follow = (e) => {
      // where the finger is in the world: on a plane that moves from the can's depth to the hole's as it gets closer
      const a = toScreen(P_START), b = toScreen(P_HOLE), f = new Vector2(e.clientX, e.clientY);
      const pS = clamp(1 - f.distanceTo(b) / a.distanceTo(b));
      plane.set(V(0, 0, 1), -MathUtils.lerp(P_START.z, P_HOLE.z, smooth(0, 1, pS)));
      ray.setFromCamera(ndc(e), camera);
      if (ray.ray.intersectPlane(plane, hit)) goal.lerpVectors(hit, P_HOLE, smooth(0.55, 0.95, pS));   // the hole pulls
    };
    let self;
    frameHook = (dt, t) => {
      if (released) return;
      if (auto) {                                  // the action chip / Enter: it flies in by itself along the same path
        auto = Math.min(1, auto + dt / 0.9);
        goal.lerpVectors(P_START, P_HOLE, easeInOut(auto));
        goal.y += Math.sin(auto * Math.PI) * 0.06;
        if (auto >= 1 && closeness() > 0.97) { release(); return; }
      }
      const g = grabbed || auto ? goal : V(P_START.x, P_START.y + Math.sin(t * 1.6) * 0.008, P_START.z);
      // held: tight and quick; let go: a softer spring that overshoots a little on the way home
      spring(x, v, g, grabbed || auto ? 420 : 140, grabbed || auto ? 40 : 11, dt);
      lift += ((grabbed ? 1 : 0) - lift) * (1 - Math.exp(-dt * 12));
      const c = closeness();
      flat.holder.position.copy(x);
      flat.holder.position.z += 0.05 * lift * (1 - c);                  // picked up: toward you …
      flat.holder.scale.setScalar(1 + 0.05 * lift * (1 - c));           // … and a touch bigger
      leanX += (clamp(-v.x * 1.6, -0.45, 0.45) - leanX) * (1 - Math.exp(-dt * 10));
      leanY += (clamp(v.y * 1.2, -0.35, 0.35) - leanY) * (1 - Math.exp(-dt * 10));
      const pose = qUp.clone().slerp(qLie, smooth(0.45, 0.92, c));
      flat.orient.quaternion.copy(new Quaternion().setFromEuler(new Euler(leanY, 0, leanX)).multiply(pose));
      if (ring) { ring.material.emissiveIntensity = ringBase * (1 + 2.8 * c * c); ring.scale.setScalar(1 + 0.08 * c * c); }
      holeLight.intensity = 0.25 + 1.2 * c * c;
    };
    const release = () => {
      if (released) return;
      if (closeness() > 0.62) { released = true; frameHook = null; self.done(flat.holder.position.clone()); }
      else { grabbed = false; S.drop(); }
    };
    return begin('drag', {
      down() { self = this; grabbed = true; dragging = true; S.grab(); },
      move(e) { if (grabbed) follow(e); },
      up() { if (!grabbed) return; dragging = false; release(); if (!released) grabbed = false; },
      act() { self = this; auto = auto || 0.001; },
      key() {},
    });
  }

  // the machine swallows it: a short pull that speeds up, a spin as it goes, the ring gulps — and the camera dives
  // after it on one smooth curve, the field of view opening as it passes through the hole, the light changing on the way
  async function dive(from) {
    ringPulse = false; flatBlink = false; idleBob = false;
    say('SKANNER …', '', '#4fd6c8');
    S.suck();
    const q0 = flat.orient.quaternion.clone(), s0 = flat.holder.scale.x;
    const inTube = V(0, 1.03, -0.06);
    const swallow = tween(0.42, (k) => {
      flat.holder.position.lerpVectors(from, inTube, k);
      flat.holder.scale.setScalar(MathUtils.lerp(s0, 1, k));
      flat.orient.quaternion.copy(q0).slerp(rollQ(k * TAU), easeOut(k));
      if (ring) ring.scale.setScalar(1.08 + 0.18 * Math.sin(Math.PI * k));      // the gulp
    }, easeIn).then(() => {
      S.gulp();
      if (ring) { ring.scale.setScalar(1); ring.material.emissiveIntensity = ringBase * 3.5; }
      return tween(0.5, (k) => { flat.holder.position.lerpVectors(inTube, P_CHAMBER, k); flat.orient.quaternion.copy(rollQ(TAU + k * Math.PI)); }, easeOut);
    });
    // the light goes from the street to the chamber while we pass through the hole, not after
    const lights = tween(1.5, (k) => {
      const e = smooth(0.35, 0.85, k);
      scene.environmentIntensity = MathUtils.lerp(0.1, 0.04, e);
      scene.fog.density = MathUtils.lerp(0.22, 0.6, e);
      chamberFill.intensity = 0.12 * e; chamberRed.intensity = 0.35 * e;
      holeLight.intensity = MathUtils.lerp(1.45, 0.25, e);
    }, (t) => t);
    await fly(ST.inside, RM ? 0.01 : 1.5,
      [{ pos: V(0.02, 1.08, 0.75), tgt: V(0, 1.05, -0.1) }, { pos: V(0, 1.055, 0.03), tgt: V(0, 1.03, -0.3) }],
      { fovPeak: 18, blur: 2.6 });
    await swallow; await lights;
    lasers.forEach((l) => { l.visible = true; });
    // the scan: the laser fan sweeps up and down the can while the rollers spin it, fast, then slowing — and it comes
    // to rest the wrong way round, wobbles, and is rejected
    S.rollers.start();
    const laserZ = lasers.map((l) => l.position.z);
    fxHook = (dt, t) => lasers.forEach((l, i) => {
      l.position.z = laserZ[i] + Math.sin(t * 3.2 + i * 0.9) * 0.05;
      l.material.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 24 + i));
    });
    const th0 = TAU + Math.PI, th1 = 3 * TAU;         // ends with the barcode facing down (≡ 0)
    let beepAt = 0;
    await tween(RM ? 0.01 : 1.9, (k) => {
      const th = th0 + (th1 - th0) * k;
      flat.orient.quaternion.copy(rollQ(th)); rollers.forEach((r) => r.rotation.y = -th * 1.8);
      if (k > beepAt) { S.scanBeep(1800); beepAt = k + 0.06 + 0.25 * k; }
    }, easeOut);
    S.rollers.stop();
    await tween(RM ? 0.01 : 0.35, (k) => {                       // it settles: a small damped rock
      const th = th1 + Math.sin(k * Math.PI * 3) * 0.14 * (1 - k);
      flat.orient.quaternion.copy(rollQ(th)); rollers.forEach((r) => r.rotation.y = -th * 1.8);
    }, (t) => t);
    // AVVIST: a buzz, the chamber flashes red, the can twitches «no» on the rollers, the camera flinches
    S.reject();
    say('AVVIST', 'STREKKODEN VISES IKKE', '#ff4b3e');
    lasers.forEach((l) => l.material.emissive && l.material.emissive.setRGB(1, 0.08, 0.06));
    shakeAmt = 0.004; push = -2.5;
    await tween(RM ? 0.01 : 0.5, (k) => {
      const th = Math.sin(k * Math.PI * 6) * 0.09 * (1 - k);
      flat.orient.quaternion.copy(rollQ(th));
      chamberRed.intensity = 0.35 + 1.1 * (1 - k) * (Math.sin(k * Math.PI * 4) > 0 ? 1 : 0.3);
      push = -2.5 * (1 - k);
    }, (t) => t);
    push = 0; chamberRed.intensity = 0.35;
    receiptData.tries = 2;
    return 0;
  }

  // 3 · ROLL — the can's surface follows your finger one to one: the drag is turned into rotation using where the
  // can's near side actually moves on screen. The scanner answers as the barcode comes round: the lasers warm from red
  // to amber, the beeps quicken, and when it faces the scanner it locks (a magnet snap, a click, a green flash).
  // Left alone, the can rocks a little on its rollers to show that it can be rolled.
  function stepRoll(th0) {
    let th = th0, vel = 0, dragging2 = false, last = null, lastT = 0, accepted = false, idleT = 0, touched = false;
    const ACCEPT = 0.24;
    const setTh = (val) => { th = val; flat.orient.quaternion.copy(rollQ(th)); rollers.forEach((r) => r.rotation.y = -th * 1.8); };
    const off = () => Math.abs(wrap(th - Math.PI));                    // 0 = barcode facing the scanner
    // screen pixels per radian, and the direction the can's near side moves for +θ
    const tangent = () => {
      const C = P_CHAMBER.clone(), toCam = camera.position.clone().sub(C); toCam.z = 0; toCam.normalize();
      const Pn = C.clone().addScaledVector(toCam, 0.033);
      const T = V(0, 0, 1).cross(toCam).multiplyScalar(0.033 * 0.1);   // the surface moved by 0.1 rad
      const a = toScreen(Pn), b = toScreen(Pn.clone().add(T));
      return b.sub(a).multiplyScalar(10);                            // px per radian
    };
    let dir = null, beepAt = 0, self;
    const lockIn = () => {
      if (accepted) return;
      accepted = true; frameHook = null; dragging2 = false;
      const from = th, to = th + wrap(Math.PI - th);
      S.lock();
      tween(0.18, (k) => setTh(from + (to - from) * k), easeOut)
        .then(() => tween(0.28, (k) => { flat.crush.scale.setScalar(1 + 0.05 * Math.sin(Math.PI * k)); }, (t) => t))
        .then(() => self.done());
    };
    // the scanner's answer, every frame of this step
    fxHook = (dt, t) => {
      lasers.forEach((l, i) => { l.material.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 24 + i)); });
      if (accepted) return;
      const o = off(), warm = 1 - clamp((o - ACCEPT) / 1.2);           // 0 far … 1 nearly there
      lasers.forEach((l) => l.material.emissive && l.material.emissive.setRGB(1, 0.08 + 0.55 * warm, 0.06));
      chamberRed.color.setRGB(1, 0.16 + 0.5 * warm, 0.1);
      if ((dragging2 || Math.abs(vel) > 0.5) && t > beepAt) { S.scanBeep(1500 + 900 * warm); beepAt = t + 0.32 - 0.24 * warm; }
      if (o < ACCEPT && (dragging2 || Math.abs(vel) < 6)) lockIn();
      // a hint when left alone: it rocks on its rollers
      if (!touched && !dragging2 && Math.abs(vel) < 0.01) {
        idleT += dt;
        if (idleT > 2.2) { const k = (idleT - 2.2) / 0.9; setTh(Math.sin(Math.min(1, k) * Math.PI * 2) * 0.22 * Math.sin(Math.min(1, k) * Math.PI)); if (k >= 1) idleT = 0; }
      }
    };
    return begin('roll', {
      down(e) { self = this; touched = true; dragging2 = true; last = new Vector2(e.clientX, e.clientY); lastT = performance.now(); vel = 0; frameHook = null; dir = tangent(); },
      move(e) {
        if (!dragging2 || accepted) return;
        const now = performance.now(), f = new Vector2(e.clientX, e.clientY), d = f.clone().sub(last);
        last = f;
        const dth = d.dot(dir) / dir.lengthSq();                     // the surface under the finger moves with it
        setTh(th + dth);
        vel = dth / Math.max(0.008, (now - lastT) / 1000); lastT = now;
      },
      up() {
        if (!dragging2) return; dragging2 = false;
        self = this;
        frameHook = (dt) => {                                         // it keeps rolling, and slows
          if (accepted) return;
          setTh(th + vel * dt); vel *= Math.exp(-3.2 * dt);
          if (Math.abs(vel) < 0.2) { vel = 0; frameHook = null; if (off() < ACCEPT + 0.12) lockIn(); }
        };
      },
      key(k) {
        if (k !== 'up' && k !== 'down') return;
        self = this; touched = true;
        const from = th, to = th + (k === 'up' ? -0.45 : 0.45);
        tween(0.18, (q) => setTh(from + (to - from) * q), easeOut).then(() => { if (off() < ACCEPT + 0.12) lockIn(); });
      },
      act() { self = this; touched = true; const from = th, to = th + wrap(Math.PI - th); tween(0.8, (q) => setTh(from + (to - from) * q)).then(lockIn); },
    });
  }

  async function crushIt() {
    fxHook = null;
    S.accept();
    say('GODKJENT', '1 × BATTERI (FLATT)', '#4dff8a');
    lasers.forEach((l) => l.material.emissive && l.material.emissive.setRGB(0.1, 1, 0.3));
    chamberRed.color.setRGB(0.2, 1, 0.3);
    await wait(0.7);
    lasers.forEach((l) => { l.visible = false; });
    chamberRed.color.setRGB(1, 0.16, 0.1); chamberRed.intensity = 0.4;
    // the press: fast to the can, then slow through it
    const py = press ? press.position.y : 0;
    const anchor = 0.993;                              // the top of the rollers: the can stays on them
    flat.crush.position.y = anchor - P_CHAMBER.y; flat.orient.position.y = P_CHAMBER.y - anchor;   // squash toward the rollers
    await tween(0.18, (k) => { if (press) press.position.y = py - 0.13 * k; }, easeIn);
    S.crush(); flashIt(false); shakeAmt = 0.02;
    await tween(RM ? 0.01 : 0.9, (k) => {
      if (press) press.position.y = py - 0.13 - 0.045 * k;
      flat.crush.scale.set(1 + 0.3 * k, 1 - 0.68 * k, 1 + 0.05 * k);
      flat.crush.rotation.z = Math.sin(k * 9) * 0.04 * k;
    }, easeOut);
    const count = 1 + (Number(localStorage.getItem('bb-count') || 0) || 0);
    try { localStorage.setItem('bb-count', String(count)); } catch (e) { /* private mode */ }
    receiptData.count = count;
    say('KNAS!', `BATTERIER BYTTET I DAG: ${count}`, '#ffd27a');
    await tween(0.4, (k) => { if (press) press.position.y = py - 0.175 * (1 - k); });
    // it drops away into the bin
    const fy = flat.holder.position.y;
    await tween(0.35, (k) => { flat.holder.position.y = fy - 0.25 * k; }, easeIn);
    flat.holder.visible = false;
  }

  async function backOut() {
    chamberFill.intensity = 0; chamberRed.intensity = 0;
    await fly(ST.button, RM ? 0.01 : 1.5, [{ pos: V(0, 1.055, 0.02), tgt: V(0, 1.05, 0.4) }, { pos: V(0.05, 1.07, 0.5), tgt: V(0.1, 1.0, 0) }]);
    scene.environmentIntensity = 0.1; scene.fog.density = 0.22;
    say('TRYKK PANT', 'FOR LAPP OG NYTT BATTERI', '#4dff8a', { blink: true });
  }

  function stepPress() {
    let pulse = true;
    frameHook = (dt, t) => { if (pulse && button) button.material.emissiveIntensity = 1.6 * (0.6 + 0.8 * (0.5 + 0.5 * Math.sin(t * 5))); };
    const near = (e) => { const b = toScreen(button.getWorldPosition(new Vector3())); return b.distanceTo(new Vector2(e.clientX, e.clientY)) < Math.max(90, innerWidth * 0.18) || hits(e, button); };
    const go = async (self) => {
      pulse = false; frameHook = null;
      S.click();
      const z = button.position.z;
      await tween(0.08, (k) => { button.position.z = z - 0.012 * k; });
      await tween(0.15, (k) => { button.position.z = z - 0.012 * (1 - k); });
      self.done();
    };
    return begin('press', {
      down(e) { if (button && near(e)) go(this); },
      act() { go(this); },
      key() {},
    });
  }

  async function printAndJam() {
    say('SKRIVER UT …', '', '#4fd6c8');
    receiptData.time = new Date();
    drawReceipt(rc, receiptData); rTex.needsUpdate = true;
    receipt.visible = true;
    S.printer(1.6);
    // the paper comes out in stutters, like a thermal printer
    await tween(1.6, (k) => { receipt.scale.y = Math.max(0.001, Math.floor(k * 14) / 14); }, (t) => t);
    say('GOD TUR!', 'UTLEVERER BATTERI …', '#4fd6c8');
    await wait(0.6);
    // … and the machine chokes on the fresh can
    S.rumble.start();
    say('FEIL 0xBATT', 'BATTERIET SITTER FAST', '#ff4b3e', { blink: true });
    fresh.holder.visible = true;
    fresh.holder.position.set(0.04, 0.33, -0.1);
    fresh.orient.quaternion.setFromEuler(new Euler(0.15, 0.3, 1.15));
    let jt = 0;
    frameHook = (dt) => { jt += dt; shakeRig.position.x = Math.sin(jt * 60) * 0.0015; };
    await fly(ST.hatch, RM ? 0.01 : 1.3, [{ pos: V(0.2, 0.85, 1.0), tgt: V(0.05, 0.5, 0) }]);
    frameHook = null; shakeRig.position.set(0, 0, 0);
    S.rumble.stop(0.2);
    say('RIST MASKINEN!', '', '#ffd27a', { bar: 0 });
  }

  function stepShake() {
    let energyS = 0, lastX = null, lastDir = 0, kick = 0;
    const NEED = 6;
    const impulse = (self, k = 1) => {
      if (energyS >= NEED) return;
      energyS += k; kick = 1;
      S.rattle(0.8 + 0.4 * Math.random());
      scrState.bar = energyS / NEED;
      if (energyS >= NEED) { onMotion = null; frameHook = null; shakeRig.position.set(0, 0, 0); shakeRig.rotation.z = 0; self.done(); }
    };
    let self;
    onMotion = () => { if (step && step.name === 'shake') impulse(step, 1); };
    frameHook = (dt, t) => {
      kick = Math.max(0, kick - dt * 3.5);
      shakeRig.position.x = Math.sin(t * 70) * 0.012 * kick;
      shakeRig.rotation.z = Math.sin(t * 55) * 0.012 * kick;
      fresh.orient.rotation.z = 1.15 + Math.sin(t * 40) * 0.08 * kick;
    };
    return begin('shake', {
      down(e) { self = this; lastX = e.clientX; lastDir = 0; impulse(this, 0.5); },
      move(e) {
        self = this;
        if (lastX == null) return;
        const dx = e.clientX - lastX;
        if (Math.abs(dx) > 18) { const dir = Math.sign(dx); if (dir !== lastDir) { impulse(this, 1); lastDir = dir; } lastX = e.clientX; }
      },
      up() { lastX = null; },
      key(k) { if (k === 'shake') impulse(this, 1); },
      act() { const s = this; (async () => { for (let i = 0; i < NEED; i++) { impulse(s, 1); await wait(0.22); } })(); },
    });
  }

  async function dropOut() {
    say('TA BATTERIET', '', '#4dff8a');
    // it falls, lands, the flap swings, and up it comes
    const p0 = fresh.holder.position.clone(), q0 = fresh.orient.quaternion.clone();
    const qLand = new Quaternion().setFromEuler(new Euler(0, 0.2, Math.PI / 2));
    await tween(0.32, (k) => { fresh.holder.position.lerpVectors(p0, V(0.0, 0.185, -0.08), k); fresh.orient.quaternion.slerpQuaternions(q0, qLand, k); }, easeIn);
    S.thud(); shakeAmt = 0.012; flashIt(false);
    await tween(0.25, (k) => { if (flap) flap.rotation.x = -0.9 * Math.sin(k * Math.PI); });
    const p1 = fresh.holder.position.clone(), q1 = fresh.orient.quaternion.clone();
    heroLight.intensity = 0.6;
    const flying = fly(ST.hero, RM ? 0.01 : 1.4);
    await tween(1.3, (k) => {
      const e = easeInOut(k);
      fresh.holder.position.lerpVectors(p1, P_HERO, e);
      fresh.holder.position.z += Math.sin(k * Math.PI) * 0.15;
      fresh.orient.quaternion.slerpQuaternions(q1, new Quaternion(), e);
      fresh.orient.rotateY(e * TAU);
    });
    fresh.orient.quaternion.identity();
    await flying;
    say('LAD OPP', 'HOLD PÅ BATTERIET', '#ffd27a', { bar: 0 });
  }

  function stepHold() {
    let level = 0, holding = false, auto = false, armed = false;
    const base = fresh.holder.position.clone();
    S.charge.start();
    let self;
    frameHook = (dt, t) => {
      if (!armed) {
        level = clamp(level + (holding || auto ? dt / 2.4 : -dt / 7));
        fresh.u.uLevel.value = level;
        meterGlow = 0.6 + 2.6 * level;
        energy = 0.15 + 2.2 * level * level;
        S.chargeLevel(level);
        scrState.bar = level; scrState.sub = `${Math.round(level * 100)} %`;
        const tr = (holding || auto) ? 0.0015 + 0.004 * level * level : 0;
        fresh.holder.position.set(base.x + (Math.random() - 0.5) * tr, base.y + Math.sin(t * 1.6) * 0.006 + (Math.random() - 0.5) * tr, base.z);
        push = 6 * easeInOut(level);
        if (level >= 1) {
          armed = true; holding = auto = false;
          S.charge.stop(); S.full(); flashIt(false);
          say('100 %', 'DRA FLIKEN OPP', '#4dff8a', { blink: true });
          energy = 0.9;
          frameHook = (d, tt) => { if (tab) tab.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(tt * 6); fresh.holder.position.y = base.y + Math.sin(tt * 1.6) * 0.006; };
          self.done();
        }
      }
    };
    return begin('hold', {
      down() { self = this; holding = true; },
      up() { holding = false; },
      hold(v) { self = this; holding = v; },
      act() { self = this; auto = true; },
      key() {},
    });
  }

  function stepFlick() {
    let y0 = null, tStart = 0;
    return begin('flick', {
      down(e) { y0 = e.clientY; tStart = performance.now(); },
      move(e) { if (y0 != null && y0 - e.clientY > 60 && performance.now() - tStart < 900) { y0 = null; this.done(); } },
      up(e) { if (y0 != null && hits(e, fresh.holder)) { y0 = null; this.done(); } y0 = null; },
      key(k) { if (k === 'up') this.done(); },
      act() { this.done(); },
    });
  }

  async function popAndFinale() {
    frameHook = null; if (tab) tab.material.emissiveIntensity = 0;
    S.pop(); flashIt(true); shakeAmt = 0.025;
    energy = 3.2;
    const t0p = performance.now();
    const openDur = 0.75;
    frameHook = (dt) => {
      const s = (performance.now() - t0p) / 1000;
      setOpen(easeOut(clamp(s / openDur)));
      sprayFrame(Math.floor(s * (sprayMeta ? sprayMeta.fps : 24)));
      if (s > 0.3) setFoam(s - 0.3);
      energy = Math.max(0.12, 3.2 * Math.exp(-s * 2.2));
      meterGlow = Math.max(0.8, 3.2 * Math.exp(-s * 1.5));
    };
    push = 0;
    say('FULLT LADET', 'BATTERIET ER BYTTET', '#4dff8a');
    await wait(0.8);
    // the camera pulls back to the hero shot: the machine, the fresh can, the receipt hanging from the slot
    const turn = tween(RM ? 0.01 : 3.0, (k) => { fresh.orient.rotation.y = TAU * easeInOut(k); });
    await fly(ST.finale, RM ? 0.01 : 2.6);
    await turn;
    say('DIN TUR?', 'BATTERIBYTTE.VERCEL.APP', '#ffd27a');
    return receiptData;
  }

  // ---------- public: run the story; the page's chip and keys reach the current step through these ----------
  return {
    async run() {
      await intro();
      const at = await stepDrag();
      const th = await dive(at);
      await stepRoll(th);
      await crushIt();
      await backOut();
      await stepPress();
      await printAndJam();
      await stepShake();
      await dropOut();
      await stepHold();
      await stepFlick();
      return popAndFinale();
    },
    act() { if (step && step.act) step.act(); },
    key(k) { if (step && step.key) step.key(k); },
    hold(v) { if (step && step.hold) step.hold(v); },
    get step() { return step ? step.name : null; },
    receiptCanvas: () => drawReceipt(document.createElement('canvas'), receiptData),
  };
}
