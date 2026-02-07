import { useMemo } from 'react';
import { usePurchases } from './usePurchases';
import { useProfile } from './useProfile';

const RECAP_DISMISSED_KEY = 'weekly_recap_dismissed_week';

export interface WeeklyRecapData {
  totalSpent: number;
  weeklyBudget: number | null;
  dailyBudget: number | null;
  daysUnderBudget: number;
  daysOverBudget: number;
  daysWithNoPurchases: number;
  bestDay: { date: string; total: number } | null;
  worstDay: { date: string; total: number } | null;
  categoryBreakdown: { name: string; amount: number }[];
  budgetPerformancePct: number | null; // < 100 = under budget overall
  weekStart: string;
  weekEnd: string;
}

function getWeekId(date: Date): string {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay()); // Sunday
  return start.toISOString().split('T')[0];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export function useWeeklyRecap() {
  const { purchases } = usePurchases();
  const { profile } = useProfile();

  const recap = useMemo<WeeklyRecapData | null>(() => {
    if (!purchases.length) return null;

    const last7 = getLast7Days();
    const weekStart = last7[0];
    const weekEnd = last7[last7.length - 1];
    const dailyBudget = profile?.daily_budget ? Number(profile.daily_budget) : null;

    // Group purchases by day
    const dailyTotals: Record<string, number> = {};
    const categoryTotals: Record<string, number> = {};

    last7.forEach(day => { dailyTotals[day] = 0; });

    purchases.forEach(p => {
      const date = p.purchase_date;
      if (date && last7.includes(date)) {
        dailyTotals[date] = (dailyTotals[date] || 0) + Number(p.amount);
        const cat = p.category;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(p.amount);
      }
    });

    const totalSpent = Object.values(dailyTotals).reduce((sum, v) => sum + v, 0);

    let daysUnderBudget = 0;
    let daysOverBudget = 0;
    let daysWithNoPurchases = 0;
    let bestDay: { date: string; total: number } | null = null;
    let worstDay: { date: string; total: number } | null = null;

    last7.forEach(day => {
      const total = dailyTotals[day];
      if (total === 0) {
        daysWithNoPurchases++;
        daysUnderBudget++;
      } else {
        if (dailyBudget) {
          if (total <= dailyBudget) daysUnderBudget++;
          else daysOverBudget++;
        }
      }
      // Best day = lowest spending day (with purchases)
      if (total > 0 && (!bestDay || total < bestDay.total)) {
        bestDay = { date: day, total };
      }
      // Worst day = highest spending day
      if (!worstDay || total > worstDay.total) {
        worstDay = { date: day, total };
      }
    });

    const weeklyBudget = dailyBudget ? dailyBudget * 7 : null;
    const budgetPerformancePct = weeklyBudget
      ? Math.round((totalSpent / weeklyBudget) * 100)
      : null;

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    return {
      totalSpent,
      weeklyBudget,
      dailyBudget,
      daysUnderBudget,
      daysOverBudget,
      daysWithNoPurchases,
      bestDay,
      worstDay,
      categoryBreakdown,
      budgetPerformancePct,
      weekStart,
      weekEnd,
    };
  }, [purchases, profile?.daily_budget]);

  // Determine if the recap should be shown (once per week)
  const currentWeekId = getWeekId(new Date());
  const dismissedWeek = localStorage.getItem(RECAP_DISMISSED_KEY);
  const shouldShow = recap !== null && dismissedWeek !== currentWeekId;

  const dismiss = () => {
    localStorage.setItem(RECAP_DISMISSED_KEY, currentWeekId);
  };

  return { recap, shouldShow, dismiss };
}
