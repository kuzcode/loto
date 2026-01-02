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
import EditProfile from './pages/EditProfile';
import History from './pages/History';
import Privacy from './pages/Privacy';
import Deposit from './pages/Deposit';
import Balance from './pages/Balance';
import Game from './pages/Game';
import Leaderboard from './pages/Leaderboard';
import crown2 from './icons/crown2.png'

function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (!loading && user) {
    navigate('/app', { replace: true });
  }

  return (
    <div className="App with-bg" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 0,
      top: 0
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 484,
        width: '100%',
        margin: '0 auto',
        alignItems: 'flex-start',
        padding: '40px 20px 0 20px',
      }}>
        <img src={crown2} width={32} height={31} />
        <p className='title'>ЛОТО.</p>
        <p className='sub'>- И ничего лишнего</p>
      </div>

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
          <Route path='/privacy' element={<Privacy />} />
          <Route path='/register' element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedLayout />}>
              <Route path='/app' element={<ProtectedApp />} />
              <Route path='/game/:id' element={<Game />} />
              <Route path='/chat' element={<Chat />} />
              <Route path='/leaderboard' element={<Leaderboard />} />
              <Route path='/profile' element={<Profile />} />
              <Route path='/profile/edit' element={<EditProfile />} />
              <Route path='/history' element={<History />} />
            </Route>
            <Route path='/deposit' element={<Deposit />} />
            <Route path='/balance' element={<Balance />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
