import { NavLink } from 'react-router-dom';
import chat from '../icons/chat.png'
import user from '../icons/user.png'
import game from '../icons/game.png'
import people from '../icons/people.png'
import { playClickSound } from '../utils/soundManager';

export default function BottomBar() {
  const handleClick = () => {
    playClickSound();
  };

  return (
    <nav className='bottom-bar'>
      <NavLink 
        to='/chat' 
        className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}
        onClick={handleClick}
      >
        <img src={chat} alt='chat' />
      </NavLink>
      <NavLink 
        to='/app' 
        className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}
        onClick={handleClick}
      >
        <img src={game} alt='home' />
      </NavLink>
      <NavLink 
        to='/leaderboard' 
        className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}
        onClick={handleClick}
      >
        <img src={people} alt='leaderboard' />
      </NavLink>
      <NavLink 
        to='/profile' 
        className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}
        onClick={handleClick}
      >
        <img src={user} alt='profile' />
      </NavLink>
    </nav>
  );
}


