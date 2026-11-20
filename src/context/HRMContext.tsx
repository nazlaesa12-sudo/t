import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../lib/firebase';
import {
  Attendance,
  AttendancePhoto,
  CoordinatesCapture,
  Employee,
  LeaveRequest,
  PayrollRecord,
  Position,
  WorkSchedule,
  WorkspaceMode,
} from '../types/hrm';
import {
  calculateDaysBetween,
  formatDateDDMMMYYYY,
  formatPeriodMMMYYYY,
  getCurrentTimeHHMM,
  getCurrentTimeHHMMSS,
  getDateKey,
  getIndonesianDayName,
} from '../utils/dateFormat';
import { AVATAR_KEYS } from '../constants/avatars';
import {
  clearLocalDemoSession,
  LocalDemoDataset,
  readLocalDemoPhoto,
  readLocalDemoSession,
  readOrSeedLocalDemoDataset,
  writeLocalDemoDataset,
  writeLocalDemoPhoto,
  writeLocalDemoSession,
} from '../utils/localDemoStore';

interface HRMContextValue {
  user: User | null;
  authReady: boolean;
  isAdminUser: boolean;
  isLocalDemoMode: boolean;
  isDataLoading: boolean;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  activeEmployeeId: string;
  setActiveEmployeeId: (id: string) => void;
  activeEmployee: Employee | null;
  positions: Position[];
  workSchedules: WorkSchedule[];
  employees: Employee[];
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  payrollRecords: PayrollRecord[];
  loginWithGoogle: (preferredMode?: WorkspaceMode, preferredEmployeeId?: string) => Promise<void>;
  loginAsLocalDemo: (preferredMode?: WorkspaceMode, preferredEmployeeId?: string) => void;
  logout: () => Promise<void>;
  createPosition: (input: {
    name: string;
    department: string;
    dailyRate: number;
    description: string;
  }) => Promise<void>;
  updatePosition: (
    id: string,
    input: {
      name: string;
      department: string;
      dailyRate: number;
      description: string;
    }
  ) => Promise<void>;
  deletePosition: (id: string) => Promise<void>;
  updateWorkSchedule: (
    id: string,
    input: {
      isWorkingDay: boolean;
      checkInStart: string;
      checkInDeadline: string;
      checkOutMin: string;
    }
  ) => Promise<void>;
  createEmployee: (input: {
    employeeCode: string;
    fullName: string;
    email: string;
    phone: string;
    positionId: string;
    role: 'manager' | 'employee';
    joinDate: string;
  }) => Promise<void>;
  updateEmployee: (
    id: string,
    input: {
      employeeCode: string;
      fullName: string;
      email: string;
      phone: string;
      positionId: string;
      role: 'manager' | 'employee';
      status: 'active' | 'inactive';
      joinDate: string;
    }
  ) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  submitCheckIn: (
    employee: Employee,
    photoDataUrl: string,
    coords: CoordinatesCapture
  ) => Promise<void>;
  submitCheckOut: (
    attendanceDoc: Attendance,
    photoDataUrl: string,
    coords: CoordinatesCapture
  ) => Promise<void>;
  fetchAttendancePhoto: (photoId: string) => Promise<string | null>;
  submitLeaveRequest: (
    employee: Employee,
    input: {
      leaveType: 'Tahunan' | 'Sakit' | 'Izin';
      startDate: string;
      endDate: string;
      reason: string;
    }
  ) => Promise<void>;
  reviewLeaveRequest: (
    leaveId: string,
    decision: 'Disetujui' | 'Ditolak',
    reviewNote: string
  ) => Promise<void>;
  bulkApproveLeaveRequests: (
    leaveIds: string[],
    reviewNote?: string
  ) => Promise<void>;
  markPayrollPaid: (
    employee: Employee,
    periodKey: string,
    daysPresent: number,
    totalAmount: number
  ) => Promise<void>;
  actionNotice: string | null;
  clearActionNotice: () => void;
}

const HRMContext = createContext<HRMContextValue | null>(null);

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export const HRMProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialDemoSession = useMemo(() => readLocalDemoSession(), []);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLocalDemoMode, setIsLocalDemoMode] = useState<boolean>(
    Boolean(initialDemoSession?.active)
  );
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(
    initialDemoSession?.workspaceMode ?? 'employee'
  );
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(
    initialDemoSession?.activeEmployeeId ?? 'emp_siti_ops'
  );

  const [positions, setPositions] = useState<Position[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);

  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const photoCacheRef = useRef<Map<string, string>>(new Map());
  const seededRef = useRef(false);
  const selfRegisteredRef = useRef(false);

  const isAdminUser = useMemo(() => {
    if (isLocalDemoMode) return true;
    if (!user?.email) return false;
    return user.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
  }, [user, isLocalDemoMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        clearLocalDemoSession();
        setIsLocalDemoMode(false);
      } else if (!readLocalDemoSession()?.active) {
        setPositions([]);
        setWorkSchedules([]);
        setEmployees([]);
        setAttendance([]);
        setLeaveRequests([]);
        setPayrollRecords([]);
        setIsDataLoading(false);
        seededRef.current = false;
        selfRegisteredRef.current = false;
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLocalDemoMode || user) return;
    const dataset = readOrSeedLocalDemoDataset();
    setPositions(dataset.positions);
    setWorkSchedules(dataset.workSchedules);
    setEmployees(dataset.employees);
    setAttendance(dataset.attendance);
    setLeaveRequests(dataset.leaveRequests);
    setPayrollRecords(dataset.payrollRecords);
    setIsDataLoading(false);
  }, [isLocalDemoMode, user]);

  useEffect(() => {
    if (!isLocalDemoMode) return;
    writeLocalDemoSession({
      active: true,
      workspaceMode,
      activeEmployeeId,
    });
  }, [isLocalDemoMode, workspaceMode, activeEmployeeId]);

  const seedInitialData = useCallback(async (adminUser: User) => {
    if (seededRef.current) return;
    seededRef.current = true;

    try {
      // Step 1: Seed Positions & Work Schedules first (referenced by employees)
      const batch1 = writeBatch(db);
      const initialPositions: Omit<Position, 'createdAt' | 'updatedAt'>[] = [
        {
          id: 'pos_staff_ops',
          name: 'Staff Operasional',
          department: 'Operasional',
          dailyRate: 100000,
          description: 'Pelaksana operasional harian dengan tarif standar Rp 100.000/hari.',
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

      for (const pos of initialPositions) {
        batch1.set(doc(db, 'positions', pos.id), {
          ...pos,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (let d = 0; d <= 6; d++) {
        const scheduleId = `day_${d}`;
        const isWorking = d >= 1 && d <= 6;
        batch1.set(doc(db, 'work_schedules', scheduleId), {
          id: scheduleId,
          dayOfWeek: d,
          dayName: getIndonesianDayName(d),
          isWorkingDay: isWorking,
          checkInStart: '07:00',
          checkInDeadline: '09:00',
          checkOutMin: d === 6 ? '14:00' : '17:00',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch1.commit();

      // Step 2: Seed Demo Employees (Manager + Karyawan)
      const batch2 = writeBatch(db);
      const initialEmployees: Omit<Employee, 'createdAt' | 'updatedAt'>[] = [
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
          ownerUid: adminUser.uid,
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
          ownerUid: adminUser.uid,
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
          ownerUid: adminUser.uid,
        },
      ];

      for (const emp of initialEmployees) {
        batch2.set(doc(db, 'employees', emp.id), {
          ...emp,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch2.commit();

      // Step 3: Seed recent historical attendance & pending leave request (keeping TODAY open for live selfie check-in)
      const batch3 = writeBatch(db);
      const today = new Date();
      const d1 = new Date(today);
      d1.setDate(today.getDate() - 1);
      const d2 = new Date(today);
      d2.setDate(today.getDate() - 2);
      const d3 = new Date(today);
      d3.setDate(today.getDate() - 3);

      const sampleAttendance: Omit<Attendance, 'createdAt' | 'updatedAt'>[] = [
        {
          id: `emp_siti_ops_${getDateKey(d1)}`,
          employeeId: 'emp_siti_ops',
          employeeName: 'Siti Rahma',
          positionName: 'Staff Operasional',
          ownerUid: adminUser.uid,
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
          id: `emp_siti_ops_${getDateKey(d2)}`,
          employeeId: 'emp_siti_ops',
          employeeName: 'Siti Rahma',
          positionName: 'Staff Operasional',
          ownerUid: adminUser.uid,
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
          id: `emp_budi_fld_${getDateKey(d1)}`,
          employeeId: 'emp_budi_fld',
          employeeName: 'Budi Santoso',
          positionName: 'Koordinator Lapangan',
          ownerUid: adminUser.uid,
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
          id: `emp_siti_ops_${getDateKey(d3)}`,
          employeeId: 'emp_siti_ops',
          employeeName: 'Siti Rahma',
          positionName: 'Staff Operasional',
          ownerUid: adminUser.uid,
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
      ];

      for (const att of sampleAttendance) {
        batch3.set(doc(db, 'attendance', att.id), {
          ...att,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 2);
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + 3);

      batch3.set(doc(db, 'leave_requests', 'leave_demo_pending'), {
        id: 'leave_demo_pending',
        employeeId: 'emp_siti_ops',
        employeeName: 'Siti Rahma',
        ownerUid: adminUser.uid,
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch3.set(doc(db, 'leave_requests', 'leave_demo_approved'), {
        id: 'leave_demo_approved',
        employeeId: 'emp_budi_fld',
        employeeName: 'Budi Santoso',
        ownerUid: adminUser.uid,
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch3.commit();
    } catch (error) {
      seededRef.current = false;
      handleFirestoreError(error, OperationType.WRITE, 'seedInitialData');
    }
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    setIsDataLoading(true);

    const posQuery = query(collection(db, 'positions'), orderBy('dailyRate', 'asc'));
    const schedQuery = query(
      collection(db, 'work_schedules'),
      orderBy('dayOfWeek', 'asc')
    );

    const empQuery = isAdminUser
      ? query(collection(db, 'employees'), orderBy('employeeCode', 'asc'))
      : query(
          collection(db, 'employees'),
          where('ownerUid', '==', user.uid)
        );

    const attQuery = isAdminUser
      ? query(collection(db, 'attendance'), orderBy('dateKey', 'desc'))
      : query(
          collection(db, 'attendance'),
          where('ownerUid', '==', user.uid)
        );

    const leaveQuery = isAdminUser
      ? query(collection(db, 'leave_requests'), orderBy('startDate', 'desc'))
      : query(
          collection(db, 'leave_requests'),
          where('ownerUid', '==', user.uid)
        );

    const payrollQuery = isAdminUser
      ? query(collection(db, 'payroll_records'))
      : query(
          collection(db, 'payroll_records'),
          where('ownerUid', '==', user.uid)
        );

    let loadedPos = false;
    let loadedEmp = false;

    const unsubPos = onSnapshot(
      posQuery,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as Position);
        setPositions(items);
        loadedPos = true;
        if (items.length === 0 && isAdminUser && !seededRef.current) {
          void seedInitialData(user);
        }
        if (loadedPos && loadedEmp) setIsDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'positions')
    );

    const unsubSched = onSnapshot(
      schedQuery,
      (snap) => {
        setWorkSchedules(snap.docs.map((d) => d.data() as WorkSchedule));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'work_schedules')
    );

    const unsubEmp = onSnapshot(
      empQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Employee);
        list.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));
        setEmployees(list);
        loadedEmp = true;

        if (list.length > 0) {
          setActiveEmployeeId((prev) =>
            list.some((e) => e.id === prev) ? prev : list[0].id
          );
        } else if (!isAdminUser && !selfRegisteredRef.current) {
          // Non-admin user signing in from another Google account gets an employee profile
          selfRegisteredRef.current = true;
          const selfId = `emp_${user.uid.slice(0, 16)}`;
          const defaultPos = 'pos_staff_ops';
          void setDoc(doc(db, 'employees', selfId), {
            id: selfId,
            employeeCode: `KRY-${user.uid.slice(0, 4).toUpperCase()}`,
            fullName: user.displayName || 'Karyawan Baru',
            email: user.email || 'karyawan@karyasync.demo',
            phone: '0812-0000-0000',
            positionId: defaultPos,
            positionName: 'Staff Operasional',
            dailyRate: 100000,
            role: 'employee',
            status: 'active',
            joinDate: formatDateDDMMMYYYY(new Date()),
            avatarUrl: AVATAR_KEYS.EMPLOYEE_SITI,
            ownerUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch((err) => {
            selfRegisteredRef.current = false;
            handleFirestoreError(err, OperationType.CREATE, `employees/${selfId}`);
          });
        }

        if (loadedPos && loadedEmp) setIsDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'employees')
    );

    const unsubAtt = onSnapshot(
      attQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Attendance);
        list.sort((a, b) => {
          const cmp = b.dateKey.localeCompare(a.dateKey);
          if (cmp !== 0) return cmp;
          return b.checkInTime.localeCompare(a.checkInTime);
        });
        setAttendance(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'attendance')
    );

    const unsubLeave = onSnapshot(
      leaveQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as LeaveRequest);
        list.sort((a, b) => b.startDate.localeCompare(a.startDate));
        setLeaveRequests(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'leave_requests')
    );

    const unsubPayroll = onSnapshot(
      payrollQuery,
      (snap) => {
        setPayrollRecords(snap.docs.map((d) => d.data() as PayrollRecord));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'payroll_records')
    );

    return () => {
      unsubPos();
      unsubSched();
      unsubEmp();
      unsubAtt();
      unsubLeave();
      unsubPayroll();
    };
  }, [authReady, user, isAdminUser, seedInitialData]);

  const activeEmployee = useMemo(() => {
    if (employees.length === 0) return null;
    return (
      employees.find((e) => e.id === activeEmployeeId) ??
      employees.find((e) => e.role === 'employee') ??
      employees[0]
    );
  }, [employees, activeEmployeeId]);

  const notify = useCallback((msg: string) => {
    setActionNotice(msg);
  }, []);

  const clearActionNotice = useCallback(() => setActionNotice(null), []);

  const persistLocalDataset = useCallback(
    (patch: Partial<LocalDemoDataset>) => {
      const next: LocalDemoDataset = {
        positions: patch.positions ?? positions,
        workSchedules: patch.workSchedules ?? workSchedules,
        employees: patch.employees ?? employees,
        attendance: patch.attendance ?? attendance,
        leaveRequests: patch.leaveRequests ?? leaveRequests,
        payrollRecords: patch.payrollRecords ?? payrollRecords,
      };
      if (patch.positions) setPositions(patch.positions);
      if (patch.workSchedules) setWorkSchedules(patch.workSchedules);
      if (patch.employees) setEmployees(patch.employees);
      if (patch.attendance) setAttendance(patch.attendance);
      if (patch.leaveRequests) setLeaveRequests(patch.leaveRequests);
      if (patch.payrollRecords) setPayrollRecords(patch.payrollRecords);
      writeLocalDemoDataset(next);
    },
    [
      positions,
      workSchedules,
      employees,
      attendance,
      leaveRequests,
      payrollRecords,
    ]
  );

  const activateLocalDemo = useCallback(
    (
      preferredMode?: WorkspaceMode,
      preferredEmployeeId?: string,
      noticeText?: string
    ) => {
      const nextMode = preferredMode ?? workspaceMode;
      const nextEmpId = preferredEmployeeId ?? activeEmployeeId;
      writeLocalDemoSession({
        active: true,
        workspaceMode: nextMode,
        activeEmployeeId: nextEmpId,
      });
      setWorkspaceMode(nextMode);
      setActiveEmployeeId(nextEmpId);
      const dataset = readOrSeedLocalDemoDataset();
      setPositions(dataset.positions);
      setWorkSchedules(dataset.workSchedules);
      setEmployees(dataset.employees);
      setAttendance(dataset.attendance);
      setLeaveRequests(dataset.leaveRequests);
      setPayrollRecords(dataset.payrollRecords);
      setIsDataLoading(false);
      setIsLocalDemoMode(true);
      notify(
        noticeText ??
          'Mode Demo Lokal aktif. Data tersimpan otomatis di perangkat ini.'
      );
    },
    [workspaceMode, activeEmployeeId, notify]
  );

  const loginAsLocalDemo = useCallback(
    (preferredMode?: WorkspaceMode, preferredEmployeeId?: string) => {
      activateLocalDemo(preferredMode, preferredEmployeeId);
    },
    [activateLocalDemo]
  );

  const loginWithGoogle = useCallback(
    async (preferredMode?: WorkspaceMode, preferredEmployeeId?: string) => {
      if (!auth.currentUser) {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (err) {
          const code =
            typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            typeof (err as { code?: unknown }).code === 'string'
              ? (err as { code: string }).code
              : '';
          const msg = err instanceof Error ? err.message : String(err ?? '');
          if (
            code === 'auth/unauthorized-domain' ||
            code === 'auth/operation-not-allowed' ||
            msg.includes('auth/unauthorized-domain') ||
            msg.includes('auth/operation-not-allowed')
          ) {
            activateLocalDemo(
              preferredMode,
              preferredEmployeeId,
              'Domain belum diizinkan Firebase Auth — Mode Demo Lokal diaktifkan otomatis.'
            );
            return;
          }
          throw err;
        }
      }
      if (preferredMode) setWorkspaceMode(preferredMode);
      if (preferredEmployeeId) setActiveEmployeeId(preferredEmployeeId);
    },
    [activateLocalDemo]
  );

  const logout = useCallback(async () => {
    clearLocalDemoSession();
    setIsLocalDemoMode(false);
    if (auth.currentUser) {
      await signOut(auth);
    } else {
      setPositions([]);
      setWorkSchedules([]);
      setEmployees([]);
      setAttendance([]);
      setLeaveRequests([]);
      setPayrollRecords([]);
      setIsDataLoading(false);
    }
  }, []);

  const createPosition = useCallback(
    async (input: {
      name: string;
      department: string;
      dailyRate: number;
      description: string;
    }) => {
      const id = makeId('pos');
      const newPos: Position = {
        id,
        name: input.name.trim(),
        department: input.department.trim(),
        dailyRate: Number(input.dailyRate),
        description: input.description.trim(),
      };
      if (isLocalDemoMode) {
        const nextPositions = [...positions, newPos].sort(
          (a, b) => a.dailyRate - b.dailyRate
        );
        persistLocalDataset({ positions: nextPositions });
        notify(`Jabatan "${input.name}" berhasil ditambahkan.`);
        return;
      }
      try {
        await setDoc(doc(db, 'positions', id), {
          ...newPos,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        notify(`Jabatan "${input.name}" berhasil ditambahkan.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `positions/${id}`);
      }
    },
    [isLocalDemoMode, positions, persistLocalDataset, notify]
  );

  const updatePosition = useCallback(
    async (
      id: string,
      input: {
        name: string;
        department: string;
        dailyRate: number;
        description: string;
      }
    ) => {
      if (isLocalDemoMode) {
        const nextPositions = positions
          .map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: input.name.trim(),
                  department: input.department.trim(),
                  dailyRate: Number(input.dailyRate),
                  description: input.description.trim(),
                }
              : p
          )
          .sort((a, b) => a.dailyRate - b.dailyRate);
        const nextEmployees = employees.map((e) =>
          e.positionId === id
            ? {
                ...e,
                positionName: input.name.trim(),
                dailyRate: Number(input.dailyRate),
              }
            : e
        );
        persistLocalDataset({
          positions: nextPositions,
          employees: nextEmployees,
        });
        notify(`Tarif dan data jabatan "${input.name}" diperbarui.`);
        return;
      }
      try {
        await updateDoc(doc(db, 'positions', id), {
          name: input.name.trim(),
          department: input.department.trim(),
          dailyRate: Number(input.dailyRate),
          description: input.description.trim(),
          updatedAt: serverTimestamp(),
        });
        notify(`Tarif dan data jabatan "${input.name}" diperbarui.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `positions/${id}`);
      }
    },
    [isLocalDemoMode, positions, employees, persistLocalDataset, notify]
  );

  const deletePosition = useCallback(
    async (id: string) => {
      if (isLocalDemoMode) {
        persistLocalDataset({
          positions: positions.filter((p) => p.id !== id),
        });
        notify('Jabatan dihapus.');
        return;
      }
      try {
        await deleteDoc(doc(db, 'positions', id));
        notify('Jabatan dihapus.');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `positions/${id}`);
      }
    },
    [isLocalDemoMode, positions, persistLocalDataset, notify]
  );

  const updateWorkSchedule = useCallback(
    async (
      id: string,
      input: {
        isWorkingDay: boolean;
        checkInStart: string;
        checkInDeadline: string;
        checkOutMin: string;
      }
    ) => {
      if (isLocalDemoMode) {
        const nextSchedules = workSchedules.map((ws) =>
          ws.id === id
            ? {
                ...ws,
                isWorkingDay: input.isWorkingDay,
                checkInStart: input.checkInStart,
                checkInDeadline: input.checkInDeadline,
                checkOutMin: input.checkOutMin,
              }
            : ws
        );
        persistLocalDataset({ workSchedules: nextSchedules });
        notify('Jadwal hari dan jam kerja diperbarui.');
        return;
      }
      try {
        await updateDoc(doc(db, 'work_schedules', id), {
          isWorkingDay: input.isWorkingDay,
          checkInStart: input.checkInStart,
          checkInDeadline: input.checkInDeadline,
          checkOutMin: input.checkOutMin,
          updatedAt: serverTimestamp(),
        });
        notify('Jadwal hari dan jam kerja diperbarui.');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `work_schedules/${id}`);
      }
    },
    [isLocalDemoMode, workSchedules, persistLocalDataset, notify]
  );

  const createEmployee = useCallback(
    async (input: {
      employeeCode: string;
      fullName: string;
      email: string;
      phone: string;
      positionId: string;
      role: 'manager' | 'employee';
      joinDate: string;
    }) => {
      if (!user && !isLocalDemoMode) return;
      const pos = positions.find((p) => p.id === input.positionId);
      if (!pos) return;
      const id = makeId('emp');
      const ownerUid = isLocalDemoMode ? 'local_demo_owner' : user!.uid;
      const newEmp: Employee = {
        id,
        employeeCode: input.employeeCode.trim(),
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        positionId: pos.id,
        positionName: pos.name,
        dailyRate: pos.dailyRate,
        role: input.role,
        status: 'active',
        joinDate: formatDateDDMMMYYYY(input.joinDate),
        avatarUrl:
          input.role === 'manager'
            ? AVATAR_KEYS.MANAGER_ARIF
            : AVATAR_KEYS.EMPLOYEE_SITI,
        ownerUid,
      };
      if (isLocalDemoMode) {
        const nextEmployees = [...employees, newEmp].sort((a, b) =>
          a.employeeCode.localeCompare(b.employeeCode)
        );
        persistLocalDataset({ employees: nextEmployees });
        notify(`Karyawan ${input.fullName} berhasil ditambahkan.`);
        return;
      }
      try {
        await setDoc(doc(db, 'employees', id), {
          ...newEmp,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        notify(`Karyawan ${input.fullName} berhasil ditambahkan.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `employees/${id}`);
      }
    },
    [positions, employees, user, isLocalDemoMode, persistLocalDataset, notify]
  );

  const updateEmployee = useCallback(
    async (
      id: string,
      input: {
        employeeCode: string;
        fullName: string;
        email: string;
        phone: string;
        positionId: string;
        role: 'manager' | 'employee';
        status: 'active' | 'inactive';
        joinDate: string;
      }
    ) => {
      const pos = positions.find((p) => p.id === input.positionId);
      if (!pos) return;
      if (isLocalDemoMode) {
        const nextEmployees = employees.map((e) =>
          e.id === id
            ? {
                ...e,
                employeeCode: input.employeeCode.trim(),
                fullName: input.fullName.trim(),
                email: input.email.trim(),
                phone: input.phone.trim(),
                positionId: pos.id,
                positionName: pos.name,
                dailyRate: pos.dailyRate,
                role: input.role,
                status: input.status,
                joinDate: formatDateDDMMMYYYY(input.joinDate),
              }
            : e
        );
        persistLocalDataset({ employees: nextEmployees });
        notify(`Data karyawan ${input.fullName} diperbarui.`);
        return;
      }
      try {
        await updateDoc(doc(db, 'employees', id), {
          employeeCode: input.employeeCode.trim(),
          fullName: input.fullName.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          positionId: pos.id,
          positionName: pos.name,
          dailyRate: pos.dailyRate,
          role: input.role,
          status: input.status,
          joinDate: formatDateDDMMMYYYY(input.joinDate),
          updatedAt: serverTimestamp(),
        });
        notify(`Data karyawan ${input.fullName} diperbarui.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `employees/${id}`);
      }
    },
    [positions, employees, isLocalDemoMode, persistLocalDataset, notify]
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      if (isLocalDemoMode) {
        persistLocalDataset({
          employees: employees.filter((e) => e.id !== id),
        });
        notify('Data karyawan dihapus.');
        return;
      }
      try {
        await deleteDoc(doc(db, 'employees', id));
        notify('Data karyawan dihapus.');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `employees/${id}`);
      }
    },
    [isLocalDemoMode, employees, persistLocalDataset, notify]
  );

  const submitCheckIn = useCallback(
    async (
      employee: Employee,
      photoDataUrl: string,
      coords: CoordinatesCapture
    ) => {
      const now = new Date();
      const dateKey = getDateKey(now);
      const displayDate = formatDateDDMMMYYYY(now);
      const timeStr = getCurrentTimeHHMMSS(now);
      const currentHHMM = getCurrentTimeHHMM(now);
      const daySched = workSchedules.find(
        (s) => s.dayOfWeek === now.getDay()
      );
      const deadline = daySched?.checkInDeadline || '09:00';
      const status: 'Hadir' | 'Terlambat' =
        currentHHMM > deadline ? 'Terlambat' : 'Hadir';

      const pos = positions.find((p) => p.id === employee.positionId);
      const dailyRate = pos?.dailyRate ?? employee.dailyRate ?? 100000;

      const attendanceId = `${employee.id}_${dateKey}`;
      const photoId = `photo_in_${attendanceId}`;

      const newAttendance: Attendance = {
        id: attendanceId,
        employeeId: employee.id,
        employeeName: employee.fullName,
        positionName: employee.positionName,
        ownerUid: employee.ownerUid,
        dateKey,
        displayDate,
        checkInTime: timeStr,
        checkInLat: Number(coords.lat.toFixed(6)),
        checkInLng: Number(coords.lng.toFixed(6)),
        checkInAccuracy: Math.round(coords.accuracy),
        checkInAddress: coords.address.slice(0, 235),
        checkInPhotoId: photoId,
        checkOutTime: '',
        checkOutLat: 0,
        checkOutLng: 0,
        checkOutAccuracy: 0,
        checkOutAddress: '',
        checkOutPhotoId: '',
        status,
        dailyWageSnapshot: dailyRate,
      };

      if (isLocalDemoMode) {
        photoCacheRef.current.set(photoId, photoDataUrl);
        writeLocalDemoPhoto(photoId, photoDataUrl);
        const nextAttendance = [
          newAttendance,
          ...attendance.filter((a) => a.id !== attendanceId),
        ];
        persistLocalDataset({ attendance: nextAttendance });
        notify(`Check-in ${employee.fullName} tercatat pukul ${timeStr}.`);
        return;
      }

      try {
        const batch = writeBatch(db);
        const photoDoc: AttendancePhoto = {
          id: photoId,
          attendanceId,
          employeeId: employee.id,
          ownerUid: employee.ownerUid,
          type: 'checkin',
          imageDataUrl: photoDataUrl.slice(0, 139000),
          createdAt: serverTimestamp(),
        };
        batch.set(doc(db, 'attendance_photos', photoId), photoDoc);

        batch.set(doc(db, 'attendance', attendanceId), {
          ...newAttendance,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await batch.commit();
        photoCacheRef.current.set(photoId, photoDataUrl);
        notify(`Check-in ${employee.fullName} tercatat pukul ${timeStr}.`);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `attendance/${attendanceId}`
        );
      }
    },
    [
      positions,
      workSchedules,
      attendance,
      isLocalDemoMode,
      persistLocalDataset,
      notify,
    ]
  );

  const submitCheckOut = useCallback(
    async (
      attendanceDoc: Attendance,
      photoDataUrl: string,
      coords: CoordinatesCapture
    ) => {
      const now = new Date();
      const timeStr = getCurrentTimeHHMMSS(now);
      const photoId = `photo_out_${attendanceDoc.id}`;

      if (isLocalDemoMode) {
        photoCacheRef.current.set(photoId, photoDataUrl);
        writeLocalDemoPhoto(photoId, photoDataUrl);
        const nextAttendance = attendance.map((a) =>
          a.id === attendanceDoc.id
            ? {
                ...a,
                checkOutTime: timeStr,
                checkOutLat: Number(coords.lat.toFixed(6)),
                checkOutLng: Number(coords.lng.toFixed(6)),
                checkOutAccuracy: Math.round(coords.accuracy),
                checkOutAddress: coords.address.slice(0, 235),
                checkOutPhotoId: photoId,
              }
            : a
        );
        persistLocalDataset({ attendance: nextAttendance });
        notify(
          `Check-out ${attendanceDoc.employeeName} tercatat pukul ${timeStr}.`
        );
        return;
      }

      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'attendance_photos', photoId), {
          id: photoId,
          attendanceId: attendanceDoc.id,
          employeeId: attendanceDoc.employeeId,
          ownerUid: attendanceDoc.ownerUid,
          type: 'checkout',
          imageDataUrl: photoDataUrl.slice(0, 139000),
          createdAt: serverTimestamp(),
        });

        batch.update(doc(db, 'attendance', attendanceDoc.id), {
          checkOutTime: timeStr,
          checkOutLat: Number(coords.lat.toFixed(6)),
          checkOutLng: Number(coords.lng.toFixed(6)),
          checkOutAccuracy: Math.round(coords.accuracy),
          checkOutAddress: coords.address.slice(0, 235),
          checkOutPhotoId: photoId,
          updatedAt: serverTimestamp(),
        });

        await batch.commit();
        photoCacheRef.current.set(photoId, photoDataUrl);
        notify(
          `Check-out ${attendanceDoc.employeeName} tercatat pukul ${timeStr}.`
        );
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `attendance/${attendanceDoc.id}`
        );
      }
    },
    [isLocalDemoMode, attendance, persistLocalDataset, notify]
  );

  const fetchAttendancePhoto = useCallback(
    async (photoId: string): Promise<string | null> => {
      if (!photoId) return null;
      const cached = photoCacheRef.current.get(photoId);
      if (cached) return cached;
      if (isLocalDemoMode) {
        const localPhoto = readLocalDemoPhoto(photoId);
        if (localPhoto) {
          photoCacheRef.current.set(photoId, localPhoto);
        }
        return localPhoto;
      }
      try {
        const snap = await getDoc(doc(db, 'attendance_photos', photoId));
        if (snap.exists()) {
          const data = snap.data() as AttendancePhoto;
          photoCacheRef.current.set(photoId, data.imageDataUrl);
          return data.imageDataUrl;
        }
        return null;
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.GET,
          `attendance_photos/${photoId}`
        );
      }
    },
    [isLocalDemoMode]
  );

  const submitLeaveRequest = useCallback(
    async (
      employee: Employee,
      input: {
        leaveType: 'Tahunan' | 'Sakit' | 'Izin';
        startDate: string;
        endDate: string;
        reason: string;
      }
    ) => {
      const id = makeId('leave');
      const totalDays = calculateDaysBetween(input.startDate, input.endDate);
      const newLeave: LeaveRequest = {
        id,
        employeeId: employee.id,
        employeeName: employee.fullName,
        ownerUid: employee.ownerUid,
        leaveType: input.leaveType,
        startDate: input.startDate,
        endDate: input.endDate,
        displayStartDate: formatDateDDMMMYYYY(input.startDate),
        displayEndDate: formatDateDDMMMYYYY(input.endDate),
        totalDays,
        reason: input.reason.trim(),
        status: 'Menunggu',
        reviewedBy: '',
        reviewNote: '',
      };

      if (isLocalDemoMode) {
        persistLocalDataset({
          leaveRequests: [newLeave, ...leaveRequests],
        });
        notify(`Pengajuan cuti ${employee.fullName} terkirim.`);
        return;
      }

      try {
        await setDoc(doc(db, 'leave_requests', id), {
          ...newLeave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        notify(`Pengajuan cuti ${employee.fullName} terkirim.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `leave_requests/${id}`);
      }
    },
    [isLocalDemoMode, leaveRequests, persistLocalDataset, notify]
  );

  const reviewLeaveRequest = useCallback(
    async (
      leaveId: string,
      decision: 'Disetujui' | 'Ditolak',
      reviewNote: string
    ) => {
      const reviewer = user?.displayName || 'HR Manager';
      const note =
        reviewNote.trim() || `Cuti ${decision.toLowerCase()} oleh Manager.`;

      if (isLocalDemoMode) {
        const nextLeaves = leaveRequests.map((lv) =>
          lv.id === leaveId
            ? {
                ...lv,
                status: decision,
                reviewedBy: reviewer,
                reviewNote: note,
              }
            : lv
        );
        persistLocalDataset({ leaveRequests: nextLeaves });
        notify(`Pengajuan cuti telah ${decision.toLowerCase()}.`);
        return;
      }

      try {
        await updateDoc(doc(db, 'leave_requests', leaveId), {
          status: decision,
          reviewedBy: reviewer,
          reviewNote: note,
          updatedAt: serverTimestamp(),
        });
        notify(`Pengajuan cuti telah ${decision.toLowerCase()}.`);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `leave_requests/${leaveId}`
        );
      }
    },
    [user, isLocalDemoMode, leaveRequests, persistLocalDataset, notify]
  );

  const bulkApproveLeaveRequests = useCallback(
    async (leaveIds: string[], reviewNote?: string) => {
      const uniqueIds = Array.from(new Set(leaveIds.filter(Boolean)));
      if (uniqueIds.length === 0) return;

      const reviewer = user?.displayName || 'HR Manager';
      const note =
        reviewNote?.trim() || 'Disetujui secara massal oleh Management.';

      if (isLocalDemoMode) {
        const idSet = new Set(uniqueIds);
        const nextLeaves = leaveRequests.map((lv) =>
          idSet.has(lv.id)
            ? {
                ...lv,
                status: 'Disetujui' as const,
                reviewedBy: reviewer,
                reviewNote: note,
              }
            : lv
        );
        persistLocalDataset({ leaveRequests: nextLeaves });
        notify(`${uniqueIds.length} pengajuan cuti telah disetujui.`);
        return;
      }

      try {
        const CHUNK_SIZE = 400;
        for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
          const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const leaveId of chunk) {
            batch.update(doc(db, 'leave_requests', leaveId), {
              status: 'Disetujui',
              reviewedBy: reviewer,
              reviewNote: note,
              updatedAt: serverTimestamp(),
            });
          }
          await batch.commit();
        }
        notify(`${uniqueIds.length} pengajuan cuti telah disetujui.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'leave_requests/bulk');
      }
    },
    [user, isLocalDemoMode, leaveRequests, persistLocalDataset, notify]
  );

  const markPayrollPaid = useCallback(
    async (
      employee: Employee,
      periodKey: string,
      daysPresent: number,
      totalAmount: number
    ) => {
      const payrollId = `${employee.id}_${periodKey}`;
      const existing = payrollRecords.find((p) => p.id === payrollId);
      const pos = positions.find((p) => p.id === employee.positionId);
      const dailyRate = pos?.dailyRate ?? employee.dailyRate ?? 100000;
      const paidDateDisplay = formatDateDDMMMYYYY(new Date());

      if (isLocalDemoMode) {
        const record: PayrollRecord = {
          id: payrollId,
          employeeId: employee.id,
          employeeName: employee.fullName,
          positionName: employee.positionName,
          ownerUid: employee.ownerUid,
          periodKey,
          displayPeriod: formatPeriodMMMYYYY(periodKey),
          daysPresent,
          dailyRate,
          totalAmount,
          paymentStatus: 'Dibayar',
          paidDateDisplay,
        };
        const nextPayrolls = existing
          ? payrollRecords.map((p) => (p.id === payrollId ? record : p))
          : [...payrollRecords, record];
        persistLocalDataset({ payrollRecords: nextPayrolls });
        notify(
          `Payroll ${employee.fullName} periode ${formatPeriodMMMYYYY(periodKey)} ditandai Dibayar.`
        );
        return;
      }

      try {
        if (existing) {
          await updateDoc(doc(db, 'payroll_records', payrollId), {
            daysPresent,
            dailyRate,
            totalAmount,
            paymentStatus: 'Dibayar',
            paidDateDisplay,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'payroll_records', payrollId), {
            id: payrollId,
            employeeId: employee.id,
            employeeName: employee.fullName,
            positionName: employee.positionName,
            ownerUid: employee.ownerUid,
            periodKey,
            displayPeriod: formatPeriodMMMYYYY(periodKey),
            daysPresent,
            dailyRate,
            totalAmount,
            paymentStatus: 'Dibayar',
            paidDateDisplay,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        notify(`Payroll ${employee.fullName} periode ${formatPeriodMMMYYYY(periodKey)} ditandai Dibayar.`);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `payroll_records/${payrollId}`
        );
      }
    },
    [
      payrollRecords,
      positions,
      isLocalDemoMode,
      persistLocalDataset,
      notify,
    ]
  );

  const value: HRMContextValue = {
    user,
    authReady,
    isAdminUser,
    isLocalDemoMode,
    isDataLoading,
    workspaceMode,
    setWorkspaceMode,
    activeEmployeeId,
    setActiveEmployeeId,
    activeEmployee,
    positions,
    workSchedules,
    employees,
    attendance,
    leaveRequests,
    payrollRecords,
    loginWithGoogle,
    loginAsLocalDemo,
    logout,
    createPosition,
    updatePosition,
    deletePosition,
    updateWorkSchedule,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    submitCheckIn,
    submitCheckOut,
    fetchAttendancePhoto,
    submitLeaveRequest,
    reviewLeaveRequest,
    bulkApproveLeaveRequests,
    markPayrollPaid,
    actionNotice,
    clearActionNotice,
  };

  return <HRMContext.Provider value={value}>{children}</HRMContext.Provider>;
};

export function useHRM() {
  const ctx = useContext(HRMContext);
  if (!ctx) throw new Error('useHRM must be used inside HRMProvider');
  return ctx;
}
