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

export default function useDashboardData(records, startCapital, social) {
  return useMemo(() => {
    const recordsAsc = sortByDateAsc(records, 'transaction_date');
    const totalIncome = recordsAsc.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0);
    const totalExpense = recordsAsc.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
    const currentBalance = startCapital + totalIncome - totalExpense;

    const balanceSeries = [];
    let bal = startCapital;
    for (const r of recordsAsc) {
      bal += r.type === 'income' ? r.amount : -r.amount;
      balanceSeries.push({ date: r.transaction_date, balance: bal });
    }

    const asOfDate = toISODate(new Date());
    const asOfObj = parseDate(asOfDate);
    const yesterday = toISODate(addDays(asOfObj, -1));
    const monthAgo = toISODate(addDays(asOfObj, -30));
    const start30 = toISODate(addDays(asOfObj, -29));
    const start90 = toISODate(addDays(asOfObj, -89));
    const effectiveStart90 = parseDate(start90) > parseDate(CHALLENGE_START_DATE)
      ? start90
      : CHALLENGE_START_DATE;

    const balanceAt = (targetDate) => {
      let value = startCapital;
      for (const r of recordsAsc) {
        if (r.transaction_date > targetDate) break;
        value += r.type === 'income' ? r.amount : -r.amount;
      }
      return value;
    };

    const prevDayBalance = balanceAt(yesterday);
    const prevMonthBalance = balanceAt(monthAgo);
    const dayDelta = currentBalance - prevDayBalance;
    const monthDelta = currentBalance - prevMonthBalance;
    const dayDeltaPct = prevDayBalance !== 0 ? (dayDelta / prevDayBalance) * 100 : null;
    const monthDeltaPct = prevMonthBalance !== 0 ? (monthDelta / prevMonthBalance) * 100 : null;

    const dailyExpenseEff = buildDailyEffectiveMap(records, 'expense');

    let earliestEffDate = start30;
    for (const [d] of dailyExpenseEff.entries()) {
      if (parseDate(d) < parseDate(earliestEffDate)) earliestEffDate = d;
    }

    const avgAll = averageDailyFromMap(dailyExpenseEff, earliestEffDate, asOfDate);
    const avg30 = averageDailyFromMap(dailyExpenseEff, start30, asOfDate);
    const avg90 = averageDailyFromMap(dailyExpenseEff, effectiveStart90, asOfDate);
    const runwayDays = avg90 > 0 ? Math.floor(currentBalance / avg90) : null;

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
    const groupedRecords = groupByTransactionDate(records).map((group) => ({
      ...group,
      balance: balanceAt(group.date),
    }));

    return {
      START_CAPITAL: startCapital,
      asOfDate,
      totalIncome,
      totalExpense,
      currentBalance,
      dayChange: { amount: dayDelta, pct: dayDeltaPct },
      monthChange: { amount: monthDelta, pct: monthDeltaPct },
      balanceSeries,
      avgAll,
      avg30,
      avg90,
      runwayDays,
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
  }, [records, startCapital, social]);
}
