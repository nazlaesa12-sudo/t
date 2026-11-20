import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Home,
  LogOut,
  MapPin,
  ReceiptText,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useHRM } from '../context/HRMContext';
import { resolveAvatarUrl } from '../constants/avatars';
import { Attendance, CoordinatesCapture, EmployeeTab } from '../types/hrm';
import {
  calculateDaysBetween,
  formatCurrencyIDR,
  formatDateDDMMMYYYY,
  formatPeriodMMMYYYY,
  getCurrentPeriodKey,
  getDateKey,
} from '../utils/dateFormat';
import { PWAInstallButton } from './PWAComponents';
import { SelfieCameraModal } from './SelfieCameraModal';

interface MobileEmployeeAppProps {
  embedded?: boolean;
}

export const MobileEmployeeApp: React.FC<MobileEmployeeAppProps> = () => {
  const {
    isAdminUser,
    employees,
    activeEmployee,
    setActiveEmployeeId,
    workSchedules,
    attendance,
    leaveRequests,
    payrollRecords,
    submitCheckIn,
    submitCheckOut,
    fetchAttendancePhoto,
    submitLeaveRequest,
  } = useHRM();

  const [activeTab, setActiveTab] = useState<EmployeeTab>('beranda');
  const [hideBalance, setHideBalance] = useState(false);
  const [cameraMode, setCameraMode] = useState<'checkin' | 'checkout' | null>(
    null
  );
  const [previewPhoto, setPreviewPhoto] = useState<{
    title: string;
    subtitle: string;
    url: string;
  } | null>(null);
  const [loadingPhotoId, setLoadingPhotoId] = useState<string | null>(null);

  const todayKey = getDateKey(new Date());
  const [leaveType, setLeaveType] = useState<'Tahunan' | 'Sakit' | 'Izin'>(
    'Tahunan'
  );
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState(todayKey);
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveFeedback, setLeaveFeedback] = useState<string | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriodKey());

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const employeeAttendance = useMemo(() => {
    if (!activeEmployee) return [];
    return attendance.filter((a) => a.employeeId === activeEmployee.id);
  }, [attendance, activeEmployee]);

  const todayRecord = useMemo(() => {
    return employeeAttendance.find((a) => a.dateKey === todayKey) ?? null;
  }, [employeeAttendance, todayKey]);

  const employeeLeaves = useMemo(() => {
    if (!activeEmployee) return [];
    return leaveRequests.filter((l) => l.employeeId === activeEmployee.id);
  }, [leaveRequests, activeEmployee]);

  const periodAttendance = useMemo(() => {
    return employeeAttendance.filter((a) =>
      a.dateKey.startsWith(selectedPeriod)
    );
  }, [employeeAttendance, selectedPeriod]);

  const periodDaysPresent = periodAttendance.length;
  const periodLateCount = periodAttendance.filter(
    (a) => a.status === 'Terlambat'
  ).length;
  const periodEstimatedSalary = periodAttendance.reduce(
    (sum, item) =>
      sum + (item.dailyWageSnapshot || activeEmployee?.dailyRate || 100000),
    0
  );

  const currentPayrollRecord = useMemo(() => {
    if (!activeEmployee) return null;
    return (
      payrollRecords.find(
        (p) =>
          p.employeeId === activeEmployee.id && p.periodKey === selectedPeriod
      ) ?? null
    );
  }, [payrollRecords, activeEmployee, selectedPeriod]);

  const todaySchedule = useMemo(() => {
    return workSchedules.find((w) => w.dayOfWeek === now.getDay()) ?? null;
  }, [workSchedules, now]);

  const handleConfirmSelfie = async (
    photoDataUrl: string,
    coords: CoordinatesCapture
  ) => {
    if (!activeEmployee) return;
    if (cameraMode === 'checkin') {
      await submitCheckIn(activeEmployee, photoDataUrl, coords);
    } else if (cameraMode === 'checkout' && todayRecord) {
      await submitCheckOut(todayRecord, photoDataUrl, coords);
    }
  };

  const handleOpenPhoto = async (
    photoId: string,
    title: string,
    subtitle: string
  ) => {
    if (!photoId) return;
    setLoadingPhotoId(photoId);
    try {
      const url = await fetchAttendancePhoto(photoId);
      if (url) {
        setPreviewPhoto({ title, subtitle, url });
      }
    } finally {
      setLoadingPhotoId(null);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee || leaveReason.trim().length < 3) return;
    setIsSubmittingLeave(true);
    setLeaveFeedback(null);
    try {
      const safeEnd = endDate < startDate ? startDate : endDate;
      await submitLeaveRequest(activeEmployee, {
        leaveType,
        startDate,
        endDate: safeEnd,
        reason: leaveReason,
      });
      setLeaveReason('');
      setLeaveFeedback('Pengajuan cuti berhasil dikirim ke Management.');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  if (!activeEmployee) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center p-6 text-center text-sm text-slate-500">
        Memuat akun karyawan dari Firestore...
      </div>
    );
  }

  const canCheckIn = !todayRecord;
  const canCheckOut = Boolean(todayRecord && !todayRecord.checkOutTime);
  const completedToday = Boolean(todayRecord && todayRecord.checkOutTime);

  const renderStatusLabel = (
    status:
      | 'Hadir'
      | 'Terlambat'
      | 'Menunggu'
      | 'Disetujui'
      | 'Ditolak'
      | 'Dibayar'
      | 'Belum Dibayar'
  ) => {
    const styles: Record<string, string> = {
      Hadir: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Disetujui: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Dibayar: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Terlambat: 'border-amber-200 bg-amber-50 text-amber-800',
      Menunggu: 'border-amber-200 bg-amber-50 text-amber-800',
      'Belum Dibayar': 'border-slate-200 bg-slate-100 text-slate-700',
      Ditolak: 'border-red-200 bg-red-50 text-red-700',
    };
    return (
      <span
        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  const navItems: { id: EmployeeTab; label: string; icon: React.ReactNode }[] = [
    { id: 'beranda', label: 'Beranda', icon: <Home className="h-5 w-5" /> },
    { id: 'presensi', label: 'Presensi', icon: <Camera className="h-5 w-5" /> },
    { id: 'cuti', label: 'Cuti', icon: <CalendarDays className="h-5 w-5" /> },
    { id: 'laporan', label: 'Laporan', icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'profil', label: 'Profil', icon: <User className="h-5 w-5" /> },
  ];

  const triggerPrimaryCheckAction = () => {
    if (canCheckIn) setCameraMode('checkin');
    else if (canCheckOut) setCameraMode('checkout');
    else setActiveTab('presensi');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 text-slate-900">
      {/* Compact Mobile Top App Bar (52px) */}
      <header className="sticky top-0 z-20 flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={resolveAvatarUrl(activeEmployee.avatarUrl)}
            alt={activeEmployee.fullName}
            className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover"
          />
          <div className="min-w-0">
            {isAdminUser && employees.length > 1 ? (
              <select
                aria-label="Pilih akun karyawan demo"
                value={activeEmployee.id}
                onChange={(e) => setActiveEmployeeId(e.target.value)}
                className="max-w-[155px] truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="truncate text-sm font-semibold text-slate-900">
                {activeEmployee.fullName}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[11px] tabular-nums text-slate-500">
            {formatDateDDMMMYYYY(now)}
          </span>
          <PWAInstallButton compact />
        </div>
      </header>

      {/* Main Scrollable Phone Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {activeTab === 'beranda' && (
          <div className="space-y-4">
            {/* Obsidian Navy Virtual Salary & Attendance Card */}
            <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1120] p-5 text-white shadow-lg">
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/20 blur-2xl" />

              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-slate-400">
                      Akumulasi Upah · {formatPeriodMMMYYYY(selectedPeriod)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-2xl font-bold tracking-tight tabular-nums text-white">
                        {hideBalance
                          ? 'Rp •••••••'
                          : formatCurrencyIDR(periodEstimatedSalary)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHideBalance((v) => !v)}
                        aria-label={
                          hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                      >
                        {hideBalance ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-[11px] tabular-nums text-indigo-300">
                      {periodDaysPresent} hari hadir
                    </span>
                    <div className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-400">
                      {formatCurrencyIDR(activeEmployee.dailyRate)}/hari
                    </div>
                  </div>
                </div>

                {/* Check-in & Check-out Readout Strip */}
                <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <div>
                    <span className="text-[10px] text-slate-400">
                      Check-in Hari Ini
                    </span>
                    <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white">
                      {todayRecord?.checkInTime || '--:--:--'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">
                      Check-out Hari Ini
                    </span>
                    <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white">
                      {todayRecord?.checkOutTime || '--:--:--'}
                    </div>
                  </div>
                </div>

                {/* Shift Metadata + Primary Fintech Action */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{activeEmployee.positionName}</span>
                    <span className="font-mono tabular-nums">
                      {todaySchedule?.isWorkingDay
                        ? `Shift ${todaySchedule.checkInStart} – ${todaySchedule.checkOutMin}`
                        : 'Hari Libur'}
                    </span>
                  </div>

                  {canCheckIn && (
                    <button
                      type="button"
                      onClick={() => setCameraMode('checkin')}
                      className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-400 active:scale-[0.98]"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Check-in Selfie Sekarang</span>
                    </button>
                  )}

                  {canCheckOut && (
                    <button
                      type="button"
                      onClick={() => setCameraMode('checkout')}
                      className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100 active:scale-[0.98]"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Check-out Selfie Sekarang</span>
                    </button>
                  )}

                  {completedToday && (
                    <div className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>
                        Check-in & Check-out {formatDateDDMMMYYYY(now)} Selesai
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Quick Actions 4-Column Thumb Grid */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-3">
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={triggerPrimaryCheckAction}
                  className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl p-1.5 text-center transition-all hover:bg-slate-50 active:scale-[0.97]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Camera className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">
                    {canCheckOut ? 'Check-out' : 'Check-in'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('cuti')}
                  className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl p-1.5 text-center transition-all hover:bg-slate-50 active:scale-[0.97]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">
                    Ajukan Cuti
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('laporan')}
                  className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl p-1.5 text-center transition-all hover:bg-slate-50 active:scale-[0.97]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">
                    Laporan
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('profil')}
                  className="flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl p-1.5 text-center transition-all hover:bg-slate-50 active:scale-[0.97]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <ReceiptText className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">
                    Slip Gaji
                  </span>
                </button>
              </div>
            </section>

            {/* Timeline Upah Harian (Fintech Ledger) */}
            <section className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Timeline Upah Harian
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kredit otomatis per Check-in terverifikasi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('presensi')}
                  className="text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap"
                >
                  Semua
                </button>
              </div>

              {employeeAttendance.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Belum ada kredit upah bulan ini. Lakukan Check-in Selfie untuk
                  mencatat kehadiran pertama.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {employeeAttendance.slice(0, 5).map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            att.status === 'Hadir'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          <ArrowDownLeft className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                            <span className="font-mono tabular-nums">
                              {att.displayDate}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate font-normal text-slate-500">
                              {att.status}
                            </span>
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
                            In {att.checkInTime} · Out{' '}
                            {att.checkOutTime || '--:--:--'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-bold tabular-nums text-emerald-700">
                          +{formatCurrencyIDR(att.dailyWageSnapshot)}
                        </div>
                        {att.checkInPhotoId ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleOpenPhoto(
                                att.checkInPhotoId,
                                'Selfie Check-in',
                                `${att.displayDate} · ${att.checkInTime}`
                              )
                            }
                            className="mt-0.5 text-[10px] font-medium text-indigo-600 hover:underline"
                          >
                            {loadingPhotoId === att.checkInPhotoId
                              ? 'Memuat...'
                              : 'Lihat Selfie'}
                          </button>
                        ) : (
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            Tercatat
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Leave Summary */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Status Pengajuan Cuti
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('cuti')}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Kelola
                </button>
              </div>
              {employeeLeaves.length === 0 ? (
                <p className="mt-2.5 text-xs text-slate-500">
                  Belum ada riwayat pengajuan cuti.
                </p>
              ) : (
                <div className="mt-3 divide-y divide-slate-100">
                  {employeeLeaves.slice(0, 2).map((lv) => (
                    <div
                      key={lv.id}
                      className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900">
                          Cuti {lv.leaveType} · {lv.totalDays} hari
                        </div>
                        <div className="font-mono text-[11px] tabular-nums text-slate-500">
                          {lv.displayStartDate} s/d {lv.displayEndDate}
                        </div>
                      </div>
                      {renderStatusLabel(lv.status)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'presensi' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-[#0B1120] p-4 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-white">
                    Presensi Check-in & Check-out
                  </h2>
                  <p className="text-xs text-slate-400">
                    Selfie live + GPS otomatis · {formatDateDDMMMYYYY(now)}
                  </p>
                </div>
                {canCheckIn && (
                  <button
                    type="button"
                    onClick={() => setCameraMode('checkin')}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Check-in</span>
                  </button>
                )}
                {canCheckOut && (
                  <button
                    type="button"
                    onClick={() => setCameraMode('checkout')}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Check-out</span>
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Riwayat Presensi & Bukti ({employeeAttendance.length})
                </h3>
              </div>
              {employeeAttendance.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Belum ada catatan kehadiran. Tekan tombol Check-in di atas
                  untuk mulai presensi hari ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {employeeAttendance.map((att: Attendance) => (
                    <div key={att.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold tabular-nums text-slate-900">
                            {att.displayDate}
                          </span>
                          {renderStatusLabel(att.status)}
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums text-emerald-700">
                          +{formatCurrencyIDR(att.dailyWageSnapshot)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Check-in</span>
                            <Clock className="h-3 w-3" />
                          </div>
                          <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">
                            {att.checkInTime}
                          </div>
                          {att.checkInPhotoId && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleOpenPhoto(
                                  att.checkInPhotoId,
                                  'Foto Selfie Check-in',
                                  `${att.displayDate} · ${att.checkInTime}`
                                )
                              }
                              className="mt-1.5 text-[11px] font-semibold text-indigo-600 hover:underline"
                            >
                              {loadingPhotoId === att.checkInPhotoId
                                ? 'Memuat...'
                                : 'Lihat Selfie'}
                            </button>
                          )}
                        </div>

                        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Check-out</span>
                            <Clock className="h-3 w-3" />
                          </div>
                          <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">
                            {att.checkOutTime || 'Belum'}
                          </div>
                          {att.checkOutPhotoId && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleOpenPhoto(
                                  att.checkOutPhotoId,
                                  'Foto Selfie Check-out',
                                  `${att.displayDate} · ${att.checkOutTime}`
                                )
                              }
                              className="mt-1.5 text-[11px] font-semibold text-indigo-600 hover:underline"
                            >
                              {loadingPhotoId === att.checkOutPhotoId
                                ? 'Memuat...'
                                : 'Lihat Selfie'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                        <span className="truncate">{att.checkInAddress}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cuti' && (
          <div className="space-y-4">
            <form
              onSubmit={(e) => void handleLeaveSubmit(e)}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3.5"
            >
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Ajukan Cuti / Izin
                </h2>
                <p className="text-xs text-slate-500">
                  Pengajuan langsung diteruskan ke Backoffice Management.
                </p>
              </div>

              {leaveFeedback && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  {leaveFeedback}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Jenis Cuti
                </label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
                  {(['Tahunan', 'Sakit', 'Izin'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLeaveType(t)}
                      className={`min-h-[40px] rounded-lg text-xs font-medium transition-colors ${
                        leaveType === t
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <span className="mt-1 block font-mono text-[10px] text-slate-500">
                    {formatDateDDMMMYYYY(startDate)}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <span className="mt-1 block font-mono text-[10px] text-slate-500">
                    {formatDateDDMMMYYYY(
                      endDate < startDate ? startDate : endDate
                    )}{' '}
                    ·{' '}
                    {calculateDaysBetween(
                      startDate,
                      endDate < startDate ? startDate : endDate
                    )}{' '}
                    hari
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Alasan Pengajuan
                </label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  required
                  minLength={3}
                  maxLength={400}
                  placeholder="Tuliskan keterangan singkat keperluan cuti..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingLeave || leaveReason.trim().length < 3}
                className="flex w-full min-h-[48px] items-center justify-center rounded-xl bg-[#0B1120] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmittingLeave ? 'Mengirim...' : 'Kirim Pengajuan Cuti'}
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Riwayat Cuti Saya ({employeeLeaves.length})
                </h3>
              </div>
              {employeeLeaves.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Belum ada pengajuan cuti tercatat.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {employeeLeaves.map((lv) => (
                    <div key={lv.id} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          Cuti {lv.leaveType} · {lv.totalDays} hari
                        </span>
                        {renderStatusLabel(lv.status)}
                      </div>
                      <div className="font-mono text-[11px] tabular-nums text-slate-500">
                        {lv.displayStartDate} s/d {lv.displayEndDate}
                      </div>
                      <p className="text-xs text-slate-600">{lv.reason}</p>
                      {lv.reviewNote && (
                        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                          Catatan Manager ({lv.reviewedBy || 'HR'}):{' '}
                          {lv.reviewNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'laporan' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Laporan Kehadiran & Upah
                </h2>
                <p className="text-xs text-slate-500">
                  Periode {formatPeriodMMMYYYY(selectedPeriod)}
                </p>
              </div>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-3">
                <span className="text-[11px] text-slate-500">Hari Hadir</span>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900">
                  {periodDaysPresent}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-3">
                <span className="text-[11px] text-slate-500">Terlambat</span>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-amber-700">
                  {periodLateCount}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-3">
                <span className="text-[11px] text-slate-500">Cuti</span>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-indigo-700">
                  {
                    employeeLeaves.filter(
                      (l) =>
                        l.status === 'Disetujui' &&
                        l.startDate.startsWith(selectedPeriod)
                    ).length
                  }
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Buku Kas Upah Harian
                </h3>
                <span className="font-mono text-xs font-bold tabular-nums text-indigo-700">
                  {formatCurrencyIDR(periodEstimatedSalary)}
                </span>
              </div>
              {periodAttendance.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Tidak ada catatan presensi pada periode{' '}
                  {formatPeriodMMMYYYY(selectedPeriod)}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {periodAttendance.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                    >
                      <div>
                        <div className="font-mono font-semibold tabular-nums text-slate-900">
                          {att.displayDate}
                        </div>
                        <div className="font-mono text-[11px] tabular-nums text-slate-500">
                          In {att.checkInTime} · Out{' '}
                          {att.checkOutTime || '--:--:--'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold tabular-nums text-emerald-700">
                          +{formatCurrencyIDR(att.dailyWageSnapshot)}
                        </div>
                        <div className="mt-0.5">{renderStatusLabel(att.status)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profil' && (
          <div className="space-y-4">
            {/* Obsidian Navy Virtual Payroll & ID Card */}
            <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1120] p-5 text-white shadow-lg">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveAvatarUrl(activeEmployee.avatarUrl)}
                      alt={activeEmployee.fullName}
                      className="h-12 w-12 rounded-2xl border border-slate-700 object-cover"
                    />
                    <div>
                      <h2 className="font-display text-base font-bold text-white">
                        {activeEmployee.fullName}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {activeEmployee.positionName} ·{' '}
                        <span className="font-mono">
                          {activeEmployee.employeeCode}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Wallet className="h-5 w-5 text-indigo-400" />
                </div>

                <div className="border-t border-slate-800 pt-3.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Slip Gaji · {formatPeriodMMMYYYY(selectedPeriod)}</span>
                    {renderStatusLabel(
                      currentPayrollRecord?.paymentStatus ?? 'Belum Dibayar'
                    )}
                  </div>
                  <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-white">
                    {formatCurrencyIDR(periodEstimatedSalary)}
                  </div>
                  <div className="mt-1 font-mono text-[11px] tabular-nums text-indigo-300">
                    {periodDaysPresent} hari hadir ×{' '}
                    {formatCurrencyIDR(activeEmployee.dailyRate)}/hari
                  </div>
                  {currentPayrollRecord?.paidDateDisplay && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                      <FileText className="h-3.5 w-3.5" />
                      <span>
                        Dibayarkan {currentPayrollRecord.paidDateDisplay}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  Pilih Periode Slip Gaji
                </span>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Biodata Card */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Biodata Karyawan
              </h3>
              <div className="mt-3 divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-500">Nama Lengkap</span>
                  <span className="font-semibold text-slate-900">
                    {activeEmployee.fullName}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-500">Kode Karyawan</span>
                  <span className="font-mono text-slate-900">
                    {activeEmployee.employeeCode}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-500">Email</span>
                  <span className="font-mono text-slate-900">
                    {activeEmployee.email}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-500">No. Telepon</span>
                  <span className="font-mono text-slate-900">
                    {activeEmployee.phone}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-500">Tanggal Bergabung</span>
                  <span className="font-mono text-slate-900">
                    {activeEmployee.joinDate}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-500">Tarif Gaji Harian</span>
                  <span className="font-mono font-bold tabular-nums text-indigo-700">
                    {formatCurrencyIDR(activeEmployee.dailyRate)} / hari
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold text-emerald-700">
                    {activeEmployee.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Persistent 5-Tab Bottom Navigation Bar */}
      <nav className="sticky bottom-0 z-20 shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe">
        <div className="grid h-16 grid-cols-5 items-center">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-[#0B1120]' : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-indigo-600" />
                )}
                {item.icon}
                <span
                  className={`text-[10px] tracking-tight whitespace-nowrap ${
                    active ? 'font-semibold text-indigo-700' : 'font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Selfie Capture Modal */}
      {cameraMode && (
        <SelfieCameraModal
          mode={cameraMode}
          employeeName={activeEmployee.fullName}
          onClose={() => setCameraMode(null)}
          onConfirm={handleConfirmSelfie}
        />
      )}

      {/* Photo Viewer Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  {previewPhoto.title}
                </h4>
                <p className="font-mono text-[11px] text-slate-500">
                  {previewPhoto.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="mx-auto aspect-[4/5] w-full max-w-[280px] rounded-2xl border border-slate-200 object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
