// Утилита для управления играми с ботами
const STORAGE_KEY = 'loto_games_state';
const STAKES = [0.2, 0.5, 1, 2, 10];

// Генерация карточки 3x9
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sample(array, k) {
  const copy = [...array];
  shuffle(copy);
  return copy.slice(0, k);
}

// Детерминированный генератор случайных чисел (для ботов)
function createSeededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

export function generateCard3x9(seed = null) {
  const random = seed !== null ? createSeededRandom(seed) : () => Math.random();
  const randomInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;
  
  const rows = 3, cols = 9;
  const rowCounts = [0, 0, 0];
  const colCounts = Array(cols).fill(0);
  const filled = Array.from({ length: rows }, () => Array(cols).fill(false));
  let placed = 0;
  
  while (placed < 15) {
    const r = randomInt(0, rows - 1);
    const c = randomInt(0, cols - 1);
    if (filled[r][c]) continue;
    if (rowCounts[r] >= 5) continue;
    if (colCounts[c] >= 3) continue;
    filled[r][c] = true;
    rowCounts[r] += 1;
    colCounts[c] += 1;
    placed += 1;
  }
  
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (let c = 0; c < cols; c++) {
    let start, end;
    if (c === 0) {
      start = 1;
      end = 9;
    } else if (c === 8) {
      start = 80;
      end = 90;
    } else {
      start = c * 10;
      end = c * 10 + 9;
    }
    const need = colCounts[c];
    const pool = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    // Используем детерминированный shuffle если есть seed
    let shuffledPool;
    if (seed !== null) {
      shuffledPool = [...pool];
      // Детерминированный shuffle
      for (let i = shuffledPool.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
      }
    } else {
      shuffledPool = sample(pool, pool.length);
    }
    const picks = shuffledPool.slice(0, need).sort((a, b) => a - b);
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      if (filled[r][c]) {
        grid[r][c] = picks[idx++];
      }
    }
  }
  return grid;
}

// Генерация случайного числа от min до max (экспоненциальное распределение для более реалистичного добавления ботов)
function randomExponential(min, max, lambda = 2) {
  const u = Math.random();
  const exp = -Math.log(u) / lambda;
  const normalized = exp % (max - min + 1);
  return Math.floor(min + normalized);
}

// Генерация времени следующего добавления бота (в секундах)
function getNextBotJoinTime(currentPlayers, gameStarted) {
  if (gameStarted) {
    // После начала игры боты добавляются реже
    if (currentPlayers >= 70) return null; // Максимум 70 игроков
    // Обычно 30-50 игроков, изредка до 70
    if (currentPlayers >= 50 && Math.random() > 0.3) return null; // 70% шанс не добавлять после 50
    return 2 + Math.random() * 4; // 2-6 секунд
  } else {
    // До начала игры: 0-20 игроков за 30-60 секунд
    if (currentPlayers >= 20) {
      // После 20 продолжают добавляться, но реже
      if (currentPlayers >= 70) return null;
      if (currentPlayers >= 50 && Math.random() > 0.4) return null;
      return 3 + Math.random() * 5; // 3-8 секунд
    }
    // Первые 20 игроков: более быстрое добавление
    const baseTime = 30 / 20; // В среднем 1.5 секунды на игрока для первых 20
    return baseTime * (0.5 + Math.random()); // 0.75-3 секунды
  }
}

// Инициализация игр
export function initializeGames() {
  const saved = loadGamesState();
  if (saved && saved.lastUpdate) {
    const timeSinceUpdate = (Date.now() - saved.lastUpdate) / 1000; // секунды
    
    if (timeSinceUpdate < 30) {
      // Недавнее обновление - вернуть сохраненное состояние
      return updateGamesState(saved.games, false);
    } else if (timeSinceUpdate < 300) {
      // 30-300 секунд - немного обновить
      return updateGamesState(saved.games, true);
    }
    // Больше 5 минут - полностью перегенерировать
  }
  
    // Создать новые игры
  const games = STAKES.map((stake, index) => ({
    id: `game_${stake}_${Date.now()}_${index}`,
    stake,
    status: 'waiting', // waiting, counting, running, finished
    players: [],
    botPlayers: 0,
    botCards: [], // карточки ботов
    totalPlayers: 0,
    startCountdown: null, // секунды до начала (60 -> 0)
    gameStartTime: null, // когда началась игра
    gameDuration: 0, // сколько идет игра (секунды)
    maxGameDuration: 60 + Math.random() * 120, // Максимальная длительность игры: 1-3 минуты (рандомно)
    draw: null, // массив выпавших чисел
    drawIndex: 0, // текущий индекс в draw
    winners: [], // победители
    nextBotJoin: Date.now() + (Math.random() * 2000 + 500), // когда следующий бот присоединится (мс)
    lastUpdate: Date.now(),
  }));
  
  saveGamesState(games);
  return games;
}

// Загрузка состояния из localStorage
export function loadGamesState() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

// Сохранение состояния в localStorage
export function saveGamesState(games) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      games,
      lastUpdate: Date.now(),
    }));
  } catch (e) {
    console.error('Failed to save games state', e);
  }
}

// Обновление состояния игр
export function updateGamesState(games, partialUpdate = false) {
  const now = Date.now();
  const updatedGames = games.map(game => {
    const updated = { ...game };
    
    // Если игра закончилась, сбросить её через 5 секунд после завершения
    if (game.status === 'finished') {
      const finishedAt = game.finishedAt || now;
      const timeSinceFinished = (now - finishedAt) / 1000;
      
      if (timeSinceFinished >= 5) {
        // Сбросить игру через 5 секунд
        return {
          ...updated,
          status: 'waiting',
          players: [],
          botPlayers: 0,
          botCards: [],
          totalPlayers: 0,
          startCountdown: null,
          countdownStartTime: null,
        gameStartTime: null,
        gameDuration: 0,
        maxGameDuration: 60 + Math.random() * 120,
        draw: null,
        drawIndex: 0,
        winners: [],
        prizePerWinner: 0,
        finishedAt: null,
        nextBotJoin: now + (Math.random() * 2000 + 500),
      };
      }
      // Иначе просто вернуть текущее состояние
      return updated;
    }
    
    // Добавление ботов
    if (!partialUpdate && game.nextBotJoin && now >= game.nextBotJoin && game.status !== 'finished') {
      const nextJoinTime = getNextBotJoinTime(game.totalPlayers, game.status === 'running');
      if (nextJoinTime !== null) {
        updated.botPlayers = (updated.botPlayers || 0) + 1;
        updated.totalPlayers = (updated.players?.length || 0) + updated.botPlayers;
        updated.nextBotJoin = now + (nextJoinTime * 1000);
        
        // Генерировать карточку для нового бота
        if (!updated.botCards) updated.botCards = [];
        const botIndex = updated.botCards.length;
        const seed = hashString(`${updated.id}_bot_${botIndex}`);
        const botCard = generateCard3x9(seed);
        updated.botCards.push(botCard);
      } else {
        updated.nextBotJoin = null;
      }
    }
    
    // Обновление статуса игры
    if (game.status === 'waiting' && game.totalPlayers >= 20) {
      updated.status = 'counting';
      if (!updated.startCountdown) {
        updated.startCountdown = 60; // 1 минута
        updated.countdownStartTime = now; // Запомнить когда начался отсчет
      }
    }
    
    // Отсчет до начала игры
    if (game.status === 'counting' && updated.startCountdown !== null) {
      if (!updated.countdownStartTime) {
        updated.countdownStartTime = now;
      }
      const elapsed = (now - updated.countdownStartTime) / 1000;
      updated.startCountdown = Math.max(0, 60 - elapsed);
      
      if (updated.startCountdown <= 0) {
        updated.status = 'running';
        updated.gameStartTime = now;
        updated.startCountdown = null;
        updated.countdownStartTime = null;
        // Установить максимальную длительность игры (1-3 минуты рандомно)
        if (!updated.maxGameDuration) {
          updated.maxGameDuration = 60 + Math.random() * 120; // 60-180 секунд
        }
        // Генерировать последовательность чисел
        // Если есть реальные игроки, смещаем распределение для увеличения их шансов
        const hasRealPlayers = (updated.players || []).length > 0;
        let nums = Array.from({ length: 90 }, (_, i) => i + 1);
        
        if (hasRealPlayers) {
          // Собираем все числа из карточек реальных игроков
          const playerNumbers = new Set();
          for (const player of updated.players || []) {
            for (const card of player.cards) {
              for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 9; col++) {
                  const num = card[row][col];
                  if (num !== null) {
                    playerNumbers.add(num);
                  }
                }
              }
            }
          }
          
          // Создаем смещенное распределение: числа из карточек игроков появляются раньше
          // Это увеличивает вероятность того, что игроки выиграют
          const playerNumsArray = Array.from(playerNumbers);
          const otherNums = Array.from({ length: 90 }, (_, i) => i + 1).filter(n => !playerNumbers.has(n));
          
          // Перемешиваем отдельно
          shuffle(playerNumsArray);
          shuffle(otherNums);
          
          // Смешиваем: 75% чисел из карточек игроков в первых 50 числах
          // Это значительно увеличивает шансы игроков выиграть раньше ботов
          // При этом количество ботов остается прежним (30-50), но пользователь выигрывает чаще
          const earlyCount = 50;
          const playerNumsInEarly = Math.min(Math.floor(earlyCount * 0.75), playerNumsArray.length);
          const otherNumsInEarly = Math.min(earlyCount - playerNumsInEarly, otherNums.length);
          
          // Собираем финальную последовательность: сначала числа игроков, потом остальные
          nums = [];
          
          // Первая часть: числа игроков и другие числа вперемешку
          const earlyPlayerNums = playerNumsArray.slice(0, playerNumsInEarly);
          const earlyOtherNums = otherNums.slice(0, otherNumsInEarly);
          const earlyMix = [...earlyPlayerNums, ...earlyOtherNums];
          shuffle(earlyMix);
          nums.push(...earlyMix);
          
          // Вторая часть: оставшиеся числа
          const remainingPlayerNums = playerNumsArray.slice(playerNumsInEarly);
          const remainingOtherNums = otherNums.slice(otherNumsInEarly);
          const lateMix = [...remainingPlayerNums, ...remainingOtherNums];
          shuffle(lateMix);
          nums.push(...lateMix);
          
          // Убеждаемся что все 90 чисел присутствуют ровно один раз
          const allNumsSet = new Set(nums);
          const missingNums = Array.from({ length: 90 }, (_, i) => i + 1).filter(n => !allNumsSet.has(n));
          if (missingNums.length > 0) {
            // Добавляем недостающие числа в конец
            nums.push(...missingNums);
          }
          
          // Удаляем дубликаты и обрезаем до 90
          const uniqueNums = [];
          const seen = new Set();
          for (const num of nums) {
            if (!seen.has(num) && num >= 1 && num <= 90) {
              uniqueNums.push(num);
              seen.add(num);
            }
          }
          
          // Дополняем до 90 если нужно
          for (let i = 1; i <= 90; i++) {
            if (!seen.has(i)) {
              uniqueNums.push(i);
            }
          }
          
          nums = uniqueNums.slice(0, 90);
        } else {
          // Нет реальных игроков - обычная случайная последовательность
          nums = shuffle(nums);
        }
        
        updated.draw = nums;
        updated.drawIndex = 0;
        // Убедиться, что карточки ботов сгенерированы
        if (!updated.botCards || updated.botCards.length < updated.botPlayers) {
          updated.botCards = updated.botCards || [];
          for (let i = updated.botCards.length; i < updated.botPlayers; i++) {
            const seed = hashString(`${updated.id}_bot_${i}`);
            const botCard = generateCard3x9(seed);
            updated.botCards.push(botCard);
          }
        }
      }
    }
    
    // Обновление времени игры
    if (game.status === 'running' && game.gameStartTime) {
      updated.gameDuration = Math.floor((now - game.gameStartTime) / 1000);
      
      // Проверить, не истекло ли максимальное время игры
      const maxDuration = updated.maxGameDuration || (60 + Math.random() * 120);
      if (updated.gameDuration >= maxDuration) {
        // Время истекло - определить победителя по наибольшему количеству заполненных чисел в линиях
        const winners = getWinnersByProgress(updated);
        // Завершить игру автоматически
        updated.status = 'finished';
        updated.winners = winners.filter(w => !w.startsWith('bot_'));
        updated.prizePerWinner = 0;
        if (updated.winners.length > 0) {
          const totalStake = updated.totalPlayers * updated.stake;
          updated.prizePerWinner = (totalStake / updated.winners.length) * 0.9;
        }
        updated.finishedAt = now;
      } else {
        // Генерация новых чисел каждые 2.5 секунды
        if (updated.draw && updated.draw.length > 0) {
          const numbersDrawn = Math.floor(updated.gameDuration / 2.5);
          updated.drawIndex = Math.min(numbersDrawn, updated.draw.length);
        }
      }
    }
    
    updated.lastUpdate = now;
    return updated;
  });
  
  saveGamesState(updatedGames);
  return updatedGames;
}

// Получить игру по ID
export function getGameById(games, gameId) {
  return games.find(g => g.id === gameId);
}

// Добавить игрока в игру
export function addPlayerToGame(games, gameId, userId, cards) {
  const updatedGames = games.map(game => {
    if (game.id !== gameId) return game;
    
    const players = game.players || [];
    if (players.find(p => p.userId === userId)) {
      return game; // Уже в игре
    }
    
    return {
      ...game,
      players: [...players, { userId, cards, joinedAt: Date.now() }],
      totalPlayers: (game.players?.length || 0) + game.botPlayers + 1,
    };
  });
  
  saveGamesState(updatedGames);
  return updatedGames;
}

// Проверка победителей (полный ряд на любой карточке)
export function checkWinners(game) {
  if (!game.draw || game.drawIndex === 0 || game.status !== 'running') {
    return { realWinners: [], anyWinner: false };
  }
  
  const drawnNumbers = new Set(game.draw.slice(0, game.drawIndex));
  const realWinners = [];
  let anyWinner = false; // Флаг, что кто-то выиграл (включая ботов)
  
  // Сначала убедиться, что карточки ботов сгенерированы
  if (!game.botCards || game.botCards.length < game.botPlayers) {
    return { realWinners: [], anyWinner: false };
  }
  
  // Проверить реальных игроков
  for (const player of game.players || []) {
    let hasWon = false;
    for (const card of player.cards) {
      // Проверить каждый ряд (3 ряда)
      for (let row = 0; row < 3; row++) {
        let allMarked = true;
        let hasNumbers = false;
        for (let col = 0; col < 9; col++) {
          const num = card[row][col];
          if (num !== null) {
            hasNumbers = true;
            if (!drawnNumbers.has(num)) {
              allMarked = false;
              break;
            }
          }
        }
        // Ряд выигрышный если все числа в ряду отмечены и в ряду есть числа
        if (allMarked && hasNumbers) {
          realWinners.push(player.userId);
          hasWon = true;
          anyWinner = true;
          break; // Достаточно одного полного ряда на любой карточке
        }
      }
      if (hasWon) break; // Уже победил
    }
  }
  
  // Проверить ботов (для логики завершения игры)
  const botCards = game.botCards || [];
  for (let i = 0; i < botCards.length; i++) {
    const card = botCards[i];
    for (let row = 0; row < 3; row++) {
      let allMarked = true;
      let hasNumbers = false;
      for (let col = 0; col < 9; col++) {
        const num = card[row][col];
        if (num !== null) {
          hasNumbers = true;
          if (!drawnNumbers.has(num)) {
            allMarked = false;
            break;
          }
        }
      }
      if (allMarked && hasNumbers) {
        anyWinner = true; // Бот выиграл - игра должна закончиться
        break;
      }
    }
    if (anyWinner) break;
  }
  
  return { realWinners: [...new Set(realWinners)], anyWinner };
}

// Определить победителей по прогрессу (когда время истекло)
function getWinnersByProgress(game) {
  if (!game.draw || game.drawIndex === 0) return [];
  
  const drawnNumbers = new Set(game.draw.slice(0, game.drawIndex));
  const playerProgress = [];
  
  // Проверить реальных игроков
  for (const player of game.players || []) {
    let maxProgress = 0;
    for (const card of player.cards) {
      for (let row = 0; row < 3; row++) {
        let markedCount = 0;
        let totalNumbers = 0;
        for (let col = 0; col < 9; col++) {
          const num = card[row][col];
          if (num !== null) {
            totalNumbers++;
            if (drawnNumbers.has(num)) {
              markedCount++;
            }
          }
        }
        if (totalNumbers > 0) {
          const progress = markedCount / totalNumbers;
          maxProgress = Math.max(maxProgress, progress);
        }
      }
    }
    playerProgress.push({ userId: player.userId, progress: maxProgress });
  }
  
  // Найти максимальный прогресс
  if (playerProgress.length === 0) return [];
  const maxProgress = Math.max(...playerProgress.map(p => p.progress), 0);
  
  // Вернуть всех игроков с максимальным прогрессом
  return playerProgress
    .filter(p => p.progress === maxProgress && p.progress > 0)
    .map(p => p.userId);
}

// Завершить игру и распределить выигрыш
export function finishGame(games, gameId, realWinners) {
  const updatedGames = games.map(game => {
    if (game.id !== gameId) return game;
    
    // realWinners уже отфильтрованы (без ботов)
    let prizePerWinner = 0;
    if (realWinners.length > 0) {
      const totalStake = game.totalPlayers * game.stake;
      prizePerWinner = (totalStake / realWinners.length) * 0.9;
    }
    
    return {
      ...game,
      status: 'finished',
      winners: realWinners,
      prizePerWinner,
      finishedAt: Date.now(),
    };
  });
  
  saveGamesState(updatedGames);
  return updatedGames;
}

// Получить карточки всех игроков (включая ботов) для текущей игры
export function getAllPlayerCards(game) {
  const allCards = [];
  
  // Карточки реальных игроков
  for (const player of game.players || []) {
    allCards.push(...player.cards);
  }
  
  // Карточки ботов (генерируем детерминированно на основе game.id и индекса бота)
  // Важно: если боты уже имеют карточки в сохраненном состоянии, используем их
  if (!game.botCards) {
    // Генерируем карточки для ботов и сохраняем
    game.botCards = [];
    for (let i = 0; i < (game.botPlayers || 0); i++) {
      const seed = hashString(`${game.id}_bot_${i}`);
      const botCard = generateCard3x9(seed);
      game.botCards.push(botCard);
    }
    // Сохраняем обновленное состояние
    const currentGames = loadGamesState()?.games || [];
    const updatedGames = currentGames.map(g => 
      g.id === game.id ? { ...g, botCards: game.botCards } : g
    );
    saveGamesState(updatedGames);
  }
  
  allCards.push(...(game.botCards || []));
  
  return allCards;
}

// Получить статистику по карточкам (сколько карточек ожидают сколько номеров)
export function getCardsProgress(game) {
  if (!game.draw || game.drawIndex === 0 || game.status !== 'running') {
    return {};
  }
  
  const drawnNumbers = new Set(game.draw.slice(0, game.drawIndex));
  const progressMap = {}; // { remaining: count }
  
  // Проверить реальных игроков
  for (const player of game.players || []) {
    for (const card of player.cards) {
      // Проверить каждый ряд (3 ряда)
      for (let row = 0; row < 3; row++) {
        let remaining = 0;
        let hasNumbers = false;
        for (let col = 0; col < 9; col++) {
          const num = card[row][col];
          if (num !== null) {
            hasNumbers = true;
            if (!drawnNumbers.has(num)) {
              remaining++;
            }
          }
        }
        if (hasNumbers && remaining > 0) {
          progressMap[remaining] = (progressMap[remaining] || 0) + 1;
        }
      }
    }
  }
  
  // Проверить ботов
  const botCards = game.botCards || [];
  for (let i = 0; i < botCards.length; i++) {
    const card = botCards[i];
    for (let row = 0; row < 3; row++) {
      let remaining = 0;
      let hasNumbers = false;
      for (let col = 0; col < 9; col++) {
        const num = card[row][col];
        if (num !== null) {
          hasNumbers = true;
          if (!drawnNumbers.has(num)) {
            remaining++;
          }
        }
      }
      if (hasNumbers && remaining > 0) {
        progressMap[remaining] = (progressMap[remaining] || 0) + 1;
      }
    }
  }
  
  return progressMap;
}

// Простая хеш-функция для создания seed из строки
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

