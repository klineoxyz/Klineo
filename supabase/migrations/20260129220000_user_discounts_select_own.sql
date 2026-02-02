-- Allow users to SELECT their own user_discounts (so they can see assigned discounts on profile)
DROP POLICY IF EXISTS "user_discounts_select" ON public.user_discounts;
CREATE POLICY "user_discounts_select" ON public.user_discounts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  OR (user_id = auth.uid())
);
