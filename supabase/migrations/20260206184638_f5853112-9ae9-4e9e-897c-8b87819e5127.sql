
-- Add referral tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN referral_code TEXT UNIQUE,
ADD COLUMN referral_bonus_days INTEGER NOT NULL DEFAULT 0,
ADD COLUMN referred_by UUID REFERENCES public.profiles(id);

-- Generate unique referral codes for existing profiles
UPDATE public.profiles SET referral_code = UPPER(SUBSTRING(id::text, 1, 8));

-- Make referral_code NOT NULL after populating existing rows
ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;

-- Auto-generate referral code for new profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, referral_code)
  VALUES (NEW.id, UPPER(SUBSTRING(NEW.id::text, 1, 8)));
  RETURN NEW;
END;
$function$;

-- Create referrals tracking table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id),
  referred_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rewarded BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (referrer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (referrer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
