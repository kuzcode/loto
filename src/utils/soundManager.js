import winSound from '../winsound.mp3';
import looseSound from '../loosesound.mp3';
import clickSound from '../clicksound.mp3';
const sounds = {
  win: new Audio(winSound),
  loose: new Audio(looseSound),
  click: new Audio(clickSound),
};
sounds.win.volume = 0.5;
sounds.loose.volume = 0.5;
sounds.click.volume = 0.3;
let soundEnabled = true;
export function enableSound() {
  soundEnabled = true;
}
export function disableSound() {
  soundEnabled = false;
}
export function toggleSound() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}
export function isSoundEnabled() {
  return soundEnabled;
}
export function playWinSound() {
  if (!soundEnabled) return;
  try {
    sounds.win.currentTime = 0;
    sounds.win.play().catch(err => {
      console.log('Audio play error (ignored):', err);
    });
  } catch (err) {
    console.log('Audio play error (ignored):', err);
  }
}
export function playLooseSound() {
  if (!soundEnabled) return;
  try {
    sounds.loose.currentTime = 0;
    sounds.loose.play().catch(err => {
      console.log('Audio play error (ignored):', err);
    });
  } catch (err) {
    console.log('Audio play error (ignored):', err);
  }
}
export function playClickSound() {
  if (!soundEnabled) return;
  try {
    sounds.click.currentTime = 0;
    sounds.click.play().catch(err => {
      console.log('Audio play error (ignored):', err);
    });
  } catch (err) {
    console.log('Audio play error (ignored):', err);
  }
}