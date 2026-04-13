const SOCIAL_PROFILES = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/ppanzziri_red/',
    brand: 'instagram',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/%EC%A7%80%ED%9B%88-%ED%95%98-987891223/',
    brand: 'linkedin',
  },
];
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

  return (
    <section className="card social-row-card">
      <div className="social-row">
        <div className="social-instagram-profiles">
            {SOCIAL_PROFILES.map((profile) => (
              <a
                key={profile.href}
                className="instagram-profile-link"
                href={profile.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                {profile.brand === 'instagram' ? (
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
                ) : null}
                {profile.brand === 'tiktok' ? (
                  <svg className="social-logo-mark" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="6" fill="#111111" />
                    <path
                      d="M14.7 5.1c.6 1.5 1.8 2.7 3.3 3.2v2.3a5.8 5.8 0 0 1-3.2-1v4.7a4.8 4.8 0 1 1-4.8-4.8c.2 0 .5 0 .7.1v2.5a2.3 2.3 0 1 0 1.6 2.2V5.1h2.4Z"
                      fill="#25F4EE"
                    />
                    <path
                      d="M15.3 4.5c.6 1.5 1.8 2.7 3.2 3.3v2.1a5.4 5.4 0 0 1-3.2-1v4.8a4.8 4.8 0 1 1-4.8-4.8v2a2.7 2.7 0 1 0 2.2 2.6V4.5h2.6Z"
                      fill="#FE2C55"
                      opacity="0.92"
                    />
                    <path
                      d="M15 4c.6 1.6 1.8 2.9 3.5 3.5v1.7a6.1 6.1 0 0 1-3.5-1.1v5.2a4.2 4.2 0 1 1-4.2-4.2h.3v1.9h-.2a2.3 2.3 0 1 0 2.3 2.3V4H15Z"
                      fill="#FFFFFF"
                    />
                  </svg>
                ) : null}
              {profile.brand === 'linkedin' ? (
                <svg className="social-logo-mark" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" />
                  <rect x="6.1" y="9.4" width="2.3" height="8.2" fill="#FFFFFF" />
                  <circle cx="7.25" cy="6.95" r="1.35" fill="#FFFFFF" />
                    <path
                      d="M10.1 9.4h2.2v1.1h.03c.31-.58 1.06-1.43 2.57-1.43 2.75 0 3.27 1.81 3.27 4.17v4.31h-2.31v-3.82c0-.91-.02-2.08-1.27-2.08-1.27 0-1.46.99-1.46 2.01v3.89H10.1V9.4Z"
                      fill="#FFFFFF"
                    />
                  </svg>
                ) : null}
                {profile.brand === 'kakao' ? (
                  <svg className="social-logo-mark" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="6" fill="#FEE500" />
                    <path
                      d="M12 6.1c-3.4 0-6.2 2.2-6.2 5s2.8 5 6.2 5c.47 0 .92-.04 1.35-.13l2.9 1.89c.15.1.35-.03.31-.21l-.55-2.36c1.32-.89 2.19-2.22 2.19-3.69 0-2.8-2.78-5-6.2-5Z"
                      fill="#381E1F"
                    />
                  </svg>
                ) : null}
                <span className="instagram-profile-meta">
                  <span className="instagram-profile-name">
                    {profile.label} <span className="social-link-arrow" aria-hidden="true">↗</span>
                  </span>
                </span>
              </a>
            ))}
        </div>
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
