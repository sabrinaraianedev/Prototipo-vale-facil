import { useAuth } from '@/contexts/AuthContext';
import { useVouchers } from '@/contexts/VoucherContext';
import { StatCard } from '@/components/Stats/StatCard';
import { Ticket, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CashierDashboard() {
  const { user } = useAuth();
  const { getVouchersByCashier } = useVouchers();

  if (!user) return null;

  const myVouchers = getVouchersByCashier(user.id);
  const totalValue = myVouchers.reduce((sum, v) => sum + v.value, 0);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (date: Date) => 
    new Intl.DateTimeFormat('pt-BR', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    }).format(date);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard do Caixa</h1>
        <p className="text-muted-foreground mt-1">Olá, {user.name}! Aqui está seu resumo.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <StatCard
          title="Vales Distribuídos"
          value={myVouchers.length}
          icon={<Ticket className="h-6 w-6 text-primary-foreground" />}
        />
        <StatCard
          title="Valor Total"
          value={formatCurrency(totalValue)}
          icon={<DollarSign className="h-6 w-6 text-primary-foreground" />}
        />
        <StatCard
          title="Último Vale"
          value={myVouchers.length > 0 ? formatDate(myVouchers[0].createdAt) : '-'}
          icon={<Clock className="h-6 w-6 text-primary-foreground" />}
        />
      </div>

      {/* Vouchers History */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Histórico de Vales</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Código</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Motorista</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Placa</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data/Hora</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {myVouchers.map((voucher) => (
                <tr key={voucher.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-sm">{voucher.code}</td>
                  <td className="py-3 px-4 font-medium">{formatCurrency(voucher.value)}</td>
                  <td className="py-3 px-4">{voucher.driverName}</td>
                  <td className="py-3 px-4 font-mono">{voucher.vehiclePlate}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(voucher.createdAt)}</td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      voucher.status === 'gerado' && "bg-warning/20 text-warning",
                      voucher.status === 'utilizado' && "bg-success/20 text-success",
                      voucher.status === 'cancelado' && "bg-destructive/20 text-destructive"
                    )}>
                      {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {myVouchers.length === 0 && (
            <p className="text-muted-foreground text-center py-8">Você ainda não gerou nenhum vale</p>
          )}
        </div>
      </div>
    </div>
  );
}
