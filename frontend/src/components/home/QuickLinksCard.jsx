const DEFAULT_INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/ppanzziri/';

function getInstagramEmbedSrc(postUrl) {
  const url = String(postUrl || '').trim();
  if (!url || !url.includes('/p/')) return '';
  try {
    const parsed = new URL(url);
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (cleanPath.endsWith('/embed')) return `${parsed.origin}${cleanPath}`;
    return `${parsed.origin}${cleanPath}/embed`;
  } catch {
    return '';
  }
}

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
  const youtubeEmbedUrl = String(social?.youtube_embed_url || social?.youtubeEmbedUrl || '').trim();
  const instagramPostUrl = String(social?.instagram_post_url || social?.instagramPostUrl || '').trim();
  const instagramProfileUrl = DEFAULT_INSTAGRAM_PROFILE_URL;
  const instagramEmbedSrc = getInstagramEmbedSrc(instagramPostUrl);
  const extraLinks = normalizeExtraLinks(social?.extra_links ?? social?.extraLinks);

  return (
    <section className="card social-row-card">
      <div className="social-row">
        <div className="embed-wrap video social-youtube">
          {youtubeEmbedUrl ? (
            <iframe
              title="유튜브 최신 영상"
              src={youtubeEmbedUrl}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="instagram-fallback">유튜브 링크 없음</div>
          )}
        </div>

        {instagramEmbedSrc ? (
          <div className="embed-wrap post social-instagram">
            <a
              className="social-logo-link instagram"
              href={instagramProfileUrl}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="인스타그램 프로필 바로가기"
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
            </a>
            <iframe
              title="인스타 최신 게시물"
              src={instagramEmbedSrc}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : (
          <a className="instagram-fallback social-instagram" href={instagramProfileUrl} target="_blank" rel="noreferrer noopener">
            최신 게시물 보기
          </a>
        )}
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
