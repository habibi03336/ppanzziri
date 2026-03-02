import { useState } from 'react';
import { fmtKRW } from '../../utils/format.js';

const CHALLENGE_START_DATE = '2026-02-08';

function parseISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function getCurrentChallengeDay() {
  const ms = 24 * 60 * 60 * 1000;
  const today = new Date();
  const start = parseISODate(CHALLENGE_START_DATE);
  const diff = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - start) / ms) + 1;
  return Math.max(1, diff);
}

export default function DailyCostCard({ runwayDays, avg90 }) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const currentDay = getCurrentChallengeDay();
  const avg90Label = Number.isFinite(Number(avg90)) ? fmtKRW(Number(avg90)) : '-';
  const runwayMonths = runwayDays === null ? null : Math.floor(Number(runwayDays) / 30);

  return (
    <section className="card">
      <p className="daily-hook">
        <span>
          {runwayDays === null ? (
            <>
              <span className="daily-hook-line">
                현재 <span className="daily-hook-current-day">{currentDay}일차</span> 뺀질이 생활 중,
              </span>
              <span className="daily-hook-line">이 속도를 계산하기 위한 데이터가 부족합니다.</span>
            </>
          ) : (
            <>
              <span className="daily-hook-line">
                현재 <span className="daily-hook-current-day">{currentDay}일차</span> 뺀질이 생활 중,
              </span>
              <span className="daily-hook-line">
                <span className="daily-hook-days">{runwayMonths}개월 후</span> 뺀질이 생활이 종료됩니다.
              </span>
            </>
          )}
        </span>
        <button
          type="button"
          className="daily-info-btn"
          aria-label="하루비용 계산 기준 보기"
          onClick={() => setShowInfoModal(true)}
        >
          ?
        </button>
      </p>
      {showInfoModal && (
        <div
          className="daily-info-modal"
          role="dialog"
          aria-modal="true"
          aria-label="하루비용 계산 기준"
          onClick={() => setShowInfoModal(false)}
        >
          <div className="daily-info-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="daily-info-modal-close"
              aria-label="닫기"
              onClick={() => setShowInfoModal(false)}
            >
              ×
            </button>
            <p className="daily-info-note">
              <strong className="daily-info-head">현재 자금을 하루 평균 사용금액으로 나누어 산출합니다.</strong>
              <br />
              <span>
                - 하루 평균 사용금액은 최근 90일 기준:
                <strong className="daily-info-value"> {avg90Label}</strong>
              </span>
              <br />
              <span>- 결제일이 아닌 효용 발생 시점 기준으로 계산합니다.</span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
