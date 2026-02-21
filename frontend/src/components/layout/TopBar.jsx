export default function TopBar({ asOf }) {
  return (
    <header className="topbar">
      <h1 className="topbar-title">
        <span className="title-line1">초기자금 3000만원으로</span>
        <span className="title-line2">평생 뺀질거리기 챌린지</span>
      </h1>
      <p className="topbar-date">{asOf}</p>
    </header>
  );
}
