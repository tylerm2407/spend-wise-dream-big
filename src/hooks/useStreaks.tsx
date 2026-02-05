 import { useEffect } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from './useAuth';
 
 interface Achievement {
   id: string;
   user_id: string;
   achievement_type: string;
   achieved_at: string;
 }
 
 const ACHIEVEMENT_DEFINITIONS = [
   { type: 'first_purchase', name: 'First Step', description: 'Logged your first purchase', icon: '🎯' },
   { type: 'streak_7', name: 'Week Warrior', description: '7-day logging streak', icon: '🔥' },
   { type: 'streak_30', name: 'Monthly Master', description: '30-day logging streak', icon: '💪' },
   { type: 'saved_50', name: 'Smart Saver', description: 'Saved $50 with alternatives', icon: '💰' },
   { type: 'saved_100', name: 'Thrifty Pro', description: 'Saved $100 with alternatives', icon: '🏆' },
   { type: 'saved_500', name: 'Savings Champion', description: 'Saved $500 with alternatives', icon: '👑' },
   { type: 'goal_complete', name: 'Goal Getter', description: 'Completed a savings goal', icon: '⭐' },
   { type: 'alt_5', name: 'Alternative Explorer', description: 'Chose 5 alternatives', icon: '🔄' },
   { type: 'alt_25', name: 'Alternative Master', description: 'Chose 25 alternatives', icon: '🎖️' },
 ];
 
 export function useStreaks() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   // Fetch streak data from profile
   const { data: streakData } = useQuery({
     queryKey: ['streak', user?.id],
     queryFn: async () => {
       if (!user) return null;
       
       const { data, error } = await supabase
         .from('profiles')
         .select('login_streak, last_login_date, longest_streak, streak_freezes_remaining')
         .eq('user_id', user.id)
         .single();
       
       if (error) throw error;
       return data;
     },
     enabled: !!user,
   });
 
   // Fetch achievements
   const { data: achievements = [] } = useQuery({
     queryKey: ['achievements', user?.id],
     queryFn: async () => {
       if (!user) return [];
       
       const { data, error } = await supabase
         .from('achievements')
         .select('*')
         .eq('user_id', user.id);
       
       if (error) throw error;
       return data as Achievement[];
     },
     enabled: !!user,
   });
 
   // Update streak on app open
   const updateStreak = useMutation({
     mutationFn: async () => {
       if (!user) return;
       
       const today = new Date().toISOString().split('T')[0];
       const lastLogin = streakData?.last_login_date;
       
       if (lastLogin === today) return; // Already logged today
       
       const yesterday = new Date();
       yesterday.setDate(yesterday.getDate() - 1);
       const yesterdayStr = yesterday.toISOString().split('T')[0];
       
       let newStreak = 1;
       let freezesUsed = 0;
       
       if (lastLogin === yesterdayStr) {
         // Consecutive day
         newStreak = (streakData?.login_streak || 0) + 1;
       } else if (lastLogin && streakData?.streak_freezes_remaining && streakData.streak_freezes_remaining > 0) {
         // Check if within freeze window (2 days)
         const daysBetween = Math.floor((new Date(today).getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
         if (daysBetween <= 3) {
           newStreak = (streakData?.login_streak || 0) + 1;
           freezesUsed = daysBetween - 1;
         }
       }
       
       const longestStreak = Math.max(newStreak, streakData?.longest_streak || 0);
       
       const { error } = await supabase
         .from('profiles')
         .update({
           login_streak: newStreak,
           last_login_date: today,
           longest_streak: longestStreak,
           streak_freezes_remaining: Math.max(0, (streakData?.streak_freezes_remaining || 2) - freezesUsed),
         })
         .eq('user_id', user.id);
       
       if (error) throw error;
       
       // Check for streak achievements
       if (newStreak >= 7) await unlockAchievement('streak_7');
       if (newStreak >= 30) await unlockAchievement('streak_30');
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['streak', user?.id] });
     },
   });
 
   const unlockAchievement = async (achievementType: string) => {
     if (!user) return;
     
     // Check if already unlocked
     const existing = achievements.find(a => a.achievement_type === achievementType);
     if (existing) return;
     
     const { error } = await supabase
       .from('achievements')
       .insert({
         user_id: user.id,
         achievement_type: achievementType,
       });
     
     if (!error) {
       queryClient.invalidateQueries({ queryKey: ['achievements', user?.id] });
     }
   };
 
   // Update streak on mount
   useEffect(() => {
     if (user && streakData !== undefined) {
       updateStreak.mutate();
     }
   }, [user, streakData?.last_login_date]);
 
   const achievementDetails = achievements.map(a => ({
     ...a,
     ...ACHIEVEMENT_DEFINITIONS.find(d => d.type === a.achievement_type),
   }));
 
   const allAchievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
     ...def,
     unlocked: achievements.some(a => a.achievement_type === def.type),
     unlockedAt: achievements.find(a => a.achievement_type === def.type)?.achieved_at,
   }));
 
   return {
     currentStreak: streakData?.login_streak || 0,
     longestStreak: streakData?.longest_streak || 0,
     streakFreezesRemaining: streakData?.streak_freezes_remaining || 2,
     achievements: achievementDetails,
     allAchievements,
     unlockAchievement,
   };
 }