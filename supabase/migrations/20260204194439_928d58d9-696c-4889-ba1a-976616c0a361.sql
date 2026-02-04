-- Create saved_alternatives table to track saved/dismissed alternatives
CREATE TABLE public.saved_alternatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
  alternative_name TEXT NOT NULL,
  original_amount NUMERIC NOT NULL,
  alternative_price NUMERIC NOT NULL,
  savings NUMERIC NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_alternatives ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved alternatives"
ON public.saved_alternatives FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved alternatives"
ON public.saved_alternatives FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved alternatives"
ON public.saved_alternatives FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved alternatives"
ON public.saved_alternatives FOR DELETE
USING (auth.uid() = user_id);

-- Create weekly_challenges table to track challenge progress
CREATE TABLE public.weekly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  target_savings NUMERIC NOT NULL DEFAULT 50,
  actual_savings NUMERIC NOT NULL DEFAULT 0,
  alternatives_chosen INTEGER NOT NULL DEFAULT 0,
  streak_count INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own challenges"
ON public.weekly_challenges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges"
ON public.weekly_challenges FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
ON public.weekly_challenges FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_weekly_challenges_updated_at
BEFORE UPDATE ON public.weekly_challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();