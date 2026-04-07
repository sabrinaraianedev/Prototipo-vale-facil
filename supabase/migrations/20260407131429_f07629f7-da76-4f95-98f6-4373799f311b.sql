-- Allow admin to create establishments
CREATE POLICY "establishments_insert_admin"
ON public.establishments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admin to update establishments
CREATE POLICY "establishments_update_admin"
ON public.establishments
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admin to delete establishments
CREATE POLICY "establishments_delete_admin"
ON public.establishments
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admin to see all active establishments (needed for voucher type creation and voucher generation)
CREATE POLICY "establishments_select_admin"
ON public.establishments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);