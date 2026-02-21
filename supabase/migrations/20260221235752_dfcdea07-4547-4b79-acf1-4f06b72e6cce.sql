
-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Nuclear fix: temporarily replace with simple policy to test
DROP POLICY IF EXISTS "vouchers_insert_caixa" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_insert_admin" ON public.vouchers;

-- Very simple: any authenticated user can insert if cashier_id = their id
CREATE POLICY "vouchers_insert_authenticated"
ON public.vouchers AS PERMISSIVE
FOR INSERT TO authenticated
WITH CHECK (cashier_id = auth.uid());
