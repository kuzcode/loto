import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { databases, appwriteIds, ID } from '../appwrite';
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
import change from '../icons/change.png'
import delet from '../icons/delete.png'
import orange from '../icons/orange.png'
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
  const historyProcessedRef = useRef(false);
  const userTicketCountRef = useRef(0);
  useEffect(() => {
    const { initializeGames, updateGamesState } = require('../utils/gameManager');
    let currentGames = initializeGames();
    currentGames = updateGamesState(currentGames, false);
    setGames(currentGames);
    jackpotProcessedRef.current = false;
    prizeProcessedRef.current = false;
    historyProcessedRef.current = false;
    userTicketCountRef.current = 0;
    setJackpotWon(false);
    setJackpotAmount(0);
    setShowWinAnimation(false); const currentGame = getGameById(currentGames, id);
    if (currentGame) {
      setGame(currentGame); const player = currentGame.players?.find(p => p.userId === user?.$id);
      if (player && currentGame.status !== 'finished') {
        setIsInGame(true);
        setUserCards(player.cards || []);
        setGameFinished(false);
      } else {
        setIsInGame(false);
        setGameFinished(false);
        if (currentGame.status !== 'finished') {
          const previewCards = Array.from({ length: ticketCount }, () => generateCard3x9());
          setUserCards(previewCards);
        }
      } if (currentGame.status === 'finished') {
        setGameFinished(true);
        setIsInGame(false);
        const realWinners = (currentGame.winners || []).filter(w => !w.startsWith('bot_'));
        setIsWinner(realWinners.includes(user?.$id));
      }
    }
  }, [id, user, ticketCount]);
  useEffect(() => {
    if (games.length === 0) return; const interval = setInterval(() => {
      setGames(prevGames => {
        const updated = updateGamesState(prevGames, false);
        const currentGame = getGameById(updated, id); if (currentGame) {
          setGame(currentGame); if (currentGame.status === 'running' && currentGame.draw && currentGame.drawIndex > 0) {
            const newDrawnNumbers = currentGame.draw.slice(0, currentGame.drawIndex);
            setDrawnNumbers(newDrawnNumbers); if (currentGame.status === 'running' && !gameFinished) {
              const result = checkWinners(currentGame);
              if (result.anyWinner) {
                const finished = finishGame(updated, id, result.realWinners); setGameFinished(true);
                const userWon = result.realWinners.includes(user?.$id);
                setIsWinner(userWon); if (userWon) {
                  playWinSound();
                  setShowWinAnimation(true);
                  setTimeout(() => setShowWinAnimation(false), 3000);
                } else {
                  playLooseSound();
                } const finishedGame = getGameById(finished, id); if (result.realWinners.length > 0 && result.realWinners.includes(user?.$id) && appwriteIds.usersCollectionId && !prizeProcessedRef.current) {
                  prizeProcessedRef.current = true;
                  jackpotProcessedRef.current = true; const totalStake = currentGame.totalPlayers * currentGame.stake;
                  const winnerCount = result.realWinners.length;
                  const prize = (totalStake / winnerCount) * 0.9; const wonJackpot = Math.random() < 0.05;
                  const jackpotValue = wonJackpot && currentGame.jackpot ? currentGame.jackpot : 0; if (wonJackpot && currentGame.jackpot) {
                    setJackpotWon(true);
                    setJackpotAmount(currentGame.jackpot);
                  } databases.getDocument(appwriteIds.databaseId, appwriteIds.usersCollectionId, user.$id)
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
                      if (finishedGame) {
                        saveGameHistory(finishedGame, true, prize + jackpotValue);
                      }
                    })
                    .catch(err => console.error('Failed to credit prize', err));
                } else {
                  if (finishedGame) {
                    const playerInGame = finishedGame.players?.find(p => p.userId === user?.$id);
                    if (playerInGame && !historyProcessedRef.current) {
                      saveGameHistory(finishedGame, false, 0);
                    }
                  }
                } return finished;
              }
            } if (currentGame.status === 'finished' && !gameFinished) {
              setGameFinished(true);
              const realWinners = (currentGame.winners || []).filter(w => !w.startsWith('bot_'));
              const userWon = realWinners.includes(user?.$id);
              setIsWinner(userWon); if (userWon) {
                playWinSound();
                setShowWinAnimation(true);
                setTimeout(() => setShowWinAnimation(false), 3000);
              } else {
                playLooseSound();
              } if (userWon && appwriteIds.usersCollectionId && !prizeProcessedRef.current) {
                prizeProcessedRef.current = true; const totalStake = currentGame.totalPlayers * currentGame.stake;
                const winnerCount = realWinners.length;
                const prize = winnerCount > 0 ? (totalStake / winnerCount) * 0.9 : 0; const wonJackpot = Math.random() < 0.05;
                const jackpotValue = wonJackpot && currentGame.jackpot ? currentGame.jackpot : 0; if (wonJackpot && currentGame.jackpot) {
                  setJackpotWon(true);
                  setJackpotAmount(currentGame.jackpot);
                } if (prize > 0 || jackpotValue > 0) {
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
                      saveGameHistory(currentGame, true, prize + jackpotValue);
                    })
                    .catch(err => console.error('Failed to credit prize', err));
                } else {
                  saveGameHistory(currentGame, true, 0);
                }
              } else {
                const playerInGame = currentGame.players?.find(p => p.userId === user?.$id);
                if (playerInGame && !historyProcessedRef.current) {
                  saveGameHistory(currentGame, false, 0);
                }
              }
            }
          } if (currentGame.status !== 'finished') {
            const player = currentGame.players?.find(p => p.userId === user?.$id);
            if (player) {
              setUserCards(player.cards || []);
              setIsInGame(true);
            }
          } else {
            setIsInGame(false);
          }
        } return updated;
      });
    }, 1000); return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveGameHistory is stable, deps intentionally limited
  }, [games.length, id, user, gameFinished]);
  useEffect(() => {
    if (!isInGame) {

      if (userCards.length !== ticketCount) {
        const previewCards = Array.from({ length: ticketCount }, () => generateCard3x9());
        setUserCards(previewCards);
      }
    }
  }, [ticketCount, isInGame, userCards.length]);
  useEffect(() => {
    if (gameFinished) {
      const redirectTimer = setTimeout(() => {
        playClickSound();
        navigate('/app', { replace: true });
      }, 5000); return () => clearTimeout(redirectTimer);
    }
  }, [gameFinished, navigate]);
  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);
  useEffect(() => {
    if (gameFinished) {
      const redirectTimer = setTimeout(() => {
        playClickSound();
        navigate('/app', { replace: true });
      }, 5000); return () => clearTimeout(redirectTimer);
    }
  }, [gameFinished, navigate]);
  useEffect(() => {
    audioRef.current = new Audio(barrelSound);
    audioRef.current.volume = 0.5; return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (!game) return; const currentStatus = game.status;
    const prevStatus = gameStatusRef.current;
    if (currentStatus === 'running' && prevStatus !== 'running') {

      previousDrawnCountRef.current = drawnNumbers.length;
      gameStatusRef.current = currentStatus;
      return;
    }
    if (currentStatus !== 'running') {
      if (prevStatus === 'running') {
        previousDrawnCountRef.current = 0;
      }
      gameStatusRef.current = currentStatus;
      return;
    }
    if (currentStatus === 'running' && drawnNumbers.length > previousDrawnCountRef.current) {
      if (soundOn && audioRef.current) {
        try {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(err => {
            console.log('Audio play error (ignored):', err);
          });
        } catch (err) {
          console.log('Audio play error (ignored):', err);
        }
      }
      previousDrawnCountRef.current = drawnNumbers.length;
    } gameStatusRef.current = currentStatus;
  }, [drawnNumbers, game, soundOn]); async function buyTickets() {
    if (!game || !user?.$id || isInGame) return;
    if (game.status === 'finished' || gameFinished) {
      setError('Игра уже завершена');
      return;
    }
    const activeGame = getActiveGameForUser(games, user?.$id);
    if (activeGame && activeGame.id !== game.id) {
      setError('Вы уже участвуете в другой игре. Завершите текущую игру перед началом новой.');
      return;
    }
    if (game.status === 'running') {
      setError('Нельзя покупать билеты во время игры');
      return;
    }
    playClickSound(); setLoading(true);
    setError(''); try {
      const userDoc = await databases.getDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        user.$id
      );
      const balance = Number(userDoc.balance || 0);
      const played = Number(userDoc.played || 0);
      const actualTicketCount = userCards.length;
      const totalCost = game.stake * actualTicketCount; if (balance < totalCost) {
        throw new Error('Недостаточно средств');
      } await databases.updateDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        user.$id,
        {
          balance: +(balance - totalCost).toFixed(2),
          played: played + 1
        }
      );
      window.dispatchEvent(new CustomEvent('balance-changed')); const cards = userCards;
      userTicketCountRef.current = actualTicketCount; const updatedGames = addPlayerToGame(games, id, user.$id, cards); const finalGames = updateGamesState(updatedGames, false);
      setGames(finalGames); const updatedGame = getGameById(finalGames, id);
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
  async function saveGameHistory(game, won, prize) {
    if (!user?.$id || !appwriteIds.usersCollectionId || !appwriteIds.gameinfoCollectionId) {
      console.log('saveGameHistory: Missing required IDs', { userId: user?.$id, usersCollectionId: appwriteIds.usersCollectionId, gameinfoCollectionId: appwriteIds.gameinfoCollectionId });
      return;
    } if (historyProcessedRef.current) {
      console.log('saveGameHistory: Already processed');
      return;
    }
    const player = game.players?.find(p => p.userId === user.$id);
    if (!player) {
      console.log('saveGameHistory: User not in game', { gamePlayers: game.players, userId: user.$id });
      return;
    } try {
      historyProcessedRef.current = true; const tickets = player.cards?.length || userTicketCountRef.current || 1;
      const dep = game.stake * tickets;
      const wonAmount = won ? prize : 0;
      const players = game.totalPlayers || 0; console.log('saveGameHistory: Saving', { dep, won: wonAmount, tickets, players, gameId: game.id }); const gameInfoId = ID.unique();
      const gameInfoDoc = await databases.createDocument(
        appwriteIds.databaseId,
        appwriteIds.gameinfoCollectionId,
        gameInfoId,
        {
          dep: dep,
          won: wonAmount,
          tickets: tickets,
          players: players
        }
      ); console.log('saveGameHistory: Created gameinfo document', gameInfoId, gameInfoDoc); const userDoc = await databases.getDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        user.$id
      ); console.log('saveGameHistory: Current user doc', {
        history: userDoc.history,
        historyType: typeof userDoc.history,
        isArray: Array.isArray(userDoc.history)
      });
      let currentHistoryIds = [];
      if (userDoc.history) {
        if (Array.isArray(userDoc.history)) {
          currentHistoryIds = userDoc.history.map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && item.$id) return item.$id;
            return null;
          }).filter(Boolean);
        } else if (typeof userDoc.history === 'string') {
          currentHistoryIds = [userDoc.history];
        } else if (userDoc.history && typeof userDoc.history === 'object' && userDoc.history.$id) {
          currentHistoryIds = [userDoc.history.$id];
        }
      }
      const updatedHistory = [...currentHistoryIds, gameInfoId]; console.log('saveGameHistory: Updating user history', {
        currentLength: currentHistoryIds.length,
        newLength: updatedHistory.length,
        currentHistoryIds,
        updatedHistory,
        gameInfoId
      });
      await databases.updateDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        user.$id,
        { history: updatedHistory }
      ); console.log('saveGameHistory: Success - history updated with', updatedHistory.length, 'items');
    } catch (err) {
      console.error('Failed to save game history:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        type: err.type,
        response: err.response
      });
      historyProcessedRef.current = false;
    }
  } function isMarked(num) {
    return drawnNumbers.includes(num);
  }
  function updateTicket(cardIdx) {
    if (isInGame) return; const updatedCards = [...userCards];
    updatedCards[cardIdx] = generateCard3x9();
    setUserCards(updatedCards);
  }
  function deleteTicket(cardIdx) {
    if (isInGame) return;
    if (userCards.length <= 1) return; const updatedCards = userCards.filter((_, idx) => idx !== cardIdx);
    setUserCards(updatedCards);
    setTicketCount(updatedCards.length);
  }
  const last5Numbers = useMemo(() => {
    if (drawnNumbers.length === 0) return [null, null, null, null, null];
    const last5 = drawnNumbers.slice(-5);
    while (last5.length < 5) {
      last5.unshift(null);
    } return last5.reverse();
  }, [drawnNumbers]);
  function formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  function getGameTitle(stake) {
    const titles = ['LITE', 'PRO', 'PRIME', 'ELITE', 'PRIME'];
    const stakes = [0.2, 0.5, 1, 2, 10];
    const index = stakes.indexOf(stake);
    return index !== -1 ? titles[index] : 'ИГРА';
  }
  function getGameColor(stake) {
    const colors = ['#9fc057', '#83a9f6', '#fc8d65', '#986ff2', '#c8cce2'];
    const stakes = [0.2, 0.5, 1, 2, 10];
    const index = stakes.indexOf(stake);
    return index !== -1 ? colors[index] : '#83a9f6';
  }
  const cardsProgress = useMemo(() => {
    if (!game || game.status !== 'running') return {};
    const progress = getCardsProgress(game);

    const keys = Object.keys(progress).map(k => parseInt(k)).sort((a, b) => a - b);
    if (keys.length === 0) return {};
    const minRemaining = keys[0];
    return { [minRemaining]: progress[minRemaining] };
  }, [game]); if (!game) {
    return (
      <div className='App with-bg'>
        <div className='auth-card'>
          <p>Загрузка игры...</p>
        </div>
      </div>
    );
  } return (
    <div className='App with-bg'>
      <div className='playingarea'>
        {game.status === 'running' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: '#2c3548',
            paddingTop: 20,
            marginTop: -16,
            borderRadius: '0 0 16px 16px',
            marginBottom: 8
          }}>
            <div className="lines">
              <div className="r"></div>
              <div className="r"></div>
            </div>
            <div className='barrels' style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '4px',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {last5Numbers.map((num, idx) => {
                const isLatest = idx === 0;
                return (
                  <div
                    key={idx}
                    className='barrel'
                    style={{
                      width: isLatest ? 'calc(1vw + 75px)' : 'calc(1vw + 60px)',
                      height: isLatest ? 'calc(1vw + 75px)' : 'calc(1vw + 60px)',
                      fontSize: isLatest ? 'calc(0.8vw + 25px)' : 'calc(0.8vw + 18px)',
                    }}
                  >
                    <div className="l1">
                      <div className="l2">
                        <div className="l3">
                          <div className="l4">
                            <p>
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
          </div>
        )}
        {game.status !== 'running' && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button style={{
              background: '#2c3548',
              boxShadow: '0 0 20px #0000005e',
              border: 'none',
              borderRadius: 100,
              color: '#fff',
              fontSize: 21,
              height: 32,
              width: 32,
              marginTop: -22
            }} onClick={() => navigate(-1)}>{'<'}</button>
            <h2 style={{ marginLeft: 12, marginTop: 0 }}>Игра {game.stake}₼</h2>
          </div>
        )}
        {error ? <p className='auth-error'>{error}</p> : null}
        {game.status === 'running' && (
          <div style={{
            backgroundColor: '#2c3548',
            padding: '12px 16px',
            borderRadius: '16px',
            marginBottom: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              flexWrap: 'wrap',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div style={{
                  backgroundColor: '#986ff2',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img src={crown} alt="приз" style={{ width: '15px', height: '15px', filter: 'brightness(20)' }} />
                </div>
                <div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#986ff2' }}>ПРИЗ</p>
                    <div style={{ color: '#fff', fontSize: 17, fontWeight: 'bold', lineHeight: '1.2' }}>
                      {game.jackpot ? game.jackpot.toFixed(2) : '0.00'}₼
                    </div>
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div style={{
                  backgroundColor: '#83a9f6',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img src={person} alt="игроки" style={{ width: '13px', height: '15px', filter: 'brightness(20)' }} />
                </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#83a9f6' }}>ИГРОКОВ</p>
                    <div style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>
                      {game.totalPlayers || 0}
                    </div>
                  </div>
              </div>
              <button
                onClick={() => {
                  const newState = toggleSound();
                  setSoundOn(newState);
                }}
                style={{
                  backgroundColor: '#4a5568',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  boxShadow: '0 0 12px #00000020'
                }}
                title={soundOn ? 'Выключить звук' : 'Включить звук'}
              > {/* 2.1kb */}
                {soundOn ? (
                  <svg width="21" height="21" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9V15H7L12 20V4L7 9H3ZM16.5 12C16.5 10.23 15.5 8.71 14 7.97V16.02C15.5 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill="#fff" />
                  </svg>
                ) : (
                  <svg width="21" height="21" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.5 12C16.5 10.23 15.5 8.71 14 7.97V16.02C15.5 15.29 16.5 13.77 16.5 12ZM19 3.27L16.5 5.77L14 3.27V5.29C12.62 6.06 11.57 7.31 11.11 8.77L9.71 7.37C10.26 5.63 11.5 4.19 13.14 3.27H14V3.27ZM19 12C19 14.19 18.1 16.16 16.64 17.57L18.05 18.98C19.95 17.22 21 14.76 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM3 9V15H7L12 20V4L7 9H3Z" fill="#fff" />
                    <path d="M21.5 4.5L4.5 21.5L3.5 20.5L20.5 3.5L21.5 4.5Z" fill="#fff" />
                  </svg>
                )}
              </button>
            </div>
            {Object.keys(cardsProgress).length > 0 && (
              <div style={{
                textAlign: 'center',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                {Object.entries(cardsProgress)
                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  .map(([remaining, count]) => (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      <img src={orange} width={16} height={16} style={{ margin: '-2px 2px 0 0' }} alt="" />
                      <span
                        key={remaining}
                        style={{
                          color: '#fff',
                          fontSize: '16px',
                          display: 'inline-block',
                          margin: '2px 5px',
                        }}
                      >
                        {count} {count === 1 ? 'карточка' : count < 5 ? 'карточки' : 'карточек'} ожидает {remaining} {remaining === 1 ? 'номер' : remaining < 5 ? 'номера' : 'номеров'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        {isInGame && game.status !== 'finished' && game.status !== 'running' && (
          <div style={{
            backgroundColor: '#2c3548',
            padding: '15px',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
              Вы в игре, до начала: {game.status === 'counting' && game.startCountdown !== null
                ? formatTime(Math.ceil(game.startCountdown))
                : '~' + formatTime(Math.max(10, Math.min(120, (20 - (game.totalPlayers || 0)) + 60)))}
            </p>
          </div>
        )}
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
            }}
          >
            <p style={{ margin: 0, color: '#fff', fontSize: '36px', fontWeight: 'bold' }}>
              🎉 Поздравляем! 🎉
            </p>
            <p style={{ margin: '10px 0 0 0', color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
              Вы выиграли
            </p>
          </div>
        )}
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
        <div className='loto-multi-cards' style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '20px',
        }}>
          {userCards.map((card, cardIdx) => (
            <div key={cardIdx} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              {!isInGame && game.status !== 'finished' && game.status !== 'running' && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  backgroundColor: '#c3d1e5',
                  borderRadius: '18px 18px 0 0',
                  padding: '8px',
                  width: 'calc(100% - 32px)'
                }}>
                  <button
                    onClick={() => updateTicket(cardIdx)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: 'none',
                      backgroundColor: '#38445d',
                      boxShadow: '-4px 4px 12px 0 rgba(0, 0, 0, 0.24)',
                      color: '#c8cce2',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: '0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    <img src={change} width={13} height={13} style={{ marginRight: 5 }} alt="" />
                    Обновить
                  </button>
                  <button
                    onClick={() => deleteTicket(cardIdx)}
                    disabled={userCards.length <= 1}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: 'none',
                      backgroundColor: '#38445d',
                      boxShadow: '-4px 4px 12px 0 rgba(0, 0, 0, 0.24)',
                      color: '#c8cce2',
                      opacity: userCards.length <= 1 ? 0.5 : 1,
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: userCards.length <= 1 ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <img src={delet} width={13} height={13} style={{ marginRight: 5 }} alt="" />
                    Удалить
                  </button>
                </div>
              )}
              <div className='loto-card' style={{
                backgroundColor: '#c3d1e5',
                padding: '8px',
                borderRadius: '16px',
                width: '100%'
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
                          className='yacheika'
                          style={{
                            textAlign: 'center',
                            backgroundColor: hasNumber ? '#c3d1e5' : '#99a8c2',
                            color: '#2a3143',
                            borderRadius: '10px',
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
                              zIndex: 1,
                              mixBlendMode: marked ? 'overlay' : 'normal',
                              marginTop: 4
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
        {!isInGame && game.status !== 'finished' && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '500px',
            padding: '0 20px',
            zIndex: 2,
            boxSizing: 'border-box',
          }}>
            <div style={{
              backgroundColor: '#2c3548',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
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
                  {
                  }
                </div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>
                  {getGameTitle(game.stake)} {game.stake.toFixed(2)}₼
                </div>
              </div>
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
              ) : game.status === 'waiting' ? (
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  background: '#ffffff31',
                  padding: '4px 12px',
                  borderRadius: 50,
                }}>
                  Идёт набор
                </div>
              ) : game.status === 'running' ? (
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  background: '#ffffff1f',
                  padding: '4px 12px',
                  borderRadius: 50,
                  opacity: 0.5,
                }}>
                  Идёт игра
                </div>
              ) : (
                <div style={{ flex: '1 1 auto' }}></div>
              )}
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
      <div style={{
        marginBottom: 120
      }}></div>
    </div>
  );
}
