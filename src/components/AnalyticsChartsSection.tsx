import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Attendance, PayrollRecord } from '../types/hrm';
import {
  formatCurrencyIDR,
  formatDateDDMMMYYYY,
  formatPeriodMMMYYYY,
  getCurrentPeriodKey,
  getDateKey,
} from '../utils/dateFormat';

interface AnalyticsChartsSectionProps {
  attendance: Attendance[];
  payrollRecords: PayrollRecord[];
  isDataLoading: boolean;
}

interface DailyAttendancePoint {
  dateKey: string;
  shortDate: string;
  fullDate: string;
  hadir: number;
  terlambat: number;
  total: number;
}

interface MonthlyPayrollPoint {
  periodKey: string;
  label: string;
  shortLabel: string;
  totalExpenditure: number;
  paidAmount: number;
  daysPresent: number;
}

function formatCompactIDR(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `Rp ${Number.isInteger(millions) ? millions : millions.toFixed(1)}jt`;
  }
  if (value >= 1_000) {
    return `Rp ${Math.round(value / 1_000)}rb`;
  }
  return `Rp ${value}`;
}

interface TooltipPayloadEntry<T> {
  payload?: T;
}

const AttendanceTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipPayloadEntry<DailyAttendancePoint>[];
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-md">
      <div className="font-mono font-semibold tabular-nums text-slate-900">
        {point.fullDate}
      </div>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-700">Hadir Tepat Waktu</span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {point.hadir}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-amber-700">Terlambat</span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {point.terlambat}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
          <span className="font-medium text-slate-600">Total Presensi</span>
          <span className="font-mono font-bold tabular-nums text-slate-900">
            {point.total}
          </span>
        </div>
      </div>
    </div>
  );
};

const PayrollTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipPayloadEntry<MonthlyPayrollPoint>[];
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) {
    return null;
  }
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-md">
      <div className="font-mono font-semibold tabular-nums text-slate-900">
        {point.label}
      </div>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-indigo-700">Total Pengeluaran</span>
          <span className="font-mono font-bold tabular-nums text-slate-900">
            {formatCurrencyIDR(point.totalExpenditure)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-700">Sudah Dibayar</span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {formatCurrencyIDR(point.paidAmount)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
          <span className="text-slate-500">Total Hari Hadir</span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {point.daysPresent} hari
          </span>
        </div>
      </div>
    </div>
  );
};

export const AnalyticsChartsSection: React.FC<AnalyticsChartsSectionProps> = ({
  attendance,
  payrollRecords,
  isDataLoading,
}) => {
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(14);

  const dailyAttendanceData = useMemo<DailyAttendancePoint[]>(() => {
    const byDate = new Map<string, { hadir: number; terlambat: number }>();
    for (const att of attendance) {
      const current = byDate.get(att.dateKey) ?? { hadir: 0, terlambat: 0 };
      if (att.status === 'Terlambat') {
        current.terlambat += 1;
      } else {
        current.hadir += 1;
      }
      byDate.set(att.dateKey, current);
    }

    const today = new Date();
    const series: DailyAttendancePoint[] = [];
    for (let offset = rangeDays - 1; offset >= 0; offset--) {
      const d = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - offset
      );
      const dateKey = getDateKey(d);
      const fullDate = formatDateDDMMMYYYY(d);
      const shortDate = fullDate.slice(0, 6).replace('-', ' ');
      const counts = byDate.get(dateKey) ?? { hadir: 0, terlambat: 0 };
      series.push({
        dateKey,
        shortDate,
        fullDate,
        hadir: counts.hadir,
        terlambat: counts.terlambat,
        total: counts.hadir + counts.terlambat,
      });
    }
    return series;
  }, [attendance, rangeDays]);

  const attendanceRangeTotals = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    for (const item of dailyAttendanceData) {
      hadir += item.hadir;
      terlambat += item.terlambat;
    }
    return {
      hadir,
      terlambat,
      total: hadir + terlambat,
    };
  }, [dailyAttendanceData]);

  const monthlyPayrollData = useMemo<MonthlyPayrollPoint[]>(() => {
    const now = new Date();
    const series: MonthlyPayrollPoint[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const periodKey = getCurrentPeriodKey(monthDate);
      const label = formatPeriodMMMYYYY(periodKey);
      const [mon, yr] = label.split('-');
      const shortLabel = `${mon} ${yr.slice(2)}`;

      const monthAttendance = attendance.filter((a) =>
        a.dateKey.startsWith(periodKey)
      );
      const accruedTotal = monthAttendance.reduce(
        (sum, a) => sum + (a.dailyWageSnapshot || 100000),
        0
      );

      const monthPayrolls = payrollRecords.filter(
        (p) => p.periodKey === periodKey
      );
      const recordedTotal = monthPayrolls.reduce(
        (sum, p) => sum + (p.totalAmount || 0),
        0
      );
      const paidAmount = monthPayrolls
        .filter((p) => p.paymentStatus === 'Dibayar')
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

      series.push({
        periodKey,
        label,
        shortLabel,
        totalExpenditure: Math.max(accruedTotal, recordedTotal),
        paidAmount,
        daysPresent: monthAttendance.length,
      });
    }

    return series;
  }, [attendance, payrollRecords]);

  const sixMonthTotalPayroll = useMemo(
    () =>
      monthlyPayrollData.reduce((sum, item) => sum + item.totalExpenditure, 0),
    [monthlyPayrollData]
  );

  const currentMonthPayroll =
    monthlyPayrollData[monthlyPayrollData.length - 1]?.totalExpenditure ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {/* Chart 1: Daily Attendance Trends (Stacked Bar) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Tren Kehadiran Harian
            </h2>
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
              Total {attendanceRangeTotals.total} · Hadir{' '}
              {attendanceRangeTotals.hadir} · Terlambat{' '}
              {attendanceRangeTotals.terlambat}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`min-h-[30px] rounded-md px-2.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  rangeDays === days
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days} Hari
              </button>
            ))}
          </div>
        </div>

        {isDataLoading ? (
          <div className="flex h-[240px] items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-500">
            Memuat grafik kehadiran...
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyAttendanceData}
                margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E2E8F0"
                />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  interval={rangeDays === 30 ? 4 : rangeDays === 14 ? 1 : 0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<AttendanceTooltip />}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                />
                <Bar
                  dataKey="hadir"
                  name="Hadir Tepat Waktu"
                  stackId="attendance"
                  fill="#10B981"
                  maxBarSize={24}
                />
                <Bar
                  dataKey="terlambat"
                  name="Terlambat"
                  stackId="attendance"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Chart 2: Monthly Payroll Expenditure (Area Chart) */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Pengeluaran Payroll Bulanan
            </h2>
            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
              Akumulasi 6 Bulan: {formatCurrencyIDR(sixMonthTotalPayroll)}
            </p>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-slate-500">Bulan Berjalan</div>
            <div className="font-mono text-sm font-bold tabular-nums text-indigo-700">
              {formatCurrencyIDR(currentMonthPayroll)}
            </div>
          </div>
        </div>

        {isDataLoading ? (
          <div className="flex h-[240px] items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-500">
            Memuat grafik pengeluaran payroll...
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyPayrollData}
                margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="payrollExpenditureGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E2E8F0"
                />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  tickFormatter={formatCompactIDR}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip content={<PayrollTooltip />} />
                <Area
                  type="monotone"
                  dataKey="totalExpenditure"
                  name="Total Pengeluaran"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  fill="url(#payrollExpenditureGrad)"
                  activeDot={{
                    r: 5,
                    fill: '#4F46E5',
                    stroke: '#FFFFFF',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
};
