CREATE TABLE public.linked_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plaid_item_id uuid REFERENCES public.plaid_items(id) ON DELETE CASCADE,
  plaid_account_id text,
  account_name text NOT NULL,
  account_type text,
  institution_name text,
  mask text,
  current_balance numeric,
  available_balance numeric,
  balance_synced_at timestamptz,
  last_transaction_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.linked_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own linked accounts" ON public.linked_bank_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own linked accounts" ON public.linked_bank_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own linked accounts" ON public.linked_bank_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own linked accounts" ON public.linked_bank_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);