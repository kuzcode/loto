import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { initializeGames, updateGamesState, getActivePlayerGame } from '../utils/gameManager';
import chat from '../icons/chat.png'
import prof from '../icons/user.png'
import game from '../icons/game.png'

export default function BottomBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState(null);

  // Проверить, находимся ли мы на странице игры
  const isOnGamePage = location.pathname.startsWith('/game/');

  useEffect(() => {
    if (!user?.$id) {
      setActiveGame(null);
      return;
    }

    // Проверить наличие активной игры
    const checkActiveGame = () => {
      // Сначала обновить состояние игр, чтобы получить актуальный статус
      let games = initializeGames();
      games = updateGamesState(games, false);
      const active = getActivePlayerGame(user.$id, games);
      
      // Дополнительная проверка: убедиться, что игра действительно активна
      if (active && active.game && active.game.status !== 'finished') {
        setActiveGame(active);
      } else {
        setActiveGame(null);
      }
    };

    checkActiveGame();
    // Проверять каждую секунду для быстрого обновления
    const interval = setInterval(checkActiveGame, 1000);

    return () => clearInterval(interval);
  }, [user?.$id]);

  return (
    <>
      {/* Кнопка "Вернуться к игре" - не показывать на странице игры */}
      {activeGame && activeGame.game && activeGame.game.status !== 'finished' && !isOnGamePage && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '500px',
          padding: '0 20px',
          boxSizing: 'border-box',
          zIndex: 1000,
        }}>
          <button
            onClick={() => navigate(`/game/${activeGame.game.id}`)}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#0565ff',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(5, 101, 255, 0.4)',
            }}
          >
            Вернуться к игре на {activeGame.game.stake}₼
          </button>
        </div>
      )}
      
      <nav className='bottom-bar'>
        <NavLink to='/chat' className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}>
          <img src={chat} alt='chat' />
        </NavLink>
        <NavLink to='/app' className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}>
          <img src={game} alt='home' />
        </NavLink>
        <NavLink to='/profile' className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}>
          <img src={prof} alt='profile' />
        </NavLink>
      </nav>
    </>
  );
}


