import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore, GradeLevel } from '@/lib/store';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, Camera, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Scanner = () => {
  const currentUser = useStore(s => s.currentUser);
  const allStudents = useStore(s => s.students);
  const students = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allStudents;
    return allStudents.filter(s => s.gradeLevel === currentUser.gradeLevel);
  }, [allStudents, currentUser]);
  const recordAttendance = useStore(s => s.recordAttendance);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'duplicate'; message: string; status?: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch { }
      try {
        scannerRef.current.clear();
      } catch { }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleScan = useCallback((decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      if (!data.studentId || !data.name || !data.grade) {
        setResult({ type: 'error', message: 'Invalid QR code format' });
        return;
      }
      // Verify student exists
      const student = students.find(s => s.studentId === data.studentId);
      if (!student) {
        setResult({ type: 'error', message: `Student ${data.studentId} not found in your grade` });
        return;
      }
      const res = recordAttendance(data.studentId, data.name, data.grade as GradeLevel);
      if (res.success) {
        setResult({ type: 'success', message: `Attendance recorded for ${data.name}`, status: res.status });
        toast.success('Attendance recorded successfully.');
      } else {
        setResult({ type: 'duplicate', message: res.error || 'Duplicate scan' });
      }
    } catch {
      setResult({ type: 'error', message: 'Could not read QR code data' });
    }
  }, [students, recordAttendance]);

  const startScanner = useCallback(async () => {
    setResult(null);
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScan(decodedText);
          // Don't stop scanner, just show result and keep scanning
        },
        () => { } // ignore errors during scanning
      );
      setScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      toast.error('Camera access denied or not available. Please allow camera permission.');
    }
  }, [handleScan]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">QR Scanner</h1>
        <p className="text-muted-foreground text-sm mt-1">Scan student QR codes to record attendance</p>
      </div>

      {/* Scanner viewport */}
      <div className="bg-primary rounded-2xl overflow-hidden shadow-lg">
        <div ref={containerRef} className="relative">
          <div id="qr-reader" className="w-full" style={{ minHeight: scanning ? 'auto' : '300px' }}>
            {!scanning && (
              <div className="flex flex-col items-center justify-center py-20 text-primary-foreground/60">
                <Camera className="w-16 h-16 mb-4" />
                <p className="text-sm">Camera preview will appear here</p>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 flex justify-center">
          {!scanning ? (
            <Button onClick={startScanner} className="bg-accent text-accent-foreground hover:bg-accent/90 px-8">
              <ScanLine className="w-4 h-4 mr-2" /> Start Scanning
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="secondary" className="px-8">
              Stop Scanner
            </Button>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`animate-fade-up rounded-xl border p-4 flex items-start gap-3 ${
          result.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
          result.type === 'duplicate' ? 'bg-amber-50 border-amber-200' :
          'bg-red-50 border-red-200'
        }`}>
          {result.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-status-present shrink-0 mt-0.5" />
          ) : result.type === 'duplicate' ? (
            <AlertTriangle className="w-5 h-5 text-status-late shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-status-absent shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium text-foreground">{result.message}</p>
            {result.status && (
              <p className="text-sm text-muted-foreground mt-0.5">Status: {result.status}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
