import { useEffect, useMemo, useState } from 'react';
import { databases, appwriteIds, Query, ID } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';

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
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default function Chat() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursorAfter, setCursorAfter] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null); const canQuery = useMemo(() => Boolean(appwriteIds.databaseId && appwriteIds.chatCollectionId), []); useEffect(() => {
    loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMore intentionally run only when canQuery is ready
  }, [canQuery]); async function loadMore(initial = false) {
    if (!canQuery || loading || (!initial && !hasMore)) return;
    setLoading(true);
    try {
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(25),
      ];
      if (cursorAfter && !initial) {
        queries.push(Query.cursorAfter(cursorAfter));
      }
      const res = await databases.listDocuments(
        appwriteIds.databaseId,
        appwriteIds.chatCollectionId,
        queries
      );
      const newDocs = res.documents || [];


      const enrichedDocs = await Promise.all(newDocs.map(async (doc) => {
        if (doc.author && typeof doc.author === 'string' && appwriteIds.usersCollectionId) {
          try {
            const authorDoc = await databases.getDocument(
              appwriteIds.databaseId,
              appwriteIds.usersCollectionId,
              doc.author
            );
            return { ...doc, author: { name: authorDoc.name || 'Пользователь', id: doc.author } };
          } catch {
            return { ...doc, author: { name: 'Пользователь', id: doc.author } };
          }
        }
        return doc;
      }));

      setItems((prev) => initial ? enrichedDocs : [...prev, ...enrichedDocs]);
      if (newDocs.length < 25) {
        setHasMore(false);
      }
      if (newDocs.length > 0) {
        setCursorAfter(newDocs[newDocs.length - 1].$id);
      }
    } catch (_) {

    } finally {
      setLoading(false);
    }
  } async function sendMessage(e) {
    e.preventDefault();
    if (!message.trim() || !canQuery || sending || !user?.$id) return;
    setSending(true);
    const msgText = message.trim();
    setMessage('');
    try {
      const newDoc = await databases.createDocument(
        appwriteIds.databaseId,
        appwriteIds.chatCollectionId,
        ID.unique(),
        {
          message: msgText,
          author: user.$id,
        }
      );


      let enrichedDoc = newDoc;
      if (newDoc.author && typeof newDoc.author === 'string' && appwriteIds.usersCollectionId) {
        try {
          const authorDoc = await databases.getDocument(
            appwriteIds.databaseId,
            appwriteIds.usersCollectionId,
            newDoc.author
          );
          enrichedDoc = { ...newDoc, author: { name: authorDoc.name || 'Пользователь', id: newDoc.author } };
        } catch {
          enrichedDoc = { ...newDoc, author: { name: user.name || 'Пользователь', id: newDoc.author } };
        }
      } else {
        enrichedDoc = { ...newDoc, author: { name: user.name || 'Пользователь', id: user.$id } };
      }


      setItems((prev) => [enrichedDoc, ...prev]);
      setCursorAfter(null);
      setHasMore(true);
    } catch (e) {

      setMessage(msgText);
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  } async function deleteMessage(messageId) {
    if (!canQuery || !user?.$id || deletingId) return;
    setDeletingId(messageId);
    try {
      await databases.deleteDocument(
        appwriteIds.databaseId,
        appwriteIds.chatCollectionId,
        messageId
      );

      setItems((prev) => prev.filter(item => item.$id !== messageId));
    } catch (e) {
      console.error('Failed to delete message:', e);
    } finally {
      setDeletingId(null);
    }
  } return (
    <div className='App with-bg'>
      <p className='titlem'>Чат</p>
      <div className='chat'>
        <div className='chat-list'>
          {items.map((d) => {
            const isOwnMessage = d.author?.id === user?.$id || d.author === user?.$id;
            return (
              <div key={d.$id} className='chat-item' style={{ position: 'relative' }}>
                <div className='chat-author'>{d.author?.name || 'Аноним'}</div>
                <div className='chat-message'>{d.message}</div>
                <div className='chat-time'>{formatRelative(d.$createdAt)}</div>
                {isOwnMessage && (
                  <button
                    onClick={() => deleteMessage(d.$id)}
                    disabled={deletingId === d.$id}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#ff5733',
                      cursor: deletingId === d.$id ? 'not-allowed' : 'pointer',
                      fontSize: '18px',
                      padding: '5px',
                      opacity: deletingId === d.$id ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                    }}
                    title='Удалить сообщение'
                  >
                    {deletingId === d.$id ? '...' : '🗑️'}
                  </button>
                )}
              </div>
            );
          })}
          {items.length === 0 && !loading ? (
            <p style={{ textAlign: 'center', color: '#fff' }}>Пока сообщений нет</p>
          ) : null}
          {loading && items.length === 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px',
              minHeight: '200px'
            }}>
              <div className='spinner'></div>
            </div>
          )}
        </div>
        <div className='buttons'>
          {hasMore ? (
            <button className='b2' onClick={() => loadMore(false)} disabled={loading}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading ? (
                  <>
                    <div className='spinner-small'></div>
                    Загрузка...
                  </>
                ) : (
                  'Показать ещё'
                )}
              </p>
            </button>
          ) : (
            <p className='chatp'>Это все сообщения</p>
          )}
        </div>
        <form onSubmit={sendMessage} className='chat-form'>
          <input
            type='text'
            placeholder='Введите сообщение...'
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending || !user}
            className='chat-input'
          />
          <button type='submit' className='b2 sendbtn' disabled={sending || !user || !message.trim()}>
            <p>{sending ? '...' : 'Отправить'}</p>
          </button>
        </form>
      </div>    <div style={{
        marginBottom: 150
      }}></div>
    </div>
  );
}


