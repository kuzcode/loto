import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

function sample(array, k) {
  const copy = [...array];
  shuffle(copy);
  return copy.slice(0, k);
}

function generateCard3x9() {
  // determine which cells are filled: 3 rows x 9 cols, each row 5 numbers, total 15
  const rows = 3, cols = 9;
  const rowCounts = [0, 0, 0];
  const colCounts = Array(cols).fill(0);
  const filled = Array.from({ length: rows }, () => Array(cols).fill(false));
  let placed = 0;
  while (placed < 15) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (filled[r][c]) continue;
    if (rowCounts[r] >= 5) continue;
    if (colCounts[c] >= 3) continue;
    filled[r][c] = true;
    rowCounts[r] += 1;
    colCounts[c] += 1;
    placed += 1;
  }
  // assign numbers per column ranges
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (let c = 0; c < cols; c++) {
    const start = c === 0 ? 1 : c * 10;
    const end = c === 0 ? 9 : c * 10 + 9;
    const need = colCounts[c];
    const pool = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const picks = sample(pool, need).sort((a, b) => a - b);
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      if (filled[r][c]) {
        grid[r][c] = picks[idx++];
      }
    }
  }
  return grid;
}

// Editable growth factors
// Tunable economy parameters targeting ~30-50% expected loss over many games
const CARD_GROWTH = { 1: 1.31, 2: 1.21, 3: 1.09 };
const BARREL_GROWTH = { 5: 1.02, 6: 1.04, 7: 1.05 };
const PAYOUT_MULTIPLIER = 2.0; // global payout scaler
const ALPHA_HIT = 0.935; // scales baseline hit probability based on how many numbers are on cards

export default function LocalGame() {
  const { user } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const stake = Number(state?.stake || 0);
  const barrelCount = Number(state?.barrelCount || 0);
  const numCards = Number(state?.numCards || 0);
  const jackpot = Number(state?.jackpot || 0);

  const [cards, setCards] = useState([]);
  const [draw, setDraw] = useState([]);
  const [index, setIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [deducted, setDeducted] = useState(false);
  const [credited, setCredited] = useState(false);
  const timerRef = useRef(null);

  const sessionKey = useMemo(() => {
    const uid = user?.$id || 'guest';
    return `loto_session_${uid}`;
  }, [user]);

  function saveSession(partial = {}) {
    const data = {
      stake,
      barrelCount,
      numCards,
      jackpot,
      cards,
      draw,
      index,
      hits,
      done,
      deducted,
      credited,
      ...partial,
    };
    try { localStorage.setItem(sessionKey, JSON.stringify(data)); } catch (_) {}
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(sessionKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }

  function clearSession() {
    try { localStorage.removeItem(sessionKey); } catch (_) {}
  }

  const current = draw.slice(0, index);
  const drawnSet = useMemo(() => new Set(current), [current]);

  const winAmount = useMemo(() => {
    const perHit = CARD_GROWTH[numCards] || 1.05;
    const barrelMul = BARREL_GROWTH[barrelCount] || 1;
    return +(stake * (Math.pow(perHit, hits) - 1) * barrelMul * PAYOUT_MULTIPLIER).toFixed(2);
  }, [stake, hits, numCards, barrelCount]);

  useEffect(() => {
    if (!stake || !barrelCount || !numCards) {
      navigate('/app', { replace: true });
      return;
    }
    const resume = loadSession();
    if (resume && resume.stake === stake && resume.barrelCount === barrelCount && resume.numCards === numCards) {
      setCards(resume.cards || []);
      setDraw(resume.draw || []);
      setIndex(Number(resume.index || 0));
      setHits(Number(resume.hits || 0));
      setDone(Boolean(resume.done));
      setDeducted(Boolean(resume.deducted));
      setCredited(Boolean(resume.credited));
      return;
    }

    const run = async () => {
      // 1) Create cards
      const generated = Array.from({ length: numCards }, () => generateCard3x9());
      setCards(generated);

      // 2) Deduct stake from Appwrite balance (if logged in)
      try {
        if (user?.$id && appwriteIds.usersCollectionId) {
          const userDoc = await databases.getDocument(appwriteIds.databaseId, appwriteIds.usersCollectionId, user.$id);
          const balance = Number(userDoc.balance || 0);
          if (balance < stake) {
            setError('Недостаточно средств');
            return;
          }
          await databases.updateDocument(appwriteIds.databaseId, appwriteIds.usersCollectionId, user.$id, {
            balance: +(balance - stake).toFixed(2),
          });
          window.dispatchEvent(new CustomEvent('balance-changed'));
          setDeducted(true);
        } else {
          setDeducted(true); // allow play even if not logged in
        }
      } catch (e) {
        setError('Ошибка списания средств');
        return;
      }

      // 3) Build biased draw based on dynamic hit probability
      const numbersOnCards = new Set();
      for (const card of generated) {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 9; c++) {
            const v = card[r][c];
            if (typeof v === 'number') numbersOnCards.add(v);
          }
        }
      }
      const all = Array.from({ length: 90 }, (_, i) => i + 1).filter((n) => n !== 0);
      const notOn = all.filter((n) => !numbersOnCards.has(n));
      const on = all.filter((n) => numbersOnCards.has(n));
      const baseFraction = on.length / 90;
      const pHit = Math.min(Math.max(ALPHA_HIT * baseFraction, 0), 0.95);
      const chosen = [];
      const used = new Set();
      while (chosen.length < barrelCount && (notOn.length > 0 || on.length > 0)) {
        const pickHit = Math.random() < pHit;
        const pool = pickHit && on.length > 0 ? on : notOn.length > 0 ? notOn : on;
        const idx = Math.floor(Math.random() * pool.length);
        const num = pool[idx];
        if (!used.has(num)) {
          chosen.push(num);
          used.add(num);
          pool.splice(idx, 1);
        }
      }
      setDraw(chosen);
      setIndex(0);
      setHits(0);
      setDone(false);
      saveSession({ cards: generated, draw: chosen, index: 0, hits: 0, done: false, deducted: true, credited: false });
    };
    run();
  }, [stake, barrelCount, numCards, navigate, user]);

  useEffect(() => {
    if (draw.length === 0) return;
    if (index >= barrelCount) return;
    timerRef.current = setTimeout(() => {
      setIndex((v) => v + 1);
    }, 2000);
    return () => clearTimeout(timerRef.current);
  }, [draw, index, barrelCount]);

  useEffect(() => {
    if (index === 0 || cards.length === 0) return;
    const last = draw[index - 1];
    let delta = 0;
    for (const card of cards) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
          if (card[r][c] === last) delta += 1;
        }
      }
    }
    if (delta > 0) setHits((h) => h + delta);
    if (index >= barrelCount) setDone(true);
    saveSession({ index, hits: delta > 0 ? hits + delta : hits, done: index >= barrelCount });
  }, [index, draw, cards, barrelCount]);

  function isMarked(n) { return drawnSet.has(n); }

  return (
    <div className='App with-bar'>
      <div className='playingarea'>
        <h2>Игра</h2>
        <div className='game-info'>
          <p>Ставка: {stake.toFixed(2)}₼ • Бочонки: {barrelCount} • Карточек: {numCards} • Джекпот: {jackpot.toFixed(2)}₼</p>
        </div>
        {!deducted ? (
          <p className='auth-error'>Ожидание списания средств...</p>
        ) : null}
        <div className='loto'>
          <div className='loto-draw'>
            <div className='bag'>
              {current.slice(-8).map((n) => (
                <span key={n} className='chip'>{n}</span>
              ))}
            </div>
          </div>
          <div className='loto-multi-cards'>
            {cards.map((card, i) => (
              <div key={i} className='loto-card'>
                {card.map((row, ridx) => (
                  <div key={ridx} className='loto-row-9'>
                    {row.map((n, cidx) => (
                      <div key={cidx} style={{marginTop: 5, marginBottom: 5 }} className={n && isMarked(n) ? 'cell marked' : 'cell'}>{n ?? ''}</div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <p>Выигрыш: {stake.toFixed(2)}₼ → {winAmount.toFixed(2)}₼</p>
        </div>
        {done ? (
          <div className='plate'>
            <p className='center' style={{ color: '#fff' }}>
              {hits > 0 ? `Поздравляем, вы выиграли ${winAmount.toFixed(2)}₼` : 'К сожалению, вы проиграли'}
            </p>
            <div className='buttons'>
              <button className='b2' onClick={async () => {
                try {
                  if (user?.$id && appwriteIds.usersCollectionId && !credited) {
                    const userDoc = await databases.getDocument(appwriteIds.databaseId, appwriteIds.usersCollectionId, user.$id);
                    const balance = Number(userDoc.balance || 0);
                    const next = +(balance + winAmount).toFixed(2);
                    await databases.updateDocument(appwriteIds.databaseId, appwriteIds.usersCollectionId, user.$id, { balance: next });
                    window.dispatchEvent(new CustomEvent('balance-changed'));
                    setCredited(true);
                    saveSession({ credited: true });
                  }
                } catch (e) {
                  // ignore credit errors for UX
                } finally {
                  clearSession();
                  navigate('/app');
                }
              }}><p>ОК</p></button>
            </div>
          </div>
        ) : null}
        {error ? <p className='auth-error'>{error}</p> : null}
      </div>
    </div>
  );
}


