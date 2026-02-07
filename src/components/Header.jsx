import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { databases, appwriteIds } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';
import wallet from '../icons/wallet.png'
import crown from '../icons/crown2.png'

export default function Header() {
  const navigate = useNavigate();
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
    const listener = () => load();
    window.addEventListener('balance-changed', listener);
    return () => {
      cancelled = true;
      window.removeEventListener('balance-changed', listener);
    };
  }, [user]);

  return (
    <header className='top-bar'>
      <img src={crown} style={{ marginLeft: 4, marginBottom: 2 }} width={21} height={21} alt="" />
      <button className='balance' onClick={() => navigate('/balance')}>
        <img src={wallet} style={{ marginLeft: 12 }} width={18} height={18} alt="" />
        <span style={{ margin: '0 8px', fontSize: 15 }}>{balance}₼</span>
        <span className='plus'>+</span>
      </button>
    </header>
  );
}


