import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PriceRecord {
  id: string;
  product_name: string;
  store_name: string;
  price: number;
  zip_code: string | null;
  recorded_at: string;
}

interface PriceHistoryEntry {
  productName: string;
  storeName: string;
  price: number;
  zipCode?: string;
}

export function usePriceHistory(productName?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: priceHistory = [], isLoading, error } = useQuery({
    queryKey: ['price-history', user?.id, productName],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('price_history')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: true });

      if (productName) {
        query = query.ilike('product_name', `%${productName}%`);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as PriceRecord[];
    },
    enabled: !!user,
  });

  const savePrices = useMutation({
    mutationFn: async (entries: PriceHistoryEntry[]) => {
      if (!user) throw new Error('Not authenticated');

      const records = entries.map(entry => ({
        user_id: user.id,
        product_name: entry.productName,
        store_name: entry.storeName,
        price: entry.price,
        zip_code: entry.zipCode || null,
      }));

      const { error } = await supabase
        .from('price_history')
        .insert(records);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-history', user?.id] });
    },
  });

  // Group price history by store for trend visualization
  const trendData = priceHistory.reduce((acc, record) => {
    const date = new Date(record.recorded_at).toLocaleDateString();
    const existing = acc.find(d => d.date === date);
    
    if (existing) {
      existing[record.store_name] = record.price;
    } else {
      acc.push({
        date,
        [record.store_name]: record.price,
      });
    }
    
    return acc;
  }, [] as Array<{ date: string; [storeName: string]: string | number }>);

  // Get unique store names for chart
  const storeNames = [...new Set(priceHistory.map(r => r.store_name))];

  return {
    priceHistory,
    trendData,
    storeNames,
    isLoading,
    error,
    savePrices: savePrices.mutate,
    savePricesAsync: savePrices.mutateAsync,
    isSaving: savePrices.isPending,
  };
}
