"""Batteribytte · Cycles stills of the pant machine: the poster (first paint) and the light fallback, one per step.

    .venv-blender/bin/python tools/blender/render_stills.py [name ...]     # all by default

Builds the machine (build_machine.py), imports the can (assets/can/battery-can.glb) where each step needs it, and
renders 540 × 960 from the same camera stations the page uses (src/pant.js), into assets/pant/stills/<name>.webp.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_machine as bm  # noqa: E402

OUT = os.path.join(bm.ROOT, 'assets', 'pant', 'stills')
CAN = os.path.join(bm.ROOT, 'assets', 'can', 'battery-can.glb')


def g2b(p):
    """glTF / three.js (x, y, z), Y up, +Z toward the viewer → Blender (x, −z, y)."""
    return Vector((p[0], -p[2], p[1]))


# camera stations, in the page's (three.js) coordinates: position, target, vertical field of view
STATIONS = {
    'start':   ((0.06, 1.2, 2.05), (0.0, 1.12, 0.0), 50),
    'inside':  ((0.15, 1.235, -0.17), (0.0, 1.01, -0.33), 62),
    'button':  ((0.32, 1.02, 0.62), (0.22, 0.95, 0.0), 46),
    'hatch':   ((0.0, 0.62, 1.05), (0.0, 0.33, 0.0), 48),
    'hero':    ((0.0, 0.98, 1.05), (0.0, 0.95, 0.45), 40),
    'finale':  ((0.35, 1.05, 1.9), (0.0, 0.95, 0.2), 48),
    'og':      ((0.95, 1.3, 2.7), (0.1, 1.12, 0.2), 34),
}


def import_can(name, loc, rot=(0, 0, 0), flat=False):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=CAN)
    new = [o for o in bpy.data.objects if o not in before]
    root = [o for o in new if o.parent is None]
    holder = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(holder)
    for o in root:
        o.parent = holder
    for o in new:
        if 'Foam' in o.name or o.name in ('Opening',):
            o.hide_render = True
        if flat and o.type == 'MESH':
            for m in o.data.materials:
                if m and m.use_nodes and 'Principled BSDF' in m.node_tree.nodes:
                    p = m.node_tree.nodes['Principled BSDF']
                    p.inputs['Emission Strength'].default_value = 0.0
                    # the flat battery: drained of colour
                    sat = m.node_tree.nodes.new('ShaderNodeHueSaturation')
                    sat.inputs['Saturation'].default_value = 0.08
                    sat.inputs['Value'].default_value = 0.6
                    links = p.inputs['Base Color'].links
                    if links:
                        src = links[0].from_socket
                        m.node_tree.links.new(src, sat.inputs['Color'])
                        m.node_tree.links.new(sat.outputs['Color'], p.inputs['Base Color'])
    holder.location = g2b(loc)
    holder.rotation_euler = rot
    return holder


def setup_render():
    sc = bpy.context.scene
    world = bpy.data.worlds.new('Night')
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.006, 0.008, 1)
    def area(name, loc, target, size, power, color):
        l = bpy.data.lights.new(name, 'AREA'); l.size, l.energy, l.color = size, power, color
        ob = bpy.data.objects.new(name, l); bpy.context.collection.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        ob.visible_camera = False
    area('Key', (-0.9, -1.4, 2.3), (0, 0, 1.0), 1.2, 70, (0.85, 0.92, 1.0))       # the fluorescent wash, cold
    area('Rim', (1.2, -0.3, 1.6), (0, 0, 1.0), 0.6, 60, (1.0, 0.7, 0.45))          # a warm street light from the side
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 64
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Punchy'
    sc.render.resolution_x, sc.render.resolution_y = 540, 960
    sc.render.image_settings.file_format = 'PNG'


def camera(station):
    pos, tgt, fov = STATIONS[station]
    cam_d = bpy.data.cameras.new('Cam'); cam_d.sensor_fit = 'VERTICAL'; cam_d.angle_y = math.radians(fov)
    cam = bpy.data.objects.new('Cam', cam_d); bpy.context.collection.objects.link(cam)
    cam.location = g2b(pos)
    cam.rotation_euler = (g2b(tgt) - g2b(pos)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam
    return cam


# name: (camera station, cans [(name, position in page coords, Blender rotation, flat?)], objects to hide, extras)
LIE = (-math.pi / 2, 0, 0)                       # lying in the chamber, top into the machine
SHOTS = {
    'start':  ('start', [('Flat', (-0.1, 0.84, 1.2), (0.12, 0.2, math.radians(-12)), True)], ['Receipt', 'Laser1', 'Laser2', 'Laser3'], {}),
    'inside': ('inside', [('Flat', (0, 1.011, -0.33), LIE, True)], ['Receipt'], {'chamber': True}),
    'button': ('button', [], [], {}),
    'hatch':  ('hatch', [('Fresh', (0.04, 0.33, -0.1), (0, -1.15, 0.3), False)], [], {}),
    'hero':   ('hero', [('Fresh', (0, 0.95, 0.45), (0, 0, 0), False)], [], {'glow': 1.2}),
    'finale': ('finale', [('Fresh', (0, 0.95, 0.45), (0, 0, 0.4), False)], [], {'glow': 0.6}),
    # the share image (assets/og.jpg): the machine at night and the fresh, charged can in front of it
    'og':     ('og', [('Fresh', (0.42, 1.0, 1.25), (0, 0, 0.6), False)], [], {'glow': 1.0, 'size': (1200, 630), 'out': 'og'}),
}


def render_shot(name):
    station, cans, hide, extra = SHOTS[name]
    bm.build()
    for c in cans:
        import_can(*c)
    for n in hide:
        if n in bpy.data.objects:
            bpy.data.objects[n].hide_render = True
    if extra.get('chamber'):                       # inside the machine: the lasers' red and a little fill
        for nm, loc, power, col in (('ChamberRed', (0, 0.32, 1.2), 3.0, (1, 0.15, 0.1)), ('ChamberFill', (0.12, 0.2, 1.18), 0.8, (1, 0.95, 0.9))):
            l = bpy.data.lights.new(nm, 'POINT'); l.energy, l.color, l.shadow_soft_size = power, col, 0.02
            ob = bpy.data.objects.new(nm, l); bpy.context.collection.objects.link(ob); ob.location = loc
    if 'glow' in extra:                            # the charged can: its lightning veins lit
        for m in bpy.data.materials:
            if m.use_nodes and 'Principled BSDF' in m.node_tree.nodes and m.name.startswith('Label'):
                m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = extra['glow']
    setup_render()
    if 'size' in extra:
        bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = extra['size']
        bpy.context.scene.cycles.samples = 128
    camera(station)
    os.makedirs(OUT, exist_ok=True)
    png = os.path.join(OUT, name + '.png')
    bpy.context.scene.render.filepath = png
    bpy.ops.render.render(write_still=True)
    from PIL import Image
    if extra.get('out') == 'og':
        Image.open(png).convert('RGB').save(os.path.join(bm.ROOT, 'assets', 'og.jpg'), 'JPEG', quality=86)
    else:
        Image.open(png).convert('RGB').save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=76, method=6)
    os.remove(png)
    print('wrote', name)


if __name__ == '__main__':
    for n in (sys.argv[1:] or list(SHOTS)):
        render_shot(n)
