# NIGHTSHIFT

Casual night-time street racing in the browser. Low-poly, foggy, neon-Japan, early-2000s
console style. Drive a 1999 Nissani Skyliner GT-R (R34), a 2017 Nissani GT-Ar (R35) or a
2009 Dodga Challenjer SRT8 round the Starter Track (a harbour estate at night), the
Underground (Tokyo expressway tunnels) or Parabolica Street (a Monza-shaped Tokyo ring road),
in clear weather, rain, fog or snow, at sunset, night or dawn. Plays on a computer
with a keyboard, or on an iPad with touch controls.

Play: https://davispiero.github.io/nightshift/

## Run it locally

```
./run.sh
```

Then open http://localhost:8793 (it opens by itself). Add `?mute` to the address for no sound,
`?device=computer` or `?device=touch` to skip the menus and drive, `?weather=rain`, `fog` or
`snow` to pick the weather, `?time=sunset` or `dawn` for the time of day, `?track=underground` or
`?track=parabolica` for the other tracks, `?debug` for the F3 panel.

`?library` opens the asset library: every prop the tracks are built from, one at a time
(drag to turn, scroll to zoom, arrow keys to step, L for a work light).

## Controls

All controls are listed (and keys can be changed) in Settings > Controls. The touch
layout can be dragged into place there too.

## Checks

```
./tools/smoke.sh
```

Loads the game headless four times (computer in clear weather, iPad in the rain, the R35
in the Underground, Parabolica Street in snow at dawn), lets a bot drive, then runs the
physics bench (`node tools/drive-bench.mjs`).

Three.js is MIT licensed (`vendor/THREE-LICENSE`). The pixel fonts are Jersey 10 and
DotGothic16 (both SIL Open Font License), loaded from Google Fonts.
