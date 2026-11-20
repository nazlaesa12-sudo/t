import React, { Component, ErrorInfo, ReactNode, useEffect } from 'react';
import {
  CheckCircle2,
  Columns2,
  LogOut,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { HRMProvider, useHRM } from './context/HRMContext';
import { LoginScreen } from './components/LoginScreen';
import { BackofficeManagerApp } from './components/BackofficeManagerApp';
import { MobileEmployeeApp } from './components/MobileEmployeeApp';
import { PhoneFrameShell } from './components/PhoneFrameShell';
import { OfflineIndicator } from './components/PWAComponents';

class HRMErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('KaryaSync ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Terjadi Gangguan Sinkronisasi
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 min-h-[42px] rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const WorkspaceShell: React.FC = () => {
  const {
    user,
    authReady,
    isLocalDemoMode,
    workspaceMode,
    setWorkspaceMode,
    logout,
    actionNotice,
    clearActionNotice,
  } = useHRM();

  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => clearActionNotice(), 4000);
    return () => clearTimeout(timer);
  }, [actionNotice, clearActionNotice]);

  if (!authReady && !isLocalDemoMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-medium text-slate-500">
          Menghubungkan ke KaryaSync HRM...
        </div>
      </div>
    );
  }

  if (!user && !isLocalDemoMode) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:gap-8 sm:px-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            KaryaSync HRM
          </span>

          {/* Zone 2: Concise Mode Links */}
          <nav
            aria-label="Mode tampilan"
            className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 overflow-x-auto"
          >
            <button
              type="button"
              onClick={() => setWorkspaceMode('employee')}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                workspaceMode === 'employee'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile PWA</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkspaceMode('split')}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                workspaceMode === 'split'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span>Split View</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkspaceMode('manager')}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                workspaceMode === 'manager'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Manager</span>
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      {workspaceMode === 'employee' && (
        <PhoneFrameShell>
          <MobileEmployeeApp />
        </PhoneFrameShell>
      )}

      {workspaceMode === 'manager' && (
        <div className="flex-1 bg-slate-50">
          <BackofficeManagerApp />
        </div>
      )}

      {workspaceMode === 'split' && (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:h-[calc(100vh-56px)] lg:flex-row lg:overflow-hidden">
          {/* Left: Backoffice Manager */}
          <section className="flex-1 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:h-full">
            <BackofficeManagerApp compact />
          </section>

          {/* Right: Mobile PWA Employee Viewport */}
          <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-[32px] border border-slate-300 bg-white shadow-md lg:h-full lg:w-[392px]">
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0B1120] px-4 py-2 text-[11px] font-medium text-slate-200">
              <span>Mobile PWA Karyawan</span>
              <span className="font-mono text-indigo-300">Live Sync</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <MobileEmployeeApp embedded />
            </div>
          </aside>
        </div>
      )}

      {/* Action Feedback Toast */}
      {actionNotice && (
        <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-2.5 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-xs font-medium text-slate-900 shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600" />
          <span className="flex-1">{actionNotice}</span>
          <button
            type="button"
            onClick={clearActionNotice}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Tutup notifikasi"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <HRMErrorBoundary>
      <HRMProvider>
        <WorkspaceShell />
      </HRMProvider>
    </HRMErrorBoundary>
  );
}
