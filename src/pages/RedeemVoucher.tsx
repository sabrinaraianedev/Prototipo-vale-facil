import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVouchers, Voucher } from '@/contexts/VoucherContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Search, CheckCircle, XCircle, AlertTriangle, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function RedeemVoucher() {
  const { user } = useAuth();
  const { redeemVoucher, getVoucherByCode } = useVouchers();
  
  const [code, setCode] = useState('');
  const [searchedVoucher, setSearchedVoucher] = useState<Voucher | null>(null);
  const [searchError, setSearchError] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSearch = () => {
    setSearchError('');
    setSearchedVoucher(null);
    setShowSuccess(false);

    if (!code.trim()) {
      setSearchError('Digite o código do vale');
      return;
    }

    const voucher = getVoucherByCode(code.toUpperCase());
    
    if (!voucher) {
      setSearchError('Vale não encontrado');
      return;
    }

    setSearchedVoucher(voucher);
  };

  const handleRedeem = async () => {
    if (!searchedVoucher || !user) return;
    
    setIsRedeeming(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = redeemVoucher(searchedVoucher.code, user.name);
    
    if (result.success) {
      setShowSuccess(true);
      setSearchedVoucher(result.voucher || null);
      toast.success('Vale resgatado com sucesso!');
    } else {
      toast.error(result.error || 'Erro ao resgatar vale');
    }
    
    setIsRedeeming(false);
  };

  const resetSearch = () => {
    setCode('');
    setSearchedVoucher(null);
    setSearchError('');
    setShowSuccess(false);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (date: Date) => 
    new Intl.DateTimeFormat('pt-BR', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    }).format(date);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <QrCode className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Resgatar Vale</h1>
            <p className="text-muted-foreground">Digite o código ou escaneie o QR Code</p>
          </div>
        </div>

        {/* Search Form */}
        <div className="card-elevated p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código do Vale</Label>
              <div className="flex gap-3">
                <Input
                  id="code"
                  placeholder="Ex: VF-ABC12345"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-12 flex-1 font-mono uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} className="h-12 px-6">
                  <Search className="h-5 w-5" />
                  Buscar
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button variant="outline" className="w-full h-12" disabled>
              <Camera className="h-5 w-5" />
              Escanear QR Code
              <span className="text-xs text-muted-foreground ml-2">(Em breve)</span>
            </Button>
          </div>
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="card-elevated p-6 border-destructive/50 animate-fade-in">
            <div className="flex items-center gap-4 text-destructive">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">{searchError}</h3>
                <p className="text-sm text-muted-foreground">Verifique o código e tente novamente</p>
              </div>
            </div>
          </div>
        )}

        {/* Voucher Found */}
        {searchedVoucher && (
          <div className={cn(
            "card-elevated p-6 animate-scale-in",
            showSuccess && "border-success/50"
          )}>
            {showSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto animate-pulse-glow">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Vale Resgatado!</h3>
                  <p className="text-muted-foreground">O vale foi utilizado com sucesso</p>
                </div>
                <p className="text-3xl font-bold text-success">{formatCurrency(searchedVoucher.value)}</p>
                <Button variant="ghost" onClick={resetSearch}>
                  Resgatar outro vale
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    searchedVoucher.status === 'gerado' && "bg-success/20 text-success",
                    searchedVoucher.status === 'utilizado' && "bg-destructive/20 text-destructive",
                    searchedVoucher.status === 'cancelado' && "bg-muted text-muted-foreground"
                  )}>
                    {searchedVoucher.status === 'gerado' && '✓ Válido'}
                    {searchedVoucher.status === 'utilizado' && '✗ Já utilizado'}
                    {searchedVoucher.status === 'cancelado' && '✗ Cancelado'}
                  </span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(searchedVoucher.value)}</span>
                </div>

                {/* Voucher Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Código</p>
                    <p className="font-mono font-medium">{searchedVoucher.code}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</p>
                    <p className="font-medium capitalize">{searchedVoucher.type}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Motorista</p>
                    <p className="font-medium">{searchedVoucher.driverName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Placa</p>
                    <p className="font-mono font-medium">{searchedVoucher.vehiclePlate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Gerado em</p>
                    <p className="font-medium">{formatDate(searchedVoucher.createdAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Caixa</p>
                    <p className="font-medium">{searchedVoucher.cashierName}</p>
                  </div>
                </div>

                {/* Action */}
                {searchedVoucher.status === 'gerado' ? (
                  <Button 
                    variant="gradient" 
                    className="w-full h-12"
                    onClick={handleRedeem}
                    disabled={isRedeeming}
                  >
                    {isRedeeming ? (
                      <>
                        <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Confirmar Resgate
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      Este vale não pode ser resgatado
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
