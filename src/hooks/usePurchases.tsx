import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Database } from '@/integrations/supabase/types';

type Purchase = Database['public']['Tables']['purchases']['Row'];
type PurchaseInsert = Database['public']['Tables']['purchases']['Insert'];

export function usePurchases() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: purchases = [], isLoading, error } = useQuery({
    queryKey: ['purchases', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('purchase_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addPurchase = useMutation({
    mutationFn: async (purchase: Omit<PurchaseInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('purchases')
        .insert({ ...purchase, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', user?.id] });
    },
  });

  const deletePurchase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', user?.id] });
    },
  });

  const updatePurchase = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; amount?: number; category?: Database['public']['Enums']['purchase_category']; item_name?: string; frequency?: Database['public']['Enums']['purchase_frequency'] }) => {
      const { data, error } = await supabase
        .from('purchases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', user?.id] });
    },
  });

  // Calculate monthly stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyPurchases = purchases.filter(p => {
    const date = new Date(p.purchase_date!);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const lastMonthPurchases = purchases.filter(p => {
    const date = new Date(p.purchase_date!);
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const year = currentMonth === 0 ? currentYear - 1 : currentYear;
    return date.getMonth() === lastMonth && date.getFullYear() === year;
  });

  const monthlyTotal = monthlyPurchases.reduce((sum, p) => sum + Number(p.amount), 0);
  const lastMonthTotal = lastMonthPurchases.reduce((sum, p) => sum + Number(p.amount), 0);

  // Category breakdown — current month only
  const categoryTotals = monthlyPurchases.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + Number(p.amount);
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  return {
    purchases,
    recentPurchases: purchases.slice(0, 5),
    isLoading,
    error,
    addPurchase: addPurchase.mutate,
    deletePurchase: deletePurchase.mutate,
    updatePurchase: updatePurchase.mutate,
    isAdding: addPurchase.isPending,
    monthlyTotal,
    lastMonthTotal,
    monthlyChange: lastMonthTotal > 0 
      ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0,
    topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
    categoryTotals,
  };
}