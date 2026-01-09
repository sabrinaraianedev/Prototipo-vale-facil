import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVouchers } from '@/contexts/VoucherContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QrCode, Ticket, CheckCircle, Copy, Download, Fuel, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';

export default function GenerateVoucher() {
  const { user } = useAuth();
  const { voucherTypes, establishments, createVoucher, getEligibleVoucherType, loading } = useVouchers();
  
  const [formData, setFormData] = useState({
    liters: '',
    vehiclePlate: '',
    driverName: '',
    establishmentId: '',
  });
  
  const [eligibleType, setEligibleType] = useState<{ id: string; name: string; value: number; minLiters: number } | null>(null);
  const [generatedVoucher, setGeneratedVoucher] = useState<{
    code: string;
    value: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check eligibility when liters change
  useEffect(() => {
    const liters = parseFloat(formData.liters);
    if (!isNaN(liters) && liters > 0) {
      const eligible = getEligibleVoucherType(liters);
      setEligibleType(eligible);
    } else {
      setEligibleType(null);
    }
  }, [formData.liters, getEligibleVoucherType]);

  const activeTypes = voucherTypes.filter(t => t.active).sort((a, b) => a.minLiters - b.minLiters);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.liters || !formData.vehiclePlate || !formData.driverName || !formData.establishmentId) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (!eligibleType) {
      toast.error('Litragem insuficiente para gerar vale');
      return;
    }

    setIsSubmitting(true);

    const voucher = await createVoucher({
      value: eligibleType.value,
      voucherTypeId: eligibleType.id,
      vehiclePlate: formData.vehiclePlate.toUpperCase(),
      driverName: formData.driverName,
      liters: parseFloat(formData.liters),
      establishmentId: formData.establishmentId,
    });

    if (voucher) {
      setGeneratedVoucher({
        code: voucher.code,
        value: voucher.value,
      });
      toast.success('Vale gerado com sucesso!');
    } else {
      toast.error('Erro ao gerar vale');
    }

    setIsSubmitting(false);
  };

  const copyCode = () => {
    if (generatedVoucher) {
      navigator.clipboard.writeText(generatedVoucher.code);
      toast.success('Código copiado!');
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('voucher-qr');
    if (svg && generatedVoucher) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = 200;
        canvas.height = 200;
        ctx?.drawImage(img, 0, 0, 200, 200);
        const pngData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        pdf.setFontSize(20);
        pdf.text('Vale-Brinde', 105, 30, { align: 'center' });
        
        pdf.addImage(pngData, 'PNG', 65, 50, 80, 80);
        
        pdf.setFontSize(16);
        pdf.text(generatedVoucher.code, 105, 145, { align: 'center' });
        
        pdf.setFontSize(14);
        pdf.text(`Valor: ${formatCurrency(generatedVoucher.value)}`, 105, 160, { align: 'center' });
        
        pdf.save(`vale-${generatedVoucher.code}.pdf`);
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const resetForm = () => {
    setFormData({
      liters: '',
      vehiclePlate: '',
      driverName: '',
      establishmentId: '',
    });
    setGeneratedVoucher(null);
    setEligibleType(null);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Gerar Vale-Brinde</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Preencha os dados para gerar um novo vale</p>
          </div>
        </div>

        {/* Liters Tiers Info */}
        {activeTypes.length > 0 && (
          <div className="card-elevated p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Fuel className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Faixas de Litragem</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {activeTypes.map((type) => (
                <div 
                  key={type.id} 
                  className={`p-3 rounded-lg border-2 transition-all ${
                    eligibleType?.id === type.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-secondary/30'
                  }`}
                >
                  <p className="text-xs sm:text-sm text-muted-foreground">A partir de {type.minLiters}L</p>
                  <p className="font-bold text-foreground text-sm sm:text-base">{type.name}</p>
                  <p className="text-primary font-semibold text-sm">{formatCurrency(type.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Form */}
          <div className="card-elevated p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="liters">Litragem Abastecida</Label>
                <Input
                  id="liters"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 45.5"
                  value={formData.liters}
                  onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                  className="h-11 sm:h-12"
                />
                {formData.liters && !eligibleType && (
                  <div className="flex items-center gap-2 text-warning text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Litragem insuficiente para gerar vale</span>
                  </div>
                )}
                {eligibleType && (
                  <div className="flex items-center gap-2 text-success text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Vale de {formatCurrency(eligibleType.value)} ({eligibleType.name})</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverName">Nome do Motorista</Label>
                <Input
                  id="driverName"
                  placeholder="Ex: João Silva"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  className="h-11 sm:h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehiclePlate">Placa do Veículo</Label>
                <Input
                  id="vehiclePlate"
                  placeholder="Ex: ABC-1234"
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                  className="h-11 sm:h-12 uppercase"
                  maxLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label>Estabelecimento</Label>
                <Select
                  value={formData.establishmentId}
                  onValueChange={(value) => setFormData({ ...formData, establishmentId: value })}
                >
                  <SelectTrigger className="h-11 sm:h-12">
                    <SelectValue placeholder="Onde o vale será utilizado" />
                  </SelectTrigger>
                  <SelectContent>
                    {establishments.map((est) => (
                      <SelectItem key={est.id} value={est.id}>
                        {est.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                variant="gradient" 
                className="w-full h-11 sm:h-12"
                disabled={!eligibleType || isSubmitting}
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Ticket className="h-5 w-5" />
                    Gerar Vale-Brinde
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* QR Code Preview */}
          <div className="card-elevated p-4 sm:p-6 flex flex-col items-center justify-center min-h-[300px]">
            {generatedVoucher ? (
              <div className="text-center space-y-4 sm:space-y-6 animate-scale-in w-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-success" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">Vale Gerado!</h3>
                  <p className="text-sm text-muted-foreground">Escaneie o QR Code ou use o código</p>
                </div>
                
                <div className="p-3 sm:p-4 bg-white rounded-xl mx-auto w-fit">
                  <QRCode
                    id="voucher-qr"
                    value={generatedVoucher.code}
                    size={160}
                    level="H"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-primary break-all">{generatedVoucher.code}</p>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    Valor: <span className="font-bold text-foreground">{formatCurrency(generatedVoucher.value)}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={copyCode} className="w-full sm:w-auto">
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                  <Button variant="outline" onClick={downloadQR} className="w-full sm:w-auto">
                    <Download className="h-4 w-4" />
                    Baixar PDF
                  </Button>
                </div>

                <Button variant="ghost" onClick={resetForm} className="text-muted-foreground">
                  Gerar novo vale
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4 text-muted-foreground">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center mx-auto">
                  <QrCode className="h-10 w-10 sm:h-12 sm:w-12" />
                </div>
                <p className="text-sm sm:text-base">O QR Code aparecerá aqui</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
