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
      <p className='title' style={{
        padding: '40px 22px',
        fontSize: 28
      }}>Создайте аккаунт</p>
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
        {error ? <p className='auth-error'>{error}</p> : null}
        <div style={{
          display: 'flex',
          maxWidth: 500,
          margin: '0 auto',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 22px',
        }}>
          <p style={{
            color: '#fff',
            fontSize: 20
          }}>
            Создать аккаунт
          </p>
          <button className='b2' type="submit" disabled={loading} style={{
            border: 'none',
            padding: '0px 32px',
            height: 36,
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 0 20px 0 rgba(0, 0, 0, 0.12)',
          }}><p style={{ margin: 0, fontSize: 17 }}>{'>'}</p></button>
        </div>

        <p style={{
          color: '#c8cce2',
          margin: '12px auto',
          maxWidth: 500,
          padding: '0 22px'
        }}>Есть аккаунт? <a onClick={() => navigate('/login')} style={{
          color: '#83a9f6',
          fontWeight: 500,
          cursor: 'pointer'
        }}>Войдите</a></p>
      </form>
    </div>
  );
}


