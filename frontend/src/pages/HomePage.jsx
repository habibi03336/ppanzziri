import QuickLinksCard from '../components/home/QuickLinksCard.jsx';
import HeroBalanceCard from '../components/home/HeroBalanceCard.jsx';
import SurvivalCurveCard from '../components/home/SurvivalCurveCard.jsx';
import TagUsageCard from '../components/home/TagUsageCard.jsx';
import DailyCostCard from '../components/home/DailyCostCard.jsx';
import RecentRecordsCard from '../components/home/RecentRecordsCard.jsx';
import LatestProofCard from '../components/home/LatestProofCard.jsx';

export default function HomePage({ dashboard, onNavigate }) {
  return (
    <section className="screen active" id="screen-home">
      <div className="home-grid">
        <div className="area-links"><QuickLinksCard social={dashboard.social} /></div>
        <div className="area-hero"><HeroBalanceCard currentBalance={dashboard.currentBalance} dayChange={dashboard.dayChange} monthChange={dashboard.monthChange} /></div>
        <div className="area-curve"><SurvivalCurveCard balanceSeries={dashboard.balanceSeries} start30={dashboard.start30} startCapital={dashboard.START_CAPITAL} /></div>
        <div className="area-tags"><TagUsageCard tagItems={dashboard.tagItems} /></div>
        <div className="area-daily"><DailyCostCard runwayDays={dashboard.runwayDays} avg90={dashboard.avg90} /></div>
        <div className="area-records"><RecentRecordsCard recent7={dashboard.recent7} onGoRecords={() => onNavigate('records')} /></div>
        <div className="area-proof"><LatestProofCard latestProof={dashboard.latestProof} onGoProof={() => onNavigate('proof')} /></div>
      </div>
    </section>
  );
}
