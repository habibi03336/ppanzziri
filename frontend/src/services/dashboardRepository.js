import { START_CAPITAL, certifications, records, social } from '../data/mockData.js';

const ENV_API_BASE_URL = import.meta.env.VITE_DASHBOARD_API_BASE_URL || '/api';
const USE_MOCK = import.meta.env.VITE_DASHBOARD_USE_MOCK !== 'false';

function normalizeType(type) {
  const normalized = String(type || '').toLowerCase();
  return normalized === 'income' ? 'income' : 'expense';
}

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

function isHttpsUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeRecord(raw) {
  const tags = parseArrayLike(raw?.tags).map((tag) => ({
    name: String(tag?.name || ''),
    amount: Number(tag?.amount ?? 0),
  })).filter((tag) => tag.name);

  const effectiveSegments = parseArrayLike(raw?.effective_segments).map((seg) => ({
    from: seg?.from || seg?.effective_from || raw?.transaction_date,
    to: seg?.to || seg?.effective_to || raw?.transaction_date,
    amount: Number(seg?.amount ?? seg?.segment_amount ?? raw?.amount ?? 0),
  }));

  return {
    id: raw?.id,
    type: normalizeType(raw?.type),
    transaction_date: raw?.transaction_date,
    amount: Number(raw?.amount ?? 0),
    memo: raw?.memo || '',
    photo_url: raw?.photo_url_compressed || raw?.photo_url || '',
    photo_url_resized: raw?.photo_url_resized || raw?.photo_url || '',
    tags,
    effective_segments: effectiveSegments,
  };
}

function normalizeCertification(raw) {
  return {
    date: raw?.date,
    balance: Number(raw?.balance ?? 0),
    photo_url: raw?.photo_url || '',
  };
}

function normalizeSocial(raw) {
  const rawSocial = raw || {};
  return {
    youtube_embed_url: String(rawSocial.youtube_embed_url || rawSocial.youtubeEmbedUrl || '').trim(),
    instagram_post_url: String(rawSocial.instagram_post_url || rawSocial.instagramPostUrl || '').trim(),
    instagram_profile_url: String(rawSocial.instagram_profile_url || rawSocial.instagramProfileUrl || '').trim(),
    extra_links: parseArrayLike(rawSocial.extra_links ?? rawSocial.extraLinks)
      .map((link) => ({
        label: String(link?.label || '').trim().slice(0, 30),
        href: String(link?.href || '').trim().slice(0, 500),
      }))
      .filter((link) => link.label && link.href && isHttpsUrl(link.href))
      .slice(0, 6),
  };
}

function normalizeDashboardPayload(raw) {
  const normalized = raw || {};
  return {
    startCapital: Number(normalized.startCapital ?? normalized.start_capital ?? START_CAPITAL),
    records: parseArrayLike(normalized.records).map(normalizeRecord),
    certifications: parseArrayLike(normalized.certifications).map(normalizeCertification),
    social: normalizeSocial(normalized.social),
  };
}

export function createMockDashboardRepository() {
  return {
    async getDashboard() {
      return {
        startCapital: START_CAPITAL,
        records,
        certifications,
        social: normalizeSocial(social),
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
      const json = await res.json();
      return normalizeDashboardPayload(json);
    },
  };
}

export const dashboardRepository = USE_MOCK
  ? createMockDashboardRepository()
  : createHttpDashboardRepository({ baseUrl: ENV_API_BASE_URL });
