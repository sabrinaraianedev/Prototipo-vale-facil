-- Create policy to allow admins to delete vouchers
CREATE POLICY "Admins can delete vouchers" 
ON public.vouchers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy to allow admins to delete profiles
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy to allow admins to delete user_roles
CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));