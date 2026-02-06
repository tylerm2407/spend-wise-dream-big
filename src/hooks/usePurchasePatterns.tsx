import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePurchases } from './usePurchases';
import { useEffect } from 'react';

interface PurchasePattern {
  id: string;
  user_id: string;
  product_name: string;
  category: string;
  purchase_count: number;
  average_price: number;
  last_purchased_at: string;
  auto_alert_enabled: boolean;
  alert_threshold_percent: number;
  created_at: string;
  updated_at: string;
}

export function usePurchasePatterns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { purchases } = usePurchases();

  const { data: patterns = [], isLoading, error } = useQuery({
    queryKey: ['purchase-patterns', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('purchase_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('purchase_count', { ascending: false });

      if (error) throw error;
      return data as PurchasePattern[];
    },
    enabled: !!user,
  });

  // Analyze purchases and update patterns
  const analyzePatterns = useMutation({
    mutationFn: async () => {
      if (!user || purchases.length === 0) return;

      // Group purchases by item name (normalized)
      const purchaseGroups = purchases.reduce((acc, purchase) => {
        const normalizedName = purchase.item_name.toLowerCase().trim();
        if (!acc[normalizedName]) {
          acc[normalizedName] = {
            name: purchase.item_name,
            category: purchase.category,
            amounts: [],
            lastDate: purchase.purchase_date,
          };
        }
        acc[normalizedName].amounts.push(Number(purchase.amount));
        if (purchase.purchase_date && purchase.purchase_date > (acc[normalizedName].lastDate || '')) {
          acc[normalizedName].lastDate = purchase.purchase_date;
        }
        return acc;
      }, {} as Record<string, { name: string; category: string; amounts: number[]; lastDate: string | null }>);

      // Only consider items purchased 2+ times as patterns
      const frequentItems = Object.values(purchaseGroups).filter(g => g.amounts.length >= 2);

      for (const item of frequentItems) {
        const avgPrice = item.amounts.reduce((a, b) => a + b, 0) / item.amounts.length;

        const { error } = await supabase
          .from('purchase_patterns')
          .upsert({
            user_id: user.id,
            product_name: item.name,
            category: item.category,
            purchase_count: item.amounts.length,
            average_price: avgPrice,
            last_purchased_at: item.lastDate || new Date().toISOString(),
          }, {
            onConflict: 'user_id,product_name',
          });

        if (error) console.error('Error upserting pattern:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-patterns', user?.id] });
    },
  });

  // Auto-analyze when purchases change
  useEffect(() => {
    if (purchases.length > 0 && user) {
      analyzePatterns.mutate();
    }
  }, [purchases.length, user?.id]);

  const toggleAutoAlert = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('purchase_patterns')
        .update({ auto_alert_enabled: enabled })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-patterns', user?.id] });
    },
  });

  const updateThreshold = useMutation({
    mutationFn: async ({ id, threshold }: { id: string; threshold: number }) => {
      const { error } = await supabase
        .from('purchase_patterns')
        .update({ alert_threshold_percent: threshold })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-patterns', user?.id] });
    },
  });

  const frequentPatterns = patterns.filter(p => p.purchase_count >= 3);
  const alertEnabledPatterns = patterns.filter(p => p.auto_alert_enabled);

  return {
    patterns,
    frequentPatterns,
    alertEnabledPatterns,
    isLoading,
    error,
    analyzePatterns: analyzePatterns.mutate,
    toggleAutoAlert: toggleAutoAlert.mutate,
    updateThreshold: updateThreshold.mutate,
    isAnalyzing: analyzePatterns.isPending,
  };
}
