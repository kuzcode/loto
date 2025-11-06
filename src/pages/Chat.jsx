import { useEffect, useMemo, useState } from 'react';
import { databases, appwriteIds, Query } from '../appwrite';

function formatRelative(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);
  if (sec < 60) return 'только что';
  if (min < 60) return `${min} мин. назад`;
  if (hour < 24) return `${hour} ч. назад`;
  if (day < 7) return `${day} дн. назад`;
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default function Chat() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursorAfter, setCursorAfter] = useState(null);

  const canQuery = useMemo(() => Boolean(appwriteIds.databaseId && appwriteIds.chatCollectionId), []);

  useEffect(() => {
    loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuery]);

  async function loadMore(initial = false) {
    if (!canQuery || loading || (!initial && !hasMore)) return;
    setLoading(true);
    try {
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(25),
      ];
      if (cursorAfter) {
        queries.push(Query.cursorAfter(cursorAfter));
      }
      const res = await databases.listDocuments(
        appwriteIds.databaseId,
        appwriteIds.chatCollectionId,
        queries
      );
      const newDocs = res.documents || [];
      setItems((prev) => initial ? newDocs : [...prev, ...newDocs]);
      if (newDocs.length < 25) {
        setHasMore(false);
      }
      if (newDocs.length > 0) {
        setCursorAfter(newDocs[newDocs.length - 1].$id);
      }
    } catch (_) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className='title'>Чат</p>
      <div className='chat'>
        <div className='chat-list'>
          {items.map((d) => (
            <div key={d.$id} className='chat-item'>
              <div className='chat-author'>{d.author?.name || 'Аноним'}</div>
              <div className='chat-message'>{d.message}</div>
              <div className='chat-time'>{formatRelative(d.$createdAt)}</div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <p style={{ textAlign: 'center', color: '#fff' }}>Пока сообщений нет</p>
          ) : null}
        </div>
        <div className='buttons'>
          {hasMore ? (
            <button className='b2' onClick={() => loadMore(false)} disabled={loading}><p>{loading ? '...' : 'Показать ещё'}</p></button>
          ) : (
            <button className='b3' disabled><p>Больше нет</p></button>
          )}
        </div>
      </div>
    </div>
  );
}


