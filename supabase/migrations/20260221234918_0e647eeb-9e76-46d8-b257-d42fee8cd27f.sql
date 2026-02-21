
-- Drop and recreate with explicit AS PERMISSIVE
DROP POLICY IF EXISTS "vouchers_insert_caixa" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_insert_admin" ON public.vouchers;

-- Simple permissive policy for any authenticated user with caixa role
CREATE POLICY "vouchers_insert_caixa"
ON public.vouchers
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'caixa'
  AND cashier_id = auth.uid()
);

CREATE POLICY "vouchers_insert_admin"
ON public.vouchers
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);
