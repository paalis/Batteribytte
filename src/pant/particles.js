// Batteribytte · particles for the big moments: the spray and mist when the can pops, sparks when the fresh can lands
// and lifts, a trail behind it, and shockwave rings. One pool of points (soft discs, sized in metres, additive so the
// bloom picks them up) and a few billboard rings, all updated from the render loop.
import {
  BufferGeometry, BufferAttribute, Points, ShaderMaterial, AdditiveBlending, Mesh, RingGeometry, MeshBasicMaterial,
  DoubleSide, Color,
} from 'three';

export function makeParticles(scene, max = 900) {
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 3), size = new Float32Array(max), alpha = new Float32Array(max);
  const vel = new Float32Array(max * 3), life = new Float32Array(max), dur = new Float32Array(max), grav = new Float32Array(max),
    drag = new Float32Array(max), size0 = new Float32Array(max), grow = new Float32Array(max), a0 = new Float32Array(max);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  geo.setAttribute('size', new BufferAttribute(size, 1));
  geo.setAttribute('alpha', new BufferAttribute(alpha, 1));
  const mat = new ShaderMaterial({
    uniforms: { uScale: { value: 800 } },
    vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA;
      uniform float uScale;
      void main() { vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = alpha > 0.0 ? max(1.0, size * uScale / -mv.z) : 0.0; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main() { vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard;
        float a = vA * (1.0 - smoothstep(0.35, 1.0, r)); gl_FragColor = vec4(vC * (1.0 + 0.8 * (1.0 - r)), a); }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  const pts = new Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
  for (let i = 0; i < max; i++) life[i] = 1, dur[i] = 0;
  let next = 0;
  const c = new Color();

  // one particle: at p, moving v (m/s), for t s; g: gravity (m/s²), k: drag (1/s), s: size (m), grows by s·gr over its
  // life, a: peak opacity, colour hex
  function emit(p, v, { t = 0.8, g = 0, k = 0, s = 0.006, gr = 0, a = 1, color = 0xffffff } = {}) {
    const i = next; next = (next + 1) % max;
    pos.set([p.x, p.y, p.z], i * 3); vel.set([v.x, v.y, v.z], i * 3);
    c.set(color); col.set([c.r, c.g, c.b], i * 3);
    life[i] = 0; dur[i] = t; grav[i] = g; drag[i] = k; size0[i] = s; grow[i] = gr; a0[i] = a;
  }

  // rings: a flash that spreads out and fades (billboards, turned to the camera)
  const rings = [];
  const ringGeo = new RingGeometry(0.82, 1, 48);
  function ring(p, { r0 = 0.02, r1 = 0.25, t = 0.5, color = 0x9ff6ff, a = 0.9 } = {}) {
    const m = new Mesh(ringGeo, new MeshBasicMaterial({ color, transparent: true, opacity: a, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
    m.position.copy(p); m.renderOrder = 6; scene.add(m);
    rings.push({ m, r0, r1, t, a, k: 0 });
  }

  function update(dt, camera, viewH) {
    mat.uniforms.uScale.value = viewH / (2 * Math.tan((camera.fov * Math.PI) / 360));
    for (let i = 0; i < max; i++) {
      if (life[i] >= dur[i]) { alpha[i] = 0; continue; }
      life[i] += dt;
      const f = Math.exp(-drag[i] * dt), j = i * 3;
      vel[j] *= f; vel[j + 1] = vel[j + 1] * f - grav[i] * dt; vel[j + 2] *= f;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      const x = Math.min(1, life[i] / dur[i]);
      alpha[i] = a0[i] * Math.min(1, x * 12) * (1 - x * x);
      size[i] = size0[i] * (1 + grow[i] * x);
    }
    geo.attributes.position.needsUpdate = geo.attributes.alpha.needsUpdate = geo.attributes.size.needsUpdate = geo.attributes.color.needsUpdate = true;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.k += dt / r.t;
      const e = 1 - Math.pow(1 - Math.min(1, r.k), 3);
      r.m.scale.setScalar(r.r0 + (r.r1 - r.r0) * e);
      r.m.quaternion.copy(camera.quaternion);
      r.m.material.opacity = r.a * (1 - Math.min(1, r.k));
      if (r.k >= 1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); }
    }
  }
  return { emit, ring, update };
}

// Foam after the pop, as soda foam behaves: it wells up out of the opening in a second, spills over the rim and runs
// down the wall in two streams that leave a wet amber trail, then collapses — the bubbles burst from the top down, each
// with a tiny spit of spray — until only a ring of bubbles clings round the opening. Three kinds of points:
//   bubbles  thin shells: a bright, see-through middle, a darker film at the rim, a speck of highlight
//   cream    the dense foam the bubbles sit in: soft, opaque, a little warm
//   wet      the trail a run leaves: translucent amber with a glint
// Lives in the can's own frame (parent: the can), so it turns with it. Units: metres; y = 0 is the can's middle.
export function makeFoam(parent, h = 0.168, { max = 3600, onPop = null } = {}) {
  // the can's outside, as built (tools/blender/build_can.py OUTER): body, shoulder, neck and the seamed rim on top
  const PROF = [[0, 24.6], [9.5, 33.1], [145, 33.1], [148.5, 32.8], [151.5, 31.9], [154.5, 30.4], [157.5, 28.8], [160, 27.6], [162, 27.1],
    [163.6, 27.1], [164.4, 27.75], [166.2, 27.9], [167.6, 27.6], [168, 27.0]];
  const radiusAt = (y) => {                              // the can's radius (m) at height y
    const mm = (y + h / 2) * 1000;
    for (let i = 1; i < PROF.length; i++) if (mm <= PROF[i][0]) { const [a, ra] = PROF[i - 1], [b, rb] = PROF[i]; return (ra + (rb - ra) * (mm - a) / (b - a)) / 1000; }
    return PROF[PROF.length - 1][1] / 1000;
  };
  const INNER = 0.0245;                                  // inside the rim: the head has to stay within this
  const pos = new Float32Array(max * 3), size = new Float32Array(max), alpha = new Float32Array(max), shade = new Float32Array(max);
  const B = Array.from({ length: max }, () => ({ on: false }));
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('size', new BufferAttribute(size, 1));
  geo.setAttribute('alpha', new BufferAttribute(alpha, 1));
  geo.setAttribute('shade', new BufferAttribute(shade, 1));
  const mat = new ShaderMaterial({
    uniforms: { uScale: { value: 800 } },
    vertexShader: `attribute float size; attribute float alpha; attribute float shade; varying float vA; varying float vS; uniform float uScale;
      void main() { vA = alpha; vS = shade; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.xyz += normalize(-mv.xyz) * size * (shade > 1.5 ? 0.15 : 0.55);   // depth-test as the bubble's front, not its middle
        gl_PointSize = alpha > 0.0 ? max(1.0, size * uScale / -mv.z) : 0.0; gl_Position = projectionMatrix * mv; }`,
    // shade 0: cream · 1: bubble · 2: wet trail
    fragmentShader: `varying float vA; varying float vS;
      void main() { vec2 d = (gl_PointCoord - 0.5) * 2.0; float r = length(d); if (r > 1.0) discard;
        vec3 n = vec3(d.x, -d.y, sqrt(max(0.0, 1.0 - r * r)));
        float lit = dot(n, normalize(vec3(-0.45, 0.6, 0.65)));
        float spec = pow(max(0.0, dot(reflect(-normalize(vec3(-0.45, 0.6, 0.65)), n), vec3(0.0, 0.0, 1.0))), 24.0);
        vec3 c; float a;
        if (vS < 0.5) {                                   // cream
          c = vec3(1.0, 0.95, 0.85) * (0.86 + 0.14 * lit); a = 1.0 - smoothstep(0.25, 1.0, r);
        } else if (vS < 1.5) {                            // a bubble: the film thickest (and darkest) at its edge
          float film = smoothstep(0.55, 0.97, r);
          c = mix(vec3(1.0, 0.97, 0.9), vec3(0.78, 0.66, 0.5), film * 0.55) * (0.9 + 0.1 * lit) + vec3(1.0) * spec * 0.9;
          a = mix(0.42, 0.98, film) * (1.0 - smoothstep(0.93, 1.0, r));
        } else {                                          // wet: amber, mostly see-through, one glint
          c = vec3(0.98, 0.62, 0.22) * (0.7 + 0.3 * lit) + vec3(1.0, 0.95, 0.85) * spec * 1.2;
          a = (0.28 + 0.5 * spec) * (1.0 - smoothstep(0.6, 1.0, r));
        }
        gl_FragColor = vec4(c, vA * a); }`,
    transparent: true, depthWrite: false,
  });
  const pts = new Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 4; parent.add(pts);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const small = () => 0.00035 + Math.pow(Math.random(), 2.2) * 0.0024;    // mostly tiny bubbles, a few big ones
  let n = 0, t = 0, running = false;
  const RUNS = [{ a: 0.16, len: 0.07, w: 0.17, rate: 230 }, { a: -0.55, len: 0.036, w: 0.11, rate: 120 }];
  const add = (b) => { const i = n; n = (n + 1) % max; Object.assign(B[i], { on: true, age: 0, ...b }); };
  const yRim = h / 2 - 0.0015, yTop = h / 2 - 0.0018, OZ = 0.003, OR = 0.021;   // the head sits on the lid, inside the rim; runs start over the rim
  // how high the head stands: wells up in half a second, then sinks to a thin layer
  const head = (tt) => 0.017 * Math.min(1, tt / 0.45) ** 0.7 * (1 - 0.82 * Math.min(1, Math.max(0, (tt - 0.7) / 3.2)) ** 0.8);
  // keep a bubble of size s (diameter) inside the rim
  const inside = (x, z, s_) => { const r = Math.hypot(x, z), m = INNER - s_ / 2; return r > m ? { x: x * m / r, z: z * m / r } : { x, z }; };
  function start() {
    running = true; t = 0;
    for (let i = 0; i < 1500; i++) {                     // the head over the opening
      const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * OR, hf = Math.pow(Math.random(), 0.7);
      const cream = Math.random() < 0.08;
      const edge = d / OR;
      // bubbles high in the head burst first; the ones at the rim last longest
      const life = cream ? rnd(2.2, 4.5) : 0.9 + 4.5 * (1 - hf) * rnd(0.5, 1) + 4 * edge ** 3 * rnd(0.5, 1);
      const s_ = cream ? rnd(0.004, 0.007) : small();
      add({ kind: 0, ...inside(Math.cos(a) * d, OZ + Math.sin(a) * d, s_), hf: hf * (1 - edge * edge * 0.7), s: s_, sh: cream ? 0 : 1, born: rnd(0, 0.3) * (0.3 + hf), life });
    }
    for (let i = 0; i < 260; i++) {                      // the ring that clings round the opening's edge
      const a = rnd(0, Math.PI * 2), s_ = small() * 0.9, d = INNER - s_ / 2 - rnd(0, 0.0015);
      add({ kind: 0, x: Math.cos(a) * d, z: Math.sin(a) * d, hf: rnd(0, 0.12), s: s_, sh: 1, born: rnd(0.2, 0.6), life: rnd(7, 12) });
    }
  }
  const tmp = { x: 0, y: 0, z: 0 };
  const where = (b) => {
    if (b.kind === 0) { tmp.x = b.x; tmp.y = yRim + head(t) * b.hf; tmp.z = b.z; return tmp; }
    const r = radiusAt(b.y) + (b.kind === 2 ? 0.0003 : b.s * 0.5 * Math.min(1, (b.age - b.born) / 0.15) + 0.0003);   // on the wall, not in it
    tmp.x = Math.sin(b.a) * r; tmp.y = b.y; tmp.z = Math.cos(b.a) * r; return tmp;
  };
  function update(dt, camera, viewH) {
    mat.uniforms.uScale.value = viewH / (2 * Math.tan((camera.fov * Math.PI) / 360));
    if (running) {
      t += dt;
      for (const R of RUNS) {                           // the runs: fed from the rim for a while, creeping down
        if (t > 0.2 && t < 1.8) {
          const k = Math.round(R.rate * dt * (1.8 - t) / 1.6 + Math.random());
          for (let j = 0; j < k; j++) {
            const go = R.len * rnd(0.2, 1) * Math.min(1, (t + 0.2) / 1.1);
            const cream = Math.random() < 0.1;
            add({ kind: 1, a: R.a + rnd(-1, 1) * R.w * 0.5, y: yTop - rnd(0, 0.004), stop: yTop - go, v: rnd(0.035, 0.07), s: cream ? rnd(0.003, 0.0055) : small(), sh: cream ? 0 : 1, born: 0, life: rnd(2.5, 7), spread: rnd(-1, 1) * R.w * 0.3, trail: 0 });
          }
        }
      }
    }
    for (let i = 0; i < max; i++) {
      const b = B[i];
      if (!b.on) { alpha[i] = 0; continue; }
      b.age += dt;
      const a = b.age - b.born;
      if (a < 0) { alpha[i] = 0; continue; }
      if (b.kind === 1 && b.y > b.stop) {
        b.y = Math.max(b.stop, b.y - b.v * dt); b.v *= Math.exp(-dt * 0.9);
        b.a += b.spread * dt * 0.5;
        if ((b.trail += dt) > 0.05 && Math.random() < 0.5) {    // the wet streak behind it
          b.trail = 0;
          add({ kind: 2, a: b.a, y: b.y + 0.001, s: rnd(0.0022, 0.0042), sh: 2, born: 0, life: rnd(5, 8) });
        }
      }
      if (a > b.life) {                                 // it bursts: gone in a blink, with a little spit of spray
        b.on = false; alpha[i] = 0;
        if (onPop && b.sh === 1 && b.s > 0.0009 && Math.random() < 0.35) { const p = where(b); onPop(p.x, p.y, p.z); }
        continue;
      }
      const grow = Math.min(1, a / 0.15);
      const end = Math.max(0, 1 - (b.life - a) / 0.12);  // the last 0.12 s: it swells a touch and thins
      size[i] = b.s * grow * (1 + 0.15 * end);
      alpha[i] = (b.sh === 2 ? 1 - Math.max(0, (a - b.life * 0.6) / (b.life * 0.4)) : 1) * (1 - end);
      shade[i] = b.sh;
      const p = where(b);
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    }
    geo.attributes.position.needsUpdate = geo.attributes.size.needsUpdate = geo.attributes.alpha.needsUpdate = geo.attributes.shade.needsUpdate = true;
  }
  return { start, update };
}
