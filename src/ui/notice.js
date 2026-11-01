// What is new in each update. It arrives on your phone as mail, once per update.
// Change NOTICE and give it a new id with each update. A new player, who has
// nothing to compare with, gets none.

const NOTICE = {
  id: '2026-11-01-notes4-3',
  subject: 'What’s new',
  lines: [
    'New track: Yamagiri Pass. Three hairpins up, a ridge under the shrine gates, and a long fast drop home.',
    'Parabolica Street is lined with cherry blossom, the whole way round.',
    'Every Street track is open to race from the start.',
    'New trees and buildings everywhere, and a real city on the horizon.',
    'Dave has moved into his cabin window.',
    'No headlights at sunset either.',
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
