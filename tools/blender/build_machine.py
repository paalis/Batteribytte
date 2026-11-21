"""Batteribytte · the pant machine and its room, built in Blender and exported as glTF (assets/pant/machine.glb).

    .venv-blender/bin/python tools/blender/build_machine.py

A night-time reverse vending machine under the sign «BATTERIBYTTE»: a graphite cabinet with a brushed steel front, a
round hole with a neon ring, a screen, a big green PANT button and a receipt slot, a dispenser hatch with a plexi flap,
teal neon strips; inside, behind the hole, the scanning chamber (two rollers, the red laser fan, the press). A dark
wall with two fluorescent tubes and a concrete floor.

Units are metres, Blender Z up, the front faces −Y (→ +Z in glTF, toward the camera). Objects the page animates keep
fixed names (Screen, HoleRing, Button, Receipt, HatchFlap, Press, Laser*, Roller*, Tube*, Neon*). Screen and Receipt
carry 0–1 UVs so the page can draw onto them.
"""
import math
import os

import bpy
import bmesh

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'pant', 'machine.glb')
FONT = os.path.join(ROOT, 'fonts', 'ArchivoBlack-400.woff')
TEX = os.path.join(ROOT, 'tools', 'blender', 'tex')      # textures generated with Higgsfield (see tex/README.md)

W, D, H = 0.9, 0.7, 1.85          # cabinet
HOLE_Z, HOLE_R = 1.05, 0.07
CH = dict(y0=0.12, y1=0.52, x=0.16, z0=0.92, z1=1.24)     # the scanning chamber (inside)


# ---------------------------------------------------------------- materials
def mat(name, base=(0.5, 0.5, 0.5), metal=0.0, rough=0.5, emit=None, strength=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*base, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if emit:
        p.inputs['Emission Color'].default_value = (*emit, 1)
        p.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    return m


def link(ob, material=None, smooth=False):
    if material:
        ob.data.materials.clear()
        ob.data.materials.append(material)
    if smooth and ob.type == 'MESH':
        for p in ob.data.polygons:
            p.use_smooth = True
    return ob


def tex_mat(name, image, metal=0.0, rough=0.5, emit=0.0, tint=None, alpha=False, extension='REPEAT'):
    """A material from an image: base colour (optionally tinted), its alpha, and the same image as emission."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = bpy.data.images.load(os.path.join(TEX, image))
    t.extension = extension
    col = t.outputs['Color']
    if tint:
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        mix.inputs['B'].default_value = (*tint, 1)
        nt.links.new(col, mix.inputs['A']); col = mix.outputs['Result']
    nt.links.new(col, p.inputs['Base Color'])
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if emit:
        nt.links.new(t.outputs['Color'], p.inputs['Emission Color'])
        p.inputs['Emission Strength'].default_value = emit
    if alpha:
        nt.links.new(t.outputs['Alpha'], p.inputs['Alpha'])
    return m


def planar_uv(ob, ax_u, ax_v, scale_u, scale_v, off_u=0.0, off_v=0.0):
    """UVs projected from the object's own coordinates (axes 0 x, 1 y, 2 z), in metres per tile."""
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new()
    uv = me.uv_layers.active.data
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = ((co[ax_u] - off_u) / scale_u + 0.5, (co[ax_v] - off_v) / scale_v + 0.5)


def box(name, x0, x1, y0, y1, z0, z1, material=None, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (x1 - x0, y1 - y0, z1 - z0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = ob.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return link(ob, material, smooth=False)        # flat: big bevelled boxes shade badly when smoothed


def cyl(name, r, depth, loc, rot=(0, 0, 0), material=None, verts=48, inside=False):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    if inside:                                      # seen from inside: flip normals, drop the caps
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        caps = [f for f in bm.faces if len(f.verts) > 4]
        bmesh.ops.delete(bm, geom=caps, context='FACES')
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
        bm.to_mesh(ob.data)
        bm.free()
    return link(ob, material, smooth=True)


def cut(target, cutter):
    mod = target.modifiers.new('cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def text(name, body, size, loc, material, font, depth=0.004, align='CENTER'):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = body
    cu.size = size
    cu.font = font
    cu.extrude = depth
    cu.align_x = align
    cu.align_y = 'CENTER'
    ob = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (math.radians(90), 0, 0)    # face −Y
    ob.data.materials.append(material)
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    return bpy.context.active_object


def plane_uv(name, w, h, loc, material, rot=(math.radians(90), 0, 0)):
    """A w × h quad facing −Y with 0–1 UVs (u → +x, v → +z)."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name='UVMap')
    for li, (u, v) in zip(range(4), [(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[li].uv = (u, v)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    return link(ob, material)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    font = bpy.data.fonts.load(FONT)

    graphite = mat('Graphite', (0.045, 0.05, 0.058), metal=0.55, rough=0.42)
    steel = mat('Steel', (0.28, 0.3, 0.33), metal=1.0, rough=0.38)
    rubber = mat('Rubber', (0.018, 0.018, 0.02), rough=0.85)
    teal = mat('NeonTeal', (0.02, 0.05, 0.05), emit=(0.31, 0.84, 0.78), strength=4.0)
    gold = mat('NeonGold', (0.1, 0.06, 0.02), emit=(1.0, 0.62, 0.26), strength=5.0)
    green = mat('ButtonGreen', (0.08, 0.7, 0.3), rough=0.3, emit=(0.15, 1.0, 0.45), strength=1.6)
    white = mat('White', (0.92, 0.92, 0.9), rough=0.4, emit=(1, 1, 1), strength=0.6)
    screen = mat('ScreenMat', (0.0, 0.0, 0.0), rough=0.15, emit=(0.0, 0.0, 0.0), strength=1.0)
    paper = mat('Paper', (0.95, 0.94, 0.9), rough=0.85)
    inner = mat('Inner', (0.06, 0.065, 0.07), metal=0.8, rough=0.38)
    red = mat('LaserRed', (0.2, 0.0, 0.0), emit=(1.0, 0.08, 0.06), strength=8.0)
    plexi = mat('Plexi', (0.6, 0.75, 0.8), rough=0.05, alpha=0.28)
    floor_m = tex_mat('Concrete', 'asphalt.webp', rough=0.32, tint=(0.55, 0.57, 0.6))     # wet asphalt
    wall_m = tex_mat('Wall', 'wall.webp', rough=0.8, emit=0.9, tint=(0.6, 0.6, 0.6), extension='EXTEND')      # the backyard wall, its neon in it
    steel_front = tex_mat('SteelFront', 'steel.webp', metal=1.0, rough=0.4, tint=(0.75, 0.78, 0.82))
    tube_m = mat('Fluorescent', (0.9, 0.95, 1.0), emit=(0.85, 0.95, 1.0), strength=6.0)

    # ---- room
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.6, 0))
    floor = bpy.context.active_object; floor.name = 'Floor'; floor.scale = (4.5, 4.0, 1)
    bpy.ops.object.transform_apply(scale=True); link(floor, floor_m)
    planar_uv(floor, 0, 1, 1.1, 1.1)                 # the asphalt tiles every 1.1 m
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, D + 0.06, 1.5), rotation=(math.radians(90), 0, 0))
    wall = bpy.context.active_object; wall.name = 'Wall'; wall.scale = (4.5, 3.0, 1)
    bpy.ops.object.transform_apply(scale=True); link(wall, wall_m)
    planar_uv(wall, 0, 2, 4.0, 2.67, off_v=1.335)    # the picture 4 × 2.67 m round the machine, from the floor up (edges stretched beyond)
    for i, x in enumerate((-0.55, 0.55)):
        cyl(f'Tube{i + 1}', 0.016, 1.0, (x, D + 0.0, 2.35), rot=(0, math.radians(90), 0), material=tube_m, verts=16)

    # ---- cabinet
    body = box('Body', -W / 2, W / 2, 0.02, D, 0, H, graphite)
    front = box('Front', -W / 2 + 0.05, W / 2 - 0.05, -0.012, 0.03, 0.5, 1.58, steel_front)   # no bevel: a flat face reflects cleanly
    planar_uv(front, 0, 2, 0.8, 0.8)
    hole_cut = cyl('cut', HOLE_R, 0.3, (0, 0, HOLE_Z), rot=(math.radians(90), 0, 0))
    cut(front, hole_cut)
    hole_cut2 = cyl('cut2', HOLE_R, 0.2, (0, 0.05, HOLE_Z), rot=(math.radians(90), 0, 0))
    cut(body, hole_cut2)
    # the hole: a rubber collar, the tube in, and the neon ring
    cyl('Collar', HOLE_R + 0.004, 0.03, (0, -0.012, HOLE_Z), rot=(math.radians(90), 0, 0), material=rubber, inside=True)
    cyl('TubeIn', HOLE_R, CH['y0'] + 0.01, (0, CH['y0'] / 2, HOLE_Z), rot=(math.radians(90), 0, 0), material=inner, inside=True)
    bpy.ops.mesh.primitive_torus_add(major_radius=HOLE_R + 0.016, minor_radius=0.006, major_segments=64, minor_segments=12,
                                     location=(0, -0.018, HOLE_Z), rotation=(math.radians(90), 0, 0))
    link(bpy.context.active_object, teal, smooth=True).name = 'HoleRing'

    # sign: a header box with gold letters
    box('SignBox', -W / 2, W / 2, -0.05, 0.05, 1.62, H, graphite, bevel=0.01)
    text('SignText', 'BATTERIBYTTE', 0.085, (0, -0.056, 1.75), gold, font)
    text('SignSub', 'PANT  ·  BYTT  ·  LAD', 0.028, (0, -0.056, 1.665), teal, font, depth=0.002)
    # screen (the page draws its messages here)
    box('ScreenBezel', -0.2, 0.2, -0.03, 0.0, 1.27, 1.5, rubber, bevel=0.006)
    plane_uv('Screen', 0.36, 0.2, (0, -0.032, 1.385), screen)
    # the PANT button and the receipt slot
    cyl('ButtonRim', 0.056, 0.02, (0.27, -0.02, 0.97), rot=(math.radians(90), 0, 0), material=steel)
    cyl('Button', 0.045, 0.03, (0.27, -0.035, 0.97), rot=(math.radians(90), 0, 0), material=green)
    text('ButtonText', 'PANT', 0.022, (0.27, -0.0515, 0.97), white, font, depth=0.001)
    box('Slot', 0.22, 0.32, -0.02, 0.0, 0.855, 0.865, rubber)
    rec = plane_uv('Receipt', 0.08, 0.16, (0, 0, 0), paper)
    # the receipt hangs from the slot: its origin at its top edge
    for v in rec.data.vertices:
        v.co.z -= 0.08
    rec.location = (0.27, -0.022, 0.858)
    # dispenser hatch: a lit recess with a plexi flap hinged at its top
    box('HatchFrame', -0.19, 0.19, -0.025, 0.0, 0.12, 0.44, steel, bevel=0.005)
    box('HatchRecess', -0.16, 0.16, -0.02, 0.24, 0.145, 0.415, inner)
    hollow = box('cutH', -0.165, 0.165, -0.05, 0.22, 0.15, 0.41)
    cut(bpy.data.objects['HatchRecess'], hollow)
    hollow2 = box('cutH2', -0.165, 0.165, -0.05, 0.05, 0.15, 0.41)
    cut(bpy.data.objects['HatchFrame'], hollow2)
    hollow3 = box('cutH3', -0.165, 0.165, -0.05, 0.25, 0.15, 0.41)
    cut(body, hollow3)
    box('HatchLight', -0.15, 0.15, 0.0, 0.01, 0.4, 0.408, teal)
    flap = box('HatchFlap', -0.162, 0.162, -0.006, 0.0, 0.0, 0.26, plexi)
    for v in flap.data.vertices:                    # origin at the hinge (top edge)
        v.co.z -= 0.26
    flap.location = (0, -0.03, 0.415)
    # teal neon strips up the front edges
    for i, x in enumerate((-W / 2 + 0.012, W / 2 - 0.012)):
        box(f'Neon{i + 1}', x - 0.006, x + 0.006, -0.03, -0.018, 0.1, 1.6, teal)

    # ---- inside: the scanning chamber behind the hole
    c = CH
    cham = box('Chamber', -c['x'], c['x'], c['y0'], c['y1'], c['z0'], c['z1'], inner)
    bm = bmesh.new(); bm.from_mesh(cham.data)
    bmesh.ops.reverse_faces(bm, faces=bm.faces[:])   # seen from inside
    front_face = [f for f in bm.faces if abs(f.calc_center_median().y - c['y0']) < 1e-4]
    bmesh.ops.delete(bm, geom=front_face, context='FACES')   # open toward the tube
    bm.to_mesh(cham.data); bm.free()
    roller_z = 0.975
    for i, x in enumerate((-0.036, 0.036)):
        cyl(f'Roller{i + 1}', 0.018, c['y1'] - c['y0'] - 0.04, (x, (c['y0'] + c['y1']) / 2, roller_z),
            rot=(math.radians(90), 0, 0), material=rubber, verts=24)
    box('Press', -0.11, 0.11, c['y0'] + 0.03, c['y1'] - 0.03, 1.19, 1.225, steel, bevel=0.004)
    box('PressRod', -0.012, 0.012, 0.3, 0.34, 1.225, c['z1'], steel)
    for i, a in enumerate((-22, 0, 22)):            # the laser fan, from the scanner in the ceiling
        me = bpy.data.meshes.new(f'Laser{i + 1}')
        top, bot = (0, 0.32, c['z1'] - 0.01), (math.tan(math.radians(a)) * 0.2, 0.32, roller_z - 0.01)
        hw = 0.0015
        me.from_pydata([(top[0] - hw, top[1] - 0.12, top[2]), (top[0] + hw, top[1] - 0.12, top[2]),
                        (bot[0] + hw, bot[1] + 0.12, bot[2]), (bot[0] - hw, bot[1] + 0.12, bot[2])], [], [(0, 1, 2, 3)])
        ob = bpy.data.objects.new(f'Laser{i + 1}', me)
        bpy.context.collection.objects.link(ob)
        link(ob, red)
    box('Scanner', -0.05, 0.05, 0.27, 0.37, c['z1'] - 0.012, c['z1'], rubber)

    # stickers on the front, a little crooked, peeling: the machine has been around (x, z, width, tilt in degrees)
    for name, x, z, w, tilt in (('pant-her', -0.25, 1.2, 0.11, 6), ('ikke-sla', -0.25, 0.74, 0.17, -3),
                                ('lyn', 0.27, 0.6, 0.075, 0), ('maks1', 0.0, 0.86, 0.14, 2)):
        m = tex_mat(f'Sticker-{name}', f'sticker-{name}.png', rough=0.55, alpha=True)
        img = m.node_tree.nodes['Image Texture'].image
        h = w * img.size[1] / img.size[0]
        bpy.ops.mesh.primitive_plane_add(size=1, location=(x, -0.0135, z), rotation=(math.radians(90), math.radians(tilt), 0))
        ob = bpy.context.active_object; ob.name = f'Sticker-{name}'; ob.scale = (w, h, 1)
        bpy.ops.object.transform_apply(scale=True); link(ob, m)

    for ob in bpy.data.objects:
        if ob.type == 'MESH':
            for p in ob.data.polygons:
                if ob.name not in ('Screen', 'Receipt', 'Floor', 'Wall') and not ob.name.startswith('Laser'):
                    pass


def export():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True,
                              export_image_format='WEBP', export_animations=False, export_cameras=False,
                              export_lights=False)
    print('wrote', OUT, os.path.getsize(OUT) // 1024, 'kB')


if __name__ == '__main__':
    build()
    export()
