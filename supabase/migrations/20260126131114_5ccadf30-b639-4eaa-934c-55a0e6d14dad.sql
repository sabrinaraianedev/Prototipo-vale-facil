-- Corrigir política de RLS para permitir que estabelecimentos atualizem vouchers
DROP POLICY IF EXISTS "Establishments can update voucher status" ON public.vouchers;

CREATE POLICY "Establishments can update voucher status" 
ON public.vouchers 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'estabelecimento'::app_role) 
  AND status = 'gerado'::voucher_status
)
WITH CHECK (
  has_role(auth.uid(), 'estabelecimento'::app_role)
  AND status = 'utilizado'::voucher_status
);

-- Adicionar coluna para número do cupom fiscal
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Comentário para documentação
COMMENT ON COLUMN public.vouchers.receipt_number IS 'Número do cupom fiscal do abastecimento';