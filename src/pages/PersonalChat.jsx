import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// Сообщения в переменной (одинаковые для каждого чата)
const SAMPLE_MESSAGES = [
  { id: '1', text: 'Привет!', isOwn: false },
  {
    id: '2',
    text: "Я выиграл 100$",
    isOwn: false,
  },
  {
    id: '5',
    text: 'Правда? Круто!',
    isOwn: true,
    time: '12:02PM',
  },
];

export default function PersonalChat() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const contact = location.state?.contact;

  const [messages, setMessages] = useState(SAMPLE_MESSAGES);
  const [inputText, setInputText] = useState('');

  // Если нет contact в state, пробуем восстановить из id (для прямого захода)
  const displayContact = contact || {
    id: id || '1',
    name: 'Sakura Drift',
    avatar: 'https://i.pravatar.cc/112?img=5',
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    setMessages((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        text,
        isOwn: true,
        time,
      },
    ]);
  };

  return (
    <div className="personal-chat-page">
      <header className="personal-chat-header personal-chat-header-fixed">
        <button
          className="personal-chat-back"
          onClick={() => navigate('/message')}
          aria-label="Назад"
        >
          <svg width="6" height="14" viewBox="0 0 6 14" fill="none">
            <path
              d="M5 1L1 7L5 13"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <img
          src={displayContact.avatar}
          alt=""
          className="personal-chat-header-avatar"
          width={32}
          height={32}
        />
        <h1 className="personal-chat-header-name">{displayContact.name}</h1>
      </header>

      <div className="personal-chat-messages personal-chat-messages-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`personal-chat-msg ${msg.isOwn ? 'own' : 'incoming'}`}
          >
            <div className="personal-chat-msg-bubble">
              <span className="personal-chat-msg-text">{msg.text}</span>
              {msg.isOwn && (
                <div className="personal-chat-msg-meta">
                  {msg.time && <span className="personal-chat-msg-time">{msg.time}</span>}
                  <span className="personal-chat-msg-check">✓✓</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form className="personal-chat-form personal-chat-form-fixed" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Сообщение..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="personal-chat-input"
        />
        <button
          type="submit"
          className="personal-chat-send"
          disabled={!inputText.trim()}
          aria-label="Отправить"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M1 8L15 1L8 15L7 9L1 8Z"
              fill="white"
              stroke="white"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
