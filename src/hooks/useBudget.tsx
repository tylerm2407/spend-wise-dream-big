import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePurchases } from './usePurchases';
import { useMemo } from 'react';

export interface BudgetLimit {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetStatus {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  dining: 'Dining',
  shopping: 'Shopping',
  transportation: 'Transportation',
  entertainment: 'Entertainment',
  subscriptions: 'Subscriptions',
  groceries: 'Groceries',
  health: 'Health',
  utilities: 'Utilities',
  travel: 'Travel',
  other: 'Other',
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);
export const getCategoryLabel = (cat: string) => CATEGORY_LABELS[cat] ?? cat;

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

export function useBudget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { purchases } = usePurchases();

  const { data: limits = [], isLoading } = useQuery({
    queryKey: ['budget-limits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('budget_limits')
        .select('*')
        .eq('user_id', user.id)
        .order('category');
      if (error) throw error;
      return data as BudgetLimit[];
    },
    enabled: !!user,
  });

  const setLimit = useMutation({
    mutationFn: async ({ category, monthly_limit }: { category: string; monthly_limit: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('budget_limits')
        .upsert({ user_id: user.id, category, monthly_limit, updated_at: new Date().toISOString() }, { onConflict: 'user_id,category' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-limits', user?.id] });
    },
  });

  const deleteLimit = useMutation({
    mutationFn: async (category: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('budget_limits')
        .delete()
        .eq('user_id', user.id)
        .eq('category', category);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-limits', user?.id] });
    },
  });

  // Calculate monthly spending per category
  const monthlySpending = useMemo(() => {
    const { start, end } = getMonthRange();
    const spending: Record<string, number> = {};
    for (const p of purchases) {
      if (p.purchase_date >= start && p.purchase_date <= end) {
        spending[p.category] = (spending[p.category] ?? 0) + Number(p.amount);
      }
    }
    return spending;
  }, [purchases]);

  // Build budget status for all tracked categories
  const budgetStatuses: BudgetStatus[] = useMemo(() => {
    return limits.map(l => {
      const spent = monthlySpending[l.category] ?? 0;
      const remaining = l.monthly_limit - spent;
      return {
        category: l.category,
        limit: l.monthly_limit,
        spent,
        remaining,
        percentUsed: l.monthly_limit > 0 ? Math.min((spent / l.monthly_limit) * 100, 100) : 0,
        isOverBudget: spent > l.monthly_limit,
      };
    });
  }, [limits, monthlySpending]);

  const totalBudgeted = limits.reduce((s, l) => s + l.monthly_limit, 0);
  const totalSpent = budgetStatuses.reduce((s, b) => s + b.spent, 0);
  const overBudgetCount = budgetStatuses.filter(b => b.isOverBudget).length;

  return {
    limits,
    isLoading,
    budgetStatuses,
    monthlySpending,
    totalBudgeted,
    totalSpent,
    overBudgetCount,
    setLimit: setLimit.mutateAsync,
    deleteLimit: deleteLimit.mutateAsync,
    isSettingLimit: setLimit.isPending,
    getCategoryLabel,
    ALL_CATEGORIES,
  };
}
