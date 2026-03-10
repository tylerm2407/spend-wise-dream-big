import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { addToOfflineQueue } from './useOfflineQueue';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Purchase = Database['public']['Tables']['purchases']['Row'];
type PurchaseInsert = Database['public']['Tables']['purchases']['Insert'];

export function usePurchases() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const { data: purchases = [], isLoading, error } = useQuery({
    queryKey: ['purchases', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch all purchases using pagination to avoid the 1000-row limit
      const allPurchases: Purchase[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('purchases')
          .select('*')
          .eq('user_id', user.id)
          .order('purchase_date', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        
        if (error) throw error;
        allPurchases.push(...(data || []));
        hasMore = (data?.length ?? 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }

      return allPurchases;
    },
    enabled: !!user,
  });

  const addPurchase = useMutation({
    mutationFn: async (purchase: Omit<PurchaseInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');

      // Queue for later if offline
      if (!isOnline) {
        addToOfflineQueue(purchase);
        toast.info('Saved offline — will sync when you reconnect');
        return null;
      }
      
      const { data, error } = await supabase
        .from('purchases')
        .insert({ ...purchase, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async (newPurchase) => {
      await queryClient.cancelQueries({ queryKey: ['purchases', user?.id] });
      const previous = queryClient.getQueryData<Purchase[]>(['purchases', user?.id]);
      
      // Optimistically add the purchase
      const optimistic = {
        id: `temp-${Date.now()}`,
        user_id: user?.id ?? '',
        item_name: newPurchase.item_name,
        amount: newPurchase.amount,
        category: newPurchase.category,
        frequency: newPurchase.frequency ?? 'one-time',
        purchase_date: newPurchase.purchase_date ?? new Date().toISOString().split('T')[0],
        notes: newPurchase.notes ?? null,
        custom_frequency_days: newPurchase.custom_frequency_days ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        import_batch_id: null,
        linked_account_id: null,
        plaid_transaction_id: null,
        source: 'manual',
      } as Purchase;
      
      queryClient.setQueryData<Purchase[]>(['purchases', user?.id], (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_err, _newPurchase, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['purchases', user?.id], context.previous);
      }
    },
    onSettled: () => {
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