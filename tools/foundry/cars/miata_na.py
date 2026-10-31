# The 1990 roadster, from its reference sheet. Heights and lengths came from
# the sheet's outlines (cars/miata-na-trace.json); the wheels sit where physics
# has them. The sheet's own wheelbase is a little long, so the arches follow
# the game rather than the picture.
#
# A new car is this file again: copy it, name the sheet's views in cars/<id>.json,
# run make-car.sh once to measure the sheet, then set the outlines (TOP, BOT,
# PLAN), the panel gaps and the parts from the sheet. The score it prints says
# how close the outline is. Add the car to tools/car-recipes.mjs and to IDS in
# src/vehicles/captured.js.

import math
import numpy as np
import bpy
import foundry as F
from foundry import pchip, sstep, bump, mat


TOP = [(-1.985, .47), (-1.975, .515), (-1.92, .545), (-1.905, .62), (-1.89, .72), (-1.85, .79), (-1.68, .845), (-1.52, .862), (-1.36, .872), (-1.2, .86), (-.9, .845), (-.4, .825), (.2, .82), (.6, .84), (.81, .85), (.96, .84), (1.11, .82), (1.27, .795), (1.43, .762), (1.58, .712), (1.74, .645), (1.89, .582), (1.955, .535), (1.985, .49)]
BOT = [(-1.985, .44), (-1.95, .33), (-1.83, .27), (-1.68, .25), (-.8, .225), (.8, .225), (1.7, .225), (1.86, .25), (1.955, .36), (1.985, .46)]
PLAN = [(-1.985, .05), (-1.97, .36), (-1.9, .56), (-1.83, .65), (-1.67, .745), (-1.51, .795), (-1.35, .825), (-1.04, .84), (-.56, .828), (.23, .82), (.7, .838), (.95, .85), (1.18, .842), (1.33, .826), (1.49, .787), (1.65, .735), (1.81, .645), (1.9, .54), (1.965, .36), (1.985, .05)]
WIDEST = [(-1.985, .47), (-1.8, .5), (-.8, .52), (.8, .54), (1.7, .55), (1.985, .49)]
NU = [(-1.985, 2.6), (-1.8, 4.4), (-1, 6), (.8, 6), (1.6, 4.6), (1.985, 2.6)]
NL = [(-1.985, 2.6), (-1.7, 4), (-.8, 9), (.8, 9), (1.6, 4.5), (1.985, 2.6)]

# Hood, half, seen from above [x, z].
HOOD = [(0, .9), (.3, .87), (.55, .77), (.675, .66), (.69, .8), (.70, 1.2), (.66, 1.5), (.585, 1.69), (.34, 1.745), (0, 1.76)]
POP = [(.325, 1.46), (.625, 1.46), (.625, 1.725), (.325, 1.725)]
CABIN = [(-.63, -.82), (-.70, -.62), (-.71, 0), (-.69, .5), (-.5, .58), (.5, .58), (.69, .5), (.71, 0), (.70, -.62), (.63, -.82)]
HINGE = (.745, 1.45)  # the pop-ups' pivot [y, z]
LIFT = math.radians(45)


def tub(N=240, M=136):
    top, bot, plan, yw, nu, nl = map(pchip, (TOP, BOT, PLAN, WIDEST, NU, NL))
    u = np.linspace(0, 1, N)
    zs = -1.985 + 3.97 * ((0.5 - 0.5 * np.cos(np.pi * u)) * 0.6 + u * 0.4)
    rings = []
    th = np.linspace(0, 2 * np.pi, 720, endpoint=False)
    for z in zs:
        w, t, b, ym = plan(z), top(z), bot(z), yw(z)
        ym = np.clip(ym, b + 0.25 * (t - b), t - 0.25 * (t - b))
        c, s = np.cos(th), np.sin(th)
        n = np.where(s > 0, nu(z), nl(z))
        x = w * np.sign(c) * np.abs(c) ** (2 / n)
        y = ym + np.where(s > 0, t - ym, ym - b) * np.sign(s) * np.abs(s) ** (2 / n)
        rings.append(F.resample(np.stack([x, y], 1), M))
    P = np.zeros((N, M, 3))
    for i, r in enumerate(rings):
        P[i, :, 0], P[i, :, 1], P[i, :, 2] = r[:, 0], r[:, 1], zs[i]
    return P


def displaced(P):
    # Soft shapes: the things a section can't say.
    a = np.gradient(P, axis=0)
    b = np.gradient(P, axis=1)
    n = np.cross(a, b)
    n /= np.maximum(np.linalg.norm(n, axis=2, keepdims=True), 1e-9)
    if n[120, 0, 0] * P[120, 0, 0] < 0:
        n = -n
    X, y, z = P[..., 0], P[..., 1], P[..., 2]
    x = np.abs(X)
    d = np.zeros_like(x)
    side = sstep(.72, .8, x)
    # Door crease: a soft step low on the side, and the shoulder above it.
    d -= 0.007 * sstep(.475, .445, y) * side * sstep(-1.45, -1.3, z) * sstep(1.45, 1.3, z)
    d += 0.009 * bump(.775, .06, y) * side * sstep(-1.8, -1.2, z) * sstep(1.75, 1.3, z)
    # Bonnet: the long raised centre.
    d += 0.013 * bump(0, .34, X) * bump(1.14, .36, z) * sstep(.6, .7, y)
    # Bumpers: a soft shelf where they meet the body.
    d += 0.014 * sstep(.535, .495, y) * sstep(1.45, 1.75, z)
    d += 0.014 * sstep(.545, .515, y) * sstep(-1.45, -1.75, z)
    return P + n * d[..., None]


def outline_hood():
    half = HOOD
    full = half + [(-x, z) for x, z in half[-2:0:-1]]
    return F.chaikin(full, 2)


def rim_six():
    # The sheet's six-spoke alloy.
    r0, w = .205, .165
    h = w / 2
    prof = [(-h * .1, r0 - .05), (h * .7, r0 - .026), (h * .86, r0 - .022), (h * .95, r0 - .012), (h * 1.02, r0 - .002), (h * 1.06, r0 + .004), (h * 1.0, r0 + .008), (h * .9, r0 + .002), (h * .4, r0 - .012), (-h * .8, r0 - .012), (-h, r0 - .002), (-h * .9, r0 - .04)]
    barrel = F.lathe('rim', prof, 'rim', segs=72)
    hub = F.lathe('rim', [(h * .25, .0), (h * .25, .03), (h * .42, .034), (h * .46, .05), (h * .34, .066), (h * .1, .085), (-h * .5, .09)], 'rim', segs=48)
    nuts = []
    parts = [barrel, hub]
    for i in range(4):
        a = 2 * math.pi * (i + .5) / 4
        nuts.append(F.lathe('metal', [(h * .3, 0), (h * .52, .0), (h * .52, .011), (h * .45, .013), (h * .2, .013)], 'metal', segs=10, at=(0, .055 * math.cos(a), .055 * math.sin(a))))
    parts += nuts
    for i in range(6):
        a = 2 * math.pi * i / 6
        rings = []
        for t in np.linspace(0, 1, 11):
            r = .07 + t * (r0 - .03 - .07)
            half = .03 + .012 * t ** 2 + .01 * bump(0, .3, t)
            bow = h * (.34 + .42 * t ** 1.5)
            thick = .018 - .004 * t
            sec = [(-half, 0), (-half * .86, thick * .7), (-half * .45, thick), (half * .45, thick), (half * .86, thick * .7), (half, 0), (half * .7, -thick * .7), (-half * .7, -thick * .7)]
            ring = []
            for p, q in sec:
                ca, sa = math.cos(a), math.sin(a)
                ring.append((bow + q, r * ca - p * sa, r * sa + p * ca))
            rings.append(ring)
        s = F.loft('rim', rings, 'rim')
        F.fix_normals(s)
        parts.append(s)
    # Disc and calliper turn with the steering, not the wheel: `hub` parts.
    disc = F.lathe('disc', [(-h * .1, .03), (-h * .1, .125), (-h * .3, .125), (-h * .3, .03)], 'disc', segs=48)
    cal = F.loft('caliper', [[(x, y + .10, z - .1) for y, z in [(-.03, -.05), (.03, -.05), (.05, .05), (-.01, .05)]] for x in (-h * .02, -h * .38)], 'caliper')
    F.fix_normals(cal)
    parts += [disc, cal]
    return parts


def build(bp, trace):
    mats(bp)
    (zf, zr) = bp['axles']
    P = displaced(tub())
    body = F.fix_normals(F.loft('body', P, 'paint'))
    ref = F.duplicate(body, 'skin')
    skin = F.Surface(ref)

    # --- The bonnet comes out whole, then gives up its two pop-up lids. ------
    o = outline_hood()
    lid = F.duplicate(body, 'hoodlid')
    F.boolean(lid, F.prism('c', F.offset2d(o, -.003), .45, 1.2, 'bay'), 'INTERSECT')
    F.boolean(body, F.prism('c', F.offset2d(o, .003), .42, 1.3, 'bay'))
    pops = []
    for s in (1, -1):
        out = F.chaikin([(s * x, z) for x, z in POP], 2)
        p = F.duplicate(lid, 'popskin')
        F.boolean(p, F.prism('c', F.offset2d(out[::s], -.0025), .5, 1.2, 'bay'), 'INTERSECT')
        F.boolean(lid, F.prism('c', F.offset2d(out[::s], .0025), .4, 1.3, 'bay'))
        F.keep_slots(p, {'paint'})
        pops.append(p)
    F.keep_slots(lid, {'paint'})

    # --- Openings. -----------------------------------------------------------
    for z in (zf, zr):
        for s in (1, -1):
            ring = [(0.338 * math.cos(a) + z, 0.335 * math.sin(a) + .285) for a in np.linspace(0, 2 * math.pi, 110, endpoint=False)]
            F.boolean(body, F.extrude_x('arch', ring, s * .46, s * 1.1, 'under'))
    F.boolean(body, F.prism('cabin', F.chaikin(CABIN, 2), .3, 1.4, 'carpet'))

    # The mouth, and the slats inside it.
    mouth = [(x, y + .305) for x, y in F.oval(.78, .115, 64, 3.2)]
    F.boolean(body, F.extrude_z('mouth', mouth, 1.72, 2.1, 'black'))

    # --- Panel gaps. ---------------------------------------------------------
    cuts = []
    for s in (1, -1):
        cuts.append(F.gap(skin, [(s * .79, .845, .615), (s * .84, .6, .62), (s * .84, .3, .60), (s * .83, .235, .56)], name='door'))
        cuts.append(F.gap(skin, [(s * .79, .83, -.59), (s * .84, .6, -.56), (s * .84, .3, -.49), (s * .83, .235, -.46)], name='door'))
        # Front bumper: from the arch round to the nose.
        cuts.append(F.gap(skin, [(s * .815, .532, -1.44), (s * .84, .45, -1.46), (s * .84, .36, -1.47)], name='rbump'))
        cuts.append(F.gap(skin, [(s * .60, .85, -1.3), (s * .62, .84, -1.5), (s * .6, .82, -1.75), (s * .5, .77, -1.875), (s * .495, .725, -1.895)], name='trunk'))
    cuts.append(F.seam(skin, .515, .9, -70, 70))
    cuts.append(F.seam(skin, .53, -.9, 180 - 70, 180 + 70))
    cuts.append(F.gap(skin, [(.60, .85, -1.3), (.45, .86, -1.25), (0, .872, -1.22), (-.45, .86, -1.25), (-.60, .85, -1.3)], name='trunk'))
    # The filler flap, on the car's right.
    cuts.append(F.gap(skin, [(-.82 + .0, .79, -1.0), (-.8, .835, -1.05), (-.8, .835, -1.17), (-.82, .79, -1.2)], name='fuel'))
    F.boolean(body, cuts)

    # --- Lamps and recesses. --------------------------------------------------
    extras = []
    for s in (1, -1):
        f = F.on_front(s * .535, .57)
        o2 = F.oval(.3, .072, 40, 3)
        F.boolean(body, F.pocket('c', skin, o2, f, .012, 'black'))
        extras.append(F.panel('amber', skin, F.oval(.14, .05, 28, 3), F.on_front(s * .535, .57), -.006, 'lensamber', .003))
        for dx in (-.11, .11):
            extras.append(F.panel('lens', skin, F.oval(.07, .052, 20, 3), F.on_front(s * .535 + dx, .57), -.006, 'lensclear', .002))
        # Corner indicators, side markers.
        extras.append(F.panel('amber', skin, F.oval(.05, .036, 16, 4), F.on_front(s * .625, .46), .002, 'lensamber', .002))
        extras.append(F.panel('amber', skin, F.oval(.13, .03, 20, 4), F.on_side(s, 1.74, .425), .002, 'lensamber', .002))
        extras.append(F.panel('amber', skin, F.oval(.05, .05, 20), F.on_side(s, .77, .52), .001, 'lensamber', .002))
        extras.append(F.panel('tail', skin, F.oval(.13, .03, 20, 4), F.on_side(s, -1.66, .46), .002, 'tail', .002))

        # Tail lamp: a black oval with three round lenses.
        o3 = F.oval(.33, .155, 56, 2.8)
        r = F.on_rear(s * .505, .645)
        F.boolean(body, F.pocket('c', skin, o3, r, .012, 'black'))
        extras.append(F.panel('tailring', skin, F.oval(.31, .135, 48, 2.8), r, -.006, 'tailring', .001))
        extras.append(F.panel('amber', skin, F.oval(.092, .10, 28), F.on_rear(s * .605, .645), -.004, 'lensamber', .008))
        extras.append(F.panel('tail', skin, F.oval(.092, .106, 28), F.on_rear(s * .505, .645), -.004, 'tail', .009))
        extras.append(F.panel('chrome', skin, F.oval(.092, .10, 28), F.on_rear(s * .405, .645), -.004, 'chrome', .003))
        extras.append(F.panel('white', skin, F.oval(.07, .08, 24), F.on_rear(s * .405, .645), -.001, 'lensclear', .007))

        # Door handle: a chrome pull in a shallow dish.
        h = F.on_side(s, -.455, .715)
        F.boolean(body, F.pocket('c', skin, F.oval(.14, .05, 24, 4), h, .009, 'trim'))
        extras.append(F.panel('chrome', skin, F.oval(.125, .022, 20, 4), h, .002, 'chrome', .004))

    F.boolean(body, F.pocket('c', skin, F.oval(.31, .15, 40, 8), F.on_rear(0, .625), .008, 'black'))
    extras.append(F.panel('plate', skin, F.oval(.27, .115, 40, 8), F.on_rear(0, .625), -.004, 'platedark'))

    # Rocker, chin, slats and exhaust: the black parts underneath.
    for s in (1, -1):
        path = [(s * .775, .205, z) for z in (.82, -.82)]
        extras.append(F.sweep('trim', path, F.rrect(.09, .08, .02), 'trim'))
    chin = [(x, .235, z) for x, z in [(-.6, 1.6), (-.52, 1.74), (-.38, 1.83), (0, 1.875), (.38, 1.83), (.52, 1.74), (.6, 1.6)]]
    extras.append(F.sweep('trim', F.resample(F.chaikin(chin, 2, False), 40, False), F.rrect(.09, .04, .015), 'trim'))
    for y in (.27, .305, .34):
        extras.append(F.sweep('black', [(-.37, y, 1.84), (0, y, 1.87), (.37, y, 1.84)], F.rrect(.012, .012, .004), 'trim'))
    extras.append(F.lathe('chrome', [(-1.945, .0), (-1.945, .034), (-1.94, .042), (-1.935, .044), (-1.8, .044), (-1.8, .0)], 'black', axis='z', segs=28, at=(-.49, .262, 0)))
    extras.append(F.lathe('chrome', [(-1.945, .033), (-1.94, .044), (-1.925, .044), (-1.86, .04)], 'pipe', axis='z', segs=32, at=(-.49, .262, 0)))

    build_screen(skin, extras)
    build_cabin(extras)
    build_top(extras)
    for s in (1, -1):
        extras += build_mirror(s, skin)

    # --- Pop-ups: skin, housing and lamp, all on one hinge. -------------------
    popups = [o for o in pops]
    for s in (1, -1):
        popups += build_pop(s)
    for o in popups:
        o.name = 'pop'

    build_kits(skin, bp)
    F.wheel_set(rim_six, bp['wheelRadius'], .19, 1.41, (zf, zr))
    for o in [body, lid] + pops:
        F.smooth_from(o, ref, {'paint'})
    lid.name = 'bonnet'
    bpy.data.objects.remove(ref)
    for o in bpy.data.objects:
        if o.data.materials and o.data.materials[0].name == 'glass':
            F.face_out(o)


WHEEL = np.array((.37, .79, .215))   # the steering wheel's centre
COLUMN = np.array((0, .36, .933))     # along the column, forward and up
DIALS = {'centre': (.37, .835, .345), 'r': .058, 'gap': .135}


def seat(cx):
    # A low bucket: a cushion, a back with bolsters, a headrest in one piece.
    def sec(w, d, side):
        pts = [(-w / 2, -d / 2), (-w / 2 - .0, d / 2 + side), (-w * .32, d / 2 + side * .7), (-w * .2, d * .24), (w * .2, d * .24), (w * .32, d / 2 + side * .7), (w / 2, d / 2 + side), (w / 2, -d / 2)]
        return [tuple(q) for q in F.resample(F.chaikin(pts, 3), 40)]
    out = []
    # Cushion: up is the seat's face.
    path = [(cx, .365, -.56), (cx, .375, -.4), (cx, .395, -.2), (cx, .41, -.08)]
    q = F.resample(F.chaikin(path, 2, False), 16, False)
    rings = []
    for i, p in enumerate(q):
        t = i / 15
        w = .48 - .1 * t ** 2.4
        rings.append([(p[0] + a, p[1] + b, p[2]) for a, b in sec(w, .10 - .03 * t ** 3, .028)])
    out.append(F.fix_normals(F.loft('seat', rings, 'seat')))
    # Back: from the cushion up, leaning, with the head rest pinched at the top.
    B0 = np.array((cx, .40, -.56))
    lean = np.array((0, .93, -.36))
    side = np.array((0, .36, .93))
    rings = []
    for i in range(30):
        t = i / 29
        p = B0 + lean * (.68 * t)
        k = .48 - .06 * t
        d = .1
        s = .03
        if t > .68:
            n = sstep(.68, .76, t)
            k = k * (1 - .42 * n)
            s *= 1 - n
        if t > .94:
            k *= 1 - .4 * sstep(.94, 1, t)
            d *= 1 - .5 * sstep(.94, 1, t)
        rings.append([tuple(p + np.array((a, 0, 0)) + side * b) for a, b in sec(k, d, s)])
    out.append(F.fix_normals(F.loft('seat', rings, 'seat')))
    return out


def build_kits(skin, bp):
    # Parts the garage can fit. Each is its own group in the car file.
    # Street: a lip, skirts and a rear valance, in paint.
    lip = [(x, .225, z) for x, z in [(-.72, 1.56), (-.62, 1.74), (-.42, 1.87), (0, 1.925), (.42, 1.87), (.62, 1.74), (.72, 1.56)]]
    F.bar_path('paint', lip, F.rrect(.09, .028, .012), 'paint').name = 'kitstreet'
    for s in (1, -1):
        F.bar_path('paint', [(s * .815, .205, .8), (s * .825, .2, 0), (s * .815, .205, -.8)], F.rrect(.06, .1, .025), 'paint').name = 'kitstreet'
    val = [(x, .285, z) for x, z in [(-.7, -1.6), (-.6, -1.78), (-.4, -1.9), (0, -1.945), (.4, -1.9), (.6, -1.78), (.7, -1.6)]]
    F.bar_path('trim', val, F.rrect(.09, .05, .02), 'trim').name = 'kitstreet'
    for x in (-.24, -.08, .08, .24):
        F.bar_path('trim', [(x, .28, -1.86), (x, .235, -1.96)], F.rrect(.012, .05, .004), 'trim').name = 'kitstreet'
    # Widebody: blisters round all four arches, and sills to join them.
    for z in bp['axles']:
        for s in (1, -1):
            rings = []
            N = 48
            for i in range(N + 1):
                t = i / N
                a = math.radians(-8 + 196 * t)
                r = .345
                y = .285 + r * math.sin(a)
                zz = z + r * math.cos(a)
                y0 = max(y, .24)
                hit, _ = skin.side(zz, y0, s)
                x0 = abs(hit[0]) if hit is not None else .82
                k = sstep(0, .08, t) * sstep(1, .92, t)
                ra, rz = math.sin(a), math.cos(a)
                ring = []
                for dr, dx in ((-.002, -.03), (-.002, .04), (.012, .052), (.05, .042), (.1, .018), (.15, -.006), (.15, -.04)):
                    px = s * (x0 + dx * max(k, .15))
                    ring.append((px, .285 + (r + dr) * ra, z + (r + dr) * rz))
                rings.append(ring)
            o = F.loft('paint', rings, 'paint', caps=True)
            F.fix_normals(o).name = 'kitwide'
    for s in (1, -1):
        F.bar_path('paint', [(s * .835, .23, .78), (s * .845, .225, 0), (s * .835, .23, -.78)], F.rrect(.05, .09, .02), 'paint').name = 'kitwide'


def build_cabin(extras):
    bx = F.bar_x
    # Dash: a padded roll across the car, with a lower lip.
    dash = [(.62, .845), (.46, .868), (.335, .858), (.285, .815), (.285, .715), (.33, .63), (.62, .56)]
    dashboard = bx('dash', dash, -.74, .74, 'dash')
    extras.append(dashboard)
    # Binnacle: a hood over the dials.
    dx = DIALS['centre'][0]
    rings = []
    for z, hgt, w in ((.47, .002, .2), (.42, .05, .205), (.37, .078, .21), (.325, .083, .212), (.3, .075, .21)):
        rings.append([(dx + w * math.copysign(abs(math.cos(a)) ** .6, math.cos(a)), .866 + hgt * abs(math.sin(a)) ** .7 - .02, z) for a in np.linspace(0, math.pi, 28)] + [(dx - .2, .78, z), (dx + .2, .78, z)])
    hood = F.fix_normals(F.loft('dash', rings, 'dash'))
    # The dial pit, then the three dials' faces sit in it.
    c = DIALS['centre']
    F.boolean(hood, F.extrude_z('pit', [(dx + a, c[1] + .005 + b) for a, b in F.oval(.37, .135, 40, 3)], .335, .2, 'trim'))
    F.boolean(dashboard, F.extrude_z('pit', [(dx + a, c[1] + .005 + b) for a, b in F.oval(.37, .135, 40, 3)], .345, .2, 'trim'))
    extras.append(hood)
    # Centre: round vents, the radio slot, the heater.
    def vent(x, y, r=.042):
        z = .278
        extras.append(F.lathe('chrome', [(z, r - .006), (z + .001, r + .002), (z + .006, r + .004)], 'trim', axis='z', segs=28, at=(x, y, 0)))
        extras.append(F.lathe('black', [(z + .008, 0), (z + .008, r)], 'black', axis='z', segs=28, at=(x, y, 0)))
        for k in (-.5, 0, .5):
            extras.append(F.sweep('trim', [(x - r * .9, y + k * r, z + .001), (x + r * .9, y + k * r, z + .001)], F.rrect(.004, .012, .001, 1), 'trim', up=(0, 1, 0)))
    for x in (-.55, -.11, .11, .655):
        vent(x, .775)
    extras.append(bx('trim', [(.33, .70), (.283, .70), (.283, .62), (.33, .62)], -.13, .13, 'trim', 1))
    extras.append(bx('black', [(.3, .69), (.279, .69), (.279, .665), (.3, .665)], -.09, .09, 'black', 0))
    # The tunnel between the seats, the gear lever, the handbrake.
    tunnel = [(.58, .46), (.3, .54), (-.2, .46), (-.72, .42), (-.72, .3), (.6, .3)]
    extras.append(bx('console', tunnel, -.11, .11, 'console'))
    extras.append(F.bar_path('console', [(-.0, .50, .08), (0, .50, -.42)], F.rrect(.2, .04, .018), 'console'))
    extras.append(F.lathe('boot', [(.0, .082), (.03, .07), (.06, .036), (.1, .018), (.2, .012)], 'console', axis='y', segs=16, at=(0, .52, .13)))
    extras.append(F.lathe('knob', [(.0, .012), (.008, .02), (.02, .024), (.036, .018), (.04, 0)], 'seat', axis='y', segs=16, at=(0, .71, .13)))
    extras.append(F.bar_path('seat', [(-.08, .5, -.28), (-.08, .545, -.1)], F.rrect(.028, .022, .008), 'seat'))
    # Seats.
    for x in (.37, -.37):
        extras += seat(x)
    # Door cards, and the sill along the top.
    for s in (1, -1):
        c = s * .708
        extras.append(F.bar_path('vinyl', [(s * .72, .845, .5), (s * .715, .85, -.62)], F.rrect(.09, .03, .012), 'trim'))
        card = [(.5, .82), (.5, .34), (-.56, .34), (-.6, .82)]
        extras.append(F.fix_normals(F.loft('vinyl', [[(s * x, y, z) for z, y in F.chaikin(card, 2)] for x in (.70, .714)], 'vinyl', smooth=False)))
        extras.append(F.bar_path('vinyl', [(s * .695, .60, .1), (s * .685, .62, -.1), (s * .695, .61, -.42)], F.rrect(.05, .05, .018), 'trim'))
        extras.append(F.lathe('chrome', [(0, .03), (.002, .032), (.01, .032)], 'chrome', axis='x', segs=18, at=(s * .695, .70, .13) ) if False else F.bar_path('chrome', [(s * .69, .69, .22), (s * .69, .69, .12)], F.rrect(.012, .02, .006), 'chrome'))
        # A speaker in each door.
        extras.append(F.lathe('black', [(0, 0), (0, .07)], 'black', axis='x', segs=24, at=(s * .695, .45, .25)))
    # Pedals and column.
    for x, y0 in ((.26, .36), (.38, .34), (.5, .34)):
        extras.append(F.bar_path('metal', [(x, y0 + .06, .56), (x, y0, .52)], F.rrect(.07, .012, .004), 'pedal', up=(0, .3, -1)))
    a = WHEEL + COLUMN * .05
    b = WHEEL + COLUMN * .24
    extras.append(F.bar_path('console', [tuple(a), tuple(b)], F.oval(.1, .08, 16), 'console', up=(1, 0, 0) if False else (0, 1, 0)))
    build_wheel(extras)
    # Sun visors and the mirror on the header.
    for s in (1, -1):
        extras.append(F.bar_path('fabric', [(s * .12, 1.16, .03), (s * .5, 1.155, .0)], F.rrect(.15, .012, .005), 'vinyl', up=(0, .9, .4)))
    extras.append(F.bar_path('black', [(-.1, 1.14, .08), (.1, 1.14, .08)], F.rrect(.055, .02, .008), 'trim'))
    # The parcel wall behind the seats.
    extras.append(bx('carpet', [(-.7, .84), (-.84, .86), (-.84, .3), (-.7, .3)], -.7, .7, 'carpet', 1))


def build_wheel(extras):
    # The steering wheel, drawn at the origin of its own plane, then placed:
    # three spokes and a plain hub, on its own so it can turn.
    n = F.normalize(COLUMN)
    u = F.normalize(np.cross((0, 1, 0), n))
    v = np.cross(n, u)
    P = lambda a, b, c=0: tuple(WHEEL + u * a + v * b + n * c)
    R, tube = .182, .0155
    rings = []
    for i in range(72):
        t = 2 * math.pi * i / 72
        d = np.array((math.cos(t), math.sin(t)))
        rings.append([P(*(d * (R + tube * math.cos(a))), tube * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 12, endpoint=False)])
    verts = np.array(rings).reshape(-1, 3)
    faces = [(i * 12 + j, ((i + 1) % 72) * 12 + j, ((i + 1) % 72) * 12 + (j + 1) % 12, i * 12 + (j + 1) % 12) for i in range(72) for j in range(12)]
    extras.append(F.fix_normals(F.mesh('steer', verts, faces, 'steer')))
    for ang in (0, 180, 270):
        c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        w = .05 if ang == 270 else .036
        rs = [[P(c * r - s * a, s * r + c * a, .02 * (1 - r / R) + b) for a, b in F.rrect(w, .012, .005, 2)] for r in (.04, R - .004)]
        extras.append(F.fix_normals(F.loft('steer', rs, 'steer')))
    hub = F.oval(.13, .105, 28, 3)
    rs = [[P(a * k, b * k, d) for a, b in hub] for k, d in ((1, .03), (1, -.01), (.9, -.025), (.0, -.03))]
    h = F.loft('steer', rs, 'steer', caps=False)
    extras.append(F.fix_normals(h))


def build_screen(skin, extras):
    # Windscreen: a curved pane in a body-colour frame.
    def S(u, v):
        x = (.685 - .115 * v) * u
        zc = .80 - .69 * v
        bow = .30 - .24 * v
        z = zc - bow * u * u
        y = .845 + .365 * v - (.025 * (1 - v) + .03 * v) * u * u - .035 * v * (1 - v)
        return (x, y, z)
    NV, NU_ = 22, 44
    rings = [[S(-1 + 2 * j / NU_, i / NV) for j in range(NU_ + 1)] for i in range(NV + 1)]
    verts = np.array(rings).reshape(-1, 3)
    faces = [(i * (NU_ + 1) + j, i * (NU_ + 1) + j + 1, (i + 1) * (NU_ + 1) + j + 1, (i + 1) * (NU_ + 1) + j) for i in range(NV) for j in range(NU_)]
    g = F.mesh('glass', verts, faces, 'glass')
    extras.append(g)
    edge = [S(u, 1) for u in np.linspace(1, -1, 34)] + [S(-1, v) for v in np.linspace(1, 0, 18)] + [S(1, v) for v in np.linspace(0, 1, 18)]
    # The frame: a flat band round the glass, standing just proud of it.
    nrm = (0, .85, .5)
    frame_top = [np.array(S(u, 1.01)) + (0, .004, .002) for u in np.linspace(-1.03, 1.03, 40)]
    extras.append(F.sweep('paint', frame_top, F.rrect(.075, .024, .01), 'paint', up=nrm))
    for s in (1, -1):
        pil = [np.array(S(s * 1.04, v)) + (0, .004, .002) for v in np.linspace(.0, 1.0, 20)]
        extras.append(F.sweep('paint', pil, F.rrect(.085, .03, .012), 'paint', up=(s * .3, .82, .48)))
    # Rubber at the foot, cowl and wipers.
    foot = [S(u, 0.02) for u in np.linspace(-1, 1, 40)]
    extras.append(F.sweep('trim', foot, F.rrect(.05, .012, .004), 'trim', up=(0, .85, .5)))
    for x0 in (.42, -.18):
        arm = [(x0 + .0, .875, .73), (x0 - .22, .89, .71), (x0 - .46, .895, .64)]
        extras.append(F.sweep('trim', arm, F.rrect(.012, .012, .004), 'trim'))


def top_ring(z, grow=0.0):
    y_top = pchip([(-1.26, .86), (-1.06, .99), (-.91, 1.085), (-.75, 1.185), (-.6, 1.22), (-.3, 1.232), (-.13, 1.232), (.02, 1.215), (.1, 1.195)])
    w_top = pchip([(-1.26, .6), (-.9, .56), (-.6, .54), (.1, .52)])
    w_low = pchip([(-1.26, .73), (-.9, .74), (-.6, .735), (.1, .70)])
    t = float(y_top(z)) + grow + (.005 * (bump(-.72, .035, z) + bump(-.26, .035, z)) if grow == 0 else 0)
    a, b = float(w_top(z)) + grow, float(w_low(z)) + grow
    base = .80
    pts = []
    n = 3.4
    for i in range(61):
        th = math.pi * i / 60
        c, s = math.cos(th), math.sin(th)
        h = abs(s) ** (2 / n)
        wid = a + (b - a) * (1 - h) ** 1.2
        pts.append((wid * math.copysign(abs(c) ** (2 / n), c), base + (t - base) * h, z))
    return pts


def build_top(extras):
    zs = np.linspace(-1.26, .1, 72)
    outer = F.fix_normals(F.loft('top', [top_ring(z) for z in zs], 'fabric'))
    rib = pchip([(-1.26, 0), (-.72, 0), (-.7, .004), (-.68, 0), (-.28, 0), (-.26, .004), (-.24, 0), (.1, 0)])
    cut = [[(a, 1.05 + b * .72 + k * .72, -.95 + b * .7 - k * .7) for a, b in F.oval(.98, .27, 40, 4.5)] for k in (.2, -.2)]
    F.boolean(outer, F.fix_normals(F.loft('rearwin', cut, 'fabric')))
    # Hollow it: the cabin's air, wider than the ends so the front stays open.
    inner = F.fix_normals(F.loft('c', [[(x, y - .25 if y < .81 else y, z) for x, y, z in top_ring(z, -.016)] for z in np.linspace(-1.23, .3, 40)], 'fabric'))
    inner.name = 'hollow'
    F.boolean(outer, inner)
    # Side windows.
    for s in (1, -1):
        w = [(.13, .86), (.13, 1.1), (.08, 1.165), (-.05, 1.17), (-.5, 1.165), (-.545, 1.14), (-.58, 1.0), (-.57, .82), (.13, .82)]
        F.boolean(outer, F.extrude_x('win', F.chaikin(w, 2), s * .35, s * .95, 'fabric'))
    # Rear window: a real hole in the fabric with a pane laid in it.
    extras.append(outer)
    pane = [[(a, 1.05 + b * .72 + .004, -.95 + b * .7 - .004) for a, b in F.oval(1.0, .29, 40, 4.5)]]
    p2 = [[(x * t, 1.05 + (y - 1.05) * t + .004, -.95 + (z + .95) * t - .004) for x, y, z in pane[0]] for t in (1, .5, .02)]
    extras.append(F.loft('glass', p2, 'glass', caps=False))
    hem = [(x, 1.05 + b * .72 + .012, -.95 + b * .7 - .012) for x, b in F.oval(1.02, .3, 60, 4.5)]
    extras.append(F.sweep('trim', hem, F.rrect(.018, .01, .004), 'trim', closed=True, up=(0, .7, -.7)))
    lo = [(math.copysign(a, x), .808, z) for x, a, z in [(1, .742, .1), (1, .75, -.6), (1, .745, -.95), (1, .72, -1.2), (1, .5, -1.285), (-1, 0, -1.3)]]
    lo = lo[:-1] + [(0, .81, -1.3)] + [(-x, y, z) for x, y, z in lo[-2::-1]]
    extras.append(F.bar_path('trim', lo, F.rrect(.02, .012, .004), 'trim'))
    # Door glass: one pane, leaning in with the top.
    def gx(y):
        return .772 - (y - .84) * .6
    for s in (1, -1):
        g = [(.5, .835), (.1, 1.15), (-.05, 1.18), (-.54, 1.17), (-.6, .83)]
        pts = F.resample(F.chaikin(g, 1), 60)
        c = np.array([0, 1.0])
        rings = []
        for t in (1, .66, .33, .03):
            rings.append([(s * gx(c[1] + (y - c[1]) * t), c[1] + (y - c[1]) * t, c[0] + (z - c[0]) * t) for z, y in pts])
        extras.append(F.loft('glass', rings, 'glass', caps=False))
        # The little divider and the chrome post.
        extras.append(F.sweep('trim', [(s * gx(.84), .84, .03), (s * gx(1.17), 1.17, .085)], F.rrect(.008, .008, .003), 'trim'))
        extras.append(F.sweep('chrome', [(s * gx(.84), .84, -.57), (s * gx(1.03), 1.03, -.585), (s * gx(1.16), 1.16, -.54)], F.rrect(.012, .012, .004), 'chrome'))
        extras.append(F.sweep('trim', [(s * gx(.84), .842, .48), (s * gx(.84), .842, -.6)], F.rrect(.014, .02, .005), 'trim'))
        # Rail along the top of the door.
        extras.append(F.sweep('trim', [(s * gx(1.165), 1.165, .1), (s * gx(1.17), 1.17, -.3), (s * gx(1.16), 1.16, -.53)], F.rrect(.02, .014, .005), 'trim'))
    # The top's rear edge and its two catches.
    for s in (1, -1):
        extras.append(F.sweep('chrome', [(s * .47, .845, -1.27), (s * .47, .875, -1.27)], F.rrect(.012, .012, .004), 'chrome'))


def build_mirror(s, skin):
    c = np.array([s * .865, .885, .135])
    rings = []
    zs = [-.052, -.05, -.04, -.02, 0, .02, .04, .055, .06]
    pw = [.0, .96, 1, .98, .9, .75, .55, .3, 0]
    for k, w in zip(zs, pw):
        rings.append([(c[0] + a * w * 1.0, c[1] + b * w, c[2] + k) for a, b in F.oval(.125, .075, 28, 3.2)])
    shell = F.fix_normals(F.loft('paint', rings, 'paint'))
    gl = F.loft('chrome', [[(c[0] + a, c[1] + b, c[2] - .0525) for a, b in F.oval(.112, .062, 28, 3.2)], [(c[0], c[1], c[2] - .0525)] * 28], 'chrome', caps=False)
    F.fix_normals(gl)
    if gl.data.polygons[0].normal.y < 0:
        gl.data.flip_normals()
    stalk = F.sweep('paint', [(s * .79, .845, .17), (s * .83, .865, .15), (s * .85, .88, .14)], F.rrect(.03, .022, .008), 'paint')
    return [shell, gl, stalk]


def tilt(p):
    # From raised to closed, about the hinge.
    y, z = p[1] - HINGE[0], p[2] - HINGE[1]
    c, s = math.cos(LIFT), math.sin(LIFT)
    return (p[0], HINGE[0] + y * c - z * s, HINGE[1] + y * s + z * c)


def build_pop(s):
    # Drawn raised, then folded shut: a wedge of black housing under the lid,
    # and a round lamp in its face.
    cx = s * .475
    fy, fz = .78, 1.70  # middle of the lamp, raised
    tilted = lambda pts: [tilt(p) for p in pts]
    wedge = [(1.47, .735), (fz, .85), (fz, .695), (1.52, .69)]
    rings = [tilted([(cx + d, y, z) for z, y in wedge]) for d in (-.135, .135)]
    out = [F.fix_normals(F.loft('black', rings, 'black', smooth=False))]
    circle = lambda r, d: [(cx + r * math.cos(a), fy + r * math.sin(a), fz + d) for a in np.linspace(0, 2 * math.pi, 40, endpoint=False)]
    out.append(F.fix_normals(F.loft('trim', [tilted(circle(r, d)) for r, d in ((.094, -.004), (.094, .008), (.086, .012))], 'trim', caps=False)))
    dome = [tilted(circle(.086 * math.cos(t * math.pi / 2) + 1e-3, .012 + .02 * math.sin(t * math.pi / 2))) for t in np.linspace(0, 1, 7)]
    lamp = F.loft('light', dome, 'light', caps=False)
    if np.dot(np.array(F.G(lamp.data.polygons[0].normal)), np.array(tilt((0, 1, 1)))-np.array(tilt((0, 1, 0)))) < 0:
        lamp.data.flip_normals()
    out.append(lamp)
    return out


def mats(bp):
    mat('paint', (.55, .02, .02, 1), .1, .3)
    mat('under', (.01, .01, .01, 1), 0, 1)
    mat('bay', (.01, .01, .01, 1), 0, 1)
    mat('carpet', (.02, .02, .022, 1), 0, .95)
    mat('black', (.01, .01, .01, 1), 0, .9)
    mat('trim', (.012, .013, .014, 1), .2, .55)
    mat('chrome', (.8, .8, .82, 1), 1, .15)
    mat('metal', (.5, .5, .52, 1), .9, .35)
    mat('glass', (.04, .06, .07, .9), 0, .05)
    mat('amber', (.8, .35, .03, 1), 0, .3)
    mat('white', (.9, .9, .88, 1), 0, .2)
    mat('tail', (.5, .02, .02, 1), 0, .3)
    mat('tailring', (.08, .01, .01, 1), 0, .3)
    mat('plate', (.8, .8, .76, 1), 0, .5)
    mat('fabric', (.018, .018, .02, 1), 0, .85)
    mat('light', (.9, .9, .85, 1), 0, .2)
    mat('tyre', (.02, .02, .02, 1), 0, .9)
    mat('rim', (.65, .66, .67, 1), .8, .3)
    mat('disc', (.35, .35, .36, 1), .9, .35)
    mat('caliper', (.04, .04, .045, 1), .3, .45)
    mat('lensamber', (.62, .2, .02, 1), 0, .22)
    mat('lensclear', (.5, .52, .52, 1), .3, .15)
    mat('platedark', (.012, .012, .014, 1), .2, .4)
    mat('pipe', (.2, .2, .21, 1), .6, .5)
    mat('dash', (.028, .028, .03, 1), 0, .7)
    mat('console', (.02, .02, .022, 1), 0, .6)
    mat('seat', (.035, .035, .037, 1), 0, .85)
    mat('vinyl', (.035, .034, .034, 1), 0, .65)
    mat('pedal', (.03, .03, .032, 1), .4, .6)
    mat('steer', (.018, .018, .02, 1), 0, .55)
