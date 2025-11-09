import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeGames, updateGamesState } from './utils/gameManager';

export default function ProtectedApp() {
  const navigate = useNavigate();
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
            }}
            onClick={() => {
              if (game.status !== 'finished') {
                navigate(`/game/${game.id}`);
              }
            }}
          >
            <h3 style={{ marginTop: 0 }}>Ставка: {game.stake}₼</h3>
            <p style={{ margin: '8px 0', fontSize: '16px' }}>{getGameStatusText(game)}</p>
            {game.status === 'waiting' && game.totalPlayers < 20 && (
              <p style={{ margin: '4px 0', fontSize: '14px', color: '#aaa' }}>
                Ожидание игроков...
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
