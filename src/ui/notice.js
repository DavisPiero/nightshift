// What is new in each update. It arrives on your phone as mail, once per update.
// Change NOTICE and give it a new id with each update. A new player, who has
// nothing to compare with, gets none.

const NOTICE = {
  id: '2026-11-01-notes4-2',
  subject: 'What’s new',
  lines: [
    'New: Analytics on the race laptop. Know who you are up against.',
    'The Shop is now Dave\'s lot. Walk round a car before you buy it.',
    'The Garage has moved onto a laptop, so the car has more room.',
    'No headlights at dawn.',
  ],
};

// Mark this update as arrived, if this save has not had it. A player who has
// never chosen a platform is new, so gets no mail.
export function showNotice(game) {
  const save = game.save;
  if (save.notice === NOTICE.id) return;
  if (save.platform) save.updateMail = NOTICE.id;
  save.notice = NOTICE.id;
  game.saveNow();
  game.screens.phone.refresh();
}

// The update as a message for the inbox, or null.
export const updateMail = (save) => (save.updateMail === NOTICE.id ? { id: NOTICE.id, from: 'NIGHTSHIFT', subject: NOTICE.subject, lines: NOTICE.lines.map((l) => `- ${l}`), text: '' } : null);
