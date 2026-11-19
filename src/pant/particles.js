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
