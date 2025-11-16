
import { useNavigate } from 'react-router-dom';
import { account } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';
import userimg from '../icons/user.png';
import { useEffect, useState } from 'react';
import { databases, appwriteIds } from '../appwrite';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [played, setPlayed] = useState(user?.played || 0);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUserDoc() {
      try {
        const userDoc = await databases.getDocument(
          appwriteIds.databaseId,
          appwriteIds.usersCollectionId,
          user.$id
        );
        setName(userDoc.name || '');
        setEmail(userDoc.email || '');
        setPlayed(userDoc.played || 0);
      } catch (error) {
        console.error('Error fetching user document:', error);
      }
    }
    if (user && user.$id) {
      fetchUserDoc();
    }
  }, [user]);

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className='profile'>
      <div className='flex'>
        <img src={userimg} className='avatar' alt='user' />
        <h2 className='name'>{name}</h2>
      </div>
      <p className='email'>{email}</p>
      <p className='email'>Игр сыграно: {played}</p>
      <button className='logout' onClick={logout}>
        <p>Выйти из аккаунта</p>
      </button>
    </div>
  );
}
