import { useAuth } from '@/contexts/AuthContext';
import { useVouchers } from '@/contexts/VoucherContext';
import { StatCard } from '@/components/Stats/StatCard';
import { Ticket, DollarSign, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EstablishmentDashboard() {
  const { user } = useAuth();
  const { vouchers, loading } = useVouchers();

  if (!user) return null;

  const usedVouchers = vouchers.filter(v => v.status === 'utilizado' && v.redeemedBy === user.id);
  const pendingVouchers = vouchers.filter(v => v.status === 'gerado');
  const totalRedeemed = usedVouchers.reduce((sum, v) => sum + v.value, 0);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (date: Date) => 
    new Intl.DateTimeFormat('pt-BR', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    }).format(date);

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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Dashboard do Estabelecimento</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Olá, {user.name}! Gerencie seus vales.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Vales Pendentes"
          value={pendingVouchers.length}
          icon={<Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />}
        />
        <StatCard
          title="Vales Utilizados"
          value={usedVouchers.length}
          icon={<CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />}
        />
        <StatCard
          title="Valor Resgatado"
          value={formatCurrency(totalRedeemed)}
          icon={<DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />}
        />
      </div>

      <div className="card-elevated p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Vales Resgatados</h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Código</th>
                <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Valor</th>
                <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">Motorista</th>
                <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {usedVouchers.slice(0, 10).map((voucher) => (
                <tr key={voucher.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2 sm:py-3 px-3 sm:px-4 font-mono text-xs sm:text-sm">{voucher.code}</td>
                  <td className="py-2 sm:py-3 px-3 sm:px-4 font-medium text-success text-sm">{formatCurrency(voucher.value)}</td>
                  <td className="py-2 sm:py-3 px-3 sm:px-4 hidden sm:table-cell text-sm truncate max-w-[120px]">{voucher.driverName}</td>
                  <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm text-muted-foreground">
                    {voucher.redeemedAt ? formatDate(voucher.redeemedAt) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usedVouchers.length === 0 && (
            <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">Nenhum vale resgatado ainda</p>
          )}
        </div>
      </div>
    </div>
  );
}
