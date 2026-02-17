
-- AI usage tracking table for per-user monthly cost metering
CREATE TABLE public.ai_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  total_cost_cents INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one row per user per month
CREATE UNIQUE INDEX idx_ai_usage_user_period ON public.ai_usage (user_id, period_start);
CREATE INDEX idx_ai_usage_user_id ON public.ai_usage (user_id);

-- Enable RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage
CREATE POLICY "Users can view their own AI usage"
  ON public.ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (edge functions) needs to upsert - allow insert/update for the user
CREATE POLICY "Users can insert their own AI usage"
  ON public.ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI usage"
  ON public.ai_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Atomic upsert function for edge functions to call with service role
CREATE OR REPLACE FUNCTION public.check_and_record_ai_usage(
  p_user_id UUID,
  p_estimated_cost_cents INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start DATE;
  v_current_cost INTEGER;
  v_hard_cap INTEGER := 1000;  -- $10.00
  v_soft_cap INTEGER := 500;   -- $5.00
BEGIN
  -- Current billing period = first day of current month UTC
  v_period_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC')::DATE;

  -- Upsert the row and lock it for update
  INSERT INTO public.ai_usage (user_id, period_start, total_cost_cents, total_requests, last_updated_at)
  VALUES (p_user_id, v_period_start, 0, 0, NOW())
  ON CONFLICT (user_id, period_start) DO NOTHING;

  -- Lock the row for atomic read-then-update
  SELECT total_cost_cents INTO v_current_cost
  FROM public.ai_usage
  WHERE user_id = p_user_id AND period_start = v_period_start
  FOR UPDATE;

  -- Check hard cap
  IF v_current_cost + p_estimated_cost_cents > v_hard_cap THEN
    RETURN 'hard_cap';
  END IF;

  -- Check soft cap (block at $5)
  IF v_current_cost + p_estimated_cost_cents > v_soft_cap THEN
    RETURN 'soft_cap';
  END IF;

  -- Under cap: record usage
  UPDATE public.ai_usage
  SET total_cost_cents = total_cost_cents + p_estimated_cost_cents,
      total_requests = total_requests + 1,
      last_updated_at = NOW()
  WHERE user_id = p_user_id AND period_start = v_period_start;

  RETURN 'ok';
END;
$$;
