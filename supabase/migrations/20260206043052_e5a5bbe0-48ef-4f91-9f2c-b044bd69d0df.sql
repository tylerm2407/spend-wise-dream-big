-- Create price_history table to track prices over time
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  zip_code TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own price history" 
ON public.price_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own price history" 
ON public.price_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_price_history_product ON public.price_history(user_id, product_name, store_name);
CREATE INDEX idx_price_history_date ON public.price_history(recorded_at DESC);