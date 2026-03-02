import { useState } from 'react';
import { fmtDateKR, fmtKRW } from '../utils/format.js';

export default function RecordsPage({ groupedRecords }) {
  const [modalImage, setModalImage] = useState('');

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
                <span className="summary-meta">
                  수입 {fmtKRW(group.items.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0))}
                </span>
              </div>
              <div className="summary-meta">{group.items.length}건</div>
            </summary>

            {group.items.map((item) => (
              <div key={item.id} className="record-row compact">
                <div className="record-left">
                  <div className={`badge ${item.type}`}>{item.type === 'expense' ? '지출' : '수입'}</div>
                  <div className="record-inline-text">
                    <span className="record-memo">{item.memo || ''}</span>
                    {(item.tags || []).length > 0 && (
                      <span className="tiny record-tags-inline">
                        {(item.tags || []).map((tag) => tag.name).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="record-right compact">
                  <div className={`amount ${item.type}`}>
                    {item.type === 'expense' ? '-' : '+'}
                    {fmtKRW(item.amount).replace('₩', '₩ ')}
                  </div>
                </div>
              </div>
            ))}
            {group.items.some((item) => item.photo_url) && (
              <div className="record-photo-strip" aria-label="해당 날짜 첨부 이미지 목록">
                {group.items
                  .filter((item) => item.photo_url)
                  .map((item) => (
                    <a
                      key={`photo-${item.id}`}
                      className="record-photo-thumb"
                      href={item.photo_url}
                      aria-label={`${item.memo || '기록'} 사진 보기`}
                      onClick={(e) => {
                        e.preventDefault();
                        setModalImage(item.photo_url);
                      }}
                    >
                      <img src={item.photo_url} alt={`${fmtDateKR(item.transaction_date)} 기록 사진`} />
                    </a>
                  ))}
              </div>
            )}
          </details>
        ))}
        {groupedRecords.length === 0 && (
          <section className="card">
            <p className="muted">기록이 없습니다.</p>
          </section>
        )}

        {modalImage && (
          <div
            className="record-photo-modal"
            role="dialog"
            aria-modal="true"
            aria-label="기록 사진 크게 보기"
            onClick={() => setModalImage('')}
          >
            <div className="record-photo-modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="record-photo-modal-close"
                aria-label="닫기"
                onClick={() => setModalImage('')}
              >
                ×
              </button>
              <img src={modalImage} alt="기록 사진 미리보기" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
