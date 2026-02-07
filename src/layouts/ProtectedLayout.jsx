import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomBar from '../components/BottomBar';
import Header from '../components/Header';
import { Outlet } from 'react-router-dom';
import { initializeGames, updateGamesState, getActiveGameForUser, getGameById } from '../utils/gameManager';
import { useAuth } from '../auth/AuthProvider';
import { playClickSound } from '../utils/soundManager';

export default function ProtectedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [currentPageGame, setCurrentPageGame] = useState(null);

  useEffect(() => {
    // Проверить активную игру и игру на текущей странице
    const checkActiveGame = () => {
      const games = updateGamesState(initializeGames(), false);
      const game = getActiveGameForUser(games, user?.$id);
      setActiveGame(game);
      const isOnGamePage = location.pathname.startsWith('/game/');
      const currentGameId = isOnGamePage ? location.pathname.split('/')[2] : null;
      if (currentGameId) {
        const pageGame = getGameById(games, currentGameId);
        setCurrentPageGame(pageGame || null);
      } else {
        setCurrentPageGame(null);
      }
    };

    checkActiveGame();
    const interval = setInterval(checkActiveGame, 1000);

    return () => clearInterval(interval);
  }, [user, location.pathname]);

  // Проверить, на странице ли текущей игры
  const isOnGamePage = location.pathname.startsWith('/game/');
  const currentGameId = isOnGamePage ? location.pathname.split('/')[2] : null;
  const shouldShowReturnButton = activeGame && (!isOnGamePage || currentGameId !== activeGame.id);
  // Скрывать header, когда на странице игры и игра идёт (running)
  const hideHeader = isOnGamePage && currentPageGame?.status === 'running';
  const isOnPersonalChat = location.pathname.startsWith('/message/chat/');

  return (
    <div className='App with-bg'>
    <div className={hideHeader || isOnPersonalChat ? '' : 'with-bar'}>
      {!hideHeader && !isOnPersonalChat && <Header />}
      {shouldShowReturnButton && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          width: '100%',
          maxWidth: '500px',
          padding: '0 20px',
          boxSizing: 'border-box',
        }}>
          <button
            onClick={() => {
              playClickSound();
              navigate(`/game/${activeGame.id}`);
            }}
            style={{
              width: '100%',
              padding: '12px 20px',
              backgroundColor: '#0565ff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            Вернуться к игре на {activeGame.stake}₼
          </button>
        </div>
      )}
      <div style={{ marginTop: shouldShowReturnButton ? '60px' : '0' }}>
        <Outlet />
      </div>
      {!isOnGamePage && !isOnPersonalChat && <BottomBar />}
    </div>
    </div>
  );
}


