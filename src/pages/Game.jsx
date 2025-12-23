import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { databases, appwriteIds } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';
import {
  getGameById,
  updateGamesState,
  addPlayerToGame,
  checkWinners,
  finishGame,
  generateCard3x9,
  getCardsProgress,
  getActiveGameForUser,
} from '../utils/gameManager';
import barrelSound from '../clicksound.mp3';
import { playWinSound, playLooseSound, playClickSound, toggleSound, isSoundEnabled } from '../utils/soundManager';
import crown from '../icons/crown.png'
import person from '../icons/person.png'
import ticket from '../icons/ticket.png'

export default function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [userCards, setUserCards] = useState([]);
  const [isInGame, setIsInGame] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [gameFinished, setGameFinished] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [jackpotWon, setJackpotWon] = useState(false);
  const [jackpotAmount, setJackpotAmount] = useState(0);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const previousDrawnCountRef = useRef(0);
  const audioRef = useRef(null);
  const gameStatusRef = useRef(null);
  const jackpotProcessedRef = useRef(false);
  const prizeProcessedRef = useRef(false);

  // Загрузка игр из localStorage
  useEffect(() => {
    const { initializeGames, updateGamesState } = require('../utils/gameManager');
    let currentGames = initializeGames();
    currentGames = updateGamesState(currentGames, false);
    setGames(currentGames);

    // Сбросить флаги обработки при смене игры
    jackpotProcessedRef.current = false;
    prizeProcessedRef.current = false;
    setJackpotWon(false);
    setJackpotAmount(0);
    setShowWinAnimation(false);

    const currentGame = getGameById(currentGames, id);
    if (currentGame) {
      setGame(currentGame);

      // Проверить, участвует ли пользователь
      const player = currentGame.players?.find(p => p.userId === user?.$id);
      if (player && currentGame.status !== 'finished') {
        setIsInGame(true);
        setUserCards(player.cards || []);
        setGameFinished(false);
      } else {
        setIsInGame(false);
        setGameFinished(false);
        // Если игра завершена, не показывать превью карточек - игра закончена
        if (currentGame.status !== 'finished') {
          // Показать превью карточек только если игра не завершена
          const previewCards = Array.from({ length: ticketCount }, () => generateCard3x9());
          setUserCards(previewCards);
        }
      }

      // Если игра завершена, показать результат и не позволять покупать билеты
      if (currentGame.status === 'finished') {
        setGameFinished(true);
        setIsInGame(false); // Убедиться, что пользователь не в игре после завершения
        const realWinners = (currentGame.winners || []).filter(w => !w.startsWith('bot_'));
        setIsWinner(realWinners.includes(user?.$id));
      }
    }
  }, [id, user, ticketCount]);

  // Обновление состояния игры каждую секунду
  useEffect(() => {
    if (games.length === 0) return;

    const interval = setInterval(() => {
      setGames(prevGames => {
        const updated = updateGamesState(prevGames, false);
        const currentGame = getGameById(updated, id);

        if (currentGame) {
          setGame(currentGame);

          // Обновить выпавшие числа
          if (currentGame.status === 'running' && currentGame.draw && currentGame.drawIndex > 0) {
            const newDrawnNumbers = currentGame.draw.slice(0, currentGame.drawIndex);
            setDrawnNumbers(newDrawnNumbers);

            // Проверить победителей только если игра еще не завершена
            if (currentGame.status === 'running' && !gameFinished) {
              const result = checkWinners(currentGame);
              // Игра заканчивается если выиграл ЛЮБОЙ игрок (боты включая)
              if (result.anyWinner) {
                // Завершить игру
                const finished = finishGame(updated, id, result.realWinners);

                setGameFinished(true);
                const userWon = result.realWinners.includes(user?.$id);
                setIsWinner(userWon);

                // Воспроизвести звук выигрыша или проигрыша
                if (userWon) {
                  playWinSound();
                  setShowWinAnimation(true);
                  // Скрыть анимацию через 3 секунды
                  setTimeout(() => setShowWinAnimation(false), 3000);
                } else {
                  playLooseSound();
                }

                // Начислить выигрыш победителям и джекпот (если выиграли)
                if (result.realWinners.length > 0 && result.realWinners.includes(user?.$id) && appwriteIds.usersCollectionId && !prizeProcessedRef.current) {
                  prizeProcessedRef.current = true;
                  jackpotProcessedRef.current = true;

                  const totalStake = currentGame.totalPlayers * currentGame.stake;
                  const winnerCount = result.realWinners.length;
                  const prize = (totalStake / winnerCount) * 0.9;

                  // Розыгрыш джекпота с вероятностью 5%
                  const wonJackpot = Math.random() < 0.05;
                  const jackpotValue = wonJackpot && currentGame.jackpot ? currentGame.jackpot : 0;

                  if (wonJackpot && currentGame.jackpot) {
                    setJackpotWon(true);
                    setJackpotAmount(currentGame.jackpot);
                  }

                  databases.getDocument(appwriteIds.databaseId, appwriteIds.usersCollectionId, user.$id)
                    .then(userDoc => {
                      const balance = Number(userDoc.balance || 0);
                      const newBalance = balance + prize + jackpotValue;
                      return databases.updateDocument(
                        appwriteIds.databaseId,
                        appwriteIds.usersCollectionId,
                        user.$id,
                        { balance: +(newBalance).toFixed(2) }
                      );
                    })
                    .then(() => {
                      window.dispatchEvent(new CustomEvent('balance-changed'));
                    })
                    .catch(err => console.error('Failed to credit prize', err));
                }

                return finished;
              }
            }

            // Если игра закончилась, но еще не показывали результат
            if (currentGame.status === 'finished' && !gameFinished) {
              setGameFinished(true);
              const realWinners = (currentGame.winners || []).filter(w => !w.startsWith('bot_'));
              const userWon = realWinners.includes(user?.$id);
              setIsWinner(userWon);

              // Воспроизвести звук выигрыша или проигрыша
              if (userWon) {
                playWinSound();
                setShowWinAnimation(true);
                // Скрыть анимацию через 3 секунды
                setTimeout(() => setShowWinAnimation(false), 3000);
              } else {
                playLooseSound();
              }

              // Начислить выигрыш и джекпот при завершении игры по времени
              if (userWon && appwriteIds.usersCollectionId && !prizeProcessedRef.current) {
                prizeProcessedRef.current = true;

                const totalStake = currentGame.totalPlayers * currentGame.stake;
                const winnerCount = realWinners.length;
                const prize = winnerCount > 0 ? (totalStake / winnerCount) * 0.9 : 0;

                // Розыгрыш джекпота с вероятностью 5%
                const wonJackpot = Math.random() < 0.05;
                const jackpotValue = wonJackpot && currentGame.jackpot ? currentGame.jackpot : 0;

                if (wonJackpot && currentGame.jackpot) {
                  setJackpotWon(true);
                  setJackpotAmount(currentGame.jackpot);
                }

                if (prize > 0 || jackpotValue > 0) {
                  databases.getDocument(appwriteIds.databaseId, appwriteIds.usersCollectionId, user.$id)
                    .then(userDoc => {
                      const balance = Number(userDoc.balance || 0);
                      const newBalance = balance + prize + jackpotValue;
                      return databases.updateDocument(
                        appwriteIds.databaseId,
                        appwriteIds.usersCollectionId,
                        user.$id,
                        { balance: +(newBalance).toFixed(2) }
                      );
                    })
                    .then(() => {
                      window.dispatchEvent(new CustomEvent('balance-changed'));
                    })
                    .catch(err => console.error('Failed to credit prize', err));
                }
              }
            }
          }

          // Обновить карточки пользователя если он в игре (только если игра не завершена)
          if (currentGame.status !== 'finished') {
            const player = currentGame.players?.find(p => p.userId === user?.$id);
            if (player) {
              setUserCards(player.cards || []);
              setIsInGame(true);
            }
          } else {
            // Если игра завершена, убедиться что пользователь не в игре
            setIsInGame(false);
          }
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [games.length, id, user, gameFinished]);

  // Обновление превью карточек при изменении количества билетов
  useEffect(() => {
    if (!isInGame) {
      // Регенерировать карточки только если количество не совпадает
      // Это предотвращает пересоздание карточек при ручном удалении/обновлении
      if (userCards.length !== ticketCount) {
        const previewCards = Array.from({ length: ticketCount }, () => generateCard3x9());
        setUserCards(previewCards);
      }
    }
  }, [ticketCount, isInGame, userCards.length]);

  // Убрали автоматический редирект - пользователь сам решает, что делать после игры

  // Инициализация состояния звука
  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  // Инициализация аудио
  useEffect(() => {
    audioRef.current = new Audio(barrelSound);
    audioRef.current.volume = 0.5; // Установить громкость (0.0 - 1.0)

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Воспроизведение звука при выпадении нового числа
  useEffect(() => {
    if (!game) return;

    const currentStatus = game.status;
    const prevStatus = gameStatusRef.current;

    // Если игра только что перешла в статус 'running', инициализировать счетчик
    if (currentStatus === 'running' && prevStatus !== 'running') {
      // Игра только что началась - установить счетчик на текущее количество чисел
      // Это предотвратит воспроизведение звука для чисел, которые уже были выпавшими
      previousDrawnCountRef.current = drawnNumbers.length;
      gameStatusRef.current = currentStatus;
      return;
    }

    // Если игра не активна, сбросить счетчик
    if (currentStatus !== 'running') {
      if (prevStatus === 'running') {
        // Игра только что закончилась - сбросить счетчик для следующей игры
        previousDrawnCountRef.current = 0;
      }
      gameStatusRef.current = currentStatus;
      return;
    }

    // Игра активна ('running') - проверить, появилось ли новое число
    if (currentStatus === 'running' && drawnNumbers.length > previousDrawnCountRef.current) {
      // Новое число выпало - воспроизвести звук
      if (soundOn && audioRef.current) {
        try {
          // Сбросить время воспроизведения на начало для повторного воспроизведения
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(err => {
            // Игнорировать ошибки автоплей (браузер может блокировать автоплей без взаимодействия пользователя)
            console.log('Audio play error (ignored):', err);
          });
        } catch (err) {
          console.log('Audio play error (ignored):', err);
        }
      }
      previousDrawnCountRef.current = drawnNumbers.length;
    }

    gameStatusRef.current = currentStatus;
  }, [drawnNumbers, game, soundOn]);

  async function buyTickets() {
    if (!game || !user?.$id || isInGame) return;

    // Запретить покупку билетов, если игра завершена
    if (game.status === 'finished' || gameFinished) {
      setError('Игра уже завершена');
      return;
    }

    // Проверить, есть ли у пользователя активная игра в другой игре
    const activeGame = getActiveGameForUser(games, user?.$id);
    if (activeGame && activeGame.id !== game.id) {
      setError('Вы уже участвуете в другой игре. Завершите текущую игру перед началом новой.');
      return;
    }

    // Запретить покупку билетов только во время игры
    if (game.status === 'running') {
      setError('Нельзя покупать билеты во время игры');
      return;
    }

    // Воспроизвести звук клика при покупке билета
    playClickSound();

    setLoading(true);
    setError('');

    try {
      const userDoc = await databases.getDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        user.$id
      );
      const balance = Number(userDoc.balance || 0);
      const played = Number(userDoc.played || 0);
      // Использовать фактическое количество карточек (может отличаться от ticketCount при ручных изменениях)
      const actualTicketCount = userCards.length;
      const totalCost = game.stake * actualTicketCount;

      if (balance < totalCost) {
        throw new Error('Недостаточно средств');
      }

      // Списать средства
      await databases.updateDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        user.$id,
        {
          balance: +(balance - totalCost).toFixed(2),
          played: played + 1
        }
      );
      window.dispatchEvent(new CustomEvent('balance-changed'));

      // Использовать текущие карточки пользователя (которые могли быть обновлены/удалены)
      const cards = userCards;

      // Добавить игрока в игру
      const updatedGames = addPlayerToGame(games, id, user.$id, cards);

      // Обновить состояние игр после добавления игрока
      const finalGames = updateGamesState(updatedGames, false);
      setGames(finalGames);

      const updatedGame = getGameById(finalGames, id);
      if (updatedGame) {
        setGame(updatedGame);
        setIsInGame(true);
        setUserCards(cards);
      }
    } catch (e) {
      setError(e?.message || 'Не удалось купить билеты');
    } finally {
      setLoading(false);
    }
  }

  function isMarked(num) {
    return drawnNumbers.includes(num);
  }

  // Обновить конкретный билет (регенерировать случайно)
  function updateTicket(cardIdx) {
    if (isInGame) return; // Нельзя обновлять билеты после покупки

    const updatedCards = [...userCards];
    updatedCards[cardIdx] = generateCard3x9();
    setUserCards(updatedCards);
  }

  // Удалить билет
  function deleteTicket(cardIdx) {
    if (isInGame) return; // Нельзя удалять билеты после покупки
    if (userCards.length <= 1) return; // Должен остаться хотя бы один билет

    const updatedCards = userCards.filter((_, idx) => idx !== cardIdx);
    setUserCards(updatedCards);
    setTicketCount(updatedCards.length);
  }

  // Получить последние 5 выпавших чисел для отображения (самое новое слева)
  const last5Numbers = useMemo(() => {
    if (drawnNumbers.length === 0) return [null, null, null, null, null];
    const last5 = drawnNumbers.slice(-5);
    while (last5.length < 5) {
      last5.unshift(null);
    }

    return last5.reverse();
  }, [drawnNumbers]);

  // Функция для форматирования времени
  function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Получить название игры по ставке
  function getGameTitle(stake) {
    const titles = ['LITE', 'PRO', 'PRIME', 'ELITE', 'PRIME'];
    const stakes = [0.2, 0.5, 1, 2, 10];
    const index = stakes.indexOf(stake);
    return index !== -1 ? titles[index] : 'ИГРА';
  }

  // Получить цвет для названия игры
  function getGameColor(stake) {
    const colors = ['#9fc057', '#83a9f6', '#fc8d65', '#986ff2', '#c8cce2'];
    const stakes = [0.2, 0.5, 1, 2, 10];
    const index = stakes.indexOf(stake);
    return index !== -1 ? colors[index] : '#83a9f6';
  }

  // Получить статистику по карточкам (только ближайшие к победе)
  const cardsProgress = useMemo(() => {
    if (!game || game.status !== 'running') return {};
    const progress = getCardsProgress(game);
    // Оставить только минимальное количество оставшихся номеров (ближайшие к победе)
    const keys = Object.keys(progress).map(k => parseInt(k)).sort((a, b) => a - b);
    if (keys.length === 0) return {};
    const minRemaining = keys[0];
    return { [minRemaining]: progress[minRemaining] };
  }, [game]);

  if (!game) {
    return (
      <div className='App with-bar'>
        <div className='auth-card'>
          <p>Загрузка игры...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='App'>
      <div className='playingarea'>
        <h2>Игра {game.stake}₼</h2>
        {error ? <p className='auth-error'>{error}</p> : null}

        {/* Статус игры */}
        <div className='game-info' style={{ marginBottom: '20px' }}>
          {game.status === 'waiting' && (
            <p>Игроков: {game.totalPlayers} / 20</p>
          )}
          {game.status === 'counting' && (
            <p>До начала: {Math.ceil(game.startCountdown)} сек • Игроков: {game.totalPlayers}</p>
          )}
          {game.status === 'running' && (
            <p>Игра идет • Игроков: {game.totalPlayers}</p>
          )}
          {game.status === 'finished' && (
            <p>Игра завершена</p>
          )}
        </div>

        {/* Окошки с числами (только во время игры) */}
        {game.status === 'running' && (
          <div className='number-windows' style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <div className="lines">
              <div className="r"></div>
              <div className="r"></div>
            </div>

            {last5Numbers.map((num, idx) => {
              const isLatest = idx === 0; // Первое окошко (самое новое число) - самое большое
              return (
                <div
                  key={idx}
                  className='barrel'
                  style={{
                    width: isLatest ? '90px' : '65px',
                    height: isLatest ? '90px' : '65px',
                    fontSize: isLatest ? '36px' : '23px',
                  }}
                >
                  <div className="l1">
                    <div className="l2">
                      <div className="l3">
                        <div className="l4">
                          <p
                            style={{
                              marginTop: isLatest ? '30px' : '18px',
                            }}
                          >
                            {num !== null ? num : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Статистика карточек (только во время игры) */}
        {game.status === 'running' && (
          <div style={{
            backgroundColor: '#2c3548',
            padding: '15px',
            borderRadius: '12px',
            marginBottom: '20px',
          }}>
            {/* Верхняя строка с информацией */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '15px',
              flexWrap: 'wrap',
            }}>
              {/* Приз */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div style={{
                  backgroundColor: '#986ff2',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img src={crown} alt="приз" style={{ width: '24px', height: '24px' }} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', lineHeight: '1.2' }}>
                    {game.jackpot ? game.jackpot.toFixed(2) : '0.00'}₼
                  </div>
                </div>
              </div>

              {/* Количество игроков */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div style={{
                  backgroundColor: '#83a9f6',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img src={person} alt="игроки" style={{ width: '24px', height: '24px' }} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', lineHeight: '1.2' }}>
                    {game.totalPlayers || 0}
                  </div>
                </div>
              </div>

              {/* Кнопка звука */}
              <button
                onClick={() => {
                  const newState = toggleSound();
                  setSoundOn(newState);
                }}
                style={{
                  backgroundColor: '#4a5568',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title={soundOn ? 'Выключить звук' : 'Включить звук'}
              >
                {soundOn ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9V15H7L12 20V4L7 9H3ZM16.5 12C16.5 10.23 15.5 8.71 14 7.97V16.02C15.5 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="#fff" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.5 12C16.5 10.23 15.5 8.71 14 7.97V16.02C15.5 15.29 16.5 13.77 16.5 12ZM19 3.27L16.5 5.77L14 3.27V5.29C12.62 6.06 11.57 7.31 11.11 8.77L9.71 7.37C10.26 5.63 11.5 4.19 13.14 3.27H14V3.27ZM19 12C19 14.19 18.1 16.16 16.64 17.57L18.05 18.98C19.95 17.22 21 14.76 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM3 9V15H7L12 20V4L7 9H3Z" fill="#fff" />
                    <path d="M21.5 4.5L4.5 21.5L3.5 20.5L20.5 3.5L21.5 4.5Z" fill="#fff" />
                  </svg>
                )}
              </button>
            </div>

            {/* Подпись про карточки */}
            {Object.keys(cardsProgress).length > 0 && (
              <div style={{
                textAlign: 'center',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                {Object.entries(cardsProgress)
                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  .map(([remaining, count]) => (
                    <span
                      key={remaining}
                      style={{
                        color: '#fff',
                        fontSize: '13px',
                        display: 'inline-block',
                        margin: '0 5px',
                      }}
                    >
                      {count} {count === 1 ? 'карточка' : count < 5 ? 'карточки' : 'карточек'} ожидает {remaining} {remaining === 1 ? 'номер' : remaining < 5 ? 'номера' : 'номеров'}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Блок "Вы в игре" */}
        {isInGame && (
          <div style={{
            backgroundColor: '#2c3548',
            padding: '15px',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
              Вы в игре
            </p>
            {game.status === 'waiting' && game.totalPlayers < 20 && (
              <p style={{ margin: '8px 0 0 0', color: '#fff', fontSize: '14px' }}>
                Ожидание игроков: {game.totalPlayers} / 20
              </p>
            )}
            {game.status === 'counting' && (
              <p style={{ margin: '8px 0 0 0', color: '#fff', fontSize: '14px' }}>
                До начала: {Math.ceil(game.startCountdown)} сек • Игроков: {game.totalPlayers}
              </p>
            )}
            {game.status === 'running' && (
              <p style={{ margin: '8px 0 0 0', color: '#fff', fontSize: '14px' }}>
                Игра идет • Игроков: {game.totalPlayers}
              </p>
            )}
          </div>
        )}

        {/* Анимация выигрыша */}
        {showWinAnimation && isWinner && (
          <div
            className="win-animation"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              backgroundColor: '#2c3548',
              padding: '40px 60px',
              borderRadius: '20px',
              textAlign: 'center',
              border: '5px solid #fff',
            }}
          >
            <p style={{ margin: 0, color: '#fff', fontSize: '36px', fontWeight: 'bold' }}>
              🎉 ПОЗДРАВЛЯЕМ! 🎉
            </p>
            <p style={{ margin: '10px 0 0 0', color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
              ВЫ ВЫИГРАЛИ!
            </p>
          </div>
        )}

        {/* Сообщение о завершении игры */}
        {gameFinished && (
          <div style={{
            backgroundColor: isWinner ? '#2c3548' : '#ff5733',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
              {isWinner ? 'Поздравляем! Вы выиграли!' : 'Игра завершена'}
            </p>
            {isWinner && game.prizePerWinner > 0 && (
              <p style={{ margin: '8px 0 0 0', color: '#fff', fontSize: '14px' }}>
                Ваш выигрыш: {game.prizePerWinner.toFixed(2)}₼
              </p>
            )}
            <button
              onClick={() => {
                playClickSound();
                navigate('/app');
              }}
              style={{
                marginTop: '15px',
                padding: '12px 24px',
                backgroundColor: '#fff',
                color: isWinner ? '#2c3548' : '#ff5733',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              Вернуться к играм
            </button>
          </div>
        )}

        {/* Плашка с розыгрышем джекпота */}
        {jackpotWon && (
          <div style={{
            backgroundColor: '#ffd700',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
            border: '3px solid #ffed4e',
            animation: 'pulse 2s ease-in-out infinite',
            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.5)',
          }}>
            <p style={{ margin: 0, color: '#000', fontSize: '24px', fontWeight: 'bold' }}>
              🎉 ДЖЕКПОТ! 🎉
            </p>
            <p style={{ margin: '8px 0 0 0', color: '#000', fontSize: '20px', fontWeight: 'bold' }}>
              Вы выиграли джекпот: {jackpotAmount}₼
            </p>
          </div>
        )}

        {/* Карточки */}
        <div className='loto-multi-cards' style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          marginBottom: '20px',
        }}>
          {userCards.map((card, cardIdx) => (
            <div key={cardIdx} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              {/* Кнопки обновления и удаления (только до покупки билетов) */}
              {!isInGame && game.status !== 'finished' && game.status !== 'running' && (
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                }}>
                  <button
                    onClick={() => updateTicket(cardIdx)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#2c3548',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#0452cc'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#2c3548'}
                  >
                    Обновить
                  </button>
                  <button
                    onClick={() => deleteTicket(cardIdx)}
                    disabled={userCards.length <= 1}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: userCards.length <= 1 ? '#555' : '#ff5733',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: userCards.length <= 1 ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseOver={(e) => {
                      if (userCards.length > 1) {
                        e.target.style.backgroundColor = '#cc4526';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (userCards.length > 1) {
                        e.target.style.backgroundColor = '#ff5733';
                      }
                    }}
                  >
                    Удалить
                  </button>
                </div>
              )}
              <div className='loto-card' style={{
                backgroundColor: '#c3d1e5',
                padding: '15px',
                borderRadius: '12px',
              }}>
                {card.map((row, rowIdx) => (
                  <div key={rowIdx} className='loto-row-9' style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(9, 1fr)',
                    gap: '2px',
                  }}>
                    {row.map((num, colIdx) => {
                      const marked = num && isMarked(num);
                      const hasNumber = !!num;
                      return (
                        <div
                          key={colIdx}
                          style={{
                            padding: '6px',
                            textAlign: 'center',
                            backgroundColor: hasNumber ? '#c3d1e5' : '#99a8c2',
                            color: '#2a3143',
                            borderRadius: '10px',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1px',
                            marginTop: '1px',
                            position: 'relative',
                            border: 'solid 1px rgba(136, 142, 175, 0.4)',
                          }}
                        >
                          {marked && (
                            <div
                              style={{
                                position: 'absolute',
                                width: '70%',
                                height: '70%',
                                borderRadius: '50%',
                                backgroundColor: '#986ff2',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                          )}
                          <span
                            style={{
                              position: 'relative',
                              fontWeight: 700,
                              fontSize: 20,
                              zIndex: 1,
                              mixBlendMode: marked ? 'overlay' : 'normal',
                            }}
                          >
                            {num ?? ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Кнопки покупки билетов */}
        {!isInGame && game.status !== 'finished' && (
          <div style={{
            position: 'fixed',
            bottom: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '500px',
            padding: '0 20px',
            zIndex: 2,
            boxSizing: 'border-box',
          }}>
            {/* Верхняя панель: название игры и селектор количества */}
            <div style={{
              backgroundColor: '#2c3548',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              {/* Левая часть: иконка билета и название */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: getGameColor(game.stake),
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img src={ticket} alt="билет" style={{ width: '20px', height: '20px' }} />
                </div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>
                  {getGameTitle(game.stake)} {game.stake.toFixed(2)}₼
                </div>
              </div>

              {/* Правая часть: селектор количества */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <button
                  onClick={() => {
                    playClickSound();
                    setTicketCount(Math.max(1, ticketCount - 1));
                  }}
                  disabled={ticketCount <= 1 || game.status === 'running'}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: (ticketCount <= 1 || game.status === 'running') ? '#4a5568' : '#4a5568',
                    color: '#fff',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    cursor: (ticketCount <= 1 || game.status === 'running') ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  -
                </button>
                <div style={{
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 600,
                  minWidth: '30px',
                  textAlign: 'center',
                }}>
                  {ticketCount}
                </div>
                <button
                  onClick={() => {
                    playClickSound();
                    setTicketCount(ticketCount + 1);
                  }}
                  disabled={game.status === 'running'}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: game.status === 'running' ? '#4a5568' : getGameColor(game.stake),
                    color: '#fff',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    cursor: game.status === 'running' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Нижняя кнопка покупки с таймером */}
            <button
              className='b2'
              onClick={buyTickets}
              disabled={loading || game.status === 'running'}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: game.status === 'running' ? '#4a5568' : '#83a9f6',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: (loading || game.status === 'running') ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                minHeight: '48px',
              }}
            >
              {/* Левая часть: прогресс-бар (если статус counting) */}
              {game.status === 'counting' && game.startCountdown !== null ? (
                <div className='countdown-progress' style={{
                  width: 150,
                  minWidth: 0,
                  height: '24px',
                }}>
                  <div
                    className='countdown-progress-bar'
                    style={{
                      width: `${((60 - (game.startCountdown || 0)) / 60) * 100}%`
                    }}
                  />
                  <span className='countdown-time'>
                    {formatTime(Math.ceil(game.startCountdown || 0))}
                  </span>
                </div>
              ) : (
                <div style={{ flex: '1 1 auto' }}></div>
              )}

              {/* Правая часть: текст покупки */}
              <div style={{
                flex: '0 0 auto',
                pointerEvents: 'none',
                opacity: game.status === 'running' ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}>
                Купить {(game.stake * ticketCount).toFixed(2)}₼
              </div>
            </button>
          </div>
        )}
      </div>
    </div >
  );
}
