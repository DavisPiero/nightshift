# NIGHTSHIFT

Casual night-time street racing in the browser. Low-poly, foggy, neon-Japan, early-2000s
console style. Drive a Subaro Impreza WRX STi Coupe, a Nissani Skyliner GT-R, a Dodga Challenjer
SRT Super Stok, a 1969 Fard Mustank Touring Car or a Lamborgino Countash 5000 QV round the Starter Track (a harbour estate at night), the
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

## Credits

Car bodies and cabins are captured from these 3D models (badges and logos removed, sorted into
the game's own materials, see `tools/capture-car.mjs`). All are from Sketchfab, used under Creative
Commons licences. Thank you to the authors.

- [2020 Dodge Challenger SRT Super Stock](https://sketchfab.com/3d-models/2020-dodge-challenger-srt-super-stock-aa90fb46c153459bbf50def4040a0a34)
  by [Outlaw Games](https://sketchfab.com/Outlaw_Games), [CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/)
- **Nissan Skyline R34 GT-R (2002)**
  by [Ddiaz Design](https://sketchfab.com/ddiaz-design), [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- **Ford Mustang John Bowe 1969** and **Lamborghini Countach 5000QV**
  by [vecarz](https://sketchfab.com/heynic), [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)

## Checks

```
./tools/smoke.sh
```

Loads the game headless four times (computer in clear weather, iPad in the rain, the Countash
in the Underground, Parabolica Street in snow at dawn), lets a bot drive, then runs the
physics bench (`node tools/drive-bench.mjs`).

Three.js is MIT licensed (`vendor/THREE-LICENSE`). The pixel fonts are Jersey 10 and
DotGothic16 (both SIL Open Font License), loaded from Google Fonts.
