import { fmtKRW } from '../../utils/format.js';

export default function DailyCostCard({ avgAll, avg30, runwayDays }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>하루 비용</h2>
      </div>
      <div className="two-col">
        <div><p className="eyebrow">전체 평균</p><p className="kpi">{fmtKRW(avgAll)}</p></div>
        <div><p className="eyebrow">최근 30일</p><p className="kpi">{fmtKRW(avg30)}</p></div>
      </div>
      <p className="note">
        {runwayDays === null
          ? '최근 30일 지출 데이터가 부족합니다.'
          : `현재 속도라면 ${runwayDays}일 후 생활 유지가 어려워질 수 있습니다.`}
      </p>
    </section>
  );
}
