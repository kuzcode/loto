import BottomBar from '../components/BottomBar';
import Header from '../components/Header';
import { Outlet } from 'react-router-dom';

export default function ProtectedLayout() {
  return (
    <div className='App with-bar'>
      <Header />
      <Outlet />
      <BottomBar />
    </div>
  );
}


