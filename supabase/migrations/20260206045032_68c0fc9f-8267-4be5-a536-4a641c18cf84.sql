-- Create price_alerts table for user-set alerts
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  target_price NUMERIC NOT NULL,
  current_lowest_price NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_triggered BOOLEAN NOT NULL DEFAULT false,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_patterns table to track frequently bought items
CREATE TABLE public.purchase_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  purchase_count INTEGER NOT NULL DEFAULT 1,
  average_price NUMERIC NOT NULL,
  last_purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  auto_alert_enabled BOOLEAN NOT NULL DEFAULT false,
  alert_threshold_percent NUMERIC DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_name)
);

-- Create notifications table for alert history
CREATE TABLE public.price_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_id UUID REFERENCES public.price_alerts(id) ON DELETE SET NULL,
  pattern_id UUID REFERENCES public.purchase_patterns(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  original_price NUMERIC NOT NULL,
  sale_price NUMERIC NOT NULL,
  savings_percent NUMERIC NOT NULL,
  store_name TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for price_alerts
CREATE POLICY "Users can view their own price alerts" 
ON public.price_alerts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own price alerts" 
ON public.price_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price alerts" 
ON public.price_alerts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price alerts" 
ON public.price_alerts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for purchase_patterns
CREATE POLICY "Users can view their own purchase patterns" 
ON public.purchase_patterns FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchase patterns" 
ON public.purchase_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase patterns" 
ON public.purchase_patterns FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchase patterns" 
ON public.purchase_patterns FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for price_notifications
CREATE POLICY "Users can view their own notifications" 
ON public.price_notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notifications" 
ON public.price_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.price_notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.price_notifications FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_price_alerts_user_active ON public.price_alerts(user_id, is_active);
CREATE INDEX idx_purchase_patterns_user ON public.purchase_patterns(user_id, purchase_count DESC);
CREATE INDEX idx_price_notifications_user_unread ON public.price_notifications(user_id, is_read, created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_price_alerts_updated_at
BEFORE UPDATE ON public.price_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_patterns_updated_at
BEFORE UPDATE ON public.purchase_patterns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();