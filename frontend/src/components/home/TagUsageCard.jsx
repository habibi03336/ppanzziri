import { fmtKRW } from '../../utils/format.js';

const COLORS = ['#111111', '#1f3a8a', '#6f624c', '#d48fa3', '#444444'];

export default function TagUsageCard({ tagItems }) {
  const visibleItems = tagItems;
  const total = tagItems.reduce((s, item) => s + item.value, 0) || 1;

  return (
    <section className="card">
      <div className="card-header">
        <h2>어디에 쓰고 있나</h2>
        <span className="muted tag-usage-meta">최근 30일 · 효용기준<br className="tag-usage-br" /><span className="tag-usage-dot"> · </span>총합 {fmtKRW(total)}</span>
      </div>
      <div className="bar">
        {visibleItems.map((item, idx) => (
          <span
            key={item.name}
            style={{ width: `${(item.value / total) * 100}%`, background: COLORS[idx % COLORS.length] }}
          />
        ))}
      </div>
      <div className="legend">
        {visibleItems.map((item, idx) => (
          <div key={item.name} className="legend-item">
            <span><i style={{ background: COLORS[idx % COLORS.length] }} />{item.name}</span>
            <span>{Math.round((item.value / total) * 100)}% · {fmtKRW(item.value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
