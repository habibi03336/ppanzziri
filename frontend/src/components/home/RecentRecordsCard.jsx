import { useMemo } from 'react';
import { fmtDateKR, fmtKRW } from '../../utils/format.js';

export default function RecentRecordsCard({ groupedRecords, onGoRecords }) {
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
        .slice(0, 3),
    [groupedRecords]
  );

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
          <div key={day.date} className="recent-day-row">
            <span className="recent-col date">{fmtDateKR(day.date)}</span>
            <span className="recent-col memo">{day.memos.join(' · ') || '-'}</span>
            <span className="recent-col tags">{day.tags.join(' · ') || '-'}</span>
            <strong className="recent-col delta expense">
              -{fmtKRW(day.total).replace('₩', '₩ ')}
            </strong>
          </div>
        ))}
      </div>
      <button type="button" className="linkish" onClick={onGoRecords}>전체 기록 보기</button>
    </section>
  );
}
