import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { databases, appwriteIds } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';

export default function Deposit() {
  const navigate = useNavigate();
  const [todep, settodep] = useState(0)

  const { user } = useAuth();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.$id || !appwriteIds.usersCollectionId) {
        setBalance(0);
        return;
      }
      try {
        const doc = await databases.getDocument(
          appwriteIds.databaseId,
          appwriteIds.usersCollectionId,
          user.$id
        );
        if (!cancelled) {
          setBalance(typeof doc.balance === 'number' ? doc.balance : 0);
        }
      } catch (_) {
        if (!cancelled) setBalance(0);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className='deposit-page'>
      <div className='deposit-header'>
        <button style={{
          background: '#2c3548',
          boxShadow: '0 0 20px #0000005e',
          border: 'none',
          borderRadius: 100,
          color: '#fff',
          fontSize: 25,
          height: 40,
          width: 40
        }} onClick={() => navigate(-1)}>{'<'}</button>
      </div>
      <h2 style={{textAlign: 'center'}}>Пополнение</h2>
      <div className='deposit-content'>
        <p style={{ margin: 0, textAlign: 'center' }}>Введите сумму:</p>

        <input
          value={todep}
          onInput={(e) => {
            const value = e.target.value;
            // Убираем знак $ если он есть, чтобы сохранить только число
            settodep(value.replace(/^\₼/, ""));
          }}
          onFocus={(e) => {
            // Если пользователь удалит $, добавляем его обратно
            if (!e.target.value.startsWith("₼")) {
              e.target.value = "₼" + e.target.value;
            }
          }}
          onChange={(e) => {
            // Если пользователь пытается стереть $, восстанавливаем
            if (!e.target.value.startsWith("₼")) {
              e.target.value = "₼";
            }
          }}
        />

      </div>

      <div className='tips'>
        <button onClick={() => { settodep(10) }}>10₼</button>
        <button onClick={() => { settodep(25) }}>25₼</button>
        <button onClick={() => { settodep(50) }}>50₼</button>
        <button onClick={() => { settodep(100) }}>100₼</button>
      </div>

      <p style={{textAlign: 'center'}}>{balance}₼ → {balance + parseInt(todep)}₼</p>

      <div style={{
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button className='b2 deposit-btn' onClick={async () => {
        const result = await databases.updateDocument(
          appwriteIds.databaseId, // databaseId
          appwriteIds.usersCollectionId, // collectionId
          user.$id, // documentId
          {
            balance: balance + parseInt(todep)
          }, // data (optional)
        );
        navigate('/app')
        return result;
      }}>Пополнить</button>
      </div>
    </div>
  );
}


