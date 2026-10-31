// The story of the career, told in short pixel-art scenes (ui/cutscene.js).
// A scene: { art, lines }. `art` is a picture in assets/story/ and a line can
// change it. A line: { who, text }; `who` is a face from PEOPLE, or missing
// for the narrator.
//
// Johnny grew up in Yokohama and moved to America for the love of cars. His
// garage is on the harbor, in the neon Little Tokyo that grew round the docks;
// the Tokyo tunnels are where he learned, and he takes you back to them.
// Max is the rival, named after the champ.

export const PEOPLE = {
  johnny: { name: 'Johnny', jp: 'ジョニー' },
  max: { name: 'Max', jp: 'マックス' },
  aoi: { name: 'Aoi Tachibana', jp: '橘' },
};

const say = (who, ...texts) => texts.map((text) => ({ who, text }));
const tell = (...texts) => texts.map((text) => ({ text }));

export const SCENES = {
  intro: { art: 'docks', lines: [
    ...tell('4:02 AM. The last container of the night swings down onto the dock.', 'Your shift is over. Your hands smell of diesel. Somewhere behind the cranes, an engine is screaming.'),
    { art: 'garage', who: 'johnny', text: 'So you\'re the one who keeps looking through my window at the Impreza.' },
    ...say('johnny', 'I\'m Johnny. Born in Yokohama. Came to America at nineteen with one suitcase and forty car magazines.', 'Everybody said I was crazy. I just wanted to live where the V8s were.', 'That Subaro needs a driver and I need a reason to stay open. Take it. Bring it back in one piece.', 'They race on the docks after the night shift. Go and see what you\'ve got.'),
  ] },
  'first-run': { art: 'garage', lines: say('johnny', 'You brought it back! And there\'s only a little bit of harbor on it.', 'You drive like someone who\'s got nothing to lose. I like that. It won\'t last.', 'Keep racing. Every CR you win, you can spend at the shop. A good driver in a slow car only goes so far.') },
  'johnnys-story': { art: 'garage', lines: say('johnny', 'See that photo? Me, 1989, sleeping on the floor of a muffler shop in Ohio.', 'I saw my first Mustank in a magazine in Yokohama when I was eleven. I never got over it.', 'People ask if I miss Japan. Sure I do. But you go where the thing you love is. That\'s the whole trick.') },
  'meet-max': { art: 'grid', lines: [
    ...tell('The rain comes in sideways off the water. Forty people are standing round a black car.'),
    ...say('max', 'You\'re Johnny\'s new kid? I heard you beat some taxi drivers.', 'I\'m Max. My dad named me after the greatest driver he ever saw.', 'I\'m trying to be fair to the name. Try to keep up.'),
  ] },
  'max-laughs': { art: 'grid', lines: say('max', 'Not bad. For a dock worker.', 'Call me when you\'ve seen a real tunnel.') },
  'to-tokyo': { art: 'tokyo', lines: [
    ...tell('Johnny closes the shop for the first time in eleven years. Two tickets. One long flight.'),
    ...say('johnny', 'This is where I learned. Under the city, midnight, every car on the road going too fast.', 'I left because I loved American cars. I never said I stopped loving this.', 'Listen to the walls. They tell you when you\'re going fast enough.'),
  ] },
  'old-line': { art: 'tokyo', lines: say('johnny', 'That\'s the line! That\'s my old line through the junction!', 'Thirty years and nobody\'s told those walls I left.') },
  'max-in-tokyo': { art: 'tokyo', lines: say('max', 'You followed me all the way to Tokyo? That\'s sweet.', 'These tunnels are mine now. Nobody has passed me down here all year.', 'You\'ll have to actually beat me this time. Third place won\'t do.') },
  'max-beaten-once': { art: 'tokyo', lines: [
    ...say('max', '...', 'Do that again and I might have to learn your name.'),
    ...say('johnny', 'Did you see his face? I\'m having that framed.'),
  ] },
  'back-home': { art: 'docks', lines: say('johnny', 'We\'re home. And look, they\'ve painted your number on the crane.', 'The harbor knows you now. That means they\'ll all be coming for you.') },
  'max-calls': { art: 'grid', lines: say('max', 'Fine. You\'re real. Let\'s do this properly, in front of everyone, on your own docks.', 'Win, and I\'ll show you where the big names race.') },
  'the-ring': { art: 'ring', lines: say('max', 'They call it the Ring. Long straights, two chicanes, one corner that never ends.', 'Nobody races here for fun. People come here to get noticed.', 'See you out there. Bring something fast.') },
  clipboard: { art: 'ring', lines: [
    ...tell('At the last corner, a person with a clipboard. Not cheering. Writing things down.'),
    ...say('johnny', 'Don\'t look. Don\'t look! ...You looked.', 'That\'s a team scout. GT3 people. They don\'t come to street races. They really don\'t.'),
  ] },
  'meet-aoi': { art: 'ring', lines: say('aoi', 'Aoi Tachibana. Driver development. I\'ve watched nine of your races.', 'You brake late, you make mistakes, and you never give up a corner. Two of those I can fix.', 'I can\'t sign someone from the street on a good story. Show me you\'re the real thing. Level 100. Beat Max.') },
  'johnnys-talk': { art: 'garage', lines: say('johnny', 'I\'ve been thinking about that suitcase. The forty magazines.', 'If you get that call, you go. You hear me? You go where the thing you love is.', 'I\'ll still be here. Somebody has to fix what you break.') },
  'last-night': { art: 'grid', lines: [
    ...tell('The Ring has never been this full. Every crew from the docks, every kid from the tunnels, one person with a clipboard.'),
    ...say('max', 'Whatever happens tonight, you made this fun. I hate that.', 'Ahead of me or it doesn\'t count. That\'s the deal.'),
  ] },
  signed: { art: 'contract', lines: [
    ...say('max', 'That\'s it, then. Go on. Somebody ought to tell them what a dock worker can do.'),
    ...say('aoi', 'Level 100, and you put Max behind you with everyone watching.', 'This is a GT3 contract. Real circuits, real teams. You start Monday.'),
    ...say('johnny', 'Well? Don\'t look at me. I already told you what to do.'),
    { art: 'tbc', text: 'TO BE CONTINUED' },
  ] },
};

// The stages still to come, shown locked on the Career screen.
export const LATER = [
  { name: 'GT3', level: 100, blurb: 'Real circuits, real teams. To be continued.' },
  { name: 'Formula', level: 150, blurb: 'The top of the ladder. To be continued.' },
];
