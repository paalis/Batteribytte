// Batteribytte · the can in real 3D: it takes over from the film for the climax and stays for the finale.
//
// The can is modelled in Blender (tools/blender/build_can.py → assets/can/battery-can.glb): a real 500 ml can with
// the label unwrapped from the product photo, condensation droplets (normal map), lightning veins baked into an
// emissive map («energy»), a tab on a hinge and the opening, and an animation «open». The spray is a Blender particle
// burst rendered with Cycles from this very camera into a flipbook (tools/blender/render_spray.py → spray.webp).
//
// The show (openShow): the 3D can appears exactly over the film's can, still closed → energy surges through the label
// and the can trembles → the tab snaps up, the spray bursts, flash and slam (onHit) → the energy dies down to a
// glimmer → one slow hero turn. Then it is yours to turn.
//
// Built into lib/can3d.js by tools/build-can3d.sh (esbuild: only the parts of three.js this file uses).
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, DirectionalLight, PMREMGenerator, SRGBColorSpace,
  NeutralToneMapping, AnimationMixer, LoopOnce, Box3, Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function mount(el, { model = 'assets/can/battery-can.glb', spray = 'assets/can/spray' } = {}) {
  const [gltf, sprayMeta] = await Promise.all([
    new GLTFLoader().loadAsync(model),
    fetch(spray + '.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

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
  scene.environmentIntensity = 0.55;

  const can = gltf.scene;
  const glowing = [];                                // materials with the baked energy veins
  can.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (o.material.map) o.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (o.material.emissiveMap) { o.material.emissiveIntensity = 0; glowing.push(o.material); }
  });
  // stand it with its middle at the origin (glTF is in metres; the can is 0.168 m tall)
  const bb = new Box3().setFromObject(can), size = bb.getSize(new Vector3());
  const H = size.y;
  can.position.y = -(bb.min.y + H / 2);

  // the «open» animation, scrubbed by k (Blender exports one clip per animated object: the hinge and the opening)
  const mixer = new AnimationMixer(can);
  const actions = gltf.animations.map((clip) => {
    const a = mixer.clipAction(clip);
    a.setLoop(LoopOnce, 1);
    a.clampWhenFinished = true;
    return a;
  });
  const openDur = actions.reduce((m, a) => Math.max(m, a.getClip().duration), 0) || 0.75;
  let openK = 0;
  const setOpen = (k) => {
    openK = clamp(k);
    for (const a of actions) { a.play(); a.paused = true; a.time = a.getClip().duration * openK; }
    mixer.update(0);
  };
  setOpen(0);

  const turn = new Group();                          // drag, the hero turn and the idle sway turn this
  turn.add(can);
  const shake = new Group();                         // the tremble before the pop
  shake.add(turn);
  const tilt = new Group();                          // a slight lean toward the camera, like the film
  tilt.add(shake);
  tilt.rotation.x = 0.06;
  scene.add(tilt);

  const key = new DirectionalLight(0xffe2b8, 2.2); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new DirectionalLight(0x4fd6c8, 2.6); rim.position.set(4, 1.5, -3); scene.add(rim);
  const rim2 = new DirectionalLight(0x4fd6c8, 1.2); rim2.position.set(-4, 0.5, -2); scene.add(rim2);
  // a light sweep: a hard white light that travels across the label once, like a product commercial
  const sweep = new DirectionalLight(0xffffff, 0); scene.add(sweep);

  // the camera frames the can where it stands in the film: 53 % of the frame's height, centre at 62.5 %
  const camera = new PerspectiveCamera(18, 9 / 16, 0.01, 50);
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

  // ---------- the spray: a flipbook over the canvas, in the same frame coordinates ----------
  let sprayEl = null;
  if (sprayMeta) {
    const c = sprayMeta.crop;
    sprayEl = document.createElement('div');
    sprayEl.setAttribute('aria-hidden', 'true');
    Object.assign(sprayEl.style, {
      position: 'absolute', pointerEvents: 'none', opacity: '0',
      left: c.x0 * 100 + '%', top: c.y0 * 100 + '%', width: (c.x1 - c.x0) * 100 + '%', height: (c.y1 - c.y0) * 100 + '%',
      backgroundImage: `url(${spray}.webp)`, backgroundRepeat: 'no-repeat',
      backgroundSize: `${sprayMeta.cols * 100}% ${sprayMeta.rows * 100}%`,
    });
    el.appendChild(sprayEl);
    new Image().src = spray + '.webp';               // warm the cache
  }
  function sprayFrame(f) {
    if (!sprayEl) return;
    const { cols, rows, frames } = sprayMeta;
    if (f < 0 || f >= frames) { sprayEl.style.opacity = '0'; return; }
    const c = f % cols, r = Math.floor(f / cols);
    sprayEl.style.opacity = String(f > frames - 6 ? (frames - f) / 6 : 1);
    sprayEl.style.backgroundPosition = `${(c / (cols - 1)) * 100}% ${(r / (rows - 1)) * 100}%`;
  }

  // ---------- interaction: drag to turn, inertia, a slow sway when left alone ----------
  let angle = 0, vel = 0, dragging = false, lastX = 0, lastMove = 0, spin = 0, t0 = performance.now(), held = false;
  const dom = renderer.domElement;
  dom.style.touchAction = 'pan-y';
  dom.addEventListener('pointerdown', (e) => { if (held) return; dragging = true; lastX = e.clientX; lastMove = performance.now(); vel = 0; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now(), dx = e.clientX - lastX;
    const da = (dx / Math.max(200, dom.clientWidth)) * Math.PI * 1.6;
    angle += da; vel = da / Math.max(0.008, (now - lastMove) / 1000);
    lastX = e.clientX; lastMove = now;
  });
  const end = () => { dragging = false; };
  dom.addEventListener('pointerup', end); dom.addEventListener('pointercancel', end);

  // ---------- the show's own clock ----------
  let energy = 0, tremble = 0, sweepK = -1;
  let show = null;                                   // { start, onHit, resolve, hit }
  const SURGE = 0.6, OPEN_AT = 0.6, HIT_AT = OPEN_AT + 0.3, TURN_AT = 1.5, TURN_LEN = 2.8, DONE_AT = 1.9;

  function runShow(now) {
    const t = (now - show.start) / 1000;
    // 1 · the surge: the veins light up and flicker faster and faster, the can trembles
    if (t < OPEN_AT) {
      const k = clamp(t / SURGE);
      energy = (0.4 + 2.4 * k * k) * (0.65 + 0.35 * Math.random());
      tremble = k * k;
    }
    // 2 · the pop: the tab snaps up, the spray bursts; the energy peaks and dies down to a glimmer
    if (t >= OPEN_AT) {
      setOpen(easeOut(clamp((t - OPEN_AT) / openDur)));
      sprayFrame(Math.floor((t - OPEN_AT) * (sprayMeta ? sprayMeta.fps : 24)));
      const d = t - OPEN_AT;
      energy = Math.max(0.12, 3.2 * Math.exp(-d * 2.6)) * (0.8 + 0.2 * Math.random());
      tremble = Math.max(0, 1 - d * 5);
    }
    if (!show.hit && t >= HIT_AT) { show.hit = true; show.onHit && show.onHit(); }
    if (!show.done && t >= DONE_AT) { show.done = true; show.resolve(); }
    // 3 · the hero turn: one slow turn with the light sweeping across the label
    if (t >= TURN_AT) {
      const k = clamp((t - TURN_AT) / TURN_LEN);
      spin = Math.PI * 2 * easeInOut(k);
      sweepK = k;
      if (k >= 1) { spin = 0; sweepK = -1; held = false; show = null; t0 = now; }
    }
  }

  let raf = 0, last = performance.now(), visible = false;
  function frame() {
    const now = performance.now();                   // one clock for the show and the frame (not rAF's argument)
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (show) runShow(now);
    else {
      energy += (0.12 * (0.85 + 0.15 * Math.sin(now / 180)) * (openK > 0.5 ? 1 : 0) - energy) * Math.min(1, dt * 3);
      tremble = 0;
    }
    if (!dragging && !held) {
      angle += vel * dt;
      vel *= Math.exp(-2.2 * dt);
      // with no push left, ease back toward the front with a slow sway (the brand side faces you)
      if (Math.abs(vel) < 0.4) {
        const home = Math.round(angle / (Math.PI * 2)) * Math.PI * 2 + Math.sin((now - t0) / 1000 * 0.6) * 0.35;
        angle += (home - angle) * Math.min(1, dt * 1.2);
      }
    }
    turn.rotation.y = angle + spin;
    const a = tremble * 0.0012;
    shake.position.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a * 0.5, 0);
    shake.rotation.z = (Math.random() - 0.5) * tremble * 0.012;
    for (const m of glowing) m.emissiveIntensity = energy;
    if (sweepK >= 0) {
      const x = -4 + 8 * sweepK;
      sweep.position.set(x, 1.2, 3);
      sweep.intensity = 3.5 * Math.sin(Math.PI * sweepK);
    } else sweep.intensity = 0;
    el.style.setProperty('--surge', energy.toFixed(3));
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(frame) : 0;
  }
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  return {
    el: dom,
    resize: fit,
    // the finale without the show: a full turn in from behind that settles on the front
    show() {
      visible = true; t0 = performance.now(); angle = 0; vel = 0; setOpen(1);
      spin = -Math.PI * 2;
      const start = performance.now(), D = 1600;
      (function tw(now) {
        const k = Math.min(1, (now - start) / D);
        spin = -Math.PI * 2 * (1 - easeOut(k));
        if (k < 1 && visible) requestAnimationFrame(tw);
      })(start);
      kick();
    },
    // the climax: resolves when «Fullt ladet!» may come in (the hero turn carries on under it)
    openShow({ onHit } = {}) {
      visible = true; angle = 0; vel = 0; spin = 0; held = true; setOpen(0); sprayFrame(-1);
      return new Promise((resolve) => { show = { start: performance.now(), onHit, resolve, hit: false, done: false }; kick(); });
    },
    // closed, front on, dark: ready to take over from the film
    reset() { show = null; held = false; visible = false; angle = 0; vel = 0; spin = 0; energy = 0; setOpen(0); sprayFrame(-1); },
    hide() { visible = false; sprayFrame(-1); },
    // a nudge from outside (the pointer, a fling): add angular velocity
    push(v) { vel += v; },
    open: setOpen,
    HIT_MS: HIT_AT * 1000,
  };
}
