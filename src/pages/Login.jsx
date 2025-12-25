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
      <p className='title' style={{
        padding: '40px 22px'
      }}>Войдите в игру</p>
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
            Войти
          </p>
          <button className='b2' type="submit" disabled={loading} style={{
            border: 'none',
            padding: '0px 36px',
            height: 40,
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 0 20px 0 rgba(0, 0, 0, 0.12)',
          }}><p style={{margin: 0, fontSize: 17}}>{'>'}</p></button>
        </div>

        <p style={{
          color: '#c8cce2',
          margin: '12px auto',
          maxWidth: 500,
          padding: '0 22px'
        }}>Нет аккаунта? <a onClick={() => navigate('/register')} style={{
          color: '#83a9f6',
          fontWeight: 500,
          cursor: 'pointer'
        }}>Зарегистрируйтесь</a></p>      

      </form>
    </div>
  );
}


