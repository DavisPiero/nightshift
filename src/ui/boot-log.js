// The loading indicator: an old computer's start-up text, line by line,
// ending on a progress bar and a blinking cursor. A plain script (not a
// module) so the start-up screen has it before the game's code loads.
// BootLog.mount(el) puts the text inside `el`; BootLog.wake() starts it over
// (the race loading screen calls this each time it opens).
(function () {
  const LINES = [
    ['NIGHTSHIFT BIOS v1.0  (C) 夜勤 SYSTEMS', ''],
    ['CPU ............ OK', ''],
    ['MEMORY TEST .... 65536K OK', ''],
    ['DETECTING VIDEO  GL2 / HDR', ''],
    ['MOUNTING  /garage  /tracks  /cars', ''],
    ['LOADING  ENGINE.SYS', 'ok'],
    ['LOADING  TYRES.SYS', 'ok'],
    ['LOADING  NEON.SYS', 'ok'],
    ['STARTING NIGHT SHIFT', 'go'],
  ];
  const STEP = 170; // ms per line
  const logs = [];

  function start(l) { l.t0 = performance.now(); l.shown = -1; }
  function frame(now) {
    let any = false;
    for (const l of logs) {
      if (!l.el.isConnected || !l.el.offsetParent) continue;
      any = true;
      const el = Math.max(0, now - l.t0);
      const n = Math.min(LINES.length, Math.floor(el / STEP) + 1);
      if (n === l.shown && now - l.blinkT < 400) continue;
      l.shown = n; l.blinkT = now;
      const bar = Math.min(20, Math.floor((el / STEP) / LINES.length * 20));
      const blink = Math.floor(now / 400) % 2 ? '█' : ' ';
      let out = '';
      for (let i = 0; i < n; i++) out += LINES[i][0] + (LINES[i][1] === 'ok' && i < n - 1 ? '  [ OK ]' : '') + '\n';
      out += '\n[' + '█'.repeat(Math.min(bar, 20)) + '░'.repeat(20 - Math.min(bar, 20)) + ']  LOADING ' + blink;
      l.pre.textContent = out;
    }
    if (any) requestAnimationFrame(frame);
    else running = false;
  }
  let running = false;
  function wake() {
    for (const l of logs) start(l);
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  window.BootLog = {
    mount(el) {
      const pre = document.createElement('pre');
      pre.className = 'boot-log';
      pre.setAttribute('aria-label', 'Loading');
      el.prepend(pre);
      const l = { el: pre, pre };
      start(l);
      logs.push(l);
      wake();
      return pre;
    },
    wake,
  };
  const mid = document.querySelector('#boot .boot-mid');
  if (mid) window.BootLog.mount(mid);
}());
