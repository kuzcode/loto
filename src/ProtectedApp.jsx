import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { databases, appwriteIds } from './appwrite';
import { initializeGames, updateGamesState, getPlayerGames, getGameById, updatePlayerGame, removePlayerGame } from './utils/gameManager';

export default function ProtectedApp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState([]);

  // Проверка выигрышей при загрузке
  useEffect(() => {
    if (!user?.$id || !appwriteIds.usersCollectionId) return;

    const checkFinishedGames = async () => {
      const currentGames = initializeGames();
      const playerGames = getPlayerGames(user.$id);
      
      for (const [gameId, playerGame] of Object.entries(playerGames)) {
        const game = getGameById(currentGames, gameId);
        if (game && game.status === 'finished' && !playerGame.prizeCredited) {
          const realWinners = (game.winners || []).filter(w => !w.startsWith('bot_'));
          const userWon = realWinners.includes(user.$id);
          
          if (userWon) {
            // Начислить выигрыш
            const totalStake = game.totalPlayers * game.stake;
            const winnerCount = realWinners.length;
            const prize = (totalStake / winnerCount) * 0.9;
            
            // Детерминированная проверка джекпота
            const seed = `${gameId}_${user.$id}_jackpot`;
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
              const char = seed.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            const wonJackpot = (Math.abs(hash) % 100) < 5;
            const jackpotAmount = wonJackpot ? (game.jackpot || 0) : 0;
            const totalPrize = prize + jackpotAmount;
            
            try {
              const userDoc = await databases.getDocument(
                appwriteIds.databaseId,
                appwriteIds.usersCollectionId,
                user.$id
              );
              const balance = Number(userDoc.balance || 0);
              
              await databases.updateDocument(
                appwriteIds.databaseId,
                appwriteIds.usersCollectionId,
                user.$id,
                { balance: +(balance + totalPrize).toFixed(2) }
              );
              
              window.dispatchEvent(new CustomEvent('balance-changed'));
              updatePlayerGame(user.$id, gameId, { 
                prizeCredited: true, 
                prizeAmount: totalPrize,
                jackpotWon: wonJackpot
              });
              
              // Удалить игру после начисления
              removePlayerGame(user.$id, gameId);
            } catch (err) {
              console.error('Failed to credit prize on load', err);
            }
          }
        }
      }
    };

    checkFinishedGames();
  }, [user?.$id]);

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Ставка: {game.stake}₼</h3>
              <div style={{ 
                backgroundColor: '#0565ff', 
                padding: '6px 12px', 
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#fff'
              }}>
                Джекпот: {game.jackpot || 0}₼
              </div>
            </div>
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
