import { useMemo, useState } from 'react';
import { fmtDateKR, fmtKRW } from '../../utils/format.js';

export default function RecentRecordsCard({ groupedRecords, onGoRecords }) {
  const [recordType, setRecordType] = useState('expense');
  const top3Days = useMemo(
    () =>
      (groupedRecords || [])
        .map((group) => {
          const items = (Array.isArray(group.items) ? group.items : []).filter((item) => item.type === recordType);
          if (items.length === 0) return null;

          const memos = items.map((x) => x.memo).filter(Boolean);
          const tags = [...new Set(items.flatMap((x) => (x.tags || []).map((t) => t.name)).filter(Boolean))];
          const delta = items.reduce((sum, x) => sum + (x.type === 'income' ? x.amount : -x.amount), 0);
          return { date: group.date, memos, tags, delta };
        })
        .filter(Boolean)
        .slice(0, 3),
    [groupedRecords, recordType]
  );

  return (
    <section className="card action-card">
      <div className="card-header">
        <h2>최근 기록</h2>
        <div className="segmented">
          <button type="button" className={`segbtn ${recordType === 'expense' ? 'active' : ''}`} onClick={() => setRecordType('expense')}>
            지출
          </button>
          <button type="button" className={`segbtn ${recordType === 'income' ? 'active' : ''}`} onClick={() => setRecordType('income')}>
            수입
          </button>
        </div>
      </div>
      <div className="recent-day-list">
        {top3Days.length === 0 && (
          <div className="recent-day-row">
            <span className="recent-col memo">표시할 최근 {recordType === 'expense' ? '지출' : '수입'} 기록이 없습니다.</span>
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
