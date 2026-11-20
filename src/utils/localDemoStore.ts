import { AVATAR_KEYS } from '../constants/avatars';
import {
  Attendance,
  Employee,
  LeaveRequest,
  PayrollRecord,
  Position,
  WorkSchedule,
  WorkspaceMode,
} from '../types/hrm';
import {
  formatDateDDMMMYYYY,
  getDateKey,
  getIndonesianDayName,
} from './dateFormat';

const DEMO_SESSION_KEY = 'karyasync_local_demo_session_v1';
const DEMO_DATA_KEY = 'karyasync_local_demo_data_v1';
const DEMO_PHOTOS_KEY = 'karyasync_local_demo_photos_v1';

export interface LocalDemoSession {
  active: boolean;
  workspaceMode: WorkspaceMode;
  activeEmployeeId: string;
}

export interface LocalDemoDataset {
  positions: Position[];
  workSchedules: WorkSchedule[];
  employees: Employee[];
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  payrollRecords: PayrollRecord[];
}

export function createInitialDemoDataset(): LocalDemoDataset {
  const ownerUid = 'local_demo_owner';

  const positions: Position[] = [
    {
      id: 'pos_staff_ops',
      name: 'Staff Operasional',
      department: 'Operasional',
      dailyRate: 100000,
      description:
        'Pelaksana operasional harian dengan tarif standar Rp 100.000/hari.',
    },
    {
      id: 'pos_coord_field',
      name: 'Koordinator Lapangan',
      department: 'Operasional',
      dailyRate: 135000,
      description: 'Koordinator unit lapangan dan supervisi check-in tim.',
    },
    {
      id: 'pos_hr_mgr',
      name: 'HR & Operations Manager',
      department: 'Manajemen',
      dailyRate: 200000,
      description: 'Pengelola SDM, persetujuan cuti, jadwal kerja, dan payroll.',
    },
  ];

  const workSchedules: WorkSchedule[] = [];
  for (let d = 0; d <= 6; d++) {
    const isWorking = d >= 1 && d <= 6;
    workSchedules.push({
      id: `day_${d}`,
      dayOfWeek: d,
      dayName: getIndonesianDayName(d),
      isWorkingDay: isWorking,
      checkInStart: '07:00',
      checkInDeadline: '09:00',
      checkOutMin: d === 6 ? '14:00' : '17:00',
    });
  }

  const employees: Employee[] = [
    {
      id: 'emp_arif_mgr',
      employeeCode: 'KRY-001',
      fullName: 'Arif Pratama',
      email: 'manager@karyasync.demo',
      phone: '0812-8800-1101',
      positionId: 'pos_hr_mgr',
      positionName: 'HR & Operations Manager',
      dailyRate: 200000,
      role: 'manager',
      status: 'active',
      joinDate: '12-Jan-2025',
      avatarUrl: AVATAR_KEYS.MANAGER_ARIF,
      ownerUid,
    },
    {
      id: 'emp_siti_ops',
      employeeCode: 'KRY-002',
      fullName: 'Siti Rahma',
      email: 'siti.rahma@karyasync.demo',
      phone: '0813-4421-8890',
      positionId: 'pos_staff_ops',
      positionName: 'Staff Operasional',
      dailyRate: 100000,
      role: 'employee',
      status: 'active',
      joinDate: '03-Mar-2025',
      avatarUrl: AVATAR_KEYS.EMPLOYEE_SITI,
      ownerUid,
    },
    {
      id: 'emp_budi_fld',
      employeeCode: 'KRY-003',
      fullName: 'Budi Santoso',
      email: 'budi.santoso@karyasync.demo',
      phone: '0815-7720-3341',
      positionId: 'pos_coord_field',
      positionName: 'Koordinator Lapangan',
      dailyRate: 135000,
      role: 'employee',
      status: 'active',
      joinDate: '19-Jun-2025',
      avatarUrl: AVATAR_KEYS.EMPLOYEE_BUDI,
      ownerUid,
    },
  ];

  const today = new Date();
  const d1 = new Date(today);
  d1.setDate(today.getDate() - 1);
  const d2 = new Date(today);
  d2.setDate(today.getDate() - 2);
  const d3 = new Date(today);
  d3.setDate(today.getDate() - 3);
  const d4 = new Date(today);
  d4.setDate(today.getDate() - 4);

  const attendance: Attendance[] = [
    {
      id: `emp_siti_ops_${getDateKey(d1)}`,
      employeeId: 'emp_siti_ops',
      employeeName: 'Siti Rahma',
      positionName: 'Staff Operasional',
      ownerUid,
      dateKey: getDateKey(d1),
      displayDate: formatDateDDMMMYYYY(d1),
      checkInTime: '08:14:22',
      checkInLat: -6.208763,
      checkInLng: 106.845599,
      checkInAccuracy: 14,
      checkInAddress: 'Kantor Pusat Jakarta (-6.20876, 106.84560)',
      checkInPhotoId: '',
      checkOutTime: '17:06:40',
      checkOutLat: -6.208791,
      checkOutLng: 106.845612,
      checkOutAccuracy: 18,
      checkOutAddress: 'Kantor Pusat Jakarta (-6.20879, 106.84561)',
      checkOutPhotoId: '',
      status: 'Hadir',
      dailyWageSnapshot: 100000,
    },
    {
      id: `emp_budi_fld_${getDateKey(d1)}`,
      employeeId: 'emp_budi_fld',
      employeeName: 'Budi Santoso',
      positionName: 'Koordinator Lapangan',
      ownerUid,
      dateKey: getDateKey(d1),
      displayDate: formatDateDDMMMYYYY(d1),
      checkInTime: '09:12:04',
      checkInLat: -6.21462,
      checkInLng: 106.84513,
      checkInAccuracy: 21,
      checkInAddress: 'Area Lapangan Selatan (-6.21462, 106.84513)',
      checkInPhotoId: '',
      checkOutTime: '17:19:45',
      checkOutLat: -6.2146,
      checkOutLng: 106.8451,
      checkOutAccuracy: 19,
      checkOutAddress: 'Area Lapangan Selatan (-6.21460, 106.84510)',
      checkOutPhotoId: '',
      status: 'Terlambat',
      dailyWageSnapshot: 135000,
    },
    {
      id: `emp_siti_ops_${getDateKey(d2)}`,
      employeeId: 'emp_siti_ops',
      employeeName: 'Siti Rahma',
      positionName: 'Staff Operasional',
      ownerUid,
      dateKey: getDateKey(d2),
      displayDate: formatDateDDMMMYYYY(d2),
      checkInTime: '08:05:11',
      checkInLat: -6.208755,
      checkInLng: 106.845582,
      checkInAccuracy: 12,
      checkInAddress: 'Kantor Pusat Jakarta (-6.20876, 106.84558)',
      checkInPhotoId: '',
      checkOutTime: '17:02:19',
      checkOutLat: -6.20876,
      checkOutLng: 106.84559,
      checkOutAccuracy: 15,
      checkOutAddress: 'Kantor Pusat Jakarta (-6.20876, 106.84559)',
      checkOutPhotoId: '',
      status: 'Hadir',
      dailyWageSnapshot: 100000,
    },
    {
      id: `emp_siti_ops_${getDateKey(d3)}`,
      employeeId: 'emp_siti_ops',
      employeeName: 'Siti Rahma',
      positionName: 'Staff Operasional',
      ownerUid,
      dateKey: getDateKey(d3),
      displayDate: formatDateDDMMMYYYY(d3),
      checkInTime: '08:21:09',
      checkInLat: -6.208763,
      checkInLng: 106.845599,
      checkInAccuracy: 16,
      checkInAddress: 'Kantor Pusat Jakarta (-6.20876, 106.84560)',
      checkInPhotoId: '',
      checkOutTime: '17:10:02',
      checkOutLat: -6.20877,
      checkOutLng: 106.8456,
      checkOutAccuracy: 16,
      checkOutAddress: 'Kantor Pusat Jakarta (-6.20877, 106.84560)',
      checkOutPhotoId: '',
      status: 'Hadir',
      dailyWageSnapshot: 100000,
    },
    {
      id: `emp_budi_fld_${getDateKey(d4)}`,
      employeeId: 'emp_budi_fld',
      employeeName: 'Budi Santoso',
      positionName: 'Koordinator Lapangan',
      ownerUid,
      dateKey: getDateKey(d4),
      displayDate: formatDateDDMMMYYYY(d4),
      checkInTime: '08:18:30',
      checkInLat: -6.21462,
      checkInLng: 106.84513,
      checkInAccuracy: 17,
      checkInAddress: 'Area Lapangan Selatan (-6.21462, 106.84513)',
      checkInPhotoId: '',
      checkOutTime: '17:08:14',
      checkOutLat: -6.2146,
      checkOutLng: 106.8451,
      checkOutAccuracy: 15,
      checkOutAddress: 'Area Lapangan Selatan (-6.21460, 106.84510)',
      checkOutPhotoId: '',
      status: 'Hadir',
      dailyWageSnapshot: 135000,
    },
  ];

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 2);
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 3);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 6);

  const leaveRequests: LeaveRequest[] = [
    {
      id: 'leave_demo_pending',
      employeeId: 'emp_siti_ops',
      employeeName: 'Siti Rahma',
      ownerUid,
      leaveType: 'Tahunan',
      startDate: getDateKey(tomorrow),
      endDate: getDateKey(nextDay),
      displayStartDate: formatDateDDMMMYYYY(tomorrow),
      displayEndDate: formatDateDDMMMYYYY(nextDay),
      totalDays: 2,
      reason: 'Keperluan keluarga di luar kota.',
      status: 'Menunggu',
      reviewedBy: '',
      reviewNote: '',
    },
    {
      id: 'leave_demo_pending_2',
      employeeId: 'emp_budi_fld',
      employeeName: 'Budi Santoso',
      ownerUid,
      leaveType: 'Izin',
      startDate: getDateKey(nextWeek),
      endDate: getDateKey(nextWeek),
      displayStartDate: formatDateDDMMMYYYY(nextWeek),
      displayEndDate: formatDateDDMMMYYYY(nextWeek),
      totalDays: 1,
      reason: 'Pemeriksaan kesehatan rutin.',
      status: 'Menunggu',
      reviewedBy: '',
      reviewNote: '',
    },
    {
      id: 'leave_demo_approved',
      employeeId: 'emp_budi_fld',
      employeeName: 'Budi Santoso',
      ownerUid,
      leaveType: 'Izin',
      startDate: getDateKey(d3),
      endDate: getDateKey(d3),
      displayStartDate: formatDateDDMMMYYYY(d3),
      displayEndDate: formatDateDDMMMYYYY(d3),
      totalDays: 1,
      reason: 'Perpanjangan dokumen kendaraan operasional.',
      status: 'Disetujui',
      reviewedBy: 'Arif Pratama',
      reviewNote: 'Disetujui sesuai jadwal lapangan.',
    },
  ];

  const payrollRecords: PayrollRecord[] = [];

  return {
    positions,
    workSchedules,
    employees,
    attendance,
    leaveRequests,
    payrollRecords,
  };
}

export function readLocalDemoSession(): LocalDemoSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDemoSession;
    return parsed?.active ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalDemoSession(session: LocalDemoSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearLocalDemoSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // Ignore
  }
}

export function readOrSeedLocalDemoDataset(): LocalDemoDataset {
  if (typeof window === 'undefined') {
    return createInitialDemoDataset();
  }
  try {
    const raw = window.localStorage.getItem(DEMO_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDemoDataset>;
      if (
        Array.isArray(parsed.positions) &&
        Array.isArray(parsed.workSchedules) &&
        Array.isArray(parsed.employees) &&
        Array.isArray(parsed.attendance) &&
        Array.isArray(parsed.leaveRequests) &&
        Array.isArray(parsed.payrollRecords)
      ) {
        return parsed as LocalDemoDataset;
      }
    }
  } catch {
    // Fall back to fresh seed
  }
  const initial = createInitialDemoDataset();
  writeLocalDemoDataset(initial);
  return initial;
}

export function writeLocalDemoDataset(dataset: LocalDemoDataset): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(dataset));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function readLocalDemoPhoto(photoId: string): string | null {
  if (typeof window === 'undefined' || !photoId) return null;
  try {
    const raw = window.localStorage.getItem(DEMO_PHOTOS_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[photoId] ?? null;
  } catch {
    return null;
  }
}

export function writeLocalDemoPhoto(photoId: string, dataUrl: string): void {
  if (typeof window === 'undefined' || !photoId) return;
  try {
    const raw = window.localStorage.getItem(DEMO_PHOTOS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[photoId] = dataUrl;
    const keys = Object.keys(map);
    if (keys.length > 15) {
      delete map[keys[0]];
    }
    window.localStorage.setItem(DEMO_PHOTOS_KEY, JSON.stringify(map));
  } catch {
    // Ignore QuotaExceededError gracefully; in-memory photoCacheRef still serves it
  }
}
