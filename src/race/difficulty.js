// The four difficulties. `skill` goes to each AI driver (pace, how much of the
// tyres it dares to use, braking, how often it makes mistakes, how far apart
// the field's drivers are: `spread`). `band` is the
// rubber band: how far cars ahead of you ease off and cars behind you push.
// `hunt` is how hard rivals fight to take P1 back from you. `pay` scales CR and XP. `start` is your place on the grid. `edge` is a little
// extra tyre grip: on Impossible the rivals are simply better than the car
// should be. Numbers set on tools/ai-bench.mjs, against a car
// driven at the limit: Hard laps about 1% off it (Arlo's notes, 2026-11-01).

export const DIFFICULTY = {
  easy: { name: 'Easy', info: 'Relaxed rivals who wait for you', hunt: 0.4, skill: { pace: 0.93, grip: 0.8, brake: 1, mistakes: 2, spread: 1 }, band: { slow: 0.08, push: 0 }, pay: 0.75, start: 4, edge: 1 },
  normal: { name: 'Normal', info: 'A fair fight', hunt: 0.7, skill: { pace: 0.975, grip: 0.84, brake: 1.1, mistakes: 1, spread: 0.7 }, band: { slow: 0.03, push: 0.02 }, pay: 1, start: 6, edge: 1 },
  hard: { name: 'Hard', info: 'Quick rivals, and nobody waits', hunt: 1, skill: { pace: 1, grip: 0.87, brake: 1.15, mistakes: 0.5, spread: 0.3 }, band: { slow: 0, push: 0.03 }, pay: 1.3, start: 8, edge: 1 },
  impossible: { name: 'Impossible', info: 'Hardly a mistake, and more grip than you', hunt: 1, skill: { pace: 1, grip: 0.92, brake: 1.25, mistakes: 0.1, spread: 0.15 }, band: { slow: 0, push: 0.03 }, pay: 1.75, start: 8, edge: 1.05 },
};
export const getDifficulty = (id) => DIFFICULTY[id] || DIFFICULTY.normal;
