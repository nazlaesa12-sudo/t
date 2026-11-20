import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Lock,
  Mail,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useHRM } from '../context/HRMContext';
import { WorkspaceMode } from '../types/hrm';
import { formatDateDDMMMYYYY } from '../utils/dateFormat';
import { PWAInstallButton } from './PWAComponents';
import { PhoneFrameShell } from './PhoneFrameShell';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle } = useHRM();
  const [email, setEmail] = useState('siti.rahma@karyasync.demo');
  const [password, setPassword] = useState('Karyawan#2026');
  const [selectedMode, setSelectedMode] = useState<WorkspaceMode>('employee');
  const [preferredEmpId, setPreferredEmpId] = useState<string>('emp_siti_ops');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const todayDisplay = formatDateDDMMMYYYY(new Date());

  const handleLogin = async (
    modeOverride?: WorkspaceMode,
    empIdOverride?: string
  ) => {
    setErrorMsg(null);
    setIsSigningIn(true);
    try {
      await loginWithGoogle(
        modeOverride ?? selectedMode,
        empIdOverride ?? preferredEmpId
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Autentikasi dibatalkan atau gagal. Silakan coba kembali.';
      setErrorMsg(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const applyDemoPreset = (role: 'manager' | 'employee') => {
    if (role === 'manager') {
      setEmail('manager@karyasync.demo');
      setPassword('Manager#2026');
      setSelectedMode('manager');
      setPreferredEmpId('emp_arif_mgr');
    } else {
      setEmail('siti.rahma@karyasync.demo');
      setPassword('Karyawan#2026');
      setSelectedMode('employee');
      setPreferredEmpId('emp_siti_ops');
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

          {/* Login Form Card */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3.5">
            <div>
              <h1 className="font-display text-base font-bold text-slate-900">
                Masuk ke Aplikasi
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Verifikasi sesi Google Firebase untuk sinkronisasi multi-perangkat.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleLogin();
              }}
              className="space-y-3"
            >
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Email Akun / ID Demo
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                    placeholder="nama@karyasync.demo"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Tampilan Setelah Masuk
                </label>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedMode('employee')}
                    className={`min-h-[36px] rounded-lg px-2 text-[11px] font-medium transition-colors whitespace-nowrap ${
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
                    className={`min-h-[36px] rounded-lg px-2 text-[11px] font-medium transition-colors whitespace-nowrap ${
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
                    className={`min-h-[36px] rounded-lg px-2 text-[11px] font-medium transition-colors whitespace-nowrap ${
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
                    ? 'Menghubungkan ke Firestore...'
                    : 'Masuk & Sinkronkan Database'}
                </span>
                <ArrowRight className="h-4 w-4 text-indigo-400" />
              </button>
            </form>
          </section>

          {/* Compact Demo Credentials & 1-Tap Login */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-slate-900">
                Akun Demo Login
              </span>
              <span className="text-[10px] text-slate-500">
                Ketuk untuk isi / masuk
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => applyDemoPreset('employee')}
                className="flex flex-col items-start rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left hover:border-indigo-300"
              >
                <div className="flex w-full items-center justify-between text-[11px] font-semibold text-indigo-700">
                  <span>Karyawan</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <span className="mt-1 w-full truncate font-mono text-[10px] text-slate-700">
                  siti.rahma@karyasync.demo
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  Karyawan#2026
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyDemoPreset('manager')}
                className="flex flex-col items-start rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left hover:border-indigo-300"
              >
                <div className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-900">
                  <span>Manager</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <span className="mt-1 w-full truncate font-mono text-[10px] text-slate-700">
                  manager@karyasync.demo
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  Manager#2026
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => void handleLogin('employee', 'emp_siti_ops')}
                className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-2.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-[0.98]"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Masuk Karyawan</span>
              </button>
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => void handleLogin('manager', 'emp_arif_mgr')}
                className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 active:scale-[0.98]"
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
