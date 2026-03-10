-- Performance indexes for high-traffic queries
CREATE INDEX IF NOT EXISTS idx_purchases_user_date
  ON purchases (user_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_purchases_user_category
  ON purchases (user_id, category);

CREATE INDEX IF NOT EXISTS idx_purchases_plaid_tx
  ON purchases (plaid_transaction_id)
  WHERE plaid_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_user
  ON linked_bank_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_investment_accounts_user
  ON investment_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_investment_transfers_user
  ON investment_transfers (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goals_user
  ON goals (user_id);

-- Monthly category budgets table
CREATE TABLE IF NOT EXISTS budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(10,2) NOT NULL CHECK (monthly_limit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category)
);

ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own budget limits"
  ON budget_limits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
