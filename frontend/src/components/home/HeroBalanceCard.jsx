import { fmtKRW } from '../../utils/format.js';

export default function HeroBalanceCard({ totalExpense }) {
  return (
    <section className="card">
      <div className="balance-row">
        <div>
          <p className="eyebrow">지금까지 경험한 금액</p>
          <p className="balance">{fmtKRW(totalExpense)}</p>
        </div>
        <div className="balance-changes">
          <p className="muted">지금까지 {fmtKRW(totalExpense)}을 경험했습니다.</p>
        </div>
      </div>
    </section>
  );
}
