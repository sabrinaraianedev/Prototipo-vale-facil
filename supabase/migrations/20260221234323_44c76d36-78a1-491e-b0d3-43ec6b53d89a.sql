
-- Drop restrictive INSERT policies and recreate as permissive
DROP POLICY IF EXISTS "vouchers_insert_caixa" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_insert_admin" ON public.vouchers;

CREATE POLICY "vouchers_insert_caixa"
ON public.vouchers
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'caixa'::app_role) AND (cashier_id = auth.uid()));

CREATE POLICY "vouchers_insert_admin"
ON public.vouchers
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also fix SELECT policies so caixa can see their vouchers
DROP POLICY IF EXISTS "vouchers_select_caixa" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_select_admin" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_select_estabelecimento" ON public.vouchers;

CREATE POLICY "vouchers_select_caixa"
ON public.vouchers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'caixa'::app_role) AND (establishment_id = get_user_establishment(auth.uid())));

CREATE POLICY "vouchers_select_admin"
ON public.vouchers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "vouchers_select_estabelecimento"
ON public.vouchers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'estabelecimento'::app_role) AND (establishment_id = get_user_establishment(auth.uid())));

-- Fix UPDATE policies
DROP POLICY IF EXISTS "vouchers_update_estabelecimento" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_update_admin" ON public.vouchers;

CREATE POLICY "vouchers_update_estabelecimento"
ON public.vouchers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'estabelecimento'::app_role) AND (establishment_id = get_user_establishment(auth.uid())) AND (status = 'gerado'::voucher_status))
WITH CHECK (has_role(auth.uid(), 'estabelecimento'::app_role) AND (status = 'utilizado'::voucher_status));

CREATE POLICY "vouchers_update_admin"
ON public.vouchers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix DELETE policy
DROP POLICY IF EXISTS "vouchers_delete_admin" ON public.vouchers;

CREATE POLICY "vouchers_delete_admin"
ON public.vouchers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
