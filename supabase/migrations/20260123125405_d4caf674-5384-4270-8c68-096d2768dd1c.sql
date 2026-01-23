-- Add establishment_id to voucher_types to link voucher types to specific establishments
ALTER TABLE public.voucher_types ADD COLUMN establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_voucher_types_establishment ON public.voucher_types(establishment_id);