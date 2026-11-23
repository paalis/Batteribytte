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
  EquirectangularReflectionMapping,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeBloom } from './bloom.js';
import * as S from './sound.js';
import { drawReceipt } from './receipt.js';
import { makeParticles, makeFoam } from './particles.js';
import { bump } from './counter.js';
import { av } from './av.js';

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
  inside: { pos: V(0.15, 1.235, -0.17), tgt: V(0, 1.01, -0.33), fov: 62 },   // above and beside the press's path
  button: { pos: V(0.32, 1.02, 0.62), tgt: V(0.22, 0.95, 0), fov: 46 },
  hatch:  { pos: V(0.0, 0.62, 1.05), tgt: V(0, 0.33, 0), fov: 48 },
  hero:   { pos: V(0.0, 0.98, 1.05), tgt: V(0, 0.95, 0.45), fov: 40 },
  pop:    { pos: V(0.07, 1.1, 0.8), tgt: V(0, 1.035, 0.45), fov: 40 },      // close on the opening as it pops
  finale: { pos: V(0.35, 1.05, 1.9), tgt: V(0, 0.95, 0.2), fov: 48 },
};
const P_START = V(-0.1, 0.84, 1.2);      // the flat can, held out in front of you
const P_HOLE = V(0, 1.05, 0.16);          // just in front of the hole
const P_CHAMBER = V(0, 1.011, -0.33);     // resting on the two rollers
const P_HERO = V(0, 0.95, 0.45);

export async function createWorld(canvas, ui) {
  const loader = new GLTFLoader();
  const tl = new TextureLoader();
  const [machineG, canG, meterTex, sprayTex, sprayMeta, envTex] = await Promise.all([
    loader.loadAsync(av('assets/pant/machine.glb')),
    loader.loadAsync(av('assets/can/battery-can.glb')),
    tl.loadAsync(av('assets/pant/meter.webp')),
    tl.loadAsync(av('assets/can/spray.webp')).catch(() => null),
    fetch(av('assets/can/spray.json')).then((r) => r.json()).catch(() => null),
    tl.loadAsync(av('assets/pant/env.webp')).catch(() => null),
  ]);

  // ---------- renderer, scene, light ----------
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let dprCap = COARSE ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;            // the receipt is cut off at the slot as it slides out
  const scene = new Scene();
  scene.background = new Color(0x040506);
  scene.fog = new FogExp2(0x05070a, 0.22);
  const pmrem = new PMREMGenerator(renderer);
  // what the metal and the can reflect: the backyard around the machine at night (neon, wet ground, street lights);
  // the soft studio room if that image is missing
  if (envTex) { envTex.mapping = EquirectangularReflectionMapping; envTex.colorSpace = SRGBColorSpace; scene.environment = pmrem.fromEquirectangular(envTex).texture; scene.environmentIntensity = 0.35; }
  else { scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.1; }
  scene.add(new HemisphereLight(0x29404a, 0x050505, 0.5));
  const key = new DirectionalLight(0xd6e8ff, 0.9); key.position.set(-1.2, 2.6, 2.2); scene.add(key);
  const warm = new PointLight(0xffa860, 1.2, 5, 2); warm.position.set(1.4, 1.5, 0.9); scene.add(warm);
  const holeLight = new PointLight(0x4fd6c8, 0.25, 1.2, 2); holeLight.position.set(0, 1.05, 0.22); scene.add(holeLight);
  const chamberRed = new PointLight(0xff2a1a, 0, 0.7, 2); chamberRed.position.set(0, 1.13, -0.135); scene.add(chamberRed);
  // (in front of the press path, behind the camera: the faces it lights head-on are never seen, so no hot spot as the press comes down)
  const chamberFill = new PointLight(0xfff2e0, 0, 0.8, 2); chamberFill.position.set(0.14, 1.12, -0.18); scene.add(chamberFill);
  const heroLight = new PointLight(0xfff0d8, 0, 2.0, 2); heroLight.position.set(-0.35, 1.25, 0.95); scene.add(heroLight);
  const hatchLight = new PointLight(0x7ff0ff, 0, 0.45, 2); hatchLight.position.set(0, 0.27, 0.02); scene.add(hatchLight);   // inside the hatch
  const popLight = new PointLight(0xffe2b0, 0, 0.9, 2); scene.add(popLight);
  const buttonLight = new PointLight(0x4dff8a, 0, 0.5, 2); scene.add(buttonLight);                                           // the burst at the opening
  const fx = makeParticles(scene);
  const rnd = (a, b) => a + Math.random() * (b - a);

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
  // the stickers: cut out by their alpha, not blended (they sort and shade like the panel they're stuck on)
  machine.traverse((o) => { if (o.isMesh && /^Sticker/.test(o.name)) Object.assign(o.material, { transparent: false, alphaTest: 0.5, depthWrite: true }); });
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
    const u = { uMeter: { value: meterTex }, uLevel: { value: 0 }, uMeterColor: { value: new Color(1.0, 0.75, 0.35) }, uMeterGain: { value: 0 }, uSat: { value: flat ? 0.06 : 1 }, uDim: { value: flat ? 0.55 : 1 }, uCrush: { value: 0 }, uVein: { value: 1.2 }, uTime: { value: 0 }, uWet: { value: 0 } };
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
          // crushed: the wall buckles into creases (the press squashes it; this crumples it)
          sh.vertexShader = 'uniform float uCrush;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            { float a = atan(position.x, position.z);
              float c = sin(position.y * 170.0 + a * 3.0) * sin(a * 5.0 + position.y * 60.0) + 0.5 * sin(a * 11.0 - position.y * 240.0);
              transformed += normal * uCrush * 0.0045 * c; }`);
          sh.fragmentShader = 'uniform sampler2D uMeter; uniform float uLevel; uniform vec3 uMeterColor; uniform float uMeterGain; uniform float uSat; uniform float uDim; uniform float uVein; uniform float uTime; uniform float uWet;\n' + sh.fragmentShader
            .replace('#include <map_fragment>', `#include <map_fragment>
              { float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, uSat) * uDim; }`)
            .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
              // condensation running: in some of the label's columns a drop slides down now and then, leaving a wet,
              // glossy streak behind it that catches the light (uWet: how cold and wet the can is)
              { float hv = 1.0 - vMapUv.y, cx = vMapUv.x * 70.0, col = floor(cx);
                float r = fract(sin(col * 12.9898 + 4.1) * 43758.5453);
                float head = 1.05 - fract(uTime * (0.02 + 0.045 * fract(r * 7.3)) + r * 5.0) * 1.25;
                float x = fract(cx) - 0.5 + 0.16 * sin(hv * 37.0 + r * 30.0), above = hv - head;
                float trail = step(0.0, above) * exp(-above * 6.0) * smoothstep(0.17, 0.04, abs(x));
                float drop = exp(-pow(above * 90.0, 2.0)) * smoothstep(0.3, 0.06, abs(x));
                float d = step(0.68, r) * uWet * clamp(trail * 0.85 + drop, 0.0, 1.0);
                roughnessFactor = mix(roughnessFactor, 0.04, d);
                diffuseColor.rgb *= (1.0 - 0.18 * d) * (1.0 - 0.07 * uWet); }`)
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
              { float hv = 1.0 - vMapUv.y;
                // the veins are current: they rise with the charge (lit below uVein, brightest at the front of it) and
                // pulses run up them
                float flow = 0.5 + 0.5 * sin(hv * 46.0 - uTime * 9.0 + vMapUv.x * 37.0);
                totalEmissiveRadiance *= smoothstep(uVein + 0.04, uVein - 0.04, hv) * (0.45 + 0.75 * flow) + 2.2 * exp(-abs(hv - uVein) * 45.0) * step(hv, uVein + 0.05) * smoothstep(0.0, 0.05, uVein); }
              { float m = texture2D(uMeter, vMapUv).r; float h = 1.0 - vMapUv.y;
                float top = 0.465 + uLevel * (0.815 - 0.465);
                float lit = m * smoothstep(top + 0.006, top - 0.006, h);
                totalEmissiveRadiance += uMeterColor * lit * uMeterGain; }`);
        };
      }
    });
    if (flat) root.traverse((o) => { if (o.name === 'Opening') o.visible = false; });
    if (flat && label) { label.normalMap = null; label.needsUpdate = true; }   // old and empty: no condensation on it
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
  if (fresh.label) fresh.label.emissive = new Color(0.55, 0.92, 1.0);   // the veins: electric blue-white current
  // the foam's bursting bubbles spit a fleck of spray (the foam lives in the can's frame; the spray in the world)
  const foam = makeFoam(fresh.orient, H, { onPop: (x, y, z) => {
    if (RM) return;
    const p = fresh.orient.localToWorld(V(x, y, z));
    fx.emit(p, V(rnd(-0.05, 0.05), rnd(0.04, 0.16), rnd(-0.03, 0.05)), { t: rnd(0.15, 0.3), g: 2, k: 2, s: rnd(0.0007, 0.0014), color: 0x8a7a60, a: 0.8 });
  } });
  fresh.holder.visible = false;
  flat.u.uMeterColor.value.setRGB(1.0, 0.12, 0.08);   // a red last bar
  // ice cold: frost on the fresh can's rim (uFrost), condensation that thickens and runs (the label's droplet normals
  // and uWet), a cold breath sinking off it (coldMist); the open can shows its drink in the opening
  const frostU = { value: 0 };
  const lid = freshRoot.getObjectByName('Lid');
  if (lid && lid.material) lid.material.onBeforeCompile = (sh) => {
    sh.uniforms.uFrost = frostU;
    sh.vertexShader = 'varying vec3 vLP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vLP = position;');
    sh.fragmentShader = 'varying vec3 vLP; uniform float uFrost;\n' + sh.fragmentShader.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
      { float r = length(vLP.xz); vec2 q = floor(vLP.xz * 2400.0);
        float n = fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453);
        float fr = uFrost * clamp(smoothstep(0.0228, 0.0262, r) * (0.45 + 0.7 * n) + 0.3 * step(0.9, n), 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.95, 1.0), fr * 0.85);
        roughnessFactor = mix(roughnessFactor, 0.8, fr); metalnessFactor = mix(metalnessFactor, 0.0, fr); }`);
  };
  const opening = freshRoot.getObjectByName('Opening');
  // the drink's surface: dark amber and glossy (it is seen by what it reflects), with only a faint glow of its own
  if (opening && opening.material) Object.assign(opening.material, { color: new Color(0x2c1706), emissive: new Color(0xffa83e), emissiveIntensity: 0, roughness: 0.03, metalness: 0, envMapIntensity: 3 });
  const liquidY = opening ? opening.position.y : 0;    // its level; it runs up to the opening when the can is tipped
  let liquid = 0;                                      // how much of the drink shows in the opening (0…1)
  const wetBase = fresh.label && fresh.label.normalScale ? fresh.label.normalScale.x : 0.7;
  const setWet = (k) => { if (fresh.label && fresh.label.normalScale) fresh.label.normalScale.setScalar(wetBase * (0.25 + 1.05 * k)); fresh.u.uWet.value = k; };
  setWet(0);
  const CAN_R = 0.0335;
  let coldMist = 0, mistAcc = 0, boost = 0;
  function mistOff(dt) {
    mistAcc += dt * 18 * coldMist;
    for (; mistAcc > 1; mistAcc--) {
      const a = rnd(0, TAU), y = rnd(-H * 0.45, H * 0.32);
      const p = fresh.orient.localToWorld(V(Math.sin(a) * CAN_R * 1.08, y, Math.cos(a) * CAN_R * 1.08));
      fx.emit(p, V(Math.sin(a) * 0.01, -0.006, Math.cos(a) * 0.01), { t: rnd(1.6, 2.8), g: 0.014, k: 0.7, s: rnd(0.005, 0.009), gr: 2.2, a: 0.025, color: 0xcfe6ff });
    }
  }

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
  // the tab is black anodised aluminium, glossy: dark, with sharp highlights from the night's lights
  if (tab) Object.assign(tab.material, { envMapIntensity: 1.6, roughness: 0.22, metalness: 0.3 });

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
  canvas.addEventListener('pointerdown', (e) => { S.unlock(); askMotion(); poke(e); if (step && step.down) { canvas.setPointerCapture(e.pointerId); step.down(e); } });
  // an easter egg: poke the machine's screen four times and it objects
  let pokes = [], sulking = false;
  function poke(e) {
    if (!screen || sulking || !hits(e, screen)) return;
    const now = performance.now(); pokes = pokes.filter((t) => now - t < 2500); pokes.push(now);
    if (pokes.length < 4) { S.tick(0); return; }
    pokes = []; sulking = true;
    const was = { ...scrState };
    S.reject(); shakeAmt = Math.max(shakeAmt, 0.004);
    say('AU!', ['IKKE TRYKK PÅ SKJERMEN', 'JEG ER EN PANTEMASKIN, IKKE EN IPAD', 'FINGRENE AV GLASSET'][Math.floor(Math.random() * 3)], '#ff4b3e');
    setTimeout(() => { scrState = was; sulking = false; }, 1800);
  }
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
    const O = window.DeviceOrientationEvent;
    if (O && typeof O.requestPermission === 'function') O.requestPermission().catch(() => {});
  }
  // tilt: on a phone, how it is held (relative to how it was held at first, drifting along slowly); on a computer, the
  // pointer. In the hero shots the can turns a little with it and its light slides across, so the reflections move.
  const tiltGoal = new Vector2(), tilt = new Vector2(); let tiltBase = null, hasTilt = false, tiltOn = false;
  addEventListener('deviceorientation', (e) => {
    if (e.beta == null || e.gamma == null) return;
    if (!tiltBase) tiltBase = { b: e.beta, g: e.gamma };
    tiltBase.b += (e.beta - tiltBase.b) * 0.004; tiltBase.g += (e.gamma - tiltBase.g) * 0.004;
    tiltGoal.set(clamp((e.gamma - tiltBase.g) / 22, -1, 1), clamp((e.beta - tiltBase.b) / 22, -1, 1));
    hasTilt = true;
  });
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
    fresh.u.uTime.value = t;
    if (coldMist > 0 && fresh.holder.visible && !RM) mistOff(dt);
    if (opening) opening.material.emissiveIntensity = liquid * (0.07 + 0.03 * Math.sin(t * 9) + 0.02 * Math.sin(t * 23 + 1));
    foam.update(dt, camera, innerHeight * renderer.getPixelRatio());
    fresh.u.uMeterGain.value = meterGlow;
    // neon: the ring breathes; the tubes flicker now and then
    if (ring) ring.material.emissiveIntensity = ringBase * (ringPulse ? 0.7 + 0.6 * (0.5 + 0.5 * Math.sin(t * 4)) : 1);
    tubes.forEach((tb, i) => { tb.material.emissiveIntensity = (Math.sin(t * 0.7 + i * 2) > 0.985 && Math.random() > 0.5) ? 0.3 : 3; });
    // tilt (see above)
    tilt.lerp(hasTilt ? tiltGoal : V(pointerPar.x * 2, pointerPar.y * 2, 0), Math.min(1, dt * 4));
    const tk = tiltOn && !RM ? 1 : 0;
    fresh.root.rotation.y += (tilt.x * 0.42 * tk - fresh.root.rotation.y) * Math.min(1, dt * 6);
    fresh.root.rotation.x += (tilt.y * 0.05 * tk - fresh.root.rotation.x) * Math.min(1, dt * 6);
    if (tk) heroLight.position.set(-0.35 + tilt.x * 0.55, 1.25 - tilt.y * 0.25, 0.95);
    // the camera: rig + parallax + shake
    par.lerp(pointerPar, Math.min(1, dt * 3));
    camera.position.copy(cam.pos);
    // the parallax fades out in close quarters (in the scan chamber it would push the camera behind the press plate)
    const parK = clamp((cam.pos.distanceTo(cam.tgt) - 0.4) / 0.5);
    camera.position.x += par.x * 0.05 * parK; camera.position.y -= par.y * 0.03 * parK;
    if (shakeAmt > 0) { camera.position.x += (Math.random() - 0.5) * shakeAmt; camera.position.y += (Math.random() - 0.5) * shakeAmt; shakeAmt = Math.max(0, shakeAmt - dt * 0.06); }
    camera.fov = cam.fov - push;
    camera.updateProjectionMatrix();
    camera.lookAt(cam.tgt);
    if ((scrT += dt) > 0.06) { scrT = 0; drawScreen(t); }
    if (frameHook) frameHook(dt, t);
    if (fxHook) fxHook(dt, t);
    if (!RM) fx.update(dt, camera, innerHeight * renderer.getPixelRatio());
    renderer.render(scene, camera);
    bloom.render(scene, camera, 0.35 + 0.45 * clamp(energy / 2));
  });
  let frameHook = null, fxHook = null, ringPulse = false, dragging = false;

  // ---------- poses ----------
  const qUp = new Quaternion().setFromEuler(new Euler(0.12, 0.35, -0.22));          // held out, a little tipped
  const qLie = new Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2);         // lying, top into the machine
  const rollQ = (th) => new Quaternion().setFromAxisAngle(V(0, 0, 1), th).multiply(qLie);
  // the barcode sits 95° right of the front on the label (u ≈ 0.765, tools/blender/build_can.py); at θ = BAR it faces up
  // under the scanner's lasers, turned a little toward the camera so it reads; at θ = BAR − π it faces down
  const BAR = 125 * Math.PI / 180;
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
    const th0 = TAU + Math.PI, th1 = 3 * TAU + BAR - Math.PI;     // ends with the barcode facing down
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
      const th = th1 + Math.sin(k * Math.PI * 6) * 0.09 * (1 - k);
      flat.orient.quaternion.copy(rollQ(th));
      chamberRed.intensity = 0.35 + 1.1 * (1 - k) * (Math.sin(k * Math.PI * 4) > 0 ? 1 : 0.3);
      push = -2.5 * (1 - k);
    }, (t) => t);
    push = 0; chamberRed.intensity = 0.35;
    receiptData.tries = 2;
    return wrap(th1);
  }

  // 3 · ROLL — the can's surface follows your finger one to one: the drag is turned into rotation using where the
  // can's near side actually moves on screen. The scanner answers as the barcode comes round: the lasers warm from red
  // to amber, the beeps quicken, and when it faces the scanner it locks (a magnet snap, a click, a green flash).
  // Left alone, the can rocks a little on its rollers to show that it can be rolled.
  function stepRoll(th0) {
    let th = th0, vel = 0, dragging2 = false, last = null, lastT = 0, accepted = false, idleT = 0, touched = false;
    const ACCEPT = 0.24;
    // an easter egg: roll it round and round without finding the barcode, and the machine gets cheeky
    // (counted in tries — each drag, fling or key press that ends without a lock — and in whole turns)
    let spun = 0, tries = 0, sass = 0;
    const SASS = [
      [3, 2, 'PRØV Å SNU DEN, DA', 'STREKKODEN ER VED «500 ML»', 'Psst: strekkoden står ved siden av «ENERGIDRIKK 500 ml»'],
      [6, 4, 'JEG BLIR SVIMMEL', 'RULL SAKTERE', 'Saktere … den låser seg når strekkoden er under laseren'],
      [9, 7, 'DETTE ER EN PANTEMASKIN', 'IKKE EN KARUSELL', 'Eller trykk på knappen, så ruller maskinen den selv'],
    ];
    const sassy = () => {
      if (accepted || sass >= SASS.length || (tries < SASS[sass][0] && spun < SASS[sass][1])) return;
      const [, , a, b, h] = SASS[sass++]; say(a, b, '#ffd27a'); if (ui.hint) ui.hint(h); S.reject();
    };
    const tried = () => setTimeout(() => { if (!accepted) { tries++; sassy(); } }, 900);
    const setTh = (val) => {
      if (touched && !accepted) { spun += Math.abs(val - th) / TAU; sassy(); }
      th = val; flat.orient.quaternion.copy(rollQ(th)); rollers.forEach((r) => r.rotation.y = -th * 1.8);
    };
    const off = () => Math.abs(wrap(th - BAR));                        // 0 = barcode facing the scanner
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
      const from = th, to = th + wrap(BAR - th);
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
        if (idleT > 2.2) { const k = (idleT - 2.2) / 0.9; setTh(th0 + Math.sin(Math.min(1, k) * Math.PI * 2) * 0.22 * Math.sin(Math.min(1, k) * Math.PI)); if (k >= 1) idleT = 0; }
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
        self = this; tried();
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
        tween(0.18, (q) => setTh(from + (to - from) * q), easeOut).then(() => { if (off() < ACCEPT + 0.12) lockIn(); else if (Math.random() < 0.34) tried(); });
      },
      act() { self = this; touched = true; const from = th, to = th + wrap(BAR - th); tween(0.8, (q) => setTh(from + (to - from) * q)).then(lockIn); },
    });
  }

  // 4 · KNAS — the press comes down fast to the can and stops dead on it (a beat of hit-stop), then crushes it in slow
  // motion: the can's top follows the press exactly, the wall crumples into creases, the camera punches in. Then the
  // rollers part and the flat can drops between them into the bin, tumbling.
  async function crushIt() {
    fxHook = null;
    S.accept();
    say('GODKJENT', '1 × BATTERI (FLATT)', '#4dff8a');
    lasers.forEach((l) => l.material.emissive && l.material.emissive.setRGB(0.1, 1, 0.3));
    chamberRed.color.setRGB(0.2, 1, 0.3); chamberRed.intensity = 1.4;
    await tween(0.5, (k) => { chamberRed.intensity = MathUtils.lerp(1.4, 0.5, k); }, easeOut);
    await wait(0.2);
    lasers.forEach((l) => { l.visible = false; });
    chamberRed.color.setRGB(1, 0.16, 0.1); chamberRed.intensity = 0.4;
    const py = press ? press.position.y : 0;
    const bottom0 = press ? press.position.y - 0.0175 : 1.19;      // the press plate's underside
    const anchor = 0.993, R = 0.0331;                              // the rollers' top; the can's radius
    const top0 = P_CHAMBER.y + R, flatTop = anchor + 0.016;
    flat.crush.position.y = anchor - P_CHAMBER.y; flat.orient.position.y = P_CHAMBER.y - anchor;   // squash toward the rollers
    // down to the can, accelerating
    await tween(RM ? 0.01 : 0.22, (k) => { if (press) press.position.y = py - (bottom0 - top0) * k; }, easeIn);
    S.crush(); flashIt(false); shakeAmt = 0.02; push = 4;
    await wait(0.07);                                              // hit-stop: it holds, for a beat, on contact
    // through the can, slowly: the can's top is wherever the plate is
    await tween(RM ? 0.01 : 0.85, (k) => {
      const plate = top0 - (top0 - flatTop) * k;
      if (press) press.position.y = py - (bottom0 - plate);
      const sy = (plate - anchor) / (2 * R);
      flat.crush.scale.set(1 + 0.32 * (1 - sy), sy, 1 + 0.04 * (1 - sy));
      flat.crush.rotation.z = Math.sin(k * 11) * 0.035 * k;
      flat.u.uCrush.value = k;
      push = 4 * (1 - k);
    }, easeOut);
    push = 0;
    const c = bump();
    receiptData.count = c.total;
    say('KNAS!', `BATTERIER BYTTET I DAG: ${c.today - 1}`, '#ffd27a');
    setTimeout(() => { say('KNAS!', `BATTERIER BYTTET I DAG: ${c.today}`, '#ffd27a'); S.tick(2); }, RM ? 0 : 420);   // the counter ticks
    await tween(RM ? 0.01 : 0.35, (k) => { if (press) press.position.y = py - (bottom0 - flatTop) * (1 - k); }, easeInOut);
    // the rollers part, and it falls between them, tumbling
    const rx = rollers.map((r) => r.position.x);
    await tween(RM ? 0.01 : 0.18, (k) => rollers.forEach((r, n) => { r.position.x = rx[n] + Math.sign(rx[n]) * 0.03 * k; }), easeOut);
    const fy = flat.holder.position.y;
    S.drop();
    await tween(RM ? 0.01 : 0.42, (k) => { flat.holder.position.y = fy - 0.3 * k; flat.holder.rotation.x = k * 1.4; flat.holder.rotation.z = k * 0.6; }, easeIn);
    flat.holder.visible = false;
    tween(0.25, (k) => rollers.forEach((r, n) => { r.position.x = rx[n] + Math.sign(rx[n]) * 0.03 * (1 - k); }));
  }

  // out of the machine the way we came in: one curve, the tunnel rush, the light changing back on the way
  async function backOut() {
    const lights = tween(RM ? 0.01 : 1.4, (k) => {
      const e = smooth(0.15, 0.65, k);
      chamberFill.intensity = 0.12 * (1 - e); chamberRed.intensity = 0.4 * (1 - e);
      scene.environmentIntensity = MathUtils.lerp(0.04, 0.1, e); scene.fog.density = MathUtils.lerp(0.6, 0.22, e);
    }, (t) => t);
    await fly(ST.button, RM ? 0.01 : 1.5, [{ pos: V(0, 1.055, 0.02), tgt: V(0, 1.05, 0.4) }, { pos: V(0.05, 1.07, 0.5), tgt: V(0.1, 1.0, 0) }], { fovPeak: 14, blur: 2.2 });
    await lights;
    say('TRYKK PANT', 'FOR LAPP OG NYTT BATTERI', '#4dff8a', { blink: true });
  }

  // 5 · PANT — a real button: it goes in under your finger and stays in while you hold it, flashes, and springs back
  // when you let go. The machine answers on the press.
  function stepPress() {
    let pulse = true, pressed = false, self, nextRipple = 0;
    const z0 = button.position.z, bump = 0.016;
    const bp = button.getWorldPosition(new Vector3());
    buttonLight.position.copy(bp).add(V(0, 0, 0.14));
    // waiting: it breathes, and a soft ring ripples out from it now and then (press me)
    frameHook = (dt, t) => {
      if (!pulse || !button) return;
      button.material.emissiveIntensity = 1.4 * (0.6 + 0.8 * (0.5 + 0.5 * Math.sin(t * 5)));
      if (!RM && t > nextRipple) { nextRipple = t + 1.3; fx.ring(bp.clone().add(V(0, 0, 0.01)), { r0: 0.032, r1: 0.075, t: 0.9, color: 0x4dff8a, a: 0.35 }); }
    };
    const near = (e) => { const b = toScreen(button.getWorldPosition(new Vector3())); return b.distanceTo(new Vector2(e.clientX, e.clientY)) < Math.max(90, innerWidth * 0.18) || hits(e, button); };
    // in: it goes deep under your finger and bulges as it bottoms out; a green flash, a ring, sparks, the picture jolts
    const pushIn = () => {
      pulse = false; frameHook = null; pressed = true;
      S.click(); S.buzz(25);
      button.material.emissiveIntensity = 2.0;
      tween(RM ? 0.01 : 0.08, (k) => { button.position.z = z0 - bump * k; button.scale.set(1 + 0.07 * k, 1 + 0.07 * k, 1); }, easeOut);
      shakeAmt = Math.max(shakeAmt, 0.006);
      tween(RM ? 0.01 : 0.45, (k) => { push = 2.5 * (1 - k) * (1 - k); buttonLight.intensity = 0.05 * (1 - k); }, (t) => t);
      if (!RM) {
        fx.ring(bp.clone().add(V(0, 0, 0.012)), { r0: 0.035, r1: 0.1, t: 0.45, color: 0x6dffa0, a: 0.55 });
        for (let i = 0; i < 36; i++) {
          const a = rnd(0, TAU), sp = rnd(0.25, 0.8);
          fx.emit(bp.clone().add(V(Math.cos(a) * 0.032, Math.sin(a) * 0.032, 0.01)), V(Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.1, 0.4)), { t: rnd(0.25, 0.5), g: 1.5, k: 3, s: rnd(0.003, 0.006), color: 0x6dffa0 });
        }
      }
    };
    // out: it springs back past its rest and settles
    const letGo = () => {
      tween(RM ? 0.01 : 0.35, (k) => {
        const o = 1 - Math.exp(-6 * k) * Math.cos(k * 14);           // a spring: overshoots, rings out
        button.position.z = z0 - bump * (1 - o);
        button.scale.set(1 + 0.07 * (1 - o), 1 + 0.07 * (1 - o), 1);
        button.material.emissiveIntensity = MathUtils.lerp(2.0, 1.2, k);
      }, (t) => t);
    };
    return begin('press', {
      // the step is over at the press; the button's own release waits for your finger to lift
      down(e) { if (button && !pressed && near(e)) { self = this; pushIn(); addEventListener('pointerup', letGo, { once: true }); self.done(); } },
      act() { self = this; pushIn(); setTimeout(letGo, 160); self.done(); },
      key() {},
    });
  }

  // the receipt slides out of the slot (cut off at the slot, so it is the paper that moves, not the print that
  // squashes), in the stutters of a thermal printer, and sways as it hangs. Then the fresh can comes down the chute,
  // clatters, and wedges itself in the hatch; the machine jolts and chokes.
  async function printAndJam() {
    say('SKRIVER UT …', '', '#4fd6c8');
    receiptData.time = new Date();
    drawReceipt(rc, receiptData); rTex.needsUpdate = true;
    const slotY = receipt.position.y, L = 0.16;
    receipt.scale.y = 1; receipt.visible = true;
    receipt.material.clippingPlanes = [new Plane(V(0, -1, 0), slotY)];   // only what is below the slot shows
    receipt.position.y = slotY + L;
    S.printer(1.6);
    await tween(RM ? 0.01 : 1.6, (k) => { receipt.position.y = slotY + L * (1 - Math.floor(k * 16) / 16); }, (t) => t);
    receipt.position.y = slotY;
    receipt.material.clippingPlanes = null;
    let sway = 0;
    fxHook = (dt, t) => { sway += dt; receipt.rotation.x = Math.sin(sway * 3.2) * 0.12 * Math.exp(-sway * 0.8) + Math.sin(t * 0.9) * 0.015; };
    say('GOD TUR!', 'UTLEVERER BATTERI …', '#4fd6c8');
    await wait(0.5);
    // the fresh can comes down the chute and wedges itself, at an angle, behind the flap
    fresh.holder.visible = true;
    const stuckP = V(0.04, 0.33, -0.1), stuckE = new Euler(0.15, 0.3, 1.15);
    fresh.orient.quaternion.setFromEuler(new Euler(0.1, 0.3, 1.5));
    S.rumble.start();
    say('FEIL 0xBATT', 'BATTERIET SITTER FAST', '#ff4b3e', { blink: true });
    const flying = fly(ST.hatch, RM ? 0.01 : 1.3, [{ pos: V(0.2, 0.85, 1.0), tgt: V(0.05, 0.5, 0) }]);
    await tween(RM ? 0.01 : 0.5, (k) => {
      fresh.holder.position.set(stuckP.x, stuckP.y + 0.18 * (1 - k) - Math.sin(k * Math.PI * 2) * 0.012 * k, stuckP.z);
      fresh.orient.quaternion.slerpQuaternions(new Quaternion().setFromEuler(new Euler(0.1, 0.3, 1.5)), new Quaternion().setFromEuler(stuckE), easeOut(k));
    }, easeIn);
    S.clank(1);
    // the machine chokes: a few hard jolts, not a smooth wobble
    let jt = 0, next = 0;
    frameHook = (dt) => {
      jt += dt;
      if (jt > next) { next = jt + 0.25 + Math.random() * 0.3; shakeRig.userData.v = (Math.random() - 0.5) * 0.25; S.clank(0.5); }
      const v = shakeRig.userData.v || 0;
      shakeRig.userData.v = v - (shakeRig.position.x * 900 + v * 18) * dt;
      shakeRig.position.x += shakeRig.userData.v * dt;
    };
    await flying;
    frameHook = null; shakeRig.position.set(0, 0, 0); shakeRig.userData.v = 0;
    S.rumble.stop(0.2);
    say('RIST MASKINEN!', '', '#ffd27a', { bar: 0 });
  }

  // 6 · SHAKE — the machine is heavy and springy: each shake shoves it the way you shook it, and it rocks back. The
  // can inside lags behind the machine (secondary motion), and works itself loose bit by bit — it slips, tilts further,
  // sinks — until it lets go.
  function stepShake() {
    let loose = 0, lastX = null, lastDir = 0, self;
    const NEED = 6;
    const x = V(0, 0, 0), v = V(0, 0, 0), zero = V(0, 0, 0);
    let lagV = 0, lag = 0;
    const base = fresh.holder.position.clone();
    const impulse = (dir = (Math.random() < 0.5 ? -1 : 1), k = 1) => {
      if (loose >= NEED) return;
      loose += k;
      v.x += dir * 0.22 * k;
      S.rattle(0.8 + 0.4 * Math.random());
      if (Math.random() < 0.5) S.clank(0.6);
      scrState.bar = loose / NEED;
      shakeAmt = Math.max(shakeAmt, 0.004);
      if (loose >= NEED) { onMotion = null; setTimeout(() => { frameHook = null; shakeRig.position.set(0, 0, 0); shakeRig.rotation.z = 0; self.done(); }, 120); }
    };
    onMotion = () => { if (step && step.name === 'shake') { self = step; impulse(); } };
    frameHook = (dt) => {
      spring(x, v, zero, 260, 6, dt);                               // heavy, springy, settles slowly
      shakeRig.position.x = x.x;
      shakeRig.rotation.z = -x.x * 0.6;
      // the can lags behind the machine, and comes loose as the shakes add up
      lagV += ((x.x - lag) * 180 - lagV * 10) * dt; lag += lagV * dt;
      const f = loose / NEED;
      fresh.orient.rotation.z = 1.15 + 0.3 * f + (lag - x.x) * -9;
      fresh.holder.position.set(base.x + (lag - x.x) * 0.5, base.y - 0.04 * f * f, base.z);
    };
    return begin('shake', {
      down(e) { self = this; lastX = e.clientX; lastDir = 0; },
      move(e) {
        self = this;
        if (lastX == null) return;
        const dx = e.clientX - lastX;
        if (Math.abs(dx) > 18) { const dir = Math.sign(dx); if (dir !== lastDir) { impulse(dir, 1); lastDir = dir; } lastX = e.clientX; }
      },
      up() { lastX = null; },
      key(k) { if (k === 'shake') { self = this; impulse(); } },
      act() { self = this; (async () => { for (let i = 0; i < NEED; i++) { impulse(i % 2 ? 1 : -1, 1); await wait(0.24); } })(); },
    });
  }

  // it lets go: it drops into the hatch (the hatch light flickers on, sparks kick up from the tray), bounces twice,
  // then charges where it lies — sparks crackle, it trembles and the light pulses — and goes: a shockwave, the flap is flung
  // open and claps shut behind it on its spring, and it arcs up to float in front of you trailing sparks, turning once
  // and landing in the ring with a pulse.
  async function dropOut() {
    say('TA BATTERIET', '', '#4dff8a');
    const p0 = fresh.holder.position.clone(), q0 = fresh.orient.quaternion.clone();
    const floorP = V(0.0, 0.185, -0.08);
    const qLand = new Quaternion().setFromEuler(new Euler(0, 0.2, Math.PI / 2));
    frostU.value = 1; setWet(0.08);                               // straight out of the cold: frosted rim, still dry
    await tween(RM ? 0.01 : 0.3, (k) => { fresh.holder.position.lerpVectors(p0, floorP, k); fresh.orient.quaternion.slerpQuaternions(q0, qLand, k); }, easeIn);
    S.thud(); shakeAmt = 0.012; flashIt(false);
    const spark = (p, v, o = {}) => { if (!RM) fx.emit(p, v, { t: rnd(0.25, 0.5), g: 2.5, k: 2.5, s: rnd(0.004, 0.008), color: 0xbff8ff, ...o }); };
    for (let i = 0; i < 28; i++) spark(V(floorP.x + rnd(-0.08, 0.08), floorP.y - 0.025, floorP.z + rnd(-0.03, 0.03)), V(rnd(-0.6, 0.6), rnd(0.2, 1.0), rnd(-0.1, 0.5)));
    for (let i = 0; i < 10; i++) if (!RM) fx.emit(V(floorP.x + rnd(-0.07, 0.07), floorP.y - 0.02, floorP.z), V(rnd(-0.1, 0.1), rnd(0.02, 0.08), rnd(0, 0.06)), { t: rnd(0.6, 1.0), k: 2, s: rnd(0.015, 0.025), gr: 1.5, color: 0x6a8a90, a: 0.08 });
    // the hatch light comes on with a stutter
    tween(RM ? 0.01 : 0.45, (k) => { hatchLight.intensity = 0.16 * (k < 0.6 ? (Math.random() > 0.45 ? 1 : 0.1) : 1); }, (t) => t);
    for (const [hgt, dur] of [[0.03, 0.22], [0.01, 0.14]]) {      // two bounces
      await tween(RM ? 0.01 : dur, (k) => { fresh.holder.position.y = floorP.y + hgt * Math.sin(Math.PI * k); }, (t) => t);
      S.clank(0.5);
    }
    await wait(0.15);
    // it charges where it lies
    const pc = fresh.holder.position.clone();
    S.rattle(0.5);
    await tween(RM ? 0.01 : 0.75, (k) => {
      hatchLight.intensity = 0.16 + 0.34 * k * (0.55 + 0.45 * Math.random());
      fresh.holder.position.set(pc.x + rnd(-1, 1) * 0.0025 * k, pc.y + rnd(0, 1) * 0.004 * k, pc.z);
      if (Math.random() < 0.35 + 0.65 * k) { const a = rnd(0, TAU); spark(V(pc.x + rnd(-0.08, 0.08), pc.y + Math.sin(a) * 0.035, pc.z + Math.cos(a) * 0.035), V(rnd(-0.3, 0.3), rnd(0.1, 0.7), rnd(-0.2, 0.4)), { g: 0.8, color: Math.random() < 0.3 ? 0xffd27a : 0x9ff6ff }); }
    }, (t) => t);
    fresh.holder.position.copy(pc);
    // and goes
    S.whoosh(); shakeAmt = 0.014; flashIt(false);
    if (!RM) { fx.ring(pc, { r0: 0.03, r1: 0.4, t: 0.5, color: 0x9ff6ff, a: 0.85 }); for (let i = 0; i < 30; i++) spark(pc.clone(), V(rnd(-1.2, 1.2), rnd(-0.2, 1.2), rnd(-0.2, 0.9)), { t: rnd(0.25, 0.5) }); }
    const p1 = fresh.holder.position.clone(), q1 = fresh.orient.quaternion.clone();
    heroLight.intensity = 0.6; coldMist = 0.6;
    const flying = fly(ST.hero, RM ? 0.01 : 1.4);
    let flapFree = false;
    const tail = V(0, 0, 0);
    await tween(RM ? 0.01 : 1.3, (k) => {
      const e = easeInOut(k);
      fresh.holder.position.lerpVectors(p1, P_HERO, e);
      fresh.holder.position.z += Math.sin(k * Math.PI) * 0.15;
      fresh.orient.quaternion.slerpQuaternions(q1, new Quaternion(), e);
      fresh.orient.rotateY(e * TAU);
      hatchLight.intensity = 0.5 * (1 - smooth(0, 0.5, k));
      // the flap is flung open as it passes, then let go on its spring: it claps shut and rattles in its frame
      if (flap && !flapFree) {
        flap.rotation.x = -1.6 * smooth(0, 0.06, k);
        if (k > 0.22) {
          flapFree = true;
          const fv = V(0, 0, 0), fx_ = V(flap.rotation.x, 0, 0); let claps = 0, prev = fx_.x;
          fxHook = (dt) => {
            spring(fx_, fv, V(0, 0, 0), 140, 3.5, dt);
            if (fx_.x > 0) { fx_.x = 0; fv.x = -Math.abs(fv.x) * 0.35; }                 // the frame stops it: it bounces back
            if (prev < -0.005 && fx_.x >= 0 && claps < 3) { S.clank(0.45 / (claps + 1)); claps++; }
            prev = fx_.x; flap.rotation.x = fx_.x;
          };
        }
      }
      // a trail of sparks behind it
      if (k < 0.85) for (let i = 0; i < 3; i++) {
        tail.copy(fresh.holder.position).add(V(rnd(-0.04, 0.04), rnd(-0.07, 0.07), rnd(-0.03, 0.03)));
        spark(tail.clone(), V(rnd(-0.15, 0.15), rnd(-0.1, 0.25), rnd(-0.15, 0.1)), { t: rnd(0.35, 0.7), g: -0.2, k: 2, color: Math.random() < 0.35 ? 0xffd27a : 0x9ff6ff });
      }
    });
    fresh.orient.quaternion.identity();
    // it lands in the ring: a pulse of light
    if (!RM) fx.ring(P_HERO.clone().add(V(0, 0, -0.02)), { r0: 0.06, r1: 0.15, t: 0.55, color: 0x9ff6ff, a: 0.45 });
    tween(RM ? 0.01 : 0.6, (k) => { heroLight.intensity = 0.6 + 0.9 * (1 - k); hatchLight.intensity = 0; }, (t) => t);
    await tween(RM ? 0.01 : 0.5, (k) => { fresh.orient.rotation.z = Math.sin(k * Math.PI * 3) * 0.06 * (1 - k); }, (t) => t);   // settle
    await flying;
    // in the warm air it starts to sweat: the dew thickens while you look at it, and the first drops run
    tween(RM ? 0.01 : 3.5, (k) => { setWet(0.08 + 0.52 * k); }, (t) => t);
    say('LAD OPP', 'HOLD PÅ BATTERIET', '#ffd27a', { bar: 0 });
    tiltOn = true;
  }

  // 7 · HOLD — charging. The logo's «+ ‖» fills from the bottom like a battery gauge; each part of it (the two bars,
  // the stem and the arms of the plus) lands with a tick and a pulse. The can hums rather than jitters (a smooth
  // tremble that grows), the ring behind it lights up, the camera leans in and slowly round. Let go and it powers down
  // audibly and drains a little; full, it hops, flashes and its tab glints.
  function stepHold() {
    let level = 0, holding = false, auto = false, armed = false, was = false, seg = 0, pulse = 0, orbit = 0;
    const base = fresh.holder.position.clone();
    const SEGS = [0.22, 0.42, 0.68, 0.92];                         // bars, bar, stem, arms (gauge height bands)
    const camBase = ST.hero.pos.clone();
    S.charge.start();
    let self;
    frameHook = (dt, t) => {
      if (armed) return;
      const on = holding || auto;
      if (was && !on && level > 0.05 && level < 1) S.powerDown();
      was = on;
      level = clamp(level + (on ? dt / 2.4 * (0.8 + 0.5 * level) : -dt / 7));
      while (seg < SEGS.length && level >= SEGS[seg]) { S.tick(seg); pulse = 1; seg++; }
      if (seg > 0 && level < SEGS[seg - 1] - 0.03) seg--;
      pulse = Math.max(0, pulse - dt * 4);
      fresh.u.uLevel.value = level;
      meterGlow = 0.5 + 1.8 * level + 1.5 * pulse;
      energy = 0.45 + 1.5 * level + 0.6 * pulse;
      fresh.u.uVein.value = level * 1.08;
      if (level > 0.01) { setWet(0.6 + 0.4 * level); coldMist = 0.6 + 0.6 * level; }
      S.chargeLevel(level);
      scrState.bar = level; scrState.sub = `${Math.round(level * 100)} %`;
      if (ring) ring.material.emissiveIntensity = ringBase * (1 + 2.5 * level + 1.5 * pulse);
      // a hum, not a jitter: two fast sines whose amplitude grows with the charge
      const a = on ? 0.0008 + 0.0035 * level * level : 0;
      fresh.holder.position.set(base.x + Math.sin(t * 61) * a, base.y + Math.sin(t * 1.6) * 0.006 + Math.sin(t * 47 + 1) * a, base.z);
      fresh.crush.scale.setScalar(1 + 0.03 * pulse);
      push = 6 * easeInOut(level);
      orbit += ((on ? 0.18 * level : 0) - orbit) * Math.min(1, dt * 2);   // the camera leans in and slowly round
      cam.pos.set(P_HERO.x + Math.sin(orbit) * (camBase.z - P_HERO.z), camBase.y, P_HERO.z + Math.cos(orbit) * (camBase.z - P_HERO.z));
      if (level >= 1) {
        armed = true; holding = auto = false;
        S.charge.stop(); S.full(); flashIt(false);
        say('100 %', 'DRA FLIKEN OPP', '#4dff8a', { blink: true });
        energy = 0.9; meterGlow = 2.3; fresh.u.uVein.value = 1.2;
        tween(RM ? 0.01 : 0.45, (k) => { fresh.holder.position.y = base.y + Math.sin(Math.PI * k) * 0.03; }, easeOut);   // a hop
        frameHook = (d, tt) => { if (tab) tab.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(tt * 6); fresh.holder.position.y = base.y + Math.sin(tt * 1.6) * 0.006; };
        self.done();
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

  // 8 · FLICK — the tab answers the finger before it gives: it lifts against a stiff spring as you swipe up and the can
  // leans back; let go short and it snaps back down with a tick. Past the line it goes.
  function stepFlick() {
    let y0 = null, tStart = 0, lift = 0, lv = 0, goal = 0;
    const rest = fresh.orient.rotation.x, baseY = fresh.holder.position.y;
    const keep = frameHook;
    frameHook = (dt, t) => {
      if (keep) keep(dt, t);
      const x = V(lift, 0, 0), v = V(lv, 0, 0);
      spring(x, v, V(goal, 0, 0), 400, 18, dt); lift = x.x; lv = v.x;
      setOpen(Math.max(0, lift) * 0.3);
      fresh.orient.rotation.x = rest - 0.2 * Math.max(0, lift);
      fresh.holder.position.y = baseY - 0.012 * Math.max(0, lift);   // it ducks under the pull
    };
    const finish = (self) => { y0 = null; frameHook = keep; self.done(lift); };
    return begin('flick', {
      down(e) { y0 = e.clientY; tStart = performance.now(); },
      move(e) {
        if (y0 == null) return;
        const d = y0 - e.clientY;
        goal = clamp(d / 90) * (1 - 0.35 * clamp(d / 90));          // resistance: it gets stiffer towards the line
        if (d > 70 && performance.now() - tStart < 900) finish(this);
      },
      up(e) {
        if (y0 != null && Math.abs(goal) < 0.05 && hits(e, fresh.holder)) { finish(this); return; }
        if (goal > 0.05) S.click();
        y0 = null; goal = 0;
      },
      key(k) { if (k === 'up') finish(this); },
      act() { finish(this); },
    });
  }

  // 9 · DRINK — the open can, fizzing, asks for it: it leans toward you now and then. Tip the phone toward you (or
  // drag down, or the arrow keys) and it follows a little, then you take it.
  function stepDrink(base, rest) {
    say('SKÅL!', 'TA EN SLURK', '#ffd27a', { blink: true });
    let y0 = null, goal = 0, lean = 0, sure = 0;
    const t0 = performance.now();
    return new Promise((resolve) => {
      const go = (self) => { fxHook = null; self.done(); };
      begin('drink', {
        down(e) { y0 = e.clientY; },
        move(e) { if (y0 == null) return; const d = e.clientY - y0; goal = clamp(d / 140); if (d > 70) { y0 = null; go(this); } },
        up(e) { if (y0 != null && Math.abs(goal) < 0.05 && hits(e, fresh.holder)) { y0 = null; go(this); return; } y0 = null; goal = 0; },
        key(k) { if (k === 'down' || k === 'up') go(this); },
        act() { go(this); },
      }).then(resolve);
      const me = step;
      fxHook = (dt) => {
        if (hasTilt) { const tv = Math.abs(tiltGoal.y); goal = Math.max(goal * 0.9, clamp((tv - 0.3) / 0.6)); sure = tv > 0.8 ? sure + dt : 0; if (sure > 0.15 && step === me) go(me); }
        const s = (performance.now() - t0) / 1000, beckon = RM ? 0 : 0.06 * Math.max(0, Math.sin(s * 2.2)) ** 3;
        lean += (goal * 0.35 + beckon - lean) * Math.min(1, dt * 8);
        fresh.orient.rotation.x = rest + lean;
        fresh.holder.position.set(base.x, base.y + 0.02 * lean, base.z + 0.04 * lean);
      };
    });
  }
  // the sip: the can comes up to you and tips, the camera goes in close on the opening, the drink glints in it and
  // the fizz swells; a swallow (the camera dips), then «aah»: it goes back down, the veins flare once more, a cold
  // breath, and the screen reports the battery
  async function drinkIt(base, rest) {
    S.drink();
    const r0 = fresh.orient.rotation.x, h0 = fresh.holder.position.clone();
    const c0 = { pos: cam.pos.clone(), tgt: cam.tgt.clone(), fov: cam.fov };
    const lifted = base.clone().lerp(c0.pos, 0.3).add(V(0, -0.03, 0));
    const camIn = { pos: c0.pos.clone().lerp(lifted, 0.12), tgt: lifted.clone().add(V(0, 0.025, 0)), fov: c0.fov - 2 };
    // as it comes up: the foam's gone (sipped, or burst), the lid wet round the opening, and the drink runs forward to
    // fill the opening (the can's tipped toward you: the opening is its lowest point)
    foam.drain(); foam.wet();
    const up = tween(RM ? 0.01 : 0.7, (k) => {
      fresh.holder.position.lerpVectors(h0, lifted, k);
      fresh.orient.rotation.x = MathUtils.lerp(r0, rest + 1.0, k);
      liquid = 0.35 + 0.65 * k;
      if (opening) opening.position.y = liquidY + 0.0058 * smooth(0.25, 1, k);
    });
    await fly(camIn, RM ? 0.01 : 0.7);
    await up;
    // drinking: it rocks a little as you sip; at the swallow the camera dips with it
    const t1 = performance.now();
    fxHook = () => {
      const s = (performance.now() - t1) / 1000;
      fresh.orient.rotation.x = rest + 1.0 + 0.05 * Math.sin(s * 9) * Math.exp(-s * 1.5);
      const sw = Math.exp(-Math.pow((s - (S.DRINK.swallow - 0.7)) / 0.12, 2));
      cam.pos.y = camIn.pos.y - 0.012 * sw;
    };
    await wait(Math.max(0, S.DRINK.ah - 0.7 - 0.05));
    fxHook = null;
    // «aah»
    S.tick(3);
    boost = 2.2; flashIt(false);
    say('AAAH.', 'BATTERI: 100 %', '#4dff8a');
    if (!RM) {
      // the breath after it: a puff of cold air drifting away from the camera
      const fwd = cam.tgt.clone().sub(cam.pos).normalize();
      for (let i = 0; i < 26; i++) fx.emit(cam.pos.clone().add(fwd.clone().multiplyScalar(0.12)).add(V(rnd(-0.02, 0.02), -0.05 + rnd(-0.01, 0.01), 0)), fwd.clone().multiplyScalar(rnd(0.08, 0.2)).add(V(rnd(-0.03, 0.03), rnd(0, 0.03), 0)), { t: rnd(1.2, 2), k: 1.2, s: rnd(0.01, 0.018), gr: 2.5, color: 0xe4f2ff, a: 0.03 });
      fx.ring(base.clone().add(V(0, 0, -0.02)), { r0: 0.05, r1: 0.22, t: 0.6, color: 0x9ff6ff, a: 0.4 });
    }
    const h1 = fresh.holder.position.clone();
    const down = tween(RM ? 0.01 : 0.8, (k) => {
      fresh.holder.position.lerpVectors(h1, base, k);
      fresh.orient.rotation.x = MathUtils.lerp(rest + 1.0, rest, k);
      liquid = 1 - 0.65 * k;
      if (opening) opening.position.y = liquidY + 0.0058 * (1 - smooth(0, 0.6, k));
    });
    await fly(c0, RM ? 0.01 : 0.8);
    await down;
    S.buzz([30, 40, 30]);
    await wait(0.5);
  }

  // 8b · POP — a beat of pressure first (the can squeezes, the tab digs in), then the bang: the can kicks down and springs
  // back, the frame punches in, spray in slow motion, foam runs. The camera pulls out to the hero shot while the can
  // turns once, overshoots a touch and settles into a slow hover, so the last picture behind the receipt is alive.
  async function popAndFinale(lift = 0) {
    frameHook = null; if (tab) tab.material.emissiveIntensity = 0;
    const base = fresh.holder.position.clone(), rest = fresh.orient.rotation.x + 0.2 * Math.max(0, lift);
    base.y += 0.012 * Math.max(0, lift);
    await tween(RM ? 0.01 : 0.12, (k) => {
      fresh.crush.scale.set(1 + 0.03 * k, 1 - 0.04 * k, 1 + 0.03 * k);
      setOpen(0.3 * Math.max(lift, k));
      fresh.orient.rotation.x = rest - 0.2 * Math.max(lift, k);
    }, easeIn);
    S.pop(); flashIt(true); shakeAmt = 0.025; push = 3.5;
    // the burst: a spray of droplets and a puff of mist out of the opening, a ring, a flash of light at the top
    const topAt = () => fresh.orient.localToWorld(V(0, H / 2, 0.012));   // follows the can as it tips
    const top = topAt();
    popLight.position.copy(top).add(V(0, 0.04, 0.06));
    const drop = (p, sp) => {
      const a = rnd(0, TAU), w = rnd(0, 0.42) * sp;
      fx.emit(p, V(Math.cos(a) * w, sp, Math.sin(a) * w * 0.6 + 0.18 * sp), { t: rnd(0.6, 1.3), g: 4.5, k: 0.6, s: rnd(0.0025, 0.006), color: Math.random() < 0.7 ? 0x7a5a30 : 0x6a6a6a, a: rnd(0.5, 0.9) });
    };
    if (!RM) {
      fx.ring(top, { r0: 0.01, r1: 0.2, t: 0.5, color: 0xffd8a0, a: 0.45 });
      for (let i = 0; i < 150; i++) drop(top.clone().add(V(rnd(-0.006, 0.006), 0, rnd(-0.004, 0.004))), rnd(0.6, 2.0));
      // the cold breath out of the can: a white puff that rises, curls and thins
      for (let i = 0; i < 28; i++) fx.emit(top.clone().add(V(rnd(-0.008, 0.008), 0, rnd(-0.006, 0.006))), V(rnd(-0.08, 0.08), rnd(0.08, 0.3), rnd(-0.05, 0.05)), { t: rnd(1.0, 2.0), g: -0.03, k: 1.8, s: rnd(0.006, 0.012), gr: 2.2, color: 0xdcefff, a: 0.035 });
    }
    // the camera punches in on the opening
    const closeIn = fly(ST.pop, RM ? 0.01 : 0.45, [], { ease: easeOut });
    const rec = V(-0.018, 0, 0), recV = V(0, 0, 0), sq = V(-0.06, 0, 0), sqV = V(0, 0, 0), tilt = V(0.12, 0, 0), tiltV = V(0, 0, 0);
    fxHook = (dt) => {                                             // recoil, stretch and lean, each on its own spring
      spring(rec, recV, V(0, 0, 0), 220, 9, dt); spring(sq, sqV, V(0, 0, 0), 300, 8, dt); spring(tilt, tiltV, V(0, 0, 0), 90, 7, dt);
      fresh.holder.position.y = base.y + rec.x;
      fresh.crush.scale.set(1 - sq.x * 0.5, 1 + sq.x, 1 - sq.x * 0.5);
      fresh.orient.rotation.x = rest - tilt.x;
      push *= Math.exp(-dt * 3);
    };
    energy = 3.2;
    const t0p = performance.now();
    const openDur = 0.75; let foamOn = false;
    fresh.u.uVein.value = 1.2;
    coldMist = 1;
    frameHook = (dt) => {
      const s = (performance.now() - t0p) / 1000;
      setOpen(easeOut(clamp(s / openDur)));
      liquid = Math.max(liquid, 0.35 * clamp((s - 0.3) / 0.5));
      sprayFrame(Math.floor(s * (sprayMeta ? sprayMeta.fps : 24)));
      if (!foamOn) { foamOn = true; foam.start(); }
      energy = 3.2 * Math.exp(-s * 2.2) + boost; boost *= Math.exp(-dt * 2.2);
      meterGlow = Math.max(0.8, 3.2 * Math.exp(-s * 1.5));
      popLight.intensity = 1.1 * Math.exp(-s * 3.5);
      if (RM) return;
      // the spray keeps coming for a moment, then it just fizzes: fine bubbles rising off the opening
      const tp = topAt();
      const n = Math.round(7 * Math.exp(-s * 4.5));
      for (let i = 0; i < n; i++) drop(tp, rnd(0.5, 1.5) * Math.exp(-s));
      // it keeps fizzing as long as it is open: bubbles breaking at the opening, a fine spit of drops jumping off it,
      // and a thin cold vapour curling out of it (lively at first, then settling)
      const fz = 0.3 + 0.7 * Math.exp(-s / 4);
      if (s > 0.4) {
        if (Math.random() < 0.8 * fz) fx.emit(tp.clone().add(V(rnd(-0.012, 0.012), 0, rnd(-0.008, 0.008))), V(rnd(-0.02, 0.02), rnd(0.04, 0.12), rnd(-0.01, 0.02)), { t: rnd(0.4, 0.9), s: rnd(0.0009, 0.0018), color: 0xb4b4b4, a: 0.6 });
        if (Math.random() < 0.22 * fz) fx.emit(tp.clone().add(V(rnd(-0.01, 0.01), 0.002, rnd(-0.006, 0.006))), V(rnd(-0.06, 0.06), rnd(0.12, 0.34), rnd(-0.03, 0.06)), { t: rnd(0.25, 0.5), g: 3.2, s: rnd(0.0009, 0.0016), color: 0xc8892e, a: 0.9 });
        if (Math.random() < 0.12 * fz) fx.emit(tp.clone(), V(rnd(-0.02, 0.02), rnd(0.03, 0.08), rnd(-0.01, 0.03)), { t: rnd(1.4, 2.4), g: -0.01, k: 1, s: rnd(0.005, 0.009), gr: 2, color: 0xdcefff, a: 0.025 });
      }
    };
    push = 0;
    say('FULLT LADET', 'BATTERIET ER BYTTET', '#4dff8a');
    await closeIn;
    await wait(1.1);                                                // the spray and the foam, up close
    fxHook = null;
    await stepDrink(base, rest);
    await drinkIt(base, rest);
    // the camera pulls back to the hero shot: the machine, the fresh can, the receipt hanging from the slot
    const back = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };   // ease-out-back
    const turn = tween(RM ? 0.01 : 3.0, (k) => { fresh.orient.rotation.y = TAU * k; }, (t) => back(easeInOut(t)));
    await fly(ST.finale, RM ? 0.01 : 2.6);
    await turn;
    // the hold: a slow hover and sway while the receipt comes up
    fxHook = null;
    const hb = fresh.holder.position.y, t1 = performance.now();
    const keep = frameHook;
    frameHook = (dt, t) => {
      if (keep) keep(dt, t);
      const s = (performance.now() - t1) / 1000, k = clamp(s / 1.2);
      fresh.holder.position.y = hb + Math.sin(s * 1.4) * 0.01 * k;
      fresh.orient.rotation.y = TAU + Math.sin(s * 0.6) * 0.22 * k;
    };
    say('DIN TUR?', 'BATTERIBYTTE.VERCEL.APP', '#ffd27a');
    await wait(1.1);                                                // let the hero shot land before the receipt covers it
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
      const lift = await stepFlick();
      return popAndFinale(lift);
    },
    act() { if (step && step.act) step.act(); },
    key(k) { if (step && step.key) step.key(k); },
    hold(v) { if (step && step.hold) step.hold(v); },
    get step() { return step ? step.name : null; },
    receiptCanvas: () => drawReceipt(document.createElement('canvas'), receiptData),
  };
}
