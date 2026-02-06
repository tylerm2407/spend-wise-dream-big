import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PriceAlert {
  id: string;
  user_id: string;
  product_name: string;
  target_price: number;
  current_lowest_price: number | null;
  is_active: boolean;
  is_triggered: boolean;
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateAlertParams {
  productName: string;
  targetPrice: number;
  currentLowestPrice?: number;
}

export function usePriceAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['price-alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PriceAlert[];
    },
    enabled: !!user,
  });

  const createAlert = useMutation({
    mutationFn: async ({ productName, targetPrice, currentLowestPrice }: CreateAlertParams) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: user.id,
          product_name: productName,
          target_price: targetPrice,
          current_lowest_price: currentLowestPrice || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts', user?.id] });
    },
  });

  const updateAlert = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PriceAlert> & { id: string }) => {
      const { error } = await supabase
        .from('price_alerts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts', user?.id] });
    },
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts', user?.id] });
    },
  });

  const activeAlerts = alerts.filter(a => a.is_active && !a.is_triggered);
  const triggeredAlerts = alerts.filter(a => a.is_triggered);

  return {
    alerts,
    activeAlerts,
    triggeredAlerts,
    isLoading,
    error,
    createAlert: createAlert.mutate,
    createAlertAsync: createAlert.mutateAsync,
    updateAlert: updateAlert.mutate,
    deleteAlert: deleteAlert.mutate,
    isCreating: createAlert.isPending,
  };
}
