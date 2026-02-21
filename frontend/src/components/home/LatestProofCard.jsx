import { fmtDateKR } from '../../utils/format.js';

export default function LatestProofCard({ latestProof, onGoProof }) {
  return (
    <section className="card action-card">
      <div className="card-header">
        <h2>잔액 인증</h2>
        <span className="muted">최신 1건</span>
      </div>
      {latestProof ? (
        <div className="thumb">
          <img src={latestProof.photo_url} alt={`${fmtDateKR(latestProof.date)} 잔액 인증`} />
        </div>
      ) : (
        <div className="proof-box">인증 데이터 없음</div>
      )}
      <button type="button" className="linkish" onClick={onGoProof}>전체 인증 보기</button>
    </section>
  );
}
