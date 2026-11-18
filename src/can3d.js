// Batteribytte · the can in real 3D, for the finale after the film has played to its last frame.
//
// The can is modelled in Blender (tools/blender/build_can.py → assets/can/battery-can.glb): a real 500 ml can with
// the label unwrapped from the product photo, condensation droplets (normal map), a tab on a hinge and the opening,
// and an animation «open». Here it is lit, framed where the can stands in the film's last frame, opened (the film
// leaves it opened), and turned by the pointer.
//
// Built into lib/can3d.js by tools/build-can3d.sh (esbuild: only the parts of three.js this file uses).
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, DirectionalLight, PMREMGenerator, SRGBColorSpace,
  NeutralToneMapping, AnimationMixer, LoopOnce, Box3, Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export async function mount(el, { model = 'assets/can/battery-can.glb' } = {}) {
  const gltf = await new GLTFLoader().loadAsync(model);

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
  can.traverse((o) => {
    if (o.isMesh && o.material && o.material.map) o.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  });
  // stand it with its middle at the origin (glTF is in metres; the can is 0.168 m tall)
  const bb = new Box3().setFromObject(can), size = bb.getSize(new Vector3());
  const H = size.y;
  can.position.y = -(bb.min.y + H / 2);

  // opened, like the film's last frame: the «open» clip held on its last frame
  // (Blender exports one clip per animated object: the tab's hinge and the opening; they run together)
  const mixer = new AnimationMixer(can);
  const actions = gltf.animations.map((clip) => {
    const a = mixer.clipAction(clip);
    a.setLoop(LoopOnce, 1);
    a.clampWhenFinished = true;
    return a;
  });
  const setOpen = (k) => {
    for (const a of actions) { a.play(); a.paused = true; a.time = a.getClip().duration * k; }
    mixer.update(0);
  };
  setOpen(1);

  const turn = new Group();                          // drag and idle sway turn this
  turn.add(can);
  const tilt = new Group();                          // a slight lean toward the camera, like the film
  tilt.add(turn);
  tilt.rotation.x = 0.06;
  scene.add(tilt);

  const key = new DirectionalLight(0xffe2b8, 2.2); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new DirectionalLight(0x4fd6c8, 2.6); rim.position.set(4, 1.5, -3); scene.add(rim);
  const rim2 = new DirectionalLight(0x4fd6c8, 1.2); rim2.position.set(-4, 0.5, -2); scene.add(rim2);

  // the camera frames the can where it stands in the film's last frame: 53 % of the frame's height, centre at 62 %
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
    // 0 = closed, 1 = opened (the tab and the opening, from the model's own animation)
    open: setOpen,
  };
}
