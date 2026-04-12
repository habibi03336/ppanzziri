import QuickLinksCard from '../components/home/QuickLinksCard.jsx';
import HeroBalanceCard from '../components/home/HeroBalanceCard.jsx';
import SurvivalCurveCard from '../components/home/SurvivalCurveCard.jsx';
import TagUsageCard from '../components/home/TagUsageCard.jsx';
import DailyCostCard from '../components/home/DailyCostCard.jsx';
import RecentRecordsCard from '../components/home/RecentRecordsCard.jsx';
import HomeRecordPhotosCard from '../components/home/HomeRecordPhotosCard.jsx';

export default function HomePage({ dashboard, onNavigate }) {
  return (
    <section className="screen active" id="screen-home">
      <div className="home-grid">
        <div className="area-links"><QuickLinksCard social={dashboard.social} /></div>
        <div className="area-hero"><HeroBalanceCard totalExpense={dashboard.totalExpense} /></div>
        <div className="area-hero-photos"><HomeRecordPhotosCard photos={dashboard.recordPhotos} /></div>
        <div className="area-curve"><SurvivalCurveCard expenseSeries={dashboard.expenseSeries} start30={dashboard.start30} startCapital={dashboard.START_CAPITAL} /></div>
        <div className="area-tags"><TagUsageCard tagItems={dashboard.tagItems} /></div>
        <div className="area-daily"><DailyCostCard daysToGoal={dashboard.daysToGoal} avg90={dashboard.avg90} /></div>
        <div className="area-records"><RecentRecordsCard groupedRecords={dashboard.groupedRecords} onGoRecords={() => onNavigate('records')} /></div>
      </div>
    </section>
  );
}
