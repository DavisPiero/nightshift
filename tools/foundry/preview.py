# Quick pictures of a car straight from Blender, for checking shape.
import bpy, math, os
from mathutils import Vector

VIEWS = {'side': (6, 0, 0.6), 'front': (0, -7, 0.65), 'rear': (0, 7, 0.75), 'q': (4.2, -5.2, 2.0), 'r': (-4.2, 5.2, 2.2), 'top': (0, 0.001, 8)}


def render(folder, name):
    os.makedirs(folder, exist_ok=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.samples = 24
    s.cycles.device = 'CPU'
    s.cycles.use_denoising = False
    s.render.resolution_x, s.render.resolution_y = 1000, 560
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.58, 0.62, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    s.world = w
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3
    sun.rotation_euler = (0.7, 0.3, 0.6)
    bpy.context.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'
    bpy.context.collection.objects.link(cam)
    s.camera = cam
    for k, p in VIEWS.items():
        cam.location = p
        d = Vector((0, 0, 0.55)) - Vector(p)
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        cam.data.ortho_scale = 4.6
        s.render.filepath = os.path.join(folder, f'{name}-{k}.png')
        bpy.ops.render.render(write_still=True)
