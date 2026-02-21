import { useEffect, useMemo, useState } from 'react';
import { fmtDateKR } from '../utils/format.js';

export default function ProofPage({ certifications }) {
  const sorted = useMemo(
    () => [...certifications].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [certifications]
  );
  const loopEnabled = sorted.length > 1;
  const slides = loopEnabled ? [sorted[sorted.length - 1], ...sorted, sorted[0]] : sorted;
  const [index, setIndex] = useState(loopEnabled ? 1 : 0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    setIndex(loopEnabled ? 1 : 0);
    setAnimate(true);
  }, [loopEnabled, sorted.length]);

  const activeIndex = loopEnabled ? ((index - 1 + sorted.length) % sorted.length) : index;

  const handlePrev = () => {
    if (!sorted.length) return;
    setAnimate(true);
    setIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (!sorted.length) return;
    setAnimate(true);
    setIndex((prev) => prev + 1);
  };

  const handleTransitionEnd = () => {
    if (!loopEnabled) return;
    if (index === 0) {
      setAnimate(false);
      setIndex(sorted.length);
      return;
    }
    if (index === sorted.length + 1) {
      setAnimate(false);
      setIndex(1);
    }
  };

  useEffect(() => {
    if (animate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  return (
    <section className="screen active" id="screen-proof">
      <div className="stack-page">
        <section className="card proof-carousel-card">
          <div className="card-header">
            <h2>인증</h2>
            {sorted.length > 0 && <span className="muted">{fmtDateKR(sorted[activeIndex].date)}</span>}
          </div>

          {sorted.length === 0 ? (
            <div className="proof-box">인증 데이터 없음</div>
          ) : (
            <>
              <div className="carousel">
                <button type="button" className="carousel-nav prev" onClick={handlePrev} aria-label="이전 인증">
                  ‹
                </button>
                <div className="carousel-viewport">
                  <div
                    className="carousel-track"
                    style={{
                      transform: `translateX(-${index * 100}%)`,
                      transition: animate ? 'transform 320ms ease' : 'none',
                    }}
                    onTransitionEnd={handleTransitionEnd}
                  >
                    {slides.map((item, idx) => (
                      <div className="carousel-slide" key={`${item.date}-${idx}`}>
                        <div className="thumb">
                          <img src={item.photo_url} alt={`${fmtDateKR(item.date)} 잔액 인증`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" className="carousel-nav next" onClick={handleNext} aria-label="다음 인증">
                  ›
                </button>
              </div>

              <div className="carousel-dots" aria-label="인증 인디케이터">
                {sorted.map((item, i) => (
                  <button
                    type="button"
                    key={item.date}
                    className={`dot-btn ${i === activeIndex ? 'active' : ''}`}
                    aria-label={`${fmtDateKR(item.date)}로 이동`}
                    onClick={() => {
                      setAnimate(true);
                      setIndex(loopEnabled ? i + 1 : i);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
