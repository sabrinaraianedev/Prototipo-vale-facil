
-- Fix: SELECT policy for caixa should allow seeing vouchers they created (by cashier_id)
-- not just by establishment_id (which can be NULL)
DROP POLICY IF EXISTS "vouchers_select_caixa" ON public.vouchers;

CREATE POLICY "vouchers_select_caixa"
ON public.vouchers AS PERMISSIVE
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'caixa'::app_role) AND cashier_id = auth.uid()
);
