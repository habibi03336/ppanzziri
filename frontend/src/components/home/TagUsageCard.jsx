import { fmtKRW } from '../../utils/format.js';

const COLORS = ['#111111', '#1f3a8a', '#c4002f', '#d48fa3', '#444444'];

export default function TagUsageCard({ tagItems }) {
  const total = tagItems.reduce((s, item) => s + item.value, 0) || 1;

  return (
    <section className="card">
      <div className="card-header">
        <h2>어디에 쓰고 있나</h2>
        <span className="muted">최근 30일</span>
      </div>
      <div className="bar">
        {tagItems.slice(0, 5).map((item, idx) => (
          <span
            key={item.name}
            style={{ width: `${(item.value / total) * 100}%`, background: COLORS[idx % COLORS.length] }}
          />
        ))}
      </div>
      <div className="legend">
        {tagItems.slice(0, 5).map((item, idx) => (
          <div key={item.name} className="legend-item">
            <span><i style={{ background: COLORS[idx % COLORS.length] }} />{item.name}</span>
            <span>{Math.round((item.value / total) * 100)}% · {fmtKRW(item.value)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
