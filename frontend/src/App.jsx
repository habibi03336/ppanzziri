import { useCallback, useEffect, useState } from 'react';
import AppShell from './components/layout/AppShell.jsx';
import FloatingTabMenu from './components/layout/FloatingTabMenu.jsx';
import HomePage from './pages/HomePage.jsx';
import RecordsPage from './pages/RecordsPage.jsx';
import useDashboardData from './hooks/useDashboardData.js';
import useDashboardQuery from './hooks/useDashboardQuery.js';
import { dashboardRepository } from './services/dashboardRepository.js';
import './styles/app-shell.css';

const EMPTY_DASHBOARD = {
  startCapital: 0,
  records: [],
  certifications: [],
  social: {
    youtube_embed_url: '',
    instagram_post_url: '',
    instagram_profile_url: '',
    extra_links: [],
  },
};
const VALID_TABS = new Set(['home', 'records']);

function normalizeTab(value) {
  const next = String(value || '').toLowerCase();
  return VALID_TABS.has(next) ? next : 'home';
}

function getTabFromLocation() {
  if (typeof window === 'undefined') return 'home';
  const params = new URLSearchParams(window.location.search);
  return normalizeTab(params.get('tab'));
}

function buildUrlWithTab(tab) {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  if (tab === 'home') {
    url.searchParams.delete('tab');
  } else {
    url.searchParams.set('tab', tab);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function App() {
  const [tab, setTab] = useState(() => getTabFromLocation());
  const { data, loading, error, reload } = useDashboardQuery(dashboardRepository);
  const source = data || EMPTY_DASHBOARD;
  const dashboard = useDashboardData(source.records, source.certifications, source.startCapital, source.social);
  const handleTabChange = useCallback((nextTab, { push = true } = {}) => {
    const normalized = normalizeTab(nextTab);
    setTab((prev) => {
      if (prev === normalized) return prev;
      if (typeof window !== 'undefined' && push) {
        window.history.pushState({ tab: normalized }, '', buildUrlWithTab(normalized));
      }
      return normalized;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const initial = getTabFromLocation();
    setTab(initial);
    window.history.replaceState({ tab: initial }, '', buildUrlWithTab(initial));

    const onPopState = (event) => {
      const fromState = normalizeTab(event?.state?.tab);
      const fromLocation = getTabFromLocation();
      const resolved = event?.state?.tab ? fromState : fromLocation;
      handleTabChange(resolved, { push: false });
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleTabChange]);

  return (
    <AppShell
      floatingNav={<FloatingTabMenu activeTab={tab} onChange={handleTabChange} />}
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

      {!loading && !error && tab === 'home' && <HomePage dashboard={dashboard} onNavigate={handleTabChange} />}
      {!loading && !error && tab === 'records' && <RecordsPage groupedRecords={dashboard.groupedRecords} />}
    </AppShell>
  );
}
