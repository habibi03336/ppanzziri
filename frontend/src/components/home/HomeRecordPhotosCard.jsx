import { useState } from 'react';
import { fmtDateKR } from '../../utils/format.js';
import ImageCarousel from '../common/ImageCarousel.jsx';

export default function HomeRecordPhotosCard({ photos }) {
  const list = Array.isArray(photos) ? photos : [];
  const [viewer, setViewer] = useState(null);
  const activeItem = viewer ? list[viewer.index] : null;

  return (
    <section className="card home-record-photos-card">
      {list.length === 0 ? (
        <div className="proof-box">기록 사진 없음</div>
      ) : (
        <div className="record-photo-strip home-record-photo-strip" aria-label="기록 사진 목록">
          {list.map((item, index) => (
            <a
              key={`home-photo-${item.id}`}
              className="record-photo-thumb"
              href={item.photo_url}
              aria-label={`${fmtDateKR(item.transaction_date)} 기록 사진 보기`}
              onClick={(e) => {
                e.preventDefault();
                setViewer({ index });
              }}
            >
              <img src={item.photo_url} alt={`${fmtDateKR(item.transaction_date)} 기록 사진`} />
            </a>
          ))}
        </div>
      )}

      {viewer && (
        <div
          className="record-photo-modal"
          role="dialog"
          aria-modal="true"
          aria-label="기록 사진 크게 보기"
          onClick={() => setViewer(null)}
        >
          <div className="record-photo-modal-content home-photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="record-photo-modal-close"
              aria-label="닫기"
              onClick={() => setViewer(null)}
            >
              ×
            </button>
            <ImageCarousel
              images={list.map((item) => item.photo_url)}
              initialIndex={viewer.index}
              className="record-modal-carousel home-record-modal-carousel"
              showDots={false}
              showCount
              countClassName="record-photo-modal-count"
              fit="contain"
              onIndexChange={(nextIndex) => setViewer((prev) => (prev ? { ...prev, index: nextIndex } : prev))}
              getAlt={(activeIndex) => `${fmtDateKR(list[activeIndex]?.transaction_date)} 기록 사진 미리보기`}
            />
            {activeItem && (
              <div className="home-photo-meta">
                <div className="home-photo-meta-row">
                  <span className="home-photo-meta-label">사용 날짜</span>
                  <span className="home-photo-meta-value">{fmtDateKR(activeItem.transaction_date)}</span>
                </div>
                <div className="home-photo-meta-row">
                  <span className="home-photo-meta-label">태그</span>
                  <span className="home-photo-meta-value">{(activeItem.tags || []).join(' · ') || '-'}</span>
                </div>
                <div className="home-photo-meta-row">
                  <span className="home-photo-meta-label">메모</span>
                  <span className="home-photo-meta-value">{activeItem.memo || '-'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
