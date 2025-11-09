import { useNavigate } from 'react-router-dom';
import { account } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';
import userimg from '../icons/user.png'

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await account.deleteSession('current');
    setUser(null);
    navigate('/', { replace: true });
  };

  return (
    <div>
      <div className='profile'>
        <div className='flex'>
        <img src={userimg} className='avatar' alt='user' />
        <h2 className='name'>{user?.name || '-'}</h2>
        </div>
        <p className='email'>{user?.email || '-'}</p>
      <button className='logout' onClick={logout}><p>Выйти из аккаунта</p></button>
      </div>
    </div>
  );
}


