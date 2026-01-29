
-- Allow cashiers to view all vouchers for redemption purposes
CREATE POLICY "Cashiers can view all vouchers for redemption"
ON public.vouchers
FOR SELECT
USING (has_role(auth.uid(), 'caixa'::app_role));
