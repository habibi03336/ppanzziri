import { START_CAPITAL, certifications, records } from '../data/mockData.js';

const ENV_API_BASE_URL = import.meta.env.VITE_DASHBOARD_API_BASE_URL || '/api';
const USE_MOCK = import.meta.env.VITE_DASHBOARD_USE_MOCK !== 'false';

export function createMockDashboardRepository() {
  return {
    async getDashboard() {
      return {
        startCapital: START_CAPITAL,
        records,
        certifications,
      };
    },
  };
}

export function createHttpDashboardRepository({ baseUrl = ENV_API_BASE_URL, fetcher = fetch } = {}) {
  return {
    async getDashboard() {
      const res = await fetcher(`${baseUrl}/dashboard`);
      if (!res.ok) {
        throw new Error(`dashboard fetch failed: ${res.status}`);
      }
      return res.json();
    },
  };
}

export const dashboardRepository = USE_MOCK
  ? createMockDashboardRepository()
  : createHttpDashboardRepository({ baseUrl: ENV_API_BASE_URL });
