const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatDateDDMMMYYYY(input: Date | string): string {
  let date: Date;
  if (typeof input === 'string') {
    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(input)) {
      return input;
    }
    const parts = input.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      date = new Date(input);
    }
  } else {
    date = input;
  }

  if (Number.isNaN(date.getTime())) {
    return '01-Jan-2026';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS_SHORT[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatPeriodMMMYYYY(periodKey: string): string {
  const [yearStr, monthStr] = periodKey.split('-');
  const monthIdx = Math.max(0, Math.min(11, Number(monthStr) - 1));
  return `${MONTHS_SHORT[monthIdx]}-${yearStr}`;
}

export function getDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentPeriodKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getCurrentTimeHHMMSS(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function getCurrentTimeHHMM(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function calculateDaysBetween(startDateKey: string, endDateKey: string): number {
  const [sy, sm, sd] = startDateKey.split('-').map(Number);
  const [ey, em, ed] = endDateKey.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const diffMs = end.getTime() - start.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 1;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function formatCurrencyIDR(amount: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(amount))}`;
}

export function getIndonesianDayName(dayOfWeek: number): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[dayOfWeek] ?? 'Senin';
}
