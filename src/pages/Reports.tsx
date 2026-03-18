import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { useVouchers } from '@/contexts/VoucherContext';
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

import { toast } from 'sonner';

type QuickFilter = 'today' | 'week' | 'month' | 'custom';

export default function Reports() {
  const { user } = useAuth();
  const { vouchers, loading } = useVouchers();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());

  const filteredVouchers = useMemo(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return [];
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

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return <Navigate to="/dashboard" replace />;

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

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const ml = 20; // margin left
    const mr = 20; // margin right
    const cw = pw - ml - mr; // content width
    let y = 0;
    let pageNum = 1;

    const GREEN = [56, 118, 29] as const;   // #38761D
    const DARK_GREEN = [39, 78, 19] as const;
    const ORANGE = [218, 165, 32] as const;  // #DAA520
    const GRAY_BG = [245, 245, 245] as const;
    const WHITE = [255, 255, 255] as const;
    const BLACK = [0, 0, 0] as const;
    const GRAY_TEXT = [100, 100, 100] as const;
    const BORDER = [200, 200, 200] as const;

    const checkPage = (needed: number) => {
      if (y + needed > ph - 30) {
        addFooter();
        doc.addPage();
        pageNum++;
        y = 20;
      }
    };

    const addFooter = () => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_TEXT);
      const totalPages = '{totalPages}';
      doc.text('Sistema ValeFácil – Relatório gerado automaticamente', pw / 2, ph - 18, { align: 'center' });
      doc.text(`Data de geração: ${format(new Date(), 'dd/MM/yyyy')}`, pw / 2, ph - 13, { align: 'center' });
      doc.text(`Página ${pageNum} de ${totalPages}`, pw / 2, ph - 8, { align: 'center' });
    };

    const drawFilledRect = (x: number, yPos: number, w: number, h: number, color: readonly [number, number, number]) => {
      doc.setFillColor(...color);
      doc.rect(x, yPos, w, h, 'F');
    };

    const drawTable = (headers: string[], rows: string[][], colWidths: number[]) => {
      const rowH = 8;
      const headerH = 9;
      checkPage(headerH + rowH * Math.min(rows.length, 3) + 5);

      // Header
      drawFilledRect(ml, y, cw, headerH, GREEN);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bolditalic');
      doc.setTextColor(...WHITE);
      let xPos = ml + 3;
      headers.forEach((h, i) => {
        doc.text(h, xPos, y + 6);
        xPos += colWidths[i];
      });
      y += headerH;

      // Rows
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BLACK);
      rows.forEach((row, ri) => {
        checkPage(rowH + 2);
        if (ri % 2 === 0) {
          drawFilledRect(ml, y, cw, rowH, GRAY_BG);
        }
        doc.setDrawColor(...BORDER);
        doc.line(ml, y + rowH, ml + cw, y + rowH);
        xPos = ml + 3;
        doc.setFontSize(8);
        row.forEach((cell, ci) => {
          doc.text(cell.substring(0, 30), xPos, y + 5.5);
          xPos += colWidths[ci];
        });
        y += rowH;
      });
      y += 5;
    };

    // ===== HEADER =====
    y = 25;
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_GREEN);
    doc.text('VALEFÁCIL', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.8);
    doc.line(pw / 2 - 35, y, pw / 2 + 35, y);
    y += 7;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_TEXT);
    doc.text('RELATÓRIO DE VALES-BRINDE', pw / 2, y, { align: 'center' });
    y += 12;

    // ===== PERIOD INFO =====
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'bold');
    doc.text('Período: ', ml, y);
    doc.setFont('helvetica', 'normal');
    doc.text(getFilterLabel(), ml + doc.getTextWidth('Período: '), y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Gerado em: ', ml, y);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), ml + doc.getTextWidth('Gerado em: '), y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Administrador: ', ml, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema ValeFácil', ml + doc.getTextWidth('Administrador: '), y);
    y += 10;

    // ===== FILTROS APLICADOS =====
    drawFilledRect(ml, y, 45, 7, GREEN);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('FILTROS APLICADOS', ml + 3, y + 5);
    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.setFont('helvetica', 'normal');
    const filterLines = [
      `• Período: ${getFilterLabel()}`,
      '• Caixa: Todos',
      '• Estabelecimento: Todos',
      '• Status: Todos',
    ];
    filterLines.forEach(line => {
      doc.text(line, ml + 3, y);
      y += 5;
    });
    y += 8;

    // ===== RESUMO GERAL =====
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_GREEN);
    doc.text('RESUMO GERAL', ml, y);
    y += 6;

    const availableValue = stats.totalValue - stats.redeemedValue;
    const boxW = cw / 3 - 2;
    const boxH = 22;

    // Row 1: counts with colored headers
    const countBoxes = [
      { label: 'Total de Vales', value: String(stats.total), color: GREEN },
      { label: 'Vales Utilizados', value: String(stats.used), color: GREEN },
      { label: 'Vales Pendentes', value: String(stats.pending), color: ORANGE },
    ];
    countBoxes.forEach((box, i) => {
      const bx = ml + i * (boxW + 3);
      drawFilledRect(bx, y, boxW, 7, box.color as unknown as readonly [number, number, number]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text(box.label, bx + boxW / 2, y + 5, { align: 'center' });
      // Value area
      doc.setDrawColor(...BORDER);
      doc.rect(bx, y + 7, boxW, boxH - 7);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      doc.text(box.value, bx + boxW / 2, y + 18, { align: 'center' });
    });
    y += boxH + 4;

    // Row 2: values
    const valueBoxes = [
      { label: 'Valor Distribuído', value: formatCurrency(stats.totalValue) },
      { label: 'Valor Resgatado', value: formatCurrency(stats.redeemedValue) },
      { label: 'Valor Disponível', value: formatCurrency(availableValue) },
    ];
    valueBoxes.forEach((box, i) => {
      const bx = ml + i * (boxW + 3);
      doc.setDrawColor(...BORDER);
      doc.rect(bx, y, boxW, 7);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bolditalic');
      doc.setTextColor(...BLACK);
      doc.text(box.label, bx + boxW / 2, y + 5, { align: 'center' });
      doc.rect(bx, y + 7, boxW, boxH - 7);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(box.value, bx + boxW / 2, y + 17, { align: 'center' });
    });
    y += boxH + 8;

    // ===== DETALHAMENTO POR CAIXA =====
    checkPage(30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_GREEN);
    doc.text('DETALHAMENTO POR CAIXA', ml, y);
    y += 6;

    if (byCashier.length > 0) {
      const cashierCols = [cw * 0.3, cw * 0.2, cw * 0.25, cw * 0.25];
      drawTable(
        ['Caixa', 'Qtd. de Vales', 'Valor Distribuído', 'Valor Usado'],
        byCashier.map(c => [c.name, String(c.count), formatCurrency(c.value), formatCurrency(c.redeemed)]),
        cashierCols
      );
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Nenhum dado no período.', ml, y);
      y += 8;
    }

    // ===== DETALHAMENTO POR ESTABELECIMENTO =====
    checkPage(30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_GREEN);
    doc.text('DETALHAMENTO POR ESTABELECIMENTO', ml, y);
    y += 6;

    if (byEstablishment.length > 0) {
      const estCols = [cw * 0.3, cw * 0.2, cw * 0.25, cw * 0.25];
      drawTable(
        ['Estabelecimento', 'Qtd. de Vales', 'Valor Distribuído', 'Valor Usado'],
        byEstablishment.map(e => [e.name, String(e.count), formatCurrency(e.value), formatCurrency(e.redeemed)]),
        estCols
      );
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Nenhum dado no período.', ml, y);
      y += 8;
    }

    // ===== LISTAGEM COMPLETA DE VALES =====
    checkPage(30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_GREEN);
    doc.text('LISTAGEM COMPLETA DE VALES', ml, y);
    y += 6;

    if (filteredVouchers.length > 0) {
      const listCols = [cw * 0.2, cw * 0.15, cw * 0.2, cw * 0.25, cw * 0.2];
      drawTable(
        ['Código', 'Valor', 'Motorista', 'Estabelecimento', 'Status'],
        filteredVouchers.map(v => {
          const statusLabel = v.status === 'gerado' ? 'Pendente' : v.status === 'utilizado' ? 'Utilizado' : 'Cancelado';
          return [v.code, formatCurrency(v.value), v.driverName || '', v.establishmentName || '', statusLabel];
        }),
        listCols
      );
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Nenhum vale no período.', ml, y);
      y += 8;
    }

    // Add footer to last page
    addFooter();

    // Replace page number placeholders
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // Re-draw footer with correct total
      const footerY = ph - 8;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_TEXT);
      // White rect to clear placeholder
      doc.setFillColor(255, 255, 255);
      doc.rect(0, ph - 22, pw, 22, 'F');
      doc.text('Sistema ValeFácil – Relatório gerado automaticamente', pw / 2, ph - 18, { align: 'center' });
      doc.text(`Data de geração: ${format(new Date(), 'dd/MM/yyyy')}`, pw / 2, ph - 13, { align: 'center' });
      doc.text(`Página ${i} de ${totalPages}`, pw / 2, ph - 8, { align: 'center' });
    }

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
