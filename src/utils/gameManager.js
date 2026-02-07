const STORAGE_KEY = 'loto_games_state';
const STAKES = [0.2, 0.5, 1, 2, 10];
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
} function sample(array, k) {
  const copy = [...array];
  shuffle(copy);
  return copy.slice(0, k);
}
function createSeededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
} export function generateCard3x9(seed = null) {
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

    let shuffledPool;
    if (seed !== null) {
      shuffledPool = [...pool];
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
function getTargetBotCount(stake, gameId = null) {



  const stakeIndex = STAKES.indexOf(stake);
  if (stakeIndex === -1) return 60;


  const baseTarget = 100 - (stakeIndex * 20);


  const variation = baseTarget * 0.3;
  const minTarget = Math.max(20, Math.floor(baseTarget - variation));
  const maxTarget = Math.min(100, Math.ceil(baseTarget + variation));



  const seedStr = gameId ? `target_${stake}_${gameId}` : `target_${stake}_default`;
  const seed = hashString(seedStr);
  const random = (seed % 1000) / 1000;
  const target = Math.floor(minTarget + (maxTarget - minTarget) * random);

  return Math.max(20, Math.min(100, target));
} function getNextBotJoinTime(currentPlayers, gameStarted, stake, targetBotCount) {
  if (gameStarted) {
    return null;
  }


  if (currentPlayers >= targetBotCount) {
    return null;
  }



  const speedMultiplier = 0.1 + (stake * 0.09);


  if (currentPlayers < 20) {
    const baseTime = (30 / 20) * speedMultiplier;
    return Math.max(0.1, baseTime * (0.3 + Math.random() * 0.7));
  }


  const progress = currentPlayers / targetBotCount;


  if (progress < 0.5) {

    return Math.max(0.2, (0.5 + Math.random() * 1.5) * speedMultiplier);
  } else if (progress < 0.8) {

    return Math.max(0.3, (1 + Math.random() * 2) * speedMultiplier);
  } else {

    return Math.max(0.5, (2 + Math.random() * 3) * speedMultiplier);
  }
}
export function initializeGames() {
  const saved = loadGamesState();
  if (saved && saved.lastUpdate) {
    const timeSinceUpdate = (Date.now() - saved.lastUpdate) / 1000;

    if (timeSinceUpdate < 30) {
      const gamesWithDefaults = saved.games.map(game => ({
        ...game,
        jackpot: game.jackpot || Math.floor(Math.random() * (300 - 50 + 1)) + 50,
        targetBotCount: game.targetBotCount || getTargetBotCount(game.stake, game.id),
      }));
      return updateGamesState(gamesWithDefaults, false);
    } else if (timeSinceUpdate < 300) {
      const gamesWithDefaults = saved.games.map(game => ({
        ...game,
        jackpot: game.jackpot || Math.floor(Math.random() * (300 - 50 + 1)) + 50,
        targetBotCount: game.targetBotCount || getTargetBotCount(game.stake, game.id),
      }));
      return updateGamesState(gamesWithDefaults, true);
    }

  }


  const now = Date.now();
  const games = STAKES.map((stake, index) => {
    const gameId = `game_${stake}_${now}_${index}`;
    const targetBotCount = getTargetBotCount(stake, gameId);


    const stateRandom = hashString(`state_${gameId}`) % 100;
    let status = 'waiting';
    let botPlayers = 0;
    let totalPlayers = 0;
    let startCountdown = null;
    let countdownStartTime = null;
    let gameStartTime = null;
    let gameDuration = 0;
    let draw = null;
    let drawIndex = 0;




    if (stateRandom < 30) {
      status = 'running';
      const progressRandom = (hashString(`progress_${gameId}`) % 80) + 20;
      botPlayers = Math.floor((targetBotCount * progressRandom) / 100);
      totalPlayers = botPlayers;
      gameStartTime = now - (Math.random() * 60000 + 10000);
      gameDuration = Math.floor((now - gameStartTime) / 1000);

      const nums = Array.from({ length: 90 }, (_, i) => i + 1);
      for (let i = nums.length - 1; i > 0; i -= 2) {
        const j = Math.floor((hashString(`shuffle_${gameId}_${i}`) % (i + 1)));
        [nums[i], nums[j]] = [nums[j], nums[i]];
      }
      draw = nums;
      const drawProgress = (hashString(`draw_${gameId}`) % 70) + 10;
      drawIndex = Math.floor((draw.length * drawProgress) / 100);
      const botCards = [];
      for (let i = 0; i < botPlayers; i++) {
        const seed = hashString(`${gameId}_bot_${i}`);
        botCards.push(generateCard3x9(seed));
      }
      return {
        id: gameId,
        stake,
        status,
        players: [],
        botPlayers,
        botCards,
        targetBotCount,
        totalPlayers,
        startCountdown: null,
        countdownStartTime: null,
        gameStartTime,
        gameDuration,
        maxGameDuration: 60 + Math.random() * 120,
        draw,
        drawIndex,
        winners: [],
        nextBotJoin: null,
        lastUpdate: now,
        jackpot: Math.floor(Math.random() * (300 - 50 + 1)) + 50,
      };
    } else if (stateRandom < 60) {
      status = 'counting';
      const playerProgress = (hashString(`players_${gameId}`) % 80) + 20;
      botPlayers = Math.floor((targetBotCount * playerProgress) / 100);
      totalPlayers = botPlayers;
      const countdownValue = (hashString(`countdown_${gameId}`) % 50) + 10;
      startCountdown = countdownValue;
      countdownStartTime = now - ((60 - countdownValue) * 1000);
      const botCards = [];
      for (let i = 0; i < botPlayers; i++) {
        const seed = hashString(`${gameId}_bot_${i}`);
        botCards.push(generateCard3x9(seed));
      }
      return {
        id: gameId,
        stake,
        status,
        players: [],
        botPlayers,
        botCards,
        targetBotCount,
        totalPlayers,
        startCountdown,
        countdownStartTime,
        gameStartTime: null,
        gameDuration: 0,
        maxGameDuration: 60 + Math.random() * 120,
        draw: null,
        drawIndex: 0,
        winners: [],
        nextBotJoin: now + (Math.random() * 1000 + 200),
        lastUpdate: now,
        jackpot: Math.floor(Math.random() * (300 - 50 + 1)) + 50,
      };
    } else {
      const playerProgress = (hashString(`waiting_${gameId}`) % 80);
      botPlayers = Math.floor((targetBotCount * playerProgress) / 100);
      totalPlayers = botPlayers;
      const botCards = [];
      if (botPlayers > 0) {
        for (let i = 0; i < botPlayers; i++) {
          const seed = hashString(`${gameId}_bot_${i}`);
          botCards.push(generateCard3x9(seed));
        }
      }
      return {
        id: gameId,
        stake,
        status,
        players: [],
        botPlayers,
        botCards,
        targetBotCount,
        totalPlayers,
        startCountdown: null,
        countdownStartTime: null,
        gameStartTime: null,
        gameDuration: 0,
        maxGameDuration: 60 + Math.random() * 120,
        draw: null,
        drawIndex: 0,
        winners: [],
        nextBotJoin: now + (Math.random() * 1000 + 200),
        lastUpdate: now,
        jackpot: Math.floor(Math.random() * (300 - 50 + 1)) + 50,
      };
    }
  });

  saveGamesState(games);
  return games;
}
export function loadGamesState() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}
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
export function updateGamesState(games, partialUpdate = false) {
  const now = Date.now();

  const updatedGames = games.map(game => {
    const updated = { ...game };


    if (partialUpdate) {
      if (game.status === 'waiting' || game.status === 'counting') {
        updated.lastUpdate = now;
        if (game.status === 'counting' && game.countdownStartTime) {
          const elapsed = (now - game.countdownStartTime) / 1000;
          updated.startCountdown = Math.max(0, 60 - elapsed);
        }
        return updated;
      }
      if (game.status === 'running') {
        updated.lastUpdate = now;
        if (game.gameStartTime) {
          updated.gameDuration = Math.floor((now - game.gameStartTime) / 1000);
        }
        return updated;
      }
    }


    if (game.status === 'finished') {
      const finishedAt = game.finishedAt || now;
      const timeSinceFinished = (now - finishedAt) / 1000;
      if (timeSinceFinished >= 5) {
        const lastGameDraw = updated.draw && updated.drawIndex > 0
          ? updated.draw.slice(0, updated.drawIndex)
          : null;
        const lastGamePrize = updated.prizePerWinner || 0;
        return {
          ...updated,
          status: 'waiting',
          players: [],
          botPlayers: 0,
          botCards: [],
          targetBotCount: getTargetBotCount(updated.stake, updated.id),
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
          jackpot: Math.floor(Math.random() * (300 - 50 + 1)) + 50,
          jackpotWon: false,
          lastGameDraw,
          lastGamePrize,
        };
      }
      return updated;
    }


    if (!partialUpdate && game.nextBotJoin && now >= game.nextBotJoin && game.status !== 'finished') {
      if (!updated.targetBotCount) {
        updated.targetBotCount = getTargetBotCount(updated.stake, updated.id);
      }
      const nextJoinTime = getNextBotJoinTime(
        game.totalPlayers,
        game.status === 'running',
        updated.stake,
        updated.targetBotCount
      );
      if (nextJoinTime !== null) {
        updated.botPlayers = (updated.botPlayers || 0) + 1;
        updated.totalPlayers = (updated.players?.length || 0) + updated.botPlayers;
        updated.nextBotJoin = now + (nextJoinTime * 1000);
        if (!updated.botCards) updated.botCards = [];
        const botIndex = updated.botCards.length;
        const seed = hashString(`${updated.id}_bot_${botIndex}`);
        const botCard = generateCard3x9(seed);
        updated.botCards.push(botCard);
      } else {
        updated.nextBotJoin = null;
      }
    }


    if (game.status === 'waiting' && game.totalPlayers >= 20) {
      updated.status = 'counting';
      if (!updated.startCountdown) {
        updated.startCountdown = 60;
        updated.countdownStartTime = now;
      }
    }


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
        if (!updated.maxGameDuration) {
          updated.maxGameDuration = 60 + Math.random() * 120;
        }
        const hasRealPlayers = (updated.players || []).length > 0;
        let nums = Array.from({ length: 90 }, (_, i) => i + 1);
        if (hasRealPlayers) {
          const playerNumbers = new Set();
          const allNums = new Set(Array.from({ length: 90 }, (_, i) => i + 1));
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
          const playerNumsArray = Array.from(playerNumbers);
          const otherNums = Array.from(allNums).filter(n => !playerNumbers.has(n));
          shuffle(playerNumsArray);
          shuffle(otherNums);
          const earlyCount = 50;
          const playerNumsInEarly = Math.min(Math.floor(earlyCount * 0.6), playerNumsArray.length);
          const otherNumsInEarly = earlyCount - playerNumsInEarly;
          const earlyMix = [
            ...playerNumsArray.slice(0, playerNumsInEarly),
            ...otherNums.slice(0, otherNumsInEarly)
          ];
          shuffle(earlyMix);
          const lateMix = [
            ...playerNumsArray.slice(playerNumsInEarly),
            ...otherNums.slice(otherNumsInEarly)
          ];
          shuffle(lateMix);
          nums = [...earlyMix, ...lateMix];
          const numsSet = new Set(nums);
          if (numsSet.size < 90) {
            const missing = Array.from(allNums).filter(n => !numsSet.has(n));
            nums = [...nums, ...missing].slice(0, 90);
          }
        } else {
          nums = shuffle(nums);
        }
        updated.draw = nums;
        updated.drawIndex = 0;
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


    if (game.status === 'running' && game.gameStartTime) {
      updated.gameDuration = Math.floor((now - game.gameStartTime) / 1000);
      const maxDuration = updated.maxGameDuration || (60 + Math.random() * 120);
      if (updated.gameDuration >= maxDuration) {
        const winners = getWinnersByProgress(updated);
        updated.status = 'finished';
        updated.winners = winners.filter(w => !w.startsWith('bot_'));
        updated.prizePerWinner = 0;
        if (updated.winners.length > 0) {
          const totalStake = updated.totalPlayers * updated.stake;
          updated.prizePerWinner = (totalStake / updated.winners.length) * 0.9;
        }
        updated.finishedAt = now;
      } else {
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
export function getGameById(games, gameId) {
  return games.find(g => g.id === gameId);
}
export function getActiveGameForUser(games, userId) {
  if (!userId) return null;

  for (const game of games) {

    const player = game.players?.find(p => p.userId === userId);
    if (player && game.status !== 'finished') {
      return game;
    }
  }

  return null;
}
export function addPlayerToGame(games, gameId, userId, cards) {
  const updatedGames = games.map(game => {
    if (game.id !== gameId) return game;

    const players = game.players || [];
    if (players.find(p => p.userId === userId)) {
      return game;
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
export function checkWinners(game) {
  if (!game.draw || game.drawIndex === 0 || game.status !== 'running') {
    return { realWinners: [], anyWinner: false };
  }


  const drawnNumbers = new Set(game.draw.slice(0, game.drawIndex));
  const realWinners = new Set();
  let anyWinner = false;


  if (game.botCards && game.botCards.length >= game.botPlayers) {
    for (let i = 0; i < game.botCards.length && !anyWinner; i++) {
      const card = game.botCards[i];
      for (let row = 0; row < 3 && !anyWinner; row++) {
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
          anyWinner = true;
        }
      }
    }
  }


  if (!anyWinner) {
    for (const player of game.players || []) {
      for (const card of player.cards) {
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
            realWinners.add(player.userId);
            anyWinner = true;
            break;
          }
        }
        if (anyWinner && realWinners.has(player.userId)) break;
      }
    }
  }

  return { realWinners: Array.from(realWinners), anyWinner };
}
function getWinnersByProgress(game) {
  if (!game.draw || game.drawIndex === 0) return [];

  const drawnNumbers = new Set(game.draw.slice(0, game.drawIndex));
  const playerProgress = [];


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


  if (playerProgress.length === 0) return [];
  const maxProgress = Math.max(...playerProgress.map(p => p.progress), 0);


  return playerProgress
    .filter(p => p.progress === maxProgress && p.progress > 0)
    .map(p => p.userId);
}
export function finishGame(games, gameId, realWinners) {
  const updatedGames = games.map(game => {
    if (game.id !== gameId) return game;


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
export function getAllPlayerCards(game) {
  const allCards = [];


  for (const player of game.players || []) {
    allCards.push(...player.cards);
  }



  if (!game.botCards) {

    game.botCards = [];
    for (let i = 0; i < (game.botPlayers || 0); i++) {
      const seed = hashString(`${game.id}_bot_${i}`);
      const botCard = generateCard3x9(seed);
      game.botCards.push(botCard);
    }

    const currentGames = loadGamesState()?.games || [];
    const updatedGames = currentGames.map(g =>
      g.id === game.id ? { ...g, botCards: game.botCards } : g
    );
    saveGamesState(updatedGames);
  }

  allCards.push(...(game.botCards || []));

  return allCards;
}
export function getCardsProgress(game) {
  if (!game.draw || game.drawIndex === 0 || game.status !== 'running') {
    return {};
  }

  const drawnNumbers = new Set(game.draw.slice(0, game.drawIndex));
  const progressMap = {};


  for (const player of game.players || []) {
    for (const card of player.cards) {
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
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}