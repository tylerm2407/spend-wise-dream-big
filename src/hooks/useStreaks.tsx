import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achieved_at: string;
}

export interface StreakEvent {
  type: 'streak_lost' | 'streak_continued' | 'streak_started';
  previousStreak: number;
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

const WELCOME_BACK_MESSAGES = [
  "Welcome back! Every day is a fresh start. 💪",
  "You're here — that's what matters. Let's build a new streak!",
  "Small changes compound. Ready to start fresh?",
  "No worries about the break — what counts is showing up today.",
  "Glad to see you! Your goals are still waiting. 🎯",
];

const ENCOURAGEMENT_MESSAGES = [
  "This isn't about guilt — it's about clarity. You've got this!",
  "The best time to restart is right now. One day at a time.",
  "Missing a few days happens to everyone. Progress isn't linear.",
  "Your longest streak was {longestStreak} days — let's beat it!",
  "Every expert was once a beginner. Keep going! 🚀",
];

export function useStreaks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [streakEvent, setStreakEvent] = useState<StreakEvent | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [encouragementMessage, setEncouragementMessage] = useState('');

  const dismissStreakEvent = useCallback(() => {
    setStreakEvent(null);
  }, []);

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
      let event: StreakEvent | null = null;
      
      if (lastLogin === yesterdayStr) {
        // Consecutive day
        newStreak = (streakData?.login_streak || 0) + 1;
        event = { type: 'streak_continued', previousStreak: streakData?.login_streak || 0 };
      } else if (lastLogin && streakData?.streak_freezes_remaining && streakData.streak_freezes_remaining > 0) {
        // Check if within freeze window (2 days)
        const daysBetween = Math.floor((new Date(today).getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
        if (daysBetween <= 3) {
          newStreak = (streakData?.login_streak || 0) + 1;
          freezesUsed = daysBetween - 1;
          event = { type: 'streak_continued', previousStreak: streakData?.login_streak || 0 };
        } else {
          // Streak lost
          const previousStreak = streakData?.login_streak || 0;
          if (previousStreak > 0) {
            event = { type: 'streak_lost', previousStreak };
          } else {
            event = { type: 'streak_started', previousStreak: 0 };
          }
        }
      } else if (!lastLogin) {
        event = { type: 'streak_started', previousStreak: 0 };
      } else {
        // Streak lost — no freezes available or gap too large
        const previousStreak = streakData?.login_streak || 0;
        if (previousStreak > 0) {
          event = { type: 'streak_lost', previousStreak };
        } else {
          event = { type: 'streak_started', previousStreak: 0 };
        }
      }

      // Set streak event for UI
      if (event) {
        setStreakEvent(event);
        if (event.type === 'streak_lost') {
          const randomWelcome = WELCOME_BACK_MESSAGES[Math.floor(Math.random() * WELCOME_BACK_MESSAGES.length)];
          setWelcomeMessage(randomWelcome);
          let randomEncouragement = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
          randomEncouragement = randomEncouragement.replace('{longestStreak}', String(streakData?.longest_streak || 0));
          setEncouragementMessage(randomEncouragement);
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
    streakEvent,
    welcomeMessage,
    encouragementMessage,
    dismissStreakEvent,
  };
}
