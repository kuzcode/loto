import { useState } from 'react';
import { account } from '../appwrite';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await account.createEmailPasswordSession(email, password);
      const me = await account.get();
      setUser(me);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <p className='title center'>Вход</p>
      <form onSubmit={onSubmit} className='auth-form'>
        <div className='inputs'>
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
          <button className='b1' type="submit" disabled={loading}><p>{loading ? '...' : 'Войти'}</p></button>
          <button className='b2' type='button' onClick={() => navigate('/register')}><p>Регистрация</p></button>
        </div>
      </form>
      <div className='auth-links'>
        <button className='link-btn' type='button' onClick={() => navigate('/')}>← Назад</button>
      </div>
    </div>
  );
}


