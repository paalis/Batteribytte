"""Batteribytte · builds the Battery Fresh can in Blender and exports it as glTF (assets/can/battery-can.glb).

Run headless with Blender as a Python module (no Blender install needed):
    python3 -m venv .venv-blender && .venv-blender/bin/pip install bpy==5.3.0
    .venv-blender/bin/python tools/blender/build_can.py            # writes the GLB
    .venv-blender/bin/python tools/blender/build_can.py --render    # also a Cycles preview (tools/blender/preview.png)

What it makes (units: metres, Blender Z up → glTF Y up, the label's front faces the camera, −Y here / +Z in glTF):
  - a real 500 ml can: Ø 66.2 mm × 168 mm, base bevel and dome, body, shoulder, neck, seamed rim, countersunk lid;
  - the label unwrapped from the product photo (assets/battery-fresh.webp): a column at angle φ is the photo column
    at x = sin φ; the back, which no photo shows, gets the label's own gradient row by row;
  - condensation: a normal map of droplets, denser toward the cold bottom of the can;
  - a stay-on tab on a hinge and the opening under it, with an animation «open» (tab lifts, opening appears).
"""
import math
import os
import sys

import bpy
import bmesh
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PHOTO = os.path.join(ROOT, 'assets', 'battery-fresh.webp')
OUT_DIR = os.path.join(ROOT, 'assets', 'can')
OUT = os.path.join(OUT_DIR, 'battery-can.glb')
MM = 0.001
H = 168.0
SEG = 128

# ---------------------------------------------------------------- profile (mm), bottom → top
OUTER = [
    (24.6, 0), (26.5, 0.4), (29.5, 2), (31.8, 4.5), (32.9, 7.5), (33.1, 9.5),
    (33.1, 145), (32.8, 148.5), (31.9, 151.5), (30.4, 154.5), (28.8, 157.5), (27.6, 160), (27.1, 162),
    (27.1, 163.6), (27.75, 164.4), (27.9, 166.2), (27.6, 167.6), (27.0, 168),
]
LID = [(27.0, 168), (26.2, 167.7), (25.7, 166.6), (25.5, 165.2), (25.0, 164.6), (23.5, 164.5), (0.0, 164.4)]
BASE = [(0.0, 5.2), (10, 4.9), (18, 3.6), (22.5, 1.6), (24.0, 0.4), (24.6, 0)]


def densify(prof, step=1.2):
    """More rings where the profile is long, so the label is not stretched over a few tall quads."""
    out = [prof[0]]
    for (r0, y0), (r1, y1) in zip(prof, prof[1:]):
        n = max(1, int(math.hypot(r1 - r0, y1 - y0) / step))
        for k in range(1, n + 1):
            t = k / n
            out.append((r0 + (r1 - r0) * t, y0 + (y1 - y0) * t))
    return out


def lathe(name, prof, uv_by_height=True):
    """Revolve a (r, y) profile around Z. φ = 0 faces −Y (the camera); u = 0.5 there, the seam is at the back."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    rings = []
    for r, y in prof:
        ring = []
        for j in range(SEG):
            phi = -math.pi + 2 * math.pi * j / SEG
            ring.append(bm.verts.new((r * MM * math.sin(phi), -r * MM * math.cos(phi), y * MM)))
        rings.append(ring)
    span = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(prof, prof[1:])) or 1
    acc = [0.0]
    for a, b in zip(prof, prof[1:]):
        acc.append(acc[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    for i in range(len(prof) - 1):
        if prof[i][0] < 1e-6 and prof[i + 1][0] < 1e-6:
            continue
        for j in range(SEG):
            j1 = (j + 1) % SEG
            vs = [rings[i][j], rings[i][j1], rings[i + 1][j1], rings[i + 1][j]]
            # collapse rings of radius 0 into a fan
            uniq = []
            for v in vs:
                if v not in uniq:
                    uniq.append(v)
            if prof[i][0] < 1e-6:
                vs = [rings[i][0], rings[i + 1][j1], rings[i + 1][j]]
            elif prof[i + 1][0] < 1e-6:
                vs = [rings[i][j], rings[i][j1], rings[i + 1][0]]
            try:
                f = bm.faces.new(vs)
            except ValueError:
                continue
            for loop in f.loops:
                v = loop.vert
                ii = next(k for k in (i, i + 1) if v in rings[k])
                jj = rings[ii].index(v)
                u = jj / SEG
                if j1 == 0 and jj == 0:
                    u = 1.0
                vv = (prof[ii][1] / H) if uv_by_height else acc[ii] / span
                loop[uvl].uv = (u, vv)
    bmesh.ops.remove_doubles(bm, verts=[v for r in rings for v in r if r is not None], dist=1e-7)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


# ---------------------------------------------------------------- label and droplets (numpy)
def load_photo():
    img = bpy.data.images.load(PHOTO)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)[::-1]          # Blender stores rows bottom-up
    return (px * 255).astype(np.float32), w, h


def build_label(tw=2048, th=1656):
    d, w, h = load_photo()
    a = d[..., 3] > 128
    rows = [None] * h
    for y in range(h):
        xs = np.nonzero(a[y])[0]
        if len(xs):
            rows[y] = (int(xs[0]), int(xs[-1]))
    y0 = next(i for i, r in enumerate(rows) if r)
    y1 = max(i for i, r in enumerate(rows) if r)

    # the back: per row, the label's own colour near the left edge, away from the black graphics
    back = np.zeros((h, 3), np.float32)
    ok = np.zeros(h, bool)
    for y in range(y0, y1 + 1):
        l, r = rows[y]
        cx, hw = (l + r) / 2, (r - l) / 2
        c = np.mean([d[y, int(round(cx - f * hw)), :3] for f in (0.8, 0.84, 0.88)], axis=0)
        back[y] = c
        ok[y] = (c.max() > 170 and c[0] - c[2] > 80) or y < y0 + 40 or y > y1 - 30
    clean = ok.copy()
    for y in range(y0, y1 + 1):
        if not clean[y]:
            ok[max(y0 + 40, y - 10):min(y1 - 30, y + 10) + 1] = False
    for y in range(y0, y1 + 1):
        if ok[y]:
            continue
        a_ = y
        while a_ > y0 and not ok[a_]:
            a_ -= 1
        b_ = y
        while b_ < y1 and not ok[b_]:
            b_ += 1
        t = 0 if b_ == a_ else (y - a_) / (b_ - a_)
        back[y] = back[a_] * (1 - t) + back[b_] * t
    k = 24
    sm = back.copy()
    for y in range(y0, y1 + 1):
        lo, hi = max(y0, y - k), min(y1, y + k)
        sm[y] = back[lo:hi + 1].mean(0)

    # unwrap: texture row v (0 = bottom) ↔ photo row; column u ↔ angle φ (front at u = 0.5)
    FRONT = math.radians(80)
    out = np.zeros((th, tw, 3), np.float32)
    phi = (np.arange(tw) / tw - 0.5) * 2 * math.pi
    aphi = np.abs(phi)
    for ty in range(th):
        sy = int(round(y1 - (ty / (th - 1)) * (y1 - y0)))
        l, r = rows[sy]
        cx, hw = (l + r) / 2, (r - l) / 2
        row = np.repeat(sm[sy][None, :], tw, 0)
        front = aphi < math.pi / 2
        x = np.clip(np.round(cx + np.sin(phi) * hw * 0.97), l + 5, r - 5).astype(int)
        src = d[sy, x, :3]
        kk = np.where(aphi < FRONT, 1.0, 1 - (aphi - FRONT) / (math.pi / 2 - FRONT))
        e = kk * kk * (3 - 2 * kk)
        dark = (src.sum(1) < 0.45 * row.sum(1)) & (aphi >= FRONT)
        e = np.where(dark, 0, e)
        e = np.where(front, e, 0)[:, None]
        out[ty] = src * e + row * (1 - e)
    return out


def droplets(tw=2048, th=1656, seed=7):
    """A height field of condensation droplets → tangent-space normal map. Denser and bigger toward the bottom."""
    rng = np.random.default_rng(seed)
    hgt = np.zeros((th, tw), np.float32)
    n = 5200
    ys = rng.random(n) ** 0.7                      # 0 = bottom
    xs = rng.random(n)
    rs = rng.uniform(1.5, 5.5, n) * (1.25 - 0.5 * ys)
    for x, y, r in zip(xs, ys, rs):
        if y > 0.86:                                # the shoulder and neck stay dry
            continue
        cx, cy = x * tw, y * (th - 1)
        ry = r * rng.uniform(1.0, 1.5)              # drops sag a little
        x0, x1 = int(cx - r - 1), int(cx + r + 2)
        y0, y1 = int(cy - ry - 1), int(cy + ry + 2)
        gy, gx = np.mgrid[y0:y1, x0:x1]
        q = 1 - ((gx - cx) / r) ** 2 - ((gy - cy) / ry) ** 2
        dome = np.sqrt(np.clip(q, 0, None)) * r * 0.6
        gxw = np.mod(gx, tw)
        gyc = np.clip(gy, 0, th - 1)
        np.maximum.at(hgt, (gyc, gxw), dome)
    dx = np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)
    dy = np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)
    nx, ny, nz = -dx, -dy, np.full_like(dx, 2.0)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    nrm = np.stack([nx / l, ny / l, nz / l], -1) * 0.5 + 0.5
    rough = 0.38 - np.clip(hgt / 2.0, 0, 1) * 0.28    # lacquer 0.38; wet drops are glossier
    return nrm.astype(np.float32), rough.astype(np.float32)


def to_image(name, arr, alpha=None, non_color=False):
    th, tw = arr.shape[:2]
    # data textures (normals, roughness) must be marked non-colour before the pixels go in, or Blender drops them
    img = bpy.data.images.new(name, tw, th, alpha=False, is_data=non_color)
    rgba = np.ones((th, tw, 4), np.float32)
    if arr.ndim == 2:
        rgba[..., :3] = arr[..., None]
    else:
        rgba[..., :3] = arr
    img.pixels.foreach_set(rgba.ravel())
    img.pack()
    return img


# ---------------------------------------------------------------- materials
def principled(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes['Principled BSDF'], m.node_tree


def label_material(label_img, nrm_img, rough_img):
    m, p, nt = principled('Label')
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = label_img
    nt.links.new(tex.outputs['Color'], p.inputs['Base Color'])
    nmap_t = nt.nodes.new('ShaderNodeTexImage')
    nmap_t.image = nrm_img
    nmap = nt.nodes.new('ShaderNodeNormalMap')
    nmap.inputs['Strength'].default_value = 0.7
    nt.links.new(nmap_t.outputs['Color'], nmap.inputs['Color'])
    nt.links.new(nmap.outputs['Normal'], p.inputs['Normal'])
    rt = nt.nodes.new('ShaderNodeTexImage')
    rt.image = rough_img
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(rt.outputs['Color'], sep.inputs['Color'])
    # glTF packs metallic (B) and roughness (G) into one texture; feed roughness from G, metallic is a constant
    nt.links.new(sep.outputs['Green'], p.inputs['Roughness'])
    p.inputs['Metallic'].default_value = 0.35
    p.inputs['Coat Weight'].default_value = 0.35
    p.inputs['Coat Roughness'].default_value = 0.25
    return m


def metal_material(name, color, rough):
    m, p, _ = principled(name)
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = 1.0
    p.inputs['Roughness'].default_value = rough
    return m


def dark_material():
    m, p, _ = principled('Opening')
    p.inputs['Base Color'].default_value = (0.01, 0.01, 0.012, 1)
    p.inputs['Roughness'].default_value = 0.9
    return m


# ---------------------------------------------------------------- the tab
def tab_object(metal):
    cu = bpy.data.curves.new('TabCurve', 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.extrude = 0.25 * MM
    cu.bevel_depth = 0.2 * MM
    cu.bevel_resolution = 2

    def poly(pts):
        sp = cu.splines.new('POLY')
        sp.points.add(len(pts) - 1)
        for p, (x, y) in zip(sp.points, pts):
            p.co = (x * MM, y * MM, 0, 1)
        sp.use_cyclic_u = True

    outer = []
    for k in range(25):                            # nose (toward the front, −Y): a half circle at y = −3.5
        a = math.pi + math.pi * k / 24
        outer.append((7.5 * math.cos(a), -3.5 + 7.5 * math.sin(a)))
    for k in range(25):                            # finger end (toward the back, +Y): a half circle at y = +14
        a = math.pi * k / 24
        outer.append((7.5 * math.cos(a), 14 + 7.5 * math.sin(a)))
    poly(outer)
    hole = [(4.6 * math.cos(2 * math.pi * k / 32), 12 + 5.2 * math.sin(2 * math.pi * k / 32)) for k in range(32)]
    poly(hole[::-1])
    ob = bpy.data.objects.new('Tab', cu)
    bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.view_layer.objects.active
    ob.data.materials.append(metal)
    for p in ob.data.polygons:
        p.use_smooth = True
    ob.select_set(False)
    return ob


# ---------------------------------------------------------------- build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 24

    print('label …')
    label = build_label()
    nrm, rough = droplets()
    label_img = to_image('label', label / 255.0)
    nrm_img = to_image('droplets_normal', nrm, non_color=True)
    rough_img = to_image('droplets_rough', np.stack([np.zeros_like(rough), rough, np.zeros_like(rough)], -1), non_color=True)

    m_label = label_material(label_img, nrm_img, rough_img)
    m_metal = metal_material('Aluminium', (0.62, 0.64, 0.68), 0.28)
    m_base = metal_material('Base', (0.55, 0.57, 0.6), 0.42)

    root = bpy.data.objects.new('BatteryCan', None)
    bpy.context.collection.objects.link(root)

    wall = lathe('Wall', densify(OUTER))
    wall.data.materials.append(m_label)
    lid = lathe('Lid', densify(LID, 0.6), uv_by_height=False)
    lid.data.materials.append(m_metal)
    base = lathe('Base', densify(BASE, 0.8), uv_by_height=False)
    base.data.materials.append(m_base)
    for ob in (wall, lid, base):
        ob.parent = root

    # the opening: a dark tear under the nose of the tab, scaled from 0 when the can opens
    bpy.ops.mesh.primitive_circle_add(vertices=40, radius=1, fill_type='NGON', location=(0, -11.5 * MM, 164.55 * MM))
    hole = bpy.context.active_object
    hole.name = 'Opening'
    hole.scale = (7 * MM, 9.5 * MM, 1)
    hole.data.materials.append(dark_material())
    hole.parent = root

    rivet = lathe('Rivet', [(0, 165.7), (1.8, 165.65), (2.4, 165.3), (2.5, 164.6)], uv_by_height=False)
    rivet.data.materials.append(m_metal)
    rivet.location = (0, 2 * MM, 0)
    rivet.parent = root

    hinge = bpy.data.objects.new('TabHinge', None)
    bpy.context.collection.objects.link(hinge)
    hinge.location = (0, 2 * MM, 164.9 * MM)
    hinge.parent = root
    tab = tab_object(m_metal)
    tab.parent = hinge
    tab.location = (0, 0, 0)

    # «open»: the tab lifts on its hinge (finger end up), the opening appears under the nose
    act_frames = (1, 10, 18)
    for f, ang, s in zip(act_frames, (0.0, 1.3, 1.15), (0.0, 1.0, 1.0)):
        hinge.rotation_euler = (ang, 0, 0)
        hinge.keyframe_insert('rotation_euler', frame=f)
        hole.scale = (7 * MM * max(s, 1e-3), 9.5 * MM * max(s, 1e-3), 1)
        hole.keyframe_insert('scale', frame=f)
    scene.frame_start, scene.frame_end = 1, 18
    return root, hinge, hole


def export():
    os.makedirs(OUT_DIR, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUT, export_format='GLB', export_yup=True, export_apply=True,
        export_image_format='WEBP', export_image_quality=85,
        export_animations=True, export_animation_mode='SCENE', export_force_sampling=True,
        export_cameras=False, export_lights=False,
    )
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'kB')


def render(path):
    scene = bpy.context.scene
    scene.frame_set(18)                             # opened, like the film's last frame
    world = bpy.data.worlds.new('Studio')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.02, 0.025, 0.03, 1)
    bg.inputs['Strength'].default_value = 1.0

    def area(name, loc, rot, size, power, color):
        l = bpy.data.lights.new(name, 'AREA')
        l.size, l.energy, l.color = size, power, color
        ob = bpy.data.objects.new(name, l)
        bpy.context.collection.objects.link(ob)
        ob.location, ob.rotation_euler = loc, rot
        return ob

    area('Key', (-0.35, -0.45, 0.3), (math.radians(62), 0, math.radians(-38)), 0.5, 45, (1, 0.92, 0.82))
    area('Fill', (0.4, -0.4, 0.15), (math.radians(75), 0, math.radians(45)), 0.6, 12, (0.85, 0.9, 1))
    area('RimL', (-0.3, 0.3, 0.2), (math.radians(-70), 0, math.radians(-135)), 0.12, 60, (0.3, 0.85, 0.8))
    area('RimR', (0.32, 0.25, 0.22), (math.radians(-70), 0, math.radians(130)), 0.12, 60, (0.3, 0.85, 0.8))
    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, 0))
    floor = bpy.context.active_object
    fm, fp, _ = principled('Floor')
    fp.inputs['Base Color'].default_value = (0.02, 0.022, 0.025, 1)
    fp.inputs['Roughness'].default_value = 0.35
    floor.data.materials.append(fm)

    cam_d = bpy.data.cameras.new('Cam')
    cam_d.lens = 85
    cam = bpy.data.objects.new('Cam', cam_d)
    bpy.context.collection.objects.link(cam)
    cam.location = (0.0, -0.78, 0.2)
    cam.rotation_euler = (math.radians(82), 0, 0)
    scene.camera = cam
    scene.view_settings.view_transform = 'Standard'   # true label colours (AgX would wash them out)
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 540, 960
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('rendered', path)


if __name__ == '__main__':
    build()
    export()
    if '--render' in sys.argv:
        render(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'preview.png'))
