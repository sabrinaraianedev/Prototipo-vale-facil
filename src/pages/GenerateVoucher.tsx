import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVouchers } from '@/contexts/VoucherContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Ticket, CheckCircle, Copy, Fuel, AlertCircle, Store, Printer, Settings, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { ThermalReceipt } from '@/components/Voucher/ThermalReceipt';
import { validateBrazilianPlate, formatPlateInput } from '@/lib/validators';

export default function GenerateVoucher() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { voucherTypes, establishments, createVoucher, getEligibleVoucherType, loading } = useVouchers();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const [voucherMode, setVoucherMode] = useState<'predefined' | 'custom'>('predefined');
  
  const [formData, setFormData] = useState({
    liters: '',
    vehiclePlate: '',
    driverName: '',
    receiptNumber: '',
  });
  const [plateError, setPlateError] = useState<string | null>(null);

  // Custom voucher fields
  const [customValue, setCustomValue] = useState('');
  const [customEstablishmentId, setCustomEstablishmentId] = useState('');
  
  const [eligibleType, setEligibleType] = useState<{ 
    id: string; 
    name: string; 
    value: number; 
    minLiters: number;
    establishmentId?: string;
  } | null>(null);
  
  const [generatedVoucher, setGeneratedVoucher] = useState<{
    code: string;
    value: number;
    establishmentName: string;
    driverName: string;
    vehiclePlate: string;
    receiptNumber: string;
    cashierName: string;
    createdAt: Date;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check eligibility when liters change - auto-fill type and establishment (only for predefined mode)
  useEffect(() => {
    if (voucherMode === 'predefined') {
      const liters = parseFloat(formData.liters);
      if (!isNaN(liters) && liters > 0) {
        const eligible = getEligibleVoucherType(liters);
        setEligibleType(eligible);
      } else {
        setEligibleType(null);
      }
    }
  }, [formData.liters, getEligibleVoucherType, voucherMode]);

  const activeTypes = voucherTypes.filter(t => t.active).sort((a, b) => a.minLiters - b.minLiters);
  const activeEstablishments = establishments.filter(e => e.active);

  // Get establishment name for eligible type
  const getEstablishmentName = (establishmentId?: string) => {
    if (!establishmentId) return 'Todos';
    const est = establishments.find(e => e.id === establishmentId);
    return est?.name || 'Desconhecido';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.liters || !formData.vehiclePlate || !formData.driverName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validate plate format
    const plateValidation = validateBrazilianPlate(formData.vehiclePlate);
    if (!plateValidation.valid) {
      toast.error('Placa inválida. Use o formato ABC-1234 ou ABC1D23 (Mercosul)');
      return;
    }

    if (!formData.receiptNumber.trim()) {
      toast.error('O número do cupom fiscal é obrigatório');
      return;
    }

    if (voucherMode === 'predefined') {
      if (!eligibleType) {
        toast.error('Litragem insuficiente para gerar vale');
        return;
      }

      if (!eligibleType.establishmentId) {
        toast.error('Tipo de vale sem estabelecimento definido');
        return;
      }
    } else {
      // Custom mode validations
      const value = parseFloat(customValue);
      if (isNaN(value) || value <= 0) {
        toast.error('Informe um valor válido para o vale');
        return;
      }

      if (!customEstablishmentId) {
        toast.error('Selecione o estabelecimento');
        return;
      }
    }

    setIsSubmitting(true);

    const isCustom = voucherMode === 'custom';
    const voucherValue = isCustom ? parseFloat(customValue) : eligibleType!.value;
    const establishmentId = isCustom ? customEstablishmentId : eligibleType!.establishmentId!;

    const voucher = await createVoucher({
      value: voucherValue,
      voucherTypeId: isCustom ? null : eligibleType!.id,
      vehiclePlate: formData.vehiclePlate.toUpperCase(),
      driverName: formData.driverName,
      liters: parseFloat(formData.liters),
      establishmentId: establishmentId,
      receiptNumber: formData.receiptNumber,
    });

    if (voucher) {
      const estName = getEstablishmentName(establishmentId);
      setGeneratedVoucher({
        code: voucher.code,
        value: voucher.value,
        establishmentName: estName,
        driverName: formData.driverName,
        vehiclePlate: formData.vehiclePlate.toUpperCase(),
        receiptNumber: formData.receiptNumber,
        cashierName: user.name,
        createdAt: new Date(),
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

  // Download thermal receipt PDF (58mm width)
  const downloadThermalPDF = () => {
    if (!generatedVoucher) return;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, 120],
    });

    const centerX = 29;
    let y = 5;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VALE-BRINDE', centerX, y, { align: 'center' });
    y += 5;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(generatedVoucher.createdAt), centerX, y, { align: 'center' });
    y += 6;

    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(3, y, 55, y);
    y += 5;

    const qrElement = document.getElementById('voucher-qr');
    if (qrElement) {
      const svgData = new XMLSerializer().serializeToString(qrElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = 150;
        canvas.height = 150;
        ctx?.drawImage(img, 0, 0, 150, 150);
        const pngData = canvas.toDataURL('image/png');
        
        pdf.addImage(pngData, 'PNG', 9, y, 40, 40);
        y += 44;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(generatedVoucher.code, centerX, y, { align: 'center' });
        y += 5;

        pdf.line(3, y, 55, y);
        y += 5;

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        
        pdf.text(`Valor: ${formatCurrency(generatedVoucher.value)}`, 3, y);
        y += 4;
        
        pdf.text(`Motorista: ${generatedVoucher.driverName}`, 3, y);
        y += 4;
        
        pdf.text(`Placa: ${generatedVoucher.vehiclePlate}`, 3, y);
        y += 4;

        if (generatedVoucher.receiptNumber) {
          pdf.text(`Cupom: ${generatedVoucher.receiptNumber}`, 3, y);
          y += 4;
        }

        pdf.text(`Caixa: ${generatedVoucher.cashierName}`, 3, y);
        y += 5;

        pdf.line(3, y, 55, y);
        y += 4;

        pdf.setFontSize(7);
        pdf.text('Válido somente em:', centerX, y, { align: 'center' });
        y += 4;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text(generatedVoucher.establishmentName, centerX, y, { align: 'center' });
        y += 6;

        pdf.line(3, y, 55, y);
        y += 4;
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Apresente este comprovante', centerX, y, { align: 'center' });
        y += 3;
        pdf.text('no estabelecimento', centerX, y, { align: 'center' });

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
      receiptNumber: '',
    });
    setCustomValue('');
    setCustomEstablishmentId('');
    setGeneratedVoucher(null);
    setEligibleType(null);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const isFormValid = () => {
    const baseValid = formData.liters && formData.vehiclePlate && formData.driverName && formData.receiptNumber.trim();
    const plateValid = validateBrazilianPlate(formData.vehiclePlate).valid;
    
    if (voucherMode === 'predefined') {
      return baseValid && plateValid && eligibleType && eligibleType.establishmentId;
    } else {
      const value = parseFloat(customValue);
      return baseValid && plateValid && !isNaN(value) && value > 0 && customEstablishmentId;
    }
  };

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

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

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Form */}
          <div className="card-elevated p-4 sm:p-6">
            <Tabs value={voucherMode} onValueChange={(v) => setVoucherMode(v as 'predefined' | 'custom')} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="predefined" className="gap-2">
                  <ListChecks className="h-4 w-4" />
                  Pré-definido
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Personalizado
                </TabsTrigger>
              </TabsList>

              <TabsContent value="predefined" className="mt-4 space-y-4">
                {activeTypes.length > 0 && (
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Fuel className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Faixas de Litragem</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeTypes.map((type) => (
                        <div 
                          key={type.id} 
                          className={`p-2 rounded-md border transition-all text-xs ${
                            eligibleType?.id === type.id 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border bg-background'
                          }`}
                        >
                          <p className="text-muted-foreground">A partir de {type.minLiters}L</p>
                          <p className="font-semibold text-foreground">{type.name} - {formatCurrency(type.value)}</p>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Store className="h-3 w-3" />
                            <span>{getEstablishmentName(type.establishmentId)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="custom" className="mt-4 space-y-4">
                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <p className="text-sm text-muted-foreground">
                    Informe manualmente o valor do vale e selecione o estabelecimento onde ele poderá ser utilizado.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customValue">Valor do Vale (R$)</Label>
                  <Input
                    id="customValue"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 25.00"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className="h-11 sm:h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customEstablishment">Estabelecimento</Label>
                  <Select value={customEstablishmentId} onValueChange={setCustomEstablishmentId}>
                    <SelectTrigger className="h-11 sm:h-12">
                      <SelectValue placeholder="Selecione o estabelecimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeEstablishments.map((est) => (
                        <SelectItem key={est.id} value={est.id}>
                          {est.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                {voucherMode === 'predefined' && formData.liters && !eligibleType && (
                  <div className="flex items-center gap-2 text-warning text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Litragem insuficiente para gerar vale</span>
                  </div>
                )}
                {voucherMode === 'predefined' && eligibleType && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-success text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>Vale de {formatCurrency(eligibleType.value)} ({eligibleType.name})</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Store className="h-4 w-4" />
                      <span>Estabelecimento: {getEstablishmentName(eligibleType.establishmentId)}</span>
                    </div>
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
                  placeholder="Ex: ABC-1234 ou ABC1D23"
                  value={formData.vehiclePlate}
                  onChange={(e) => {
                    const formatted = formatPlateInput(e.target.value);
                    setFormData({ ...formData, vehiclePlate: formatted });
                    if (formatted.length >= 7) {
                      const validation = validateBrazilianPlate(formatted);
                      setPlateError(validation.valid ? null : 'Formato inválido. Use ABC-1234 ou ABC1D23');
                    } else {
                      setPlateError(null);
                    }
                  }}
                  className={`h-11 sm:h-12 uppercase ${plateError ? 'border-destructive' : ''}`}
                  maxLength={8}
                />
                {plateError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{plateError}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiptNumber">Número do Cupom Fiscal *</Label>
                <Input
                  id="receiptNumber"
                  placeholder="Ex: 000123"
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                  className="h-11 sm:h-12"
                  required
                />
              </div>

              <Button 
                type="submit" 
                variant="gradient" 
                className="w-full h-11 sm:h-12"
                disabled={!isFormValid() || isSubmitting}
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
                  <ThermalReceipt
                    code={generatedVoucher.code}
                    value={generatedVoucher.value}
                    driverName={generatedVoucher.driverName}
                    vehiclePlate={generatedVoucher.vehiclePlate}
                    establishment={generatedVoucher.establishmentName}
                    receiptNumber={generatedVoucher.receiptNumber}
                    cashierName={generatedVoucher.cashierName}
                    createdAt={generatedVoucher.createdAt}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xl sm:text-2xl font-bold font-mono text-primary break-all">{generatedVoucher.code}</p>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    Valor: <span className="font-bold text-foreground">{formatCurrency(generatedVoucher.value)}</span>
                  </p>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Store className="h-4 w-4" />
                    <span className="text-sm">{generatedVoucher.establishmentName}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="outline" onClick={copyCode} className="w-full sm:w-auto">
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                  <Button variant="outline" onClick={downloadThermalPDF} className="w-full sm:w-auto">
                    <Printer className="h-4 w-4" />
                    Imprimir (Térmica)
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
                <p className="text-xs sm:text-sm">
                  {voucherMode === 'predefined' 
                    ? 'Preencha a litragem para ver o vale elegível'
                    : 'Preencha o valor e selecione o estabelecimento'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
