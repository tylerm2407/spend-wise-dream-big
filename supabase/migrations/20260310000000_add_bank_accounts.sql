-- Linked bank/credit card accounts (Plaid transactions product)
CREATE TABLE IF NOT EXISTS public.linked_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plaid_item_id UUID REFERENCES public.plaid_items(id) ON DELETE CASCADE,
  plaid_account_id TEXT,
  account_name TEXT NOT NULL,
  account_type TEXT, -- 'checking', 'savings', 'credit card', 'other'
  institution_name TEXT,
  mask TEXT, -- last 4 digits
  current_balance NUMERIC,
  available_balance NUMERIC,
  balance_synced_at TIMESTAMP WITH TIME ZONE,
  last_transaction_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.linked_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their linked bank accounts"
  ON public.linked_bank_accounts FOR ALL
  USING (auth.uid() = user_id);

-- Add source-tracking columns to purchases (for import deduplication)
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES public.linked_bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS import_batch_id TEXT;

-- Prevent duplicate Plaid transactions per user
CREATE UNIQUE INDEX IF NOT EXISTS purchases_plaid_tx_dedup
  ON public.purchases(user_id, plaid_transaction_id)
  WHERE plaid_transaction_id IS NOT NULL;
