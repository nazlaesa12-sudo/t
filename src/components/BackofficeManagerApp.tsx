import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  CalendarClock,
  CalendarDays,
  Camera,
  Check,
  Download,
  Edit3,
  LayoutDashboard,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useHRM } from '../context/HRMContext';
import { resolveAvatarUrl } from '../constants/avatars';
import {
  Attendance,
  Employee,
  ManagerTab,
  Position,
  WorkSchedule,
} from '../types/hrm';
import {
  formatCurrencyIDR,
  formatDateDDMMMYYYY,
  formatPeriodMMMYYYY,
  getCurrentPeriodKey,
  getDateKey,
} from '../utils/dateFormat';

interface BackofficeManagerAppProps {
  compact?: boolean;
}

export const BackofficeManagerApp: React.FC<BackofficeManagerAppProps> = ({
  compact = false,
}) => {
  const {
    isAdminUser,
    isDataLoading,
    positions,
    workSchedules,
    employees,
    attendance,
    leaveRequests,
    payrollRecords,
    createPosition,
    updatePosition,
    deletePosition,
    updateWorkSchedule,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    fetchAttendancePhoto,
    reviewLeaveRequest,
    markPayrollPaid,
  } = useHRM();

  const [activeTab, setActiveTab] = useState<ManagerTab>('ringkasan');
  const [empSubTab, setEmpSubTab] = useState<'employees' | 'positions'>(
    'employees'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<
    'Semua' | 'Menunggu' | 'Disetujui' | 'Ditolak'
  >('Semua');
  const [payrollPeriod, setPayrollPeriod] = useState(getCurrentPeriodKey());

  // Employee modal state
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    employeeCode: '',
    fullName: '',
    email: '',
    phone: '',
    positionId: '',
    role: 'employee' as 'manager' | 'employee',
    status: 'active' as 'active' | 'inactive',
    joinDate: getDateKey(new Date()),
  });

  // Position modal state
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posForm, setPosForm] = useState({
    name: '',
    department: '',
    dailyRate: 100000,
    description: '',
  });

  // Schedule local drafts
  const [scheduleDrafts, setScheduleDrafts] = useState<
    Record<string, WorkSchedule>
  >({});

  // Selfie proof modal
  const [proofModal, setProofModal] = useState<{
    att: Attendance;
    inUrl: string | null;
    outUrl: string | null;
    loading: boolean;
  } | null>(null);

  const todayKey = getDateKey(new Date());
  const todayDisplay = formatDateDDMMMYYYY(new Date());

  const activeEmployeesCount = useMemo(
    () => employees.filter((e) => e.status === 'active').length,
    [employees]
  );

  const todayAttendanceCount = useMemo(
    () => attendance.filter((a) => a.dateKey === todayKey).length,
    [attendance, todayKey]
  );

  const pendingLeavesCount = useMemo(
    () => leaveRequests.filter((l) => l.status === 'Menunggu').length,
    [leaveRequests]
  );

  const payrollRows = useMemo(() => {
    return employees.map((emp) => {
      const empPeriodAtt = attendance.filter(
        (a) => a.employeeId === emp.id && a.dateKey.startsWith(payrollPeriod)
      );
      const daysPresent = empPeriodAtt.length;
      const pos = positions.find((p) => p.id === emp.positionId);
      const dailyRate = pos?.dailyRate ?? emp.dailyRate ?? 100000;
      const totalAmount = empPeriodAtt.reduce(
        (sum, a) => sum + (a.dailyWageSnapshot || dailyRate),
        0
      );
      const record = payrollRecords.find(
        (p) => p.employeeId === emp.id && p.periodKey === payrollPeriod
      );
      return {
        employee: emp,
        daysPresent,
        dailyRate,
        totalAmount,
        paymentStatus: record?.paymentStatus ?? ('Belum Dibayar' as const),
        paidDateDisplay: record?.paidDateDisplay ?? '',
      };
    });
  }, [employees, attendance, positions, payrollRecords, payrollPeriod]);

  const totalPayrollEstimate = useMemo(
    () => payrollRows.reduce((s, r) => s + r.totalAmount, 0),
    [payrollRows]
  );

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.positionName.toLowerCase().includes(q)
    );
  }, [employees, searchTerm]);

  const filteredAttendance = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return attendance.filter((a) => {
      if (attendanceDateFilter && a.dateKey !== attendanceDateFilter) {
        return false;
      }
      if (q && !a.employeeName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [attendance, attendanceDateFilter, searchTerm]);

  const filteredLeaves = useMemo(() => {
    if (leaveStatusFilter === 'Semua') return leaveRequests;
    return leaveRequests.filter((l) => l.status === leaveStatusFilter);
  }, [leaveRequests, leaveStatusFilter]);

  const openNewEmployeeModal = () => {
    setEditingEmp(null);
    setEmpForm({
      employeeCode: `KRY-00${employees.length + 1}`,
      fullName: '',
      email: '',
      phone: '',
      positionId: positions[0]?.id ?? '',
      role: 'employee',
      status: 'active',
      joinDate: getDateKey(new Date()),
    });
    setEmpModalOpen(true);
  };

  const openEditEmployeeModal = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpForm({
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone,
      positionId: emp.positionId,
      role: emp.role,
      status: emp.status,
      joinDate: emp.joinDate,
    });
    setEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmp) {
      await updateEmployee(editingEmp.id, empForm);
    } else {
      await createEmployee(empForm);
    }
    setEmpModalOpen(false);
  };

  const openNewPositionModal = () => {
    setEditingPos(null);
    setPosForm({
      name: '',
      department: 'Operasional',
      dailyRate: 100000,
      description: '',
    });
    setPosModalOpen(true);
  };

  const openEditPositionModal = (pos: Position) => {
    setEditingPos(pos);
    setPosForm({
      name: pos.name,
      department: pos.department,
      dailyRate: pos.dailyRate,
      description: pos.description,
    });
    setPosModalOpen(true);
  };

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPos) {
      await updatePosition(editingPos.id, posForm);
    } else {
      await createPosition(posForm);
    }
    setPosModalOpen(false);
  };

  const handleOpenProofModal = async (att: Attendance) => {
    setProofModal({ att, inUrl: null, outUrl: null, loading: true });
    const [inUrl, outUrl] = await Promise.all([
      att.checkInPhotoId
        ? fetchAttendancePhoto(att.checkInPhotoId)
        : Promise.resolve(null),
      att.checkOutPhotoId
        ? fetchAttendancePhoto(att.checkOutPhotoId)
        : Promise.resolve(null),
    ]);
    setProofModal({ att, inUrl, outUrl, loading: false });
  };

  const handleExportPayrollCSV = () => {
    const headers = [
      'Kode',
      'Nama Karyawan',
      'Jabatan',
      'Periode',
      'Hari Hadir',
      'Tarif Harian (IDR)',
      'Total Gaji (IDR)',
      'Status Pembayaran',
      'Tanggal Bayar',
    ];
    const rows = payrollRows.map((r) => [
      r.employee.employeeCode,
      r.employee.fullName,
      r.employee.positionName,
      formatPeriodMMMYYYY(payrollPeriod),
      String(r.daysPresent),
      String(r.dailyRate),
      String(r.totalAmount),
      r.paymentStatus,
      r.paidDateDisplay || '-',
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-karyasync-${payrollPeriod}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Hadir: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Disetujui: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Dibayar: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Terlambat: 'border-amber-200 bg-amber-50 text-amber-800',
      Menunggu: 'border-amber-200 bg-amber-50 text-amber-800',
      'Belum Dibayar': 'border-slate-200 bg-slate-100 text-slate-700',
      inactive: 'border-slate-200 bg-slate-100 text-slate-600',
      Ditolak: 'border-red-200 bg-red-50 text-red-700',
    };
    const label =
      status === 'active'
        ? 'Aktif'
        : status === 'inactive'
        ? 'Nonaktif'
        : status;
    return (
      <span
        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
          map[status] ?? 'border-slate-200 bg-slate-100 text-slate-700'
        }`}
      >
        {label}
      </span>
    );
  };

  const navItems: {
    id: ManagerTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'ringkasan',
      label: 'Ringkasan',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'karyawan',
      label: 'Karyawan & Jabatan',
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 'jadwal',
      label: 'Hari & Jam Kerja',
      icon: <CalendarClock className="h-4 w-4" />,
    },
    {
      id: 'kehadiran',
      label: 'Data Kehadiran',
      icon: <Camera className="h-4 w-4" />,
    },
    {
      id: 'cuti',
      label: 'Pengajuan Cuti',
      icon: <CalendarDays className="h-4 w-4" />,
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
    },
    {
      id: 'payroll',
      label: 'Payroll Harian',
      icon: <Wallet className="h-4 w-4" />,
    },
  ];

  const getScheduleDraft = (ws: WorkSchedule): WorkSchedule =>
    scheduleDrafts[ws.id] ?? ws;

  const setScheduleField = (
    ws: WorkSchedule,
    patch: Partial<WorkSchedule>
  ) => {
    setScheduleDrafts((prev) => ({
      ...prev,
      [ws.id]: { ...getScheduleDraft(ws), ...patch },
    }));
  };

  return (
    <div className="flex h-full min-h-[600px] flex-col bg-slate-50 text-slate-900 lg:flex-row">
      {/* Sidebar Navigation (Desktop) */}
      <aside
        className={`hidden shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col ${
          compact ? 'w-[210px]' : 'w-[248px]'
        }`}
      >
        <div className="border-b border-slate-200 px-4 py-3.5">
          <div className="font-display text-sm font-bold text-slate-900">
            Backoffice Management
          </div>
          <div className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
            {todayDisplay}
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-2.5">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full min-h-[42px] items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span className="font-mono text-[11px] font-semibold text-amber-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3.5 text-[11px] text-slate-500">
          {isAdminUser ? (
            <span>Akses penuh Administrator HR</span>
          ) : (
            <span>Mode Pratinjau Data Pribadi</span>
          )}
        </div>
      </aside>

      {/* Mobile / Narrow Top Tab Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {!isAdminUser && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Anda masuk bukan sebagai akun Administrator utama. Untuk mengelola
            data seluruh karyawan, jabatan, jadwal kerja, dan payroll tim, masuk
            menggunakan akun Administrator utama.
          </div>
        )}

        {/* TAB 1: RINGKASAN */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900">
                Ringkasan Operasional SDM
              </h1>
              <p className="text-xs text-slate-500">
                Data tersinkronisasi real-time · {todayDisplay}
              </p>
            </div>

            {/* 4-column KPI strip */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Karyawan Aktif</div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                  {activeEmployeesCount}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Hadir Hari Ini</div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-700">
                  {todayAttendanceCount}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Cuti Menunggu</div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-700">
                  {pendingLeavesCount}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">
                  Estimasi Payroll ({formatPeriodMMMYYYY(payrollPeriod)})
                </div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-indigo-700">
                  {formatCurrencyIDR(totalPayrollEstimate)}
                </div>
              </div>
            </div>

            {/* Recent Attendance Live */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Aktivitas Check-in & Check-out Terbaru
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('kehadiran')}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Lihat Semua
                </button>
              </div>
              {isDataLoading ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Menyinkronkan data dari Firestore...
                </div>
              ) : attendance.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Belum ada catatan kehadiran. Coba lakukan Check-in pada Mobile
                  PWA Karyawan.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Karyawan</th>
                        <th className="px-4 py-2.5 font-medium">Tanggal</th>
                        <th className="px-4 py-2.5 font-medium">Check-in</th>
                        <th className="px-4 py-2.5 font-medium">Check-out</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium text-right">
                          Selfie & GPS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendance.slice(0, 6).map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            {att.employeeName}
                            <div className="text-[11px] font-normal text-slate-500">
                              {att.positionName}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {att.displayDate}
                          </td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-slate-900">
                            {att.checkInTime}
                          </td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600">
                            {att.checkOutTime || '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {renderStatusBadge(att.status)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => void handleOpenProofModal(att)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline whitespace-nowrap"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              <span>Bukti</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: KARYAWAN & JABATAN */}
        {activeTab === 'karyawan' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                <button
                  type="button"
                  onClick={() => setEmpSubTab('employees')}
                  className={`min-h-[36px] rounded-md px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                    empSubTab === 'employees'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Data Karyawan ({employees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEmpSubTab('positions')}
                  className={`min-h-[36px] rounded-md px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                    empSubTab === 'positions'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Data Jabatan ({positions.length})
                </button>
              </div>

              {isAdminUser && (
                <button
                  type="button"
                  onClick={
                    empSubTab === 'employees'
                      ? openNewEmployeeModal
                      : openNewPositionModal
                  }
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {empSubTab === 'employees'
                      ? 'Tambah Karyawan'
                      : 'Tambah Jabatan'}
                  </span>
                </button>
              )}
            </div>

            {empSubTab === 'employees' ? (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama, kode, atau jabatan..."
                    className="w-full bg-transparent text-xs text-slate-900 outline-none"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Karyawan</th>
                        <th className="px-4 py-2.5 font-medium">Jabatan</th>
                        <th className="px-4 py-2.5 font-medium text-right">
                          Tarif / Hari
                        </th>
                        <th className="px-4 py-2.5 font-medium">Tgl Gabung</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        {isAdminUser && (
                          <th className="px-4 py-2.5 font-medium text-right">
                            Aksi
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={resolveAvatarUrl(emp.avatarUrl)}
                                alt={emp.fullName}
                                className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                              />
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {emp.fullName}
                                </div>
                                <div className="font-mono text-[11px] text-slate-500">
                                  {emp.employeeCode} · {emp.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">
                            {emp.positionName}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                            {formatCurrencyIDR(emp.dailyRate)}
                          </td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            {emp.joinDate}
                          </td>
                          <td className="px-4 py-2.5">
                            {renderStatusBadge(emp.status)}
                          </td>
                          {isAdminUser && (
                            <td className="px-4 py-2.5 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditEmployeeModal(emp)}
                                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                                  title="Edit karyawan"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteEmployee(emp.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"
                                  title="Hapus karyawan"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {positions.map((pos) => (
                  <div
                    key={pos.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-4 w-4 text-indigo-600" />
                            <h3 className="font-display text-sm font-bold text-slate-900">
                              {pos.name}
                            </h3>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Divisi {pos.department}
                          </p>
                        </div>
                        <div className="text-right font-mono text-sm font-bold tabular-nums text-indigo-700">
                          {formatCurrencyIDR(pos.dailyRate)}
                          <span className="block text-[10px] font-normal text-slate-500">
                            per hari hadir
                          </span>
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                        {pos.description}
                      </p>
                    </div>
                    {isAdminUser && (
                      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                        <button
                          type="button"
                          onClick={() => openEditPositionModal(pos)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Ubah Tarif / Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void deletePosition(pos.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HARI & JAM KERJA */}
        {activeTab === 'jadwal' && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900">
                Pengaturan Hari & Jam Kerja
              </h1>
              <p className="text-xs text-slate-500">
                Menentukan status hari aktif kerja serta acuan ketepatan waktu
                Check-in dan Check-out karyawan.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Hari</th>
                      <th className="px-4 py-2.5 font-medium">Status Kerja</th>
                      <th className="px-4 py-2.5 font-medium">Buka Check-in</th>
                      <th className="px-4 py-2.5 font-medium">
                        Batas Tepat Waktu
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        Min. Check-out
                      </th>
                      {isAdminUser && (
                        <th className="px-4 py-2.5 font-medium text-right">
                          Simpan
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workSchedules.map((ws) => {
                      const draft = getScheduleDraft(ws);
                      const isDirty = Boolean(scheduleDrafts[ws.id]);
                      return (
                        <tr key={ws.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            {ws.dayName}
                          </td>
                          <td className="px-4 py-2.5">
                            <button
                              type="button"
                              disabled={!isAdminUser}
                              onClick={() =>
                                setScheduleField(ws, {
                                  isWorkingDay: !draft.isWorkingDay,
                                })
                              }
                              className={`min-h-[32px] rounded-md border px-2.5 py-1 text-xs font-medium ${
                                draft.isWorkingDay
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-slate-100 text-slate-600'
                              }`}
                            >
                              {draft.isWorkingDay ? 'Hari Kerja' : 'Libur'}
                            </button>
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="time"
                              disabled={!isAdminUser || !draft.isWorkingDay}
                              value={draft.checkInStart}
                              onChange={(e) =>
                                setScheduleField(ws, {
                                  checkInStart: e.target.value,
                                })
                              }
                              className="rounded-md border border-slate-200 px-2 py-1 font-mono text-xs disabled:bg-slate-50"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="time"
                              disabled={!isAdminUser || !draft.isWorkingDay}
                              value={draft.checkInDeadline}
                              onChange={(e) =>
                                setScheduleField(ws, {
                                  checkInDeadline: e.target.value,
                                })
                              }
                              className="rounded-md border border-slate-200 px-2 py-1 font-mono text-xs disabled:bg-slate-50"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="time"
                              disabled={!isAdminUser || !draft.isWorkingDay}
                              value={draft.checkOutMin}
                              onChange={(e) =>
                                setScheduleField(ws, {
                                  checkOutMin: e.target.value,
                                })
                              }
                              className="rounded-md border border-slate-200 px-2 py-1 font-mono text-xs disabled:bg-slate-50"
                            />
                          </td>
                          {isAdminUser && (
                            <td className="px-4 py-2.5 text-right">
                              <button
                                type="button"
                                disabled={!isDirty}
                                onClick={async () => {
                                  await updateWorkSchedule(ws.id, {
                                    isWorkingDay: draft.isWorkingDay,
                                    checkInStart: draft.checkInStart,
                                    checkInDeadline: draft.checkInDeadline,
                                    checkOutMin: draft.checkOutMin,
                                  });
                                  setScheduleDrafts((prev) => {
                                    const copy = { ...prev };
                                    delete copy[ws.id];
                                    return copy;
                                  });
                                }}
                                className="inline-flex min-h-[32px] items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Simpan</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DATA KEHADIRAN */}
        {activeTab === 'kehadiran' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-lg font-bold text-slate-900">
                  Data Kehadiran & Verifikasi Selfie
                </h1>
                <p className="text-xs text-slate-500">
                  Log Check-in & Check-out beserta lokasi GPS dan bukti foto
                  selfie.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama karyawan..."
                  className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500"
                />
                <input
                  type="date"
                  value={attendanceDateFilter}
                  onChange={(e) => setAttendanceDateFilter(e.target.value)}
                  className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-indigo-500"
                />
                {attendanceDateFilter && (
                  <button
                    type="button"
                    onClick={() => setAttendanceDateFilter('')}
                    className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {filteredAttendance.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Tidak ditemukan catatan kehadiran sesuai filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Karyawan</th>
                        <th className="px-4 py-2.5 font-medium">Tanggal</th>
                        <th className="px-4 py-2.5 font-medium">Check-in</th>
                        <th className="px-4 py-2.5 font-medium">Check-out</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium text-right">
                          Upah Harian
                        </th>
                        <th className="px-4 py-2.5 font-medium text-right">
                          Foto & GPS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAttendance.map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">
                              {att.employeeName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {att.positionName}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {att.displayDate}
                          </td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-slate-900">
                            {att.checkInTime}
                          </td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600">
                            {att.checkOutTime || '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {renderStatusBadge(att.status)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                            {formatCurrencyIDR(att.dailyWageSnapshot)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => void handleOpenProofModal(att)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 whitespace-nowrap"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              <span>Lihat Selfie</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PENGAJUAN CUTI */}
        {activeTab === 'cuti' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-lg font-bold text-slate-900">
                  Persetujuan Pengajuan Cuti
                </h1>
                <p className="text-xs text-slate-500">
                  Keputusan Anda langsung diperbarui di aplikasi Mobile PWA
                  karyawan.
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                {(['Semua', 'Menunggu', 'Disetujui', 'Ditolak'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setLeaveStatusFilter(st)}
                      className={`min-h-[34px] rounded-md px-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        leaveStatusFilter === st
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-3">
              {filteredLeaves.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  Tidak ada pengajuan cuti pada kategori {leaveStatusFilter}.
                </div>
              ) : (
                filteredLeaves.map((lv) => (
                  <div
                    key={lv.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-slate-900">
                          {lv.employeeName}
                        </span>
                        <span className="text-xs text-slate-500">
                          · Cuti {lv.leaveType} ({lv.totalDays} hari)
                        </span>
                        {renderStatusBadge(lv.status)}
                      </div>
                      <div className="font-mono text-xs tabular-nums text-slate-600">
                        {lv.displayStartDate} s/d {lv.displayEndDate}
                      </div>
                      <p className="text-xs text-slate-700">{lv.reason}</p>
                      {lv.reviewNote && (
                        <p className="text-[11px] text-slate-500">
                          Catatan: {lv.reviewNote}
                        </p>
                      )}
                    </div>

                    {isAdminUser && lv.status === 'Menunggu' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            void reviewLeaveRequest(
                              lv.id,
                              'Disetujui',
                              'Disetujui oleh Management.'
                            )
                          }
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Setujui</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void reviewLeaveRequest(
                              lv.id,
                              'Ditolak',
                              'Jadwal belum memungkinkan pada tanggal tersebut.'
                            )
                          }
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Tolak</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PAYROLL HARIAN */}
        {activeTab === 'payroll' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-lg font-bold text-slate-900">
                  Payroll Gaji Harian
                </h1>
                <p className="text-xs text-slate-500">
                  Perhitungan otomatis: Hari Hadir × Tarif Harian Jabatan
                  (default Rp 100.000/hari).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="month"
                  value={payrollPeriod}
                  onChange={(e) => setPayrollPeriod(e.target.value)}
                  className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleExportPayrollCSV}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Ekspor CSV</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-indigo-800">
                  Total Beban Payroll · Periode{' '}
                  {formatPeriodMMMYYYY(payrollPeriod)}
                </span>
                <div className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-indigo-950">
                  {formatCurrencyIDR(totalPayrollEstimate)}
                </div>
              </div>
              <div className="text-right text-xs text-indigo-800">
                <div>{payrollRows.length} Karyawan Tercatat</div>
                <div className="font-mono tabular-nums">
                  {payrollRows.reduce((s, r) => s + r.daysPresent, 0)} Total
                  Hari Hadir
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Karyawan</th>
                      <th className="px-4 py-2.5 font-medium">Jabatan</th>
                      <th className="px-4 py-2.5 font-medium text-right">
                        Hari Hadir
                      </th>
                      <th className="px-4 py-2.5 font-medium text-right">
                        Tarif / Hari
                      </th>
                      <th className="px-4 py-2.5 font-medium text-right">
                        Total Gaji
                      </th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      {isAdminUser && (
                        <th className="px-4 py-2.5 font-medium text-right">
                          Aksi
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollRows.map((row) => (
                      <tr key={row.employee.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                          {row.employee.fullName}
                          <div className="font-mono text-[11px] font-normal text-slate-500">
                            {row.employee.employeeCode}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {row.employee.positionName}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                          {row.daysPresent} hari
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                          {formatCurrencyIDR(row.dailyRate)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums text-indigo-700">
                          {formatCurrencyIDR(row.totalAmount)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div>{renderStatusBadge(row.paymentStatus)}</div>
                          {row.paidDateDisplay && (
                            <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                              {row.paidDateDisplay}
                            </div>
                          )}
                        </td>
                        {isAdminUser && (
                          <td className="px-4 py-2.5 text-right">
                            {row.paymentStatus === 'Belum Dibayar' ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void markPayrollPaid(
                                    row.employee,
                                    payrollPeriod,
                                    row.daysPresent,
                                    row.totalAmount
                                  )
                                }
                                className="inline-flex min-h-[34px] items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 whitespace-nowrap"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Tandai Dibayar</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-medium">
                                Lunas
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee Create/Edit Modal */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={(e) => void handleSaveEmployee(e)}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingEmp ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Kode Karyawan
                </label>
                <input
                  required
                  value={empForm.employeeCode}
                  onChange={(e) =>
                    setEmpForm((f) => ({ ...f, employeeCode: e.target.value }))
                  }
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Peran Akses
                </label>
                <select
                  value={empForm.role}
                  onChange={(e) =>
                    setEmpForm((f) => ({
                      ...f,
                      role: e.target.value as 'manager' | 'employee',
                    }))
                  }
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs"
                >
                  <option value="employee">Karyawan</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nama Lengkap
              </label>
              <input
                required
                value={empForm.fullName}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, fullName: e.target.value }))
                }
                className="w-full min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={empForm.email}
                  onChange={(e) =>
                    setEmpForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  No. HP
                </label>
                <input
                  required
                  value={empForm.phone}
                  onChange={(e) =>
                    setEmpForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Jabatan & Tarif
                </label>
                <select
                  required
                  value={empForm.positionId}
                  onChange={(e) =>
                    setEmpForm((f) => ({ ...f, positionId: e.target.value }))
                  }
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 px-2.5 text-xs"
                >
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrencyIDR(p.dailyRate)}/hr)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Tanggal Gabung
                </label>
                <input
                  type="date"
                  required
                  value={
                    /^\d{4}-\d{2}-\d{2}$/.test(empForm.joinDate)
                      ? empForm.joinDate
                      : getDateKey(new Date())
                  }
                  onChange={(e) =>
                    setEmpForm((f) => ({ ...f, joinDate: e.target.value }))
                  }
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 px-2.5 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="min-h-[40px] rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-[40px] rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Simpan Karyawan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Position Create/Edit Modal */}
      {posModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={(e) => void handleSavePosition(e)}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900">
                {editingPos ? 'Edit Data Jabatan' : 'Tambah Jabatan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setPosModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nama Jabatan
              </label>
              <input
                required
                value={posForm.name}
                onChange={(e) =>
                  setPosForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="contoh: Staff Gudang"
                className="w-full min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Divisi / Departemen
                </label>
                <input
                  required
                  value={posForm.department}
                  onChange={(e) =>
                    setPosForm((f) => ({ ...f, department: e.target.value }))
                  }
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Tarif Gaji Harian (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  required
                  value={posForm.dailyRate}
                  onChange={(e) =>
                    setPosForm((f) => ({
                      ...f,
                      dailyRate: Number(e.target.value),
                    }))
                  }
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 px-3 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Deskripsi Singkat
              </label>
              <textarea
                rows={2}
                value={posForm.description}
                onChange={(e) =>
                  setPosForm((f) => ({ ...f, description: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPosModalOpen(false)}
                className="min-h-[40px] rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-[40px] rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Simpan Jabatan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Attendance Selfie & GPS Verification Modal */}
      {proofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Bukti Kehadiran · {proofModal.att.employeeName}
                </h3>
                <p className="font-mono text-[11px] text-slate-500">
                  {proofModal.att.displayDate} · {proofModal.att.positionName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProofModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {/* Check-in Column */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>Check-in</span>
                  <span className="font-mono">{proofModal.att.checkInTime}</span>
                </div>
                {proofModal.loading ? (
                  <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-slate-200 text-xs text-slate-500">
                    Memuat selfie...
                  </div>
                ) : proofModal.inUrl ? (
                  <img
                    src={proofModal.inUrl}
                    alt="Selfie Check-in"
                    className="aspect-[4/5] w-full rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center text-[11px] text-slate-500">
                    Data riwayat historis (tanpa lampiran foto selfie)
                  </div>
                )}
                <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                  <span>{proofModal.att.checkInAddress}</span>
                </div>
              </div>

              {/* Check-out Column */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>Check-out</span>
                  <span className="font-mono">
                    {proofModal.att.checkOutTime || 'Belum'}
                  </span>
                </div>
                {proofModal.loading ? (
                  <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-slate-200 text-xs text-slate-500">
                    Memuat selfie...
                  </div>
                ) : proofModal.outUrl ? (
                  <img
                    src={proofModal.outUrl}
                    alt="Selfie Check-out"
                    className="aspect-[4/5] w-full rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center text-[11px] text-slate-500">
                    {proofModal.att.checkOutTime
                      ? 'Data riwayat historis (tanpa lampiran foto selfie)'
                      : 'Karyawan belum melakukan Check-out'}
                  </div>
                )}
                {proofModal.att.checkOutAddress && (
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                    <span>{proofModal.att.checkOutAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
