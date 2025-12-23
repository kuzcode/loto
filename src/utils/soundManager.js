import winSound from '../winsound.mp3';
import looseSound from '../loosesound.mp3';
import clickSound from '../clicksound.mp3';

// Создаем аудио объекты один раз
const sounds = {
  win: new Audio(winSound),
  loose: new Audio(looseSound),
  click: new Audio(clickSound),
};

// Устанавливаем громкость
sounds.win.volume = 0.5;
sounds.loose.volume = 0.5;
sounds.click.volume = 0.3;

// Состояние звука (по умолчанию включен)
let soundEnabled = true;

/**
 * Включить звук
 */
export function enableSound() {
  soundEnabled = true;
}

/**
 * Выключить звук
 */
export function disableSound() {
  soundEnabled = false;
}

/**
 * Переключить звук
 */
export function toggleSound() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

/**
 * Проверить, включен ли звук
 */
export function isSoundEnabled() {
  return soundEnabled;
}

/**
 * Воспроизвести звук выигрыша
 */
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

/**
 * Воспроизвести звук проигрыша
 */
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

/**
 * Воспроизвести звук клика
 */
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

