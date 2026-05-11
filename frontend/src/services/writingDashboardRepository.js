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
    char_count: Number(raw?.char_count ?? raw?.total_char_count ?? 0),
    submission_count: Number(raw?.submission_count ?? 0),
    keywords: parseArrayLike(raw?.keywords).map(String).filter(Boolean),
  };
}

function normalizeRecord(raw) {
  return {
    id: raw?.id,
    date: String(raw?.date || ''),
    start_time: String(raw?.start_time || ''),
    end_time: String(raw?.end_time || ''),
    timelapse_video_url: String(raw?.timelapse_video_url || ''),
    topics: parseArrayLike(raw?.topics).map(String).filter(Boolean),
    char_count: Number(raw?.char_count ?? 0),
    place_name: String(raw?.place_name || ''),
    latitude: raw?.latitude != null ? Number(raw.latitude) : null,
    longitude: raw?.longitude != null ? Number(raw.longitude) : null,
    manuscript_photos: parseArrayLike(raw?.manuscript_photos),
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
      const charCount = (Math.floor(Math.random() * 5) + 1) * 400;
      const submissionCount = 1;
      const allTopics = ['에세이', '일기', '독서감상', '편지', '기획서', '시', '소설', '칼럼', '메모', '수필'];
      const picked = allTopics.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 1);
      daily.push({ date: dateStr, char_count: charCount, submission_count: submissionCount, keywords: picked });
    }
  }
  return daily;
}

function buildMockRecords() {
  const today = new Date();
  const records = [];
  const allTopics = ['에세이', '일기', '독서감상', '편지', '기획서', '시', '소설'];
  const allPlaces = ['집', '카페', '도서관', '공원', '학교', ''];
  const placeCoords = {
    '집': [37.5665, 126.9780],
    '카페': [37.5550, 126.9368],
    '도서관': [37.5820, 127.0016],
    '공원': [37.5443, 127.0557],
    '학교': [37.5664, 126.9389],
  };
  for (let i = 0; i < 15; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 2);
    const dateStr = d.toISOString().slice(0, 10);
    const startH = 6 + Math.floor(Math.random() * 4);
    const duration = 30 + Math.floor(Math.random() * 60);
    const endH = startH + Math.floor(duration / 60);
    const endM = duration % 60;
    const place = allPlaces[Math.floor(Math.random() * allPlaces.length)];
    const coords = placeCoords[place] || null;
    records.push({
      id: i + 1,
      date: dateStr,
      start_time: `${String(startH).padStart(2, '0')}:00`,
      end_time: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
      timelapse_video_url: i % 3 === 0 ? '' : `https://example.com/video-${i}.mp4`,
      topics: allTopics.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 1),
      char_count: (Math.floor(Math.random() * 5) + 1) * 400,
      place_name: place,
      latitude: coords ? coords[0] : null,
      longitude: coords ? coords[1] : null,
      manuscript_photos: [],
    });
  }
  return records;
}

export function createMockWritingDashboardRepository() {
  const repo = {
    async getDashboard() {
      return { daily: buildMockDaily(), records: buildMockRecords() };
    },
  };
  return repo;
}

export function createHttpWritingDashboardRepository({ baseUrl = ENV_API_BASE_URL, fetcher = fetch } = {}) {
  const repo = {
    async getDashboard() {
      const [dashRes, recordsRes] = await Promise.all([
        fetcher(new URL(`${baseUrl}/writing/dashboard`, window.location.origin).toString()),
        fetcher(new URL(`${baseUrl}/writing/records`, window.location.origin).toString()),
      ]);
      if (!dashRes.ok) throw new Error(`writing dashboard fetch failed: ${dashRes.status}`);
      const dashJson = await dashRes.json();
      const daily = parseArrayLike(dashJson?.daily).map(normalizeDayEntry).filter((d) => d.date);

      let records = [];
      if (recordsRes.ok) {
        const recordsJson = await recordsRes.json();
        records = parseArrayLike(recordsJson?.records).map(normalizeRecord);
      }

      return { daily, records };
    },
  };
  return repo;
}

export const writingDashboardRepository = USE_MOCK
  ? createMockWritingDashboardRepository()
  : createHttpWritingDashboardRepository({ baseUrl: ENV_API_BASE_URL });
