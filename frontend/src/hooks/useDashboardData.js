import { useMemo } from 'react';
import { addDays, parseDate, toISODate } from '../utils/date.js';
import {
  averageDailyFromMap,
  buildDailyEffectiveMap,
  groupByTransactionDate,
  sortByDateAsc,
  tagTotalsEffectiveLast30,
} from '../utils/calculations.js';

const CHALLENGE_START_DATE = '2026-02-08';

export default function useDashboardData(records, startCapital, social, apiDaysToGoal) {
  return useMemo(() => {
    const recordsAsc = sortByDateAsc(records, 'transaction_date');
    const totalExpense = recordsAsc.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);

    const expenseSeries = [];
    let cumExp = 0;
    for (const r of recordsAsc) {
      if (r.type === 'expense') {
        cumExp += r.amount;
        expenseSeries.push({ date: r.transaction_date, expense: cumExp });
      }
    }

    const asOfDate = toISODate(new Date());
    const asOfObj = parseDate(asOfDate);
    const start30 = toISODate(addDays(asOfObj, -29));
    const start90 = toISODate(addDays(asOfObj, -89));
    const effectiveStart90 = parseDate(start90) > parseDate(CHALLENGE_START_DATE)
      ? start90
      : CHALLENGE_START_DATE;

    const dailyExpenseEff = buildDailyEffectiveMap(records, 'expense');

    let earliestEffDate = start30;
    for (const [d] of dailyExpenseEff.entries()) {
      if (parseDate(d) < parseDate(earliestEffDate)) earliestEffDate = d;
    }

    const avgAll = averageDailyFromMap(dailyExpenseEff, earliestEffDate, asOfDate);
    const start7 = toISODate(addDays(asOfObj, -6));
    const avg7 = averageDailyFromMap(dailyExpenseEff, start7, asOfDate);
    const avg30 = averageDailyFromMap(dailyExpenseEff, start30, asOfDate);
    const avg90 = averageDailyFromMap(dailyExpenseEff, effectiveStart90, asOfDate);

    const expense7 = Math.round(avg7 * 7);
    const expense30 = Math.round(avg30 * 30);

    const remaining = Math.max(0, startCapital - totalExpense);
    const daysToGoal = apiDaysToGoal != null
      ? apiDaysToGoal
      : (avg90 > 0 ? Math.floor(remaining / avg90) : null);

    const tagTotals = tagTotalsEffectiveLast30(records, start30, asOfDate);
    const tagItems = [...tagTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    const topTags = (() => {
      const total = tagItems.reduce((s, item) => s + item.value, 0) || 1;
      return tagItems.slice(0, 3).map((item) => ({
        name: item.name,
        pct: Math.round((item.value / total) * 100),
      }));
    })();

    const recordPhotos = [...records]
      .filter((record) => record.photo_url)
      .sort((a, b) => {
        if (a.transaction_date !== b.transaction_date) {
          return a.transaction_date < b.transaction_date ? 1 : -1;
        }
        return Number(b.id || 0) - Number(a.id || 0);
      })
      .map((record) => ({
        id: record.id,
        transaction_date: record.transaction_date,
        memo: record.memo || '',
        tags: (record.tags || []).map((tag) => tag.name).filter(Boolean),
        photo_url: record.photo_url,
        photo_url_resized: record.photo_url_resized,
      }));

    const groupedRecords = groupByTransactionDate(records);

    return {
      START_CAPITAL: startCapital,
      asOfDate,
      totalExpense,
      expense7,
      expense30,
      expenseSeries,
      daysToGoal,
      avgAll,
      avg30,
      avg90,
      tagItems,
      topTags,
      recordPhotos,
      groupedRecords,
      start30,
      social: social || {
        youtube_embed_url: '',
        instagram_post_url: '',
        instagram_profile_url: '',
        extra_links: [],
      },
    };
  }, [records, startCapital, social, apiDaysToGoal]);
}
