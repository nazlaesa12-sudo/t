import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useHRM } from '../context/HRMContext';
import {
  AuthErrorDetails,
  FIREBASE_AUTH_SETTINGS_URL,
  FIREBASE_PROJECT_ID,
  mapFirebaseAuthError,
} from '../lib/firebase';
import { WorkspaceMode } from '../types/hrm';
import { formatDateDDMMMYYYY } from '../utils/dateFormat';
import { PWAInstallButton } from './PWAComponents';
import { PhoneFrameShell } from './PhoneFrameShell';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, loginAsLocalDemo } = useHRM();
  const [selectedRole, setSelectedRole] = useState<'employee' | 'manager'>('employee');
  const [selectedMode, setSelectedMode] = useState<WorkspaceMode>('employee');
  const [preferredEmpId, setPreferredEmpId] = useState<string>('emp_siti_ops');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorDetails | null>(null);
  const [copiedHostname, setCopiedHostname] = useState(false);

  const todayDisplay = formatDateDDMMMYYYY(new Date());
  const currentHostname =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : '';

  const handleLogin = async (
    modeOverride?: WorkspaceMode,
    empIdOverride?: string
  ) => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await loginWithGoogle(
        modeOverride ?? selectedMode,
        empIdOverride ?? preferredEmpId
      );
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setIsSigningIn(false);
    }
  };

  const applyDemoPreset = (role: 'manager' | 'employee') => {
    setAuthError(null);
    setSelectedRole(role);
    if (role === 'manager') {
      setSelectedMode('manager');
      setPreferredEmpId('emp_arif_mgr');
    } else {
      setSelectedMode('employee');
      setPreferredEmpId('emp_siti_ops');
    }
  };

  const handleCopyHostname = async (hostname: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(hostname);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = hostname;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedHostname(true);
      window.setTimeout(() => setCopiedHostname(false), 2000);
    } catch {
      setCopiedHostname(false);
    }
  };

  return (
    <PhoneFrameShell fullViewport>
      <div className="flex h-full flex-col bg-slate-50 text-slate-900">
        {/* Compact Phone Header */}
        <header className="flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0B1120] text-indigo-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-display text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">
              KaryaSync HRM
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[11px] tabular-nums text-slate-500">
              {todayDisplay}
            </span>
            <PWAInstallButton compact />
          </div>
        </header>

        {/* Scrollable Mobile-First Login Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Mini Obsidian Navy Virtual Fintech Preview */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1120] p-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
            <div className="relative space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] text-slate-400">
                    Presensi Selfie & Upah Harian
                  </p>
                  <div className="mt-0.5 font-mono text-xl font-bold tabular-nums text-white">
                    Rp 100.000
                    <span className="ml-1 text-[11px] font-normal text-slate-400">
                      / hari hadir
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-indigo-300">
                  Real-time
                </span>
              </div>

              <div className="flex items-center gap-4 border-t border-slate-800 pt-2.5 text-[11px] text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Check-in Selfie</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  <span>GPS Akurat</span>
                </span>
              </div>
            </div>
          </section>

          {/* Smart Auth Error / Domain Diagnostic Card */}
          {authError && authError.isUnauthorizedDomain && (
            <section
              aria-live="polite"
              className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-slate-900 space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-sm font-bold text-slate-900">
                    {authError.title}
                  </h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-700">
                    {authError.message}
                  </p>
                </div>
              </div>

              {/* Copyable Detected Hostname */}
              <div className="rounded-2xl border border-amber-200 bg-white p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <Globe className="h-3.5 w-3.5 text-amber-600" />
                    <span>Domain Aktif Terdeteksi</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {FIREBASE_PROJECT_ID}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-xl bg-slate-100 px-3 py-2 font-mono text-[11px] font-semibold tabular-nums text-slate-900 select-all">
                    {authError.hostname}
                  </code>
                  <button
                    type="button"
                    onClick={() => void handleCopyHostname(authError.hostname)}
                    className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 active:scale-[0.98]"
                  >
                    {copiedHostname ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-600" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Concise 3-Step Recovery */}
              <ol className="space-y-1 text-[11px] leading-relaxed text-slate-700 pl-4 list-decimal">
                <li>
                  Buka <span className="font-semibold">Firebase Console</span> melalui tombol di bawah.
                </li>
                <li>
                  Masuk ke <span className="font-semibold">Authentication → Settings → Authorized domains</span> lalu klik <span className="font-semibold">Add domain</span>.
                </li>
                <li>
                  Tempel domain di atas, simpan, lalu ketuk <span className="font-semibold">Coba Lagi</span>.
                </li>
              </ol>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <a
                  href={FIREBASE_AUTH_SETTINGS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#0B1120] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
                >
                  <span>Buka Console</span>
                  <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
                </a>
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => void handleLogin()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 text-[11px] font-semibold text-slate-900 transition-colors hover:bg-amber-100/60 active:scale-[0.98] disabled:opacity-60 whitespace-nowrap"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-amber-700" />
                  <span>Coba Lagi</span>
                </button>
              </div>
            </section>
          )}

          {authError && !authError.isUnauthorizedDomain && (
            <section
              aria-live="polite"
              className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 space-y-2"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-red-900">{authError.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-red-700">
                    {authError.message}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-red-600/90">
                    Kode: {authError.code}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => void handleLogin()}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-[11px] font-semibold text-red-800 hover:bg-red-100/60"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Coba Lagi</span>
                </button>
                <button
                  type="button"
                  onClick={() => loginAsLocalDemo(selectedMode, preferredEmpId)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[#0B1120] px-3 text-[11px] font-semibold text-white hover:bg-slate-800"
                >
                  <span>Mode Demo Lokal</span>
                </button>
              </div>
            </section>
          )}

          {/* Login Form Card */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3.5">
            <div>
              <h1 className="font-display text-base font-bold text-slate-900">
                Masuk ke Aplikasi
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Gunakan verifikasi akun Google Firebase untuk sinkronisasi database multi-perangkat.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleLogin();
              }}
              className="space-y-3"
            >
              {/* Role Profile Selector */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Profil Demo Tujuan
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => applyDemoPreset('employee')}
                    className={`min-h-[40px] rounded-lg px-2.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                      selectedRole === 'employee'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Karyawan (Siti)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDemoPreset('manager')}
                    className={`min-h-[40px] rounded-lg px-2.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                      selectedRole === 'manager'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Manager (Arif)
                  </button>
                </div>
              </div>

              {/* Workspace Mode Selector */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Tampilan Setelah Masuk
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedMode('employee')}
                    className={`min-h-[40px] rounded-lg px-2 text-[11px] font-medium transition-colors whitespace-nowrap ${
                      selectedMode === 'employee'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mobile PWA
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMode('split')}
                    className={`min-h-[40px] rounded-lg px-2 text-[11px] font-medium transition-colors whitespace-nowrap ${
                      selectedMode === 'split'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Split View
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMode('manager')}
                    className={`min-h-[40px] rounded-lg px-2 text-[11px] font-medium transition-colors whitespace-nowrap ${
                      selectedMode === 'manager'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Manager
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#0B1120] px-4 py-3 text-xs font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
              >
                <span>
                  {isSigningIn
                    ? 'Memverifikasi Google Firebase...'
                    : 'Masuk dengan Google & Sinkronkan'}
                </span>
                <ArrowRight className="h-4 w-4 text-indigo-400" />
              </button>

              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => loginAsLocalDemo(selectedMode, preferredEmpId)}
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 active:scale-[0.98]"
              >
                <span>Masuk Mode Demo Lokal (Tanpa Google)</span>
              </button>

              {currentHostname && (
                <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-500">
                  <span className="truncate">
                    Host: <span className="font-mono text-slate-700">{currentHostname}</span>
                  </span>
                  <a
                    href={FIREBASE_AUTH_SETTINGS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 font-medium text-indigo-600 hover:underline whitespace-nowrap"
                  >
                    Authorized Domains
                  </a>
                </div>
              )}
            </form>
          </section>

          {/* Compact Demo Credentials & 1-Tap Login */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-slate-900">
                Pintasan Peran Demo
              </span>
              <span className="text-[10px] text-slate-500">
                Ketuk untuk masuk cepat
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => applyDemoPreset('employee')}
                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-colors ${
                  selectedRole === 'employee'
                    ? 'border-indigo-300 bg-indigo-50/50'
                    : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
                }`}
              >
                <div className="flex w-full items-center justify-between text-[11px] font-semibold text-indigo-700">
                  <span>Karyawan</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <span className="mt-1 w-full truncate font-mono text-[10px] text-slate-700">
                  siti.rahma@karyasync.demo
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  Staff Operasional
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyDemoPreset('manager')}
                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-colors ${
                  selectedRole === 'manager'
                    ? 'border-indigo-300 bg-indigo-50/50'
                    : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
                }`}
              >
                <div className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-900">
                  <span>Manager</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <span className="mt-1 w-full truncate font-mono text-[10px] text-slate-700">
                  manager@karyasync.demo
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  HR & Operations
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => void handleLogin('employee', 'emp_siti_ops')}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-2.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-[0.98]"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Masuk Karyawan</span>
              </button>
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => void handleLogin('manager', 'emp_arif_mgr')}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 active:scale-[0.98]"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                <span>Masuk Manager</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </PhoneFrameShell>
  );
};
