-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'caixa', 'estabelecimento');

-- Create enum for voucher status
CREATE TYPE public.voucher_status AS ENUM ('gerado', 'utilizado', 'cancelado');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create establishments table
CREATE TABLE public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voucher_types table (with minimum liters requirement)
CREATE TABLE public.voucher_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  min_liters NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vouchers table
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  value NUMERIC(10,2) NOT NULL,
  voucher_type_id UUID REFERENCES public.voucher_types(id),
  vehicle_plate TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  liters NUMERIC(10,2) NOT NULL,
  establishment_id UUID REFERENCES public.establishments(id) NOT NULL,
  cashier_id UUID REFERENCES auth.users(id) NOT NULL,
  redeemed_by UUID REFERENCES auth.users(id),
  status voucher_status NOT NULL DEFAULT 'gerado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Profile policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profiles" 
ON public.profiles FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies (admin only)
CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" 
ON public.user_roles FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Establishments policies
CREATE POLICY "Authenticated users can view active establishments" 
ON public.establishments FOR SELECT 
TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage establishments" 
ON public.establishments FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Voucher types policies
CREATE POLICY "Authenticated users can view active voucher types" 
ON public.voucher_types FOR SELECT 
TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage voucher types" 
ON public.voucher_types FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Vouchers policies
CREATE POLICY "Admins can view all vouchers" 
ON public.vouchers FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cashiers can view their own vouchers" 
ON public.vouchers FOR SELECT 
USING (public.has_role(auth.uid(), 'caixa') AND cashier_id = auth.uid());

CREATE POLICY "Establishments can view vouchers for their establishment" 
ON public.vouchers FOR SELECT 
USING (public.has_role(auth.uid(), 'estabelecimento'));

CREATE POLICY "Cashiers can create vouchers" 
ON public.vouchers FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'caixa') AND cashier_id = auth.uid());

CREATE POLICY "Establishments can update voucher status" 
ON public.vouchers FOR UPDATE 
USING (public.has_role(auth.uid(), 'estabelecimento') AND status = 'gerado');

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voucher_types_updated_at
BEFORE UPDATE ON public.voucher_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'name', new.email), new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Generate unique voucher code function
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Insert default establishments
INSERT INTO public.establishments (name) VALUES 
  ('Posto Shell Centro'),
  ('Conveniência 24h'),
  ('Churrascaria Gaúcha');