import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { databases, appwriteIds } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateDraw() {
  const nums = Array.from({ length: 90 }, (_, i) => i + 1);
  return shuffle(nums);
}

function generateCard(seedNumbers) {
  const nums = [...seedNumbers].slice(0, 15).sort((a, b) => a - b);
  const rows = [nums.slice(0, 5), nums.slice(5, 10), nums.slice(10, 15)];
  return rows;
}

export default function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canQuery = useMemo(() => Boolean(appwriteIds.databaseId && appwriteIds.gamesCollectionId && appwriteIds.usersCollectionId), []);
  const [hasBet, setHasBet] = useState(false);
  const [card, setCard] = useState([]);

  useEffect(() => {
    if (!canQuery || !id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const doc = await databases.getDocument(appwriteIds.databaseId, appwriteIds.gamesCollectionId, id);
        if (!cancelled) {
          setGame(doc);
          const participants = doc.participants || [];
          setHasBet(participants.includes(user?.$id));
        }
      } catch (e) {
        if (!cancelled) setError('Не удалось загрузить игру');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [canQuery, id, user]);

  

  async function placeBet() {
    if (!game || !user?.$id) return;
    setLoading(true);
    setError('');
    try {
      const userDoc = await databases.getDocument(appwriteIds.databaseId, appwriteIds.usersCollectionId, user.$id);
      const balance = Number(userDoc.balance || 0);
      const stakeValue = Number(game.stake || 0);
      if (balance < stakeValue) throw new Error('Недостаточно средств');
      await databases.updateDocument(appwriteIds.databaseId, appwriteIds.usersCollectionId, user.$id, {
        balance: +(balance - stakeValue).toFixed(2),
      });
      window.dispatchEvent(new CustomEvent('balance-changed'));

      const current = await databases.getDocument(appwriteIds.databaseId, appwriteIds.gamesCollectionId, id);
      const participants = Array.from(new Set([...(current.participants || []), user.$id]));
      const nextPlayers = participants.length;
      const next = { participants, playersCount: nextPlayers };
      if (current.status !== 'running' && nextPlayers >= 1) {
        next.status = 'running';
        if (!current.startAt) next.startAt = new Date().toISOString();
        if (!current.draw || !current.draw.length) next.draw = generateDraw();
        next.speedMs = current.speedMs || 2000;
      }
      const updated = await databases.updateDocument(
        appwriteIds.databaseId,
        appwriteIds.gamesCollectionId,
        id,
        next
      );
      setGame(updated);
      setHasBet(true);
    } catch (e) {
      setError(e?.message || 'Не удалось сделать ставку');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!game) return;
    const base = game.draw && game.draw.length ? game.draw : generateDraw();
    setCard(generateCard(base));
  }, [game]);

  const stake = useMemo(() => Number(game?.stake) || 0, [game]);
  const jackpot = useMemo(() => {
    const players = Number(game?.playersCount) || 0;
    return +(players * stake).toFixed(2);
  }, [game, stake]);

  const currentIndex = useMemo(() => {
    if (!game?.startAt || !game?.draw?.length) return 0;
    const elapsed = Date.now() - new Date(game.startAt).getTime();
    const speed = Number(game.speedMs || 2000);
    return Math.min(Math.floor(elapsed / speed), game.draw.length);
  }, [game]);

  const drawnSet = useMemo(() => new Set((game?.draw || []).slice(0, currentIndex)), [game, currentIndex]);
  function isMarked(n) { return drawnSet.has(n); }

  return (
    <div className='App with-bar'>
      <div className='auth-card'>
        <button className='link-btn' onClick={() => navigate(-1)}>← Назад</button>
        <h2>Игра</h2>
        {loading && !game ? <p>Загрузка...</p> : null}
        {error ? <p className='auth-error'>{error}</p> : null}
        {game ? (
          <div className='game-area'>
            <div className='game-info'>
              <p>Ставка: {stake.toFixed(2)}₼ • Игроков: {Number(game.playersCount) || 0} • Джекпот: {jackpot.toFixed(2)}₼</p>
              <p>Статус: {game.status === 'running' ? 'Игра идет' : 'Набор игроков'}</p>
            </div>
            {!hasBet ? (
              <div className='buttons'>
                <button className='b2' onClick={placeBet} disabled={loading}><p>{loading ? '...' : 'Поставить ставку'}</p></button>
              </div>
            ) : null}
            <div className='loto'>
              <div className='loto-card'>
                {card.map((row, idx) => (
                  <div key={idx} className='loto-row'>
                    {row.map((n) => (
                      <div key={n} className={isMarked(n) ? 'cell marked' : 'cell'}>{n}</div>
                    ))}
                  </div>
                ))}
              </div>
              <div className='loto-draw'>
                <div className='bag'>
                  {(game.draw || []).slice(0, currentIndex).slice(-8).map((n) => (
                    <span key={n} className='chip'>{n}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


