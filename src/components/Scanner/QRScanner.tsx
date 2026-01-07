import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScan(decodedText);
            scanner.stop();
          },
          () => {}
        );
      } catch (err) {
        setError('Não foi possível acessar a câmera. Verifique as permissões.');
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Escanear QR Code</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {error ? (
          <div className="text-center space-y-4 p-8 bg-destructive/10 rounded-lg">
            <Camera className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        ) : (
          <div 
            id="qr-reader" 
            ref={containerRef}
            className="w-full aspect-square rounded-lg overflow-hidden bg-black"
          />
        )}

        <p className="text-center text-sm text-muted-foreground">
          Aponte a câmera para o QR Code do vale
        </p>
      </div>
    </div>
  );
}
