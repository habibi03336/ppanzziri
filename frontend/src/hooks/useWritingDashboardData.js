import { useMemo } from 'react';

export default function useWritingDashboardData(daily) {
  return useMemo(() => {
    const dayMap = new Map();
    for (const entry of daily) {
      dayMap.set(entry.date, entry);
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const start30Date = new Date(today);
    start30Date.setDate(start30Date.getDate() - 29);
    const start30Str = start30Date.toISOString().slice(0, 10);

    const last30 = daily.filter((d) => d.date >= start30Str && d.date <= todayStr);
    const keywordFreq30 = buildKeywordFreq(last30);

    return {
      dayMap,
      keywordFreq30,
      todayStr,
      start30Str,
      getKeywordFreqForRange(fromStr, toStr) {
        const entries = daily.filter((d) => d.date >= fromStr && d.date <= toStr);
        return buildKeywordFreq(entries);
      },
    };
  }, [daily]);
}

function buildKeywordFreq(entries) {
  const freq = new Map();
  for (const entry of entries) {
    for (const kw of entry.keywords) {
      freq.set(kw, (freq.get(kw) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, count]) => ({ keyword, count }));
}
