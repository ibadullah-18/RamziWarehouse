export const accountPages = ['daily', 'customers', 'detail', 'history', 'reports', 'report', 'debt', 'old', 'correct', 'payment'] as const;
export type AccountPage = typeof accountPages[number];
export type AccountMode = 'home' | AccountPage;

export const customerAccountPages: readonly AccountPage[] = ['detail', 'history', 'debt', 'old', 'correct', 'payment'];

/** Every page owns a fixed route; route names never use reserved navigation parameters. */
export function accountDestination(page: AccountPage, customerId?: string, businessDate?: string): string {
  if (customerAccountPages.includes(page) && !customerId) {
    throw new Error('Müştəri seçilməlidir.');
  }
  const params = new URLSearchParams();
  if (customerAccountPages.includes(page) && customerId) params.set('id', customerId);
  if (page === 'report' && businessDate) params.set('date', businessDate);
  const query = params.toString();
  return `/account/${page}${query ? `?${query}` : ''}`;
}

export function singleAccountParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.length === 1 ? value[0] : undefined;
}

export function isBusinessDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function updateDatePart(value: string, index: number, digits: string): string {
  const parts = value.split('-');
  parts[index] = digits.replace(/\D/g, '').slice(0, index === 0 ? 4 : 2);
  return parts.join('-');
}
