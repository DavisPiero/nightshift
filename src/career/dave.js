// Dave, who owns the lot. He sits in the corner of the Shop and talks: useless
// facts about the car you are looking at, or his life as an Australian car dealer
// in Japan, which he never quite explains. Plain data, no DOM.

const CARS = {
  'impreza-gc8': [
    'That Subaro? Bloke I knew drove one through a sheep. Sheep was fine. Bloke\'s still thinking about it.',
    'Four-wheel drive, mate. Means when you get stuck, you\'re stuck properly.',
    'Blue\'s the fast colour. Scientists won\'t back me on that, but they don\'t sell cars.',
  ],
  'skyliner-r34': [
    'They call the Skyliner Godzilla. I call it Gary. It\'s just friendlier.',
    'Twin turbos on that. One for you, one for the bank.',
    'Had one in here with half a tank of ramen broth. Ran beautifully. Smelled like lunch.',
  ],
  'challenjer-srt8': [
    'That\'s not a car, mate, that\'s a lounge room with a grudge.',
    'American, that one. Corners are more of a suggestion.',
    'Bit thirsty. So was my second wife. Also went sideways on me in the wet.',
  ],
  'mustank-gt500': [
    'Now that\'s got horses. Won\'t tell you how many. Lost count at the weighbridge.',
    'Previous owner only drove it to church. Very fast church. Lot of skid marks in the car park.',
    'Comes with a racing stripe. Stripe is worth about forty k an hour, I reckon.',
  ],
  'countach-qv': [
    'Can\'t see out of it, can\'t park it, can\'t get out of it. Ten out of ten.',
    'Doors go up. Costs nothing extra. Rest of it costs everything extra.',
    'Italian wiring, that. It\'s not a fault, mate, it\'s a mood.',
  ],
};

const FALLBACK = [
  'She\'s a beauty. Not sure what she is, but she\'s a beauty.',
  'One careful owner. Several careless ones after that.',
];

const LIFE = [
  'I came here for a fortnight in ninety-four. Still looking for the airport.',
  'Used to sell boats in Cairns. Then the boats found out.',
  'Don\'t mind the fire. That\'s the heating and the filing system.',
  'Back home I had a ute, a dog and a mortgage. Now I\'ve got the ute.',
  'My Japanese is terrific. Nobody\'s ever told me what I\'ve been saying, but they all bow.',
  'I do a warranty. It\'s me, waving, as you leave.',
  'That cabin\'s an office, a bedroom and, since Tuesday, a legal grey area.',
  'Best sandwich I ever had was in Dubbo in nineteen eighty-eight. Think about it most days.',
  'No worries. I mean that. I\'ve had them removed.',
  'Vending machine\'s got iced coffee in it. And my spare keys. Long story.',
];

// `n` counts up as he talks, so he works through his lines without repeating.
export const daveOnCar = (id, n) => { const l = CARS[id] || FALLBACK; return l[n % l.length]; };
export const daveOnLife = (n) => LIFE[n % LIFE.length];
