import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { useVouchers, Voucher } from '@/contexts/VoucherContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, isWithinInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, FileText, Download, Ticket, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { StatCard } from '@/components/Stats/StatCard';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

type QuickFilter = 'today' | 'week' | 'month' | 'custom';

export default function Reports() {
  const { user } = useAuth();
  const { vouchers, loading } = useVouchers();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());

  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const filteredVouchers = useMemo(() => {
    let start: Date;
    let end: Date = endOfDay(new Date());

    switch (quickFilter) {
      case 'today':
        start = startOfDay(new Date());
        break;
      case 'week':
        start = startOfWeek(new Date(), { locale: ptBR });
        break;
      case 'month':
        start = startOfMonth(new Date());
        break;
      case 'custom':
        start = dateFrom ? startOfDay(dateFrom) : subDays(new Date(), 30);
        end = dateTo ? endOfDay(dateTo) : endOfDay(new Date());
        break;
      default:
        start = startOfMonth(new Date());
    }

    return vouchers.filter(v =>
      isWithinInterval(v.createdAt, { start, end })
    );
  }, [vouchers, quickFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filteredVouchers.length;
    const used = filteredVouchers.filter(v => v.status === 'utilizado');
    const pending = filteredVouchers.filter(v => v.status === 'gerado');
    const totalValue = filteredVouchers.reduce((s, v) => s + v.value, 0);
    const redeemedValue = used.reduce((s, v) => s + v.value, 0);
    return { total, used: used.length, pending: pending.length, totalValue, redeemedValue };
  }, [filteredVouchers]);

  const byCashier = useMemo(() => {
    const map: Record<string, { name: string; count: number; value: number; redeemed: number }> = {};
    filteredVouchers.forEach(v => {
      const key = v.cashierId;
      if (!map[key]) map[key] = { name: v.cashierName || 'Desconhecido', count: 0, value: 0, redeemed: 0 };
      map[key].count++;
      map[key].value += v.value;
      if (v.status === 'utilizado') map[key].redeemed += v.value;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filteredVouchers]);

  const byEstablishment = useMemo(() => {
    const map: Record<string, { name: string; count: number; value: number; redeemed: number }> = {};
    filteredVouchers.forEach(v => {
      const key = v.establishmentId;
      if (!map[key]) map[key] = { name: v.establishmentName || 'Desconhecido', count: 0, value: 0, redeemed: 0 };
      map[key].count++;
      map[key].value += v.value;
      if (v.status === 'utilizado') map[key].redeemed += v.value;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filteredVouchers]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getFilterLabel = () => {
    switch (quickFilter) {
      case 'today': return 'Hoje';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      case 'custom':
        return `${dateFrom ? format(dateFrom, 'dd/MM/yyyy') : '...'} — ${dateTo ? format(dateTo, 'dd/MM/yyyy') : '...'}`;
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const addLine = (text: string, size = 10, bold = false) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, 14, y);
      y += size * 0.5 + 3;
    };

    const addSeparator = () => {
      doc.setDrawColor(200);
      doc.line(14, y, pageWidth - 14, y);
      y += 5;
    };

    // Header
    addLine('ValeFácil — Relatório de Vales-Brinde', 16, true);
    addLine(`Período: ${getFilterLabel()}`, 10);
    addLine(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 9);
    y += 5;
    addSeparator();

    // Summary
    addLine('RESUMO GERAL', 12, true);
    addLine(`Total de Vales: ${stats.total}`);
    addLine(`Vales Utilizados: ${stats.used}`);
    addLine(`Vales Pendentes: ${stats.pending}`);
    addLine(`Valor Total Distribuído: ${formatCurrency(stats.totalValue)}`);
    addLine(`Valor Total Resgatado: ${formatCurrency(stats.redeemedValue)}`);
    y += 3;
    addSeparator();

    // By Cashier
    addLine('DETALHAMENTO POR CAIXA', 12, true);
    if (byCashier.length === 0) {
      addLine('Nenhum dado no período.');
    } else {
      byCashier.forEach(c => {
        addLine(`${c.name}: ${c.count} vales | Distribuído: ${formatCurrency(c.value)} | Resgatado: ${formatCurrency(c.redeemed)}`);
      });
    }
    y += 3;
    addSeparator();

    // By Establishment
    addLine('DETALHAMENTO POR ESTABELECIMENTO', 12, true);
    if (byEstablishment.length === 0) {
      addLine('Nenhum dado no período.');
    } else {
      byEstablishment.forEach(e => {
        addLine(`${e.name}: ${e.count} vales | Distribuído: ${formatCurrency(e.value)} | Resgatado: ${formatCurrency(e.redeemed)}`);
      });
    }
    y += 3;
    addSeparator();

    // Voucher listing
    addLine('LISTAGEM DE VALES', 12, true);
    y += 2;

    // Table header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Código', 14, y);
    doc.text('Valor', 45, y);
    doc.text('Motorista', 70, y);
    doc.text('Local', 115, y);
    doc.text('Status', 160, y);
    doc.text('Data', 180, y);
    y += 5;
    doc.setDrawColor(150);
    doc.line(14, y - 2, pageWidth - 14, y - 2);

    doc.setFont('helvetica', 'normal');
    filteredVouchers.forEach(v => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setFontSize(7);
      doc.text(v.code, 14, y);
      doc.text(formatCurrency(v.value), 45, y);
      doc.text((v.driverName || '').substring(0, 20), 70, y);
      doc.text((v.establishmentName || '').substring(0, 20), 115, y);
      const statusLabel = v.status === 'gerado' ? 'Gerado' : v.status === 'utilizado' ? 'Usado' : 'Cancelado';
      doc.text(statusLabel, 160, y);
      doc.text(format(v.createdAt, 'dd/MM/yy'), 180, y);
      y += 4;
    });

    doc.save(`relatorio-vales-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Relatório exportado com sucesso!');
  };

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
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Relatórios
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Análise detalhada da distribuição de vales-brinde
            </p>
          </div>
          <Button onClick={exportPDF} className="gap-2 shrink-0">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        {/* Filters */}
        <div className="card-elevated p-4 lg:p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Período</h2>
          <div className="flex flex-wrap items-center gap-2">
            {(['today', 'week', 'month'] as QuickFilter[]).map(f => (
              <Button
                key={f}
                size="sm"
                variant={quickFilter === f ? 'default' : 'outline'}
                onClick={() => setQuickFilter(f)}
              >
                {f === 'today' ? 'Hoje' : f === 'week' ? 'Semana' : 'Mês'}
              </Button>
            ))}
            <Button
              size="sm"
              variant={quickFilter === 'custom' ? 'default' : 'outline'}
              onClick={() => setQuickFilter('custom')}
            >
              Personalizado
            </Button>

            {quickFilter === 'custom' && (
              <div className="flex items-center gap-2 ml-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("gap-1 text-xs", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'De'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-xs">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("gap-1 text-xs", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Até'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
          <StatCard title="Total de Vales" value={stats.total} icon={<Ticket className="h-5 w-5 text-primary-foreground" />} />
          <StatCard title="Utilizados" value={stats.used} icon={<CheckCircle className="h-5 w-5 text-primary-foreground" />} />
          <StatCard title="Valor Distribuído" value={formatCurrency(stats.totalValue)} icon={<DollarSign className="h-5 w-5 text-primary-foreground" />} />
          <StatCard title="Valor Resgatado" value={formatCurrency(stats.redeemedValue)} icon={<Clock className="h-5 w-5 text-primary-foreground" />} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cashier" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cashier">Por Caixa</TabsTrigger>
            <TabsTrigger value="establishment">Por Estabelecimento</TabsTrigger>
            <TabsTrigger value="listing">Listagem</TabsTrigger>
          </TabsList>

          <TabsContent value="cashier">
            <div className="card-elevated p-4 lg:p-6 space-y-2">
              <h2 className="text-base lg:text-lg font-semibold text-foreground mb-3">Detalhamento por Caixa</h2>
              {byCashier.length > 0 ? byCashier.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary-foreground">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.count} vales</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(c.value)}</p>
                    <p className="text-xs text-muted-foreground">Resgatado: {formatCurrency(c.redeemed)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-muted-foreground text-center py-4 text-sm">Nenhum dado no período</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="establishment">
            <div className="card-elevated p-4 lg:p-6 space-y-2">
              <h2 className="text-base lg:text-lg font-semibold text-foreground mb-3">Detalhamento por Estabelecimento</h2>
              {byEstablishment.length > 0 ? byEstablishment.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-accent">{e.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.count} vales</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(e.value)}</p>
                    <p className="text-xs text-muted-foreground">Resgatado: {formatCurrency(e.redeemed)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-muted-foreground text-center py-4 text-sm">Nenhum dado no período</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="listing">
            <div className="card-elevated p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-foreground mb-3">
                Listagem Completa ({filteredVouchers.length} vales)
              </h2>
              <div className="overflow-x-auto -mx-4 lg:mx-0">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Código</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Valor</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Motorista</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Local</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Caixa</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.map(v => (
                      <tr key={v.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-2 px-3 font-mono text-xs">{v.code}</td>
                        <td className="py-2 px-3 font-medium text-sm">{formatCurrency(v.value)}</td>
                        <td className="py-2 px-3 text-sm truncate max-w-[120px]">{v.driverName}</td>
                        <td className="py-2 px-3 text-sm truncate max-w-[100px]">{v.establishmentName}</td>
                        <td className="py-2 px-3 text-sm truncate max-w-[100px]">{v.cashierName}</td>
                        <td className="py-2 px-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            v.status === 'gerado' && "bg-warning/20 text-warning",
                            v.status === 'utilizado' && "bg-success/20 text-success",
                            v.status === 'cancelado' && "bg-destructive/20 text-destructive"
                          )}>
                            {v.status === 'gerado' ? 'Gerado' : v.status === 'utilizado' ? 'Usado' : 'Cancelado'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {format(v.createdAt, 'dd/MM/yy HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredVouchers.length === 0 && (
                  <p className="text-muted-foreground text-center py-4 text-sm">Nenhum vale no período</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
