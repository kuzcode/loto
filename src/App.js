import './App.css';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedApp from './ProtectedApp';
import ProtectedLayout from './layouts/ProtectedLayout';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Deposit from './pages/Deposit';

function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (!loading && user) {
    navigate('/app', { replace: true });
  }

  return (
    <div className="App">
      <p className='title center'>Лото</p>

      <div className='buttons'>
        <button className='b1' onClick={() => navigate('/login')}><p>Вход</p></button>
        <button className='b2' onClick={() => navigate('/register')}><p>Регистрация</p></button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Landing />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route element={<ProtectedRoute />}> 
            <Route element={<ProtectedLayout /> }>
              <Route path='/app' element={<ProtectedApp />} />
              <Route path='/chat' element={<Chat />} />
              <Route path='/profile' element={<Profile />} />
            </Route>
            <Route path='/deposit' element={<Deposit />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
