import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeGames, updateGamesState, getActiveGameForUser } from './utils/gameManager';
import { playClickSound } from './utils/soundManager';
import { useAuth } from './auth/AuthProvider';
import bag from './icons/bag.png'
import person from './icons/person.png'
import crown from './icons/crown.png'

export default function ProtectedApp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const info = [
    {
      color: '#9fc057',
      title: 'LITE'
    },
    {
      color: '#83a9f6',
      title: 'PRO'
    },
    {
      color: '#fc8d65',
      title: 'PRIME'
    },
    {
      color: '#986ff2',
      title: 'ELITE'
    },
    {
      color: '#c8cce2',
      title: 'PRIME'
    }];

  useEffect(() => {
    // Инициализация игр
    let initialized = initializeGames();
    setGames(initialized);

    // Обновление состояния каждую секунду
    const interval = setInterval(() => {
      initialized = updateGamesState(initialized, false);
      setGames([...initialized]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getGameStatusText(game) {
    if (game.status === 'waiting') {
      return `${game.totalPlayers} игроков`;
    } else if (game.status === 'counting') {
      return `До начала: ${Math.ceil(game.startCountdown)} сек (${game.totalPlayers} игроков)`;
    } else if (game.status === 'running') {
      return `Идет игра`;
    } else if (game.status === 'finished') {
      return 'Игра завершена';
    }
    else return '';
  }

  return (
    <div className='App with-bg'>
      <p className='titlem'>Игры</p>
      <div className='games'>
        {games.map((game) => (
          <div
            key={game.id}
            className='game-card'
            style={{
              background: info[games.indexOf(game)].color,
              cursor: game.status === 'finished' ? 'default' : 'pointer',
              opacity: game.status === 'finished' ? 0.4 : 1
            }}
            onClick={() => {
              if (game.status === 'finished') return;

              // Проверить, есть ли у пользователя активная игра
              const activeGame = getActiveGameForUser(games, user?.$id);
              if (activeGame && activeGame.id !== game.id) {
                // Пользователь уже в другой игре - запретить вход
                alert('Вы уже участвуете в другой игре. Завершите текущую игру перед началом новой.');
                return;
              }

              playClickSound();
              navigate(`/game/${game.id}`);
            }}
          >
            <div className='row'>
              <div className="col1">
                <h3 style={{ marginTop: 0, fontWeight: 400, fontSize: 15 }}>{info[games.indexOf(game)].title}<span className='stake'> {game.stake}₼</span></h3>
                <div className="col">
                  <p className='ingame'>В ИГРЕ</p>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <img src={person} className="people" />
                    <p style={{ margin: '4px 0', fontSize: '20px', marginLeft: 6, fontWeight: 700 }}>{game.totalPlayers}</p>
                  </div>
                </div>
              </div>


              <div className="col2">
                <img src={crown} className='crown' />
                <p className='win'>
                  ВЫИГРЫШ
                </p>
                <div className='prize'>
                  <p>{((game.totalPlayers * game.stake) * 0.9).toFixed(2)}₼</p>
                  <div className="bg"></div>
                </div>
              </div>


              <div className="col3">
                {game.status === 'waiting' && (
                  <p className='status'>
                    набор
                  </p>
                )}
                {game.status === 'counting' && (
                  <div className='countdown-progress'>
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
                )}
                {game.status === 'running' && (
                  <p className='status'>
                    игра идёт
                  </p>
                )}
                {game.status === 'finished' && (
                  <p className='status'>
                    завершена
                  </p>
                )}
                <img className='bag' src={bag} />
                <div className='jackpot'>
                  <p style={{ margin: 0, fontSize: '12px', color: '#fff', opacity: 0.9 }}>
                    Джекпот
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>
                    {game.jackpot || 0}₼
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <div className="prev">
                <p style={{margin: 0}}>Предыдущая игра</p>
                <div className="line"></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '8px' }}>
                {/* Последние 5 чисел из предыдущей игры */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {(() => {
                    // Получить последние 5 чисел из предыдущей игры
                    let lastNumbers = [];
                    
                    // Если игра в статусе finished, используем текущие данные
                    if (game.status === 'finished' && game.draw && game.drawIndex > 0) {
                      const drawn = game.draw.slice(0, game.drawIndex);
                      lastNumbers = drawn.slice(-5); // Последние 5 чисел
                    } 
                    // Если есть сохраненные данные последней игры
                    else if (game.lastGameDraw && game.lastGameDraw.length > 0) {
                      lastNumbers = game.lastGameDraw.slice(-5); // Последние 5 чисел
                    }
                    
                    // Если данных нет, генерируем стабильные случайные числа на основе game.id
                    if (lastNumbers.length === 0) {
                      const gameIndex = games.indexOf(game);
                      const seed = game.id ? game.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + gameIndex : gameIndex * 1000;
                      let seedValue = seed;
                      const random = () => {
                        seedValue = (seedValue * 9301 + 49297) % 233280;
                        return seedValue / 233280;
                      };
                      const numbers = [];
                      const used = new Set();
                      let attempts = 0;
                      while (numbers.length < 5 && attempts < 100) {
                        attempts++;
                        const num = Math.floor(random() * 90) + 1;
                        if (!used.has(num)) {
                          used.add(num);
                          numbers.push(num);
                        }
                      }
                      // Если не удалось сгенерировать 5 уникальных, дополняем последовательными
                      while (numbers.length < 5) {
                        for (let i = 1; i <= 90 && numbers.length < 5; i++) {
                          if (!used.has(i)) {
                            used.add(i);
                            numbers.push(i);
                          }
                        }
                      }
                      lastNumbers = numbers.slice(0, 5);
                    }
                    
                    // Дополнить до 5 элементов, если их меньше
                    if (lastNumbers.length < 5) {
                      const used = new Set(lastNumbers);
                      while (lastNumbers.length < 5) {
                        for (let i = 1; i <= 90 && lastNumbers.length < 5; i++) {
                          if (!used.has(i)) {
                            used.add(i);
                            lastNumbers.push(i);
                            break;
                          }
                        }
                      }
                    }
                    
                    // Взять ровно 5 элементов (последние)
                    lastNumbers = lastNumbers.slice(-5);
                    
                    return lastNumbers.map((num, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: '#00000000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: '2px solid #0000001f'
                        }}
                      >
                        {num}
                      </div>
                    ));
                  })()}
                </div>
                
                {/* Выигрыш */}
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#2a3143',
                }}>
                  {(() => {
                    // Если игра в статусе finished, используем текущий выигрыш
                    if (game.status === 'finished' && game.prizePerWinner) {
                      return game.prizePerWinner.toFixed(2);
                    }
                    // Если есть сохраненный выигрыш последней игры
                    if (game.lastGamePrize && game.lastGamePrize > 0) {
                      return game.lastGamePrize.toFixed(2);
                    }
                    // Если данных нет, генерируем стабильную случайную сумму (от 20 до 100)
                    const gameIndex = games.indexOf(game);
                    const seed = game.id ? game.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + gameIndex : gameIndex * 1000;
                    let seedValue = seed;
                    const random = () => {
                      seedValue = (seedValue * 9301 + 49297) % 233280;
                      return seedValue / 233280;
                    };
                    const randomPrize = 20 + random() * 80; // От 20 до 100
                    return randomPrize.toFixed(2);
                  })()}₼
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
