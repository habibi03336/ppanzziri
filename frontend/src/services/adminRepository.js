import { certifications as seedCertifications, records as seedRecords } from '../data/mockData.js';

const API_BASE_URL = import.meta.env.VITE_DASHBOARD_API_BASE_URL || '/api';
const USE_MOCK = import.meta.env.VITE_DASHBOARD_USE_MOCK !== 'false';

function buildHeaders(password) {
  const headers = { 'Content-Type': 'application/json' };
  if (password) headers['X-Admin-Password'] = password;
  return headers;
}

function mapRecordFromApi(raw) {
  return {
    id: raw.id,
    type: raw.type,
    transaction_date: raw.transaction_date,
    amount: raw.amount,
    memo: raw.memo || '',
    photo_url: raw.photo_url || '',
    tags: (raw.tags || []).map((tag) => ({ name: tag.name, amount: Number(tag.amount) })),
    effective_segments: (raw.effective_segments || []).map((seg) => ({
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
            const form = new FormData();
            form.append('payload', JSON.stringify(mapRecordToApi(record)));
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
      return res.json();
    },

    async createCertification(payload, password) {
      const hasFile = payload?.photoFile instanceof File;
      const requestInit = hasFile
        ? (() => {
            const form = new FormData();
            form.append('date', payload.date);
            form.append('photo', payload.photoFile);
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
            body: JSON.stringify(payload),
          };

      const res = await fetcher(`${baseUrl}/budget/certifications`, requestInit);
      if (!res.ok) throw new Error(`certification create failed: ${res.status}`);
      return res.json().catch(() => ({}));
    },

    async getCertifications() {
      const res = await fetcher(`${baseUrl}/budget/certifications`);
      if (!res.ok) throw new Error(`certifications fetch failed: ${res.status}`);
      return res.json();
    },

    async deleteCertificationByDate(date, password) {
      const encodedDate = encodeURIComponent(date);
      const res = await fetcher(`${baseUrl}/budget/certifications/${encodedDate}`, {
        method: 'DELETE',
        headers: buildHeaders(password),
      });
      if (!res.ok) throw new Error(`certification delete failed: ${res.status}`);
    },
  };
}

export function createMockAdminRepository() {
  let records = seedRecords.map((r) => ({ ...r, tags: [...r.tags], effective_segments: [...r.effective_segments] }));
  let certifications = seedCertifications.map((c) => ({ ...c }));

  return {
    async getRecords() {
      return [...records].sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : -1));
    },

    async createRecord(record, _password, photoFile) {
      const id = records.length ? Math.max(...records.map((r) => Number(r.id))) + 1 : 1;
      const photoUrl = photoFile instanceof File ? URL.createObjectURL(photoFile) : record.photo_url || '';
      records = [{ id, ...record, photo_url: photoUrl }, ...records];
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

    async createCertification(payload) {
      const photoUrl = payload?.photoFile instanceof File
        ? URL.createObjectURL(payload.photoFile)
        : payload.photo_url || '';
      certifications = [{ date: payload.date, photo_url: photoUrl, balance: 0 }, ...certifications];
      return { ok: true };
    },

    async getCertifications() {
      return [...certifications].sort((a, b) => (a.date < b.date ? 1 : -1));
    },

    async deleteCertificationByDate(date) {
      certifications = certifications.filter((c) => c.date !== date);
    },
  };
}

export const adminRepository = USE_MOCK
  ? createMockAdminRepository()
  : createHttpAdminRepository({ baseUrl: API_BASE_URL });
