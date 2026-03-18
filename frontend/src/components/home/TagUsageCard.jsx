import { fmtKRW } from '../../utils/format.js';
import { useEffect, useMemo, useState } from 'react';

const COLORS = ['#111111', '#1f3a8a', '#c4002f', '#d48fa3', '#444444'];

export default function TagUsageCard({ tagItems }) {
  const [isMediumUp, setIsMediumUp] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = (e) => setIsMediumUp(e.matches);
    setIsMediumUp(mql.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  const visibleItems = useMemo(() => (isMediumUp ? tagItems : tagItems.slice(0, 5)), [isMediumUp, tagItems]);
  const total = tagItems.reduce((s, item) => s + item.value, 0) || 1;

  return (
    <section className="card">
      <div className="card-header">
        <h2>어디에 쓰고 있나</h2>
        <span className="muted">최근 30일 · 효용기준 · 총합 {fmtKRW(total)}</span>
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
