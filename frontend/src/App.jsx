import { useState } from 'react';
import AppShell from './components/layout/AppShell.jsx';
import TopBar from './components/layout/TopBar.jsx';
import TabBar from './components/layout/TabBar.jsx';
import HomePage from './pages/HomePage.jsx';
import RecordsPage from './pages/RecordsPage.jsx';
import ProofPage from './pages/ProofPage.jsx';
import useDashboardData from './hooks/useDashboardData.js';
import useDashboardQuery from './hooks/useDashboardQuery.js';
import { dashboardRepository } from './services/dashboardRepository.js';
import { fmtDateKRFull } from './utils/format.js';
import './styles/app-shell.css';

const EMPTY_DASHBOARD = {
  startCapital: 0,
  records: [],
  certifications: [],
};

export default function App() {
  const [tab, setTab] = useState('home');
  const { data, loading, error, reload } = useDashboardQuery(dashboardRepository);
  const source = data || EMPTY_DASHBOARD;
  const dashboard = useDashboardData(source.records, source.certifications, source.startCapital);

  return (
    <AppShell
      topBar={<TopBar asOf={loading || error ? '—' : fmtDateKRFull(dashboard.asOfDate)} />}
      tabBar={<TabBar activeTab={tab} onChange={setTab} />}
    >
      {loading && (
        <section className="screen active">
          <section className="card"><p className="muted">대시보드 데이터를 불러오는 중...</p></section>
        </section>
      )}

      {!loading && error && (
        <section className="screen active">
          <section className="card">
            <p className="muted">데이터를 불러오지 못했습니다.</p>
            <button type="button" className="segbtn" onClick={reload}>다시 시도</button>
          </section>
        </section>
      )}

      {!loading && !error && tab === 'home' && <HomePage dashboard={dashboard} onNavigate={setTab} />}
      {!loading && !error && tab === 'records' && <RecordsPage groupedRecords={dashboard.groupedRecords} />}
      {!loading && !error && tab === 'proof' && <ProofPage certifications={dashboard.certifications} />}
    </AppShell>
  );
}
