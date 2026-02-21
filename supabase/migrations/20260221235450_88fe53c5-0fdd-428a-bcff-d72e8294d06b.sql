
-- Fix user_roles SELECT policies to be PERMISSIVE
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;

CREATE POLICY "user_roles_select_own"
ON public.user_roles AS PERMISSIVE
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_roles_select_admin"
ON public.user_roles AS PERMISSIVE
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_insert_admin"
ON public.user_roles AS PERMISSIVE
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_update_admin"
ON public.user_roles AS PERMISSIVE
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_delete_admin"
ON public.user_roles AS PERMISSIVE
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix vouchers INSERT policies back to using has_role (SECURITY DEFINER)
DROP POLICY IF EXISTS "vouchers_insert_caixa" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_insert_admin" ON public.vouchers;

CREATE POLICY "vouchers_insert_caixa"
ON public.vouchers AS PERMISSIVE
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'caixa'::app_role) AND cashier_id = auth.uid());

CREATE POLICY "vouchers_insert_admin"
ON public.vouchers AS PERMISSIVE
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix all other tables' policies to PERMISSIVE too

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_estabelecimento" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "profiles_select_estabelecimento" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'estabelecimento'::app_role) AND establishment_id = public.get_user_establishment(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_admin" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "profiles_update_own" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "profiles_delete_admin" ON public.profiles AS PERMISSIVE FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- establishments
DROP POLICY IF EXISTS "establishments_select_authenticated" ON public.establishments;
DROP POLICY IF EXISTS "establishments_all_admin" ON public.establishments;

CREATE POLICY "establishments_select_authenticated" ON public.establishments AS PERMISSIVE FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "establishments_all_admin" ON public.establishments AS PERMISSIVE FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- voucher_types
DROP POLICY IF EXISTS "voucher_types_select_authenticated" ON public.voucher_types;
DROP POLICY IF EXISTS "voucher_types_all_admin" ON public.voucher_types;

CREATE POLICY "voucher_types_select_authenticated" ON public.voucher_types AS PERMISSIVE FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "voucher_types_all_admin" ON public.voucher_types AS PERMISSIVE FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
