import { addDays, daysBetweenInclusive, parseDate, toISODate } from './date.js';

export function sortByDateAsc(arr, key) {
  return [...arr].sort((a, b) => parseDate(a[key]) - parseDate(b[key]));
}

export function buildDailyEffectiveMap(records, type) {
  const map = new Map();
  for (const r of records) {
    if (r.type !== type) continue;
    for (const seg of r.effective_segments) {
      const days = daysBetweenInclusive(seg.from, seg.to);
      const perDay = seg.amount / days;
      const start = parseDate(seg.from);
      for (let i = 0; i < days; i += 1) {
        const d = toISODate(addDays(start, i));
        map.set(d, (map.get(d) || 0) + perDay);
      }
    }
  }
  return map;
}

export function averageDailyFromMap(map, startISO, endISO) {
  const start = parseDate(startISO);
  const end = parseDate(endISO);
  const ms = 24 * 60 * 60 * 1000;
  const days = Math.floor((end - start) / ms) + 1;
  if (days <= 0) return 0;
  let total = 0;
  for (let i = 0; i < days; i += 1) {
    total += map.get(toISODate(addDays(start, i))) || 0;
  }
  return total / days;
}

export function tagTotalsEffectiveLast30(records, start30, asOfDate) {
  const totals = new Map();
  const start = parseDate(start30);
  const end = parseDate(asOfDate);
  const ms = 24 * 60 * 60 * 1000;
  const daysRange = Math.floor((end - start) / ms) + 1;
  const inRange = new Set();

  for (let i = 0; i < daysRange; i += 1) inRange.add(toISODate(addDays(start, i)));

  for (const r of records) {
    if (r.type !== 'expense') continue;
    const totalTag = r.tags.reduce((s, t) => s + t.amount, 0) || r.amount;
    const ratios = r.tags.map((t) => ({ name: t.name, ratio: t.amount / totalTag }));

    for (const seg of r.effective_segments) {
      const days = daysBetweenInclusive(seg.from, seg.to);
      const perDay = seg.amount / days;
      const segStart = parseDate(seg.from);

      for (let i = 0; i < days; i += 1) {
        const dateISO = toISODate(addDays(segStart, i));
        if (!inRange.has(dateISO)) continue;
        for (const rr of ratios) {
          totals.set(rr.name, (totals.get(rr.name) || 0) + perDay * rr.ratio);
        }
      }
    }
  }

  return totals;
}

export function recordsInLastNDays(records, asOfDate, n) {
  const end = parseDate(asOfDate);
  const start = addDays(end, -(n - 1));
  return records
    .filter((r) => {
      const d = parseDate(r.transaction_date);
      return d >= start && d <= end;
    })
    .sort((a, b) => parseDate(b.transaction_date) - parseDate(a.transaction_date));
}

export function groupByTransactionDate(records) {
  const map = new Map();
  for (const r of records) {
    if (!map.has(r.transaction_date)) map.set(r.transaction_date, []);
    map.get(r.transaction_date).push(r);
  }
  const keys = [...map.keys()].sort((a, b) => parseDate(b) - parseDate(a));
  return keys.map((k) => ({ date: k, items: map.get(k).sort((a, b) => b.id - a.id) }));
}
