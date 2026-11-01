// Dave's jobs. One at a time, in order, no clock. Each done job is a voucher: 15% off
// any car on the lot, kept until you spend it (contacts.js). A job looks at a
// finished race. He is the merchant; none of it needs doing, all of it pays.
// Plain data, no DOM.

const on = (track) => (r) => r.track === track;
const won = (r) => r.place === 1;

export const QUESTS = [
  { id: 'keys', name: 'Top three at the harbor', ask: 'Vending machine\'s eaten me spare keys, mate. Reckon it scares easy. Get on the podium down at the harbor, loud as you like.',
    done: (r) => on('starter')(r) && r.place <= 3 },
  { id: 'wipers', name: 'Win in the rain', ask: 'Fitted new wipers to the ute and I need to know if rain\'s still a thing. Win a race in it and report back.',
    done: (r) => r.weather === 'rain' && won(r) },
  { id: 'sandwich', name: 'Win on the Underground', ask: 'Bloke in the tunnels owes me a sandwich from nineteen ninety-six. Win down there so he knows I\'ve got connections.',
    done: (r) => on('underground')(r) && won(r) },
  { id: 'insurance', name: 'A clean race, no walls', ask: 'Insurance bloke\'s coming round. Finish a whole race without touching a wall so I can tell him my customers are careful. Top three, or it doesn\'t count.',
    done: (r) => r.hits === 0 && r.place <= 3 },
  { id: 'fog', name: 'Win in the fog', ask: 'Lost me good sunnies in the fog. Don\'t need you to find them. Just win a race in it and I\'ll feel better about the whole thing.',
    done: (r) => r.weather === 'fog' && won(r) },
  { id: 'pie', name: 'Win on Yamagiri Pass', ask: 'Lady at the top of Yamagiri does a pie, if you can believe it. Win up there and tell her Dave says g\'day. She\'ll know what it means. I don\'t.',
    done: (r) => on('mountain')(r) && won(r) },
  { id: 'blossom', name: 'Win on Parabolica', ask: 'Cabin needs brightening up. Win on Parabolica Street and leave the blossom in your grille, I\'ll pick it out meself.',
    done: (r) => on('parabolica')(r) && won(r) },
  { id: 'reputation', name: 'Win on Hard', ask: 'Bloke reckons nobody who buys off me ever won anything. Last job, mate. Win on Hard and we\'ll have a quiet word with him.',
    done: (r) => won(r) && (r.difficulty === 'hard' || r.difficulty === 'impossible') },
];

export const currentQuest = (career) => (career.seen.includes('dave-lot') ? QUESTS[career.quest] ?? null : null);

// A finished race against the job in hand. r: { track, weather, place, hits,
// difficulty }. Returns the job if that race did it.
export function checkQuest(career, r) {
  const q = currentQuest(career);
  if (!q || !q.done(r)) return null;
  career.quest++;
  career.vouchers++;
  return q;
}
