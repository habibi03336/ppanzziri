const TABS = [
  { key: 'home', label: '홈' },
  { key: 'records', label: '기록' },
  { key: 'proof', label: '인증' },
];

export default function TabBar({ activeTab, onChange }) {
  return (
    <nav className="tabbar" aria-label="탭">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`tab ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
