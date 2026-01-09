
import { useNavigate } from 'react-router-dom';
import { account } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';
import userimg from '../icons/user.png';
import { useEffect, useState } from 'react';
import { databases, appwriteIds } from '../appwrite';

import logout2 from '../icons/logout.png';
import wallet from '../icons/wallet.png';
import history from '../icons/history.png';
import edit from '../icons/edit.png';
import play from '../icons/play.png';
import chat from '../icons/message.png';
import privacy from '../icons/privacy.png';
import profile from '../icons/profile.png';
import settings from '../icons/settings.png';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [played, setPlayed] = useState(user?.played || 0);
  const [avatarUrl, setAvatarUrl] = useState('');

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
        setAvatarUrl(userDoc.avatarUrl || '');
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
    <div className='App with-bg'>
      <div className='profile'>
        <div style={{
          display: 'flex',
          justifyContent: 'center'
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} className='avatar' alt='user' />
          ) : (
            <img src={userimg} className='avatar invert' alt='user' />
          )}
        </div>

        <h2 className='name'>{name}</h2>
        <p className='email'>{email}</p>
        <p className='played'><img src={play} width={18} height={17} /> {played} игр сыграно</p>

        <p style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: 20,
          margin: '10px 0'
        }}>Основные</p>

        <div style={{
          background: '#2c3548',
          borderRadius: 20,
          marginBottom: 12
        }}>
          <button className='profbtn' onClick={() => navigate('/balance')}>
            <img src={wallet} width={18} height={18} />
            <p>Баланс</p>
          </button>
          <div style={{ width: 'calc(100% - 32px)', height: 1, background: '#38445d', margin: '1px 16px' }}></div>
          <button className='profbtn' onClick={() => navigate('/history')}>
            <img src={history} width={18} height={18} />
            <p>История игр</p>
          </button>
          <div style={{ width: 'calc(100% - 32px)', height: 1, background: '#38445d', margin: '1px 16px' }}></div>
          <button className='profbtn' onClick={() => navigate('/')}>
            <img src={profile} width={17} height={20} style={{filter: 'brightness(1.52)'}} />
            <p>Друзья</p>
          </button>
          <div style={{ width: 'calc(100% - 32px)', height: 1, background: '#38445d', margin: '1px 16px' }}></div>
          <button className='profbtn' onClick={() => navigate('/profile/edit')}>
            <img src={edit} width={18} height={18} />
            <p>Изменить профиль</p>
          </button>
                    <div style={{ width: 'calc(100% - 32px)', height: 1, background: '#38445d', margin: '1px 16px' }}></div>
          <button className='profbtn' onClick={() => navigate('/profile/edit')}>
            <img src={settings} width={19} height={18} />
            <p>Настройки</p>
          </button>
        </div>

        <p style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: 20,
          margin: '10px 0'
        }}>Поддержка</p>
        <div style={{
          background: '#2c3548',
          borderRadius: 20,
          marginBottom: 12
        }}>
          <a className='profbtn' href='https://t.me/catbad'>
            <img src={chat} width={18} height={18} style={{filter: 'brightness(1.52'}} />
            <p>Нужна помощь? Напишите нам</p>
          </a>
          <div style={{ width: 'calc(100% - 32px)', height: 1, background: '#38445d', margin: '1px 16px' }}></div>
          <button className='profbtn' onClick={() => navigate('/privacy')}>
            <img src={privacy} width={17} height={19} />
            <p>Политика конфиденциальности</p>
          </button>
        </div>

        <button className='profbtn' onClick={logout} style={{
          marginBottom: 150
        }}>
          <img src={logout2} width={18} height={18} />
          <p style={{ color: '#eb5656' }}>Выйти из аккаунта</p>
        </button>
      </div>
    </div>
  );
}
