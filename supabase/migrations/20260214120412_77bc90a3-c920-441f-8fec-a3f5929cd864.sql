
-- Fix establishments policies (RESTRICTIVE -> PERMISSIVE)
DROP POLICY IF EXISTS "Authenticated users can view active establishments" ON public.establishments;
DROP POLICY IF EXISTS "Admins can manage establishments" ON public.establishments;

CREATE POLICY "Authenticated users can view active establishments"
ON public.establishments FOR SELECT
USING ((active = true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage establishments"
ON public.establishments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix voucher_types policies
DROP POLICY IF EXISTS "Authenticated users can view active voucher types" ON public.voucher_types;
DROP POLICY IF EXISTS "Admins can manage voucher types" ON public.voucher_types;

CREATE POLICY "Authenticated users can view active voucher types"
ON public.voucher_types FOR SELECT
USING ((active = true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage voucher types"
ON public.voucher_types FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
