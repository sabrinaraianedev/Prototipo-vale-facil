import { useState } from 'react';
import { useVouchers } from '@/contexts/VoucherContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Ticket, Plus, Fuel, Droplets } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function VoucherTypes() {
  const { voucherTypes, addVoucherType, updateVoucherType, loading } = useVouchers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    minLiters: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.value || !formData.minLiters) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSubmitting(true);

    try {
      await addVoucherType({
        name: formData.name,
        value: parseFloat(formData.value),
        minLiters: parseFloat(formData.minLiters),
        active: true,
      });

      setFormData({ name: '', value: '', minLiters: '' });
      setIsDialogOpen(false);
      toast.success('Tipo de vale criado com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar tipo de vale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTypeStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateVoucherType(id, { active: !currentStatus });
      toast.success('Status atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const sortedTypes = [...voucherTypes].sort((a, b) => a.minLiters - b.minLiters);

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
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Tipos de Vale</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Configure os vales por litragem mínima</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="w-full sm:w-auto">
                <Plus className="h-5 w-5" />
                Novo Tipo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>Criar Tipo de Vale</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Vale</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Vale Bronze"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minLiters">Litragem Mínima</Label>
                  <Input
                    id="minLiters"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 20"
                    value={formData.minLiters}
                    onChange={(e) => setFormData({ ...formData, minLiters: e.target.value })}
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
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="gradient" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Criando...' : 'Criar Tipo'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Voucher Types Grid */}
        {sortedTypes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {sortedTypes.map((voucherType) => (
              <div 
                key={voucherType.id} 
                className={cn(
                  "card-elevated p-4 sm:p-6 space-y-4 transition-all",
                  !voucherType.active && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-primary/20 text-primary">
                    <Fuel className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <Switch
                    checked={voucherType.active}
                    onCheckedChange={() => toggleTypeStatus(voucherType.id, voucherType.active)}
                  />
                </div>

                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">{voucherType.name}</h3>
                  <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                    <Droplets className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Mínimo: {voucherType.minLiters}L</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">Valor</span>
                  <span className="text-lg sm:text-xl font-bold text-primary">{formatCurrency(voucherType.value)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-elevated p-8 sm:p-12 text-center">
            <Fuel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum tipo de vale cadastrado</h3>
            <p className="text-muted-foreground mb-4">Crie seu primeiro tipo de vale para começar</p>
            <Button variant="gradient" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-5 w-5" />
              Criar Tipo
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
