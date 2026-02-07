-- Add daily_budget column to profiles
ALTER TABLE public.profiles ADD COLUMN daily_budget numeric DEFAULT NULL;

-- Create a security definer function to get anonymized community challenge stats
-- This avoids RLS issues since it aggregates across all users
CREATE OR REPLACE FUNCTION public.get_community_challenge_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_participants', COUNT(DISTINCT user_id),
    'completed_count', COUNT(*) FILTER (WHERE is_completed = true),
    'total_count', COUNT(*),
    'avg_savings', ROUND(AVG(actual_savings)::numeric, 2),
    'completion_rate', CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE is_completed = true)::numeric / COUNT(*)::numeric) * 100)
      ELSE 0
    END
  )
  FROM public.weekly_challenges
  WHERE week_start >= (CURRENT_DATE - INTERVAL '7 days')
$$;
