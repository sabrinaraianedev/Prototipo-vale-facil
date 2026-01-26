import QRCode from 'react-qr-code';

interface ThermalReceiptProps {
  code: string;
  value: number;
  driverName: string;
  vehiclePlate: string;
  establishment: string;
  receiptNumber: string;
  cashierName: string;
  createdAt: Date;
}

export function ThermalReceipt({
  code,
  value,
  driverName,
  vehiclePlate,
  establishment,
  receiptNumber,
  cashierName,
  createdAt,
}: ThermalReceiptProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);

  // QR Code data in JSON format with all required fields
  const qrData = JSON.stringify({
    code,
    value,
    driver: driverName,
    establishment,
    receipt: receiptNumber,
    date: createdAt.toISOString(),
  });

  return (
    <div
      id="thermal-receipt"
      className="w-full max-w-[220px] bg-white text-foreground font-mono text-xs p-3"
    >
      {/* Header */}
      <div className="text-center border-b border-dashed border-border pb-2 mb-2">
        <p className="font-bold text-sm text-foreground">VALE-BRINDE</p>
        <p className="text-[10px] text-muted-foreground">{formatDate(createdAt)}</p>
      </div>

      {/* QR Code - centered, optimized size */}
      <div className="flex justify-center my-3">
        <div className="bg-white p-1 rounded">
          <QRCode
            id="voucher-qr"
            value={qrData}
            size={120}
            level="M"
          />
        </div>
      </div>

      {/* Code */}
      <div className="text-center mb-3">
        <p className="font-bold text-base tracking-wider text-foreground">{code}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-border my-2" />

      {/* Details */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valor:</span>
          <span className="font-bold text-foreground">{formatCurrency(value)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Motorista:</span>
          <span className="text-right max-w-[60%] truncate text-foreground">{driverName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Placa:</span>
          <span className="text-foreground">{vehiclePlate}</span>
        </div>
        {receiptNumber && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cupom:</span>
            <span className="text-foreground">{receiptNumber}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Caixa:</span>
          <span className="text-right max-w-[60%] truncate text-foreground">{cashierName}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-border my-2" />

      {/* Establishment */}
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground">Válido somente em:</p>
        <p className="font-bold text-[11px] text-foreground">{establishment}</p>
      </div>

      {/* Footer */}
      <div className="border-t border-dashed border-border mt-2 pt-2 text-center">
        <p className="text-[9px] text-muted-foreground">
          Apresente este comprovante no estabelecimento
        </p>
      </div>
    </div>
  );
}
