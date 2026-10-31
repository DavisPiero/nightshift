# Reads a car's reference sheet and measures it: the outlines of the side, top,
# front and rear views, in metres. The car's blueprint names where each view
# sits on the sheet (cars/<id>.json); everything else is measured here.
#   Blender -b --python tools/foundry/trace-sheet.py -- miata-na
# Writes tools/foundry/cars/<id>-trace.json, which build-car.py reads and which
# score-car.py checks the finished car against.

import bpy, json, os, subprocess, sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def load_sheet(path):
    png = os.path.join(bpy.app.tempdir or '/tmp', 'sheet.png')
    subprocess.run(['sips', '-s', 'format', 'png', path, '--out', png], stdout=subprocess.DEVNULL, check=True)
    im = bpy.data.images.load(png)
    w, h = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, im.channels)[::-1]  # top row first
    return px[..., :3]


def crop(px, box):
    x0, y0, x1, y1 = box
    return px[y0:y1, x0:x1]


def car_mask(img, level=0.045):
    # Anything brighter than the sheet's black; holes inside are filled by
    # taking first and last hits per row or column.
    return img.max(axis=2) > level


def red_mask(img):
    return (img[..., 0] > 0.11) & (img[..., 0] > img[..., 1] * 2.2)


def spans(mask, axis):
    # First and last hit along `axis`, NaN where there is none.
    n = mask.shape[axis]
    any_ = mask.any(axis=axis)
    first = mask.argmax(axis=axis).astype(float)
    last = (n - 1 - np.flip(mask, axis=axis).argmax(axis=axis)).astype(float)
    first[~any_] = np.nan
    last[~any_] = np.nan
    return first, last


def smooth(a, k=2):
    out = a.copy()
    for i in range(len(a)):
        w = a[max(0, i - k):i + k + 1]
        w = w[~np.isnan(w)]
        out[i] = w.mean() if len(w) and not np.isnan(a[i]) else np.nan
    return out


def table(xs, ys):
    return [[round(float(x), 3), round(float(y), 3)] for x, y in zip(xs, ys) if not np.isnan(y)]


def main():
    car_id = sys.argv[sys.argv.index('--') + 1]
    bp_path = os.path.join(ROOT, 'tools/foundry/cars', f'{car_id}.json')
    bp = json.load(open(bp_path))
    px = load_sheet(os.path.join(ROOT, bp['sheet']))
    V = bp['views']
    out = {}

    # Side: length sets the scale along the car; ground is the tyres' lowest point.
    img = crop(px, V['side']['box'])
    mask, red = car_mask(img), red_mask(img)
    cols = np.where(red.any(axis=0))[0]
    x0, x1 = cols.min(), cols.max()
    scale = (x1 - x0) / bp['length']
    # Tyres are nearly black; find the ground from the wheels' pale rims, by
    # the sheet's own height: roof to ground is the car's height.
    tops, bots = spans(mask, 0)
    roof = np.nanmin(tops)
    yscale = scale * 1.02
    ground = roof + bp['height'] * yscale
    sign = 1 if V['side']['nose'] == 'left' else -1
    mid = (x0 + x1) / 2
    z = (mid - np.arange(img.shape[1])) * sign / scale
    rt, rb = spans(red, 0)
    out['scale'] = scale
    out['side'] = {
        'top': table(z, smooth((ground - tops) / yscale)),
        'redTop': table(z, smooth((ground - rt) / yscale)),
        'redBottom': table(z, smooth((ground - rb) / yscale)),
    }

    # Top: half width along the car.
    img = crop(px, V['top']['box'])
    red = red_mask(img)
    cols = np.where(red.sum(axis=0) > 6)[0]
    x0, x1 = cols.min(), cols.max()
    s2 = (x1 - x0) / bp['length']
    sign = 1 if V['top']['nose'] == 'left' else -1
    z = (np.arange(img.shape[1]) - (x0 + x1) / 2) * -sign / s2
    a, b = spans(red, 0)
    # Mirrors stick out: the median-filtered half width ignores them.
    half = (b - a) / 2 / s2
    med = np.array([np.nanmedian(half[max(0, i - 6):i + 7]) if not np.isnan(half[i]) else np.nan for i in range(len(half))])
    out['plan'] = table(z, smooth(med))
    out['planScale'] = s2

    # Front and rear: half width by height.
    for name in ('front', 'rear'):
        img = crop(px, V[name]['box'])
        mask = car_mask(img, 0.05)
        a, b = spans(mask, 1)
        rows = np.where(~np.isnan(a))[0]
        rows_top = rows.min()
        hgt = (img.shape[0] - np.arange(img.shape[0]))
        s3 = bp['width'] / bp['length'] * 0 + s2  # same scale as the top view unless the sheet says otherwise
        red = red_mask(img)
        ra, rb = spans(red, 1)
        widest = np.nanmax(rb - ra)
        s3 = widest / bp['width']
        out[name] = {'scale': s3, 'rows': table((rows.max() - np.arange(img.shape[0])) / s3, smooth((b - a) / 2 / s3)),
                     'red': table((rows.max() - np.arange(img.shape[0])) / s3, smooth((rb - ra) / 2 / s3))}

    path = os.path.join(ROOT, 'tools/foundry/cars', f'{car_id}-trace.json')
    json.dump(out, open(path, 'w'))
    print('traced', path, 'side scale', round(scale, 1), 'top', round(s2, 1), 'front', round(out['front']['scale'], 1), 'rear', round(out['rear']['scale'], 1))


main()
