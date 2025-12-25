import { NavLink } from 'react-router-dom';
import chat from '../icons/message.png'
import user from '../icons/profile.png'
import game from '../icons/play.png'
import rank from '../icons/rank.png'
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
        <img width={23} height={22} src={chat} alt='chat' />
      </NavLink>
      <NavLink 
        to='/app' 
        className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}
        onClick={handleClick}
      >
        <img width={23} height={22} src={game} alt='home' />
      </NavLink>
      <NavLink 
        to='/leaderboard' 
        className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}
        onClick={handleClick}
      >
        <img width={23} height={23} src={rank} alt='leaderboard' />
      </NavLink>
      <NavLink 
        to='/profile' 
        className={({ isActive }) => isActive ? 'bb-item active' : 'bb-item'}
        onClick={handleClick}
      >
        <img width={21} height={24} src={user} alt='profile' />
      </NavLink>
    </nav>
  );
}


