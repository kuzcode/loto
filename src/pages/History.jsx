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
        console.log('History: Loading user document...', user.$id);

        // Получить документ пользователя
        const userDoc = await databases.getDocument(
          appwriteIds.databaseId,
          'users',
          user.$id
        );

        console.log(userDoc);

        const historyRaw = userDoc.history || [];

        // Обработать relationship - может быть массивом строк (ID) или массивом объектов
        let historyIds = [];
        if (Array.isArray(historyRaw)) {
          historyIds = historyRaw.map(item => {
            if (typeof item === 'string') {
              return item;
            }
            if (item && typeof item === 'object' && item.$id) {
              return item.$id;
            }
            return null;
          }).filter(Boolean);
        } else if (historyRaw) {
          if (typeof historyRaw === 'string') {
            historyIds = [historyRaw];
          } else if (historyRaw && typeof historyRaw === 'object' && historyRaw.$id) {
            historyIds = [historyRaw.$id];
          }
        }

        console.log('History: Extracted IDs', { historyIds, count: historyIds.length });

        if (historyIds.length === 0) {
          console.log('History: No history items found');
          setHistory([]);
          setLoading(false);
          return;
        }

        // Загрузить все документы истории
        console.log('History: Loading', historyIds.length, 'history items...');
        const historyPromises = historyIds.map(id =>
          databases.getDocument(
            appwriteIds.databaseId,
            appwriteIds.gameinfoCollectionId,
            id
          ).catch(err => {
            console.error(`History: Failed to load history item ${id}:`, err);
            return null;
          })
        );

        const historyItems = await Promise.all(historyPromises);

        console.log('History: Loaded items', {
          total: historyItems.length,
          valid: historyItems.filter(item => item !== null).length
        });

        // Отфильтровать null и отсортировать по дате (новые сначала)
        const validHistory = historyItems
          .filter(item => item !== null)
          .sort((a, b) => {
            const dateA = new Date(a.$createdAt || 0);
            const dateB = new Date(b.$createdAt || 0);
            return dateB - dateA;
          });

        console.log('History: Final history items', validHistory.length);
        setHistory(validHistory);
      } catch (error) {
        console.error('History: Error loading history:', error);
        setHistory([]);
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
        <p className='title'>История игр</p>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
          <div className='spinner'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='App'>
      <p className='title'>История игр</p>

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
                  borderRadius: '12px',
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

