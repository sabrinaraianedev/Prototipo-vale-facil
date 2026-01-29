
-- Drop the restrictive policy that's not working correctly
DROP POLICY IF EXISTS "Cashiers can view all vouchers for redemption" ON public.vouchers;

-- Also drop the old restrictive policy that limits cashiers to their own vouchers
DROP POLICY IF EXISTS "Cashiers can view their own vouchers" ON public.vouchers;

-- Create a single PERMISSIVE policy that allows cashiers to view ALL vouchers
CREATE POLICY "Cashiers can view all vouchers"
ON public.vouchers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'caixa'::app_role));
