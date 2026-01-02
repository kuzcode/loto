import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { account, databases, storage, appwriteIds, ID } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';
import profile from '../icons/profile.png';
import photo from '../icons/photo.png';

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadUserData() {
      if (!user?.$id || !appwriteIds.usersCollectionId) return;

      try {
        // Загрузить данные пользователя из базы
        const userDoc = await databases.getDocument(
          appwriteIds.databaseId,
          appwriteIds.usersCollectionId,
          user.$id
        );
        
        setName(userDoc.name || user.name || '');
        setAvatarUrl(userDoc.avatarUrl || '');
      } catch (error) {
        console.error('Error loading user data:', error);
        setName(user?.name || '');
      }
    }

    if (user) {
      loadUserData();
    }
  }, [user]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера файла (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB');
      return;
    }

    if (!appwriteIds.avatarsBucketId) {
      setError('Не настроен bucket для аватаров');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Получить текущий avatarUrl из БД перед удалением
      let oldAvatarUrl = avatarUrl;
      if (!oldAvatarUrl && user?.$id && appwriteIds.usersCollectionId) {
        try {
          const userDoc = await databases.getDocument(
            appwriteIds.databaseId,
            appwriteIds.usersCollectionId,
            user.$id
          );
          oldAvatarUrl = userDoc.avatarUrl || '';
        } catch (err) {
          console.error('Error loading user doc for avatar:', err);
        }
      }

      // Удалить старое изображение, если оно есть
      if (oldAvatarUrl && oldAvatarUrl.includes('/storage')) {
        try {
          const urlParts = oldAvatarUrl.split('/');
          const fileIdIndex = urlParts.indexOf('files');
          if (fileIdIndex !== -1 && urlParts[fileIdIndex + 1]) {
            const fileId = urlParts[fileIdIndex + 1].split('?')[0];
            await storage.deleteFile(appwriteIds.avatarsBucketId, fileId);
          }
        } catch (err) {
          console.error('Error deleting old avatar:', err);
          // Продолжаем, даже если не удалось удалить старое изображение
        }
      }

      // Загрузить новое изображение
      const fileId = ID.unique();
      await storage.createFile(
        appwriteIds.avatarsBucketId,
        fileId,
        file
      );

      // Получить URL для предпросмотра (публичный доступ)
      const fileUrl = storage.getFileView(
        appwriteIds.avatarsBucketId,
        fileId
      );

      // Обновить в базе данных
      await databases.updateDocument(
        appwriteIds.databaseId,
        appwriteIds.usersCollectionId,
        user.$id,
        { avatarUrl: fileUrl }
      );

      setAvatarUrl(fileUrl);
      setSuccess('Аватар успешно обновлен');
    } catch (err) {
      setError(err?.message || 'Ошибка загрузки аватара');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let hasUpdates = false;

      // Обновить имя в Appwrite Account
      if (name && name !== user?.name) {
        await account.updateName(name);
        hasUpdates = true;
      }

      // Обновить имя в базе данных
      if (name && appwriteIds.usersCollectionId) {
        await databases.updateDocument(
          appwriteIds.databaseId,
          appwriteIds.usersCollectionId,
          user.$id,
          { name }
        );
        hasUpdates = true;
      }

      // Обновить пароль, если указан
      if (newPassword) {
        if (newPassword.length < 8) {
          throw new Error('Пароль должен содержать минимум 8 символов');
        }

        if (newPassword !== confirmPassword) {
          throw new Error('Пароли не совпадают');
        }

        if (!currentPassword) {
          throw new Error('Введите текущий пароль для смены');
        }

        await account.updatePassword(newPassword, currentPassword);
        // Очистить поля пароля после успешного обновления
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        hasUpdates = true;
      }

      if (hasUpdates) {
        // Обновить данные пользователя в контексте
        const updatedUser = await account.get();
        setUser(updatedUser);
        setSuccess('Профиль успешно обновлен');
      }
    } catch (err) {
      setError(err?.message || 'Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='App'>
      <p className='titlem'>Редактирование профиля</p>
      
      <div style={{
        maxWidth: 456,
        margin: '20px auto',
        padding: '0 16px',
      }}>
        <form onSubmit={handleSubmit}>
          {/* Аватар */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: '#2c3548',
                border: '3px solid #83a9f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
                marginBottom: '16px',
                position: 'relative',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <img
                  src={profile}
                  alt="Profile"
                  style={{
                    width: '60%',
                    height: '60%',
                    objectFit: 'contain',
                  }}
                />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50px',
                border: 'none',
                backgroundColor: '#2a3143',
                cursor: 'pointer',
                boxShadow: '0 0 20px #00000057',
                transform: 'translate(30px, -50px)'
              }}
            >
              <img src={photo} width={18} height={17} />
            </button>
          </div>

          {/* Имя */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px',
            }}>
              Имя
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#2c3548',
                color: '#fff',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="Введите имя"
            />
          </div>

          {/* Пароль */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px',
            }}>
              Новый пароль
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#2c3548',
                color: '#fff',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '12px',
              }}
              placeholder="Оставьте пустым, чтобы не менять"
            />
            {newPassword && (
              <>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#2c3548',
                    color: '#fff',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginBottom: '12px',
                  }}
                  placeholder="Текущий пароль"
                  required
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#2c3548',
                    color: '#fff',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Подтвердите новый пароль"
                  required={!!newPassword}
                />
              </>
            )}
          </div>

          {/* Сообщения об ошибках и успехе */}
          {error && (
            <div style={{
              backgroundColor: '#ff5733',
              color: '#fff',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: '#4caf50',
              color: '#fff',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
            }}>
              {success}
            </div>
          )}

          {/* Кнопки */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '30px',
          }}>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#2c3548',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#83a9f6',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

