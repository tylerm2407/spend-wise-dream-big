
-- Create user_access table for cross-app subscription caching
CREATE TABLE public.user_access (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  novawealth_subscriber boolean NOT NULL DEFAULT false,
  standalone_subscriber boolean NOT NULL DEFAULT false,
  last_novawealth_check timestamptz
);

-- Enable RLS
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own row
CREATE POLICY "Users can view their own access" ON public.user_access
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own access" ON public.user_access
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own access" ON public.user_access
  FOR UPDATE USING (auth.uid() = id);

-- Service role needs to upsert from edge functions, which bypasses RLS by default
