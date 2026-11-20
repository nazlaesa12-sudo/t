import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        <span>{compact ? 'Pasang PWA' : 'Install Aplikasi'}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
        title="Panduan pasang PWA ke layar utama"
      >
        <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
        <span>{compact ? 'PWA' : 'Pasang PWA'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Pasang KaryaSync PWA
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Akses cepat presensi selfie langsung dari layar utama ponsel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Tutup panduan"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700">
              {isIOS ? (
                <>
                  <p>
                    1. Ketuk tombol <strong>Bagikan (Share)</strong> pada bilah
                    bawah Safari.
                  </p>
                  <p>
                    2. Gulir ke bawah lalu pilih{' '}
                    <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    1. Buka menu browser (ikon tiga titik di kanan atas Chrome
                    atau Edge).
                  </p>
                  <p>
                    2. Pilih <strong>Instal Aplikasi</strong> atau{' '}
                    <strong>Tambahkan ke Layar Utama</strong>.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full min-h-[44px] rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-md">
      <WifiOff className="h-3.5 w-3.5 text-amber-600" />
      <span>Mode Offline — Menampilkan data tersimpan lokal</span>
    </div>
  );
};
