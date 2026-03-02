import { fmtKRW } from '../../utils/format.js';

function fmtPct(pct) {
  if (pct === null || Number.isNaN(pct)) return '-';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function changeClass(amount) {
  if (amount > 0) return 'up';
  if (amount < 0) return 'down';
  return 'flat';
}

function changeArrow(amount) {
  if (amount > 0) return '▲';
  if (amount < 0) return '▼';
  return '→';
}

export default function HeroBalanceCard({ currentBalance, dayChange, monthChange }) {
  return (
    <section className="card">
      <div className="balance-row">
        <div>
          <p className="eyebrow">현재 잔액</p>
          <p className="balance">{fmtKRW(currentBalance)}</p>
        </div>
        <div className="balance-changes">
          <div className={`balance-change ${changeClass(dayChange?.amount || 0)}`}>
            <span className="label">전일 대비</span>
            <span className="value">{changeArrow(dayChange?.amount || 0)} {fmtKRW(dayChange?.amount || 0)} · {fmtPct(dayChange?.pct ?? null)}</span>
          </div>
          <div className={`balance-change ${changeClass(monthChange?.amount || 0)}`}>
            <span className="label">전달 대비</span>
            <span className="value">{changeArrow(monthChange?.amount || 0)} {fmtKRW(monthChange?.amount || 0)} · {fmtPct(monthChange?.pct ?? null)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
