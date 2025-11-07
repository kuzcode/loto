import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProtectedApp() {
  const navigate = useNavigate();
  const stakes = [0.2, 0.5, 1, 2, 10];
  const barrels = [5, 6, 7];
  const cards = [1, 2, 3];
  const [stake, setStake] = useState(null);
  const [barrelCount, setBarrelCount] = useState(null);
  const [numCards, setNumCards] = useState(null);

  function calcJackpot(s, b, c) {
    if (!s || !b || !c) return 0;
    // Monotonic formula: more barrels -> higher, more cards -> lower, higher stake -> higher
    const base = s * Math.pow(b, 2) * (4 - c);
    return +base.toFixed(2);
  }

  const colorsA = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F6'];
  const colorsB = ['#8317ffff', '#3d18deff', '#c814dcff'];
  const colorsC = ['#b3ff92ff', '#8cf7ffff', '#ff8ceeff'];

  return (
    <div>
      <p className='title'>Новая игра</p>
      <div className='games'>
        <div className='game-card'>
          <h3 style={{ marginTop: 0 }}>Ставка</h3>

          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
            {stakes.map((s, i) => (
              <button
                key={s}
                style={{
                  backgroundColor: colorsA[i],
                  border: stake === s ? `3px solid #fff` : '3px solid transparent',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
                onClick={() => setStake(s)}
              >
                <p style={{ margin: 0 }}>{s}₼</p>
              </button>
            ))}
          </div>

          <h3>Бочонки</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {barrels.map((b, i) => (
              <button
                key={b}
                style={{
                  backgroundColor: colorsB[i], // Важно: colors должен быть достаточной длины
                  border: barrelCount === b ? `3px solid #fff` : '3px solid transparent',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
                onClick={() => setBarrelCount(b)}
              >
                <p style={{ margin: 0, color: 'white' }}>{b}</p>
              </button>
            ))}
          </div>

          <h3>Карточки</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {cards.map((c, i) => (
              <button
                key={c}
                style={{
                  backgroundColor: colorsC[i],
                  border: numCards === c ? `3px solid #fff` : '3px solid transparent',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
                onClick={() => setNumCards(c)}
              >
                <p style={{ margin: 0 }}>{c}</p>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <p>Джекпот: {calcJackpot(stake, barrelCount, numCards).toFixed(2)}₼</p>
          </div>
          {(stake && barrelCount && numCards) ? (
            <div className='buttons'>
              <button className='b2' onClick={() => navigate('/play', { state: { stake, barrelCount, numCards, jackpot: calcJackpot(stake, barrelCount, numCards) } })}><p>Играть</p></button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


