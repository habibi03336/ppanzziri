const ENV_API_BASE_URL = import.meta.env.VITE_DASHBOARD_API_BASE_URL || '/api';
const USE_MOCK = import.meta.env.VITE_DASHBOARD_USE_MOCK !== 'false';

function parseArrayLike(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeDayEntry(raw) {
  return {
    date: String(raw?.date || ''),
    char_count: Number(raw?.char_count ?? 0),
    submission_count: Number(raw?.submission_count ?? 0),
    keywords: parseArrayLike(raw?.keywords).map(String).filter(Boolean),
  };
}

function normalizeWritingDashboardPayload(raw) {
  const normalized = raw || {};
  return {
    daily: parseArrayLike(normalized.daily).map(normalizeDayEntry).filter((d) => d.date),
  };
}

function buildMockDaily() {
  const today = new Date();
  const daily = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const active = Math.random() > 0.45;
    if (active) {
      const charCount = Math.floor(Math.random() * 3000) + 200;
      const submissionCount = Math.floor(Math.random() * 4) + 1;
      const allKeywords = ['글쓰기', '독서', '집중', '아이디어', '창작', '분석', '리뷰', '일기', '메모', '학습'];
      const picked = allKeywords.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 2);
      daily.push({ date: dateStr, char_count: charCount, submission_count: submissionCount, keywords: picked });
    }
  }
  return daily;
}

export function createMockWritingDashboardRepository() {
  return {
    async getWritingDashboard() {
      return { daily: buildMockDaily() };
    },
  };
}

export function createHttpWritingDashboardRepository({ baseUrl = ENV_API_BASE_URL, fetcher = fetch } = {}) {
  return {
    async getWritingDashboard({ from, to } = {}) {
      const url = new URL(`${baseUrl}/ppanzziri/writing/dashboard`, window.location.origin);
      if (from) url.searchParams.set('from', from);
      if (to) url.searchParams.set('to', to);
      const res = await fetcher(url.toString());
      if (!res.ok) {
        throw new Error(`writing dashboard fetch failed: ${res.status}`);
      }
      const json = await res.json();
      return normalizeWritingDashboardPayload(json);
    },
  };
}

export const writingDashboardRepository = USE_MOCK
  ? createMockWritingDashboardRepository()
  : createHttpWritingDashboardRepository({ baseUrl: ENV_API_BASE_URL });
