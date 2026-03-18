import { useEffect, useMemo, useRef, useState } from 'react';

export default function ImageCarousel({
  images,
  initialIndex = 0,
  className = '',
  fit = 'contain',
  showDots = true,
  showCount = false,
  countClassName = '',
  onIndexChange,
  getAlt,
}) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const loopEnabled = list.length > 1;
  const [index, setIndex] = useState(loopEnabled ? initialIndex + 1 : initialIndex);
  const [animate, setAnimate] = useState(true);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const slides = useMemo(() => {
    if (!list.length) return [];
    if (!loopEnabled) return list;
    return [list[list.length - 1], ...list, list[0]];
  }, [list, loopEnabled]);

  useEffect(() => {
    const safeInitial = Math.min(Math.max(initialIndex, 0), Math.max(list.length - 1, 0));
    setIndex(loopEnabled ? safeInitial + 1 : safeInitial);
    setAnimate(true);
  }, [initialIndex, loopEnabled, list.length]);

  const activeIndex = list.length
    ? (loopEnabled ? ((index - 1 + list.length) % list.length) : ((index % list.length) + list.length) % list.length)
    : 0;

  useEffect(() => {
    if (!list.length || typeof onIndexChange !== 'function') return;
    onIndexChange(activeIndex);
  }, [activeIndex, list.length, onIndexChange]);

  const showPrev = () => {
    if (!list.length) return;
    setAnimate(true);
    setIndex((prev) => prev - 1);
  };
  const showNext = () => {
    if (!list.length) return;
    setAnimate(true);
    setIndex((prev) => prev + 1);
  };

  const handleTransitionEnd = () => {
    if (!loopEnabled) return;
    if (index === 0) {
      setAnimate(false);
      setIndex(list.length);
      return;
    }
    if (index === list.length + 1) {
      setAnimate(false);
      setIndex(1);
    }
  };

  useEffect(() => {
    if (animate) return undefined;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  const handleTouchStart = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };
  const handleTouchEnd = (e) => {
    if (!loopEnabled) return;
    const touch = e.changedTouches?.[0];
    if (!touch || touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (absX < 40 || absX <= absY) return;
    if (deltaX < 0) showNext();
    else showPrev();
  };

  if (!list.length) return null;

  return (
    <div className={`shared-carousel ${className}`.trim()}>
      {loopEnabled && (
        <button type="button" className="shared-carousel-nav prev" aria-label="이전 이미지" onClick={showPrev}>
          ‹
        </button>
      )}

      <div className="shared-carousel-viewport" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div
          className="shared-carousel-track"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: animate ? 'transform 320ms ease' : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {slides.map((src, idx) => (
            <div className="shared-carousel-slide" key={`${src}-${idx}`}>
              <img
                className={`shared-carousel-image ${fit === 'cover' ? 'cover' : 'contain'}`}
                src={src}
                alt={typeof getAlt === 'function' ? getAlt(activeIndex, idx) : `이미지 ${activeIndex + 1}`}
                loading={Math.abs(idx - index) <= 1 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={Math.abs(idx - index) <= 1 ? 'high' : 'low'}
              />
            </div>
          ))}
        </div>
      </div>

      {loopEnabled && (
        <button type="button" className="shared-carousel-nav next" aria-label="다음 이미지" onClick={showNext}>
          ›
        </button>
      )}

      {showDots && list.length > 1 && (
        <div className="shared-carousel-dots" aria-label="이미지 인디케이터">
          {list.map((_, i) => (
            <button
              type="button"
              key={`dot-${i + 1}`}
              className={`shared-carousel-dot ${i === activeIndex ? 'active' : ''}`}
              aria-label={`${i + 1}번 이미지로 이동`}
              onClick={() => {
                setAnimate(true);
                setIndex(loopEnabled ? i + 1 : i);
              }}
            />
          ))}
        </div>
      )}

      {showCount && list.length > 1 && (
        <div className={`shared-carousel-count ${countClassName}`.trim()}>
          {activeIndex + 1} / {list.length}
        </div>
      )}
    </div>
  );
}
