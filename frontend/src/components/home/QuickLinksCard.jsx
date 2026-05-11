export default function QuickLinksCard() {
  return (
    <section className="card social-row-card">
      <a
        className="instagram-profile-link"
        href="https://www.instagram.com/ppanzziri_red/"
        target="_blank"
        rel="noreferrer noopener"
      >
        <svg className="social-logo-mark instagram" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id="igLogoGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f58529" />
              <stop offset="35%" stopColor="#dd2a7b" />
              <stop offset="70%" stopColor="#8134af" />
              <stop offset="100%" stopColor="#515bd4" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igLogoGradient)" />
          <circle cx="12" cy="12" r="4.3" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
          <circle cx="17.3" cy="6.8" r="1.2" fill="#FFFFFF" />
        </svg>
        <span className="instagram-profile-meta">
          <span className="instagram-profile-name">
            Instagram <span className="social-link-arrow" aria-hidden="true">↗</span>
          </span>
        </span>
      </a>
    </section>
  );
}
