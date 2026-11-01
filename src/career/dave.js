// Dave, who owns the lot. He leans in his cabin window in the Shop and talks: useless
// facts about the car you are looking at, or his life as an Australian car dealer
// in Japan, which he never quite explains. Plain data, no DOM.

// Every mood on David's sheet (tools/character-sprites.mjs).
export const DAVE_MOODS = ['plain', 'talk', 'bored', 'flat', 'shout', 'aside', 'wink', 'shock', 'think', 'squint', 'thumbs', 'laugh', 'smoke', 'shrug', 'frown', 'facepalm', 'angry', 'shut', 'smirk', 'grin'];

// A line: [mood, words].
const CARS = {
  'impreza-gc8': [
    ['think', 'That Subaro? Bloke I knew drove one through a sheep. Sheep was fine. Bloke\'s still thinking about it.'],
    ['talk', 'Four-wheel drive, mate. Means when you get stuck, you\'re stuck properly.'],
    ['smirk', 'Blue\'s the fast colour. Scientists won\'t back me on that, but they don\'t sell cars.'],
  ],
  'skyliner-r34': [
    ['grin', 'They call the Skyliner Godzilla. I call it Gary. It\'s just friendlier.'],
    ['smirk', 'Twin turbos on that. One for you, one for the bank.'],
    ['shrug', 'Had one in here with half a tank of ramen broth. Ran beautifully. Smelled like lunch.'],
  ],
  'challenjer-srt8': [
    ['laugh', 'That\'s not a car, mate, that\'s a lounge room with a grudge.'],
    ['shrug', 'American, that one. Corners are more of a suggestion.'],
    ['facepalm', 'Bit thirsty. So was my second wife. Also went sideways on me in the wet.'],
  ],
  'mustank-gt500': [
    ['thumbs', 'Now that\'s got horses. Won\'t tell you how many. Lost count at the weighbridge.'],
    ['aside', 'Previous owner only drove it to church. Very fast church. Lot of skid marks in the car park.'],
    ['think', 'Comes with a racing stripe. Stripe is worth about forty k an hour, I reckon.'],
  ],
  'countach-qv': [
    ['thumbs', 'Can\'t see out of it, can\'t park it, can\'t get out of it. Ten out of ten.'],
    ['smirk', 'Doors go up. Costs nothing extra. Rest of it costs everything extra.'],
    ['shrug', 'Italian wiring, that. It\'s not a fault, mate, it\'s a mood.'],
  ],
};

const FALLBACK = [
  ['grin', 'She\'s a beauty. Not sure what she is, but she\'s a beauty.'],
  ['aside', 'One careful owner. Several careless ones after that.'],
];

const LIFE = [
  ['think', 'I came here for a fortnight in ninety-four. Still looking for the airport.'],
  ['squint', 'Used to sell boats in Cairns. Then the boats found out.'],
  ['shrug', 'Don\'t mind the fire. That\'s the heating and the filing system.'],
  ['flat', 'Back home I had a ute, a dog and a mortgage. Now I\'ve got the ute.'],
  ['laugh', 'My Japanese is terrific. Nobody\'s ever told me what I\'ve been saying, but they all bow.'],
  ['wink', 'I do a warranty. It\'s me, waving, as you leave.'],
  ['smoke', 'That cabin\'s an office, a bedroom and, since Tuesday, a legal grey area.'],
  ['bored', 'Best sandwich I ever had was in Dubbo in nineteen eighty-eight. Think about it most days.'],
  ['smirk', 'No worries. I mean that. I\'ve had them removed.'],
  ['aside', 'Vending machine\'s got iced coffee in it. And my spare keys. Long story.'],
];

// `n` counts up as he talks, so he works through his lines without repeating.
const line = ([mood, text]) => ({ mood, text });
export const daveOnCar = (id, n) => { const l = CARS[id] || FALLBACK; return line(l[n % l.length]); };
export const daveOnLife = (n) => line(LIFE[n % LIFE.length]);
