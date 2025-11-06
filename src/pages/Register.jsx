import { useState } from 'react';
import { account, databases, appwriteIds, ID } from '../appwrite';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await account.create(ID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      const me = await account.get();
      setUser(me);

      if (!appwriteIds.usersCollectionId) {
        throw new Error('Не указан идентификатор коллекции users (REACT_APP_APPWRITE_USERS_COLLECTION_ID)');
      }

      await databases.createDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        created.$id,
        {
          name,
          email
        }
      );

      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <p className='title'>Регистрация</p>
      <form onSubmit={onSubmit} className='auth-form'>
        <div className='inputs'>
          <input
            type="text"
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className='auth-error'>{error}</p> : null}
        <div className='buttons'>
          <button className='b1' type="submit" disabled={loading}><p>{loading ? '...' : 'Зарегистрироваться'}</p></button>
          <button className='b2' type='button' onClick={() => navigate('/login')}><p>У меня есть аккаунт</p></button>
        </div>
      </form>
      <div className='auth-links'>
        <button className='link-btn' type='button' onClick={() => navigate('/')}>← Назад</button>
      </div>
    </div>
  );
}


