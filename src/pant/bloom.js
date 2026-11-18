// Batteribytte · a small bloom that keeps the canvas transparent-friendly (from the old src/can3d.js).
import {
  WebGLRenderTarget, HalfFloatType, ShaderMaterial, Mesh, BufferGeometry, Float32BufferAttribute, OrthographicCamera,
  CustomBlending, AddEquation, OneFactor, ZeroFactor, Vector2, NoToneMapping, LinearSRGBColorSpace,
} from 'three';

// ---------- a small bloom that keeps the canvas transparent ----------
// The scene is drawn as usual. A quarter-size copy of it (linear, half float) keeps only what is brighter than 1
// (the energy veins, hard highlights), is blurred twice at two sizes, and is added on top with alpha left alone:
// on a premultiplied canvas that is pure added light, so the glow spills over the film behind without a dark fringe.
export function makeBloom(renderer, { threshold = 1.0 } = {}) {
  const tri = new BufferGeometry();
  tri.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const vert = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0., 1.); }';
  const mk = (frag, uniforms, extra = {}) => new Mesh(tri, new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra }));
  const bright = mk(`uniform sampler2D t; uniform float thr; varying vec2 vUv;
    void main(){ vec4 c = texture2D(t, vUv); float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c.rgb * smoothstep(thr, thr + 0.6, l), 1.); }`,
  { t: { value: null }, thr: { value: threshold } });
  const blur = mk(`uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
    void main(){ vec3 s = texture2D(t, vUv).rgb * 0.227;
      s += (texture2D(t, vUv + dir * 1.385).rgb + texture2D(t, vUv - dir * 1.385).rgb) * 0.316;
      s += (texture2D(t, vUv + dir * 3.231).rgb + texture2D(t, vUv - dir * 3.231).rgb) * 0.07;
      gl_FragColor = vec4(s, 1.); }`, { t: { value: null }, dir: { value: new Vector2() } });
  const add = mk(`uniform sampler2D a; uniform sampler2D b; uniform float k; varying vec2 vUv;
    void main(){ vec3 c = (texture2D(a, vUv).rgb + texture2D(b, vUv).rgb * 1.4) * k;
      c = c / (1. + c);                                   // soft: the glow never clips
      gl_FragColor = vec4(pow(c, vec3(1. / 2.2)), 0.); }`,
  { a: { value: null }, b: { value: null }, k: { value: 1 } },
  { transparent: true, blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneFactor,
    blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor });
  const rt = (w, h) => new WebGLRenderTarget(w, h, { type: HalfFloatType, depthBuffer: false });
  let src = null, a1, a2, b1, b2, W = 0, H = 0;
  const pass = (mesh, target) => { renderer.setRenderTarget(target); renderer.render(mesh, cam); };
  return {
    setSize(w, h) {
      W = Math.max(8, Math.round(w / 4)); H = Math.max(8, Math.round(h / 4));
      [src, a1, a2, b1, b2].forEach((t) => t && t.dispose());
      src = new WebGLRenderTarget(W, H, { type: HalfFloatType });
      a1 = rt(W, H); a2 = rt(W, H); b1 = rt(W >> 1, H >> 1); b2 = rt(W >> 1, H >> 1);
    },
    render(scene, camera, strength) {
      if (!src || strength <= 0.001) return;
      const tm = renderer.toneMapping, cs = renderer.outputColorSpace, ac = renderer.autoClear;
      renderer.toneMapping = NoToneMapping; renderer.outputColorSpace = LinearSRGBColorSpace;
      renderer.setRenderTarget(src); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(scene, camera);
      bright.material.uniforms.t.value = src.texture; pass(bright, a1);
      blur.material.uniforms.t.value = a1.texture; blur.material.uniforms.dir.value.set(1 / W, 0); pass(blur, a2);
      blur.material.uniforms.t.value = a2.texture; blur.material.uniforms.dir.value.set(0, 1 / H); pass(blur, a1);
      blur.material.uniforms.t.value = a1.texture; blur.material.uniforms.dir.value.set(2 / W, 0); pass(blur, b1);
      blur.material.uniforms.t.value = b1.texture; blur.material.uniforms.dir.value.set(0, 2 / H); pass(blur, b2);
      renderer.toneMapping = tm; renderer.outputColorSpace = cs;
      renderer.setRenderTarget(null); renderer.autoClear = false;
      add.material.uniforms.a.value = a1.texture; add.material.uniforms.b.value = b2.texture; add.material.uniforms.k.value = strength;
      renderer.render(add, cam);
      renderer.autoClear = ac;
    },
  };
}
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
