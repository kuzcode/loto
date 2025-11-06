import { NavLink } from 'react-router-dom';
import chat from '../icons/chat.png'
import user from '../icons/user.png'
import game from '../icons/game.png'

export default function BottomBar() {
  return (
    <nav className='bottom-bar'>
      <NavLink to='/chat' className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}>
        <img src={chat} alt='chat' />
      </NavLink>
      <NavLink to='/app' className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}>
        <img src={game} alt='home' />
      </NavLink>
      <NavLink to='/profile' className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}>
        <img src={user} alt='profile' />
      </NavLink>
    </nav>
  );
}


