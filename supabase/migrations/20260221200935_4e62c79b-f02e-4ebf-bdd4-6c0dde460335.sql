
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS iap_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iap_product_id text,
  ADD COLUMN IF NOT EXISTS iap_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS iap_updated_at timestamptz;
