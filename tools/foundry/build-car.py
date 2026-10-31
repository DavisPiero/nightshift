# Builds a car from its blueprint with Blender, no window:
#   Blender -b --python tools/foundry/build-car.py -- miata-na
# Writes GLB/<id>.glb, which tools/capture-car.mjs turns into the game's car
# file, the same way as a bought-in model. Add `render` to also save pictures.

import bpy, importlib.util, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)

args = sys.argv[sys.argv.index('--') + 1:]
car_id = args[0]
bpy.ops.wm.read_factory_settings(use_empty=True)
spec = importlib.util.spec_from_file_location('blueprint', os.path.join(HERE, 'cars', car_id.replace('-', '_') + '.py'))
blueprint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(blueprint)
bp = json.load(open(os.path.join(HERE, 'cars', f'{car_id}.json')))
trace = json.load(open(os.path.join(HERE, 'cars', f'{car_id}-trace.json')))
blueprint.build(bp, trace)

out = os.path.join(ROOT, 'GLB', f'{car_id}.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=False, export_normals=True, export_tangents=False, export_materials='EXPORT', export_image_format='NONE' if False else 'AUTO')
print('wrote', out, os.path.getsize(out) // 1024, 'KB')
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print('triangles', tris)

if 'render' in args:
    import preview
    preview.render(os.path.join(ROOT, 'review/foundry'), car_id)
