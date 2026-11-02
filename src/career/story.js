// The story of the career, told in short pixel-art scenes (ui/cutscene.js).
// A scene: { art, lines }. `art` is a picture in assets/story/ and a line can
// change it. A line: { who, text, mood }; `who` is a person from PEOPLE, or
// missing for the narrator. `mood` picks Johnny's expression (the names are in
// tools/character-sprites.mjs). `{name}` in a line is your racer's name and
// `{home}` where they are from. `local` replaces the text for a racer from
// Japan. `ask: 'racer'` stops the scene to make your racer.
//
// It all takes place in Japan. You analyse data for a living and have never
// raced. Johnny is a retired mechanic who moved here from America, and he never
// says where he was born. He wants to engineer and own his own racing team, and
// he thinks you have the talent. Max is the rival, named after the champ.

export const PEOPLE = {
  johnny: { name: 'Johnny', jp: 'ジョニー', sprite: true, voice: 0.3 },
  max: { name: 'Max', jp: 'マックス', voice: 0.55 },
  aoi: { name: 'Aoi Tachibana', jp: '橘', voice: 0.8 },
  dave: { name: 'Dave', jp: 'デイブ', sprite: true, voice: 0.1, rest: 'smoke' },
  sonny: { name: 'Sonny', jp: 'ソニー', voice: 1 },
};

const j = (mood, text, more = {}) => ({ who: 'johnny', mood, text, ...more });
const say = (who, ...texts) => texts.map((text) => ({ who, text }));
const tell = (...texts) => texts.map((text) => ({ text }));

export const SCENES = {
  intro: { art: 'docks', lines: [
    ...tell('4:02 AM. The last report of the night goes out. Forty floors of office, and one lit desk: yours.', 'Rows of numbers all night, every night. Down on the harbor road, an engine is screaming.'),
    { art: 'garage', ...j('aside', 'So you\'re the one who keeps looking through my window at the Impreza.') },
    j('talk', 'I\'m Johnny. Retired mechanic. Came over from America a long time ago. Where I started out doesn\'t matter.'),
    j('think', 'I\'ve seen you up on that car park after work. You\'re timing them, aren\'t you? Every car, every corner.'),
    j('explain', 'That\'s a data analyst for you. You know where they all lose time. You just never tried finding it yourself.'),
    j('smug', 'That Subaro needs a driver, and I think you might be one.'),
    j('explain', 'But the race office wants a name and a flag on the sheet. What do they call you?', { ask: 'racer' }),
    j('thumbs', '{name}, from {home}. A long way to come to stare at spreadsheets.', { local: '{name}. A local! That\'s more than I can say. Now stop staring at spreadsheets.' }),
    j('wrench-grin', 'They race the harbor after midnight. Take the keys. Bring it back in one piece.'),
  ] },
  // For a save that started before you could make a racer.
  paperwork: { art: 'garage', lines: [
    j('explain', 'One thing before you go back out. I never did get your name on the paperwork.'),
    j('talk', 'The race office wants a name and a flag on the sheet. What do they call you?', { ask: 'racer' }),
    j('thumbs', '{name}, from {home}. There. Now you\'re official.', { local: '{name}. A local! There. Now you\'re official.' }),
  ] },
  'first-run': { art: 'garage', lines: [
    j('laugh', 'You brought it back! And there\'s only a little bit of harbor on it.'),
    j('flat', 'You drive like someone who\'s read every number and believed none of them. I like that. It won\'t last.'),
    j('explain', 'Keep racing. Every CR you win, you can spend at the shop. A good driver in a slow car only goes so far.'),
  ] },
  'johnnys-story': { art: 'garage', lines: [
    j('think', 'See that photo? Me, a long time ago, asleep on the floor of a race shop. Forty hours on one engine.'),
    j('calm', 'I fixed cars for other people\'s teams my whole life. Their names on the trucks, my grease on the shirt.'),
    j('smug', 'Retired, they call it. I call it waiting. One day I\'ll run my own team, and I\'ll engineer it myself.'),
    j('wrench-look', 'All it needs is a driver with talent. ...Anyway. Your tyres are done.'),
  ] },
  'meet-max': { art: 'grid', lines: [
    ...tell('The rain comes in sideways off the water. Forty people are standing round a black car.'),
    ...say('max', 'You\'re Johnny\'s new kid? I heard you beat some taxi drivers.', 'I\'m Max. My dad named me after the greatest driver he ever saw.', 'I\'m trying to be fair to the name. Try to keep up.'),
  ] },
  'max-laughs': { art: 'grid', lines: say('max', 'Not bad, for someone who does sums for a living.', 'Call me when you\'ve seen a real tunnel.') },
  'to-tokyo': { art: 'tokyo', lines: [
    ...tell('Johnny shuts the garage for the first time in years. One empty expressway, north into the city.'),
    j('explain', 'This is where I came when I first got to Japan. Under the city, midnight, every car on the road going too fast.'),
    j('calm', 'I didn\'t know a word of Japanese. I didn\'t need it. These tunnels taught me the rest.'),
    j('wrench', 'Listen to the walls, {name}. They tell you when you\'re going fast enough.'),
  ] },
  'the-pass': { art: 'garage', lines: [
    j('smug', 'Bet a man a crate of beer you could beat him up Yamagiri Pass. Three hairpins and a lot of dark.'),
    j('wrench-grin', 'Don\'t make me buy that crate, {name}.'),
  ] },
  'first-look': { art: 'ring', lines: [
    j('aside', 'Night off from the tunnels. I want you to see something.'),
    j('calm', 'That\'s the Ring. Quiet tonight, nobody who matters is here. You\'re not ready for it. Drive it anyway.'),
  ] },
  'old-line': { art: 'tokyo', lines: [
    j('shock', 'That\'s the line! That\'s my old line through the junction!'),
    j('laugh', 'All these years and nobody\'s told those walls I left.'),
  ] },
  'max-in-tokyo': { art: 'tokyo', lines: say('max', 'You followed me all the way to Tokyo? That\'s sweet.', 'These tunnels are mine now. Nobody has passed me down here all year.', 'You\'ll have to actually beat me this time. Third place won\'t do.') },
  'max-beaten-once': { art: 'tokyo', lines: [
    ...say('max', '...', 'Do that again and I might have to learn your name.'),
    j('laugh', 'Did you see his face? I\'m having that framed.'),
  ] },
  'meet-sonny': { art: 'tokyo', lines: [
    ...tell('A tap on the window. A very small man with a very large coffee.'),
    ...say('sonny', 'YOU beat Max! In the tunnels! I saw it! Everyone saw it! I\'m Sonny! Hi!', 'I get people into races. The good ones. The ones that aren\'t on any list because I am the list.', 'One invite a day. Every day. Miss it, it\'s gone, gone, GONE. Five hundred to get in. One try. Podium or nothing.', 'Pays like nothing else in this town. Your phone. Give me your phone. Too late, I\'m already in it.'),
    j('facepalm', '...He does that. He\'s harmless. The races aren\'t.'),
  ] },
  'back-home': { art: 'docks', lines: [
    j('thumbs', 'We\'re back. And look, they\'ve painted your number on the crane.'),
    j('worry', 'The harbor knows you now, {name}. That means they\'ll all be coming for you.'),
  ] },
  'max-calls': { art: 'grid', lines: say('max', 'Fine. You\'re real. Let\'s do this properly, in front of everyone, on your own harbor.', 'Win, and I\'ll show you where the big names race.') },
  'the-ring': { art: 'ring', lines: say('max', 'Been here as a tourist, have you? Tonight it counts. Long straights, two chicanes, one corner that never ends.', 'Nobody races here for fun. People come here to get noticed.', 'See you out there. Bring something fast.') },
  clipboard: { art: 'ring', lines: [
    ...tell('At the last corner, a person with a clipboard. Not cheering. Writing things down.'),
    j('angry', 'Don\'t look. Don\'t look!'),
    j('facepalm', '...You looked.'),
    j('aside', 'That\'s a team scout. GT3 people. They don\'t come to street races. They really don\'t.'),
  ] },
  'meet-aoi': { art: 'ring', lines: say('aoi', 'Aoi Tachibana. Driver development. I\'ve watched nine of your races.', 'You brake late, you make mistakes, and you never give up a corner. Two of those I can fix.', 'I can\'t sign someone from the street on a good story. Show me you\'re the real thing. Level 100. Beat Max.') },
  'johnnys-talk': { art: 'garage', lines: [
    j('down', 'I\'ve been thinking about that scout.'),
    j('sad', 'If she calls, you go. You hear me? Don\'t you stay here on my account.'),
    j('calm', 'My team was always just an old man\'s dream. You\'ve got the real thing.'),
    j('sorry', 'I\'ll still be here. Somebody has to fix what you break.'),
  ] },
  'last-night': { art: 'grid', lines: [
    ...tell('The Ring has never been this full. Every crew from the harbor, every kid from the tunnels, one person with a clipboard.'),
    ...say('max', 'Whatever happens tonight, you made this fun. I hate that.', 'Ahead of me or it doesn\'t count. That\'s the deal.'),
  ] },
  signed: { art: 'contract', lines: [
    ...say('max', 'That\'s it, then. Go on. Somebody ought to tell them what a data analyst can do.'),
    ...say('aoi', 'Level 100, and you put Max behind you with everyone watching.', 'There\'s a seat for you, {name}. Real circuits, real teams. You start Monday.'),
    j('worry', 'Well? Don\'t look at me. I already told you what to do.'),
    ...tell('You read every line. You are good at that. Then you take the pen and add one more.'),
    ...tell('"Race engineer: Johnny. Or no driver."'),
    ...say('aoi', '...You know what you\'re asking? He hasn\'t got a team.'),
    ...tell('You push the contract back across the table.'),
    ...say('aoi', 'Hm. Then I suppose he has one now.'),
    j('shock', 'You... what did you write?'),
    j('thumbs', 'My name. On the truck.'),
    j('wrench-grin', 'Well, {name}? Don\'t just stand there. We\'ve got a team to run.'),
    { art: 'tbc', text: 'TO BE CONTINUED' },
  ] },
};

// The stages still to come, shown locked on the Career screen.
export const LATER = [
  { name: 'GT3', level: 100, blurb: 'Real circuits, real teams. To be continued.' },
  { name: 'Formula', level: 150, blurb: 'The top of the ladder. To be continued.' },
];
