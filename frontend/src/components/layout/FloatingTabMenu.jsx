import { useState } from 'react';

const MENU_ITEMS = [
  { key: 'home', label: '홈' },
  { key: 'records', label: '기록' },
  { key: 'writing', label: '글쓰기' },
];

const AVATAR_SRC = '/assets/ppanzziri-character.png';
const VIBRATE_MS = 10;

function vibrateShort() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(VIBRATE_MS);
  } catch {
    // ignore unsupported/runtime errors
  }
}

export default function FloatingTabMenu({ activeTab, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`floating-menu ${open ? 'open' : ''}`}>
      <div className="floating-ring" aria-hidden={!open}>
        {MENU_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`floating-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => {
              vibrateShort();
              onChange(item.key);
              setOpen(false);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="floating-avatar-btn"
        aria-label="페이지 이동 메뉴 열기"
        aria-expanded={open}
        onClick={() => {
          vibrateShort();
          setOpen((prev) => !prev);
        }}
      >
        <img
          src={AVATAR_SRC}
          alt="캐릭터"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling;
            if (fallback) fallback.style.display = 'grid';
          }}
        />
        <span className="floating-avatar-fallback" aria-hidden="true">🐝</span>
      </button>
    </div>
  );
}
