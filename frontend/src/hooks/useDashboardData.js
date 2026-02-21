import { useMemo } from 'react';
import { addDays, parseDate, toISODate } from '../utils/date.js';
import {
  averageDailyFromMap,
  buildDailyEffectiveMap,
  groupByTransactionDate,
  recordsInLastNDays,
  sortByDateAsc,
  tagTotalsEffectiveLast30,
} from '../utils/calculations.js';

export default function useDashboardData(records, certifications, startCapital) {
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

    const asOfDate = balanceSeries.length
      ? balanceSeries[balanceSeries.length - 1].date
      : toISODate(new Date());
    const asOfObj = parseDate(asOfDate);
    const start30 = toISODate(addDays(asOfObj, -29));

    const dailyExpenseEff = buildDailyEffectiveMap(records, 'expense');

    let earliestEffDate = start30;
    for (const [d] of dailyExpenseEff.entries()) {
      if (parseDate(d) < parseDate(earliestEffDate)) earliestEffDate = d;
    }

    const avgAll = averageDailyFromMap(dailyExpenseEff, earliestEffDate, asOfDate);
    const avg30 = averageDailyFromMap(dailyExpenseEff, start30, asOfDate);
    const runwayDays = avg30 > 0 ? Math.floor(currentBalance / avg30) : null;

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

    const recent7 = recordsInLastNDays(records, asOfDate, 7);
    const groupedRecords = groupByTransactionDate(records);
    const latestProof = [...certifications].sort((a, b) => parseDate(b.date) - parseDate(a.date))[0] || null;

    return {
      START_CAPITAL: startCapital,
      asOfDate,
      totalIncome,
      totalExpense,
      currentBalance,
      balanceSeries,
      avgAll,
      avg30,
      runwayDays,
      tagItems,
      topTags,
      recent7,
      groupedRecords,
      latestProof,
      certifications,
      start30,
    };
  }, [records, certifications, startCapital]);
}
