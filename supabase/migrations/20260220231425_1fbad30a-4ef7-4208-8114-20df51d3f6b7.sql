
-- 1. Fix profiles_select_estabelecimento: restrict to same establishment only
DROP POLICY IF EXISTS "profiles_select_estabelecimento" ON public.profiles;
CREATE POLICY "profiles_select_estabelecimento" ON public.profiles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'estabelecimento'::app_role) 
  AND establishment_id = get_user_establishment(auth.uid())
);

-- 2. Fix vouchers_select_caixa: restrict to same establishment
DROP POLICY IF EXISTS "vouchers_select_caixa" ON public.vouchers;
CREATE POLICY "vouchers_select_caixa" ON public.vouchers
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'caixa'::app_role)
  AND establishment_id = get_user_establishment(auth.uid())
);
