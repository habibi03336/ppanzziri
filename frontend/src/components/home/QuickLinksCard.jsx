const INSTAGRAM_PROFILES = [
  {
    label: 'ppanzziri',
    description: 'show my love to the world',
    href: 'https://www.instagram.com/ppanzziri/',
  },
  {
    label: 'runaway_ppanzziri',
    description: '뺀질이식 일상감상',
    href: 'https://www.instagram.com/runaway_ppanzziri/',
  },
];
const FIXED_YOUTUBE_EMBED_URL =
  'https://www.youtube.com/embed/videoseries?si=iqO0lKb1H4b5vhF2&list=PLQL7kfEcNRg1qpdAqRjF6Uumw9MKQh4D8';

function normalizeExtraLinks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      label: String(item?.label || '').trim(),
      href: String(item?.href || '').trim(),
    }))
    .filter((item) => item.label && item.href);
}

export default function QuickLinksCard({ social }) {
  const extraLinks = normalizeExtraLinks(social?.extra_links ?? social?.extraLinks);
  const renderProfileLabel = (label) => {
    const parts = String(label || '').split('_');
    if (parts.length <= 1) return label;
    return parts.map((part, idx) => (
      <span key={`${label}-${idx}`}>
        {idx > 0 ? '_' : ''}
        {part}
        {idx < parts.length - 1 ? <wbr /> : null}
      </span>
    ));
  };

  return (
    <section className="card social-row-card">
      <div className="social-row">
        <div className="embed-wrap video social-youtube">
          <iframe
            title="유튜브 영상 시리즈"
            src={FIXED_YOUTUBE_EMBED_URL}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        <section className="social-instagram-profiles">
          {INSTAGRAM_PROFILES.map((profile) => (
            <a
              key={profile.href}
              className="instagram-profile-link"
              href={profile.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              <svg className="social-logo-mark instagram" viewBox="0 0 24 24" aria-hidden="true">
                <defs>
                  <linearGradient id={`igLogoGradient-${profile.label}`} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f58529" />
                    <stop offset="35%" stopColor="#dd2a7b" />
                    <stop offset="70%" stopColor="#8134af" />
                    <stop offset="100%" stopColor="#515bd4" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="6" fill={`url(#igLogoGradient-${profile.label})`} />
                <circle cx="12" cy="12" r="4.3" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
                <circle cx="17.3" cy="6.8" r="1.2" fill="#FFFFFF" />
              </svg>
              <span className="instagram-profile-meta">
                <span className="instagram-profile-name">{renderProfileLabel(profile.label)}</span>
                {profile.description ? <span className="instagram-profile-desc">{profile.description}</span> : null}
              </span>
            </a>
          ))}
        </section>
      </div>

      {extraLinks.length > 0 && (
        <div className="extra-links">
          {extraLinks.map((link) => (
            <a key={`${link.label}-${link.href}`} className="extra-link" href={link.href} target="_blank" rel="noreferrer noopener">
              {link.label}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
