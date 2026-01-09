import { useEffect, useState } from 'react';
import { databases, appwriteIds, Query } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';
import crown from '../icons/crown.png';
import userimg from '../icons/user.png';

export default function Leaderboard() {
  const { user } = useAuth();
  const [topUsers, setTopUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadLeaderboard() {
      if (!appwriteIds.usersCollectionId) {
        setLoading(false);
        return;
      }
      try {
       const response = await databases.listDocuments(
          appwriteIds.databaseId,
          appwriteIds.usersCollectionId,
          [
            Query.greaterThan('balance', 0),
            Query.orderDesc('balance'),
            Query.limit(25),
          ]
        );
        const users = (response.documents || []).map(doc => ({
          id: doc.$id,
          name: doc.name || 'Пользователь',
          balance: Number(doc.balance || 0),
          played: Number(doc.played || 0),
          avatarUrl: doc.avatarUrl || '',
        }));
        setTopUsers(users);
       const userInTop = users.find(u => u.id === user?.$id);
       if (!userInTop && user?.$id) {
          try {
            const userDoc = await databases.getDocument(
              appwriteIds.databaseId,
              appwriteIds.usersCollectionId,
              user.$id
            );

            const balance = Number(userDoc.balance || 0);
               if (balance > 0) {
              setCurrentUser({
                id: user.$id,
                name: userDoc.name || 'Пользователь',
                balance: balance,
                played: Number(userDoc.played || 0),
                avatarUrl: userDoc.avatarUrl || '',
              });
            }
          } catch (err) {
            console.error('Failed to load current user:', err);
          }
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, [user]);
  const isCurrentUser = (userId) => userId === user?.$id;
  const formatBalance = (balance) => {
    return balance.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };
  if (loading) {
    return (
      <div className='App with-bg'>
        <p className='title'>Лидерборд</p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
          <div className='spinner'></div>
        </div>
      </div>
    );
  }
  const topThree = topUsers.slice(0, 3);
  const otherUsers = topUsers.slice(3);
  const podiumConfig = [
    { position: 2, rank: 'Второй', color: '#fc8e66' }, 
    { position: 1, rank: 'Первый', color: '#83a9f6' }, 
    { position: 3, rank: 'Третий', color: '#8bc34a' }, 
  ];
  return (
    <div className='App with-bg'>
      <p className='titlem'>Лидерборд</p>
      <div className="topthree">
      {topThree.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '20px',
          padding: '20px 16px',
          maxWidth: 500,
          margin: '0 auto',
        }}>
          {podiumConfig.map((config, idx) => {
            const userItem = topThree[config.position - 1];
            if (!userItem) return null;

            return (
              <div
                key={userItem.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: config.position === 1 ? 1 : 0.9,
                }}
              >
                <div
                  style={{
                    width: config.position === 1 ? '80px' : '50px',
                    height: config.position === 1 ? '80px' : '50px',
                    position: 'relative',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#2a3143',
                      border: `3px solid ${config.color}`,
                      boxShadow: `0 0 6px ${config.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      borderRadius: '50%',
                      marginBottom: 4
                    }}
                  >
                    <img
                      src={userItem.avatarUrl || userimg}
                      alt={userItem.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      className={`${!userItem.avatarUrl && 'invert'}`}
                    />
                  </div>
                </div>
                <div style={{
                  color: '#fff',
                  fontSize: config.position === 1 ? '16px' : '13px',
                  fontWeight: 700,
                  marginBottom: '6px',
                  textAlign: 'center',
                }}>
                  {userItem.name}
                </div>
                <div style={{
                  color: '#888eaf',
                  fontSize: config.position === 1 ? '16px' : '13px',
                  fontWeight: 400,
                  marginBottom: '12px',
                  textAlign: 'center',
                }}>
                  {formatBalance(userItem.balance)}₼
                </div>
                <div style={{
                  padding: config.position === 1 ? '16px 40px' : '10px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '8px',
                }}>
                  <div
                    style={{
                      background: `linear-gradient(to bottom, #00000000, ${config.color}, #00000000)`,
                      borderRadius: '8px',
                      padding: config.position === 1 ? '20px 45px' : '15px 32px',
                      alignItems: 'center',
                      filter: 'blur(25px)',
                      position: 'absolute',
                      marginLeft: config.position === 1 ? -18 : -12
                    }}
                  ></div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    alignItems: 'center'
                  }}>
                    <img
                      src={crown}
                      alt="crown"
                      style={{
                        width: '20px',
                        height: '20px',
                        filter: 'brightness(0) invert(1)',
                        mixBlendMode: 'overlay'
                      }}
                    />
                    <span style={{
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}>
                      {config.rank}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
      {otherUsers.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: '10px',
          fontWeight: 'bold',
          color: '#fff',
          fontSize: '14px',
          padding: '20px 16px 16px 16px',
          maxWidth: 500, margin: '0 auto',
        }}>
          <div>Имя</div>
          <div style={{ textAlign: 'right' }}>Игр</div>
          <div style={{ textAlign: 'right' }}>Баланс</div>
        </div>
      )}
      <div style={{ padding: '0 16px', maxWidth: 500, margin: 'auto', paddingBottom: currentUser ? '100px' : '20px' }}>
        {topUsers.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#fff', padding: '40px' }}>
            Пока нет игроков с балансом
          </p>
        ) : (
          otherUsers.map((userItem, index) => (
            <div
              key={userItem.id}
              style={{
                backgroundColor: isCurrentUser(userItem.id) ? '#8395f6' : '#2c3548',
                borderRadius: '12px',
                padding: '15px 20px',
                marginBottom: '10px',
                display: 'grid',
                gridTemplateColumns: '2fr 0.9fr 0.9fr',
                gap: '10px',
                alignItems: 'center',
                border: isCurrentUser(userItem.id) ? '2px solid #fff' : 'none',
                boxShadow: isCurrentUser(userItem.id) ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none',
              }}
            >
              <div style={{ color: '#fff', fontSize: '16px', fontWeight: isCurrentUser(userItem.id) ? 'bold' : 'normal' }}>
                <span style={{
                  color: '#888eaf',
                  marginRight: 8
                }}>{index + 4}</span>  {userItem.name}
              </div>
              <div style={{ color: '#fff', fontSize: '16px', textAlign: 'right' }}>
                {userItem.played}
              </div>
              <div style={{ color: '#fff', fontSize: '16px', textAlign: 'right', fontWeight: 'bold' }}>
                {formatBalance(userItem.balance)}₼
              </div>
            </div>
          ))
        )}
      </div>
      {currentUser && !topUsers.find(u => u.id === currentUser.id) && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '500px',
          padding: '0 16px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            backgroundColor: '#780e9590',
            borderRadius: '12px',
            padding: '15px 20px',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: '10px',
            alignItems: 'center',
            border: '2px solid #fff',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
          }}>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>
              {currentUser.name}
            </div>
            <div style={{ color: '#fff', fontSize: '16px', textAlign: 'right' }}>
              {currentUser.played}
            </div>
            <div style={{ color: '#fff', fontSize: '16px', textAlign: 'right', fontWeight: 'bold' }}>
              {formatBalance(currentUser.balance)}₼
            </div>
          </div>
        </div>
      )}

      <div style={{
          marginBottom: 150
        }}></div>
    </div>
  );
}

