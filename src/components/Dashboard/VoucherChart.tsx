import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Voucher } from '@/contexts/VoucherContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoucherChartProps {
  vouchers: Voucher[];
}

type FilterPeriod = 'week' | 'month';

export function VoucherChart({ vouchers }: VoucherChartProps) {
  const [period, setPeriod] = useState<FilterPeriod>('week');

  const getFilteredData = () => {
    const now = new Date();
    const startDate = new Date();
    
    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    const filtered = vouchers.filter(v => v.createdAt >= startDate);
    
    // Group by day
    const groupedData: Record<string, { gerado: number; utilizado: number }> = {};
    
    filtered.forEach(voucher => {
      const dateKey = voucher.createdAt.toLocaleDateString('pt-BR', { 
        day: '2-digit',
        month: '2-digit'
      });
      
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = { gerado: 0, utilizado: 0 };
      }
      
      groupedData[dateKey].gerado++;
      if (voucher.status === 'utilizado') {
        groupedData[dateKey].utilizado++;
      }
    });

    // Convert to array sorted by date
    return Object.entries(groupedData)
      .map(([date, counts]) => ({
        date,
        Gerados: counts.gerado,
        Utilizados: counts.utilizado,
      }))
      .reverse();
  };

  const data = getFilteredData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base lg:text-lg font-semibold text-foreground">Vales por Período</h2>
        <div className="flex gap-2">
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('week')}
            className={cn(
              period === 'week' && 'bg-primary text-primary-foreground'
            )}
          >
            Semana
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('month')}
            className={cn(
              period === 'month' && 'bg-primary text-primary-foreground'
            )}
          >
            Mês
          </Button>
        </div>
      </div>

      {data.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="Gerados" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="Utilizados" 
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Nenhum dado para o período selecionado</p>
        </div>
      )}
    </div>
  );
}
