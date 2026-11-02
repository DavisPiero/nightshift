// What is new in each update. It arrives on your phone as mail, once per update.
// Change NOTICE and give it a new id with each update. A new player, who has
// nothing to compare with, gets none.

const NOTICE = {
  id: '2026-11-02-notes5',
  subject: 'What’s new',
  lines: [
    'Drifts ease in and out now, with no click.',
    'You just roll up to the line, in every kind of race.',
    'Johnny’s favour is 10% off the muscle cars.',
    'Dave has gone back to his cigarette.',
    'Real rock, bark, concrete and junk at the side of the road.',
    'A Final lap call, and your place jumps when it changes.',
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
