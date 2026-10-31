# The foundry's tools: everything a car blueprint builds with. Runs inside
# Blender with no window (see build-car.py). A car is made like a car artist
# makes one: smooth body surfaces first, then real cuts for arches, openings
# and panel gaps, then separate parts laid on. All numbers are in car space,
# like src/vehicles/body.js: x left, y up from the road, z forward, metres.
# Materials are named for the game's own slots (see tools/car-recipes.mjs).

import math
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

# --- Curves ---------------------------------------------------------------


def pchip(keys):
    # Smooth curve through [x, y] keys that never overshoots, so a flat bonnet
    # stays flat. Same maths as curve() in body.js.
    keys = sorted(keys)
    xs = np.array([k[0] for k in keys], float)
    ys = np.array([k[1] for k in keys], float)
    n = len(xs)
    h = np.diff(xs)
    d = np.diff(ys) / h
    m = np.zeros(n)
    m[0], m[-1] = d[0], d[-1]
    for i in range(1, n - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])

    def f(x):
        x = np.asarray(x, float)
        c = np.clip(x, xs[0], xs[-1])
        i = np.clip(np.searchsorted(xs, c) - 1, 0, n - 2)
        t = (c - xs[i]) / h[i]
        t2, t3 = t * t, t * t * t
        return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1]
    return f


def sstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def bump(c, r, x):
    # A smooth hill, 1 at c, 0 beyond r.
    t = np.clip(np.abs(np.asarray(x, float) - c) / r, 0, 1)
    return (1 - t * t) ** 2


def chaikin(pts, rounds=2, closed=True):
    # Rounds the corners of a path.
    p = [np.array(q, float) for q in pts]
    for _ in range(rounds):
        out = []
        n = len(p)
        for i in range(n if closed else n - 1):
            a, b = p[i], p[(i + 1) % n]
            out += [a * 0.75 + b * 0.25, a * 0.25 + b * 0.75]
        if not closed:
            out = [p[0]] + out + [p[-1]]
        p = out
    return p


def resample(pts, count, closed=True):
    pts = np.array(pts, float)
    if closed:
        pts = np.vstack([pts, pts[:1]])
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    t = np.linspace(0, s[-1], count + 1 if closed else count)
    if closed:
        t = t[:-1]
    return np.stack([np.interp(t, s, pts[:, i]) for i in range(pts.shape[1])], axis=1)


def offset2d(pts, d):
    # A closed outline moved outward by d (outline runs counter-clockwise).
    p = np.array(pts, float)
    n = len(p)
    out = []
    for i in range(n):
        t = p[(i + 1) % n] - p[i - 1]
        t /= np.linalg.norm(t) or 1
        out.append(p[i] + np.array([t[1], -t[0]]) * d)
    return out


# --- Meshes ---------------------------------------------------------------


def B(p):
    # Car space to Blender space: Blender's glTF export turns it back.
    return (p[0], -p[2], p[1])


def G(p):
    return (p[0], p[2], -p[1])


def mat(name, color=(0.5, 0.5, 0.5, 1), metal=0.0, rough=0.5):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n = next(x for x in m.node_tree.nodes if x.type == 'BSDF_PRINCIPLED')
    n.inputs['Base Color'].default_value = color
    n.inputs['Metallic'].default_value = metal
    n.inputs['Roughness'].default_value = rough
    if color[3] < 1:
        n.inputs['Alpha'].default_value = color[3]
    m.diffuse_color = color
    return m


def mesh(name, verts, faces, material=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([B(v) for v in verts], [], [tuple(int(i) for i in f) for f in faces])
    me.update()
    if material:
        me.materials.append(mat(material) if isinstance(material, str) else material)
    if smooth:
        me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def grid_faces(n, m, wrap_v=True):
    f = []
    for i in range(n - 1):
        for j in range(m if wrap_v else m - 1):
            k = (j + 1) % m
            f.append((i * m + j, (i + 1) * m + j, (i + 1) * m + k, i * m + k))
    return f


def loft(name, rings, material=None, caps=True, flip=False, smooth=True):
    # A skin through closed rings, all the same length.
    rings = np.asarray(rings, float)
    n, m = rings.shape[:2]
    verts = rings.reshape(-1, 3)
    faces = grid_faces(n, m)
    if caps:
        faces.append(tuple(range(m - 1, -1, -1)))
        faces.append(tuple((n - 1) * m + j for j in range(m)))
    if flip:
        faces = [f[::-1] for f in faces]
    return mesh(name, verts, faces, material, smooth)


def sweep(name, path, section, material=None, closed=False, up=(0, 1, 0), scale=None, caps=True):
    # A section (points [a, b]: a sideways, b along `up`) along a path.
    p = np.array(path, float)
    n = len(p)
    rings = []
    for i in range(n):
        t = p[(i + 1) % n] - p[i - 1] if closed else p[min(i + 1, n - 1)] - p[max(i - 1, 0)]
        t /= np.linalg.norm(t) or 1
        side = np.cross(np.array(up, float), t)
        side /= np.linalg.norm(side) or 1
        u = np.cross(t, side)
        k = 1 if scale is None else scale[i]
        rings.append([p[i] + (side * a + u * b) * k for a, b in section])
    rings = np.array(rings)
    if closed:
        m = len(section)
        verts = rings.reshape(-1, 3)
        faces = [(i * m + j, ((i + 1) % n) * m + j, ((i + 1) % n) * m + (j + 1) % m, i * m + (j + 1) % m) for i in range(n) for j in range(m)]
        return mesh(name, verts, faces, material)
    return loft(name, rings, material, caps=caps)


def rrect(w, h, r=0.01, n=4):
    # Rounded rectangle section, counter-clockwise.
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def oval(w, h, n=48, power=2.0):
    # Ellipse, or rounder-cornered with power > 2.
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        c, s = math.cos(a), math.sin(a)
        pts.append((w / 2 * math.copysign(abs(c) ** (2 / power), c), h / 2 * math.copysign(abs(s) ** (2 / power), s)))
    return pts


def lathe(name, profile, material=None, axis='x', segs=48, at=(0, 0, 0), smooth=True):
    # A profile [along, radius] turned round the axis (a wheel's, by default).
    rings = []
    for a, r in profile:
        ring = []
        for j in range(segs):
            th = 2 * math.pi * j / segs
            c, s = math.cos(th) * r, math.sin(th) * r
            ring.append({'x': (a + at[0], c + at[1], s + at[2]), 'z': (c + at[0], s + at[1], a + at[2]), 'y': (c + at[0], a + at[1], s + at[2])}[axis])
        rings.append(ring)
    return loft(name, rings, material, caps=False, smooth=smooth)


def prism(name, outline, y0, y1, material=None):
    # An outline in plan ([x, z], any way round) from height y0 to y1.
    o = np.array(outline, float)
    area = 0.5 * np.sum(o[:, 0] * np.roll(o[:, 1], -1) - np.roll(o[:, 0], -1) * o[:, 1])
    if area > 0:
        o = o[::-1]
    rings = [[(x, y, z) for x, z in o] for y in (y0, y1)]
    return fix_normals(loft(name, rings, material, smooth=False))


def extrude_x(name, outline, x0, x1, material=None):
    # An outline in side view ([z, y]) from x0 to x1.
    o = np.array(outline, float)
    area = 0.5 * np.sum(o[:, 0] * np.roll(o[:, 1], -1) - np.roll(o[:, 0], -1) * o[:, 1])
    if area < 0:
        o = o[::-1]
    rings = [[(x, y, z) for z, y in o] for x in (x0, x1)]
    return fix_normals(loft(name, rings, material, smooth=False))


def extrude_z(name, outline, z0, z1, material=None):
    # An outline in front view ([x, y]) from z0 to z1.
    o = np.array(outline, float)
    area = 0.5 * np.sum(o[:, 0] * np.roll(o[:, 1], -1) - np.roll(o[:, 0], -1) * o[:, 1])
    if area > 0:
        o = o[::-1]
    rings = [[(x, y, z) for x, y in o] for z in (z0, z1)]
    return fix_normals(loft(name, rings, material, smooth=False))


def mirrored(ob):
    # A copy on the car's other side.
    c = ob.copy()
    c.data = ob.data.copy()
    me = c.data
    for v in me.vertices:
        v.co.x = -v.co.x
    me.flip_normals()
    bpy.context.collection.objects.link(c)
    c.name = ob.name + '.R'
    return c


def boolean(ob, cutters, op='DIFFERENCE', keep=False):
    # Real cuts. The cut walls take the cutter's material.
    for c in (cutters if isinstance(cutters, (list, tuple)) else [cutters]):
        mod = ob.modifiers.new('cut', 'BOOLEAN')
        mod.operation = op
        mod.solver = 'EXACT'
        mod.material_mode = 'TRANSFER'
        mod.object = c
        before = len(ob.data.polygons)
        with bpy.context.temp_override(object=ob):
            bpy.ops.object.modifier_apply(modifier=mod.name)
        if op == 'DIFFERENCE' and len(ob.data.polygons) < before * 0.7:
            print('BADCUT', ob.name, c.name, before, len(ob.data.polygons))
        if not keep:
            bpy.data.objects.remove(c)
    return ob


def duplicate(ob, name):
    c = ob.copy()
    c.data = ob.data.copy()
    c.name = name
    bpy.context.collection.objects.link(c)
    return c


class Surface:
    # Lets a part find a body surface: drop a point onto it, follow it.
    def __init__(self, ob):
        dg = bpy.context.evaluated_depsgraph_get()
        self.tree = BVHTree.FromObject(ob, dg)

    def drop(self, x, z, y=3.0, direction=(0, -1, 0)):
        # From high above [x, z], straight down: the point and its normal.
        hit, nor, _, _ = self.tree.ray_cast(Vector(B((x, y, z))), Vector(B(direction)))
        if hit is None:
            return None, None
        return np.array(G(hit)), np.array(G(nor))

    def shoot(self, origin, direction):
        hit, nor, _, _ = self.tree.ray_cast(Vector(B(origin)), Vector(B(direction)))
        if hit is None:
            return None, None
        return np.array(G(hit)), np.array(G(nor))

    def side(self, z, y, sign=1):
        # In from the car's side at [z, y].
        return self.shoot((sign * 2, y, z), (-sign, 0, 0))

    def nearest(self, p):
        loc, nor, _, _ = self.tree.find_nearest(Vector(B(p)))
        return np.array(G(loc)), np.array(G(nor))


def ribbon(name, points, normals, width, depth=0.02, lift=0.015, material='black', closed=False):
    # A thin blade along points on a surface: cut it in and it leaves a panel
    # gap with real walls.
    pts = np.array(points, float)
    nor = np.array(normals, float)
    n = len(pts)
    rings = []
    for i in range(n):
        t = pts[(i + 1) % n] - pts[i - 1] if closed else pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        t /= np.linalg.norm(t) or 1
        u = nor[i] / (np.linalg.norm(nor[i]) or 1)
        s = np.cross(t, u)
        s /= np.linalg.norm(s) or 1
        p = pts[i]
        rings.append([p + s * width / 2 + u * lift, p - s * width / 2 + u * lift, p - s * width / 2 - u * depth, p + s * width / 2 - u * depth])
    rings = np.array(rings)
    m = 4
    verts = rings.reshape(-1, 3)
    if closed:
        faces = [(i * m + j, ((i + 1) % n) * m + j, ((i + 1) % n) * m + (j + 1) % m, i * m + (j + 1) % m) for i in range(n) for j in range(m)]
        ob = mesh(name, verts, faces, material, smooth=False)
    else:
        ob = loft(name, rings, material, smooth=False)
    return fix_normals(ob)


def smooth_from(ob, ref, slots, limit=0.5):
    # Cuts leave long thin triangles, which spoil reflections. Every corner of
    # a face in `slots` that lies on the smooth reference surface takes the
    # surface's own direction instead, so paint stays perfect up to a cut.
    me, rm = ob.data, ref.data
    tree = BVHTree.FromPolygons([v.co.copy() for v in rm.vertices], [tuple(p.vertices) for p in rm.polygons], all_triangles=False)
    names = [m.name for m in me.materials]
    rn = rm.vertex_normals
    loops = [Vector(c.vector) for c in me.corner_normals]
    for poly in me.polygons:
        if names[poly.material_index] not in slots:
            continue
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            loc, nor, idx, dist = tree.find_nearest(co)
            if idx is None or dist > 0.002:
                continue
            n = _surface_normal(rm, rn, idx, loc)
            if n.dot(Vector(poly.normal)) > limit:
                loops[li] = n
    me.normals_split_custom_set([tuple(v) for v in loops])


def _surface_normal(rm, rn, idx, p):
    # The smooth direction at p, inside polygon idx.
    vs = rm.polygons[idx].vertices
    if len(vs) > 4:
        return Vector(rm.polygons[idx].normal)
    tris = [(vs[0], vs[1], vs[2])] + ([(vs[0], vs[2], vs[3])] if len(vs) == 4 else [])
    best, err = None, 1e9
    for t in tris:
        a, b, c = (rm.vertices[i].co for i in t)
        v0, v1, v2 = b - a, c - a, p - a
        d00, d01, d11, d20, d21 = v0.dot(v0), v0.dot(v1), v1.dot(v1), v2.dot(v0), v2.dot(v1)
        den = d00 * d11 - d01 * d01
        if abs(den) < 1e-16:
            continue
        v = (d11 * d20 - d01 * d21) / den
        w = (d00 * d21 - d01 * d20) / den
        u = 1 - v - w
        e = max(0, -u) + max(0, -v) + max(0, -w)
        if e < err:
            err, best = e, (t, u, v, w)
    if best is None:
        return Vector(rm.polygons[idx].normal)
    t, u, v, w = best
    return (rn[t[0]].vector * u + rn[t[1]].vector * v + rn[t[2]].vector * w).normalized()


def normalize(v):
    v = np.array(v, float)
    return v / (np.linalg.norm(v) or 1)


def bar_x(name, section, x0, x1, material=None, rounds=2):
    # A smooth section ([z, y]) run straight across the car.
    sec = F_round(section, rounds)
    rings = [[(x, y, z) for z, y in sec] for x in (x0, x1)]
    return fix_normals(loft(name, rings, material))


def F_round(section, rounds):
    return [tuple(p) for p in chaikin(section, rounds)]


def bar_path(name, path, section, material=None, up=(0, 1, 0), scale=None, rounds=1):
    # A rounded bar along a rounded path.
    p = resample(chaikin(path, 2, False), max(len(path) * 5, 8), False)
    k = None if scale is None else np.interp(np.linspace(0, 1, len(p)), np.linspace(0, 1, len(scale)), scale)
    return fix_normals(sweep(name, p, section, material, up=up, scale=k))


def face_out(ob, centre=(0, .8, -.1)):
    # A single-sided sheet (glass) should face away from the cabin.
    me = ob.data
    c = Vector(B(centre))
    total = sum(p.normal.dot(p.center - c) * p.area for p in me.polygons)
    if total < 0:
        me.flip_normals()
    return ob


def join(obs, name):
    obs = [o for o in obs if o]
    first = obs[0]
    with bpy.context.temp_override(active_object=first, selected_editable_objects=obs, selected_objects=obs):
        bpy.ops.object.join()
    first.name = name
    return first


def fix_normals(ob):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # Thin shapes can fool that: the signed volume never lies.
    vol = bm.calc_volume(signed=True)
    if vol < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    return ob


def keep_slots(ob, slots):
    # Throw away every face whose material is not in `slots` (a panel cut out
    # of the solid body keeps only its skin).
    import bmesh
    names = [m.name for m in ob.data.materials]
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if names[f.material_index] not in slots], context='FACES')
    bm.to_mesh(ob.data)
    bm.free()
    return ob


def snap(surface, points, count=None, closed=False, rounds=2):
    # A rough 3D path, rounded, evened out and laid on a surface: its points
    # and normals, ready for ribbon().
    pts = chaikin(points, rounds, closed)
    pts = resample(pts, count or max(8, int(_length(pts, closed) / 0.012)), closed)
    out, nor = [], []
    for p in pts:
        a, b = surface.nearest(p)
        out.append(a)
        nor.append(b)
    return out, nor


def _length(pts, closed):
    p = np.array(pts)
    d = np.linalg.norm(np.diff(p, axis=0), axis=1).sum()
    return d + (np.linalg.norm(p[0] - p[-1]) if closed else 0)


def gap(surface, points, width=0.006, depth=0.02, closed=False, name='gap', rounds=2):
    pts, nor = snap(surface, points, closed=closed, rounds=rounds)
    return ribbon(name, pts, nor, width, depth, material='black', closed=closed)


def seam(surface, y, zc, a0, a1, width=0.006, depth=0.02, name='seam', count=120):
    # A panel gap level all the way round an end of the car: the body cut by
    # a flat plane at height y, between two directions seen from [0, zc]
    # (0 is straight forward, degrees to the car's left).
    pts, nor = [], []
    for a in np.linspace(math.radians(a0), math.radians(a1), count):
        s, c = math.sin(a), math.cos(a)
        p, n = surface.shoot((s * 4, y, zc + c * 4), (-s, 0, -c))
        if p is not None:
            pts.append(p)
            nor.append(np.array((s, 0, c)))
    return ribbon(name, pts, nor, width, depth, material='black')


def on_front(cx, cy):
    return lambda a, b: ((cx + a, cy + b, 3), (0, 0, -1))


def on_rear(cx, cy):
    return lambda a, b: ((cx - a, cy + b, -3), (0, 0, 1))


def on_side(sign, cz, cy):
    return lambda a, b: ((sign * 3, cy + b, cz + a), (-sign, 0, 0))


def on_top(cx, cz):
    return lambda a, b: ((cx + a, 3, cz + b), (0, -1, 0))


def pocket(name, surface, outline, frame, depth=0.015, material='black', rings=5):
    # A shallow cutter that follows the surface: cut it in and it leaves a
    # recess, for lamps, plates and handles.
    out = np.array(outline, float)
    c = out.mean(axis=0)
    m = len(out)
    verts, faces = [], []
    for a, b in out:
        p, n = surface.shoot(*frame(a, b))
        verts.append(p + n * 0.02)
    for r in range(rings):
        t = r / rings
        for q in out:
            a, b = c + (q - c) * (1 - t)
            p, n = surface.shoot(*frame(a, b))
            verts.append(p - n * depth)
    p, n = surface.shoot(*frame(c[0], c[1]))
    verts.append(p + n * -depth)
    for r in range(rings):
        for j in range(m):
            k = (j + 1) % m
            faces.append((r * m + j, r * m + k, (r + 1) * m + k, (r + 1) * m + j))
    for j in range(m):
        faces.append((rings * m + j, rings * m + (j + 1) % m, len(verts) - 1))
    faces.append(tuple(range(m)))
    return fix_normals(mesh(name, verts, faces, material, smooth=False))


def panel(name, surface, outline, frame, lift=0.002, material='black', dome=0.0, rings=6):
    # A sheet laid on a surface inside an outline: a lens, a badge-free plate.
    out = np.array(outline, float)
    c = out.mean(axis=0)
    verts, nor0 = [], []
    for r in range(rings):
        t = r / rings
        for q in out:
            a, b = c + (q - c) * (1 - t)
            p, n = surface.shoot(*frame(a, b))
            if p is None:
                p, n = surface.shoot(*frame(c[0], c[1]))
            verts.append(p + n * (lift + dome * (1 - (1 - t) ** 2)))
    p, n = surface.shoot(*frame(c[0], c[1]))
    verts.append(p + n * (lift + dome))
    m = len(out)
    faces = []
    for r in range(rings - 1):
        for j in range(m):
            k = (j + 1) % m
            faces.append((r * m + j, (r + 1) * m + j, (r + 1) * m + k, r * m + k))
    last = (rings - 1) * m
    for j in range(m):
        faces.append((last + j, len(verts) - 1, last + (j + 1) % m))
    ob = mesh(name, verts, faces, material)
    # Face outward: the first ring's normal should agree with the surface's.
    me = ob.data
    me.update()
    pf = me.polygons[0]
    if np.dot(np.array(G(pf.normal)), n) < 0:
        me.flip_normals()
    return ob


def wheel_set(rim_fn, tyre_r, tyre_w, track, axles, y=None):
    # Four wheels: the capture finds their corners from the tyres. `rim_fn`
    # makes one left-hand rim at the origin and returns its objects.
    y = tyre_r if y is None else y
    h = tyre_w / 2
    prof = [(-h * .55, tyre_r * .64), (-h * .9, tyre_r * .7), (-h, tyre_r * .8), (-h * .98, tyre_r * .9), (-h * .9, tyre_r * .97), (-h * .78, tyre_r)]
    rs = [-.7, -.42, -.14, .14, .42, .7]
    tread = []
    for c in rs[:-1]:
        q = c + .14
        tread += [(h * c, tyre_r), (h * (q - .02), tyre_r), (h * (q - .015), tyre_r - .007), (h * (q + .015), tyre_r - .007), (h * (q + .02), tyre_r)]
    prof2 = prof + tread + [(h * .7, tyre_r), (h * .78, tyre_r)] + [(-a, r) for a, r in prof[::-1]]
    for z in axles:
        for s in (1, -1):
            t = lathe('tyre', prof2, 'tyre', segs=72)
            parts = [t] + rim_fn()
            for o in parts:
                o.data = o.data.copy()
                me = o.data
                if s < 0:
                    for v in me.vertices:
                        v.co.x = -v.co.x
                    me.flip_normals()
                for v in me.vertices:
                    v.co.x += s * track / 2
                    v.co.y += -z
                    v.co.z += y
