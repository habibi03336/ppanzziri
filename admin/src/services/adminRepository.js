import { records as seedRecords, social as seedSocial } from '../data/mockData.js';

const API_BASE_URL = import.meta.env.VITE_DASHBOARD_API_BASE_URL || '/api';
const USE_MOCK = import.meta.env.VITE_DASHBOARD_USE_MOCK !== 'false';

function normalizeType(type) {
  const normalized = String(type || '').toLowerCase();
  return normalized === 'income' ? 'income' : 'expense';
}

function normalizeOptionalType(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'income') return 'income';
  if (normalized === 'expense') return 'expense';
  return '';
}

function buildHeaders(password) {
  const headers = { 'Content-Type': 'application/json' };
  if (password) headers['X-Admin-Password'] = password;
  return headers;
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

function mapRecordFromApi(raw) {
  return {
    id: raw.id,
    type: normalizeType(raw.type),
    transaction_date: raw.transaction_date,
    created_at: raw.created_at || raw.createdAt || '',
    amount: Number(raw.amount ?? 0),
    memo: raw.memo || '',
    photo_url: raw.photo_url || '',
    tags: parseArrayLike(raw.tags).map((tag) => ({ name: tag.name, amount: Number(tag.amount) })),
    effective_segments: parseArrayLike(raw.effective_segments).map((seg) => ({
      from: seg.from || seg.effective_from,
      to: seg.to || seg.effective_to,
      amount: Number(seg.amount ?? seg.segment_amount),
    })),
  };
}

function mapRecordToApi(input) {
  return {
    type: input.type,
    transaction_date: input.transaction_date,
    amount: Number(input.amount),
    memo: input.memo || '',
    photo_url: input.photo_url || '',
    tags: input.tags.map((tag) => ({
      name: tag.name,
      amount: Number(tag.amount),
    })),
    effective_segments: input.effective_segments.map((seg) => ({
      effective_from: seg.from,
      effective_to: seg.to,
      segment_amount: Number(seg.amount),
    })),
  };
}

function normalizeSocial(raw) {
  const social = raw || {};
  const youtube = String(social.youtube_embed_url || social.youtubeEmbedUrl || '').trim();
  const instagramPost = String(social.instagram_post_url || social.instagramPostUrl || '').trim();
  const instagramProfile = String(social.instagram_profile_url || social.instagramProfileUrl || '').trim();
  return {
    youtube_embed_url: youtube,
    instagram_post_url: instagramPost,
    instagram_profile_url: instagramProfile,
    extra_links: parseArrayLike(social.extra_links ?? social.extraLinks).map((link) => ({
      label: String(link?.label || '').trim().slice(0, 30),
      href: String(link?.href || '').trim().slice(0, 500),
    })).filter((link) => link.label && link.href && isHttpsUrl(link.href)).slice(0, 6),
  };
}

export function createHttpAdminRepository({ baseUrl = API_BASE_URL, fetcher = fetch } = {}) {
  return {
    async getRecords() {
      const res = await fetcher(`${baseUrl}/budget/records`);
      if (!res.ok) throw new Error(`records fetch failed: ${res.status}`);
      const json = await res.json();
      return (json || []).map(mapRecordFromApi);
    },

    async createRecord(record, password, photoFile) {
      const hasFile = photoFile instanceof File;
      const requestInit = hasFile
        ? (() => {
            const mapped = mapRecordToApi(record);
            const form = new FormData();
            form.append('type', mapped.type);
            form.append('transaction_date', mapped.transaction_date);
            form.append('amount', String(mapped.amount));
            form.append('memo', mapped.memo || '');
            form.append('tags', JSON.stringify(mapped.tags || []));
            form.append('effective_segments', JSON.stringify(mapped.effective_segments || []));
            form.append('photo', photoFile);
            const headers = {};
            if (password) headers['X-Admin-Password'] = password;
            return {
              method: 'POST',
              headers,
              body: form,
            };
          })()
        : {
            method: 'POST',
            headers: buildHeaders(password),
            body: JSON.stringify(mapRecordToApi(record)),
          };

      const res = await fetcher(`${baseUrl}/budget/records`, requestInit);
      if (!res.ok) throw new Error(`record create failed: ${res.status}`);
      return res.json().catch(() => ({}));
    },

    async deleteRecord(id, password) {
      const res = await fetcher(`${baseUrl}/budget/records/${id}`, {
        method: 'DELETE',
        headers: buildHeaders(password),
      });
      if (!res.ok) throw new Error(`record delete failed: ${res.status}`);
    },

    async getTags() {
      const res = await fetcher(`${baseUrl}/budget/tags`);
      if (!res.ok) throw new Error(`tags fetch failed: ${res.status}`);
      const json = await res.json();
      return (json || []).map((tag) => ({
        name: String(tag?.name || ''),
        amount: Number(tag?.amount ?? 0),
        type: normalizeOptionalType(tag?.type || tag?.record_type || tag?.recordType),
      }));
    },

    async getSocialLinks() {
      const res = await fetcher(`${baseUrl}/social`);
      if (!res.ok) throw new Error(`social fetch failed: ${res.status}`);
      const json = await res.json();
      return normalizeSocial(json);
    },

    async updateSocialLinks(payload, password) {
      const res = await fetcher(`${baseUrl}/social`, {
        method: 'PUT',
        headers: buildHeaders(password),
        body: JSON.stringify(normalizeSocial(payload)),
      });
      if (!res.ok) throw new Error(`social update failed: ${res.status}`);
      return res.json().catch(() => ({}));
    },

    async savePushSubscription(subscription, password) {
      const res = await fetcher(`${baseUrl}/writing/push-subscription`, {
        method: 'POST',
        headers: buildHeaders(password),
        body: JSON.stringify(subscription),
      });
      if (!res.ok) throw new Error(`push subscription failed: ${res.status}`);
      return res.json().catch(() => ({}));
    },

    async getWritingGoal() {
      const res = await fetcher(`${baseUrl}/writing/goal`);
      if (!res.ok) throw new Error(`writing goal fetch failed: ${res.status}`);
      const json = await res.json().catch(() => ({}));
      const raw = json?.goal;
      const num = Number(raw);
      return { goal: Number.isFinite(num) && num > 0 ? num : null };
    },

    async updateWritingGoal(goal, password) {
      const num = Number(goal);
      const payload = { goal: Number.isFinite(num) && num > 0 ? num : null };
      const res = await fetcher(`${baseUrl}/writing/goal`, {
        method: 'PUT',
        headers: buildHeaders(password),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`writing goal update failed: ${res.status}`);
      return res.json().catch(() => ({}));
    },
  };
}

export function createMockAdminRepository() {
  let records = seedRecords.map((r) => ({ ...r, tags: [...r.tags], effective_segments: [...r.effective_segments] }));
  let socialLinks = normalizeSocial(seedSocial);
  let writingGoal = null;
  let pushSubscriptions = [];

  return {
    async getRecords() {
      return [...records].sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : -1));
    },

    async createRecord(record, _password, photoFile) {
      const id = records.length ? Math.max(...records.map((r) => Number(r.id))) + 1 : 1;
      const photoUrl = photoFile instanceof File ? URL.createObjectURL(photoFile) : record.photo_url || '';
      const createdAt = new Date().toISOString();
      records = [{ id, created_at: createdAt, ...record, photo_url: photoUrl }, ...records];
      return { id };
    },

    async deleteRecord(id) {
      records = records.filter((r) => String(r.id) !== String(id));
    },

    async getTags() {
      const map = new Map();
      records.forEach((r) => r.tags.forEach((t) => map.set(t.name, (map.get(t.name) || 0) + t.amount)));
      return [...map.entries()].map(([name, amount]) => ({ name, amount }));
    },

    async getSocialLinks() {
      return { ...socialLinks, extra_links: [...socialLinks.extra_links] };
    },

    async updateSocialLinks(payload) {
      socialLinks = normalizeSocial(payload);
      return { ok: true };
    },

    async savePushSubscription(subscription) {
      pushSubscriptions = [...pushSubscriptions, subscription];
      return { ok: true };
    },

    async getWritingGoal() {
      return { goal: writingGoal };
    },

    async updateWritingGoal(goal) {
      const num = Number(goal);
      writingGoal = Number.isFinite(num) && num > 0 ? num : null;
      return { goal: writingGoal };
    },
  };
}

export const adminRepository = USE_MOCK
  ? createMockAdminRepository()
  : createHttpAdminRepository({ baseUrl: API_BASE_URL });
