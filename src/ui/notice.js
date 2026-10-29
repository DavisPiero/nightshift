// The notice board: a few old-desktop dialog windows over the title screen
// each time the game loads, telling you what is new. Close each with its
// button; Enter or Esc closes them all. (Look: David's Windows-98 reference.)

const WINDOWS = [
  {
    id: 'news', title: 'What’s new', icon: 'info', pos: 'a',
    lines: [
      'A new first car: the 1990 Mazdo MX-5 Miata. Light, open and easy to learn in.',
      'Realistic graphics: smooth edges, filmic light, speed blur and lens fringing (Settings > Graphics).',
      'The Aventadoro’s rear is rebuilt from a new sheet.',
      'A bigger, zoomed minimap that turns with the car.',
      'Cockpit view is wider and the sun visors are gone.',
      'Classes are harder to reach: S and X are rare now.',
    ],
    button: 'Oh, thanks',
  },
  {
    id: 'look', title: 'Reminder', icon: 'warn', pos: 'b',
    lines: ['Graphics: Medium is the new default.', 'Miss the chunky pixels? Settings > Graphics > Low.'],
    button: 'Oh, thanks',
  },
  {
    id: 'soon', title: 'You got mail', icon: 'mail', pos: 'c',
    lines: ['Racing against the AI is next.'],
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
