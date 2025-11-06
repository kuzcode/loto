import { useAuth } from './auth/AuthProvider';

export default function ProtectedApp() {
  const { user } = useAuth();

  return (
    <div>
      <p className='title'>Главная</p>
    </div>
  );
}


