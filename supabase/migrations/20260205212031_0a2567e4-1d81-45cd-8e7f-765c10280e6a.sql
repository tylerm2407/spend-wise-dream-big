-- Add zip_code to profiles for location-based alternatives
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code text;