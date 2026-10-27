# Realism audit (Milestone 6, Stage 0, 2026-10-28)

Before shots: scratchpad `before/` (garage x3, Underground with R35, Starter Track with Challenjer). Not committed.

## Cars (built in `vehicles/body.js` from profile curves, details in `car-model.js`)
| Car | References | Status | Main gaps |
|---|---|---|---|
| 1999 Skyliner R34 | none in Reference/ (built from earlier notes) | blocky, round lamps, thin wing | lamp shapes, grille, wheel arches, wing; cockpit gaps |
| 2009 Challenjer SRT8 | `challenger-srt8-sheet.webp` | OK silhouette, flat nose | lamp/grille detail, rear |
| 2017 R35 | `gtr-r35-sheet.webp` | best of the set | rear lamps, bumper vents |
| 2016 Aventadoro SV | none yet (David to supply) | slab bonnet ducts, rear bay is front layout turned round | whole redesign |
| 2020 Mustank GT-500 | none yet (David to supply) | generic coupe, flat rear | whole redesign |
| 1990 Miata | none yet (David to supply) | does not exist | new car + cockpit |

Common: paint and glass already use `MeshPhysicalMaterial` (clearcoat, env map from `reflections.js`, 64px cube). Lamps are unlit `MeshBasicMaterial` plus glow sprites. Wheels, tyres, callipers are `MeshStandardMaterial`. No scratches or dirt. Cabin is `cabin.js` (extruded profiles, folded visors).

## World
- Textures: 16 to 64 px canvases, nearest-filtered (`textures.js`), so close surfaces look chunky even in the smooth renderer.
- Starter Track, Underground, Parabolica Street, garage: all box and lathe geometry from `assets.js` and `scene-kit.js`; matte `Lambert/Standard`. No road normal maps or wet reflections beyond lamp reflections.
- Lighting: dome sky, one moon/sun light, up to 10 lamp point lights, shadows on High only.

## Renderer (before this session)
360 to 720 line render target, nearest-filtered, no MSAA, dither on, bloom on High, hand-written grade, sun glare.

## Missing
Mustang, Aventador and Miata sheets; notice-board reference image.
