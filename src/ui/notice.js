// What is new in each update. It arrives on your phone as mail, once per update.
// Change NOTICE and give it a new id with each update. A new player, who has
// nothing to compare with, gets none.

const NOTICE = {
  id: '2026-11-02-notes4-4',
  subject: 'What’s new',
  lines: [
    'Your phone has Contacts. Johnny does favours, Dave has jobs, and Sonny has races that cost you if you lose them.',
    'The handbrake gives you a proper drift now.',
    'Hold the throttle in the countdown to warm your tyres.',
    'Take the lead and they come after you.',
    'Finish with a slide to a stop and watch your pay count up.',
    'More tracks earlier in the career.',
    'Sound for everything, and you can hear the other cars.',
    'High graphics has no pixels now. Cars sit in the light of the road they are on.',
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
