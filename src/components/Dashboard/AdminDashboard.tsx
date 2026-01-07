import { useState } from 'react';
import { useVouchers } from '@/contexts/VoucherContext';
import { StatCard } from '@/components/Stats/StatCard';
import { Ticket, DollarSign, CheckCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FilterPeriod = 'day' | 'week' | 'month';

export function AdminDashboard() {
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const { vouchers } = useVouchers();

  const now = new Date();
  const filterDate = (date: Date) => {
    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    switch (period) {
      case 'day': return diffDays <= 1;
      case 'week': return diffDays <= 7;
      case 'month': return diffDays <= 30;
    }
  };

  const filteredVouchers = vouchers.filter(v => filterDate(v.createdAt));
  const usedVouchers = filteredVouchers.filter(v => v.status === 'utilizado');

  const totalDistributed = filteredVouchers.length;
  const totalValue = filteredVouchers.reduce((sum, v) => sum + v.value, 0);
  const totalRedeemed = usedVouchers.reduce((sum, v) => sum + v.value, 0);

  // Group by cashier
  const byCashier = filteredVouchers.reduce((acc, v) => {
    const key = v.cashierName;
    if (!acc[key]) acc[key] = { count: 0, value: 0 };
    acc[key].count++;
    acc[key].value += v.value;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema de vales-brinde</p>
        </div>
        
        {/* Period Filter */}
        <div className="flex bg-secondary rounded-lg p-1">
          {[
            { value: 'day' as FilterPeriod, label: 'Hoje' },
            { value: 'week' as FilterPeriod, label: 'Semana' },
            { value: 'month' as FilterPeriod, label: 'Mês' },
          ].map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(option.value)}
              className={cn(
                "transition-all",
                period === option.value && "shadow-md"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Vales"
          value={totalDistributed}
          icon={<Ticket className="h-5 w-5 text-primary-foreground" />}
        />
        <StatCard
          title="Distribuído"
          value={formatCurrency(totalValue)}
          icon={<DollarSign className="h-5 w-5 text-primary-foreground" />}
        />
        <StatCard
          title="Resgatado"
          value={formatCurrency(totalRedeemed)}
          icon={<CheckCircle className="h-5 w-5 text-primary-foreground" />}
        />
        <StatCard
          title="Taxa"
          value={`${totalDistributed > 0 ? Math.round((usedVouchers.length / totalDistributed) * 100) : 0}%`}
          icon={<Users className="h-5 w-5 text-primary-foreground" />}
        />
      </div>

      {/* Vouchers by Cashier */}
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

      {/* Recent Vouchers Table */}
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
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.slice(0, 5).map((voucher) => (
                <tr key={voucher.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2 px-3 font-mono text-xs">{voucher.code}</td>
                  <td className="py-2 px-3 font-medium text-sm">{formatCurrency(voucher.value)}</td>
                  <td className="py-2 px-3 text-sm hidden sm:table-cell truncate max-w-[120px]">{voucher.driverName}</td>
                  <td className="py-2 px-3 text-sm">{voucher.establishment}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVouchers.length === 0 && (
            <p className="text-muted-foreground text-center py-4 text-sm">Nenhum vale encontrado</p>
          )}
        </div>
      </div>
    </div>
  );
}
