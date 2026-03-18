
-- Create plano enum
CREATE TYPE public.plano_tipo AS ENUM ('basico', 'pro', 'enterprise');

-- Add plano and status to establishments
ALTER TABLE public.establishments 
  ADD COLUMN IF NOT EXISTS plano public.plano_tipo NOT NULL DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo';

-- Create funcionarios table
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf text,
  setor text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.user_in_same_establishment(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p1.establishment_id = p2.establishment_id
    WHERE p1.id = auth.uid()
    AND p2.id = _target_user_id
    AND p1.establishment_id IS NOT NULL
  )
$$;

-- Trigger for funcionarios updated_at
CREATE TRIGGER update_funcionarios_updated_at
  BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for funcionarios
CREATE POLICY "funcionarios_select" ON public.funcionarios
  FOR SELECT TO authenticated
  USING (
    establishment_id = get_user_establishment(auth.uid())
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "funcionarios_insert" ON public.funcionarios
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "funcionarios_update" ON public.funcionarios
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "funcionarios_delete" ON public.funcionarios
  FOR DELETE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

-- Update VOUCHERS RLS
DROP POLICY IF EXISTS "vouchers_select_admin" ON public.vouchers;
CREATE POLICY "vouchers_select_admin" ON public.vouchers
  FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "vouchers_update_admin" ON public.vouchers;
CREATE POLICY "vouchers_update_admin" ON public.vouchers
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "vouchers_delete_admin" ON public.vouchers;
CREATE POLICY "vouchers_delete_admin" ON public.vouchers
  FOR DELETE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

-- Update PROFILES RLS
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );

-- Update USER_ROLES RLS
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND user_in_same_establishment(user_id))
    OR has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') AND user_in_same_establishment(user_id))
    OR has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
CREATE POLICY "user_roles_update_admin" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND user_in_same_establishment(user_id))
    OR has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;
CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND user_in_same_establishment(user_id))
    OR has_role(auth.uid(), 'super_admin')
  );

-- Update ESTABLISHMENTS RLS
DROP POLICY IF EXISTS "establishments_select_authenticated" ON public.establishments;
CREATE POLICY "establishments_select_authenticated" ON public.establishments
  FOR SELECT TO authenticated
  USING (
    id = get_user_establishment(auth.uid())
    OR has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "establishments_all_admin" ON public.establishments;
CREATE POLICY "establishments_all_admin" ON public.establishments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Update VOUCHER_TYPES RLS
DROP POLICY IF EXISTS "voucher_types_select_authenticated" ON public.voucher_types;
CREATE POLICY "voucher_types_select_authenticated" ON public.voucher_types
  FOR SELECT TO authenticated
  USING (
    (establishment_id = get_user_establishment(auth.uid()) AND (active = true OR has_role(auth.uid(), 'admin')))
    OR has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "voucher_types_all_admin" ON public.voucher_types;
CREATE POLICY "voucher_types_all_admin" ON public.voucher_types
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    (has_role(auth.uid(), 'admin') AND establishment_id = get_user_establishment(auth.uid()))
    OR has_role(auth.uid(), 'super_admin')
  );
