
-- Add cpf and cargo columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo text;

-- Drop funcionarios table and its policies
DROP POLICY IF EXISTS "funcionarios_delete" ON public.funcionarios;
DROP POLICY IF EXISTS "funcionarios_select" ON public.funcionarios;
DROP POLICY IF EXISTS "funcionarios_insert" ON public.funcionarios;
DROP POLICY IF EXISTS "funcionarios_update" ON public.funcionarios;
DROP TABLE IF EXISTS public.funcionarios;
