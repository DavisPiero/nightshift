# NIGHTSHIFT

Casual night-time street racing in the browser. Low-poly, foggy, amber-lit, early-2000s
console style. Drive the Kaido R, an original late-90s Japanese coupe, around an
industrial estate at night.

Play: https://davispiero.github.io/nightshift/

## Run it locally

```
./run.sh
```

Then open http://localhost:8793 (it opens by itself). Add `?mute` to the address for no sound.

## Controls (computer)

| Key | Does |
| --- | --- |
| W / Up | Accelerate |
| S / Down | Brake, then reverse when stopped |
| A D / Left Right | Steer |
| Space | Handbrake |
| C | Switch camera (chase / cockpit) |
| R | Put the car back on the road |
| Esc | Pause |
| F3 | Debug panel |

iPad touch controls are the next milestone.

## Checks

```
./tools/smoke.sh
```

Loads the game headless, lets a bot drive, then runs the physics bench
(`node tools/drive-bench.mjs`).

Three.js is MIT licensed (`vendor/THREE-LICENSE`).
