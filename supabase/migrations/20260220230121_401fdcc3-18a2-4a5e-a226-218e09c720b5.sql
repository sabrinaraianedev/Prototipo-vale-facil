
-- =============================================
-- COMPLETE DATABASE REBUILD - ValeFácil
-- =============================================

-- 1. DROP ALL EXISTING RLS POLICIES
-- establishments
DROP POLICY IF EXISTS "Authenticated users can view active establishments" ON public.establishments;
DROP POLICY IF EXISTS "Admins can manage establishments" ON public.establishments;

-- voucher_types
DROP POLICY IF EXISTS "Authenticated users can view active voucher types" ON public.voucher_types;
DROP POLICY IF EXISTS "Admins can manage voucher types" ON public.voucher_types;

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- vouchers
DROP POLICY IF EXISTS "Admins can view all vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Cashiers can view all vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Establishments can view their own vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Cashiers can create vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Establishments can update their voucher status" ON public.vouchers;
DROP POLICY IF EXISTS "Admins can delete vouchers" ON public.vouchers;

-- =============================================
-- 2. RECREATE ALL POLICIES AS PERMISSIVE
-- =============================================

-- ESTABLISHMENTS
CREATE POLICY "establishments_select_authenticated"
ON public.establishments FOR SELECT TO authenticated
USING ((active = true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "establishments_all_admin"
ON public.establishments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- VOUCHER_TYPES
CREATE POLICY "voucher_types_select_authenticated"
ON public.voucher_types FOR SELECT TO authenticated
USING ((active = true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "voucher_types_all_admin"
ON public.voucher_types FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- PROFILES
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_select_estabelecimento"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'estabelecimento'::app_role));

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_admin"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_update_admin"
ON public.profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_delete_admin"
ON public.profiles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- USER_ROLES
CREATE POLICY "user_roles_select_own"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_roles_select_admin"
ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_insert_admin"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_update_admin"
ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_delete_admin"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- VOUCHERS
CREATE POLICY "vouchers_select_admin"
ON public.vouchers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "vouchers_select_caixa"
ON public.vouchers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'caixa'::app_role));

CREATE POLICY "vouchers_select_estabelecimento"
ON public.vouchers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'estabelecimento'::app_role) AND establishment_id = get_user_establishment(auth.uid()));

CREATE POLICY "vouchers_insert_caixa"
ON public.vouchers FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'caixa'::app_role) AND cashier_id = auth.uid());

CREATE POLICY "vouchers_insert_admin"
ON public.vouchers FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "vouchers_update_estabelecimento"
ON public.vouchers FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'estabelecimento'::app_role) AND establishment_id = get_user_establishment(auth.uid()) AND status = 'gerado'::voucher_status)
WITH CHECK (has_role(auth.uid(), 'estabelecimento'::app_role) AND status = 'utilizado'::voucher_status);

CREATE POLICY "vouchers_update_admin"
ON public.vouchers FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "vouchers_delete_admin"
ON public.vouchers FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. RECREATE TRIGGER FOR NEW USER PROFILE
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
