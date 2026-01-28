-- Fix: Drop the overly permissive policy for establishments
DROP POLICY IF EXISTS "Establishments can view vouchers for their establishment" ON public.vouchers;

-- Create a proper policy that restricts establishments to view only vouchers from their assigned establishment
-- First, we need to link establishments to users. Let's add an establishment_id to profiles for establishment users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS establishment_id uuid REFERENCES public.establishments(id);

-- Create a security definer function to get user's establishment
CREATE OR REPLACE FUNCTION public.get_user_establishment(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Create a proper RLS policy for establishments - they can only see vouchers for their assigned establishment
CREATE POLICY "Establishments can view their own vouchers"
ON public.vouchers
FOR SELECT
USING (
  has_role(auth.uid(), 'estabelecimento'::app_role) 
  AND establishment_id = get_user_establishment(auth.uid())
);

-- Update the establishments update policy to also check establishment ownership
DROP POLICY IF EXISTS "Establishments can update voucher status" ON public.vouchers;

CREATE POLICY "Establishments can update their voucher status"
ON public.vouchers
FOR UPDATE
USING (
  has_role(auth.uid(), 'estabelecimento'::app_role) 
  AND establishment_id = get_user_establishment(auth.uid())
  AND status = 'gerado'::voucher_status
)
WITH CHECK (
  has_role(auth.uid(), 'estabelecimento'::app_role) 
  AND status = 'utilizado'::voucher_status
);