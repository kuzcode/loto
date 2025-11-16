import { useEffect, useState } from 'react';
import { databases, appwriteIds, Query } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';

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
        // Загрузить топ 25 пользователей по balance, только с balance > 0
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
        }));

        setTopUsers(users);

        // Проверить, есть ли текущий пользователь в топе
        const userInTop = users.find(u => u.id === user?.$id);

        // Если пользователь не в топе, загрузить его данные
        if (!userInTop && user?.$id) {
          try {
            const userDoc = await databases.getDocument(
              appwriteIds.databaseId,
              appwriteIds.usersCollectionId,
              user.$id
            );
            
            const balance = Number(userDoc.balance || 0);
            // Показать только если balance > 0
            if (balance > 0) {
              setCurrentUser({
                id: user.$id,
                name: userDoc.name || 'Пользователь',
                balance: balance,
                played: Number(userDoc.played || 0),
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

  if (loading) {
    return (
      <div className='App'>
        <p className='title'>Лидерборд</p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
          <div className='spinner'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='App'>
      <p className='title'>Лидерборд</p>
      
      {/* Шапка таблицы */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: '10px',
        fontWeight: 'bold',
        color: '#fff',
        fontSize: '14px',
        padding: 16,
        maxWidth: 500, margin: '20px auto',
      }}>
        <div>Имя</div>
        <div style={{ textAlign: 'right' }}>Игр</div>
        <div style={{ textAlign: 'right' }}>Баланс</div>
      </div>

      {/* Список пользователей */}
      <div style={{ padding: '0 16px', maxWidth: 500, margin: 'auto', paddingBottom: currentUser ? '100px' : '20px' }}>
        {topUsers.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#fff', padding: '40px' }}>
            Пока нет игроков с балансом
          </p>
        ) : (
          topUsers.map((userItem, index) => (
            <div
              key={userItem.id}
              style={{
                backgroundColor: isCurrentUser(userItem.id) ? '#780e9590' : '#6d0b7f',
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
                {index + 1}. {userItem.name}
              </div>
              <div style={{ color: '#fff', fontSize: '16px', textAlign: 'right' }}>
                {userItem.played}
              </div>
              <div style={{ color: '#fff', fontSize: '16px', textAlign: 'right', fontWeight: 'bold' }}>
                {userItem.balance.toFixed(2)}₼
              </div>
            </div>
          ))
        )}
      </div>

      {/* Плашка текущего пользователя внизу (если его нет в топе) */}
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
              {currentUser.balance.toFixed(2)}₼
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

