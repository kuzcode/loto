import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeGames, updateGamesState, getActiveGameForUser } from './utils/gameManager';
import { playClickSound } from './utils/soundManager';
import { useAuth } from './auth/AuthProvider';

export default function ProtectedApp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState([]);

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
      return `Идет игра: ${formatTime(game.gameDuration)} (${game.totalPlayers} игроков)`;
    } else if (game.status === 'finished') {
      return 'Игра завершена';
    }
    return '';
  }

  return (
    <div className='App'>
      <p className='title'>Игры</p>
      <div className='games'>
        {games.map((game) => (
          <div
            key={game.id}
            className='game-card'
            style={{
              cursor: game.status === 'finished' ? 'default' : 'pointer',
              opacity: game.status === 'finished' ? 0.6 : 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
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
            <div style={{ flex: 1 }}>
              <h3 style={{ marginTop: 0 }}>Ставка: {game.stake}₼</h3>
              <p style={{ margin: '8px 0', fontSize: '16px' }}>{getGameStatusText(game)}</p>
              {game.status === 'waiting' && game.totalPlayers < 20 && (
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#aaa' }}>
                  Ожидание игроков...
                </p>
              )}
            </div>
            <div style={{
              marginLeft: '15px',
              textAlign: 'right',
              padding: '8px 12px',
              backgroundColor: '#0565ff',
              borderRadius: '8px',
            }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#fff', opacity: 0.9 }}>
                Джекпот
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>
                {game.jackpot || 0}₼
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
