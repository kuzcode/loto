import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { account, databases, appwriteIds, ID } from '../appwrite';
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
        <button className='link-btn' onClick={() => navigate(-1)}>← Назад</button>
      </div>
      <div className='deposit-content'>
        <h2>Депозит</h2>
        <p>Ваш баланс: {balance}₼</p>
        <p>Введите сумму, на которую хотели бы пополнить:</p>
        <input
          value={todep.toString()}
          onInput={(e) => { settodep(e.target.value) }}
        />
      </div>
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
  );
}


