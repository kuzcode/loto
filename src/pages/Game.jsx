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
  getAllPlayerCards,
  getCardsProgress,
} from '../utils/gameManager';

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
  const intervalRef = useRef(null);

  // Загрузка игр из localStorage
  useEffect(() => {
    const { initializeGames, updateGamesState } = require('../utils/gameManager');
    let currentGames = initializeGames();
    currentGames = updateGamesState(currentGames, false);
    setGames(currentGames);

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
        // Показать превью карточек
        const previewCards = Array.from({ length: ticketCount }, () => generateCard3x9());
        setUserCards(previewCards);
      }

      // Если игра завершена, показать результат
      if (currentGame.status === 'finished') {
        setGameFinished(true);
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
                setIsWinner(result.realWinners.includes(user?.$id));

                // Начислить выигрыш победителям
                if (result.realWinners.length > 0 && result.realWinners.includes(user?.$id) && appwriteIds.usersCollectionId) {
                  const totalStake = currentGame.totalPlayers * currentGame.stake;
                  const winnerCount = result.realWinners.length;
                  const prize = (totalStake / winnerCount) * 0.9;

                  databases.getDocument(appwriteIds.databaseId, appwriteIds.usersCollectionId, user.$id)
                    .then(userDoc => {
                      const balance = Number(userDoc.balance || 0);
                      return databases.updateDocument(
                        appwriteIds.databaseId,
                        appwriteIds.usersCollectionId,
                        user.$id,
                        { balance: +(balance + prize).toFixed(2) }
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
              setIsWinner(realWinners.includes(user?.$id));
            }
          }

          // Обновить карточки пользователя если он в игре
          const player = currentGame.players?.find(p => p.userId === user?.$id);
          if (player) {
            setUserCards(player.cards || []);
            setIsInGame(true);
          }
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [games.length, id, user]);

  // Обновление превью карточек при изменении количества билетов
  useEffect(() => {
    if (!isInGame) {
      const previewCards = Array.from({ length: ticketCount }, () => generateCard3x9());
      setUserCards(previewCards);
    }
  }, [ticketCount, isInGame]);

  // Редирект через 5 секунд после завершения игры
  useEffect(() => {
    if (gameFinished) {
      const timer = setTimeout(() => {
        navigate('/app');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gameFinished, navigate]);

  async function buyTickets() {
    if (!game || !user?.$id || isInGame) return;
    
    // Запретить покупку билетов во время игры или отсчета
    if (game.status === 'running' || game.status === 'counting') {
      setError('Нельзя покупать билеты во время игры');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const userDoc = await databases.getDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        user.$id
      );
      const balance = Number(userDoc.balance || 0);
      const totalCost = game.stake * ticketCount;

      if (balance < totalCost) {
        throw new Error('Недостаточно средств');
      }

      // Списать средства
      await databases.updateDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        user.$id,
        { balance: +(balance - totalCost).toFixed(2) }
      );
      window.dispatchEvent(new CustomEvent('balance-changed'));

      // Генерировать карточки для пользователя
      const cards = Array.from({ length: ticketCount }, () => generateCard3x9());

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

  // Получить последние 5 выпавших чисел для отображения (самое новое слева)
  const last5Numbers = useMemo(() => {
    if (drawnNumbers.length === 0) return [null, null, null, null, null];
    const last5 = drawnNumbers.slice(-5);
    // Дополнить до 5 элементов null'ами если чисел меньше 5
    while (last5.length < 5) {
      last5.unshift(null);
    }
    // Перевернуть, чтобы самое новое было слева
    return last5.reverse();
  }, [drawnNumbers]);

  // Получить статистику по карточкам (только ближайшие к победе)
  const cardsProgress = useMemo(() => {
    if (!game || game.status !== 'running') return {};
    const progress = getCardsProgress(game);
    // Оставить только минимальное количество оставшихся номеров (ближайшие к победе)
    const keys = Object.keys(progress).map(k => parseInt(k)).sort((a, b) => a - b);
    if (keys.length === 0) return {};
    const minRemaining = keys[0];
    return { [minRemaining]: progress[minRemaining] };
  }, [game, game?.drawIndex, game?.status]);

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
            gap: '10px',
            marginBottom: '20px',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {last5Numbers.map((num, idx) => {
              const isLatest = idx === 0; // Первое окошко (самое новое число) - самое большое
              return (
                <div
                  key={idx}
                  style={{
                    width: isLatest ? '80px' : '60px',
                    height: isLatest ? '80px' : '60px',
                    borderRadius: '50%',
                    backgroundColor: num ? '#0565ff' : '#333',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isLatest ? '32px' : '24px',
                    fontWeight: 'bold',
                    border: isLatest ? '3px solid #fff' : '2px solid #666',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {num !== null ? num : ''}
                </div>
              );
            })}
          </div>
        )}

        {/* Статистика карточек (только во время игры) */}
        {game.status === 'running' && Object.keys(cardsProgress).length > 0 && (
          <div style={{
            backgroundColor: '#2b2d3390',
            padding: '15px',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            {Object.entries(cardsProgress)
              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
              .map(([remaining, count]) => (
                <span
                  key={remaining}
                  style={{
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                >
                  {count} {count === 1 ? 'карточка' : count < 5 ? 'карточки' : 'карточек'} ожидает {remaining} {remaining === 1 ? 'номер' : remaining < 5 ? 'номера' : 'номеров'}
                </span>
              ))}
          </div>
        )}

        {/* Блок "Вы в игре" */}
        {isInGame && (
          <div style={{
            backgroundColor: '#0565ff',
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

        {/* Сообщение о завершении игры */}
        {gameFinished && (
          <div style={{
            backgroundColor: isWinner ? '#0565ff' : '#ff5733',
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
            <div key={cardIdx} className='loto-card' style={{
              backgroundColor: '#fff',
              padding: '15px',
              borderRadius: '12px',
            }}>
              {card.map((row, rowIdx) => (
                <div key={rowIdx} className='loto-row-9' style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(9, 1fr)',
                  gap: '4px',
                }}>
                  {row.map((num, colIdx) => (
                    <div
                      key={colIdx}
                      style={{
                        padding: '8px',
                        textAlign: 'center',
                        backgroundColor: num && isMarked(num) ? '#0565ff' : num ? '#f0f0f0' : 'transparent',
                        color: num && isMarked(num) ? '#fff' : '#000',
                        borderRadius: '4px',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: num && isMarked(num) ? 'bold' : 'normal',
                      }}
                    >
                      {num ?? ''}
                    </div>
                  ))}
                </div>
              ))}
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
            boxSizing: 'border-box',
          }}>
            <div
            className='blurred'
            style={{
              backgroundColor: '#2b2d3390',
              padding: '20px',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
            }}>
              {(game.status === 'running' || game.status === 'counting') && (
                <p style={{ 
                  margin: '0 0 10px 0', 
                  color: '#ff5733', 
                  fontSize: '14px', 
                  textAlign: 'center' 
                }}>
                  Покупка билетов недоступна во время игры
                </p>
              )}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '15px',
              }}>
                <button
                  onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                  disabled={ticketCount <= 1 || game.status === 'running' || game.status === 'counting'}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: (ticketCount <= 1 || game.status === 'running' || game.status === 'counting') ? '#555' : '#0565ff',
                    color: '#fff',
                    fontSize: '24px',
                    cursor: (ticketCount <= 1 || game.status === 'running' || game.status === 'counting') ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  -
                </button>
                <button
                  className='b2'
                  onClick={buyTickets}
                  disabled={loading || game.status === 'running' || game.status === 'counting'}
                  style={{
                    flex: 1,
                    padding: '15px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: (game.status === 'running' || game.status === 'counting') ? '#555' : '#0565ff',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: (loading || game.status === 'running' || game.status === 'counting') ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? '...' : `Купить билет${ticketCount > 1 ? 'ы' : ''}`}
                  <div style={{ fontSize: '14px', marginTop: '4px', opacity: 0.9 }}>
                    {game.stake * ticketCount}₼
                  </div>
                </button>
                <button
                  onClick={() => setTicketCount(ticketCount + 1)}
                  disabled={game.status === 'running' || game.status === 'counting'}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: (game.status === 'running' || game.status === 'counting') ? '#555' : '#0565ff',
                    color: '#fff',
                    fontSize: '24px',
                    cursor: (game.status === 'running' || game.status === 'counting') ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
