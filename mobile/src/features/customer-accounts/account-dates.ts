const monthNames = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

/** The açot date: the calendar date in Baku (UTC+4). */
export const todayKey = (now: number = Date.now()) =>
  new Date(now + 4 * 3600000).toISOString().slice(0, 10);

/** 2026-10-24 → 24.10.2026 */
export const dateLabel = (value: string) => value.split('-').reverse().join('.');

export const monthKey = (date: string) => date.slice(0, 7);

/** Moves a YYYY-MM key by a number of months. */
export function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split('-').map(Number);
  const index = year * 12 + (number - 1) + delta;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/** 2026-10 → Oktyabr 2026 */
export function monthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number);
  return `${monthNames[number - 1] ?? month} ${year}`;
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
