import { fmtDateKR, fmtKRW } from '../../utils/format.js';

export default function RecentRecordsCard({ groupedRecords, onGoRecords }) {
  const top3Days = (groupedRecords || []).slice(0, 3).map((group) => {
    const items = Array.isArray(group.items) ? group.items : [];
    const memos = items.map((x) => x.memo).filter(Boolean);
    const tags = [...new Set(items.flatMap((x) => (x.tags || []).map((t) => t.name)).filter(Boolean))];
    const delta = items.reduce((sum, x) => sum + (x.type === 'income' ? x.amount : -x.amount), 0);
    return { date: group.date, memos, tags, delta };
  });

  return (
    <section className="card action-card">
      <div className="card-header">
        <h2>최근 기록</h2>
        <span className="muted">최신 3일</span>
      </div>
      <div className="recent-day-list">
        {top3Days.length === 0 && (
          <div className="recent-day-row">
            <span className="recent-col memo">표시할 최근 기록이 없습니다.</span>
          </div>
        )}
        {top3Days.map((day) => (
          <div key={day.date} className="recent-day-row">
            <span className="recent-col date">{fmtDateKR(day.date)}</span>
            <span className="recent-col memo">{day.memos.join(' · ') || '-'}</span>
            <span className="recent-col tags">{day.tags.join(' · ') || '-'}</span>
            <strong className={`recent-col delta ${day.delta > 0 ? 'income' : day.delta < 0 ? 'expense' : 'flat'}`}>
              {day.delta > 0 ? '+' : day.delta < 0 ? '-' : ''}
              {fmtKRW(Math.abs(day.delta)).replace('₩', '₩ ')}
            </strong>
          </div>
        ))}
      </div>
      <button type="button" className="linkish" onClick={onGoRecords}>전체 기록 보기</button>
    </section>
  );
}
