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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Vales Distribuídos"
          value={totalDistributed}
          icon={<Ticket className="h-6 w-6 text-primary-foreground" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Valor Distribuído"
          value={formatCurrency(totalValue)}
          icon={<DollarSign className="h-6 w-6 text-primary-foreground" />}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Valor Resgatado"
          value={formatCurrency(totalRedeemed)}
          icon={<CheckCircle className="h-6 w-6 text-primary-foreground" />}
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="Taxa de Resgate"
          value={`${totalDistributed > 0 ? Math.round((usedVouchers.length / totalDistributed) * 100) : 0}%`}
          icon={<Users className="h-6 w-6 text-primary-foreground" />}
        />
      </div>

      {/* Vouchers by Cashier */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Distribuição por Caixa</h2>
        <div className="space-y-4">
          {Object.entries(byCashier).length > 0 ? (
            Object.entries(byCashier).map(([name, data]) => (
              <div key={name} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-foreground">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{name}</p>
                    <p className="text-sm text-muted-foreground">{data.count} vales distribuídos</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-primary">{formatCurrency(data.value)}</p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhum vale distribuído no período selecionado</p>
          )}
        </div>
      </div>

      {/* Recent Vouchers Table */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Últimos Vales Gerados</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Código</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Motorista</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estabelecimento</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.slice(0, 5).map((voucher) => (
                <tr key={voucher.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-sm">{voucher.code}</td>
                  <td className="py-3 px-4 font-medium">{formatCurrency(voucher.value)}</td>
                  <td className="py-3 px-4">{voucher.driverName}</td>
                  <td className="py-3 px-4">{voucher.establishment}</td>
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
          {filteredVouchers.length === 0 && (
            <p className="text-muted-foreground text-center py-8">Nenhum vale encontrado</p>
          )}
        </div>
      </div>
    </div>
  );
}
