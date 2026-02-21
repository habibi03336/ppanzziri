import { fmtKRW } from '../../utils/format.js';

export default function HeroBalanceCard({ currentBalance, startCapital, totalIncome, totalExpense, topTags }) {
  const pct = ((currentBalance / startCapital) * 100).toFixed(1);

  return (
    <section className="card">
      <p className="eyebrow">현재 잔액</p>
      <p className="balance">{fmtKRW(currentBalance)}</p>
      <p className="muted">3000만원 대비 {pct}%</p>
      <div className="hero-kpis">
        <div>
          <p className="eyebrow">누적 수입</p>
          <p className="kpi">{fmtKRW(totalIncome)}</p>
        </div>
        <div>
          <p className="eyebrow">누적 지출</p>
          <p className="kpi">{fmtKRW(totalExpense)}</p>
        </div>
      </div>
      <div className="chips">
        {topTags.map((tag) => (
          <span key={tag.name} className="chip">{tag.name} {tag.pct}%</span>
        ))}
      </div>
    </section>
  );
}
