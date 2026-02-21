import { fmtDateKR, fmtKRW } from '../../utils/format.js';

export default function RecentRecordsCard({ recent7, onGoRecords }) {
  const top = recent7.slice(0, 3);

  return (
    <section className="card action-card">
      <div className="card-header">
        <h2>최근 기록</h2>
        <span className="muted">최근 7일</span>
      </div>
      <div className="list">
        {top.map((r) => (
          <div key={r.id} className="list-row">
            <span>{fmtDateKR(r.transaction_date)} · {r.memo}</span>
            <strong>{r.type === 'expense' ? '-' : '+'}{fmtKRW(r.amount).replace('₩', '₩ ')}</strong>
          </div>
        ))}
      </div>
      <button type="button" className="linkish" onClick={onGoRecords}>전체 기록 보기</button>
    </section>
  );
}
