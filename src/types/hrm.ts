export type WorkspaceMode = 'manager' | 'employee' | 'split';

export type ManagerTab =
  | 'ringkasan'
  | 'karyawan'
  | 'jadwal'
  | 'kehadiran'
  | 'cuti'
  | 'payroll';

export type EmployeeTab =
  | 'beranda'
  | 'presensi'
  | 'cuti'
  | 'laporan'
  | 'profil';

export interface Position {
  id: string;
  name: string;
  department: string;
  dailyRate: number;
  description: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkSchedule {
  id: string;
  dayOfWeek: number; // 0 = Minggu, 1 = Senin ... 6 = Sabtu
  dayName: string;
  isWorkingDay: boolean;
  checkInStart: string; // HH:mm
  checkInDeadline: string; // HH:mm
  checkOutMin: string; // HH:mm
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  positionId: string;
  positionName: string;
  dailyRate: number;
  role: 'manager' | 'employee';
  status: 'active' | 'inactive';
  joinDate: string; // DD-MMM-YYYY
  avatarUrl: string;
  ownerUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  positionName: string;
  ownerUid: string;
  dateKey: string; // YYYY-MM-DD
  displayDate: string; // DD-MMM-YYYY
  checkInTime: string; // HH:mm:ss
  checkInLat: number;
  checkInLng: number;
  checkInAccuracy: number;
  checkInAddress: string;
  checkInPhotoId: string;
  checkOutTime: string; // HH:mm:ss or ''
  checkOutLat: number;
  checkOutLng: number;
  checkOutAccuracy: number;
  checkOutAddress: string;
  checkOutPhotoId: string;
  status: 'Hadir' | 'Terlambat';
  dailyWageSnapshot: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AttendancePhoto {
  id: string;
  attendanceId: string;
  employeeId: string;
  ownerUid: string;
  type: 'checkin' | 'checkout';
  imageDataUrl: string;
  createdAt?: unknown;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  ownerUid: string;
  leaveType: 'Tahunan' | 'Sakit' | 'Izin';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  displayStartDate: string; // DD-MMM-YYYY
  displayEndDate: string; // DD-MMM-YYYY
  totalDays: number;
  reason: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  reviewedBy: string;
  reviewNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  positionName: string;
  ownerUid: string;
  periodKey: string; // YYYY-MM
  displayPeriod: string; // MMM-YYYY
  daysPresent: number;
  dailyRate: number;
  totalAmount: number;
  paymentStatus: 'Belum Dibayar' | 'Dibayar';
  paidDateDisplay: string; // DD-MMM-YYYY or ''
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CoordinatesCapture {
  lat: number;
  lng: number;
  accuracy: number;
  address: string;
}
