import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Database } from '@/integrations/supabase/types';

type QuickAdd = Database['public']['Tables']['quick_adds']['Row'];

export function useQuickAdds() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: quickAdds = [], isLoading, error } = useQuery({
    queryKey: ['quick_adds', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('quick_adds')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addQuickAdd = useMutation({
    mutationFn: async (quickAdd: Omit<QuickAdd, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('quick_adds')
        .insert({ ...quickAdd, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick_adds', user?.id] });
    },
  });

  const deleteQuickAdd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quick_adds')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick_adds', user?.id] });
    },
  });

  return {
    quickAdds,
    isLoading,
    error,
    addQuickAdd: addQuickAdd.mutate,
    deleteQuickAdd: deleteQuickAdd.mutate,
    isAdding: addQuickAdd.isPending,
  };
}