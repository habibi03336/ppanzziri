import { useMemo, useState } from 'react';
import { fmtDateKR, fmtKRW } from '../../utils/format.js';
import ImageCarousel from '../common/ImageCarousel.jsx';

function DayDetailModal({ group, onClose }) {
  const [photoViewer, setPhotoViewer] = useState(null);
  const expenses = group.items.filter((item) => item.type === 'expense');
  const photoItems = group.items
    .filter((item) => item.photo_url)
    .sort((a, b) => Number(a.id) - Number(b.id));

  return (
    <div
      className="record-photo-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${fmtDateKR(group.date)} 소비 내역`}
      onClick={onClose}
    >
      <div className="record-photo-modal-content day-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="record-photo-modal-close"
          aria-label="닫기"
          onClick={onClose}
        >
          ×
        </button>

        <div className="day-detail-header">
          <span className="summary-date">{fmtDateKR(group.date)}</span>
          <span className="summary-meta">
            {fmtKRW(expenses.reduce((s, x) => s + x.amount, 0))} · {expenses.length}건
          </span>
        </div>

        <div className="day-detail-list">
          {expenses.map((item) => (
            <div key={item.id} className="record-row compact">
              <div className="record-left">
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
                  {fmtKRW(item.amount).replace('₩', '₩ ')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {photoItems.length > 0 && (
          <div className="record-photo-strip" aria-label="해당 날짜 첨부 이미지 목록">
            {photoItems.map((item, photoIndex) => (
              <a
                key={`photo-${item.id}`}
                className="record-photo-thumb"
                href={item.photo_url}
                aria-label={`${item.memo || '기록'} 사진 보기`}
                onClick={(e) => {
                  e.preventDefault();
                  setPhotoViewer({
                    photos: photoItems.map((photo) => photo.photo_url),
                    index: photoIndex,
                  });
                }}
              >
                <img src={item.photo_url_resized} alt={`${fmtDateKR(item.transaction_date)} 기록 사진`} />
              </a>
            ))}
          </div>
        )}

        {photoViewer && (
          <div
            className="record-photo-modal nested"
            role="dialog"
            aria-modal="true"
            aria-label="기록 사진 크게 보기"
            onClick={() => setPhotoViewer(null)}
          >
            <div className="record-photo-modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="record-photo-modal-close"
                aria-label="닫기"
                onClick={() => setPhotoViewer(null)}
              >
                ×
              </button>
              <ImageCarousel
                images={photoViewer.photos}
                initialIndex={photoViewer.index || 0}
                className="record-modal-carousel"
                showDots={false}
                showCount
                countClassName="record-photo-modal-count"
                fit="contain"
                getAlt={() => `${fmtDateKR(group.date)} 기록 사진 미리보기`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecentRecordsCard({ groupedRecords }) {
  const [selectedDate, setSelectedDate] = useState(null);

  const top3Days = useMemo(
    () =>
      (groupedRecords || [])
        .map((group) => {
          const items = (Array.isArray(group.items) ? group.items : []).filter((item) => item.type === 'expense');
          if (items.length === 0) return null;

          const memos = items.map((x) => x.memo).filter(Boolean);
          const tags = [...new Set(items.flatMap((x) => (x.tags || []).map((t) => t.name)).filter(Boolean))];
          const total = items.reduce((sum, x) => sum + x.amount, 0);
          return { date: group.date, memos, tags, total };
        })
        .filter(Boolean)
        .slice(0, 5),
    [groupedRecords]
  );

  const selectedGroup = selectedDate
    ? (groupedRecords || []).find((g) => g.date === selectedDate)
    : null;

  return (
    <section className="card action-card">
      <div className="card-header">
        <h2>최근 소비</h2>
      </div>
      <div className="recent-day-list">
        {top3Days.length === 0 && (
          <div className="recent-day-row">
            <span className="recent-col memo">표시할 최근 소비 기록이 없습니다.</span>
          </div>
        )}
        {top3Days.map((day) => (
          <div
            key={day.date}
            className="recent-day-row clickable"
            onClick={() => setSelectedDate(day.date)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedDate(day.date); }}
          >
            <span className="recent-col date">{fmtDateKR(day.date)}</span>
            <span className="recent-col memo">{day.memos.join(' · ') || '-'}</span>
            <span className="recent-col tags">{day.tags.join(' · ') || '-'}</span>
            <strong className="recent-col delta expense">
              -{fmtKRW(day.total).replace('₩', '₩ ')}
            </strong>
          </div>
        ))}
      </div>

      {selectedGroup && (
        <DayDetailModal group={selectedGroup} onClose={() => setSelectedDate(null)} />
      )}
    </section>
  );
}
