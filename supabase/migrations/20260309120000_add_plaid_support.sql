
-- Plaid items table: stores access tokens (server-side only via service role)
-- No SELECT policy for authenticated users = access tokens are never exposed client-side
CREATE TABLE public.plaid_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
-- No SELECT policy intentionally — only service role (edge functions) can read access tokens
-- Users can insert their own items through edge functions only
CREATE POLICY "Service role manages plaid items" ON public.plaid_items USING (false);

-- Add Plaid fields to investment_accounts
ALTER TABLE public.investment_accounts
  ADD COLUMN IF NOT EXISTS plaid_item_id UUID REFERENCES public.plaid_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plaid_account_id TEXT,
  ADD COLUMN IF NOT EXISTS plaid_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS plaid_balance_synced_at TIMESTAMP WITH TIME ZONE;
