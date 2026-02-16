
-- achievements: allow UPDATE and DELETE
CREATE POLICY "Users can update their own achievements"
ON public.achievements FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own achievements"
ON public.achievements FOR DELETE USING (auth.uid() = user_id);

-- price_history: allow UPDATE and DELETE
CREATE POLICY "Users can update their own price history"
ON public.price_history FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price history"
ON public.price_history FOR DELETE USING (auth.uid() = user_id);

-- referrals: allow UPDATE and DELETE
CREATE POLICY "Users can update their own referrals"
ON public.referrals FOR UPDATE USING (referrer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own referrals"
ON public.referrals FOR DELETE USING (referrer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
