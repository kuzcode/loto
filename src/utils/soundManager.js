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

/**
 * Воспроизвести звук выигрыша
 */
export function playWinSound() {
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
  try {
    sounds.click.currentTime = 0;
    sounds.click.play().catch(err => {
      console.log('Audio play error (ignored):', err);
    });
  } catch (err) {
    console.log('Audio play error (ignored):', err);
  }
}

