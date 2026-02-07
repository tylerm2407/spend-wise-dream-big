import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { startOfWeek, endOfWeek, format } from 'date-fns';

interface WeeklyChallenge {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  target_savings: number;
  actual_savings: number;
  alternatives_chosen: number;
  streak_count: number;
  is_completed: boolean;
  reward_claimed: boolean;
  created_at: string;
  updated_at: string;
}

export function useWeeklyChallenge() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Compute a smart default based on income
  const defaultTarget = (() => {
    if (profile?.monthly_income) {
      // ~5% of monthly income, rounded to nearest 5
      const suggested = Math.round((Number(profile.monthly_income) * 0.05) / 5) * 5;
      return Math.max(10, Math.min(suggested, 500));
    }
    return 50;
  })();

  const { data: currentChallenge, isLoading } = useQuery({
    queryKey: ['weekly-challenge', user?.id, weekStart],
    queryFn: async () => {
      if (!user) return null;
      
      // Try to get existing challenge for this week
      const { data, error } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) return data as WeeklyChallenge;
      
      // Create new challenge if doesn't exist
      const { data: lastChallenge } = await supabase
        .from('weekly_challenges')
        .select('streak_count, is_completed, target_savings')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const streakCount = lastChallenge?.is_completed ? (lastChallenge.streak_count || 0) + 1 : 0;
      
      // Use previous user-set target if available, otherwise use smart default
      const target = lastChallenge?.target_savings ? Number(lastChallenge.target_savings) : defaultTarget;
      
      const { data: newChallenge, error: createError } = await supabase
        .from('weekly_challenges')
        .insert({
          user_id: user.id,
          week_start: weekStart,
          week_end: weekEnd,
          target_savings: target,
          streak_count: streakCount,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      return newChallenge as WeeklyChallenge;
    },
    enabled: !!user,
  });

  const { data: challengeHistory = [] } = useQuery({
    queryKey: ['challenge-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return data as WeeklyChallenge[];
    },
    enabled: !!user,
  });

  const updateChallenge = useMutation({
    mutationFn: async (updates: Partial<WeeklyChallenge>) => {
      if (!user || !currentChallenge) throw new Error('No challenge found');
      
      const { data, error } = await supabase
        .from('weekly_challenges')
        .update(updates)
        .eq('id', currentChallenge.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-challenge', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['challenge-history', user?.id] });
    },
  });

  const recordSavings = async (savingsAmount: number) => {
    if (!currentChallenge) return;
    
    const newActualSavings = Number(currentChallenge.actual_savings) + savingsAmount;
    const newAlternativesChosen = currentChallenge.alternatives_chosen + 1;
    const isCompleted = newActualSavings >= Number(currentChallenge.target_savings);
    
    await updateChallenge.mutateAsync({
      actual_savings: newActualSavings,
      alternatives_chosen: newAlternativesChosen,
      is_completed: isCompleted,
    });
  };

  const updateTarget = async (newTarget: number) => {
    if (!currentChallenge) return;
    
    const isCompleted = Number(currentChallenge.actual_savings) >= newTarget;
    
    await updateChallenge.mutateAsync({
      target_savings: newTarget,
      is_completed: isCompleted,
    });
  };

  const claimReward = async () => {
    if (!currentChallenge || !currentChallenge.is_completed) return;
    
    await updateChallenge.mutateAsync({
      reward_claimed: true,
    });
  };

  const progressPercent = currentChallenge
    ? Math.min(100, Math.round((Number(currentChallenge.actual_savings) / Number(currentChallenge.target_savings)) * 100))
    : 0;

  return {
    currentChallenge,
    challengeHistory,
    isLoading,
    recordSavings,
    updateTarget,
    claimReward,
    progressPercent,
    weekStart,
    weekEnd,
    defaultTarget,
  };
}
