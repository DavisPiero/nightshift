// The four difficulties. `skill` goes to each AI driver (pace, how much of the
// tyres it dares to use, braking, how often it makes mistakes). `band` is the
// rubber band: how far cars ahead of you ease off and cars behind you push.
// `pay` scales CR and XP. `start` is your place on the grid. `edge` is a little
// extra tyre grip: on Impossible the rivals are simply better than the car
// should be. Numbers set on tools/ai-bench.mjs.

export const DIFFICULTY = {
  easy: { name: 'Easy', info: 'Relaxed rivals who wait for you', skill: { pace: 0.86, grip: 0.72, brake: 0.9, mistakes: 2 }, band: { slow: 0.1, push: 0 }, pay: 0.75, start: 4, edge: 1 },
  normal: { name: 'Normal', info: 'A fair fight', skill: { pace: 0.96, grip: 0.78, brake: 1, mistakes: 1 }, band: { slow: 0.05, push: 0.02 }, pay: 1, start: 6, edge: 1 },
  hard: { name: 'Hard', info: 'Quick rivals, and nobody waits', skill: { pace: 1.02, grip: 0.84, brake: 1.1, mistakes: 0.5 }, band: { slow: 0.01, push: 0.03 }, pay: 1.3, start: 8, edge: 1 },
  impossible: { name: 'Impossible', info: 'Hardly a mistake, and more grip than you', skill: { pace: 1.06, grip: 0.9, brake: 1.2, mistakes: 0.1 }, band: { slow: 0, push: 0.03 }, pay: 1.75, start: 8, edge: 1.05 },
};
export const getDifficulty = (id) => DIFFICULTY[id] || DIFFICULTY.normal;
