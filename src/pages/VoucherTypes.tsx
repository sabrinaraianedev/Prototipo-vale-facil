import { useState } from 'react';
import { useVouchers, VoucherType } from '@/contexts/VoucherContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Ticket, Plus, Fuel, Store, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function VoucherTypes() {
  const { voucherTypes, addVoucherType, updateVoucherType } = useVouchers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    type: '' as VoucherType | '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.value || !formData.type) {
      toast.error('Preencha todos os campos');
      return;
    }

    addVoucherType({
      name: formData.name,
      value: parseFloat(formData.value),
      type: formData.type as VoucherType,
      active: true,
    });

    setFormData({ name: '', value: '', type: '' });
    setIsDialogOpen(false);
    toast.success('Tipo de vale criado com sucesso!');
  };

  const toggleTypeStatus = (id: string, currentStatus: boolean) => {
    updateVoucherType(id, { active: !currentStatus });
    toast.success('Status atualizado');
  };

  const getTypeIcon = (type: VoucherType) => {
    const icons = {
      combustivel: Fuel,
      conveniencia: Store,
      churrascaria: UtensilsCrossed,
    };
    return icons[type];
  };

  const getTypeLabel = (type: VoucherType) => {
    const labels = {
      combustivel: 'Combustível',
      conveniencia: 'Conveniência',
      churrascaria: 'Churrascaria',
    };
    return labels[type];
  };

  const getTypeColor = (type: VoucherType) => {
    const colors = {
      combustivel: 'bg-primary/20 text-primary',
      conveniencia: 'bg-accent/20 text-accent',
      churrascaria: 'bg-warning/20 text-warning',
    };
    return colors[type];
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Ticket className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Tipos de Vale</h1>
              <p className="text-muted-foreground">Configure os tipos de vale-brinde disponíveis</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-5 w-5" />
                Novo Tipo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Tipo de Vale</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Vale</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Vale Combustível R$50"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-11"
                  />
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
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as VoucherType })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combustivel">Combustível</SelectItem>
                      <SelectItem value="conveniencia">Conveniência</SelectItem>
                      <SelectItem value="churrascaria">Churrascaria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="gradient" className="flex-1">
                    Criar Tipo
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Voucher Types Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {voucherTypes.map((voucherType) => {
            const TypeIcon = getTypeIcon(voucherType.type);
            return (
              <div 
                key={voucherType.id} 
                className={cn(
                  "card-elevated p-6 space-y-4 transition-all",
                  !voucherType.active && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    getTypeColor(voucherType.type)
                  )}>
                    <TypeIcon className="h-6 w-6" />
                  </div>
                  <Switch
                    checked={voucherType.active}
                    onCheckedChange={() => toggleTypeStatus(voucherType.id, voucherType.active)}
                  />
                </div>

                <div>
                  <h3 className="font-semibold text-foreground">{voucherType.name}</h3>
                  <span className={cn(
                    "inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-medium",
                    getTypeColor(voucherType.type)
                  )}>
                    {getTypeLabel(voucherType.type)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(voucherType.value)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
