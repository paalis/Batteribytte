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

// Foam after the pop: a crown of small bubbles over the opening and two runs that creep down the wall, following the
// can's profile, then settle and pop one by one. Bubbles are shaded little spheres (a cream body, a highlight, a darker
// rim so packed bubbles read as foam), drawn with normal blending. Lives in the can's own frame (parent: the can), so
// it turns with it. Units: metres; y = 0 is the can's middle, the top at +h/2.
export function makeFoam(parent, h = 0.168, max = 2600) {
  const PROF = [[0, 24.6], [9.5, 33.1], [145, 33.1], [148.5, 32.8], [151.5, 31.9], [154.5, 30.4], [157.5, 28.8], [160, 27.6], [162, 27.1], [168, 27.1]];
  const radiusAt = (y) => {                              // the can's radius (m) at height y
    const mm = (y + h / 2) * 1000;
    for (let i = 1; i < PROF.length; i++) if (mm <= PROF[i][0]) { const [a, ra] = PROF[i - 1], [b, rb] = PROF[i]; return (ra + (rb - ra) * (mm - a) / (b - a)) / 1000; }
    return PROF[PROF.length - 1][1] / 1000;
  };
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
        gl_PointSize = alpha > 0.0 ? max(1.0, size * uScale / -mv.z) : 0.0; gl_Position = projectionMatrix * mv; }`,
    // shade 1: a bubble (a faint highlight, a thin darker rim); shade 0: the soft cream the bubbles sit in
    fragmentShader: `varying float vA; varying float vS;
      void main() { vec2 d = (gl_PointCoord - 0.5) * 2.0; float r = length(d); if (r > 1.0) discard;
        vec3 n = vec3(d.x, -d.y, sqrt(max(0.0, 1.0 - r * r)));
        float dif = 0.84 + 0.16 * dot(n, normalize(vec3(-0.4, 0.6, 0.7)));
        float hl = smoothstep(0.22, 0.0, length(d - vec2(-0.3, -0.34))) * vS;
        float rim = mix(1.0, 0.86, smoothstep(0.72, 1.0, r) * vS);
        vec3 c = vec3(1.0, 0.97, 0.9) * dif * rim + vec3(1.0) * hl * 0.3;
        float edge = mix(1.0 - smoothstep(0.3, 1.0, r), 1.0 - smoothstep(0.86, 1.0, r), vS);
        gl_FragColor = vec4(c, vA * edge); }`,
    transparent: true, depthWrite: false,
  });
  const pts = new Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 4; parent.add(pts);
  const rnd = (a, b) => a + Math.random() * (b - a);
  let n = 0, t = 0, running = false;
  const RUNS = [{ a: 0.18, len: 0.06, w: 0.2, rate: 170 }, { a: -0.5, len: 0.032, w: 0.13, rate: 95 }];
  const add = (b) => { const i = n; n = (n + 1) % max; Object.assign(B[i], { on: true, age: 0, ...b }); };
  const yTop = h / 2 - 0.006;                            // the wall just under the rim, where the runs start
  function start() {
    running = true; t = 0;
    // the crown, over the opening and spilling to the front rim: a soft cream body, then packed bubbles on it
    const crown = (k, s0, s1, sh, lift) => { for (let i = 0; i < k; i++) {
      const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * 0.021;
      const x = Math.cos(a) * d, z = 0.005 + Math.sin(a) * d;
      const dome = 0.013 * (1 - (d / 0.021) ** 2);
      add({ kind: 0, x, z, y: h / 2 - 0.004 + dome * rnd(lift, 1), s: rnd(s0, s1), sh, born: rnd(0, 0.35), life: rnd(5, 9) });
    } };
    crown(90, 0.006, 0.01, 0, 0.2);
    crown(380, 0.0008, 0.0018, 1, 0.55);
    crown(140, 0.0018, 0.0032, 1, 0.6);
  }
  const out = (b, i) => {                                // the bubble's position: crown bubbles where they are; run bubbles on the wall
    if (b.kind === 0) { pos[i * 3] = b.x; pos[i * 3 + 1] = b.y - 0.004 * Math.min(1, b.age / 6); pos[i * 3 + 2] = b.z; return; }
    const r = radiusAt(b.y) + 0.0012;
    pos[i * 3] = Math.sin(b.a) * r; pos[i * 3 + 1] = b.y; pos[i * 3 + 2] = Math.cos(b.a) * r;
  };
  function update(dt, camera, viewH) {
    mat.uniforms.uScale.value = viewH / (2 * Math.tan((camera.fov * Math.PI) / 360));
    if (running) {
      t += dt;
      for (const R of RUNS) {                           // the runs: fed from the rim for a while, each bubble creeping down
        if (t > 0.15 && t < 1.6) {
          const k = Math.round(R.rate * dt * (1.6 - t) + Math.random());
          for (let j = 0; j < k; j++) {
            const go = R.len * rnd(0.25, 1) * Math.min(1, (t + 0.3) / 1.2);
            const soft = Math.random() < 0.18;
            add({ kind: 1, a: R.a + rnd(-1, 1) * R.w * 0.5, y: yTop - rnd(0, 0.004), stop: yTop - go, v: rnd(0.03, 0.06), s: soft ? rnd(0.004, 0.007) : rnd(0.0008, 0.0026), sh: soft ? 0 : 1, born: 0, life: rnd(4, 9), spread: rnd(-1, 1) * R.w * 0.35 });
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
        b.y = Math.max(b.stop, b.y - b.v * dt); b.v *= Math.exp(-dt * 0.8);
        b.a += b.spread * dt * 0.6;                      // the run widens a little as it goes down
      }
      const grow = Math.min(1, a / 0.18), fade = 1 - Math.max(0, (a - b.life * 0.75) / (b.life * 0.25));
      if (fade <= 0) { b.on = false; alpha[i] = 0; continue; }
      size[i] = b.s * grow * (0.6 + 0.4 * fade);
      alpha[i] = 0.97 * Math.min(1, fade * 2);
      shade[i] = b.sh;
      out(b, i);
    }
    geo.attributes.position.needsUpdate = geo.attributes.size.needsUpdate = geo.attributes.alpha.needsUpdate = geo.attributes.shade.needsUpdate = true;
  }
  return { start, update };
}
