"""Batteribytte · the spray as the can opens: a Blender particle burst rendered with Cycles into a transparent flipbook.

    .venv-blender/bin/python tools/blender/render_spray.py

The camera is the web page's own (lib/can3d.js): 18° vertical field of view, the can 53 % of the frame tall with its
centre at 62.5 %, leaning 0.06 rad toward the camera. The can itself is a holdout, so the drops behind it are cut out
and only the spray is left. The frames are cropped to the region above the can and packed into one sprite sheet:
assets/can/spray.webp (+ spray.json: grid, frame count, fps and the crop as fractions of the 9:16 frame).
"""
import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_can as bc  # noqa: E402

FPS = 24
FRAMES = 24                       # 1 s: frame 1 = the press; the tab lifts over frames 1–10 (build_can «open»)
W, H = 720, 1280                  # the film's frame
CROP = (0.16, 0.84, 0.0, 0.47)    # x0, x1, y0, y1 as fractions of the frame, y from the top
CELL = (240, 230)                 # one flipbook cell, px
COLS = 6


def camera_like_the_page(root):
    fit_h, fit_y, fov = 0.53, 0.625, 18.0
    can_h = bc.H * bc.MM
    vis_h = can_h / fit_h
    dist = vis_h / 2 / math.tan(math.radians(fov) / 2)
    tilt = bpy.data.objects.new('Tilt', None)
    bpy.context.collection.objects.link(tilt)
    tilt.location = (0, 0, (0.5 - fit_y) * vis_h)
    tilt.rotation_euler = (0.06, 0, 0)          # top toward the camera (−Y), like tilt.rotation.x on the page
    root.parent = tilt
    root.location = (0, 0, -can_h / 2)
    cam_d = bpy.data.cameras.new('Cam')
    cam_d.sensor_fit = 'VERTICAL'
    cam_d.angle_y = math.radians(fov)
    cam = bpy.data.objects.new('Cam', cam_d)
    bpy.context.collection.objects.link(cam)
    cam.location = (0, -dist, 0)
    cam.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.scene.camera = cam
    return cam


def lights():
    def sun(name, rot, power, color):
        l = bpy.data.lights.new(name, 'SUN')
        l.energy, l.color, l.angle = power, color, math.radians(3)
        ob = bpy.data.objects.new(name, l)
        bpy.context.collection.objects.link(ob)
        ob.rotation_euler = rot
    # the page's key (warm, upper left front) and two teal rims from behind
    sun('Key', (math.radians(40), 0, math.radians(-35)), 3.5, (1, 0.89, 0.72))
    sun('Rim', (math.radians(-60), 0, math.radians(135)), 4.0, (0.31, 0.84, 0.78))
    sun('Rim2', (math.radians(-70), 0, math.radians(-130)), 2.0, (0.31, 0.84, 0.78))
    world = bpy.data.worlds.new('Dark')
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.04, 0.045, 1)


def liquid_material():
    m, p, _ = bc.principled('Spray')
    p.inputs['Base Color'].default_value = (1.0, 0.72, 0.5, 1)       # the drink: pale peach, like the label's gradient
    p.inputs['Roughness'].default_value = 0.08
    p.inputs['Coat Weight'].default_value = 0.6
    p.inputs['Subsurface Weight'].default_value = 0.4
    p.inputs['Emission Color'].default_value = (1.0, 0.78, 0.55, 1)
    p.inputs['Emission Strength'].default_value = 0.5                # reads against the dark fog
    return m


def spray(root):
    # emitter: a small disc in the opening (front of the lid, under the tab's nose)
    bpy.ops.mesh.primitive_circle_add(vertices=24, radius=5 * bc.MM, fill_type='NGON',
                                      location=(0, -11.5 * bc.MM, 165.0 * bc.MM))
    em = bpy.context.active_object
    em.name = 'SprayEmitter'
    em.parent = root
    # (hiding the emitter from the render would hide its particles too: only the emitter's own faces are switched off)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=(0, 0, -5))
    drop = bpy.context.active_object
    drop.name = 'Drop'
    drop.data.materials.append(liquid_material())
    for p in drop.data.polygons:
        p.use_smooth = True
    # the source drop sits far below the frame; the particles are its copies

    mod = em.modifiers.new('Spray', 'PARTICLE_SYSTEM')
    ps = mod.particle_system.settings
    ps.count = 900
    ps.frame_start, ps.frame_end = 3, 8          # the burst: as the tab passes its highest point
    ps.lifetime = 60
    ps.emit_from = 'FACE'
    ps.normal_factor = 1.25                      # up, m/s
    ps.factor_random = 0.55
    ps.object_align_factor = (0, -0.35, 0)       # a little toward the camera (out over the front of the can)
    ps.render_type = 'OBJECT'
    ps.instance_object = drop
    ps.particle_size = 0.0016
    ps.size_random = 0.7
    ps.time_tweak = 0.45                         # slow motion: the hero beat of the page
    ps.use_rotations = False
    ps.effector_weights.gravity = 1.0
    em.show_instancer_for_render = False         # the disc itself does not render, its particles do
    return em


def render():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = 0.3
    scene.view_settings.view_transform = 'Standard'
    scene.render.resolution_x, scene.render.resolution_y = W, H
    scene.render.use_border = True
    scene.render.use_crop_to_border = True
    x0, x1, y0, y1 = CROP
    scene.render.border_min_x, scene.render.border_max_x = x0, x1
    scene.render.border_min_y, scene.render.border_max_y = 1 - y1, 1 - y0     # Blender's border runs bottom-up
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.frame_start, scene.frame_end = 1, FRAMES
    tmp = os.path.join(bc.ROOT, 'tools', 'blender', '_spray')
    os.makedirs(tmp, exist_ok=True)
    paths = []
    for f in range(1, FRAMES + 1):
        scene.frame_set(f)
        scene.render.filepath = os.path.join(tmp, f'{f:03d}.png')
        bpy.ops.render.render(write_still=True)
        paths.append(scene.render.filepath)
        print('frame', f, flush=True)
    return paths


def sheet(paths):
    from PIL import Image                        # pip install pillow (next to bpy)
    rows = math.ceil(len(paths) / COLS)
    cw, ch = CELL
    big = Image.new('RGBA', (COLS * cw, rows * ch), (0, 0, 0, 0))
    for k, p in enumerate(paths):
        cell = Image.open(p).convert('RGBA').resize((cw, ch), Image.LANCZOS)
        r, c = divmod(k, COLS)
        big.paste(cell, (c * cw, r * ch))
    out = os.path.join(bc.OUT_DIR, 'spray.webp')
    big.save(out, 'WEBP', quality=82, method=6)
    meta = dict(cols=COLS, rows=rows, frames=len(paths), fps=FPS, cell=CELL,
                crop=dict(x0=CROP[0], x1=CROP[1], y0=CROP[2], y1=CROP[3]))
    with open(os.path.join(bc.OUT_DIR, 'spray.json'), 'w') as fh:
        json.dump(meta, fh, indent=1)
    print('wrote spray sheet', out, os.path.getsize(out) // 1024, 'kB')


if __name__ == '__main__':
    root, hinge, hole = bc.build()
    for ob in bpy.context.scene.objects:          # the can is a holdout: it hides the drops behind it, renders nothing
        if ob.type == 'MESH':
            ob.is_holdout = True
    camera_like_the_page(root)
    lights()
    spray(root)
    sheet(render())
