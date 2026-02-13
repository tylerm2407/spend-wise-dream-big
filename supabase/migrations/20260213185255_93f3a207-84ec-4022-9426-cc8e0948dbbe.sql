CREATE POLICY "Users can delete their own challenges" 
ON public.weekly_challenges 
FOR DELETE 
USING (auth.uid() = user_id);