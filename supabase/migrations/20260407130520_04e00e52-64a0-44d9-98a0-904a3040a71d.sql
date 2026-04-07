-- Add policy for caixa users to see voucher_types from their establishment
CREATE POLICY "voucher_types_select_caixa"
ON public.voucher_types
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'caixa'::app_role) 
  AND (
    establishment_id = get_user_establishment(auth.uid())
    OR establishment_id IS NULL
  )
);

-- Add policy for caixa users to see establishments (needed for voucher form)
CREATE POLICY "establishments_select_caixa"
ON public.establishments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'caixa'::app_role)
  AND active = true
);