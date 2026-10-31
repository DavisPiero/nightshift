# How close a built car is to its reference sheet: the finished model's outline
# against the traced one, from the side and from above. Reports the average
# miss in centimetres, and a match percentage (100 = every outline point within
# a sheet pixel, about 1 cm; each further centimetre of average miss costs 4).

import json, os
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def table(rows, xs):
    a = np.array(sorted(rows))
    return np.interp(xs, a[:, 0], a[:, 1])


def score(path, length):
    t = json.load(open(path))
    verts, polys = [], []
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        base = len(verts)
        verts += [v.co.copy() for v in o.data.vertices]
        polys += [tuple(i + base for i in p.vertices) for p in o.data.polygons]
    tree = BVHTree.FromPolygons(verts, polys, all_triangles=False)
    zs = np.arange(-length / 2 + .08, length / 2 - .08, .05)
    # Side: the highest thing at each station.
    side = []
    for z in zs:
        y = None
        for x in np.arange(-.9, .91, .06):
            hit = tree.ray_cast(Vector((x, -z, 3)), Vector((0, 0, -1)))[0]
            if hit is not None and (y is None or hit.z > y):
                y = hit.z
        side.append(y if y is not None else 0)
    side = np.array(side)
    # Top: the widest thing at each station, leaving out the mirrors' stations.
    plan = []
    for z in zs:
        x = 0
        for y in np.arange(.2, 1.0, .03):
            hit = tree.ray_cast(Vector((2, -z, y)), Vector((-1, 0, 0)))[0]
            if hit is not None:
                x = max(x, hit.x)
        plan.append(x)
    plan = np.array(plan)
    keep = np.abs(zs - .135) > .14  # mirrors stick out
    e1 = np.abs(side - table(t['side']['top'], zs))
    e2 = np.abs(plan - table(t['plan'], zs))[keep]
    miss = (e1.mean() + e2.mean()) / 2 * 100
    pct = max(0, 100 - max(0, miss - 1) * 4)
    print(f'SCORE side outline {e1.mean() * 100:.1f} cm (worst {e1.max() * 100:.1f}), top outline {e2.mean() * 100:.1f} cm (worst {e2.max() * 100:.1f}), match {pct:.0f}%')
