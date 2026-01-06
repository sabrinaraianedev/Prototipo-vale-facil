import { useAuth } from '@/contexts/AuthContext';
import { useVouchers } from '@/contexts/VoucherContext';
import { StatCard } from '@/components/Stats/StatCard';
import { Ticket, DollarSign, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EstablishmentDashboard() {
  const { user } = useAuth();
  const { vouchers } = useVouchers();

  if (!user) return null;

  // Get vouchers that belong to or were redeemed by this establishment
  const myVouchers = vouchers.filter(v => 
    v.usedBy?.toLowerCase() === user.name.toLowerCase() || 
    v.establishment.toLowerCase() === 'conveniência'
  );
  
  const usedVouchers = myVouchers.filter(v => v.status === 'utilizado' && v.usedBy?.toLowerCase() === user.name.toLowerCase());
  const pendingVouchers = myVouchers.filter(v => v.status === 'gerado');
  const totalRedeemed = usedVouchers.reduce((sum, v) => sum + v.value, 0);

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
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard do Estabelecimento</h1>
        <p className="text-muted-foreground mt-1">Olá, {user.name}! Gerencie seus vales.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <StatCard
          title="Vales Pendentes"
          value={pendingVouchers.length}
          icon={<Ticket className="h-6 w-6 text-primary-foreground" />}
        />
        <StatCard
          title="Vales Utilizados"
          value={usedVouchers.length}
          icon={<CheckCircle className="h-6 w-6 text-primary-foreground" />}
        />
        <StatCard
          title="Valor Resgatado"
          value={formatCurrency(totalRedeemed)}
          icon={<DollarSign className="h-6 w-6 text-primary-foreground" />}
        />
      </div>

      {/* Redeemed Vouchers History */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Vales Resgatados</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Código</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Motorista</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data Resgate</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {usedVouchers.map((voucher) => (
                <tr key={voucher.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-sm">{voucher.code}</td>
                  <td className="py-3 px-4 font-medium text-success">{formatCurrency(voucher.value)}</td>
                  <td className="py-3 px-4">{voucher.driverName}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {voucher.usedAt ? formatDate(voucher.usedAt) : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success"
                    )}>
                      Utilizado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usedVouchers.length === 0 && (
            <p className="text-muted-foreground text-center py-8">Nenhum vale resgatado ainda</p>
          )}
        </div>
      </div>
    </div>
  );
}
