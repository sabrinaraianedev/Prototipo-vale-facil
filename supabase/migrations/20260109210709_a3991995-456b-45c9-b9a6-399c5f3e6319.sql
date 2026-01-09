-- Fix the overly permissive INSERT policy on profiles
-- This policy is needed for the trigger that creates profiles on signup
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Create a more specific INSERT policy - users can create their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);