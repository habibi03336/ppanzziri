import { useEffect, useMemo, useState } from 'react';
import { fmtDateKRFull } from '../../utils/format.js';
import ImageCarousel from '../common/ImageCarousel.jsx';

export default function ProofCarouselCard({ certifications }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sorted = useMemo(
    () =>
      [...(certifications || [])]
        .filter((item) => item && item.date && item.photo_url)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [certifications]
  );
  useEffect(() => {
    if (!sorted.length) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex >= sorted.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, sorted.length]);
  const current = sorted[activeIndex] || sorted[0] || null;

  return (
    <section className="card proof-carousel-home-card">
      <div className="card-header">
        <h2>잔액 인증</h2>
        <span className="tiny muted">
          인증 날짜: {current ? fmtDateKRFull(current.date) : '없음'}
        </span>
      </div>
      {sorted.length === 0 ? (
        <div className="proof-box">인증 데이터 없음</div>
      ) : (
        <ImageCarousel
          images={sorted.map((item) => item.photo_url)}
          className="proof-home-carousel"
          fit="contain"
          showDots
          showCount={false}
          onIndexChange={setActiveIndex}
          getAlt={(index) => `${fmtDateKRFull(sorted[index]?.date || current?.date)} 잔액 인증`}
        />
      )}
    </section>
  );
}
