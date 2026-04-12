import { useEffect, useState } from 'react';
import { fmtDateKR, fmtKRW } from '../utils/format.js';
import ImageCarousel from '../components/common/ImageCarousel.jsx';

export default function RecordsPage({ groupedRecords }) {
  const [modalViewer, setModalViewer] = useState(null);

  const closeViewer = () => {
    setModalViewer(null);
  };

  useEffect(() => {
    const screen = document.getElementById('screen-records');
    const scroller = screen?.closest('.content');
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <section className="screen active" id="screen-records">
      <div className="stack-page">
        {groupedRecords.map((group) => (
          <details className="record-day" key={group.date}>
            <summary>
              <div className="summary-inline">
                <span className="summary-date">{fmtDateKR(group.date)}</span>
                <span className="summary-meta">
                  지출 {fmtKRW(group.items.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0))}
                </span>
              </div>
              <div className="summary-meta">{group.items.length}건</div>
            </summary>

            {group.items.map((item) => (
              <div key={item.id} className="record-row compact">
                <div className="record-left">
                  <div className="badge expense">지출</div>
                  <div className="record-inline-text">
                    {(item.tags || []).length > 0 && (
                      <span className="tiny record-tags-inline">
                        {(item.tags || []).map((tag) => tag.name).join(' · ')}
                      </span>
                    )}
                    <span className="record-memo">{item.memo || ''}</span>
                  </div>
                </div>
                <div className="record-right compact">
                  <div className="amount expense">
                    -{fmtKRW(item.amount).replace('₩', '₩ ')}
                  </div>
                </div>
              </div>
            ))}
            {(() => {
              const photoItems = group.items
                .filter((item) => item.photo_url)
                .sort((a, b) => Number(a.id) - Number(b.id));

              if (photoItems.length === 0) return null;

              return (
                <div className="record-photo-strip" aria-label="해당 날짜 첨부 이미지 목록">
                  {photoItems.map((item, photoIndex) => (
                    <a
                      key={`photo-${item.id}`}
                      className="record-photo-thumb"
                      href={item.photo_url}
                      aria-label={`${item.memo || '기록'} 사진 보기`}
                      onClick={(e) => {
                        e.preventDefault();
                        setModalViewer({
                          date: group.date,
                          photos: photoItems.map((photo) => photo.photo_url),
                          index: photoIndex,
                        });
                      }}
                    >
                      <img src={item.photo_url_resized} alt={`${fmtDateKR(item.transaction_date)} 기록 사진`} />
                    </a>
                  ))}
                </div>
              );
            })()}
          </details>
        ))}
        {groupedRecords.length === 0 && (
          <section className="card">
            <p className="muted">기록이 없습니다.</p>
          </section>
        )}

        {modalViewer && (
          <div
            className="record-photo-modal"
            role="dialog"
            aria-modal="true"
            aria-label="기록 사진 크게 보기"
            onClick={closeViewer}
          >
            <div className="record-photo-modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="record-photo-modal-close"
                aria-label="닫기"
                onClick={closeViewer}
              >
                ×
              </button>
              <ImageCarousel
                images={modalViewer.photos}
                initialIndex={modalViewer.index || 0}
                className="record-modal-carousel"
                showDots={false}
                showCount
                countClassName="record-photo-modal-count"
                fit="contain"
                getAlt={() => `${fmtDateKR(modalViewer.date)} 기록 사진 미리보기`}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
