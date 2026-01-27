import { useVouchers } from '@/contexts/VoucherContext';
import { StatCard } from '@/components/Stats/StatCard';
import { VoucherChart } from '@/components/Dashboard/VoucherChart';
import { Ticket, DollarSign, CheckCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function AdminDashboard() {
  const { vouchers, loading, deleteVoucher } = useVouchers();

  const handleDeleteVoucher = async (id: string, code: string) => {
    const result = await deleteVoucher(id);
    if (result.success) {
      toast.success(`Vale ${code} excluído`);
    } else {
      toast.error(result.error || 'Erro ao excluir vale');
    }
  };

  const totalDistributed = vouchers.length;
  const usedVouchers = vouchers.filter(v => v.status === 'utilizado');
  const totalValue = vouchers.reduce((sum, v) => sum + v.value, 0);
  const totalRedeemed = usedVouchers.reduce((sum, v) => sum + v.value, 0);

  const byCashier = vouchers.reduce((acc, v) => {
    const key = v.cashierName || 'Desconhecido';
    if (!acc[key]) acc[key] = { count: 0, value: 0 };
    acc[key].count++;
    acc[key].value += v.value;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Visão geral do sistema de vales-brinde</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <StatCard
          title="Total de Vales"
          value={totalDistributed}
          icon={<Ticket className="h-5 w-5 text-primary-foreground" />}
        />
        <StatCard
          title="Valor Distribuído"
          value={formatCurrency(totalValue)}
          icon={<DollarSign className="h-5 w-5 text-primary-foreground" />}
        />
        <StatCard
          title="Valor Resgatado"
          value={formatCurrency(totalRedeemed)}
          icon={<CheckCircle className="h-5 w-5 text-primary-foreground" />}
        />
      </div>

      {/* Chart */}
      <div className="card-elevated p-4 lg:p-6">
        <VoucherChart vouchers={vouchers} />
      </div>

      <div className="card-elevated p-4 lg:p-6">
        <h2 className="text-base lg:text-lg font-semibold text-foreground mb-3">Por Caixa</h2>
        <div className="space-y-2">
          {Object.entries(byCashier).length > 0 ? (
            Object.entries(byCashier).map(([name, data]) => (
              <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary-foreground">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">{data.count} vales</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-primary whitespace-nowrap ml-2">{formatCurrency(data.value)}</p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4 text-sm">Nenhum vale no período</p>
          )}
        </div>
      </div>

      <div className="card-elevated p-4 lg:p-6">
        <h2 className="text-base lg:text-lg font-semibold text-foreground mb-3">Últimos Vales</h2>
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Código</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Valor</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Motorista</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Local</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.slice(0, 10).map((voucher) => (
                <tr key={voucher.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2 px-3 font-mono text-xs">{voucher.code}</td>
                  <td className="py-2 px-3 font-medium text-sm">{formatCurrency(voucher.value)}</td>
                  <td className="py-2 px-3 text-sm hidden sm:table-cell truncate max-w-[120px]">{voucher.driverName}</td>
                  <td className="py-2 px-3 text-sm truncate max-w-[100px]">{voucher.establishmentName}</td>
                  <td className="py-2 px-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      voucher.status === 'gerado' && "bg-warning/20 text-warning",
                      voucher.status === 'utilizado' && "bg-success/20 text-success",
                      voucher.status === 'cancelado' && "bg-destructive/20 text-destructive"
                    )}>
                      {voucher.status === 'gerado' ? 'Gerado' : voucher.status === 'utilizado' ? 'Usado' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {voucher.status !== 'gerado' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir vale?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o vale {voucher.code}? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteVoucher(voucher.id, voucher.code)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vouchers.length === 0 && (
            <p className="text-muted-foreground text-center py-4 text-sm">Nenhum vale encontrado</p>
          )}
        </div>
      </div>
    </div>
  );
}