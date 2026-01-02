import { useEffect, useState } from 'react';
import { databases, appwriteIds, Query } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';

export default function History() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function loadHistory() {
      if (!user?.$id || !appwriteIds.usersCollectionId || !appwriteIds.gameinfoCollectionId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await databases.listDocuments(
          appwriteIds.databaseId,
          appwriteIds.gameinfoCollectionId, // здесь должен быть appwriteIds.gameinfoCollectionId, а не 'gameinfo'
          [
            Query.equal('user', user.$id)
          ]
        );
        // Обработка result, например:
        setHistory(result.documents);
      } catch (error) {
        // Обработка ошибок
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadHistory();
    }
  }, [user]);


  // Функция для форматирования даты
  function formatDate(dateString) {
    if (!dateString) return 'Неизвестно';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Неизвестно';
    }
  }

  if (loading) {
    return (
      <div className='App'>
        <p className='titlem'>История игр</p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
          <div className='spinner'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='App'>
      <p className='titlem'>История игр</p>

      <div style={{
        maxWidth: 500,
        margin: '20px auto',
        padding: '0 16px',
        paddingBottom: '100px',
      }}>
        {history.length === 0 ? (
          <div style={{
            backgroundColor: '#2c3548',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
          }}>
            <p style={{ color: '#fff', fontSize: '16px', margin: 0 }}>
              История игр пуста
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((item, index) => (
              <div
                key={item.$id || index}
                style={{
                  backgroundColor: '#2c3548',
                  borderRadius: '20px',
                  padding: '16px 20px',
                }}
              >
                {/* Дата */}
                <div style={{
                  color: '#888eaf',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}>
                  {formatDate(item.$createdAt)}
                </div>

                {/* Основная информация */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '8px',
                }}>
                  <div>
                    <div style={{ color: '#888eaf', fontSize: '12px', marginBottom: '4px' }}>
                      Ставка
                    </div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>
                      {Number(item.dep || 0).toFixed(2)}₼
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#888eaf', fontSize: '12px', marginBottom: '4px' }}>
                      Выигрыш
                    </div>
                    <div style={{
                      color: Number(item.won || 0) > 0 ? '#4caf50' : '#fff',
                      fontSize: '16px',
                      fontWeight: 600,
                    }}>
                      {Number(item.won || 0).toFixed(2)}₼
                    </div>
                  </div>
                </div>

                {/* Дополнительная информация */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  <div>
                    <div style={{ color: '#888eaf', fontSize: '12px', marginBottom: '4px' }}>
                      Билетов
                    </div>
                    <div style={{ color: '#fff', fontSize: '14px' }}>
                      {item.tickets || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#888eaf', fontSize: '12px', marginBottom: '4px' }}>
                      Игроков
                    </div>
                    <div style={{ color: '#fff', fontSize: '14px' }}>
                      {item.players || 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

