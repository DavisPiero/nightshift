// Title screen (with the Computer / iPad choice) and the pause menu with a
// small settings panel. Plain DOM; the game passes in callbacks.

const $ = (sel) => document.querySelector(sel);

export class Menus {
  constructor(game) {
    this.game = game;
    this.title = $('#title');
    this.pause = $('#pause');
    this.settings = $('#settings');
    this.note = $('#touch-note');

    for (const b of this.title.querySelectorAll('[data-platform]')) {
      b.addEventListener('click', () => game.choosePlatform(b.dataset.platform));
    }
    $('#title-start').addEventListener('click', () => game.startDriving());
    $('#title-change').addEventListener('click', () => this.showPlatformChoice(true));

    $('#pause-resume').addEventListener('click', () => game.resume());
    $('#pause-reset').addEventListener('click', () => { game.resetCar(); game.resume(); });
    $('#pause-camera').addEventListener('click', () => { game.nextCamera(); game.resume(); });
    $('#pause-settings').addEventListener('click', () => this.openSettings());
    $('#pause-title').addEventListener('click', () => game.toTitle());
    $('#settings-back').addEventListener('click', () => this.closeSettings());
    $('#pause-button').addEventListener('click', () => game.pauseGame());

    for (const b of this.settings.querySelectorAll('[data-graphics]')) {
      b.addEventListener('click', () => { game.setGraphics(b.dataset.graphics); this.syncSettings(); });
    }
    for (const b of this.settings.querySelectorAll('[data-set-platform]')) {
      b.addEventListener('click', () => { game.setPlatform(b.dataset.setPlatform); this.syncSettings(); });
    }
    $('#volume').addEventListener('input', (e) => game.setVolume(Number(e.target.value) / 100));
  }

  showTitle(platform) {
    this.title.hidden = false;
    this.showPlatformChoice(!platform);
    if (platform) $('#title-platform').textContent = platform === 'touch' ? 'iPad / Mobile' : 'Computer';
  }

  showPlatformChoice(choosing) {
    $('#platform-choice').hidden = !choosing;
    $('#title-ready').hidden = choosing;
  }

  hideTitle() { this.title.hidden = true; }

  showPause(on) {
    this.pause.hidden = !on;
    if (!on) this.closeSettings();
  }

  openSettings() {
    this.syncSettings();
    $('#pause-main').hidden = true;
    this.settings.hidden = false;
  }

  closeSettings() {
    $('#pause-main').hidden = false;
    this.settings.hidden = true;
  }

  syncSettings() {
    const s = this.game.save;
    const g = this.game.graphicsName;
    for (const b of this.settings.querySelectorAll('[data-graphics]')) b.classList.toggle('on', b.dataset.graphics === g);
    for (const b of this.settings.querySelectorAll('[data-set-platform]')) b.classList.toggle('on', b.dataset.setPlatform === s.platform);
    $('#volume').value = Math.round(s.settings.audio.master * 100);
  }

  // Touch controls are the next build; say so instead of leaving iPad
  // players with no way to drive.
  showTouchNote(on) { this.note.hidden = !on; }
}
