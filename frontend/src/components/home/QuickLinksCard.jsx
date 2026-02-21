export default function QuickLinksCard() {
  const links = [
    {
      key: 'youtube',
      label: '@ppanzziri',
      href: 'https://www.youtube.com/@ppanzziri',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="1.5" y="4.5" width="21" height="15" rx="5" fill="#ff0000" />
          <polygon points="10,9 16,12 10,15" fill="#ffffff" />
        </svg>
      ),
    },
    {
      key: 'instagram',
      label: '@ppanzziri',
      href: 'https://www.instagram.com/ppanzziri/',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id="igGradHome" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F58529" />
              <stop offset="35%" stopColor="#DD2A7B" />
              <stop offset="70%" stopColor="#8134AF" />
              <stop offset="100%" stopColor="#515BD4" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igGradHome)" />
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.25" fill="#FFFFFF" />
        </svg>
      ),
    },
  ];

  return (
    <section className="card">
      <div className="quick-links">
        {links.map((link) => (
          <a key={link.key} className="quick-link" href={link.href} target="_blank" rel="noreferrer noopener">
            <span className="quick-link-icon">{link.icon}</span>
            <span className="quick-link-label">{link.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
