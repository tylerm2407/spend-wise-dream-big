-- Add Plaid-related columns to purchases
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS plaid_transaction_id text,
  ADD COLUMN IF NOT EXISTS linked_account_id uuid,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid;

-- Unique constraint to prevent duplicate Plaid transaction imports
CREATE UNIQUE INDEX IF NOT EXISTS purchases_plaid_transaction_id_key
  ON public.purchases (plaid_transaction_id)
  WHERE plaid_transaction_id IS NOT NULL;

-- Unique constraint on linked_bank_accounts for upsert
ALTER TABLE public.linked_bank_accounts
  ADD CONSTRAINT linked_bank_accounts_user_plaid_account UNIQUE (user_id, plaid_account_id);