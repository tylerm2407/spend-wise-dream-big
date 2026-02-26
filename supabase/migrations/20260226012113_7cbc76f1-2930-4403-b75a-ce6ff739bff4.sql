
-- Investment accounts table
CREATE TABLE public.investment_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('roth_ira', 'traditional_ira', '401k', 'brokerage', 'savings', 'other')),
  institution_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Investment transfers table (tracks intended transfers)
CREATE TABLE public.investment_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.investment_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('alternative_savings', 'challenge_savings', 'custom', 'purchase_savings')),
  source_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for investment_accounts
ALTER TABLE public.investment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts" ON public.investment_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own accounts" ON public.investment_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON public.investment_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON public.investment_accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS for investment_transfers
ALTER TABLE public.investment_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transfers" ON public.investment_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transfers" ON public.investment_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transfers" ON public.investment_transfers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transfers" ON public.investment_transfers FOR DELETE USING (auth.uid() = user_id);
