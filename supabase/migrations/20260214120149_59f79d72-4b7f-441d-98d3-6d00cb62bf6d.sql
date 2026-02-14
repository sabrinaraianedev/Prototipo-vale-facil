
-- Drop all existing restrictive SELECT policies on vouchers
DROP POLICY IF EXISTS "Admins can view all vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Cashiers can view all vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Establishments can view their own vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Cashiers can create vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Establishments can update their voucher status" ON public.vouchers;
DROP POLICY IF EXISTS "Admins can delete vouchers" ON public.vouchers;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can view all vouchers"
ON public.vouchers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Cashiers can view all vouchers"
ON public.vouchers FOR SELECT
USING (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "Establishments can view their own vouchers"
ON public.vouchers FOR SELECT
USING (has_role(auth.uid(), 'estabelecimento'::app_role) AND establishment_id = get_user_establishment(auth.uid()));

CREATE POLICY "Cashiers can create vouchers"
ON public.vouchers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'caixa'::app_role) AND cashier_id = auth.uid());

CREATE POLICY "Establishments can update their voucher status"
ON public.vouchers FOR UPDATE
USING (has_role(auth.uid(), 'estabelecimento'::app_role) AND establishment_id = get_user_establishment(auth.uid()) AND status = 'gerado'::voucher_status)
WITH CHECK (has_role(auth.uid(), 'estabelecimento'::app_role) AND status = 'utilizado'::voucher_status);

CREATE POLICY "Admins can delete vouchers"
ON public.vouchers FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
