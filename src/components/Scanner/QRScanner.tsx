import { useEffect, useRef, useState, useCallback, forwardRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export const QRScanner = forwardRef<HTMLDivElement, QRScannerProps>(
  function QRScanner({ onScan, onClose }, ref) {
    const [error, setError] = useState<string>('');
    const [isInitialized, setIsInitialized] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const hasScannedRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const safeStopScanner = useCallback(async () => {
      const scanner = scannerRef.current;
      if (!scanner) return;

      try {
        const state = scanner.getState();
        if (state === Html5QrcodeScannerState.SCANNING || 
            state === Html5QrcodeScannerState.PAUSED) {
          await scanner.stop();
        }
      } catch {
        // Scanner already stopped or in invalid state, ignore
      }
    }, []);

    const handleSuccessfulScan = useCallback(async (decodedText: string) => {
      // Prevent multiple scans
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;

      // Stop scanner first
      await safeStopScanner();
      
      // Then trigger callback
      onScan(decodedText);
    }, [onScan, safeStopScanner]);

    useEffect(() => {
      let mounted = true;
      
      const initScanner = async () => {
        // Wait for DOM element to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mounted) return;

        const element = document.getElementById('qr-reader');
        if (!element) {
          if (mounted) setError('Elemento do scanner não encontrado');
          return;
        }

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
              if (mounted && !hasScannedRef.current) {
                handleSuccessfulScan(decodedText);
              }
            },
            () => {
              // QR code not found in frame, this is normal
            }
          );
          
          if (mounted) {
            setIsInitialized(true);
          }
        } catch (err) {
          console.error('Scanner init error:', err);
          if (mounted) {
            setError('Não foi possível acessar a câmera. Verifique as permissões.');
          }
        }
      };

      initScanner();

      return () => {
        mounted = false;
        hasScannedRef.current = true; // Prevent any pending callbacks
        
        const scanner = scannerRef.current;
        if (scanner) {
          try {
            const state = scanner.getState();
            if (state === Html5QrcodeScannerState.SCANNING || 
                state === Html5QrcodeScannerState.PAUSED) {
              scanner.stop().catch(() => {});
            }
          } catch {
            // Ignore cleanup errors
          }
          scannerRef.current = null;
        }
      };
    }, [handleSuccessfulScan]);

    const handleClose = async () => {
      hasScannedRef.current = true; // Prevent any pending scans
      await safeStopScanner();
      onClose();
    };

    return (
      <div 
        ref={ref || containerRef}
        className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center p-4"
      >
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Escanear QR Code</h2>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {error ? (
            <div className="text-center space-y-4 p-8 bg-destructive/10 rounded-lg">
              <Camera className="h-12 w-12 mx-auto text-destructive" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <div 
                id="qr-reader" 
                className="w-full aspect-square rounded-lg overflow-hidden bg-black"
              />
              {!isInitialized && (
                <div className="text-center text-sm text-muted-foreground">
                  Iniciando câmera...
                </div>
              )}
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Aponte a câmera para o QR Code do vale
          </p>
        </div>
      </div>
    );
  }
);
