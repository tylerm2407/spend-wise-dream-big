 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from './useAuth';
 
 interface Favorite {
   id: string;
   user_id: string;
   item_name: string;
   amount: number;
   category: string;
   frequency: string;
   use_count: number;
   last_used_at: string;
   created_at: string;
 }
 
 export function useFavorites() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   const { data: favorites = [], isLoading } = useQuery({
     queryKey: ['favorites', user?.id],
     queryFn: async () => {
       if (!user) return [];
       
       const { data, error } = await supabase
         .from('favorites')
         .select('*')
         .eq('user_id', user.id)
         .order('use_count', { ascending: false })
         .limit(10);
       
       if (error) throw error;
       return data as Favorite[];
     },
     enabled: !!user,
   });
 
   const incrementFavorite = useMutation({
     mutationFn: async (favorite: Omit<Favorite, 'id' | 'user_id' | 'created_at' | 'last_used_at' | 'use_count'>) => {
       if (!user) throw new Error('Not authenticated');
       
       // Check if favorite exists
       const { data: existing } = await supabase
         .from('favorites')
         .select('*')
         .eq('user_id', user.id)
         .eq('item_name', favorite.item_name)
         .eq('amount', favorite.amount)
         .single();
       
       if (existing) {
         // Update use count
         const { error } = await supabase
           .from('favorites')
           .update({ 
             use_count: (existing as Favorite).use_count + 1,
             last_used_at: new Date().toISOString()
           })
           .eq('id', (existing as Favorite).id);
         if (error) throw error;
       } else {
         // Create new favorite
         const { error } = await supabase
           .from('favorites')
           .insert({ ...favorite, user_id: user.id });
         if (error) throw error;
       }
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
     },
   });
 
   return {
     favorites,
     isLoading,
     incrementFavorite: incrementFavorite.mutate,
     topFavorites: favorites.slice(0, 10),
   };
 }