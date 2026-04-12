import { fmtKRW } from '../../utils/format.js';

export default function HeroBalanceCard({ totalExpense, expense7, expense30 }) {
  return (
    <section className="card">
      <div className="balance-row">
        <div>
          <p className="eyebrow">지금까지 경험한 금액</p>
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
          <p className="muted">경험했습니다.</p>
        </div>
      </div>
    </section>
  );
}
