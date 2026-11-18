"""Batteribytte · the share image (assets/og.jpg, 1200 × 630): the hero frame of the show, rendered with Cycles.

    .venv-blender/bin/python tools/blender/render_og.py

The opened can on the right, charged (the energy veins glowing), the spray frozen mid-burst in slow motion, cold fog
on a dark floor, teal rims and a warm key like the film; the title on the left in the page's own typeface.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_can as bc  # noqa: E402
import render_spray as rs  # noqa: E402

OUT = os.path.join(bc.ROOT, 'assets', 'og.jpg')
FONT = os.path.join(bc.ROOT, 'fonts', 'ArchivoBlack-400.woff')


def area(name, loc, target, size, power, color):
    l = bpy.data.lights.new(name, 'AREA')
    l.size, l.energy, l.color = size, power, color
    ob = bpy.data.objects.new(name, l)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()   # an area light shines down its −Z
    ob.visible_camera = False                    # no light cards in the shot, only their light
    return ob


def emission_material(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Emission Color'].default_value = (*color, 1)
    p.inputs['Emission Strength'].default_value = strength
    return m


def text(body, size, loc, mat, font):
    cu = bpy.data.curves.new(body, 'FONT')
    cu.body = body
    cu.size = size
    cu.font = font
    cu.extrude = 0.0006
    ob = bpy.data.objects.new(body, cu)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (math.radians(90), 0, 0)
    ob.data.materials.append(mat)
    return ob


def fog():
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.05, 0.2, 0.03))
    cube = bpy.context.active_object
    cube.name = 'Fog'
    cube.scale = (1.1, 0.6, 0.06)
    m = bpy.data.materials.new('FogVol')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    vol = nt.nodes.new('ShaderNodeVolumePrincipled')
    vol.inputs['Color'].default_value = (0.22, 0.55, 0.52, 1)          # the film's teal fog
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 9
    noise.inputs['Detail'].default_value = 4
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector'])
    grad = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], grad.inputs['Vector'])
    fall = nt.nodes.new('ShaderNodeMath'); fall.operation = 'SUBTRACT'
    fall.inputs[0].default_value = 1.0
    nt.links.new(grad.outputs['Z'], fall.inputs[1])                    # denser toward the floor
    wisp = nt.nodes.new('ShaderNodeMath'); wisp.operation = 'POWER'; wisp.inputs[1].default_value = 4.0
    nt.links.new(noise.outputs['Fac'], wisp.inputs[0])                 # contrast: wisps, not a flat layer
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    nt.links.new(wisp.outputs['Value'], mul.inputs[0]); nt.links.new(fall.outputs['Value'], mul.inputs[1])
    ramp = nt.nodes.new('ShaderNodeMath'); ramp.operation = 'MULTIPLY'; ramp.inputs[1].default_value = 9.0
    nt.links.new(mul.outputs['Value'], ramp.inputs[0])
    nt.links.new(ramp.outputs['Value'], vol.inputs['Density'])
    nt.links.new(vol.outputs['Volume'], out.inputs['Volume'])
    cube.data.materials.append(m)


def main():
    root, hinge, hole = bc.build()
    scene = bpy.context.scene
    # the can: right of centre, turned a little so BATTERY reads, opened
    root.location = (0.13, 0, 0)
    root.rotation_euler = (0, 0, math.radians(-14))
    lab = bpy.data.materials['Label'].node_tree.nodes['Principled BSDF']
    lab.inputs['Emission Strength'].default_value = 1.3                 # charged: the veins glow
    rs.spray(root)
    scene.frame_set(8)                                                  # the spray mid-burst, in slow motion

    world = bpy.data.worlds.new('Studio')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.006, 0.01, 0.012, 1)

    bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0))
    floor = bpy.context.active_object
    fm, fp, _ = bc.principled('Floor')
    fp.inputs['Base Color'].default_value = (0.005, 0.006, 0.007, 1)
    fp.inputs['Roughness'].default_value = 0.35
    fp.inputs['Specular IOR Level'].default_value = 0.08   # a dark stage: only a hint of the can's reflection
    floor.data.materials.append(fm)

    can_c = (0.13, 0, 0.09)
    area('Key', (-0.25, -0.4, 0.38), can_c, 0.35, 14, (1, 0.86, 0.66))
    area('RimL', (-0.1, 0.35, 0.22), can_c, 0.1, 22, (0.3, 0.88, 0.82))
    area('RimR', (0.42, 0.3, 0.2), can_c, 0.1, 30, (0.3, 0.88, 0.82))
    area('Glow', (0.13, 0.3, 0.22), (0.13, 0, 0.12), 0.2, 3, (1, 0.6, 0.3))    # warm back glow, like the film
    fog()

    font = bpy.data.fonts.load(FONT)
    white = emission_material('TitleWhite', (0.96, 0.95, 0.93), 1.2)
    grey = emission_material('Kicker', (0.62, 0.64, 0.68), 0.8)
    gold = emission_material('Gold', (0.96, 0.65, 0.29), 2.0)
    text('DET ER TID FOR', 0.0105, (-0.27, -0.05, 0.17), grey, font)
    text('BATTERI', 0.04, (-0.272, -0.05, 0.126), white, font)
    text('BYTTE!', 0.04, (-0.272, -0.05, 0.087), white, font)
    text('ER DU KLAR?', 0.0125, (-0.271, -0.05, 0.058), gold, font)

    cam_d = bpy.data.cameras.new('Cam')
    cam_d.lens = 58
    cam = bpy.data.objects.new('Cam', cam_d)
    bpy.context.collection.objects.link(cam)
    cam.location = (0.0, -1.0, 0.11)
    cam.rotation_euler = (math.radians(88), 0, 0)
    scene.camera = cam

    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 160
    scene.cycles.use_denoising = True
    scene.cycles.volume_bounces = 1
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Punchy'
    scene.render.use_motion_blur = False        # the spray frozen crisp, mid-air
    scene.view_settings.exposure = -0.3
    scene.render.resolution_x, scene.render.resolution_y = 1200, 630
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 88
    scene.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
    print('wrote', OUT)


if __name__ == '__main__':
    main()
