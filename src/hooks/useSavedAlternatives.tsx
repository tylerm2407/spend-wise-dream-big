import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SavedAlternative {
  id: string;
  user_id: string;
  purchase_id: string | null;
  alternative_name: string;
  original_amount: number;
  alternative_price: number;
  savings: number;
  category: string;
  status: 'saved' | 'dismissed';
  created_at: string;
}

interface SaveAlternativeInput {
  purchase_id?: string;
  alternative_name: string;
  original_amount: number;
  alternative_price: number;
  savings: number;
  category: string;
  status: 'saved' | 'dismissed';
}

export function useSavedAlternatives() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedAlternatives = [], isLoading } = useQuery({
    queryKey: ['saved-alternatives', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('saved_alternatives')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SavedAlternative[];
    },
    enabled: !!user,
  });

  const saveAlternative = useMutation({
    mutationFn: async (input: SaveAlternativeInput) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('saved_alternatives')
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-alternatives', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['weekly-challenge', user?.id] });
    },
  });

  const unsaveAlternative = useMutation({
    mutationFn: async ({ alternativeName, category }: { alternativeName: string; category: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('saved_alternatives')
        .delete()
        .eq('user_id', user.id)
        .eq('alternative_name', alternativeName)
        .eq('category', category)
        .eq('status', 'saved');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-alternatives', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['weekly-challenge', user?.id] });
    },
  });

  const dismissedAlternatives = savedAlternatives.filter(a => a.status === 'dismissed');
  const favoritedAlternatives = savedAlternatives.filter(a => a.status === 'saved');
  
  const isAlternativeDismissed = (purchaseId: string, alternativeName: string) => {
    return dismissedAlternatives.some(
      a => a.purchase_id === purchaseId && a.alternative_name === alternativeName
    );
  };

  const isAlternativeSaved = (purchaseId: string, alternativeName: string) => {
    return favoritedAlternatives.some(
      a => a.purchase_id === purchaseId && a.alternative_name === alternativeName
    );
  };

  const isAlternativeSavedByName = (alternativeName: string, category: string) => {
    return favoritedAlternatives.some(
      a => a.alternative_name === alternativeName && a.category === category
    );
  };

  const totalSavedAmount = favoritedAlternatives.reduce((sum, a) => sum + Number(a.savings), 0);

  return {
    savedAlternatives,
    dismissedAlternatives,
    favoritedAlternatives,
    isLoading,
    saveAlternative: saveAlternative.mutate,
    unsaveAlternative: unsaveAlternative.mutate,
    isSaving: saveAlternative.isPending,
    isUnsaving: unsaveAlternative.isPending,
    isAlternativeDismissed,
    isAlternativeSaved,
    isAlternativeSavedByName,
    totalSavedAmount,
  };
}
