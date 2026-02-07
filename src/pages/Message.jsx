import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Список чатов в отдельной переменной
const INITIAL_CHATS = [
  {
    id: '1',
    name: 'Safira Artemieva',
    avatar: 'https://i.pravatar.cc/112?img=1',
    lastMessage: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr.',
    time: 'Now',
  },
  {
    id: '2',
    name: 'Sakura Drift',
    avatar: 'https://i.pravatar.cc/112?img=5',
    lastMessage: 'Something is Typing…',
    time: '5 min',
    isTyping: true,
  },
  {
    id: '3',
    name: 'Jade Horizon',
    avatar: 'https://i.pravatar.cc/112?img=9',
    lastMessage: 'Soft, calm, and inspired by the quiet moments of life.',
    time: '12 min',
  },
  {
    id: '4',
    name: 'Seoul Frequency',
    avatar: 'https://i.pravatar.cc/112?img=12',
    lastMessage: 'Modern, clean, and stylish — a chat experience like no other.',
    time: '1 hr',
  },
  {
    id: '5',
    name: 'Bamboo Echo',
    avatar: 'https://i.pravatar.cc/112?img=15',
    lastMessage: 'Minimalist, serene, and rooted in nature.',
    time: '2 hr',
  },
];

export default function Message() {
  const navigate = useNavigate();
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [swipedId, setSwipedId] = useState(null);
  const touchStartX = useRef(0);
  const hasSwiped = useRef(false);

  const handleSwipeStart = (e, chatId) => {
    hasSwiped.current = false;
    if (swipedId && swipedId !== chatId) {
      setSwipedId(null);
    }
    touchStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleSwipeMove = (e, chatId) => {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const diff = touchStartX.current - x;
    if (Math.abs(diff) > 20) hasSwiped.current = true;
    if (diff > 60) {
      setSwipedId(chatId);
    } else if (diff < -60) {
      setSwipedId(null);
    }
  };

  const handleSwipeEnd = () => {};

  const handleChatClick = (chat) => {
    if (hasSwiped.current) return;
    if (swipedId === chat.id) {
      setSwipedId(null);
      return;
    }
    navigate(`/message/chat/${chat.id}`, { state: { contact: chat } });
  };

  const handleDelete = (e, chatId) => {
    e.stopPropagation();
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    setSwipedId(null);
  };

  return (
    <div className="message-page">
      <h1 className="message-title">Сообщения</h1>
      <div className="message-list">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="message-chat-row"
            onClick={() => handleChatClick(chat)}
            onTouchStart={(e) => handleSwipeStart(e, chat.id)}
            onTouchMove={(e) => handleSwipeMove(e, chat.id)}
            onTouchEnd={handleSwipeEnd}
            onMouseDown={(e) => handleSwipeStart(e, chat.id)}
            onMouseMove={(e) => e.buttons && handleSwipeMove(e, chat.id)}
            onMouseUp={handleSwipeEnd}
            onMouseLeave={handleSwipeEnd}
          >
            <div
              className="message-chat-delete"
              onClick={(e) => handleDelete(e, chat.id)}
            >
              <svg className="message-chat-delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div
              className={`message-chat-content ${swipedId === chat.id ? 'swiped' : ''}`}
            >
              <img
                src={chat.avatar}
                alt=""
                className="message-chat-avatar"
                width={56}
                height={56}
              />
              <div className="message-chat-body">
                <div className="message-chat-top">
                  <span className="message-chat-name">{chat.name}</span>
                  <span className="message-chat-time">{chat.time}</span>
                </div>
                <span
                  className={`message-chat-preview ${chat.isTyping ? 'typing' : ''}`}
                >
                  {chat.lastMessage}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
