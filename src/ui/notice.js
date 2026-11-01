// The notice board: one window over the title screen, once after each update,
// saying what is new. Change NOTICE and give it a new id with each update. A
// new player, who has nothing to compare with, never sees it.

const NOTICE = {
  id: '2026-11-01',
  title: 'What\u2019s new',
  lines: [
    'Bumping another car no longer cuts your speed.',
    'Shorter, narrower, faster Starter Track and Underground.',
    'Smarter rivals, and Hard really is hard now.',
    'Race settings: Race, Time Trial with a ghost, or Practice.',
    'A race sheet, and a whole new look.',
  ],
};

// Show it if this save has not seen it. Returns nothing; saves that it did.
export function showNotice(game, root = document.querySelector('#notice')) {
  const save = game.save;
  if (save.notice === NOTICE.id) return;
  const fresh = !save.platform;
  save.notice = NOTICE.id;
  game.saveNow();
  if (fresh || !root) return;
  root.innerHTML = `<section class="nw"><header>${NOTICE.title}</header><div class="nb"><ul>${NOTICE.lines.map((l) => `<li>${l}</li>`).join('')}</ul></div><footer><button class="nok pri">OK</button></footer></section>`;
  const close = () => { root.hidden = true; window.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  root.querySelector('.nok').addEventListener('click', close);
  root.hidden = false;
  window.addEventListener('keydown', onKey, true);
}
