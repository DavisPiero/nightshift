// The notice board: a few old-desktop dialog windows over the title screen
// each time the game loads, telling you what is new. Close each with its
// button; Enter or Esc closes them all. (Look: David's Windows-98 reference.)

const WINDOWS = [
  {
    id: 'news', title: 'What’s new', icon: 'info', pos: 'a',
    lines: [
      'Career mode: from the docks to the top, one race at a time.',
      'Real races: eight cars, laps, four difficulties.',
      'A shop, and a garage just for looks.',
    ],
    button: 'Oh, thanks',
  },
  {
    id: 'look', title: 'Reminder', icon: 'warn', pos: 'b',
    lines: ['Medium and High are a little bit pixelated now.', 'Settings > Graphics > Low for the full chunky look.'],
    button: 'Oh, thanks',
  },
  {
    id: 'soon', title: 'You got mail', icon: 'mail', pos: 'c',
    lines: ['From: Johnny', 'Bring my Subaro back in one piece.'],
    button: 'Oh, thanks',
  },
];

export function showNotice(root = document.querySelector('#notice')) {
  if (!root) return;
  root.textContent = '';
  const close = () => { root.hidden = true; window.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  let open = WINDOWS.length;
  for (const w of WINDOWS) {
    const win = document.createElement('section');
    win.className = `nw nw-${w.pos}`;
    win.innerHTML = `<header><span>${w.title}</span><button class="nx" aria-label="Close">×</button></header>
      <div class="nb"><i class="ni ${w.icon}"></i><ul>${w.lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>
      <footer><button class="nok">${w.button}</button></footer>`;
    const shut = () => { win.remove(); if (--open <= 0) close(); };
    win.querySelector('.nx').addEventListener('click', shut);
    win.querySelector('.nok').addEventListener('click', shut);
    root.append(win);
  }
  root.hidden = false;
  window.addEventListener('keydown', onKey, true);
}
