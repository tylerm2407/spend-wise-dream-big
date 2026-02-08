import { useState, useMemo, useCallback } from 'react';
import { usePurchases } from './usePurchases';
import { useProfile } from './useProfile';
import { useGoals } from './useGoals';
import { supabase } from '@/integrations/supabase/client';

const RECAP_DISMISSED_KEY = 'monthly_recap_dismissed_month';

export interface MonthlyRecapData {
  totalSpent: number;
  monthlyIncome: number | null;
  savingsRate: number | null;
  purchaseCount: number;
  averagePerPurchase: number;
  daysWithNoPurchases: number;
  categoryBreakdown: { name: string; amount: number; count: number }[];
  topCategory: { name: string; amount: number } | null;
  dailyAverage: number;
  comparedToLastMonth: number | null; // percentage change
  lastMonthTotal: number;
  monthLabel: string;
  goalProgress: { name: string; current: number; target: number; progress: number }[];
}

function getMonthId(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function useMonthlyRecap() {
  const { purchases } = usePurchases();
  const { profile } = useProfile();
  const { goals } = useGoals();

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const recap = useMemo<MonthlyRecapData | null>(() => {
    if (!purchases.length) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Use last month's data if we're in the first 7 days, otherwise current month
    const targetMonth = now.getDate() <= 7 ? (currentMonth === 0 ? 11 : currentMonth - 1) : currentMonth;
    const targetYear = now.getDate() <= 7 && currentMonth === 0 ? currentYear - 1 : currentYear;

    const monthPurchases = purchases.filter(p => {
      const d = new Date(p.purchase_date!);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    if (monthPurchases.length === 0) return null;

    // Previous month for comparison
    const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
    const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;
    const prevMonthPurchases = purchases.filter(p => {
      const d = new Date(p.purchase_date!);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const totalSpent = monthPurchases.reduce((sum, p) => sum + Number(p.amount), 0);
    const lastMonthTotal = prevMonthPurchases.reduce((sum, p) => sum + Number(p.amount), 0);
    const monthlyIncome = profile?.monthly_income ? Number(profile.monthly_income) : null;

    // Category breakdown
    const catMap: Record<string, { amount: number; count: number }> = {};
    monthPurchases.forEach(p => {
      if (!catMap[p.category]) catMap[p.category] = { amount: 0, count: 0 };
      catMap[p.category].amount += Number(p.amount);
      catMap[p.category].count++;
    });
    const categoryBreakdown = Object.entries(catMap)
      .map(([name, { amount, count }]) => ({ name, amount, count }))
      .sort((a, b) => b.amount - a.amount);

    // Days with no purchases
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const daysWithPurchases = new Set(monthPurchases.map(p => new Date(p.purchase_date!).getDate()));
    const daysElapsed = targetMonth === currentMonth ? now.getDate() : daysInMonth;
    const daysWithNoPurchases = daysElapsed - daysWithPurchases.size;

    const monthLabel = new Date(targetYear, targetMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Goal progress
    const goalProgress = goals
      .filter(g => !g.is_completed)
      .map(g => ({
        name: g.name,
        current: Number(g.current_amount),
        target: Number(g.target_amount),
        progress: Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)),
      }));

    return {
      totalSpent,
      monthlyIncome,
      savingsRate: monthlyIncome ? Math.round(((monthlyIncome - totalSpent) / monthlyIncome) * 100) : null,
      purchaseCount: monthPurchases.length,
      averagePerPurchase: totalSpent / monthPurchases.length,
      daysWithNoPurchases: Math.max(0, daysWithNoPurchases),
      categoryBreakdown,
      topCategory: categoryBreakdown[0] ? { name: categoryBreakdown[0].name, amount: categoryBreakdown[0].amount } : null,
      dailyAverage: totalSpent / daysElapsed,
      comparedToLastMonth: lastMonthTotal > 0 ? Math.round(((totalSpent - lastMonthTotal) / lastMonthTotal) * 100) : null,
      lastMonthTotal,
      monthLabel,
      goalProgress,
    };
  }, [purchases, profile?.monthly_income, goals]);

  const currentMonthId = getMonthId(new Date());
  // Reset any previous dismiss so the card is visible again
  if (typeof window !== 'undefined') {
    localStorage.removeItem(RECAP_DISMISSED_KEY);
  }
  const dismissedMonth = localStorage.getItem(RECAP_DISMISSED_KEY);
  const shouldShow = recap !== null && dismissedMonth !== currentMonthId;

  const dismiss = () => {
    localStorage.setItem(RECAP_DISMISSED_KEY, currentMonthId);
  };

  const generateAISummary = useCallback(async () => {
    if (!recap || isLoadingAI) return;
    setIsLoadingAI(true);
    setAiError(null);

    try {
      const { data, error } = await supabase.functions.invoke('monthly-recap-ai', {
        body: {
          totalSpent: recap.totalSpent,
          monthlyIncome: recap.monthlyIncome,
          savingsRate: recap.savingsRate,
          categoryBreakdown: recap.categoryBreakdown,
          dailyAverage: recap.dailyAverage,
          comparedToLastMonth: recap.comparedToLastMonth,
          lastMonthTotal: recap.lastMonthTotal,
          monthLabel: recap.monthLabel,
          goalProgress: recap.goalProgress,
          daysWithNoPurchases: recap.daysWithNoPurchases,
          purchaseCount: recap.purchaseCount,
        },
      });

      if (error) throw error;
      setAiSummary(data.summary);
    } catch (e) {
      console.error('AI recap error:', e);
      setAiError('Could not generate summary. Try again later.');
    } finally {
      setIsLoadingAI(false);
    }
  }, [recap, isLoadingAI]);

  return { recap, shouldShow, dismiss, aiSummary, isLoadingAI, aiError, generateAISummary };
}
