import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVouchers, VoucherType } from '@/contexts/VoucherContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QrCode, Ticket, CheckCircle, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';

export default function GenerateVoucher() {
  const { user } = useAuth();
  const { voucherTypes, createVoucher } = useVouchers();
  
  const [formData, setFormData] = useState({
    value: '',
    vehiclePlate: '',
    driverName: '',
    establishment: '',
    type: '' as VoucherType | '',
  });
  
  const [generatedVoucher, setGeneratedVoucher] = useState<{
    code: string;
    value: number;
  } | null>(null);

  const establishments = [
    { value: 'Conveniência', label: 'Conveniência' },
    { value: 'Posto', label: 'Posto' },
    { value: 'Churrascaria', label: 'Churrascaria' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.value || !formData.vehiclePlate || !formData.driverName || !formData.establishment || !formData.type) {
      toast.error('Preencha todos os campos');
      return;
    }

    const voucher = createVoucher({
      value: parseFloat(formData.value),
      vehiclePlate: formData.vehiclePlate.toUpperCase(),
      driverName: formData.driverName,
      establishment: formData.establishment,
      type: formData.type as VoucherType,
      cashierId: user.id,
      cashierName: user.name,
    });

    setGeneratedVoucher({
      code: voucher.code,
      value: voucher.value,
    });

    toast.success('Vale gerado com sucesso!');
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
        
        // Criar PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Título
        pdf.setFontSize(20);
        pdf.text('Vale-Brinde', 105, 30, { align: 'center' });
        
        // QR Code
        pdf.addImage(pngData, 'PNG', 65, 50, 80, 80);
        
        // Código
        pdf.setFontSize(16);
        pdf.text(generatedVoucher.code, 105, 145, { align: 'center' });
        
        // Valor
        pdf.setFontSize(14);
        pdf.text(`Valor: ${formatCurrency(generatedVoucher.value)}`, 105, 160, { align: 'center' });
        
        // Download
        pdf.save(`vale-${generatedVoucher.code}.pdf`);
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const resetForm = () => {
    setFormData({
      value: '',
      vehiclePlate: '',
      driverName: '',
      establishment: '',
      type: '',
    });
    setGeneratedVoucher(null);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const activeTypes = voucherTypes.filter(t => t.active);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <QrCode className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Gerar Vale-Brinde</h1>
            <p className="text-muted-foreground">Preencha os dados para gerar um novo vale</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="card-elevated p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Vale</Label>
                  <Select
                    value={formData.type ? `${formData.type}-${formData.value}` : ''}
                    onValueChange={(value) => {
                      const selected = activeTypes.find(t => `${t.type}-${t.value}` === value);
                      if (selected) {
                        setFormData({ 
                          ...formData, 
                          type: selected.type,
                          value: selected.value.toString()
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTypes.map((voucherType) => (
                        <SelectItem key={voucherType.id} value={`${voucherType.type}-${voucherType.value}`}>
                          {voucherType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverName">Nome do Motorista</Label>
                <Input
                  id="driverName"
                  placeholder="Ex: João Silva"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehiclePlate">Placa do Veículo</Label>
                <Input
                  id="vehiclePlate"
                  placeholder="Ex: ABC-1234"
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                  className="h-12 uppercase"
                  maxLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label>Estabelecimento</Label>
                <Select
                  value={formData.establishment}
                  onValueChange={(value) => setFormData({ ...formData, establishment: value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Onde o vale será utilizado" />
                  </SelectTrigger>
                  <SelectContent>
                    {establishments.map((est) => (
                      <SelectItem key={est.value} value={est.value}>
                        {est.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" variant="gradient" className="w-full h-12">
                <Ticket className="h-5 w-5" />
                Gerar Vale-Brinde
              </Button>
            </form>
          </div>

          {/* QR Code Preview */}
          <div className="card-elevated p-6 flex flex-col items-center justify-center">
            {generatedVoucher ? (
              <div className="text-center space-y-6 animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Vale Gerado!</h3>
                  <p className="text-muted-foreground">Escaneie o QR Code ou use o código</p>
                </div>
                
                <div className="p-4 bg-white rounded-xl">
                  <QRCode
                    id="voucher-qr"
                    value={generatedVoucher.code}
                    size={180}
                    level="H"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-2xl font-bold font-mono text-primary">{generatedVoucher.code}</p>
                  <p className="text-lg text-muted-foreground">
                    Valor: <span className="font-bold text-foreground">{formatCurrency(generatedVoucher.value)}</span>
                  </p>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={copyCode}>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                  <Button variant="outline" onClick={downloadQR}>
                    <Download className="h-4 w-4" />
                    Baixar
                  </Button>
                </div>

                <Button variant="ghost" onClick={resetForm} className="text-muted-foreground">
                  Gerar novo vale
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4 text-muted-foreground">
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center mx-auto">
                  <QrCode className="h-12 w-12" />
                </div>
                <p>O QR Code aparecerá aqui</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
