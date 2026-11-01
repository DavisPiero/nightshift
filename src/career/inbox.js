// The mail on your phone. A message arrives when its `when` says so, from what
// the career has done; nothing is stored but which ones you have read (save.read).
// Updates to the game arrive here too (ui/notice.js). No DOM.

import { levelFor } from './career.js';

const won = (c, id) => c.done[id] >= 1;

// Oldest first: the inbox shows the newest at the top.
export const MAIL = [
  { id: 'keys', from: 'Johnny', subject: 'The Subaro', when: (c) => c.seen.includes('intro'),
    text: 'Keys are on the front tyre. Don\'t clean it, the dirt is holding the door on.' },
  { id: 'laptop', from: 'Johnny', subject: 'The laptop', when: (c) => won(c, 'first-run'),
    text: 'I left a laptop in the car. Before each race you can buy parts on it. They last one race and then they\'re worn out. Your kind of thing: work out what\'s worth it.' },
  { id: 'team', from: 'Johnny', subject: 'Old notebook', when: (c) => won(c, 'johnnys-bet'),
    text: 'Found the notebook with my team plans in it. Two cars, six mechanics, one engineer. Needs a driver. Forget I said anything.' },
  { id: 'max-1', from: 'Unknown number', subject: 'hey data kid', when: (c) => won(c, 'harbor-kings'),
    text: 'Johnny gave me your number. Enjoy the harbor while it lasts. -Max' },
  { id: 'office', from: 'Your manager', subject: 'Your reports', when: (c) => won(c, 'junction'),
    text: 'Your reports have been arriving at 11 AM with tyre marks on them. Please see me.' },
  { id: 'max-2', from: 'Max', subject: 'ok', when: (c) => won(c, 'under-city'),
    text: 'Fine. {name}. I learned it.' },
  { id: 'ring', from: 'Johnny', subject: 'Bring a coat', when: (c) => won(c, 'maxs-invite'),
    text: 'The Ring is another world. It\'s wide, it\'s long and everyone there is watching. Stop reading this and sleep.' },
  { id: 'aoi', from: 'Aoi Tachibana', subject: 'Telemetry', when: (c) => won(c, 'watching'),
    text: 'I read the lap notes you left at the desk. Nobody has ever sent me a spreadsheet before. It was good. Level 100.' },
  { id: 'last', from: 'Johnny', subject: 'Tonight', when: (c) => levelFor(c.xp) >= 100,
    text: 'I\'ve set the car up myself. Whatever happens, it was a good year, {name}.' },
];

// The messages you have, newest first. update: the game's update message, if any.
export function inbox(save, update = null) {
  const r = save.career.racer?.name || 'kid';
  const list = MAIL.filter((m) => m.when(save.career)).map((m) => ({ ...m, text: m.text.replaceAll('{name}', r) })).reverse();
  if (update) list.unshift(update);
  return list.map((m) => ({ ...m, read: save.read.includes(m.id) }));
}

export const unread = (save, update) => inbox(save, update).filter((m) => !m.read).length;
