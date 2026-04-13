import { fmtKRW } from '../../utils/format.js';

export default function HeroBalanceCard({ totalExpense, expense7, expense30 }) {
  return (
    <section className="card">
      <div className="balance-row">
        <div>
          <p className="eyebrow">지금까지 소비한 금액 <span className="date-badge">2026.02.08 ~</span></p>
          <p className="balance">{fmtKRW(totalExpense)}</p>
        </div>
        <div className="balance-changes">
          <div className="balance-stat">
            <span className="balance-stat-label">일주일 동안</span>
            <span className="balance-stat-value">{fmtKRW(expense7)}</span>
          </div>
          <div className="balance-stat">
            <span className="balance-stat-label">한달 동안</span>
            <span className="balance-stat-value">{fmtKRW(expense30)}</span>
          </div>
          <p className="muted">소비했습니다.</p>
        </div>
      </div>
    </section>
  );
}
