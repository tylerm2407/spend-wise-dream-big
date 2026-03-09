
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

CREATE POLICY "Service role manages plaid items" ON public.plaid_items USING (false);

ALTER TABLE public.investment_accounts
  ADD COLUMN IF NOT EXISTS plaid_item_id UUID REFERENCES public.plaid_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plaid_account_id TEXT,
  ADD COLUMN IF NOT EXISTS plaid_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS plaid_balance_synced_at TIMESTAMP WITH TIME ZONE;
