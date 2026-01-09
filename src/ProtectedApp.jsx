import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeGames, updateGamesState, getActiveGameForUser } from './utils/gameManager';
import { playClickSound } from './utils/soundManager';
import { useAuth } from './auth/AuthProvider';
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
    }]; useEffect(() => {
      let initialized = initializeGames();
      setGames(initialized); const interval = setInterval(() => {
        initialized = updateGamesState(initialized, false);
        setGames([...initialized]);
      }, 1000); return () => clearInterval(interval);
    }, []); function formatTime(seconds) {
      if (seconds === null || seconds === undefined) return '';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    } function getGameStatusText(game) {
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
    } return (
      <div className='App with-bg'>
        <p className='titlem'>Игры</p>
        <div className='games'>
          {games.map((game) => (
            <div
              key={game.id}
              className='game-card'
              style={{
                backgroundColor: info[games.indexOf(game)].color,
                cursor: game.status === 'finished' ? 'default' : 'pointer',
                opacity: game.status === 'finished' ? 0.4 : 1
              }}
              onClick={() => {
                if (game.status === 'finished') return;
                const activeGame = getActiveGameForUser(games, user?.$id);
                if (activeGame && activeGame.id !== game.id) {
                  alert('Вы уже участвуете в другой игре. Завершите текущую игру перед началом новой.');
                  return;
                } playClickSound();
                navigate(`/game/${game.id}`);
              }}
            >
              <div className='row'>
                <div className="col1">
                  <h3 style={{ marginTop: 0, fontWeight: 400, fontSize: 15, display: 'flex', alignItems: 'center' }}>{info[games.indexOf(game)].title}<span className='stake' style={{margin: '-5px 0 0 4px'}}> {game.stake}₼</span></h3>
                  <div className="col">
                    <p className='ingame'>В ИГРЕ</p>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <img src={person} className="people" />
                      <p style={{ margin: '4px', fontSize: '23px', marginLeft: 6, fontWeight: 700, transform: 'translate(1px, 4px)' }}>{game.totalPlayers}</p>
                    </div>
                  </div>
                </div>
                <div className="col2">
                  <img src={crown} className='crown' />
                  <p className='win'>
                    ВЫИГРЫШ
                  </p>
                  <div className='prize'>
                    <p>
                      <span style={{
                        fontSize: 26
                      }}>{Math.floor((game.totalPlayers * game.stake) * 0.9)}</span>.
                      {((game.totalPlayers * game.stake) * 0.9).toFixed(2).split('.')[1]}₼
                    </p>
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
                        <span style={{ fontWeight: 400, fontSize: 11 }}>СТАРТ</span> {formatTime(Math.ceil(game.startCountdown || 0))}
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
                  <p style={{ margin: '6px 0 0 0', fontSize: 15 }}>Предыдущая игра</p>
                  <div className="line"></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {(() => {
                      let lastNumbers = [];
                      if (game.status === 'finished' && game.draw && game.drawIndex > 0) {
                        const drawn = game.draw.slice(0, game.drawIndex);
                        lastNumbers = drawn.slice(-5);
                      }
                      else if (game.lastGameDraw && game.lastGameDraw.length > 0) {
                        lastNumbers = game.lastGameDraw.slice(-5);
                      }
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
                      lastNumbers = lastNumbers.slice(-5); return lastNumbers.map((num, idx) => (
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
                            fontSize: '14px',
                            fontWeight: 700,
                            border: '3px solid #0000001f'
                          }}
                        >
                          <span style={{
                            marginTop: 4
                          }}>{num}</span>
                        </div>
                      ));
                    })()}
                  </div>
                  <div style={{
                    fontSize: '17px',
                    fontWeight: 500,
                    color: '#2a3143',
                  }}>
                    {(() => {

                      if (game.status === 'finished' && game.prizePerWinner) {
                        return game.prizePerWinner.toFixed(2);
                      }

                      if (game.lastGamePrize && game.lastGamePrize > 0) {
                        return game.lastGamePrize.toFixed(2);
                      }

                      const gameIndex = games.indexOf(game);
                      const seed = game.id ? game.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + gameIndex : gameIndex * 1000;
                      let seedValue = seed;
                      const random = () => {
                        seedValue = (seedValue * 9301 + 49297) % 233280;
                        return seedValue / 233280;
                      };
                      const randomPrize = 20 + random() * 80;
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
